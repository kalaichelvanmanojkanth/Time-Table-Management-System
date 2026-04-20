import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUserTie, FaBookOpen, FaDoorOpen, FaCalendarAlt,
  FaSync, FaTrash, FaSearch, FaFilter, FaTimes,
  FaArrowLeft, FaExclamationTriangle, FaCheckCircle,
  FaLightbulb, FaChartBar, FaDownload,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  fetchLecturers, fetchSubjects, fetchRooms, fetchTimetables,
  calcLecturerWorkload, calcRoomUtilization, calcSubjectDistribution,
  detectRoomConflicts, generateInsights, calcWeeklyTrend,
  calcWeeklyTrendFromSource,
  normalizeArray,
  normaliseEntries,
} from '../../services/analyticsService';

/* ── Constants ── */
const PIE_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316'];

/* Distinct palette for per-item coloring */
const CHART_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#a855f7', '#fb7185',
];

const STATUS_COLORS = {
  overloaded:  '#ef4444',
  underloaded: '#f59e0b',
  optimal:     null,
};

const DEFAULT_FILTERS = { lecturerId: '', subjectId: '', roomId: '', period: 'week' };

/* ══════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════ */

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-5">
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-indigo-500 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-slate-700 font-bold text-lg">Loading dashboard…</p>
        <p className="text-slate-400 text-sm mt-1">Fetching your timetable analytics</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl px-6 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
            <div className="w-8 h-8 bg-slate-100 rounded-xl mb-3" />
            <div className="h-7 bg-slate-100 rounded-lg mb-2 w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, desc, icon: Icon = FaChartBar, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-3xl mb-5">
        <Icon />
      </div>
      <p className="font-bold text-slate-700 text-lg mb-1">{title}</p>
      <p className="text-slate-400 text-sm max-w-xs">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function KPICard({ icon, label, value, color, bg, trend }) {
  return (
    <div className={`${bg} rounded-2xl p-5 shadow-sm border border-white/60 flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className={`w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center ${color} text-xl flex-shrink-0 shadow-sm`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-2xl sm:text-3xl font-extrabold ${color} leading-none`}>{value}</div>
        <div className="text-xs font-semibold text-slate-500 mt-1">{label}</div>
        {trend && <div className="text-[10px] text-slate-400 mt-0.5">{trend}</div>}
      </div>
    </div>
  );
}

function MiniCard({ title, children, empty }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</p>
      {empty
        ? <div className="h-24 flex items-center justify-center text-slate-300 text-xs">No data</div>
        : children}
    </div>
  );
}

function ChartCard({ title, subtitle, icon, badge, children, empty, emptyText = 'No data for selected filters' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-lg">{icon}</span>
        <h3 className="font-extrabold text-slate-800">{title}</h3>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mb-5">{subtitle}</p>}
      {empty
        ? <div className="h-52 flex items-center justify-center text-slate-300 text-sm">{emptyText}</div>
        : children}
    </div>
  );
}

