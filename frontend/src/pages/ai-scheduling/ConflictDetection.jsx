import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaExclamationTriangle, FaCheckCircle, FaUserTie, FaDoorOpen,
  FaBook, FaClock, FaShieldAlt, FaTrash, FaSearch,
  FaBrain, FaInfoCircle, FaWifi, FaDatabase, FaSync,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { PageShell } from './AISchedulingIndex';
import {
  getTimetableConflicts,
  seedTimetableFromSetup,
  getTimetables,
} from '../../services/api';

/* ════════════════════════════════════════════
   SEVERITY STYLE MAPS
════════════════════════════════════════════ */
const SEV_CARD = {
  high:   'border-l-red-500   bg-red-50   dark:bg-red-950/25   border border-red-200   dark:border-red-800   text-red-700   dark:text-red-300',
  medium: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  low:    'border-l-blue-500  bg-blue-50  dark:bg-blue-950/25  border border-blue-200  dark:border-blue-800  text-blue-700  dark:text-blue-300',
};
const SEV_BADGE = {
  high:   'bg-red-100   dark:bg-red-900   text-red-700   dark:text-red-300',
  medium: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  low:    'bg-blue-100  dark:bg-blue-900  text-blue-700  dark:text-blue-300',
};
const FILTER_BADGE = {
  all:      'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
  teacher:  'bg-red-100   dark:bg-red-900   text-red-700   dark:text-red-300',
  room:     'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  subject:  'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  timeslot: 'bg-blue-100  dark:bg-blue-900  text-blue-700  dark:text-blue-300',
  overload: 'bg-rose-100  dark:bg-rose-900  text-rose-700  dark:text-rose-300',
};

const TYPE_ICONS = {
  teacher:  '👤',
  room:     '🚪',
  subject:  '📚',
  overload: '🔥',
  timeslot: '⏰',
};

/* ════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════ */

function SkeletonCard() {
  return (
    <div className="relative border border-slate-100 dark:border-slate-700/60 rounded-2xl p-5 flex items-start gap-4 overflow-hidden bg-white/60 dark:bg-slate-800/60">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent" />
      <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-lg w-2/3" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-full" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-4/5" />
      </div>
    </div>
  );
}

