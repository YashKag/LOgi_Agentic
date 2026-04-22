import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../services/api';
import { Calendar, FileText, Trash2, Loader2, ArrowRight, Search, Filter, BarChart3, Tag } from 'lucide-react';

const DOMAIN_COLORS = {
  'Last-Mile Delivery': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'Cold Chain': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Freight': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Warehousing': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Supply Chain': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Port & Maritime': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
};

const getDomainClass = (domain) =>
  DOMAIN_COLORS[domain] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getAllReports();
      setReports(data);
    } catch (err) {
      setError('Failed to fetch research reports. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    if (!window.confirm('Delete this research report?')) return;
    try {
      await reportService.deleteReport(id);
      setReports(reports.filter(r => r.id !== id));
    } catch {
      alert('Failed to delete report.');
    }
  };

  // Client-side filter by search query
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      r =>
        r.query?.toLowerCase().includes(q) ||
        r.domain?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  // Stats
  const uniqueDomains = useMemo(() => [...new Set(reports.map(r => r.domain).filter(Boolean))], [reports]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-violet-400 animate-spin mb-4" />
        <p className="text-zinc-400">Loading knowledge base...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1.5">Research Dashboard</h1>
          <p className="text-zinc-400 text-sm">Your central logistics intelligence repository.</p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-5 py-2.5 rounded-xl font-semibold transition-all   hover:-tranzinc-y-0.5 text-sm flex-shrink-0"
        >
          New Research <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Stats Row */}
      {reports.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: FileText, label: 'Total Reports', value: reports.length, color: 'text-violet-400' },
            { icon: Tag, label: 'Domains Covered', value: uniqueDomains.length, color: 'text-emerald-400' },
            {
              icon: BarChart3,
              label: 'Latest Research',
              value: reports[0] ? new Date(reports[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
              color: 'text-purple-400',
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-zinc-900/60 border border-zinc-700/50 rounded-2xl p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-zinc-700/40`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">{label}</p>
                <p className={`font-semibold text-sm ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Search Bar */}
      {reports.length > 0 && (
        <div className="mb-6 relative">
          <Search className="absolute left-3.5 top-1/2 -tranzinc-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by query or domain..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800/50 border border-zinc-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
          />
          {searchQuery && (
            <span className="absolute right-3.5 top-1/2 -tranzinc-y-1/2 text-xs text-zinc-500">
              {filteredReports.length} result{filteredReports.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Empty State */}
      {reports.length === 0 && !error ? (
        <div className="bg-zinc-900/40 backdrop-blur border border-zinc-700/40 rounded-2xl p-16 text-center">
          <div className="bg-zinc-700/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
            <FileText className="w-7 h-7 text-zinc-500" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-200 mb-2">No research yet</h3>
          <p className="text-zinc-400 mb-6 text-sm max-w-xs mx-auto">
            Start your first research task to build your logistics knowledge base.
          </p>
          <Link to="/new" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium text-sm transition-colors">
            Start First Research <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : filteredReports.length === 0 && searchQuery ? (
        <div className="text-center py-12 text-zinc-500">
          <Filter className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No reports match "<span className="text-zinc-300">{searchQuery}</span>"</p>
          <button onClick={() => setSearchQuery('')} className="text-violet-400 hover:text-violet-300 text-sm mt-2 transition-colors">Clear filter</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => (
            <Link
              key={report.id}
              to={`/report/${report.id}`}
              className="group bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-700/40 hover:border-zinc-600/60 rounded-2xl p-5 transition-all duration-300 flex flex-col min-h-[200px] shadow-lg shadow-black/10 hover:shadow-xl hover:-tranzinc-y-1 relative overflow-hidden"
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500 to-emerald-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

              <div className="flex justify-between items-start mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${getDomainClass(report.domain)}`}>
                  <Tag className="w-2.5 h-2.5" />
                  {report.domain || 'General Logistics'}
                </span>
                <button
                  onClick={(e) => handleDelete(report.id, e)}
                  className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-sm font-semibold text-zinc-100 mb-3 line-clamp-3 leading-snug flex-1">
                {report.query}
              </h3>

              <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-700/40">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(report.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </div>
                {report.model && (
                  <span className="text-[10px] text-zinc-600 font-mono">{report.model}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
