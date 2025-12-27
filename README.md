# Local PDF RAG Assistant 🧠📄

**A fully local, private, and agentic RAG chatbot for your PDFs**  
Powered by **Ollama**, **LangGraph**, **LangChain**, **Chroma**, and **FastAPI** — with a beautiful React + Tailwind frontend.

No cloud APIs. No data leaves your machine. Ask intelligent questions about your uploaded documents with semantic understanding.

## 🌟 Features

- **100% Local & Private** – Runs entirely on your machine using Ollama
- **Semantic Retrieval** – True vector search with `nomic-embed-text` embeddings (not keyword matching)
- **Agentic Intelligence** – LangGraph-powered ReAct agent decides when to retrieve from PDFs vs. answer directly
- **Persistent Knowledge Base** – Chroma vector database stores embeddings across restarts
- **Modern UI** – Clean, responsive React + Tailwind CSS interface with chat history, source citations, and document management
- **Fast & Lightweight** – Works great with small models like `llama3.2:1b`

## 🚀 Tech Stack

### Backend
- **FastAPI** – High-performance API
- **LangChain** – Document loading, splitting, retrieval
- **LangGraph** – Agentic workflow (ReAct agent)
- **Chroma** – Persistent local vector database
- **Ollama** – Local LLMs and embeddings (`llama3.2:1b`, `nomic-embed-text`)

### Frontend
- **React** + **TypeScript**
- **Tailwind CSS** – Beautiful, modern design
- **Vite** – Fast development server

## 🛠️ Quick Start

### Prerequisites
- [Ollama](https://ollama.com) installed and running
- Python 3.10+
- Node.js 18+

### 1. Pull Required Models
```bash
ollama pull llama3.2:1b          # Fast LLM for inference
ollama pull nomic-embed-text     # Best local embedding model (highly recommended)

2. git clone https://github.com/yourusername/local-pdf-rag.git
   cd local-pdf-rag
3. Backend Setup
Bash# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn langchain langchain-community langchain-ollama langgraph chromadb pypdf python-multipart

# Run the backend
uvicorn backend.main:app --reload --port=8000
4. Frontend Setup
Bashcd frontend

# Install dependencies
npm install

# Start development server
npm run dev
Open http://localhost:5173 (or the port shown) → Start uploading PDFs and chatting!
📁 Project Structure
textlocal-pdf-rag/
├── backend/
│   └── main.py              # FastAPI + LangGraph agentic RAG logic
├── frontend/                # React + Tailwind UI
├── chroma_db/               # Auto-created: vector database (gitignored)
├── document_info.json       # Auto-created: document metadata
├── README.md
└── .gitignore
🎯 Why This Project Stands Out (Portfolio Gold!)

Demonstrates full-stack AI engineering
Uses cutting-edge agentic patterns (LangGraph, 2025 standard)
Prioritizes privacy & local inference
Production-ready patterns: persistence, error handling, clean UI
Easily extensible (add web search, multi-agent, summarization tools)

Perfect for interviews when asked:
"Show me a project where you built an intelligent agent with RAG."
🚀 Future Ideas

Add relevance grading + query rewriting
Web search fallback tool
PDF table extraction with Unstructured.io
Multi-agent collaboration (researcher + writer)
Export chat as Markdown/PDF

📸 Screenshots
(Add your own screenshots here)
🤝 Contributing
Contributions welcome! Feel free to open issues or PRs.
📄 License
MIT License – feel free to use for personal or commercial projects.

Built with ❤️ by [Your Name] in December 2025
Local AI is the future. Run your own intelligence.
#AI #RAG #LangChain #LangGraph #Ollama #LocalAI #Privacy #FullStack #Python #React
text### Instructions for You:
1. Replace `yourusername` in the clone URL with your actual GitHub username.
2. Take 2–3 clean screenshots of the app in action (chat + sources highlighted).
3. Upload them to your repo and link in the README.
