import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaLightbulb, FaBrain, FaCheckCircle, FaSync, FaArrowRight,
  FaBalanceScale, FaDoorOpen, FaClock, FaBook, FaUserTie,
  FaExclamationTriangle, FaDatabase, FaRocket, FaTable,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { PageShell } from './AISchedulingIndex';
import {
  optimizeTimetable,
  applyTimetableFixes,
  getTimetableConflicts,
  getTimetables,
  seedTimetableFromSetup,
} from '../../services/api';

/* ════════════════════════════════════════════
   STYLE MAPS
════════════════════════════════════════════ */
const SEV_STYLE = {
  high:   'border-red-200   dark:border-red-800   bg-red-50   dark:bg-red-950/30   text-red-700   dark:text-red-300',
  medium: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  low:    'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  info:   'border-blue-200  dark:border-blue-800  bg-blue-50  dark:bg-blue-950/30  text-blue-700  dark:text-blue-300',
};
const BADGE_STYLE = {
  high:   'bg-red-100   dark:bg-red-900   text-red-700   dark:text-red-300',
  medium: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  low:    'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
  info:   'bg-blue-100  dark:bg-blue-900  text-blue-700  dark:text-blue-300',
};

const TYPE_ICON = {
  teacher:  '👤',
  room:     '🚪',
  subject:  '📚',
  overload: '🔥',
  schedule: '💡',
};

