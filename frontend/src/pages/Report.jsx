import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { reportService } from '../services/api';
import {
  ArrowLeft, Loader2, Calendar, Database, Terminal,
  Copy, Download, Check, Tag, Cpu, ChevronDown, ChevronUp,
} from 'lucide-react';

const Report = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await reportService.getReportById(id);
      setReport(data);
    } catch (err) {
      setError('Report not found or failed to load.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!report?.result) return;
    await navigator.clipboard.writeText(report.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!report) return;
    const filename = `logiresearch-${report.id}.md`;
    const header = `# Logistics Research: ${report.query}\n\n**Domain:** ${report.domain || 'General Logistics'}  \n**Model:** ${report.model || 'gemini-1.5-flash'}  \n**Date:** ${report.created_at}\n\n---\n\n`;
    const blob = new Blob([header + report.result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Loading intelligence report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-16">
        <div className="text-red-400 mb-4 text-sm">{error}</div>
        <Link to="/" className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-2 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const DOMAIN_COLORS = {
    'Last-Mile Delivery': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    'Cold Chain': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    'Freight & Trucking': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    'Warehousing & Fulfillment': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    'Supply Chain Strategy': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };
  const domainClass = DOMAIN_COLORS[report.domain] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-16">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-7 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Main Report Card */}
      <div className="bg-zinc-900/40 backdrop-blur border border-zinc-700/50 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/20 mb-6">
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8 pb-8 border-b border-zinc-700/50">
          <div className="flex-1">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                Research Report
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${domainClass}`}>
                <Tag className="w-3 h-3" />
                {report.domain || 'General Logistics'}
              </span>
              {report.model && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-zinc-400 bg-zinc-700/30 border-zinc-600/40">
                  <Cpu className="w-3 h-3" />
                  {report.model}
                </span>
              )}
              <span className="text-zinc-600 text-xs flex items-center gap-1">
                <Database className="w-3 h-3" /> {report.id}
              </span>
            </div>
            {/* Query as H1 */}
            <h1 className="text-xl font-bold text-zinc-100 leading-snug">
              {report.query}
            </h1>
          </div>

          {/* Action buttons + date */}
          <div className="flex flex-col items-end gap-3">
            <div className="text-right text-zinc-500 text-xs">
              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(report.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </div>
              <div>{new Date(report.created_at).toLocaleTimeString('en-US')}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-700/50 px-3 py-1.5 rounded-lg transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleExport}
                title="Export as Markdown"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-700/50 px-3 py-1.5 rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export .md
              </button>
            </div>
          </div>
        </div>

        {/* Markdown Report Content */}
        <article className="prose prose-invert prose-slate max-w-none
          prose-headings:text-zinc-100 prose-headings:font-bold
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h3:text-zinc-200
          prose-a:text-violet-400 hover:prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-zinc-200
          prose-p:text-zinc-300 prose-p:leading-relaxed
          prose-li:text-zinc-300 prose-li:leading-relaxed
          prose-code:text-emerald-300 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-blockquote:border-violet-500/40 prose-blockquote:text-zinc-400
          prose-hr:border-zinc-700
        ">
          <ReactMarkdown>{report.result}</ReactMarkdown>
        </article>
      </div>

      {/* Process Logs (collapsible) */}
      {report.agent_logs && report.agent_logs.length > 0 && (
        <div>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-4 transition-colors text-sm w-full group"
          >
            <Terminal className="w-4 h-4" />
            <span>{showLogs ? 'Hide' : 'View'} Process Logs</span>
            {showLogs
              ? <ChevronUp className="w-3.5 h-3.5 ml-1" />
              : <ChevronDown className="w-3.5 h-3.5 ml-1" />
            }
            <div className="h-px bg-zinc-900/80 flex-1 ml-2 group-hover:bg-zinc-700 transition-colors" />
            <span className="text-xs text-zinc-600 font-mono">{report.agent_logs.filter(l => l !== '[DONE]').length} events</span>
          </button>

          {showLogs && (
            <div className="bg-[#090f1a] border border-zinc-700/40 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-3 text-[10px] text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" /> Planning
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" /> Data Collection
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Analysis
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Synthesis
              </div>
              <div className="p-5 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto">
                {report.agent_logs.map((log, idx) => {
                  if (log === '[DONE]') return null;
                  let color = 'text-zinc-500';
                  if (log.startsWith('System:')) color = 'text-zinc-600';
                  if (log.startsWith('Planner:')) color = 'text-purple-400/80';
                  if (log.startsWith('Researcher:')) color = 'text-violet-400/80';
                  if (log.startsWith('Specialist:')) color = 'text-amber-400/80';
                  if (log.startsWith('Synthesizer:')) color = 'text-emerald-400/80';
                  if (log.startsWith('[ERROR]')) color = 'text-red-400';
                  return (
                    <div key={idx} className={`${color} flex gap-2`}>
                      <span className="text-zinc-700 flex-shrink-0">{String(idx + 1).padStart(3, '0')}</span>
                      <span className="break-words min-w-0">{log}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Report;
