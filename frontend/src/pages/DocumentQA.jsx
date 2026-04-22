import React, { useState, useEffect, useRef } from 'react';
import { reportService } from '../services/api';
import {
  Upload, FileText, Trash2, MessageSquare, Send, Loader2,
  BookOpen, ChevronDown, ChevronRight, AlertCircle, Check, X, Cpu,
} from 'lucide-react';

// ── API Helpers ───────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const docService = {
  getAll: async () => {
    const r = await fetch(`${BASE_URL}/api/documents`);
    return r.json();
  },
  upload: async (file, title) => {
    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    const r = await fetch(`${BASE_URL}/api/documents`, { method: 'POST', body: fd });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return r.json();
  },
  delete: async (id) => {
    const r = await fetch(`${BASE_URL}/api/documents/${id}`, { method: 'DELETE' });
    return r.json();
  },
  ask: async (docId, question, model = 'gemini-1.5-flash') => {
    const r = await fetch(`${BASE_URL}/api/documents/${docId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, model }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.detail || 'Q&A failed');
    }
    return r.json();
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SourceChunks = ({ chunks }) => {
  const [open, setOpen] = useState(false);
  if (!chunks?.length) return null;
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {chunks.length} source excerpt{chunks.length > 1 ? 's' : ''} used
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {chunks.map((chunk, i) => (
            <div key={i} className="bg-zinc-950/60 border border-zinc-700/40 rounded-lg p-3 text-xs text-zinc-400 font-mono leading-relaxed line-clamp-4">
              <span className="text-zinc-600 mr-2">[{i+1}]</span>{chunk}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const DocumentQA = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([]); // { role: 'user'|'ai', content, sources }
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [model, setModel] = useState('gemini-1.5-flash');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => { loadDocuments(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadDocuments = async () => {
    try {
      const docs = await docService.getAll();
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileDrop = async (file) => {
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(false);
    setUploading(true);
    try {
      const doc = await docService.upload(file, file.name.replace(/\.[^.]+$/, ''));
      setDocuments(prev => [doc, ...prev]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document and its embeddings?')) return;
    await docService.delete(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
      setMessages([]);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedDoc || asking) return;
    const q = question.trim();
    setQuestion('');
    setAsking(true);
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    try {
      const result = await docService.ask(selectedDoc.id, q, model);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: result.answer,
        sources: result.sources,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Error: ${e.message}`,
        error: true,
      }]);
    } finally {
      setAsking(false);
    }
  };

  const selectDoc = (doc) => {
    setSelectedDoc(doc);
    setMessages([{
      role: 'ai',
      content: `Document loaded! Processed **"${doc.title}"** (${doc.chunk_count} text chunks extracted). You can now ask questions about its content. Responses will be grounded strictly in this document.`,
    }]);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1.5">Document Intelligence</h1>
        <p className="text-zinc-400 text-sm">Upload logistics PDFs and ask questions grounded strictly in your documents.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-220px)] min-h-[500px]">

        {/* ── Left Panel: Upload + Document List ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-violet-400 bg-violet-500/10'
                : 'border-zinc-700/60 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => handleFileDrop(e.target.files?.[0])}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <p className="text-sm text-zinc-400">Processing document...</p>
                <p className="text-xs text-zinc-500">Chunking & embedding</p>
              </div>
            ) : uploadSuccess ? (
              <div className="flex flex-col items-center gap-2">
                <Check className="w-8 h-8 text-emerald-400" />
                <p className="text-sm text-emerald-400">Document ingested!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className={`w-8 h-8 ${dragOver ? 'text-violet-400' : 'text-zinc-500'}`} />
                <p className="text-sm font-medium text-zinc-300">Drop PDF or TXT here</p>
                <p className="text-xs text-zinc-500">or click to browse</p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Document List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 px-1">
              {documents.length} Document{documents.length !== 1 ? 's' : ''}
            </p>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No documents yet
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => selectDoc(doc)}
                  className={`group flex items-start gap-3 p-3.5 rounded-xl cursor-pointer border transition-all ${
                    selectedDoc?.id === doc.id
                      ? 'bg-violet-500/15 border-violet-500/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                      : 'bg-zinc-900/40 border-zinc-700/40 hover:bg-zinc-900/80 hover:border-zinc-600/60'
                  }`}
                >
                  <div className="bg-zinc-700/50 p-2 rounded-lg flex-shrink-0 mt-0.5">
                    <FileText className={`w-4 h-4 ${selectedDoc?.id === doc.id ? 'text-violet-400' : 'text-zinc-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{doc.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{doc.chunk_count} chunks · {doc.filename.split('.').pop().toUpperCase()}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 p-1 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel: Chat Interface ── */}
        <div className="lg:col-span-3 flex flex-col bg-zinc-900/40 border border-zinc-700/50 rounded-2xl overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-700/50 bg-zinc-800/50 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">
                {selectedDoc ? selectedDoc.title : 'Select a document to begin Q&A'}
              </span>
            </div>
            {selectedDoc && (
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="text-xs bg-zinc-950/60 border border-zinc-700/60 rounded-lg px-2 py-1 text-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                </select>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!selectedDoc ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600">
                <BookOpen className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Upload a logistics document on the left,<br />then select it to start asking questions.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : msg.error
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-bl-sm'
                      : 'bg-zinc-700/50 border border-zinc-700/40 text-zinc-200 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && <SourceChunks chunks={msg.sources} />}
                  </div>
                </div>
              ))
            )}
            {asking && (
              <div className="flex justify-start">
                <div className="bg-zinc-700/50 border border-zinc-700/40 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching document...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleAsk} className="flex items-end gap-3 p-4 border-t border-zinc-700/50 bg-zinc-900/40 flex-shrink-0">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(e); } }}
              placeholder={selectedDoc ? 'Ask a question about this document...' : 'Select a document first'}
              disabled={!selectedDoc || asking}
              rows={1}
              className="flex-1 bg-zinc-950/60 border border-zinc-700/60 rounded-xl py-2.5 px-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-40 resize-none"
            />
            <button
              type="submit"
              disabled={!question.trim() || !selectedDoc || asking}
              className="bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentQA;
