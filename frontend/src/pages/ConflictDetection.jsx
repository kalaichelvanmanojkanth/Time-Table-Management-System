import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaSync, FaSpinner, FaExclamationTriangle,
  FaCheckCircle, FaDoorOpen, FaClock, FaSearch,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import {
  getSchedules, fetchTeachers, fetchSubjects, fetchRooms,
  runAIScheduling,
} from '../services/analyticsService';

export default function ConflictDetection() {
  const [schedules,  setSchedules]  = useState([]);
  const [teachers,   setTeachers]   = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [rooms,      setRooms]      = useState([]);
  const [conflicts,  setConflicts]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [analysed,   setAnalysed]   = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [source,     setSource]     = useState('');   // 'backend' | 'client'

  const loadData = useCallback(async () => {
    setLoading(true); setApiError(''); setAnalysed(false); setConflicts([]);
    try {
      const [sc, t, s, r] = await Promise.all([
        getSchedules(), fetchTeachers(), fetchSubjects(), fetchRooms(),
      ]);
      setSchedules(sc); setTeachers(t); setSubjects(s); setRooms(r);
    } catch (e) {
      setApiError(e?.response?.data?.message || e.message || 'Failed to load schedule data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function analyseConflicts() {
    setLoading(true); setApiError(''); setAnalysed(false);
    try {
      const result = await runAIScheduling(schedules, teachers, rooms, subjects);
      // Detect whether we got a real backend response or a fallback
      const fromBackend = !!(result && result.conflicts && Array.isArray(result.conflicts));
      setConflicts(result.conflicts || []);
      setSource(fromBackend ? 'backend' : 'client');
      setAnalysed(true);
    } catch (e) {
      setApiError('Conflict analysis failed: ' + (e.message || 'Unknown error'));
    } finally { setLoading(false); }
  }

  const getName = (arr, idOrObj, field = 'name') =>
    idOrObj?.[field] || arr.find(x => x._id === (idOrObj?._id || idOrObj))?.[field] || idOrObj;

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/ai/setup" id="cd-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> AI Setup
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold">Conflict Detection</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={loadData} disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 text-muted hover:bg-slate-200 transition-all disabled:opacity-50">
            <FaSync className={`text-[10px] ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button id="btn-analyse" onClick={analyseConflicts} disabled={loading || schedules.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm disabled:opacity-40">
            {loading ? <FaSpinner className="animate-spin text-[10px]" /> : <FaSearch className="text-[10px]" />}
            {loading ? 'Analysing…' : 'Run Analysis'}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
            <HiSparkles /> Conflict AI
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* heading */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Conflict{' '}
            <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">Detection</span>
          </h1>
          <p className="mt-2 text-muted text-lg">
            Run AI-powered analysis against your live schedule data to detect overlapping room bookings and scheduling clashes.
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
        {analysed && (
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${source === 'backend' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <HiSparkles />
            {source === 'backend' ? 'Results from backend AI engine' : 'Results from client-side scheduling intelligence'}
          </div>
        )}

        {/* summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Schedule Entries', value: schedules.length,  color: 'text-primary'    },
            { label: 'Rooms Checked',    value: rooms.length,      color: 'text-emerald-600' },
            { label: 'Days Covered',     value: [...new Set(schedules.map(s => s.day))].length, color: 'text-secondary' },
            { label: 'Conflicts Found',  value: analysed ? conflicts.length : '—', color: conflicts.length > 0 ? 'text-rose-500' : 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 text-center hover:shadow-lg transition-shadow">
              <div className={`text-3xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs font-semibold text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* empty schedule warning */}
        {!loading && schedules.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <FaDoorOpen className="text-amber-400 text-4xl" />
            <div className="font-bold text-amber-700 text-lg">No schedule data</div>
            <div className="text-sm text-amber-600">Add schedule entries first before running conflict detection.</div>
            <Link to="/ai/setup" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90">
              Go to AI Setup
            </Link>
          </div>
        )}

        {/* not yet analysed */}
        {!analysed && !loading && schedules.length > 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-muted">
            <FaSearch className="text-5xl mx-auto mb-4 text-slate-300" />
            <p className="font-bold text-lg">Ready to analyse {schedules.length} schedule entries</p>
            <p className="text-sm mt-1">Click <strong>Run Analysis</strong> to detect all scheduling conflicts.</p>
          </div>
        )}

        {/* results */}
        {analysed && (
          <section className="space-y-6">
            {conflicts.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
                <FaCheckCircle className="text-emerald-500 text-4xl" />
                <div className="font-bold text-emerald-700 text-lg">No conflicts detected!</div>
                <div className="text-sm text-emerald-600">Your timetable is clean. All room bookings are conflict-free.</div>
              </div>
            ) : (
              <>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 font-bold text-rose-700 mb-3">
                    <FaExclamationTriangle /> {conflicts.length} Room Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                  </div>
                  <p className="text-sm text-rose-600">The following rooms have overlapping time slots that must be resolved before publishing the timetable.</p>
                </div>

                <div className="grid gap-4">
                  {conflicts.map((c, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-rose-200 shadow-md p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-400 text-white flex items-center justify-center">
                          <FaDoorOpen />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{c.roomName || c.roomId}</div>
                          <div className="text-xs text-muted">{c.day} · {c.conflicts.length} overlap{c.conflicts.length !== 1 ? 's' : ''}</div>
                        </div>
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">
                          ❌ Conflict
                        </span>
                      </div>
                      <div className="space-y-2">
                        {c.conflicts.map((pair, j) => (
                          <div key={j} className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs">
                            <div className="grid sm:grid-cols-2 gap-2">
                              <div>
                                <span className="font-bold text-rose-700">Slot A: </span>
                                <span className="text-rose-600 font-semibold">
                                  {getName(teachers, pair.a?.teacherId)} — {getName(subjects, pair.a?.subjectId)}
                                </span>
                                <div className="mt-0.5 flex items-center gap-1 text-rose-500 font-semibold">
                                  <FaClock className="text-[9px]" /> {pair.a?.startTime} – {pair.a?.endTime}
                                </div>
                              </div>
                              <div>
                                <span className="font-bold text-rose-700">Slot B: </span>
                                <span className="text-rose-600 font-semibold">
                                  {getName(teachers, pair.b?.teacherId)} — {getName(subjects, pair.b?.subjectId)}
                                </span>
                                <div className="mt-0.5 flex items-center gap-1 text-rose-500 font-semibold">
                                  <FaClock className="text-[9px]" /> {pair.b?.startTime} – {pair.b?.endTime}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* quick links */}
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <Link to="/ai/setup" className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FaDoorOpen />
                </div>
                <span className="font-bold text-sm text-navy">Back to AI Setup</span>
              </Link>
              <Link to="/ai/optimization" className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiSparkles />
                </div>
                <span className="font-bold text-sm text-navy">View Optimisation Suggestions</span>
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
