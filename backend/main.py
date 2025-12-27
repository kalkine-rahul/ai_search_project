import os
import uuid
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Globals
vectorstore = None
retriever_tool = None
agent_executor = None
uploaded_docs = []  # For UI document list
DOCUMENT_INFO_FILE = "./document_info.json"

def load_document_info():
    global uploaded_docs
    if os.path.exists(DOCUMENT_INFO_FILE):
        import json
        with open(DOCUMENT_INFO_FILE, 'r') as f:
            uploaded_docs = json.load(f)
        logger.info(f"Loaded {len(uploaded_docs)} documents metadata")

def save_document_info():
    import json
    try:
        with open(DOCUMENT_INFO_FILE, 'w') as f:
            json.dump(uploaded_docs, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save document info: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vectorstore, retriever_tool, agent_executor, uploaded_docs

    logger.info("🚀 Starting Agentic RAG Backend with LangGraph...")

    # For embeddings (best quality + speed)
    embeddings = OllamaEmbeddings(model="nomic-embed-text")    
    llm = ChatOllama(model="llama3.2:1b", temperature=0.3)

    # Persistent Chroma vectorstore
    vectorstore = Chroma(
        collection_name="pdf_collection",
        embedding_function=embeddings,
        persist_directory="./chroma_db"
    )

    # Create retriever tool
    retriever = vectorstore.as_retriever(search_kwargs={"k": 6})
    retriever_tool = retriever.as_tool(
        name="pdf_retriever",
        description="Search and return relevant excerpts from uploaded PDF documents. Use this when the question is about content in the user's uploaded files."
    )

    # Create agentic workflow with LangGraph
    agent_executor = create_react_agent(llm, tools=[retriever_tool])

    # Load document metadata for UI
    load_document_info()

    logger.info(f"📚 Vector DB loaded with {vectorstore._collection.count()} documents")
    logger.info("🧠 Agentic RAG ready!")

    yield

    # Optional: persist on shutdown
    vectorstore.persist()
    save_document_info()
    logger.info("🛑 Shutdown complete.")

app = FastAPI(lifespan=lifespan, title="Agentic PDF RAG Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    count = vectorstore._collection.count() if vectorstore else 0
    return {"status": "healthy", "documents": len(uploaded_docs), "chunks": count}

@app.get("/documents")
async def get_documents():
    return {"documents": uploaded_docs, "count": len(uploaded_docs)}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files allowed")

    content = await file.read()
    temp_path = f"./temp_{uuid.uuid4().hex}.pdf"

    try:
        with open(temp_path, "wb") as f:
            f.write(content)

        loader = PyPDFLoader(temp_path)
        docs = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = text_splitter.split_documents(docs)

        # Add metadata to splits
        for split in splits:
            split.metadata["filename"] = file.filename

        # Add to vectorstore
        vectorstore.add_documents(splits)

        # Update UI document list
        doc_info = {
            "id": str(uuid.uuid4())[:8],
            "filename": file.filename,
            "size": len(content),
            "upload_time": time.time(),
            "chunk_count": len(splits),
            "status": "processed"
        }
        uploaded_docs.append(doc_info)
        save_document_info()

        logger.info(f"Uploaded & processed: {file.filename} ({len(splits)} chunks)")

        return {
            "status": "success",
            "document_id": doc_info["id"],
            "filename": file.filename,
            "chunks": len(splits)
        }

    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(500, f"Processing failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/ask")
async def ask_question(query: str = Query(..., min_length=1), use_rag: bool = True):
    if not use_rag:
        # Direct LLM call (no retrieval)
        llm = ChatOllama(model="llama3.2:1b", temperature=0.3)
        response = llm.invoke(query)
        return {
            "answer": response.content,
            "sources": [],
            "context_used": False,
            "relevant_chunks_found": 0
        }

    try:
        # Agentic invocation
        input_msg = {"messages": [HumanMessage(content=query)]}
        result = agent_executor.invoke(input_msg)

        # Extract final answer
        final_message = result["messages"][-1]
        answer = final_message.content

        # Extract sources from tool calls
        sources = set()
        for msg in result["messages"]:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    if tool_call["name"] == "pdf_retriever":
                        # Extract filenames from retrieved docs
                        args = tool_call["args"]
                        if "docs" in args:
                            for doc in args["docs"]:
                                if "metadata" in doc and "filename" in doc["metadata"]:
                                    sources.add(doc["metadata"]["filename"])

        return {
            "answer": answer,
            "sources": list(sources),
            "context_used": len(sources) > 0,
            "relevant_chunks_found": len(sources),
            "success": True
        }

    except Exception as e:
        logger.error(f"Ask error: {e}")
        return {
            "answer": f"Error: {str(e)}",
            "sources": [],
            "context_used": False,
            "success": False
        }

@app.get("/clear-all")
async def clear_all():
    global uploaded_docs
    try:
        # Clear vectorstore
        if vectorstore and os.path.exists("./chroma_db"):
            import shutil
            shutil.rmtree("./chroma_db")
            vectorstore = None  # Will be recreated on next startup

        # Clear metadata
        uploaded_docs = []
        if os.path.exists(DOCUMENT_INFO_FILE):
            os.remove(DOCUMENT_INFO_FILE)

        return {"status": "cleared", "message": "All data removed. Restart server to reinitialize."}
    except Exception as e:
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)