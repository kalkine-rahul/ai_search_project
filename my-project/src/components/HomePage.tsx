
"use client";
import { useState, useEffect, useRef } from "react";

type ChatMessage = {
  id: string;
  q: string;
  a: string;
  sources?: string[];
  contextUsed?: boolean;
  timestamp?: number;
  isUser: boolean;
};

type DocumentInfo = {
  id: string;
  filename: string;
  size: number;
  upload_time: number;
  chunk_count: number;
  status: string;
};

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: "welcome",
      q: "",
      a: "Hello! I'm your PDF Assistant. Upload PDF documents and ask me questions about them. I can search through your documents and provide accurate answers based on their content.",
      isUser: false,
      contextUsed: false
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>("checking");
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [useRAG, setUseRAG] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Test backend connection and load documents
    fetch("http://127.0.0.1:8000/health")
      .then(res => res.json())
      .then(data => {
        console.log("Backend status:", data);
        setBackendStatus("connected");
        loadDocuments();
      })
      .catch(err => {
        console.error("Backend connection failed:", err);
        setBackendStatus("disconnected");
      });
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

  const loadDocuments = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || `Upload failed: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Add success message to chat
      const newMessage: ChatMessage = {
        id: `upload-${Date.now()}`,
        q: "",
        a: `✅ Successfully uploaded and processed **${file.name}**\n\n- Added ${data.chunks} text chunks\n- Document ID: ${data.document_id}\n- Ready for questioning`,
        isUser: false,
        contextUsed: false,
        timestamp: Date.now()
      };
      
      setChat(prev => [...prev, newMessage]);
      loadDocuments();
      
    } catch (err: any) {
      console.error("Upload error:", err);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        q: "",
        a: `❌ Upload failed: ${err.message || "Unknown error"}`,
        isUser: false,
        contextUsed: false,
        timestamp: Date.now()
      };
      
      setChat(prev => [...prev, errorMessage]);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const askAI = async () => {
    if (!query.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      q: query,
      a: "",
      isUser: true,
      contextUsed: false,
      timestamp: Date.now()
    };
    
    setChat(prev => [...prev, userMessage]);
    setQuery("");
    setLoading(true);
    
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/ask?query=${encodeURIComponent(query)}&use_rag=${useRAG}`
      );
      
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      
      const data = await res.json();
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        q: "",
        a: data.answer || "No response received",
        sources: data.sources || [],
        isUser: false,
        contextUsed: data.context_used || false,
        timestamp: Date.now()
      };
      
      setChat(prev => [...prev, aiMessage]);
      
    } catch (err: any) {
      console.error("Ask AI error:", err);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        q: "",
        a: `❌ Error: ${err.message || "Failed to get response"}`,
        isUser: false,
        contextUsed: false,
        timestamp: Date.now()
      };
      
      setChat(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChat([
      {
        id: "welcome",
        q: "",
        a: "Hello! I'm your PDF Assistant. Upload PDF documents and ask me questions about them. I can search through your documents and provide accurate answers based on their content.",
        isUser: false,
        contextUsed: false
      }
    ]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp || !isClient) return "";
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // Use 24-hour format to avoid AM/PM mismatch
    });
  };

  const formatUploadTime = (timestamp: number) => {
    if (!isClient) return "";
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!isClient) {
    // Return minimal static content during SSR
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    PDF RAG Assistant
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse"></div>
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600"></div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-900"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  PDF RAG Assistant
                </h1>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`px-2 py-0.5 rounded-full ${backendStatus === 'connected' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {backendStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </div>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">llama3.2:1b</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${useRAG ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                <span className="text-sm">{useRAG ? 'RAG Active' : 'General Mode'}</span>
              </div>
              
              <button
                onClick={clearChat}
                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Clear Chat
              </button>
              
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 hover:bg-gray-800 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className={`hidden md:block w-80 flex-shrink-0 ${isSidebarOpen ? 'block fixed inset-y-0 left-0 z-50 w-80 bg-gray-900 border-r border-gray-800 p-6' : ''}`}>
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"></div>
                  AI Mode
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">RAG Mode</span>
                    <button
                      onClick={() => setUseRAG(!useRAG)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useRAG ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useRAG ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400">
                    {useRAG 
                      ? "Answers will use content from your uploaded PDFs"
                      : "General knowledge mode without PDF context"
                    }
                  </p>
                </div>
              </div>

              {/* Upload Section */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  Upload PDF
                </h2>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <button
                  onClick={triggerFileUpload}
                  disabled={uploading}
                  className={`w-full py-4 rounded-xl font-medium transition-all ${uploading 
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg'
                  }`}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      Upload PDF Document
                    </div>
                  )}
                </button>
                
                <p className="text-sm text-gray-400 mt-3 text-center">
                  Supports research papers, manuals, articles
                </p>
              </div>

              {/* Documents List */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
                    Documents
                    <span className="text-sm font-normal bg-gray-700 px-2 py-0.5 rounded-full">
                      {documents.length}
                    </span>
                  </h2>
                  <button 
                    onClick={loadDocuments}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Refresh
                  </button>
                </div>
                
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <p className="text-gray-400">No documents yet</p>
                    <p className="text-sm text-gray-500 mt-1">Upload your first PDF</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="group bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl p-4 transition-all hover:border-gray-600"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-900/30 to-cyan-900/30">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate" title={doc.filename}>
                              {doc.filename}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span>{formatFileSize(doc.size)}</span>
                              <span>•</span>
                              <span>{doc.chunk_count} chunks</span>
                              <span>•</span>
                              <span>{formatUploadTime(doc.upload_time)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"></div>
                  Statistics
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-800/30 rounded-xl">
                    <div className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                      {documents.length}
                    </div>
                    <div className="text-sm text-gray-400">Documents</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800/30 rounded-xl">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      {chat.length - 1}
                    </div>
                    <div className="text-sm text-gray-400">Messages</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
          )}

          {/* Main Chat Area */}
          <main className="flex-1">
            {/* Chat Container */}
            <div 
              ref={chatContainerRef}
              className="h-[calc(100vh-180px)] overflow-y-auto rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/50 to-gray-950/50 backdrop-blur-sm p-4 mb-6"
            >
              <div className="space-y-6">
                {chat.map((message) => (
                  <div key={message.id}>
                    {message.isUser ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%]">
                          <div className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 border border-pink-500/30 rounded-2xl rounded-tr-none p-5 backdrop-blur-sm">
                            <p className="text-white">{message.q}</p>
                            {message.timestamp && (
                              <div className="text-xs text-gray-400 mt-2 text-right">
                                {formatTime(message.timestamp)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="max-w-[90%]">
                          <div className={`rounded-2xl rounded-tl-none p-5 backdrop-blur-sm ${message.contextUsed 
                            ? 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-purple-500/30' 
                            : 'bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-700'
                          }`}>
                            {message.contextUsed && (
                              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30">
                                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
                                <span className="text-xs text-purple-300">Using PDF Context</span>
                              </div>
                            )}
                            
                            <div className="prose prose-invert max-w-none">
                              <p className="text-gray-100 whitespace-pre-wrap">{message.a}</p>
                            </div>
                            
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                  <span className="text-xs text-gray-400">Sources from PDFs</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {message.sources.map((source, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 text-gray-300 truncate max-w-[200px]"
                                      title={source}
                                    >
                                      📄 {source}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-xs font-bold">AI</span>
                                </div>
                                <span className="text-xs text-gray-400">PDF Assistant</span>
                              </div>
                              {message.timestamp && (
                                <div className="text-xs text-gray-500">
                                  {formatTime(message.timestamp)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%]">
                      <div className="rounded-2xl rounded-tl-none p-5 backdrop-blur-sm bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm text-gray-300">
                            {useRAG ? "Searching documents and thinking..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-full px-4 py-2 shadow-xl">
                  <div className={`w-2 h-2 rounded-full ${useRAG ? 'bg-gradient-to-r from-pink-500 to-purple-500 animate-pulse' : 'bg-gray-600'}`}></div>
                  <span className="text-sm">
                    {useRAG ? 'PDF Context Active' : 'General Mode'}
                  </span>
                  <button
                    onClick={() => setUseRAG(!useRAG)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Switch
                  </button>
                </div>
              </div>
              
              <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 border border-gray-700 rounded-2xl p-4 backdrop-blur-xl shadow-2xl">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <textarea
                      className="w-full bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-white placeholder-gray-500 max-h-32 min-h-[60px]"
                      placeholder={documents.length > 0 
                        ? "Ask anything about your documents or general knowledge..." 
                        : "Upload a PDF to get started or ask a general question..."
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                      rows={1}
                    />
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={triggerFileUpload}
                          disabled={uploading}
                          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                          title="Upload PDF"
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                        </button>
                        
                        <div className="text-xs text-gray-500">
                          <kbd className="px-2 py-1 bg-gray-900 rounded mr-1">Enter</kbd> to send
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-400">
                        {documents.length} document{documents.length !== 1 ? 's' : ''} loaded
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={askAI}
                    disabled={loading || !query.trim() || backendStatus !== 'connected'}
                    className={`p-4 rounded-xl transition-all ${loading || !query.trim() || backendStatus !== 'connected'
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-lg'
                    }`}
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <footer className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By using this assistant, you agree to use responsibly. Responses are generated by AI and should be verified.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}