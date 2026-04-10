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
  fetchTeachers, fetchSubjects, fetchRooms, fetchTimetables,
  calcTeacherWorkload, calcRoomUtilization, calcSubjectDistribution,
  detectRoomConflicts, generateInsights, calcWeeklyTrend,
  // localStorage helpers
  loadAllDataSources,
  calcWeeklyTrendFromSource,
  normalizeArray,
  // session helpers
  normaliseEntries,
} from '../../services/analyticsService';
import { isBackendUnavailableError } from '../../services/api';
import { getDemoData, hasUsableData } from '../../data/demoAnalytics';

/* ── Constants ── */
const PIE_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316'];

/* Distinct palette for per-item coloring (Teacher Workload & Room Usage) */
const CHART_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#a855f7', // purple
  '#fb7185', // rose
];

/* Status override colors — mixed with per-index color for clear distinction */
const STATUS_COLORS = {
  overloaded:  '#ef4444',  // red — always override for critical
  underloaded: '#f59e0b',  // amber — warning
  optimal:     null,        // use per-index CHART_COLORS for optimal teachers
};

const DEFAULT_FILTERS = { teacherId: '', subjectId: '', roomId: '', period: 'week' };

/* ══════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════ */

/* Loading skeleton */
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

/* Empty state */
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

/* KPI Card */
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

/* Mini chart card */
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

/* Full chart card */
function ChartCard({ title, subtitle, icon, children, empty, emptyText = 'No data for selected filters' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <h3 className="font-extrabold text-slate-800">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-slate-400 mb-5">{subtitle}</p>}
      {empty
        ? <div className="h-52 flex items-center justify-center text-slate-300 text-sm">{emptyText}</div>
        : children}
    </div>
  );
}

/* Insight pill */
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

/* Confirm dialog */
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

