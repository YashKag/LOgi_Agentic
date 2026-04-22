import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/api';
import {
  Search, Terminal, ArrowRight, Loader2, Zap,
  ChevronDown, Layers, Globe, Cpu, BookOpen,
} from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────
const DOMAINS = [
  'General Logistics',
  'Last-Mile Delivery',
  'Cold Chain',
  'Freight & Trucking',
  'Warehousing & Fulfillment',
  'Port & Maritime',
  'Air Cargo',
  'Supply Chain Strategy',
  'Cross-Border & Customs',
  'Reverse Logistics',
];

const MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', badge: 'Fast', badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', badge: 'Smart', badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', badge: 'Latest', badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
];

// Agent log color configuration (4 agents)
const AGENT_CONFIG = {
  'System:': { color: 'text-zinc-500', icon: '⚙' },
  'Planner:': { color: 'text-purple-400', icon: '🗺' },
  'Researcher:': { color: 'text-violet-400', icon: '🔍' },
  'Specialist:': { color: 'text-amber-400', icon: '🎯' },
  'Synthesizer:': { color: 'text-emerald-400', icon: '✍' },
  '[ERROR]': { color: 'text-red-400', icon: '✗' },
};

const getLogStyle = (log) => {
  for (const [prefix, config] of Object.entries(AGENT_CONFIG)) {
    if (log.startsWith(prefix)) return config;
  }
  return { color: 'text-zinc-400', icon: '›' };
};

// ── Component ─────────────────────────────────────────────────────────────────
const NewResearch = () => {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('General Logistics');
  const [depth, setDepth] = useState('standard');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [taskId, setTaskId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logTimes, setLogTimes] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | running | complete | error
  const logsEndRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // SSE connection
  useEffect(() => {
    if (!taskId) return;
    setStatus('running');
    const streamUrl = reportService.getStreamUrl(taskId);
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      const data = event.data;
      if (data === '[DONE]') {
        setStatus('complete');
        eventSource.close();
        setTimeout(() => navigate('/'), 3500);
      } else {
        setLogs(prev => [...prev, data]);
        setLogTimes(prev => [...prev, new Date().toLocaleTimeString()]);
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [taskId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setLogs([]);
      setLogTimes([]);
      setStatus('running');
      const res = await reportService.startResearch({ query, domain, depth, model });
      setTaskId(res.id);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-violet-500/10 rounded-2xl mb-4 border border-violet-500/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          <Zap className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Initiate Research Task</h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Configure your research parameters. The system will search, analyze, and synthesize a full intelligence report.
        </p>
      </header>

      {/* Research Form */}
      {(status === 'idle' || status === 'error') && (
        <form onSubmit={handleSubmit} className="bg-zinc-900/60 backdrop-blur border border-zinc-700/50 p-8 rounded-3xl shadow-2xl shadow-black/30 space-y-6">

          {/* Query */}
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-zinc-300 mb-2">
              <Globe className="w-3.5 h-3.5 inline mr-1.5 text-zinc-500" />
              Research Query
            </label>
            <div className="relative">
              <Search className="absolute top-3.5 left-4 w-4 h-4 text-zinc-500 pointer-events-none" />
              <textarea
                id="query"
                rows="3"
                className="w-full bg-zinc-950/60 border border-zinc-700/70 rounded-xl py-3 pl-11 pr-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none text-sm"
                placeholder="e.g., Analyze the impact of electric truck adoption on last-mile delivery costs in Europe by 2026..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Domain + Depth row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Domain */}
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-zinc-300 mb-2">
                <BookOpen className="w-3.5 h-3.5 inline mr-1.5 text-zinc-500" />
                Logistics Domain
              </label>
              <div className="relative">
                <select
                  id="domain"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  className="w-full appearance-none bg-zinc-950/60 border border-zinc-700/70 rounded-xl py-2.5 pl-4 pr-10 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all cursor-pointer"
                >
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -tranzinc-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            {/* Research Depth */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                <Layers className="w-3.5 h-3.5 inline mr-1.5 text-zinc-500" />
                Research Depth
              </label>
              <div className="flex rounded-xl overflow-hidden border border-zinc-700/70 bg-zinc-950/60">
                {[
                  { value: 'standard', label: 'Standard', sub: 'Search only' },
                  { value: 'deep', label: 'Deep', sub: 'Search + Scrape' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDepth(opt.value)}
                    className={`flex-1 py-2.5 text-center transition-all ${
                      depth === opt.value
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] opacity-70">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <Cpu className="w-3.5 h-3.5 inline mr-1.5 text-zinc-500" />
              Processing Model
            </label>
            <div className="grid grid-cols-3 gap-3">
              {MODELS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModel(m.value)}
                  className={`rounded-xl p-3 text-left border transition-all ${
                    model === m.value
                      ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                      : 'border-zinc-700/60 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="text-xs font-semibold text-zinc-200 mb-1">{m.label}</div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${m.badgeColor}`}>
                    {m.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              Failed to start research. Ensure API keys are set in <code className="font-mono text-xs bg-red-500/10 px-1 py-0.5 rounded">backend/.env</code>.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!query.trim()}
              className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed px-7 py-3 rounded-xl font-semibold text-sm transition-all   hover:-tranzinc-y-0.5"
            >
              Start Research <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Running / Complete State */}
      {(status === 'running' || status === 'complete') && (
        <div className="space-y-5">
          {/* Status Bar */}
          <div className="flex items-center justify-between bg-zinc-800/70 backdrop-blur border border-zinc-700/60 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-4">
              {status === 'running' ? (
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              )}
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  {status === 'running' ? 'Processing research...' : '✓ Research complete — redirecting to dashboard'}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">task:{taskId} • {domain} • {depth} • {model}</p>
              </div>
            </div>
            {status === 'running' && <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />}
          </div>

          {/* Agent Console */}
          <div className="bg-[#090f1a] border border-zinc-700/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-900/80 px-4 py-2.5 border-b border-zinc-700/50 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-mono text-zinc-500">process.log</span>
              <div className="ml-auto flex items-center gap-2 text-[10px] text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" /> Planning
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" /> Data Collection
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Analysis
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Synthesis
              </div>
            </div>
            <div className="p-4 h-[380px] overflow-y-auto font-mono text-xs space-y-1.5">
              {logs.length === 0 && (
                <p className="text-zinc-600 animate-pulse">Initializing process...</p>
              )}
              {logs.map((log, idx) => {
                const { color, icon } = getLogStyle(log);
                return (
                  <div key={idx} className={`${color} flex gap-2.5 items-start animate-in fade-in slide-in-from-left-2`}>
                    <span className="text-zinc-600 flex-shrink-0 tabular-nums">[{logTimes[idx]}]</span>
                    <span className="flex-shrink-0 opacity-60">{icon}</span>
                    <span className="break-words min-w-0">{log}</span>
                  </div>
                );
              })}
              {status === 'running' && (
                <div className="text-zinc-600 animate-pulse mt-2 flex gap-2">
                  <span className="animate-bounce">▋</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewResearch;
