import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaSync, FaSpinner, FaExclamationTriangle,
  FaCheckCircle, FaLightbulb, FaRocket,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import {
  getSchedules, fetchTeachers, fetchSubjects, fetchRooms,
  runAIScheduling,
} from '../services/analyticsService';

const ICON_MAP = {
  warning: '⚠️', error: '🔴', info: '🏫', success: '✅',
};
const STYLE_MAP = {
  warning: { bg: 'bg-amber-50 border-amber-200',     badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400' },
  error:   { bg: 'bg-rose-50 border-rose-200',       badge: 'bg-rose-100 text-rose-700',       dot: 'bg-rose-500'  },
  info:    { bg: 'bg-blue-50 border-blue-200',       badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500'  },
  success: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

export default function OptimizationSuggestions() {
  const [schedules,    setSchedules]    = useState([]);
  const [teachers,     setTeachers]     = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [rooms,        setRooms]        = useState([]);
  const [suggestions,  setSuggestions]  = useState([]);
  const [conflicts,    setConflicts]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [generated,    setGenerated]    = useState(false);
  const [apiError,     setApiError]     = useState('');
  const [source,       setSource]       = useState('');
  const [filter,       setFilter]       = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true); setApiError(''); setGenerated(false);
    try {
      const [sc, t, s, r] = await Promise.all([
        getSchedules(), fetchTeachers(), fetchSubjects(), fetchRooms(),
      ]);
      setSchedules(sc); setTeachers(t); setSubjects(s); setRooms(r);
    } catch (e) {
      setApiError(e?.response?.data?.message || e.message || 'Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function generateSuggestions() {
    setLoading(true); setApiError('');
    try {
      const result = await runAIScheduling(schedules, teachers, rooms, subjects);
      setSuggestions(result.suggestions || []);
      setConflicts(result.conflicts   || []);
      setSource(result.source || 'client');
      setGenerated(true);
    } catch (e) {
      setApiError('Failed to generate suggestions: ' + (e.message || 'Unknown error'));
    } finally { setLoading(false); }
  }

  const filtered = filter === 'all' ? suggestions : suggestions.filter(s => s.type === filter);
  const counts = {
    all:     suggestions.length,
    warning: suggestions.filter(s => s.type === 'warning').length,
    error:   suggestions.filter(s => s.type === 'error').length,
    success: suggestions.filter(s => s.type === 'success').length,
    info:    suggestions.filter(s => s.type === 'info').length,
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/ai/conflict-detection" id="opt-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> Conflict Detection
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold">Optimisation Suggestions</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={loadData} disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 text-muted hover:bg-slate-200 transition-all disabled:opacity-50">
            <FaSync className={`text-[10px] ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button id="btn-generate" onClick={generateSuggestions} disabled={loading || schedules.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm disabled:opacity-40">
            {loading ? <FaSpinner className="animate-spin text-[10px]" /> : <FaRocket className="text-[10px]" />}
            {loading ? 'Generating…' : 'Generate Insights'}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <HiSparkles /> AI Insights
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* heading */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Optimisation{' '}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Suggestions</span>
          </h1>
          <p className="mt-2 text-muted text-lg">
            AI-generated scheduling recommendations based on your live timetable, workload distribution, room utilisation, and detected conflicts.
          </p>
        </div>

        {/* error */}
        {apiError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700">
            <FaExclamationTriangle className="flex-shrink-0" />
            <span className="text-sm font-semibold flex-1">{apiError}</span>
            <button onClick={loadData} className="text-xs font-bold underline">Retry</button>
          </div>
        )}

        {/* source badge */}
        {generated && (
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${source === 'backend' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <HiSparkles />
            {source === 'backend' ? 'Insights from backend AI engine' : 'Insights from scheduling intelligence engine'}
          </div>
        )}

        {/* summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Schedule Entries', value: schedules.length,  color: 'text-primary'    },
            { label: 'Faculty Members',  value: teachers.length,   color: 'text-secondary'  },
            { label: 'Conflicts',        value: generated ? conflicts.length : '—', color: conflicts.length > 0 ? 'text-rose-500' : 'text-emerald-500' },
            { label: 'Insights',         value: generated ? suggestions.length : '—', color: 'text-amber-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 text-center hover:shadow-lg transition-shadow">
              <div className={`text-3xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs font-semibold text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* no data */}
        {!loading && schedules.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <FaLightbulb className="text-amber-400 text-4xl" />
            <div className="font-bold text-amber-700 text-lg">No schedule data available</div>
            <div className="text-sm text-amber-600">Add schedule entries first to generate AI insights.</div>
            <Link to="/ai/setup" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90">
              Go to AI Setup
            </Link>
          </div>
        )}

        {/* pre-run placeholder */}
        {!generated && !loading && schedules.length > 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-muted">
            <FaLightbulb className="text-5xl mx-auto mb-4 text-slate-300" />
            <p className="font-bold text-lg">Ready to analyse {schedules.length} schedule entries</p>
            <p className="text-sm mt-1">Click <strong>Generate Insights</strong> to get AI-powered optimisation suggestions.</p>
          </div>
        )}

        {/* results */}
        {generated && (
          <section className="space-y-6">

            {/* conflicts summary */}
            {conflicts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 font-bold text-rose-700 mb-1">
                  <FaExclamationTriangle /> {conflicts.length} Active Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                </div>
                <p className="text-xs text-rose-600">
                  {conflicts.map(c => `${c.roomName || c.roomId} on ${c.day}`).join(' · ')}
                </p>
                <Link to="/ai/conflict-detection" className="inline-block mt-3 text-xs font-bold text-rose-600 underline">
                  View full conflict details →
                </Link>
              </div>
            )}

            {conflicts.length === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700">No scheduling conflicts detected — timetable is clean!</span>
              </div>
            )}

            {/* filter pills */}
            <div className="flex flex-wrap gap-2">
              {(['all','warning','error','success','info']).map(k => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter === k ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-muted border-slate-200 hover:border-primary'}`}>
                  {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)} ({counts[k]})
                </button>
              ))}
            </div>

            {/* suggestion cards */}
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">No insights in this category.</div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((ins, i) => {
                  const style = STYLE_MAP[ins.type] || STYLE_MAP.info;
                  const icon  = ins.icon || ICON_MAP[ins.type] || '💡';
                  return (
                    <div key={i} className={`rounded-2xl border p-5 ${style.bg} flex gap-4 hover:shadow-md transition-all`}>
                      <div className="text-2xl flex-shrink-0 mt-0.5">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-navy">{ins.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                            {ins.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{ins.desc}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0 mt-1.5`} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* quick links */}
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <Link to="/ai/setup" className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FaRocket />
                </div>
                <span className="font-bold text-sm text-navy">Back to AI Setup</span>
              </Link>
              <Link to="/analytics" className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiSparkles />
                </div>
                <span className="font-bold text-sm text-navy">Full Analytics Dashboard</span>
              </Link>
            </div>

          </section>
        )}
      </main>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