/* ════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div className="relative border border-slate-100 dark:border-slate-700/60 rounded-2xl p-5 flex items-start gap-4 overflow-hidden bg-white/60 dark:bg-slate-800/60">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent" />
      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-full" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-4/5" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg, icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm`}
    >
      <div className={`h-1 w-full ${bg || 'bg-slate-200'}`} />
      <div className="p-5 text-center">
        <div className={`text-3xl font-extrabold ${color} mb-1 tabular-nums`}>{value}</div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </motion.div>
  );
}

function SuggestionCard({ suggestion, applied, onApply, applying }) {
  const id        = suggestion.conflictId || suggestion.message;
  const isApplied  = applied.has(id);
  const isApplying = applying === id;
  const sev        = ['high','medium','low','info'].includes(suggestion.severity) ? suggestion.severity : 'info';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border rounded-2xl p-5 flex items-start gap-4 transition-all duration-300
        ${isApplied ? 'opacity-50 saturate-50 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700' : SEV_STYLE[sev]}
        ${!isApplied ? 'hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm bg-white/80 dark:bg-slate-800/70' : ''}
        ${isApplying ? 'scale-95 opacity-30' : 'scale-100'}`}
    >
      <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
        {TYPE_ICON[suggestion.type] || '💡'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="font-bold text-sm leading-snug">{suggestion.message}</span>
          <span className={`text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5 ${BADGE_STYLE[sev]}`}>
            {sev}
          </span>
          {isApplied && (
            <span className="text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              ✓ Applied
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed mb-2 opacity-75">{suggestion.fix}</p>
      </div>

      <button
        id={`apply-fix-${id}`}
        onClick={() => onApply(id)}
        disabled={isApplied || isApplying}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
          ${isApplied
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 cursor-not-allowed border border-emerald-200 dark:border-emerald-800 shadow-none'
            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600 hover:scale-[1.05] active:scale-95 shadow-sm hover:shadow-md'
          }`}
      >
        {isApplied ? <><FaCheckCircle className="text-emerald-500" /> Applied</> : 'Apply Fix'}
      </button>
    </motion.div>
  );
}

/* Before/After comparison mini-table */
function ComparisonTable({ before, after }) {
  if (!before || !after) return null;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {[
        { label: 'Before Optimization',  data: before, color: 'from-red-500 to-rose-600',       borderClass: 'border-red-200 dark:border-red-800' },
        { label: 'After Optimization',   data: after,  color: 'from-emerald-500 to-teal-600',   borderClass: 'border-emerald-200 dark:border-emerald-800' },
      ].map(({ label, data, color, borderClass }) => (
        <div key={label} className={`border ${borderClass} rounded-2xl overflow-hidden shadow-sm`}>
          <div className={`bg-gradient-to-r ${color} text-white px-4 py-3 text-sm font-bold flex items-center gap-2`}>
            <FaTable className="text-xs" /> {label}
          </div>
          <div className="p-4 space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>Total Entries</span><span className="font-bold">{data.entries?.length || 0}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>Conflicts</span>
              <span className={`font-extrabold ${data.conflicts?.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {data.conflicts?.length || 0}
              </span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>High Severity</span>
              <span className="font-bold text-rose-500">
                {data.conflicts?.filter(c => c.severity === 'high').length || 0}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function OptimizationSuggestions() {
  const [suggestions,  setSuggestions]  = useState([]);
  const [applied,      setApplied]      = useState(new Set());
  const [generated,    setGenerated]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [applying,     setApplying]     = useState(null);
  const [dbEntries,    setDbEntries]    = useState(0);
  const [seeding,      setSeeding]      = useState(false);
  const [optimResult,  setOptimResult]  = useState(null); // { before, after, meta }
  const [publishing,   setPublishing]   = useState(false);
  const [published,    setPublished]    = useState(false);
  const [dataRefreshed, setDataRefreshed] = useState(false); // banner: new data arrived

  // Track previous count to detect changes made by other admins
  const prevCountRef = useRef(0);

  /* Load DB entry count — called manually and by background poll */
  const loadDbCount = useCallback(async (silent = false) => {
    try {
      const res = await getTimetables();
      const count = res.data?.count || 0;
      console.log('[OptimizationSuggestions] DB entries:', count, silent ? '(background poll)' : '(manual)');
      setDbEntries(count);
    } catch (e) {
      if (!silent) console.error('[OptimizationSuggestions] loadDbCount error:', e.message);
    }
  }, []);

  /* Initial load + 5-second auto-polling */
  useEffect(() => {
    loadDbCount();
    const interval = setInterval(() => loadDbCount(true), 5000);
    return () => clearInterval(interval);
  }, [loadDbCount]);

  /* Detect when another admin changes the timetable */
  useEffect(() => {
    if (dbEntries === 0) { prevCountRef.current = 0; return; }
    if (prevCountRef.current !== 0 && prevCountRef.current !== dbEntries) {
      console.log('[OptimizationSuggestions] Entry count changed:', prevCountRef.current, '→', dbEntries, '— notifying user...');
      if (generated) setDataRefreshed(true);
    }
    prevCountRef.current = dbEntries;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbEntries]);

  /* ── Seed DB ── */
  const handleSeed = useCallback(async () => {
    if (!window.confirm('This will re-seed the Timetable collection from the latest AI Setup. Continue?')) return;
    setSeeding(true);
    try {
      const res = await seedTimetableFromSetup();
      toast.success(`✅ Seeded ${res.data?.count || 0} entries`);
      await loadDbCount();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  }, [loadDbCount]);

  /* ── Generate AI Suggestions from real DB ── */
  const runAnalysis = useCallback(async () => {
    if (generated) {
      const ok = window.confirm('Suggestions already generated. Clear and regenerate?');
      if (!ok) return;
    }

    setLoading(true);
    setSuggestions([]);
    setApplied(new Set());
    setGenerated(false);
    setOptimResult(null);
    setPublished(false);

    try {
      // Fetch conflicts first for suggestions
      const cfRes    = await getTimetableConflicts();
      const { suggestions: sugg = [], meta: m = {} } = cfRes.data;

      if (m.totalEntries === 0) {
        toast.warning('No timetable data in MongoDB — seed the database first');
        setLoading(false);
        return;
      }

      setSuggestions(sugg);
      setGenerated(true);

      if (sugg.length === 0) {
        toast.success('🌟 Timetable is already optimized — no suggestions needed!');
      } else {
        toast.success(`📡 ${sugg.length} AI suggestion${sugg.length > 1 ? 's' : ''} generated from real DB data`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Analysis failed — is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [generated]);

  /* ── Auto Optimize (run full engine) ── */
  const runAutoOptimize = useCallback(async () => {
    setLoading(true);
    setOptimResult(null);
    try {
      const res = await optimizeTimetable();
      const { before, after, meta } = res.data;
      setOptimResult({ before, after, meta });
      setGenerated(true);

      if (meta.improvement > 0) {
        toast.success(`✅ Auto-optimize resolved ${meta.improvement} conflict${meta.improvement > 1 ? 's' : ''}!`);
      } else {
        toast.info('No additional improvements found — timetable is already optimal');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Optimization failed');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Apply a single suggestion fix ── */
  async function applyFix(id) {
    if (applied.has(id)) { toast.warning('Already applied'); return; }
    setApplying(id);
    await new Promise(r => setTimeout(r, 300));
    const newApplied = new Set([...applied, id]);
    setApplied(newApplied);
    setApplying(null);
    toast.success('Fix applied ✓');
    if (newApplied.size === suggestions.length) toast.info('All suggestions applied! 🎉');
  }

  /* ── Approve & Publish (save optimized to DB) ── */
  const handlePublish = useCallback(async () => {
    if (!optimResult?.after?.entries) {
      toast.error('Run Auto Optimize first to generate an optimized timetable');
      return;
    }
    setPublishing(true);
    try {
      const res = await applyTimetableFixes(optimResult.after.entries);
      toast.success(`🚀 ${res.data?.updatedCount || 0} entries saved to MongoDB!`);
      setPublished(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save to database');
    } finally {
      setPublishing(false);
    }
  }, [optimResult]);

  /* ── Derived stats ── */
  const highCount    = suggestions.filter(s => s.severity === 'high').length;
  const pendingCount = suggestions.filter(s => !applied.has(s.conflictId || s.message)).length;

  return (
    <PageShell
      title="Optimization & AI Suggestions"
      subtitle="AI-powered analysis on real MongoDB timetable data — auto-optimize and publish"
      icon={<FaLightbulb />}
      gradient="bg-gradient-to-r from-violet-700 to-indigo-700"
      breadcrumb="Optimization"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">

        {/* ── DB Status Banner ── */}
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 mb-7 border ${
          dbEntries > 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <FaDatabase className={dbEntries > 0 ? 'text-emerald-500' : 'text-amber-500'} />
            <div>
              <div className={`font-bold text-sm ${dbEntries > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {dbEntries > 0 ? `${dbEntries} timetable entries in MongoDB` : 'No timetable data — seed required'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {dbEntries > 0 ? 'Ready to scan and optimize' : 'Run AI Setup → Seed DB to get started'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              id="reload-db-opt-btn"
              onClick={() => loadDbCount()}
              title="Reload entry count from MongoDB"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
            >
              <FaSync /> Reload from DB
            </button>
            <button
              id="seed-db-opt-btn"
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
            >
              {seeding ? <FaSync className="animate-spin" /> : <FaDatabase />}
              {seeding ? 'Seeding...' : 'Seed DB'}
            </button>
          </div>
        </div>

        {/* ── Live Data Updated Notice ── */}
        {dataRefreshed && !loading && (
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
              <FaSync className="text-blue-500 animate-spin" style={{ animationDuration: '3s' }} />
              Live data updated — another admin changed the timetable
            </div>
            <button
              onClick={() => { setDataRefreshed(false); runAnalysis(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all active:scale-95"
            >
              <FaBrain /> Re-analyse
            </button>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            id="run-optimization-btn"
            onClick={runAnalysis}
            disabled={loading}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-base"
          >
            {loading
              ? <><FaSync className="animate-spin" /> Analysing...</>
              : <><FaBrain /><HiSparkles className="text-indigo-200" /> Generate AI Suggestions</>}
          </button>

          <button
            id="auto-optimize-btn"
            onClick={runAutoOptimize}
            disabled={loading}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-base"
          >
            {loading
              ? <><FaSync className="animate-spin" /> Optimizing...</>
              : <><FaRocket /> Auto Optimize</>}
          </button>
        </div>

        {/* ── Skeleton ── */}
        {loading && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <FaBrain className="text-violet-500 animate-pulse" />
              <span className="font-semibold">AI engine analysing real MongoDB data...</span>
            </div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && !generated && (
          <div className="text-center py-14">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/60 dark:to-indigo-950/60 flex items-center justify-center text-4xl">
              💡
            </div>
            <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-xl mb-2">No Analysis Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
              Click <strong>Generate AI Suggestions</strong> or <strong>Auto Optimize</strong> to analyse your real MongoDB timetable.
            </p>
          </div>
        )}

        {/* ── Stats Row ── */}
        {!loading && generated && suggestions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Suggestions" value={suggestions.length} color="text-indigo-600 dark:text-indigo-400" />
            <StatCard label="High Priority"      value={highCount}          color="text-red-500" />
            <StatCard label="Pending Fixes"      value={pendingCount}       color="text-amber-500" />
          </div>
        )}

        {/* ── Progress Bar ── */}
        {!loading && generated && suggestions.length > 0 && (
          <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span>Optimisation Progress</span>
              <span>{applied.size}/{suggestions.length} applied</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                style={{ width: `${suggestions.length > 0 ? (applied.size / suggestions.length) * 100 : 0}%` }}
              />
            </div>
            {applied.size === suggestions.length && suggestions.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <FaCheckCircle /> All suggestions applied — proceed to approve & publish 🎉
              </div>
            )}
          </div>
        )}

        {/* ── Suggestion Cards ── */}
        {!loading && generated && suggestions.length > 0 && (
          <div className="space-y-4 mb-8">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={s.conflictId || i}
                suggestion={s}
                applied={applied}
                onApply={applyFix}
                applying={applying}
              />
            ))}
          </div>
        )}

        {/* ── Before/After Comparison ── */}
        {!loading && optimResult && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg overflow-hidden mb-8">
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <FaTable className="text-lg" />
              <h2 className="font-bold text-base">Before vs After Comparison</h2>
              <span className="ml-auto text-xs font-bold bg-white/20 rounded-full px-3 py-1">
                {optimResult.meta?.improvement || 0} conflicts resolved
              </span>
            </div>
            <div className="p-5 space-y-4">
              <ComparisonTable before={optimResult.before} after={optimResult.after} />

              {/* Meta stats */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <StatCard label="Conflicts Before" value={optimResult.meta?.conflictsBefore || 0} color="text-red-500" />
                <StatCard label="Conflicts After"  value={optimResult.meta?.conflictsAfter  || 0} color="text-emerald-500" />
                <StatCard label="Improvement"      value={`${optimResult.meta?.improvement  || 0}`} color="text-violet-600 dark:text-violet-400" />
              </div>

              {/* Approve & Publish */}
              {!published ? (
                <button
                  id="approve-publish-btn"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-base"
                >
                  {publishing
                    ? <><FaSync className="animate-spin" /> Saving to MongoDB...</>
                    : <><FaRocket /> Approve & Publish to MongoDB</>}
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-2xl px-6 py-4">
                  <FaCheckCircle className="text-xl" />
                  <div>
                    <div className="font-extrabold">Optimized Timetable Published!</div>
                    <div className="text-sm opacity-80">Changes saved to MongoDB successfully</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── No suggestions state ── */}
        {!loading && generated && suggestions.length === 0 && !optimResult && (
          <div className="text-center py-10 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div className="text-4xl mb-3">🌟</div>
            <h3 className="font-extrabold text-emerald-700 dark:text-emerald-300 text-lg mb-1">Timetable is Already Optimal!</h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">No conflicts or issues found in the real database</p>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between mt-6">
          <Link
            to="/ai-scheduling/conflicts"
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            ← Conflicts
          </Link>
          <Link
            to="/ai-scheduling/analytics"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-sm shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
          >
            Final Schedule & Approval <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
