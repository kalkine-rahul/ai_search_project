from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings

# Local database setup
def get_vector_db():
    embeddings = OllamaEmbeddings(model="llama3.2:1b")
    db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
    return db