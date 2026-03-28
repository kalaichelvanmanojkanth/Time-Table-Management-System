import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaLightbulb, FaBrain, FaCheckCircle, FaSync, FaArrowRight,
  FaBalanceScale, FaDoorOpen, FaClock, FaBook, FaUserTie,
  FaExclamationTriangle, FaTrash, FaInfoCircle,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { PageShell } from './AISchedulingIndex';

const SETUP_KEY       = 'ai_scheduling_setup';
const SUGGESTIONS_KEY = 'ai_suggestions';

/* ════════════════════════════════════════════
   VALIDATION
════════════════════════════════════════════ */
function validateSetup(setup) {
  if (!setup.teachers?.length)    { toast.error('At least one teacher is required');       return false; }
  if (!setup.subjects?.length)    { toast.error('Subjects must be provided');              return false; }
  if (!setup.rooms?.length)       { toast.error('At least one classroom is required');     return false; }
  if (!setup.workingDays?.length) { toast.error('Working days are required');              return false; }
  const ts = Number(setup.timeSlots);
  if (!ts || ts < 1 || ts > 12)  { toast.error('Time slots must be between 1 and 12');   return false; }
  return true;
}

/* ════════════════════════════════════════════
   SUGGESTION ENGINE  (safe calculations)
════════════════════════════════════════════ */
function generateSuggestions(setup) {
  const { teachers, subjects, rooms, workingDays, timeSlots } = setup;
  const ts = Number(timeSlots) || 0;

  /* Safe ratios — no division by zero */
  const subjectPerTeacher = teachers.length ? subjects.length / teachers.length : 0;
  const subjectPerRoom    = rooms.length    ? subjects.length / rooms.length    : 0;

  const totalSlots      = workingDays.length * ts;
  const possibleEvents  = subjects.length * workingDays.length;
  const utilization     = totalSlots > 0
    ? Math.min(100, Math.round((possibleEvents / totalSlots) * 100))
    : 0;

  const heavyLoad   = subjectPerTeacher > 3;
  const roomPressure = subjectPerRoom   > 2;

  const pool = [
    /* 1 — Workload balance */
    {
      id: 'sg_workload',
      category: 'workload',
      icon: '⚖️',
      title: 'Balance Faculty Workload',
      detail: heavyLoad
        ? `Subject-to-teacher ratio is ${subjectPerTeacher.toFixed(1)} — add ${Math.max(1, Math.ceil(subjects.length / 3) - teachers.length)} more teacher(s) or reduce subjects.`
        : `Faculty workload is balanced (${subjectPerTeacher.toFixed(1)} subjects/teacher).`,
      severity: heavyLoad ? 'high' : 'low',
      action: heavyLoad ? 'Redistribute workload' : 'No action needed',
    },
    /* 2 — Room allocation */
    {
      id: 'sg_rooms',
      category: 'rooms',
      icon: '🏫',
      title: 'Optimise Classroom Allocation',
      detail: roomPressure
        ? `Room demand is high — ${rooms.length} room(s) for ${subjects.length} subjects. Add at least ${Math.max(1, Math.ceil(subjects.length / 2) - rooms.length)} more room(s).`
        : 'Classrooms are sufficient for the current schedule.',
      severity: roomPressure ? 'medium' : 'low',
      action: roomPressure ? 'Add more rooms or compress schedule' : 'No action needed',
    },
    /* 3 — Daily time slots */
    {
      id: 'sg_slots',
      category: 'timeslots',
      icon: '⏰',
      title: 'Adjust Daily Time Slots',
      detail: ts > 8
        ? 'More than 8 slots per day may cause student fatigue. Consider capping at 8.'
        : ts < 4
        ? 'Fewer than 4 slots per day under-utilises resources. Consider adding more slots.'
        : `${ts} daily slots is optimal for the current configuration.`,
      severity: ts > 8 || ts < 4 ? 'medium' : 'low',
      action: ts > 8 ? 'Reduce to 8 slots' : ts < 4 ? 'Increase to 5–6 slots' : 'No change needed',
    },
    /* 4 — Working day efficiency */
    {
      id: 'sg_days',
      category: 'schedule',
      icon: '📅',
      title: 'Working Day Efficiency',
      detail: workingDays.length < 4
        ? 'Fewer than 4 working days compresses the schedule. Consider adding more days.'
        : `${workingDays.length} working days provides a good schedule spread.`,
      severity: workingDays.length < 4 ? 'medium' : 'low',
      action: workingDays.length < 4 ? 'Add more working days' : 'Optimal',
    },
    /* 5 — Teacher shortage */
    {
      id: 'sg_teacher_shortage',
      category: 'workload',
      icon: '👥',
      title: 'Teacher Availability',
      detail: teachers.length < 3
        ? `Only ${teachers.length} teacher(s) configured — a minimum of 3 is recommended for flexible scheduling.`
        : `${teachers.length} teachers is adequate for coverage.`,
      severity: teachers.length < 3 ? 'high' : 'low',
      action: teachers.length < 3 ? 'Hire or assign additional lecturers' : 'Sufficient',
    },
    /* 6 — High subject load */
    {
      id: 'sg_subject_load',
      category: 'subjects',
      icon: '📊',
      title: 'Subject Load per Teacher',
      detail: subjectPerTeacher > 4
        ? `Each teacher carries ${subjectPerTeacher.toFixed(1)} subjects on average — this is very high. Split or reassign subjects.`
        : subjectPerTeacher > 2
        ? `Subject load is moderate (${subjectPerTeacher.toFixed(1)}/teacher). Monitor for burnout.`
        : `Subject load is manageable (${subjectPerTeacher.toFixed(1)}/teacher).`,
      severity: subjectPerTeacher > 4 ? 'high' : subjectPerTeacher > 2 ? 'medium' : 'low',
      action: subjectPerTeacher > 4 ? 'Immediate reassignment recommended' : 'Monitor regularly',
    },
    /* 7 — Break buffers */
    {
      id: 'sg_buffer',
      category: 'schedule',
      icon: '💡',
      title: 'Add Break Buffers',
      detail: 'Schedule 15-minute breaks between consecutive classes to improve focus and allow smooth room transitions.',
      severity: 'info',
      action: 'Add buffer slots to constraints',
    },
    /* 8 — Core subject priority */
    {
      id: 'sg_priority',
      category: 'subjects',
      icon: '📈',
      title: 'Prioritise Core Subjects',
      detail: 'Schedule mandatory subjects (Algorithms, Mathematics) in the first half of the day for maximum student engagement.',
      severity: 'info',
      action: 'Reorder for peak hours',
    },
  ];

  /* De-duplicate by id */
  return pool.filter((s, idx, arr) => arr.findIndex(x => x.id === s.id) === idx);
}

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