function InsightCard({ ins }) {
  const map = {
    warning: { bg: 'bg-amber-50  border-amber-200',     dot: 'bg-amber-400',  label: 'bg-amber-100  text-amber-700',   emoji: '⚠️' },
    error:   { bg: 'bg-rose-50   border-rose-200',      dot: 'bg-rose-500',   label: 'bg-rose-100   text-rose-700',    emoji: '🔴' },
    info:    { bg: 'bg-blue-50   border-blue-200',      dot: 'bg-blue-400',   label: 'bg-blue-100   text-blue-700',    emoji: '💡' },
    success: { bg: 'bg-emerald-50 border-emerald-200',  dot: 'bg-emerald-400',label: 'bg-emerald-100 text-emerald-700',emoji: '✅' },
  };
  const s = map[ins.type] || map.info;
  return (
    <div className={`rounded-xl border p-4 ${s.bg} flex gap-3 items-start`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon || s.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-bold text-sm text-slate-800">{ins.title}</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${s.label}`}>{ins.type}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{ins.desc}</p>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, body, onCancel, onConfirm, danger }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 ${danger ? 'bg-rose-100 text-rose-500' : 'bg-amber-100 text-amber-500'}`}>
          <FaExclamationTriangle />
        </div>
        <h3 className="font-extrabold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{body}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`px-5 py-2 text-xs font-extrabold rounded-xl text-white transition-colors ${danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const BarLabel = ({ x, y, width, value, suffix = 'h' }) => (
  <text x={x + width / 2} y={y - 5} fill="#94a3b8" textAnchor="middle" fontSize={10} fontWeight={700}>{value}{suffix}</text>
);

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AnalyticsDashboard() {
  /* Data */
  const [lecturers, setLecturers] = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [rooms,     setRooms]     = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [sessions,  setSessions]  = useState([]);

  /* UI state */
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [lastSync,  setLastSync]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [filters,   setFilters]   = useState(DEFAULT_FILTERS);
  const [cleared,   setCleared]   = useState(false);
  const [showClearDlg,  setShowClearDlg]  = useState(false);
  const [reportDeleted, setReportDeleted] = useState(false);
  const [showDelDlg,    setShowDelDlg]    = useState(false);

  /* ── Load real data from backend ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    setCleared(false);
    setReportDeleted(false);

    try {
      const [lecs, subjs, rms, tts] = await Promise.all([
        fetchLecturers().catch(e => { console.error('[Dashboard] fetchLecturers:', e.message); return []; }),
        fetchSubjects().catch(e  => { console.error('[Dashboard] fetchSubjects:', e.message);  return []; }),
        fetchRooms().catch(e     => { console.error('[Dashboard] fetchRooms:', e.message);     return []; }),
        fetchTimetables().catch(e=> { console.error('[Dashboard] fetchTimetables:', e.message);return []; }),
      ]);

      setLecturers(normalizeArray(lecs));
      setSubjects(normalizeArray(subjs));
      setRooms(normalizeArray(rms));
      setTimetable(normalizeArray(tts));
      setSessions(normalizeArray(tts));
      setLastSync(new Date());
    } catch (err) {
      console.error('[Dashboard] loadAll error:', err.message);
      setError(`Failed to load analytics data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Export handler ── */
  const handleExport = useCallback(() => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        summary: {
          lecturers:       lecturers.length,
          subjects:        subjects.length,
          rooms:           rooms.length,
          scheduledClasses: sessions.length,
        },
        lecturers,
        subjects,
        rooms,
        timetable,
        sessions,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `timetable-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }, [lecturers, subjects, rooms, timetable, sessions]);

  /* Search-filtered master lists */
  const q = search.toLowerCase().trim();
  const sLecturers = useMemo(() => q ? lecturers.filter(l => l.name?.toLowerCase().includes(q) || l.department?.toLowerCase().includes(q)) : lecturers, [lecturers, q]);
  const sSubjects  = useMemo(() => q ? subjects.filter(s => s.name?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q)) : subjects, [subjects, q]);
  const sRooms     = useMemo(() => q ? rooms.filter(r => r.name?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q)) : rooms, [rooms, q]);

  /* Filtered sessions */
  const filteredSessions = useMemo(() => {
    if (cleared) return [];
    return sessions.filter(e => {
      const lid = e.lecturerId?._id || e.lecturerId || e.teacherId?._id || e.teacherId;
      const sid = e.subjectId?._id  || e.subjectId;
      const rid = e.roomId?._id     || e.roomId;
      if (filters.lecturerId && lid?.toString() !== filters.lecturerId) return false;
      if (filters.subjectId  && sid?.toString() !== filters.subjectId)  return false;
      if (filters.roomId     && rid?.toString() !== filters.roomId)     return false;
      if (q) {
        const lecturerMatch = sLecturers.some(l => l._id === lid);
        const subjectMatch  = sSubjects.some(s => s._id === sid);
        const roomMatch     = sRooms.some(r => r._id === rid);
        if (!lecturerMatch && !subjectMatch && !roomMatch) return false;
      }
      return true;
    });
  }, [sessions, filters, cleared, q, sLecturers, sSubjects, sRooms]);

  const fLecturers = useMemo(() => filters.lecturerId ? sLecturers.filter(l => l._id === filters.lecturerId) : sLecturers, [sLecturers, filters.lecturerId]);
  const fSubjects  = useMemo(() => filters.subjectId  ? sSubjects.filter(s => s._id === filters.subjectId)   : sSubjects,  [sSubjects, filters.subjectId]);
  const fRooms     = useMemo(() => filters.roomId      ? sRooms.filter(r => r._id === filters.roomId)         : sRooms,     [sRooms,    filters.roomId]);

  /* Analytics */
  const workload    = useMemo(() => calcLecturerWorkload(fLecturers, filteredSessions),   [fLecturers, filteredSessions]);
  const roomUtil    = useMemo(() => calcRoomUtilization(fRooms,      filteredSessions),   [fRooms,     filteredSessions]);
  const subjectDist = useMemo(() => calcSubjectDistribution(fSubjects, filteredSessions), [fSubjects,  filteredSessions]);
  const conflicts   = useMemo(() => detectRoomConflicts(filteredSessions),                [filteredSessions]);
  const insights    = useMemo(() => generateInsights(workload, roomUtil, conflicts, subjectDist), [workload, roomUtil, conflicts, subjectDist]);

  /* ── DEMO DATA (temporary presentation mode) ──
   * workloadData and roomBar always return these arrays so the charts
   * are ALWAYS visible regardless of backend state.
   * Subject Usage and Weekly Schedule are unaffected — they still use live data.
   * ────────────────────────────────────────────────────────── */
  const LECTURER_WORKLOAD_DEMO = [
    { name: 'Dr.Nimal',   hours:  7, fullName: 'Dr.Nimal',   status: 'optimal',     suffix: 'h', fill: '#6366f1' },
    { name: 'Jana',       hours:  9, fullName: 'Jana',       status: 'optimal',     suffix: 'h', fill: '#6366f1' },
    { name: 'Jaysooriya', hours: 13, fullName: 'Jaysooriya', status: 'underloaded', suffix: 'h', fill: '#f59e0b' },
    { name: 'Perera',     hours: 17, fullName: 'Perera',     status: 'optimal',     suffix: 'h', fill: '#6366f1' },
    { name: 'Thilani',    hours: 21, fullName: 'Thilani',    status: 'overloaded',  suffix: 'h', fill: '#ef4444' },
  ];

  const ROOM_USAGE_DEMO = [
    { name: 'Lab A402', pct: 58, fill: '#10b981' },
    { name: 'G1304',    pct: 67, fill: '#10b981' },
    { name: 'B405',     pct: 73, fill: '#f59e0b' },
    { name: 'B401',     pct: 82, fill: '#ef4444' },
    { name: 'AB402',    pct: 49, fill: '#10b981' },
    { name: 'A403',     pct: 61, fill: '#10b981' },
    { name: 'A402',     pct: 76, fill: '#f59e0b' },
  ];

  /* Chart data — workload and room always use demo arrays */
  // eslint-disable-next-line no-unused-vars
  const useClassCount = false; // demo data uses hours, not class count

  const workloadData = LECTURER_WORKLOAD_DEMO;

  const subjectPie = useMemo(() => reportDeleted ? [] : subjectDist
    .filter(s => s.scheduledHours > 0)
    .map((s, i) => ({ name: s.subjectName, value: s.scheduledHours, fill: PIE_COLORS[i % PIE_COLORS.length] })),
    [subjectDist, reportDeleted]);

  const subjectPieFallback = useMemo(() => reportDeleted ? [] : fSubjects.map((s, i) => ({
    name: s.name, value: s.weeklyHours || 1, fill: PIE_COLORS[i % PIE_COLORS.length],
  })), [fSubjects, reportDeleted]);

  const subjectPieFinal = subjectPie.length > 0 ? subjectPie : subjectPieFallback;

  const roomBar = ROOM_USAGE_DEMO;

  const weeklyTrend = useMemo(() => calcWeeklyTrend(filteredSessions.length > 0 ? filteredSessions : sessions), [filteredSessions, sessions]);

  /* Filter/search state */
  const hasFilters  = filters.lecturerId || filters.subjectId || filters.roomId || filters.period !== 'week';
  const hasSearch   = !!q;
  // noData: demo arrays guarantee workload+room always have data, so only flag truly empty state
  const noData      = !loading && lecturers.length === 0 && subjects.length === 0 && rooms.length === 0
                      && sessions.length === 0; // demo charts always shown, so only hide section when ALL empty
  const noTimetable = false; // weekly trend and subjects may be empty, but workload/room always have demo
  const noResults   = !loading && !noData && filteredSessions.length === 0 && (hasFilters || hasSearch);

  const sel = 'text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 bg-white text-slate-700 transition-all';

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">

      {/* Confirm dialogs */}
      {showClearDlg && (
        <ConfirmDialog danger
          title="Clear Analytics?"
          body="This resets all charts and computed data in the current view. Your raw data stays safe."
          onCancel={() => setShowClearDlg(false)}
          onConfirm={() => { setCleared(true); setFilters(DEFAULT_FILTERS); setSearch(''); setShowClearDlg(false); }}
        />
      )}
      {showDelDlg && (
        <ConfirmDialog
          title="Delete Report View?"
          body="Removes the subject report from this session. Refresh to restore."
          onCancel={() => setShowDelDlg(false)}
          onConfirm={() => { setReportDeleted(true); setShowDelDlg(false); }}
        />
      )}

      {/* ── STICKY HEADER ── */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/analytics" id="dash-back" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
            <FaArrowLeft /> Analytics
          </Link>
          <span className="text-slate-200">/</span>
          <span className="text-xs font-bold text-slate-500">Your Timetable Overview</span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {lastSync && <span className="text-[10px] text-slate-300 hidden sm:inline">Synced {lastSync.toLocaleTimeString()}</span>}
            <button id="btn-export" onClick={handleExport} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
              <FaDownload className="text-[10px]" /> Export
            </button>
            <button id="btn-del-report" onClick={() => setShowDelDlg(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-all">
              <FaTrash className="text-[10px]" /> Delete Report
            </button>
            <button id="btn-clear" onClick={() => setShowClearDlg(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100 transition-all">
              <FaTrash className="text-[10px]" /> Clear
            </button>
            <button id="btn-refresh" onClick={loadAll}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm">
              <FaSync className="text-[10px]" /> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* ── 1. PAGE TITLE ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
              <HiSparkles /> Academic Analytics
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              Your Timetable Overview
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time insights for your lecturers, subjects, rooms, and scheduled classes.</p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700">
            <FaExclamationTriangle className="flex-shrink-0 text-sm" />
            <span className="text-sm font-semibold flex-1">{error}</span>
            <button onClick={loadAll} className="text-xs font-bold underline flex-shrink-0">Retry</button>
          </div>
        )}

        {/* Cleared / Report deleted banners */}
        {cleared && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-700">
            <FaExclamationTriangle className="flex-shrink-0 text-sm" />
            <span className="text-sm font-semibold flex-1">Analytics cleared. Your raw data is safe — click Refresh to reload.</span>
            <button onClick={loadAll} className="text-xs font-bold underline">Reload</button>
          </div>
        )}
        {reportDeleted && !cleared && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-700">
            <FaTrash className="flex-shrink-0 text-sm" />
            <span className="text-sm font-semibold flex-1">Report view removed from this session.</span>
            <button onClick={() => setReportDeleted(false)} className="text-xs font-bold underline">Undo</button>
          </div>
        )}

        {/* No timetable entries warning */}
        {noTimetable && !cleared && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-700">
            <FaExclamationTriangle className="flex-shrink-0" />
            <span className="text-sm font-semibold flex-1">
              No timetable entries found. Charts need schedule data —{' '}
              <Link to="/ai/setup" className="underline font-bold">add entries via AI Scheduling Setup</Link>.
            </span>
            <button onClick={loadAll} className="text-xs font-bold underline flex-shrink-0">Refresh</button>
          </div>
        )}

        {/* ── 2. SEARCH + FILTERS ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
            <input
              id="dashboard-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search lecturers, subjects, rooms…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-indigo-400 bg-slate-50 placeholder-slate-300 text-slate-700 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <FaFilter className="text-[9px]" /> Filters
            </span>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select id="f-lecturer" value={filters.lecturerId} onChange={e => setFilters(p => ({ ...p, lecturerId: e.target.value }))} className={sel}>
                <option value="">All Lecturers</option>
                {lecturers.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
              <select id="f-subject" value={filters.subjectId} onChange={e => setFilters(p => ({ ...p, subjectId: e.target.value }))} className={sel}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <select id="f-room" value={filters.roomId} onChange={e => setFilters(p => ({ ...p, roomId: e.target.value }))} className={sel}>
                <option value="">All Rooms</option>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-bold">
                {['week','month'].map(p => (
                  <button key={p} id={`period-${p}`} onClick={() => setFilters(f => ({ ...f, period: p }))}
                    className={`flex-1 py-2.5 transition-colors ${filters.period === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
                    {p === 'week' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            </div>
            {(hasFilters || hasSearch) && (
              <button id="btn-reset-filters" onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(''); }}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition-all flex-shrink-0">
                <FaTimes className="text-[9px]" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* ── 3. KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={<FaUserTie />}     label="Lecturers"         value={cleared ? 0 : sLecturers.length} color="text-blue-600"    bg="bg-gradient-to-br from-blue-50    to-blue-100/60"    trend={`${filteredSessions.filter((e,_,a) => a.findIndex(x => (x.lecturerId?._id||x.lecturerId||x.teacherId?._id||x.teacherId) === (e.lecturerId?._id||e.lecturerId||e.teacherId?._id||e.teacherId)) === _).length} active this week`} />
          <KPICard icon={<FaBookOpen />}    label="Subjects"          value={cleared ? 0 : fSubjects.length} color="text-indigo-600"  bg="bg-gradient-to-br from-indigo-50  to-indigo-100/60"  trend={`Across ${[...new Set(subjects.map(s=>s.department).filter(Boolean))].length} departments`} />
          <KPICard icon={<FaDoorOpen />}    label="Rooms"             value={cleared ? 0 : fRooms.length}    color="text-emerald-600" bg="bg-gradient-to-br from-emerald-50 to-emerald-100/60" trend={`${roomUtil.filter(r=>r.utilization>0).length} in use`} />
          <KPICard icon={<FaCalendarAlt />} label="Scheduled Classes" value={cleared ? 0 : sessions.length} color="text-amber-600"   bg="bg-gradient-to-br from-amber-50   to-amber-100/60"   trend={`${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} detected`} />
        </div>

        {/* ── 4. MINI SUMMARY CHARTS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <MiniCard title="Workload Snapshot" empty={false}>
            <p className="text-[9px] text-slate-400 text-center mb-1 opacity-70">Sample Data · Demo</p>
            <ResponsiveContainer width="100%" height={88}>
              <BarChart data={LECTURER_WORKLOAD_DEMO.slice(0,5)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip formatter={(v, n, p) => [`${p.payload.fullName}: ${v}h`, '']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="hours" radius={[3,3,0,0]}>
                  {LECTURER_WORKLOAD_DEMO.slice(0,5).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>

          <MiniCard title="Subject Split" empty={subjectPieFinal.length === 0}>
            <ResponsiveContainer width="100%" height={96}>
              <PieChart>
                <Pie data={subjectPieFinal} cx="50%" cy="50%" outerRadius={40} dataKey="value" paddingAngle={2}>
                  {subjectPieFinal.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}h`, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </MiniCard>

          <MiniCard title="Room Usage" empty={false}>
            <p className="text-[9px] text-slate-400 text-center mb-1 opacity-70">Sample Data · Demo</p>
            <ResponsiveContainer width="100%" height={88}>
              <BarChart data={ROOM_USAGE_DEMO.slice(0,5)} layout="vertical" margin={{ top: 0, right: 4, left: -4, bottom: 0 }}>
                <XAxis type="number" domain={[0,100]} hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} width={36} />
                <Tooltip formatter={v => [`${v}%`, 'Usage']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="pct" radius={[0,3,3,0]}>
                  {ROOM_USAGE_DEMO.slice(0,5).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>

          <MiniCard title="Weekly Trend" empty={weeklyTrend.every(d => d.entries === 0)}>
            <ResponsiveContainer width="100%" height={96}>
              <LineChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip formatter={(v) => [v, 'Classes']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="entries" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </MiniCard>
        </div>

        {/* No data / no results empty states */}
        {noData && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <EmptyState
              title="No analytics yet"
              desc="Add lecturers, subjects, rooms, and timetable entries to see insights here."
              icon={FaChartBar}
              action={<Link to="/ai/setup" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">Add Timetable Data</Link>}
            />
          </div>
        )}

        {noResults && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <EmptyState title="No matching results" desc='No data matches your current search or filters. Try adjusting or resetting them.' icon={FaSearch}
              action={<button onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(''); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"><FaTimes /> Reset Filters</button>}
            />
          </div>
        )}

        {/* ── 5. MAIN CHARTS ── */}
        {!noData && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Lecturer Workload */}
            <ChartCard
              icon={<FaUserTie className="text-blue-500" />}
              title="Lecturer Workload"
              subtitle="Weekly teaching hours per faculty member"
              badge={<span className="text-[10px] text-slate-400 opacity-60 font-semibold border border-slate-200 rounded-full px-2 py-0.5">Sample Data · Demo</span>}
              empty={false}
              emptyText="No lecturer workload data available"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={LECTURER_WORKLOAD_DEMO} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} domain={[0, 25]} />
                  <Tooltip
                    formatter={(v, _, p) => [`${p.payload.fullName}: ${v}h`, 'Hours']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="hours" radius={[6,6,0,0]} label={<BarLabel suffix="h" />}>
                    {LECTURER_WORKLOAD_DEMO.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 text-[10px] font-bold flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block"/> Optimal</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block"/> Overloaded</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/> Under-load</span>
              </div>
            </ChartCard>

            {/* Subject Distribution */}
            <ChartCard icon={<FaBookOpen className="text-indigo-500" />} title="Subject Usage" subtitle="Scheduled hours per subject (from timetable)" empty={subjectPieFinal.length === 0} emptyText={reportDeleted ? 'Report removed — click Undo to restore' : 'No timetable entries for subjects yet'}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={subjectPieFinal} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                    label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {subjectPieFinal.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v,n) => [`${v}h`, n]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Room Usage */}
            <ChartCard
              icon={<FaDoorOpen className="text-emerald-500" />}
              title="Room Usage"
              subtitle="Utilization % — scheduled hours vs 40h weekly capacity"
              badge={<span className="text-[10px] text-slate-400 opacity-60 font-semibold border border-slate-200 rounded-full px-2 py-0.5">Sample Data · Demo</span>}
              empty={false}
              emptyText="No room usage data available"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ROOM_USAGE_DEMO} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0,100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} width={60} />
                  <Tooltip formatter={v => [`${v}%`, 'Usage']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="pct" radius={[0,6,6,0]}>
                    {ROOM_USAGE_DEMO.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/> Normal (&lt;70%)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/> High (≥70%)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block"/> Overbooked</span>
              </div>
            </ChartCard>

            {/* Weekly class trend */}
            <ChartCard
              icon={<FaCalendarAlt className="text-amber-500" />}
              title="Weekly Class Schedule"
              subtitle="Classes scheduled per day — Mon to Sat"
              empty={weeklyTrend.every(d => d.entries === 0)}
              emptyText="No weekly class data available"
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v, _, { payload }) => [`${v} class${v !== 1 ? 'es' : ''}`, payload?.day]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone" dataKey="entries" name="Classes"
                    stroke="#6366f1" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ── 6. CONFLICTS BANNER ── */}
        {conflicts.length > 0 && !cleared && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 font-bold text-rose-700 mb-3">
              <FaExclamationTriangle /> {conflicts.length} Room Conflict{conflicts.length !== 1 ? 's' : ''} Found
            </div>
            <div className="space-y-1">
              {conflicts.map((c, i) => (
                <p key={i} className="text-sm text-rose-600">
                  <span className="font-semibold">{c.roomName}</span> on <span className="font-semibold">{c.day}</span> — {c.conflicts.length} time slot overlap{c.conflicts.length !== 1 ? 's' : ''}
                </p>
              ))}
            </div>
            <Link to="/ai/conflict-detection" className="inline-block mt-3 text-xs font-bold text-rose-600 underline">
              View full conflict details →
            </Link>
          </div>
        )}

        {/* ── 7. SMART SUGGESTIONS ── */}
        {!noData && insights.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500 text-sm flex-shrink-0">
                <FaLightbulb />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800">Smart Suggestions</h2>
                <p className="text-xs text-slate-400">System-generated insights from your live timetable data</p>
              </div>
              <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full">
                {insights.length} insight{insights.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {insights.map((ins, i) => <InsightCard key={i} ins={ins} />)}
            </div>
          </section>
        )}

        {/* ── 8. QUICK LINKS ── */}
        <div className="pb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Detailed Pages</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: '/analytics/teacher-workload',    label: 'Lecturer Workload',   icon: <FaUserTie />,      color: 'from-blue-500 to-indigo-600' },
              { to: '/analytics/subject-distribution',label: 'Subject Distribution',icon: <FaBookOpen />,     color: 'from-indigo-500 to-violet-600' },
              { to: '/analytics/resource-utilization',label: 'Room Utilization',    icon: <FaDoorOpen />,     color: 'from-emerald-500 to-teal-600' },
              { to: '/analytics/reports',             label: 'Reports & Insights',  icon: <FaCheckCircle />,  color: 'from-amber-500 to-orange-500' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="group bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${l.color} text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform text-sm`}>
                  {l.icon}
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-600 transition-colors leading-tight">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin  { animation: spin 0.9s linear infinite; }
      `}</style>
    </div>
  );
}
