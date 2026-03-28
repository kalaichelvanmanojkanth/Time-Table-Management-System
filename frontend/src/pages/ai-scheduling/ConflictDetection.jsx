import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaExclamationTriangle, FaCheckCircle, FaUserTie, FaDoorOpen,
  FaBook, FaClock, FaShieldAlt, FaTrash, FaSearch,
  FaBrain, FaLightbulb, FaInfoCircle, FaTimes,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { PageShell } from './AISchedulingIndex';

const SETUP_KEY     = 'ai_scheduling_setup';
const CONFLICTS_KEY = 'ai_detected_conflicts';

/* ════════════════════════════════════════════
   DEMO TIMETABLE BUILDER
════════════════════════════════════════════ */
const SLOT_HOURS = Array.from({ length: 8 }, (_, i) => `${8 + i}:00`);

function buildDemoTimetable(setup) {
  const { teachers, subjects, rooms, workingDays } = setup;
  const data = {};
  workingDays.forEach(day => {
    data[day] = {};
    const n = Math.min(subjects.length, 4);
    for (let i = 0; i < n; i++) {
      const slot = SLOT_HOURS[i];
      data[day][slot] = {
        subject: subjects[i % subjects.length],
        teacher: teachers[i % teachers.length],
        room:    rooms[i % rooms.length],
      };
    }
  });
  return data;
}

/* ════════════════════════════════════════════
   CONFLICT DETECTION ENGINE
════════════════════════════════════════════ */
function detectAll(timetable, setup) {
  const conflicts = [];
  const { teachers, rooms, workingDays, timeSlots } = setup;

  /* 1 ── Teacher double-schedule (same slot, different days) */
  const teacherSlotMap = {};
  Object.entries(timetable).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([slot, cell]) => {
      const key = `${cell.teacher}__${slot}`;
      if (teacherSlotMap[key]) {
        conflicts.push({
          id: `tc_${day}_${slot}`,
          type: 'teacher',
          severity: 'high',
          message: 'Teacher conflict detected',
          detail: `${cell.teacher} is double-scheduled at ${slot} on ${teacherSlotMap[key]} and ${day}`,
          icon: '👤',
        });
      } else { teacherSlotMap[key] = day; }
    });
  });

  /* 2 ── Room double-booking (same day + slot) */
  const roomMap = {};
  Object.entries(timetable).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([slot, cell]) => {
      const key = `${cell.room}__${day}__${slot}`;
      if (roomMap[key]) {
        conflicts.push({
          id: `rc_${day}_${slot}_${cell.room}`,
          type: 'room',
          severity: 'high',
          message: 'Room conflict detected',
          detail: `Room ${cell.room} is double-booked at ${slot} on ${day}`,
          icon: '🚪',
        });
      } else { roomMap[key] = true; }
    });
  });

  /* 3 ── Subject over-scheduled (> 4 sessions/week) */
  const subjectCount = {};
  Object.values(timetable).forEach(slots =>
    Object.values(slots).forEach(cell => {
      subjectCount[cell.subject] = (subjectCount[cell.subject] || 0) + 1;
    })
  );
  Object.entries(subjectCount).forEach(([subj, cnt]) => {
    if (cnt > 4) {
      conflicts.push({
        id: `so_${subj}`,
        type: 'subject',
        severity: 'medium',
        message: 'Subject overlap found',
        detail: `${subj} is scheduled ${cnt} times this week — exceeds recommended 4 sessions`,
        icon: '📚',
      });
    }
  });

  /* 4 ── Heavy day (4+ back-to-back slots) */
  Object.entries(timetable).forEach(([day, slots]) => {
    if (Object.keys(slots).length >= 4) {
      conflicts.push({
        id: `ts_${day}`,
        type: 'timeslot',
        severity: 'low',
        message: 'Time slot density high',
        detail: `${day} has ${Object.keys(slots).length} classes — consider redistribution`,
        icon: '⏰',
      });
    }
  });

  /* 5 ── Teacher overload (> 3 classes per day) */
  Object.entries(timetable).forEach(([day, slots]) => {
    const teacherDayCount = {};
    Object.values(slots).forEach(cell => {
      teacherDayCount[cell.teacher] = (teacherDayCount[cell.teacher] || 0) + 1;
    });
    Object.entries(teacherDayCount).forEach(([teacher, cnt]) => {
      if (cnt > 3) {
        conflicts.push({
          id: `ol_${day}_${teacher}`,
          type: 'overload',
          severity: 'high',
          message: 'Teacher overloaded',
          detail: `${teacher} has ${cnt} classes on ${day} — exceeds the recommended 3 per day`,
          icon: '🔥',
        });
      }
    });
  });

  /* 6 ── Room underutilisation (< 30% usage) */
  const totalSlots = workingDays.length * (timeSlots || 6);
  const roomUsage = {};
  Object.values(timetable).forEach(slots =>
    Object.values(slots).forEach(cell => {
      roomUsage[cell.room] = (roomUsage[cell.room] || 0) + 1;
    })
  );
  rooms.forEach(room => {
    const used = roomUsage[room] || 0;
    const pct  = totalSlots > 0 ? (used / totalSlots) * 100 : 0;
    if (pct < 30) {
      conflicts.push({
        id: `ru_${room}`,
        type: 'room',
        severity: 'low',
        message: 'Room underutilised',
        detail: `${room} is used only ${Math.round(pct)}% of available slots — consider consolidating classes`,
        icon: '🏫',
      });
    }
  });

  /* 7 ── Excessive empty slots */
  const scheduledCount = Object.values(timetable).reduce(
    (sum, slots) => sum + Object.keys(slots).length, 0
  );
  const emptyPct = totalSlots > 0 ? ((totalSlots - scheduledCount) / totalSlots) * 100 : 0;
  if (emptyPct > 50) {
    conflicts.push({
      id: 'empty_slots',
      type: 'timeslot',
      severity: 'medium',
      message: 'Too many empty slots',
      detail: `${Math.round(emptyPct)}% of available time slots are unscheduled — utilisation is very low`,
      icon: '🕳️',
    });
  }

  /* De-duplicate by id */
  return conflicts.filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx);
}