const CATEGORY_ICON = {
  workload:  <FaBalanceScale />,
  rooms:     <FaDoorOpen />,
  timeslots: <FaClock />,
  schedule:  <FaLightbulb />,
  subjects:  <FaBook />,
};

/* ════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════ */

/* Skeleton card */
function SkeletonCard() {
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl p-5 flex items-start gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
      </div>
    </div>
  );
}

/* Empty state */
function EmptyState({ message }) {
  return (
    <div className="text-center py-14">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/60 dark:to-indigo-950/60 flex items-center justify-center text-4xl">
        💡
      </div>
      <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-xl mb-2">
        {message || 'No Suggestions Yet'}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
        Click <strong>Generate AI Suggestions</strong> to analyse your timetable and get smart optimisation recommendations.
      </p>
    </div>
  );
}

/* Individual suggestion card */
function SuggestionCard({ suggestion, isApplied, onApply, applying }) {
  const isApplying = applying === suggestion.id;
  return (
    <div
      className={`border rounded-2xl p-5 flex items-start gap-4 transition-all duration-300
        ${isApplied ? 'opacity-40 saturate-50' : SEV_STYLE[suggestion.severity]}
        ${!isApplied ? 'hover:shadow-md hover:-translate-y-0.5' : ''}
        ${isApplying ? 'scale-95 opacity-30' : 'scale-100'}`}
    >
      {/* Icon bubble */}
      <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-slate-800/60 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
        {suggestion.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm">{suggestion.title}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 ${BADGE_STYLE[suggestion.severity]}`}>
            {suggestion.severity}
          </span>
          {isApplied && (
            <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
              Applied ✓
            </span>
          )}
          {/* Category icon */}
          <span className="ml-auto text-slate-400 dark:text-slate-500 text-xs">
            {CATEGORY_ICON[suggestion.category] || null}
          </span>
        </div>
        <p className="text-xs leading-relaxed mb-2 opacity-80">{suggestion.detail}</p>
        <p className="text-xs font-semibold opacity-60">Suggested action: {suggestion.action}</p>
      </div>

      <button
        id={`apply-fix-${suggestion.id}`}
        onClick={() => onApply(suggestion.id)}
        disabled={isApplied || isApplying}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
          ${isApplied
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 cursor-not-allowed border border-emerald-200 dark:border-emerald-800'
            : 'bg-white/70 dark:bg-slate-700/70 hover:bg-white dark:hover:bg-slate-700 border border-current/20 hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md'
          }`}
      >
        {isApplied
          ? <><FaCheckCircle className="text-emerald-500" /> Applied</>
          : 'Apply Fix'}
      </button>
    </div>
  );
}

/* Stats card */
function StatCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 text-center hover:shadow-md transition-shadow">
      <div className={`text-3xl font-extrabold ${color} mb-1`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
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
  const [hasSetup,     setHasSetup]     = useState(false);
  const [setupData,    setSetupData]    = useState(null);
  const [applying,     setApplying]     = useState(null);  // id being highlighted

  /* Track a hash of setup for auto-refresh detection */
  const setupHashRef = useRef('');

  /* ── Load persisted state on mount ── */
  useEffect(() => {
    /* Load setup */
    const raw = localStorage.getItem(SETUP_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setHasSetup(true);
        setSetupData(parsed);
        setupHashRef.current = JSON.stringify(parsed);
      } catch {
        localStorage.removeItem(SETUP_KEY);
        toast.error('Corrupted setup data reset. Please reconfigure.');
      }
    }

    /* Load saved suggestions */
    const savedRaw = localStorage.getItem(SUGGESTIONS_KEY);
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw);
        setSuggestions(saved.suggestions || []);
        setApplied(new Set(saved.applied   || []));
        setGenerated(true);
      } catch {
        localStorage.removeItem(SUGGESTIONS_KEY);
        toast.error('Corrupted suggestion data reset. Please regenerate.');
      }
    }
  }, []);

  /* ── Auto-refresh: detect setup change ── */
  useEffect(() => {
    if (!hasSetup) return;
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) return;
    try {
      const hash = raw; // raw string comparison is sufficient
      if (setupHashRef.current && hash !== setupHashRef.current && generated) {
        setSuggestions([]);
        setApplied(new Set());
        setGenerated(false);
        localStorage.removeItem(SUGGESTIONS_KEY);
        setupHashRef.current = hash;
        toast.info('Setup updated. Please regenerate suggestions.');
      }
    } catch { /* ignore */ }
  });

  /* ── Generate AI suggestions ── */
  async function runAnalysis() {
    /* Guard: already-generated warning */
    if (generated && suggestions.length > 0) {
      const overwrite = window.confirm(
        'Suggestions already generated. Clear and regenerate?'
      );
      if (!overwrite) {
        toast.warning('Suggestions already generated. Clear first to regenerate.');
        return;
      }
    }

    /* Load setup */
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) { toast.error('No timetable found — please complete the Setup first'); return; }

    let setup;
    try { setup = JSON.parse(raw); }
    catch {
      localStorage.removeItem(SETUP_KEY);
      toast.error('Corrupted data reset. Please reconfigure.');
      return;
    }

    /* Validate */
    if (!validateSetup(setup)) return;

    setLoading(true);
    setSuggestions([]);
    setApplied(new Set());
    setGenerated(false);

    await new Promise(r => setTimeout(r, 1200)); // simulate AI analysis

    const newSuggestions = generateSuggestions(setup);

    if (newSuggestions.length === 0) {
      toast.success('Your timetable is already optimized — no suggestions needed');
    } else {
      const payload = { suggestions: newSuggestions, applied: [] };
      localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(payload));
      setSuggestions(newSuggestions);
      setApplied(new Set());
      setGenerated(true);
      toast.success('AI suggestions generated ✓');
    }

    setLoading(false);
  }

  /* ── Apply a single fix ── */
  async function applyFix(id) {
    if (applied.has(id)) {
      toast.warning('This fix is already applied');
      return;
    }
    setApplying(id);
    await new Promise(r => setTimeout(r, 300)); // visual feedback delay

    const newApplied = new Set([...applied, id]);
    setApplied(newApplied);

    try {
      localStorage.setItem(
        SUGGESTIONS_KEY,
        JSON.stringify({ suggestions, applied: [...newApplied] })
      );
    } catch {
      toast.error('Failed to save applied state — localStorage may be full');
    }

    setApplying(null);
    toast.success('Fix applied successfully ✓');

    if (newApplied.size === suggestions.length) {
      toast.info('All suggestions have been applied! 🎉');
    }
  }

  /* ── Clear suggestions ── */
  function clearSuggestions() {
    if (!window.confirm('Clear all generated suggestions?')) return;
    localStorage.removeItem(SUGGESTIONS_KEY);
    setSuggestions([]);
    setApplied(new Set());
    setGenerated(false);
    toast.info('Suggestions cleared');
  }

  /* ── Derived stats ── */
  const highCount    = suggestions.filter(s => s.severity === 'high').length;
  const pendingCount = suggestions.filter(s => !applied.has(s.id)).length;

  return (
    <PageShell
      title="Optimization & AI Suggestions"
      subtitle="AI-powered analysis to improve your timetable efficiency and resolve scheduling issues"
      icon={<FaLightbulb />}
      gradient="bg-gradient-to-r from-violet-700 to-indigo-700"
      breadcrumb="Optimization"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">

        {/* ── No setup warning ── */}
        {!hasSetup && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">Setup Required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                No timetable found. Complete the AI Scheduling Setup before generating suggestions.
              </p>
              <Link to="/ai-scheduling/setup" className="text-sm font-bold text-amber-700 dark:text-amber-300 hover:underline">
                → Go to Setup
              </Link>
            </div>
          </div>
        )}

        {/* ── Setup data pills ── */}
        {setupData && (
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { icon: '👤', val: `${setupData.teachers?.length || 0} Teachers`  },
              { icon: '📚', val: `${setupData.subjects?.length || 0} Subjects`  },
              { icon: '🏫', val: `${setupData.rooms?.length    || 0} Rooms`     },
              { icon: '📅', val: `${setupData.workingDays?.length || 0} Days`   },
              { icon: '⏰', val: `${setupData.timeSlots        || 0} Slots/day` },
            ].map(({ icon, val }) => (
              <span key={val} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 shadow-sm">
                {icon} {val}
              </span>
            ))}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            id="run-optimization-btn"
            onClick={runAnalysis}
            disabled={!hasSetup || loading}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-base"
          >
            {loading
              ? <><FaSync className="animate-spin" /> Analysing timetable with AI...</>
              : <><FaBrain /> <HiSparkles className="text-indigo-200" /> Generate AI Suggestions</>}
          </button>

          {generated && (
            <button
              id="clear-suggestions-btn"
              onClick={clearSuggestions}
              className="inline-flex items-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold rounded-2xl transition-all duration-200 text-sm active:scale-95"
            >
              <FaTrash /> Clear
            </button>
          )}
        </div>

        {/* ── Skeleton while loading ── */}
        {loading && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <FaBrain className="text-violet-500 animate-pulse" />
              <span className="font-semibold">AI engine is analysing your timetable...</span>
            </div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty state (pre-generation) ── */}
        {!loading && !generated && <EmptyState />}

        {/* ── Generated: no suggestions (already optimal) ── */}
        {!loading && generated && suggestions.length === 0 && (
          <EmptyState message="Timetable is already optimized!" />
        )}

        {/* ── Stats row ── */}
        {!loading && generated && suggestions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Suggestions" value={suggestions.length} color="text-indigo-600 dark:text-indigo-400" />
            <StatCard label="High Priority"     value={highCount}          color="text-red-500"                         />
            <StatCard label="Pending Fixes"     value={pendingCount}       color="text-amber-500"                       />
          </div>
        )}

        {/* ── Progress bar ── */}
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
                <FaCheckCircle /> All suggestions applied — timetable fully optimised! 🎉
              </div>
            )}
          </div>
        )}

        {/* ── Suggestion cards ── */}
        {!loading && generated && suggestions.length > 0 && (
          <div className="space-y-4 mb-8">
            {suggestions.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                isApplied={applied.has(s.id)}
                onApply={applyFix}
                applying={applying}
              />
            ))}
          </div>
        )}

        {/* ── AI summary tip ── */}
        {!loading && generated && suggestions.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-50 dark:from-indigo-950/30 to-violet-50 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <FaInfoCircle />
            </div>
            <div>
              <h3 className="font-bold text-indigo-800 dark:text-indigo-200 mb-1 flex items-center gap-2">
                AI Recommendation Summary
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 dark:text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full px-2 py-0.5">
                  <HiSparkles /> AI
                </span>
              </h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-400 leading-relaxed">
                {highCount > 0
                  ? `⚠️ ${highCount} high-priority issue${highCount > 1 ? 's' : ''} detected — apply those fixes first for maximum impact.`
                  : '✅ No critical issues found — apply remaining suggestions to achieve peak schedule efficiency.'}
                {' '}Apply fixes from top to bottom for best results.
              </p>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between">
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
            Timetable Analytics <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
