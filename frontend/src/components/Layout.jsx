import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Package, Search, LayoutDashboard, Wifi, WifiOff, Cpu, BookOpen } from 'lucide-react';
import { reportService } from '../services/api';

const Layout = () => {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'ok' | 'degraded' | 'down' | 'checking'
  const [availableModels, setAvailableModels] = useState([]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await reportService.getHealth?.();
        setBackendStatus(health.status); // 'ok' or 'degraded'
        setAvailableModels(health.supported_models || []);
      } catch {
        setBackendStatus('down');
      }
    };
    checkHealth();
    // Re-check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    ok: { color: 'text-emerald-400', bg: 'bg-emerald-500', label: 'Connected', pulse: false },
    degraded: { color: 'text-amber-400', bg: 'bg-amber-500', label: 'Degraded', pulse: true },
    down: { color: 'text-red-400', bg: 'bg-red-500', label: 'Offline', pulse: false },
    checking: { color: 'text-zinc-400', bg: 'bg-zinc-500', label: 'Checking...', pulse: true },
  };
  const s = statusConfig[backendStatus];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-zinc-900/80 border-r border-zinc-700/60 flex flex-col backdrop-blur-sm">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-zinc-700/60 gap-3">
          <div className="bg-violet-500/10 p-2 rounded-xl border border-violet-500/20">
            <Package className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-100 leading-tight">
              LogiResearch
            </h1>
            <p className="text-[10px] text-zinc-500 leading-tight">Intelligence Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-3 mb-3">Navigation</p>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                isActive
                  ? 'bg-violet-500/15 text-violet-400 font-medium border border-violet-500/25 shadow-sm shadow-violet-500/10'
                  : 'text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            Dashboard
          </NavLink>

          <NavLink
            to="/new"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                isActive
                  ? 'bg-violet-500/15 text-violet-400 font-medium border border-violet-500/25 shadow-sm shadow-violet-500/10'
                  : 'text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200'
              }`
            }
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            New Research
          </NavLink>

          <NavLink
            to="/documents"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/25 shadow-sm shadow-emerald-500/10'
                  : 'text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200'
              }`
            }
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            Document Q&A
            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">RAG</span>
          </NavLink>
        </nav>

        {/* Backend Status */}
        <div className="p-4 border-t border-zinc-700/60 space-y-3">
          <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-700/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {backendStatus === 'down' ? (
                  <WifiOff className={`w-3.5 h-3.5 ${s.color}`} />
                ) : (
                  <Wifi className={`w-3.5 h-3.5 ${s.color}`} />
                )}
                <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
              </div>
              <span className="relative flex h-2 w-2">
                {s.pulse && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.bg} opacity-60`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${s.bg}`} />
              </span>
            </div>
            {availableModels.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Cpu className="w-3 h-3" />
                {availableModels.length} models available
              </div>
            )}
            {backendStatus === 'degraded' && (
              <p className="text-[10px] text-amber-500/80 mt-1">API keys may be missing</p>
            )}
          </div>
          <p className="text-[10px] text-zinc-600 text-center">© 2026 LogiResearch v2.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-zinc-950 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.03),transparent)]">
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