/* ════════════════════════════════════════════
   VALIDATION
════════════════════════════════════════════ */
function validateSetup(setup) {
  if (!setup.teachers?.length)    { toast.error('No teachers found in setup'); return false; }
  if (!setup.subjects?.length)    { toast.error('No subjects found in setup'); return false; }
  if (!setup.rooms?.length)       { toast.error('No classrooms available in setup'); return false; }
  if ((setup.workingDays?.length ?? 0) < 3) {
    toast.error('Minimum 3 working days required');
    return false;
  }
  const ts = setup.timeSlots ?? 0;
  if (ts < 3 || ts > 12) {
    toast.error('Invalid time slot configuration — must be between 3 and 12');
    return false;
  }
  return true;
}

/* Pre-scan warnings (non-blocking) */
function showPreScanWarnings(setup) {
  const { teachers, subjects, rooms, timeSlots } = setup;
  if (teachers.length < subjects.length)
    toast.warning('Some teachers may be overloaded — fewer teachers than subjects');
  if (rooms.length < subjects.length)
    toast.warning('Limited rooms may cause conflicts — fewer rooms than subjects');
  if (timeSlots < 4)
    toast.warning('Low time slots may create scheduling pressure (< 4 slots/day)');
}

/* ════════════════════════════════════════════
   STYLE MAPS
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

/* ════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════ */

/* Skeleton loader */
function SkeletonCard() {
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex items-start gap-3 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
      </div>
    </div>
  );
}