function ConflictCard({ conflict, onResolve, resolving }) {
  const isResolving = resolving === (conflict.id || conflict.detail);
  const sev = conflict.severity || 'medium';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isResolving ? 0 : 1, y: 0, scale: isResolving ? 0.95 : 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className={`border-l-[5px] rounded-2xl p-4 flex items-start gap-3.5 transition-shadow duration-300
        ${SEV_CARD[sev]}
        ${!isResolving ? 'hover:shadow-lg hover:-translate-y-0.5' : 'pointer-events-none'}
        bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm`}
    >
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-base flex-shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
        {TYPE_ICONS[conflict.type] || '⚠️'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm leading-snug">{conflict.message}</span>
          <span className={`text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5 ${SEV_BADGE[sev]}`}>
            {sev}
          </span>
          {conflict.day && conflict.day !== 'All' && (
            <span className="text-[9px] bg-white/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 font-semibold">
              {conflict.day} · {conflict.time}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed opacity-75">{conflict.detail}</p>
      </div>

      <button
        id={`resolve-${conflict.id || conflict.type}`}
        onClick={() => onResolve(conflict.id || conflict.detail)}
        title="Mark as resolved"
        className="flex-shrink-0 p-2 rounded-xl bg-white/70 dark:bg-slate-700/50 border border-slate-200/70 dark:border-slate-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 opacity-70 hover:opacity-100 hover:scale-110 shadow-sm"
      >
        <FaCheckCircle className="text-emerald-500 text-sm" />
      </button>
    </motion.div>
  );
}

function FilterTabs({ filter, setFilter, counts }) {
  const tabs = [
    { key: 'all',      label: 'All',        icon: null },
    { key: 'teacher',  label: 'Teacher',    icon: <FaUserTie className="text-[10px]" /> },
    { key: 'room',     label: 'Room',       icon: <FaDoorOpen className="text-[10px]" /> },
    { key: 'subject',  label: 'Subject',    icon: <FaBook className="text-[10px]" /> },
    { key: 'overload', label: 'Overload',   icon: <FaExclamationTriangle className="text-[10px]" /> },
    { key: 'timeslot', label: 'Time Slots', icon: <FaClock className="text-[10px]" /> },
  ];
  return (
    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
      {tabs.map(({ key, label, icon }) => {
        const count    = counts[key] ?? 0;
        const isActive = filter === key;
        return (
          <button
            key={key}
            id={`conflict-filter-${key}`}
            onClick={() => setFilter(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200
              ${isActive
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30 scale-[1.04]'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:scale-[1.02]'
              }`}
          >
            {icon && <span>{icon}</span>}
            {label}
            {count > 0 && (
              <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/25' : FILTER_BADGE[key]}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function InsightPanel({ conflicts, meta }) {
  const criticalCount    = conflicts.filter(c => c.severity === 'high').length;
  const overloadCount    = conflicts.filter(c => c.type === 'overload').length;
  const teacherConflicts = conflicts.filter(c => c.type === 'teacher').length;

  const insights = [];
  if (criticalCount > 0)
    insights.push({ icon: '⚠️', text: `${criticalCount} critical conflict${criticalCount > 1 ? 's' : ''} require immediate attention`, type: 'critical' });
  if (overloadCount > 0)
    insights.push({ icon: '⚠️', text: `${overloadCount} teacher${overloadCount > 1 ? 's are' : ' is'} overloaded — exceeds 3 sessions/day`, type: 'warn' });
  if (teacherConflicts > 0)
    insights.push({ icon: '💡', text: 'Redistribute subjects across teachers to reduce conflicts', type: 'tip' });
  if (meta?.totalEntries > 0 && conflicts.length === 0)
    insights.push({ icon: '✅', text: `All ${meta.totalEntries} timetable entries are conflict-free!`, type: 'ok' });
  if (insights.length === 0)
    insights.push({ icon: '✅', text: 'No critical conflicts — schedule looks healthy!', type: 'ok' });

  const styleMap = {
    critical: 'bg-red-50   dark:bg-red-950/30   border-red-200   dark:border-red-800   text-red-700   dark:text-red-300',
    warn:     'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    tip:      'bg-blue-50  dark:bg-blue-950/30  border-blue-200  dark:border-blue-800  text-blue-700  dark:text-blue-300',
    ok:       'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md overflow-hidden mt-6">
      <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-700 text-white">
        <FaBrain className="text-lg" />
        <h2 className="font-bold text-base">AI Insights</h2>
        <div className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-200 bg-white/10 border border-white/20 rounded-full px-3 py-1">
          <HiSparkles className="text-cyan-300" /> Real DB Analysis
        </div>
      </div>
      <div className="p-5 space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className={`border rounded-xl px-4 py-3 flex items-start gap-3 text-sm ${styleMap[ins.type]}`}>
            <span className="text-base flex-shrink-0 mt-0.5">{ins.icon}</span>
            <span className="leading-relaxed font-medium">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-6"
    >
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/60 dark:to-orange-950/60 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center text-4xl">
          {hasData ? '🎉' : '🔍'}
        </div>
      </div>
      <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-xl mb-2">
        {hasData ? 'All Clear — No Conflicts!' : 'Ready to Scan'}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
        {hasData
          ? 'Your timetable loaded from MongoDB is conflict-free. Proceed to AI Optimization.'
          : 'Click the Scan Conflicts button above to analyse your live timetable from MongoDB.'}
      </p>
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function ConflictDetection() {
  const [conflicts,   setConflicts]   = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [meta,        setMeta]        = useState(null);
  const [scanned,     setScanned]     = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [filter,      setFilter]      = useState('all');
  const [resolving,   setResolving]   = useState(null);
  const [seeding,     setSeeding]     = useState(false);
  const [dbEntries,   setDbEntries]   = useState(0);
  const [dataRefreshed, setDataRefreshed] = useState(false); // banner: new data arrived

  // Track previous count to detect changes made by other admins
  const prevCountRef = useRef(0);

  /* Load DB entry count — called manually and by the background poll */
  const loadDbCount = useCallback(async (silent = false) => {
    try {
      const res = await getTimetables();
      const count = res.data?.count || 0;
      console.log('[ConflictDetection] DB entries:', count, silent ? '(background poll)' : '(manual)');
      setDbEntries(count);
    } catch (e) {
      if (!silent) console.error('[ConflictDetection] loadDbCount error:', e.message);
    }
  }, []);

  /* Initial load + 5-second auto-polling */
  useEffect(() => {
    loadDbCount();
    const interval = setInterval(() => loadDbCount(true), 5000);
    return () => clearInterval(interval);
  }, [loadDbCount]);

  /* Auto-rescan when another admin changes the timetable */
  useEffect(() => {
    if (dbEntries === 0) { prevCountRef.current = 0; return; }
    if (prevCountRef.current !== 0 && prevCountRef.current !== dbEntries) {
      console.log('[ConflictDetection] Entry count changed:', prevCountRef.current, '→', dbEntries, '— auto-rescanning...');
      setDataRefreshed(true);
      // Auto-rescan silently if scan has been done before
      if (scanned && !scanning) runScan(true);
    }
    prevCountRef.current = dbEntries;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbEntries]);

  /* ── Seed DB from AISetup config ── */
  const handleSeed = useCallback(async () => {
    if (!window.confirm('This will clear the Timetable collection and re-seed it from the latest AI Setup.\n\nContinue?')) return;
    setSeeding(true);
    try {
      const res = await seedTimetableFromSetup();
      toast.success(`✅ Seeded ${res.data?.count || 0} entries from AI Setup`);
      const dbRes = await getTimetables();
      setDbEntries(dbRes.data?.count || 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Seed failed — check AI Setup is saved');
    } finally {
      setSeeding(false);
    }
  }, []);

  /* ── Run Conflict Scan on real DB data ──
     silent = true → auto-rescan (no skeleton overlay, no toasts)
  */
  const runScan = useCallback(async (silent = false) => {
    if (!silent) {
      setScanning(true);
      setConflicts([]);
      setSuggestions([]);
      setScanned(false);
      setDataRefreshed(false);
    }

    try {
      const res = await getTimetableConflicts();
      const { conflicts: found = [], suggestions: sugg = [], meta: m = {} } = res.data;

      console.log('[ConflictDetection] Scan result:', found.length, 'conflicts in', m.totalEntries, 'entries', silent ? '(auto)' : '(manual)');
      setConflicts(found);
      setSuggestions(sugg);
      setMeta(m);
      setScanned(true);
      if (!silent) setDataRefreshed(false);

      if (!silent) {
        if (m.totalEntries === 0) {
          toast.warning('No timetable entries found in MongoDB — seed the database first');
        } else if (found.length === 0) {
          toast.success(`🌟 Scan complete — ${m.totalEntries} entries checked, no conflicts!`);
        } else {
          toast.warning(`📡 Found ${found.length} conflict${found.length > 1 ? 's' : ''} in ${m.totalEntries} entries`);
          if (found.some(c => c.type === 'teacher')) toast.error('Teacher conflict detected');
          if (found.some(c => c.type === 'room'))    toast.error('Room double-booking detected');
        }
      }
    } catch (err) {
      if (!silent) toast.error(err?.response?.data?.message || 'Scan failed — is the backend running?');
    } finally {
      if (!silent) setScanning(false);
    }
  }, []);

  /* ── Resolve single conflict (visual only) ── */
  async function resolveConflict(id) {
    setResolving(id);
    await new Promise(r => setTimeout(r, 300));
    const updated = conflicts.filter(c => (c.id || c.detail) !== id);
    setConflicts(updated);
    setResolving(null);
    toast.success('Conflict marked as resolved ✓');
    if (updated.length === 0) toast.success('All conflicts resolved! 🎉');
  }

  function clearAll() {
    if (!window.confirm('Clear all displayed conflicts?')) return;
    setConflicts([]);
    setScanned(false);
    toast.info('Cleared');
  }

  const filtered = filter === 'all' ? conflicts : conflicts.filter(c => c.type === filter);
  const counts = {
    all:      conflicts.length,
    teacher:  conflicts.filter(c => c.type === 'teacher').length,
    room:     conflicts.filter(c => c.type === 'room').length,
    subject:  conflicts.filter(c => c.type === 'subject').length,
    timeslot: conflicts.filter(c => c.type === 'timeslot').length,
    overload: conflicts.filter(c => c.type === 'overload').length,
  };

  return (
    <PageShell
      title="Conflict Detection"
      subtitle="Real-time AI-powered validation using live MongoDB timetable data"
      icon={<FaExclamationTriangle />}
      gradient="bg-gradient-to-r from-amber-600 to-orange-600"
      breadcrumb="Conflicts"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">

        {/* ── DB Status Banner ── */}
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 mb-7 border ${
          dbEntries > 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{dbEntries > 0 ? '✅' : '⚠️'}</span>
            <div>
              <div className={`font-bold text-sm ${dbEntries > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {dbEntries > 0 ? `${dbEntries} timetable entries in MongoDB` : 'No timetable data found in MongoDB'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dbEntries > 0
                  ? 'Database is ready — run conflict scan to analyse real data'
                  : 'Complete AI Setup then seed the database to get started'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              id="reload-db-count-btn"
              onClick={() => loadDbCount()}
              title="Reload entry count from MongoDB"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
            >
              <FaSync /> Reload from DB
            </button>
            <button
              id="seed-db-btn"
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
              title="Seed DB from latest AI Setup"
            >
              {seeding ? <FaSync className="animate-spin" /> : <FaDatabase />}
              {seeding ? 'Seeding...' : 'Seed DB'}
            </button>
            <Link
              to="/ai-scheduling/setup"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"
            >
              → AI Setup
            </Link>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <FaUserTie />,           label: 'Teacher Conflicts', color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/30',    count: counts.teacher  },
            { icon: <FaDoorOpen />,           label: 'Room Conflicts',    color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', count: counts.room  },
            { icon: <FaBook />,               label: 'Subject Overlaps',  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/30',  count: counts.subject  },
            { icon: <FaExclamationTriangle />,label: 'Overload Issues',   color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-950/30',    count: counts.overload },
          ].map(({ icon, label, color, bg, count }) => (
            <div key={label} className={`${bg} rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center hover:shadow-md transition-shadow`}>
              <div className={`text-2xl ${color} flex justify-center mb-1`}>{icon}</div>
              {scanned && <div className={`text-xl font-extrabold ${color} mb-0.5`}>{count}</div>}
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Live Data Updated Notice ── */}
        {dataRefreshed && !scanning && (
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
              <FaWifi className="text-blue-500 animate-pulse" />
              Live data updated — another admin changed the timetable
            </div>
            <button
              onClick={() => runScan()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all active:scale-95"
            >
              <FaSync /> Re-scan
            </button>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap gap-3 justify-center mb-4">
          <button
            id="scan-conflicts-btn"
            onClick={runScan}
            disabled={scanning}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-base"
          >
            {scanning
              ? <><FaSearch className="animate-bounce" /> Scanning MongoDB...</>
              : <><FaShieldAlt /> Scan Conflicts (Real DB)</>}
          </button>

          {scanned && conflicts.length > 0 && (
            <button
              id="clear-conflicts-btn"
              onClick={clearAll}
              className="inline-flex items-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold rounded-2xl transition-all duration-200 text-sm active:scale-95"
            >
              <FaTrash /> Clear
            </button>
          )}
        </div>

        {/* ── Source Badge ── */}
        {scanned && meta && (
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 text-xs font-bold rounded-full px-4 py-1.5 border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <FaWifi /> 📡 Live MongoDB — {meta.totalEntries} entries scanned
            </span>
          </div>
        )}

        {/* ── Scanning Skeleton ── */}
        {scanning && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-6 space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
              <FaSearch className="animate-bounce text-amber-500" />
              <span className="font-semibold">Querying MongoDB timetable — running conflict detection engine...</span>
            </div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty State ── */}
        {!scanning && !scanned && <EmptyState hasData={false} />}

        {/* ── Results ── */}
        {!scanning && scanned && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">

            {/* Summary Bar */}
            <div className={`px-6 py-4 flex items-center gap-3 ${conflicts.length === 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/30'}`}>
              {conflicts.length === 0
                ? <FaCheckCircle className="text-emerald-500 text-xl flex-shrink-0" />
                : <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0" />}
              <div>
                <div className={`font-bold text-base ${conflicts.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {conflicts.length === 0
                    ? 'No conflicts — timetable is clean ✓'
                    : `${conflicts.length} issue${conflicts.length > 1 ? 's' : ''} found in real data`}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Scanned {meta?.totalEntries || 0} real DB entries
                </div>
              </div>
            </div>

            {/* All-clear state */}
            {scanned && conflicts.length === 0 && <EmptyState hasData={true} />}

            {/* Filter + Cards */}
            {conflicts.length > 0 && (
              <>
                <FilterTabs filter={filter} setFilter={setFilter} counts={counts} />
                <div className="p-6 space-y-3">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4 italic">
                      No conflicts of this type — try another filter.
                    </p>
                  ) : (
                    filtered.map((c, i) => (
                      <ConflictCard
                        key={c.id || c.detail || i}
                        conflict={c}
                        onResolve={resolveConflict}
                        resolving={resolving}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── AI Insights ── */}
        {scanned && <InsightPanel conflicts={conflicts} meta={meta} />}

        {/* ── AI Suggestions ── */}
        {scanned && suggestions.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md overflow-hidden mt-6">
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white">
              <FaInfoCircle className="text-lg" />
              <h2 className="font-bold text-base">AI Fix Suggestions</h2>
              <span className="ml-auto text-[10px] font-bold bg-white/20 border border-white/20 rounded-full px-3 py-1">
                {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-5 space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 rounded-xl px-4 py-3">
                  <div className="font-bold text-sm text-violet-800 dark:text-violet-200 mb-1">{s.message}</div>
                  <div className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">{s.fix}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between mt-8">
          <Link
            to="/ai-scheduling/setup"
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            ← Setup
          </Link>
          <Link
            to="/ai-scheduling/optimization"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
          >
            Optimization & AI Suggestions →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