/* Custom bar label — suffix is 'h' (hours) or 'cls' (class count) */
const BarLabel = ({ x, y, width, value, suffix = 'h' }) => (
  <text x={x + width / 2} y={y - 5} fill="#94a3b8" textAnchor="middle" fontSize={10} fontWeight={700}>{value}{suffix}</text>
);

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AnalyticsDashboard() {
  /* Data */
  const [teachers,  setTeachers]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [rooms,     setRooms]     = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [sessions, setSessions] = useState([]); // flattened/normalized session records used by charts
  /* Tracks whether data came from localStorage (for info banner) */
  const [fromStorage, setFromStorage] = useState(false);
  /* WorkingDays from localStorage setup — used by calcWeeklyTrendFromSource */
  const [setupWorkingDays, setSetupWorkingDays] = useState([]);

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
  /* Demo fallback — true when API completely fails and we use local dummy data */
  const [demoMode, setDemoMode] = useState(false);

  /* ── Load: Demo Mode — no backend required ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    setCleared(false);
    setReportDeleted(false);
    setFromStorage(false);

    // DEMO MODE: skip API entirely, use pre-built dummy data
    const demo = getDemoData();
    setTeachers(demo.teachers);
    setSubjects(demo.subjects);
    setRooms(demo.rooms);
    setTimetable(demo.sessions);
    setSessions(demo.sessions);
    setSetupWorkingDays([]);
    setDemoMode(true);
    setError('');
    setLastSync(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Export handler ── */
  const handleExport = useCallback(() => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        fromLocalStorage: fromStorage,
        summary: {
          teachers: teachers.length,
          subjects: subjects.length,
          rooms:    rooms.length,
          scheduledClasses: sessions.length,
        },
        teachers,
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
  }, [teachers, subjects, rooms, timetable, fromStorage]);

  /* Search-filtered master lists */
  const q = search.toLowerCase().trim();
  const sTeachers = useMemo(() => q ? teachers.filter(t => t.name?.toLowerCase().includes(q) || t.department?.toLowerCase().includes(q)) : teachers, [teachers, q]);
  const sSubjects = useMemo(() => q ? subjects.filter(s => s.name?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q)) : subjects, [subjects, q]);
  const sRooms    = useMemo(() => q ? rooms.filter(r => r.name?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q)) : rooms, [rooms, q]);

  /* Filtered sessions (derived from timetable) */
  const filteredSessions = useMemo(() => {
    if (cleared) return [];
    return sessions.filter(e => {
      const tid = e.teacherId?._id || e.teacherId;
      const sid = e.subjectId?._id || e.subjectId;
      const rid = e.roomId?._id    || e.roomId;
      if (filters.teacherId && tid?.toString() !== filters.teacherId) return false;
      if (filters.subjectId && sid?.toString() !== filters.subjectId) return false;
      if (filters.roomId    && rid?.toString() !== filters.roomId)    return false;
      if (q) {
        const teacherMatch = sTeachers.some(t => t._id === tid);
        const subjectMatch = sSubjects.some(s => s._id === sid);
        const roomMatch    = sRooms.some(r => r._id === rid);
        if (!teacherMatch && !subjectMatch && !roomMatch) return false;
      }
      return true;
    });
  }, [sessions, filters, cleared, q, sTeachers, sSubjects, sRooms]);

  const fTeachers = useMemo(() => filters.teacherId ? sTeachers.filter(t => t._id === filters.teacherId) : sTeachers, [sTeachers, filters.teacherId]);
  const fSubjects = useMemo(() => filters.subjectId ? sSubjects.filter(s => s._id === filters.subjectId) : sSubjects, [sSubjects, filters.subjectId]);
  const fRooms    = useMemo(() => filters.roomId    ? sRooms.filter(r => r._id === filters.roomId)       : sRooms,    [sRooms,    filters.roomId]);

  /* Analytics */
  const workload    = useMemo(() => calcTeacherWorkload(fTeachers, filteredSessions),    [fTeachers, filteredSessions]);
  const roomUtil    = useMemo(() => calcRoomUtilization(fRooms,    filteredSessions),    [fRooms,    filteredSessions]);
  const subjectDist = useMemo(() => calcSubjectDistribution(fSubjects, filteredSessions),[fSubjects,  filteredSessions]);
  const conflicts   = useMemo(() => detectRoomConflicts(filteredSessions),               [filteredSessions]);
  const insights    = useMemo(() => generateInsights(workload, roomUtil, conflicts, subjectDist), [workload, roomUtil, conflicts, subjectDist]);

  /* Chart data */
  // If all teachers have 0 total hours but have classes, fall back to class-count display
  const useClassCount = workload.length > 0
    && workload.every(w => w.totalHours === 0)
    && workload.some(w => w.totalClasses > 0);

  const workloadData = useMemo(() => workload.map((w, i) => {
    // Status-based override (overloaded=red, underloaded=amber)
    // Optimal teachers each get a distinct color from CHART_COLORS palette
    const statusColor = STATUS_COLORS[w.status];
    const distinctColor = CHART_COLORS[i % CHART_COLORS.length];
    return {
      name:     (w.teacherName || '').split(' ')[0],
      hours:    useClassCount ? w.totalClasses : w.totalHours,
      classes:  w.totalClasses,
      fullName: w.teacherName,
      suffix:   useClassCount ? 'cls' : 'h',
      status:   w.status,
      fill:     statusColor ?? distinctColor, // status wins for overloaded/underloaded, index color for optimal
    };
  }), [workload, useClassCount]);
  console.log('[Dashboard] teacherWorkloadData:', workloadData);

  // Subject pie: real scheduled hours; fallback to weeklyHours when no entries yet
  const subjectPie = useMemo(() => reportDeleted ? [] : subjectDist
    .filter(s => s.scheduledHours > 0)
    .map((s, i) => ({ name: s.subjectName, value: s.scheduledHours, fill: PIE_COLORS[i % PIE_COLORS.length] })),
    [subjectDist, reportDeleted]);

  const subjectPieFallback = useMemo(() => reportDeleted ? [] : fSubjects.map((s, i) => ({
    name: s.name, value: s.weeklyHours || 1, fill: PIE_COLORS[i % PIE_COLORS.length],
  })), [fSubjects, reportDeleted]);

  const subjectPieFinal = subjectPie.length > 0 ? subjectPie : subjectPieFallback;
  console.log('[Dashboard] subjectSplitData:', subjectPieFinal);

  // Room bar — each room gets a DISTINCT index-based color;
  // additionally overlay semantic color for overbooked/high-usage rooms
  const roomBar = useMemo(() => roomUtil.map((r, i) => {
    // semantic tier color
    const tierColor = r.utilization >= 100 ? '#ef4444'
      : r.utilization >= 70 ? '#f59e0b'
      : CHART_COLORS[i % CHART_COLORS.length]; // normal rooms: distinct per-room color
    return {
      name: r.roomName,
      pct:  r.utilization,
      fill: tierColor,
    };
  }), [roomUtil]);
  console.log('[Dashboard] roomUsageData:', roomBar);

  // Weekly trend — use localStorage workingDays-aware version when data came from storage
  const weeklyTrend = useMemo(() => {
    // If filteredSessions is non-empty, use standard week-trend on the filtered set
    if (filteredSessions.length > 0) {
      return fromStorage
        ? calcWeeklyTrendFromSource(setupWorkingDays, filteredSessions)
        : calcWeeklyTrend(filteredSessions);
    }
    // No filtered entries but we have stored sessions — use full sessions for trend
    if (fromStorage && sessions.length > 0) {
      return calcWeeklyTrendFromSource(setupWorkingDays, sessions);
    }
    // Absolute fallback — returns 6 zero-entry days
    return calcWeeklyTrend([]);
  }, [filteredSessions, fromStorage, setupWorkingDays, sessions]);
  console.log('[Dashboard] weeklyTrendData:', weeklyTrend);

  /* Filter/search state */
  const hasFilters    = filters.teacherId || filters.subjectId || filters.roomId || filters.period !== 'week';
  const hasSearch     = !!q;
  const noData        = !loading && teachers.length === 0 && subjects.length === 0 && rooms.length === 0;
  const noTimetable   = !loading && !noData && sessions.length === 0;
  const noResults     = !loading && !noData && !noTimetable && filteredSessions.length === 0 && (hasFilters || hasSearch);

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
            {/* localStorage source indicator */}
            {fromStorage && !cleared && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                📦 Local
              </span>
            )}
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
            <p className="text-slate-400 text-sm mt-1">Real-time insights for your teachers, subjects, rooms, and scheduled classes.</p>
          </div>
        </div>

        {/* No network error banner — demo mode handles everything silently */}

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
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
            <input
              id="dashboard-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teachers, subjects, rooms…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-indigo-400 bg-slate-50 placeholder-slate-300 text-slate-700 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <FaFilter className="text-[9px]" /> Filters
            </span>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select id="f-teacher" value={filters.teacherId} onChange={e => setFilters(p => ({ ...p, teacherId: e.target.value }))} className={sel}>
                <option value="">All Teachers</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
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
          <KPICard icon={<FaUserTie />}     label="Teachers"          value={cleared ? 0 : sTeachers.length} color="text-blue-600"    bg="bg-gradient-to-br from-blue-50    to-blue-100/60"    trend={`${filteredSessions.filter((e,_,a)=>a.findIndex(x=>(x.teacherId?._id||x.teacherId)===(e.teacherId?._id||e.teacherId))===_).length} active this week`} />
          <KPICard icon={<FaBookOpen />}    label="Subjects"          value={cleared ? 0 : fSubjects.length} color="text-indigo-600"  bg="bg-gradient-to-br from-indigo-50  to-indigo-100/60"  trend={`Across ${[...new Set(subjects.map(s=>s.department).filter(Boolean))].length} departments`} />
          <KPICard icon={<FaDoorOpen />}    label="Rooms"             value={cleared ? 0 : fRooms.length}    color="text-emerald-600" bg="bg-gradient-to-br from-emerald-50 to-emerald-100/60" trend={`${roomUtil.filter(r=>r.utilization>0).length} in use`} />
          <KPICard icon={<FaCalendarAlt />} label="Scheduled Classes" value={cleared ? 0 : sessions.length} color="text-amber-600"   bg="bg-gradient-to-br from-amber-50   to-amber-100/60"   trend={`${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} detected`} />
        </div>

        {/* ── 4. MINI SUMMARY CHARTS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Mini workload */}
          <MiniCard title="Workload Snapshot" empty={workloadData.length === 0}>
            <ResponsiveContainer width="100%" height={96}>
              <BarChart data={workloadData.slice(0,5)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip formatter={(v, n, p) => [`${p.payload.fullName}: ${v}h`, '']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="hours" radius={[3,3,0,0]}>
                  {workloadData.slice(0,5).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>

          {/* Mini subject pie */}
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

          {/* Mini room usage */}
          <MiniCard title="Room Usage" empty={roomBar.length === 0}>
            <ResponsiveContainer width="100%" height={96}>
              <BarChart data={roomBar.slice(0,5)} layout="vertical" margin={{ top: 0, right: 4, left: -4, bottom: 0 }}>
                <XAxis type="number" domain={[0,100]} hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} width={36} />
                <Tooltip formatter={v => [`${v}%`, 'Usage']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="pct" radius={[0,3,3,0]}>
                  {roomBar.slice(0,5).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>

          {/* Mini weekly trend */}
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
              desc="Add teachers, subjects, rooms, and timetable entries to see insights here."
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
            {/* Teacher Workload */}
            <ChartCard
              icon={<FaUserTie className="text-blue-500" />}
              title="Teacher Workload"
              subtitle={useClassCount ? 'Classes assigned per teacher (no time data)' : 'Weekly teaching hours per faculty member'}
              empty={workloadData.length === 0}
              emptyText="No teacher workload data available"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={workloadData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v, _, p) => [
                      useClassCount
                        ? `${p.payload.fullName}: ${v} class(es)`
                        : `${p.payload.fullName}: ${v}h`,
                      useClassCount ? 'Classes' : 'Hours',
                    ]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="hours" radius={[6,6,0,0]}
                    label={<BarLabel suffix={workloadData[0]?.suffix || 'h'} />}>
                    {workloadData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 text-[10px] font-bold flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block"/> Optimal</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block"/> Overloaded</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/> Under-load</span>
                {useClassCount && <span className="text-amber-600 ml-auto">* Showing class count (add start/end times for hours)</span>}
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
              empty={roomBar.length === 0}
              emptyText="No room usage data available"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={roomBar} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0,100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} width={60} />
                  <Tooltip formatter={v => [`${v}%`, 'Usage']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="pct" radius={[0,6,6,0]}>
                    {roomBar.map((e, i) => <Cell key={i} fill={e.fill} />)}
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
              { to: '/analytics/teacher-workload',    label: 'Teacher Workload',    icon: <FaUserTie />,      color: 'from-blue-500 to-indigo-600' },
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

console.log('body background-color:', getComputedStyle(document.body).backgroundColor);
console.log('index.css loaded?', !!document.querySelector('link[href*="index.css"],style[data-vite-dev-id]'));
console.log('svg count:', document.querySelectorAll('svg').length);