/* Individual conflict card */
function ConflictCard({ conflict, onResolve, resolving }) {
  const isResolving = resolving === conflict.id;
  return (
    <div
      className={`border-l-4 rounded-xl p-4 flex items-start gap-3 transition-all duration-300
        ${SEV_CARD[conflict.severity]}
        ${isResolving ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
        hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* Icon bubble */}
      <div className="w-9 h-9 rounded-full bg-white/60 dark:bg-slate-800/60 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
        {conflict.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm">{conflict.message}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 ${SEV_BADGE[conflict.severity]}`}>
            {conflict.severity}
          </span>
        </div>
        <p className="text-xs leading-relaxed opacity-80">{conflict.detail}</p>
      </div>

      <button
        id={`resolve-${conflict.id}`}
        onClick={() => onResolve(conflict.id)}
        title="Mark as resolved"
        className="flex-shrink-0 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all duration-200 opacity-60 hover:opacity-100 hover:scale-110"
      >
        <FaCheckCircle className="text-emerald-500 text-base" />
      </button>
    </div>
  );
}

/* Filter tabs */
function FilterTabs({ filter, setFilter, counts }) {
  const tabs = [
    { key: 'all',      label: 'All',       icon: null },
    { key: 'teacher',  label: 'Teachers',  icon: <FaUserTie className="text-[10px]" /> },
    { key: 'room',     label: 'Rooms',     icon: <FaDoorOpen className="text-[10px]" /> },
    { key: 'subject',  label: 'Subjects',  icon: <FaBook className="text-[10px]" /> },
    { key: 'timeslot', label: 'Time Slots',icon: <FaClock className="text-[10px]" /> },
    { key: 'overload', label: 'Overload',  icon: <FaExclamationTriangle className="text-[10px]" /> },
  ];
  return (
    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
      {tabs.map(({ key, label, icon }) => {
        const count = counts[key] ?? 0;
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

/* AI Insights panel */
function InsightPanel({ conflicts }) {
  const overloadCount    = conflicts.filter(c => c.type === 'overload').length;
  const underutilCount   = conflicts.filter(c => c.message.includes('underutilised')).length;
  const criticalCount    = conflicts.filter(c => c.severity === 'high').length;
  const teacherConflicts = conflicts.filter(c => c.type === 'teacher').length;

  const insights = [];
  if (criticalCount > 0)
    insights.push({ icon: '⚠️', text: `${criticalCount} critical conflict${criticalCount > 1 ? 's' : ''} require immediate attention`, type: 'critical' });
  if (overloadCount > 0)
    insights.push({ icon: '⚠️', text: `${overloadCount} teacher${overloadCount > 1 ? 's are' : ' is'} overloaded — workload exceeds 3 classes/day`, type: 'warn' });
  if (underutilCount > 0)
    insights.push({ icon: '⚠️', text: `${underutilCount} room${underutilCount > 1 ? 's are' : ' is'} underutilised (<30%)`, type: 'warn' });
  if (teacherConflicts > 0)
    insights.push({ icon: '💡', text: 'Consider redistributing subjects across available teachers to reduce conflicts', type: 'tip' });
  if (insights.length === 0)
    insights.push({ icon: '✅', text: 'No critical conflicts detected — schedule looks healthy!', type: 'ok' });
  if (conflicts.length === 0)
    insights.push({ icon: '✅', text: 'All checks passed — your timetable is conflict-free', type: 'ok' });

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
          <HiSparkles className="text-cyan-300" /> AI Generated
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

/* Empty state (pre-scan) */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/60 dark:to-orange-950/60 flex items-center justify-center text-4xl">
        🔍
      </div>
      <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-xl mb-2">No Scan Yet</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
        Click <strong>Run Conflict Scan</strong> above to analyse your timetable for scheduling conflicts.
      </p>
    </div>
  );
}

/* All-resolved success state */
function AllResolvedState() {
  return (
    <div className="text-center py-14">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 flex items-center justify-center text-4xl">
        🎉
      </div>
      <h3 className="font-extrabold text-emerald-700 dark:text-emerald-300 text-xl mb-2">All Conflicts Resolved!</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
        Your timetable is now conflict-free. Proceed to AI Optimization for further improvements.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function ConflictDetection() {
  const [conflicts,   setConflicts]   = useState([]);
  const [scanned,     setScanned]     = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [filter,      setFilter]      = useState('all');
  const [hasSetup,    setHasSetup]    = useState(false);
  const [setupData,   setSetupData]   = useState(null);
  const [resolving,   setResolving]   = useState(null);   // id being fade-out animated
  const [preScanWarn, setPreScanWarn] = useState([]);     // non-blocking warnings

  /* ── Load persisted conflicts on mount ── */
  useEffect(() => {
    let parsed = null;
    const raw = localStorage.getItem(SETUP_KEY);
    if (raw) {
      try {
        parsed = JSON.parse(raw);
        setHasSetup(true);
        setSetupData(parsed);

        // Pre-compute non-blocking warnings
        const warns = [];
        if (parsed.teachers?.length < parsed.subjects?.length)
          warns.push({ icon: <FaUserTie />, msg: 'Fewer teachers than subjects — potential overload' });
        if (parsed.rooms?.length < parsed.subjects?.length)
          warns.push({ icon: <FaDoorOpen />, msg: 'Fewer rooms than subjects — room conflicts likely' });
        if ((parsed.timeSlots ?? 0) < 4)
          warns.push({ icon: <FaClock />, msg: 'Low time slots (<4) — scheduling pressure likely' });
        setPreScanWarn(warns);
      } catch {
        localStorage.removeItem(SETUP_KEY);
        toast.error('Corrupted setup data detected. Please reconfigure.');
      }
    }

    const savedConflicts = localStorage.getItem(CONFLICTS_KEY);
    if (savedConflicts) {
      try {
        setConflicts(JSON.parse(savedConflicts));
        setScanned(true);
      } catch {
        localStorage.removeItem(CONFLICTS_KEY);
      }
    }
  }, []);

  /* ── Run Scan ── */
  async function runScan() {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) { toast.error('Setup not found — please complete AI Scheduling Setup first'); return; }

    let setup;
    try { setup = JSON.parse(raw); }
    catch {
      localStorage.removeItem(SETUP_KEY);
      toast.error('Invalid setup data — corrupted JSON. Please reconfigure.');
      return;
    }

    if (!validateSetup(setup)) return;

    showPreScanWarnings(setup);

    setScanning(true);
    setConflicts([]);
    setScanned(false);
    await new Promise(r => setTimeout(r, 1200));

    const timetable = buildDemoTimetable(setup);
    const found = detectAll(timetable, setup);

    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(found));
    setConflicts(found);
    setScanned(true);
    setScanning(false);

    if (found.length === 0) {
      toast.success('Scan completed — No conflicts found ✓');
    } else {
      toast.warning(`Scan completed — ${found.length} issue${found.length !== 1 ? 's' : ''} detected`);
      if (found.some(c => c.type === 'teacher'))  toast.error('Teacher conflict detected');
      if (found.some(c => c.type === 'room' && c.severity === 'high')) toast.error('Room conflict detected');
      if (found.some(c => c.type === 'overload')) toast.warning('Potential scheduling issues detected — teacher overload');
    }
  }

  /* ── Resolve single conflict (animated) ── */
  async function resolveConflict(id) {
    setResolving(id);
    await new Promise(r => setTimeout(r, 300)); // fade-out duration
    const updated = conflicts.filter(c => c.id !== id);
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(updated));
    setConflicts(updated);
    setResolving(null);
    toast.success('Conflict resolved ✓');
    if (updated.length === 0) toast.success('All conflicts resolved! 🎉');
  }

  /* ── Clear All with confirmation ── */
  function clearAll() {
    if (!window.confirm('Clear all detected conflicts? This cannot be undone.')) return;
    localStorage.removeItem(CONFLICTS_KEY);
    setConflicts([]);
    setScanned(false);
    toast.info('All conflicts cleared');
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
      subtitle="AI-powered validation to detect and resolve timetable scheduling conflicts"
      icon={<FaExclamationTriangle />}
      gradient="bg-gradient-to-r from-amber-600 to-orange-600"
      breadcrumb="Conflicts"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">

        {/* ── No setup warning ── */}
        {!hasSetup && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">Setup Required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                Complete the AI Scheduling Setup before running conflict detection.
              </p>
              <Link to="/ai-scheduling/setup" className="text-sm font-bold text-amber-700 dark:text-amber-300 hover:underline">
                → Go to Setup
              </Link>
            </div>
          </div>
        )}

        {/* ── Pre-scan warning chips (non-blocking) ── */}
        {hasSetup && preScanWarn.length > 0 && !scanned && (
          <div className="mb-6 space-y-2">
            {preScanWarn.map((w, i) => (
              <div key={i} className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
                <span className="text-amber-500 flex-shrink-0">{w.icon}</span>
                <span className="font-medium">{w.msg}</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest bg-amber-100 dark:bg-amber-900/60 rounded-full px-2 py-0.5">Warning</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Setup data pills ── */}
        {setupData && (
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { icon: '👤', val: `${setupData.teachers?.length || 0} Teachers` },
              { icon: '📚', val: `${setupData.subjects?.length || 0} Subjects` },
              { icon: '🏫', val: `${setupData.rooms?.length || 0} Rooms` },
              { icon: '📅', val: `${setupData.workingDays?.length || 0} Days` },
            ].map(({ icon, val }) => (
              <span key={val} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 shadow-sm">
                {icon} {val}
              </span>
            ))}
          </div>
        )}

        {/* ── Summary KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <FaUserTie />,          label: 'Teacher Conflicts', color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/30',    count: counts.teacher  },
            { icon: <FaDoorOpen />,          label: 'Room Conflicts',    color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', count: counts.room  },
            { icon: <FaBook />,              label: 'Subject Overlaps',  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/30',  count: counts.subject  },
            { icon: <FaExclamationTriangle />,label: 'Overload Issues',  color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-950/30',    count: counts.overload },
          ].map(({ icon, label, color, bg, count }) => (
            <div key={label} className={`${bg} rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center hover:shadow-md transition-shadow`}>
              <div className={`text-2xl ${color} flex justify-center mb-1`}>{icon}</div>
              {scanned && <div className={`text-xl font-extrabold ${color} mb-0.5`}>{count}</div>}
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            id="scan-conflicts-btn"
            onClick={runScan}
            disabled={!hasSetup || scanning}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-base"
          >
            {scanning
              ? <><FaSearch className="animate-bounce" /> Scanning...</>
              : <><FaShieldAlt /> Run Conflict Scan</>}
          </button>

          {scanned && conflicts.length > 0 && (
            <button
              id="clear-conflicts-btn"
              onClick={clearAll}
              className="inline-flex items-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold rounded-2xl transition-all duration-200 text-sm active:scale-95"
            >
              <FaTrash /> Clear All
            </button>
          )}
        </div>

        {/* ── Scanning skeleton ── */}
        {scanning && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-6 space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
              <FaSearch className="animate-bounce text-amber-500" />
              <span className="font-semibold">Analysing timetable for conflicts...</span>
            </div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty state (before any scan) ── */}
        {!scanning && !scanned && <EmptyState />}

        {/* ── Scan results ── */}
        {!scanning && scanned && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">

            {/* Summary bar */}
            <div className={`px-6 py-4 flex items-center gap-3 ${conflicts.length === 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/30'}`}>
              {conflicts.length === 0
                ? <FaCheckCircle className="text-emerald-500 text-xl flex-shrink-0" />
                : <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0" />}
              <div>
                <div className={`font-bold text-base ${conflicts.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {conflicts.length === 0
                    ? 'No conflicts detected — timetable is clean ✓'
                    : `${conflicts.length} issue${conflicts.length !== 1 ? 's' : ''} found — review below`}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Scan complete</div>
              </div>
            </div>

            {/* All-resolved state */}
            {scanned && conflicts.length === 0 && <AllResolvedState />}

            {/* Filter + list */}
            {conflicts.length > 0 && (
              <>
                <FilterTabs filter={filter} setFilter={setFilter} counts={counts} />

                <div className="p-6 space-y-3">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4 italic">
                      No conflicts of this type — try another filter.
                    </p>
                  ) : (
                    filtered.map(c => (
                      <ConflictCard
                        key={c.id}
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

        {/* ── AI Insights panel (shown after scan) ── */}
        {!scanning && scanned && <InsightPanel conflicts={conflicts} />}

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
            Optimization & AI →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
