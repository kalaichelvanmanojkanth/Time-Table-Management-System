import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaLightbulb, FaBrain, FaCheckCircle, FaSync, FaArrowRight,
  FaBalanceScale, FaDoorOpen, FaClock, FaBook,
} from 'react-icons/fa';
import { PageShell } from './AISchedulingIndex';

const SETUP_KEY = 'ai_scheduling_setup';
const SUGGESTIONS_KEY = 'ai_suggestions';

/* ── Generate AI suggestions based on setup ── */
function generateSuggestions(setup) {
  const { teachers, subjects, rooms, workingDays, timeSlots } = setup;
  const totalSlots = workingDays.length * timeSlots;
  const possibleEvents = subjects.length * workingDays.length;
  const utilization = Math.min(100, Math.round((possibleEvents / totalSlots) * 100));
  const heavyLoad = teachers.length > 0 && subjects.length / teachers.length > 3;
  const roomPressure = rooms.length > 0 && subjects.length / rooms.length > 2;

  const pool = [
    {
      id: 'sg_workload',
      category: 'workload',
      icon: '⚖️',
      title: 'Balance Faculty Workload',
      detail: heavyLoad
        ? `Subject-to-teacher ratio (${(subjects.length / teachers.length).toFixed(1)}) is high. Add ${Math.ceil(subjects.length / 3) - teachers.length} more teachers or reduce subjects.`
        : `Faculty workload looks balanced (${(subjects.length / teachers.length).toFixed(1)} subjects/teacher).`,
      severity: heavyLoad ? 'high' : 'low',
      action: heavyLoad ? 'Redistribute workload' : 'No action needed',
    },
    {
      id: 'sg_rooms',
      category: 'rooms',
      icon: '🏫',
      title: 'Optimize Classroom Allocation',
      detail: roomPressure
        ? `Room demand is high — ${rooms.length} rooms for ${subjects.length} subjects. Add at least ${Math.ceil(subjects.length / 2) - rooms.length} rooms.`
        : `Classrooms are sufficient for the current schedule.`,
      severity: roomPressure ? 'medium' : 'low',
      action: roomPressure ? 'Add more rooms or compress schedule' : 'No action needed',
    },
    {
      id: 'sg_slots',
      category: 'timeslots',
      icon: '⏰',
      title: 'Adjust Daily Time Slots',
      detail: timeSlots > 8
        ? 'More than 8 slots per day may cause student fatigue. Consider capping at 8.'
        : timeSlots < 4
        ? 'Fewer than 4 slots per day may under-utilize resources. Consider adding more slots.'
        : `${timeSlots} daily slots is optimal for the current configuration.`,
      severity: timeSlots > 8 || timeSlots < 4 ? 'medium' : 'low',
      action: timeSlots > 8 ? 'Reduce to 8 slots' : timeSlots < 4 ? 'Increase to 5-6 slots' : 'No change needed',
    },
    {
      id: 'sg_days',
      category: 'schedule',
      icon: '📅',
      title: 'Working Day Efficiency',
      detail: workingDays.length < 4
        ? 'Fewer than 4 working days compresses the schedule. Consider adding more days.'
        : `${workingDays.length} working days provides good schedule spread.`,
      severity: workingDays.length < 4 ? 'medium' : 'low',
      action: workingDays.length < 4 ? 'Add more working days' : 'Optimal',
    },
    {
      id: 'sg_buffer',
      category: 'schedule',
      icon: '💡',
      title: 'Add Break Buffers',
      detail: 'Schedule 15-minute breaks between consecutive classes to improve focus and allow room transitions.',
      severity: 'info',
      action: 'Add buffer slots to constraints',
    },
    {
      id: 'sg_priority',
      category: 'subjects',
      icon: '📊',
      title: 'Prioritize Core Subjects',
      detail: 'Schedule core/mandatory subjects (Algorithms, Math) in the first half of the day for maximum student engagement.',
      severity: 'info',
      action: 'Reorder for peak hours',
    },
  ];

  return pool;
}

const SEV_STYLE = {
  high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
  medium: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  low: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
};
const BADGE_STYLE = {
  high: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  medium: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  low: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
  info: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
};

export default function OptimizationSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [applied, setApplied] = useState(new Set());
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);

  /* READ */
  useEffect(() => {
    const setupRaw = localStorage.getItem(SETUP_KEY);
    setHasSetup(!!setupRaw);
    const saved = localStorage.getItem(SUGGESTIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSuggestions(parsed.suggestions || []);
      setApplied(new Set(parsed.applied || []));
      setGenerated(true);
    }
  }, []);

  /* CREATE — generate suggestions */
  async function runAnalysis() {
    const setupRaw = localStorage.getItem(SETUP_KEY);
    if (!setupRaw) { toast.error('No timetable found'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const setup = JSON.parse(setupRaw);
    const newSuggestions = generateSuggestions(setup);

    /* Prevent duplicate suggestions (by id) */
    const unique = newSuggestions.filter((s, idx, arr) => arr.findIndex(x => x.id === s.id) === idx);

    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify({ suggestions: unique, applied: [...applied] }));
    setSuggestions(unique);
    setGenerated(true);
    setLoading(false);
    toast.success('AI suggestions generated');
  }

  /* UPDATE — apply a fix */
  function applyFix(id) {
    if (applied.has(id)) { toast.warning('Already optimized'); return; }
    const newApplied = new Set([...applied, id]);
    setApplied(newApplied);
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify({ suggestions, applied: [...newApplied] }));
    toast.success('Fix applied successfully');
  }

  /* Clear */
  function clearSuggestions() {
    localStorage.removeItem(SUGGESTIONS_KEY);
    setSuggestions([]);
    setApplied(new Set());
    setGenerated(false);
    toast.info('Suggestions cleared');
  }

  const highCount = suggestions.filter(s => s.severity === 'high').length;
  const pendingCount = suggestions.filter(s => !applied.has(s.id)).length;

  return (
    <PageShell
      title="Optimization & AI Suggestions"
      subtitle="Analyze your timetable and apply AI-powered improvements"
      icon={<FaLightbulb />}
      gradient="bg-gradient-to-r from-violet-700 to-indigo-700"
      breadcrumb="Optimization"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">

        {/* No setup warning */}
        {!hasSetup && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">Setup Required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">No timetable found. Complete the setup first.</p>
              <Link to="/ai-scheduling/setup" className="text-sm font-bold text-amber-700 dark:text-amber-300 hover:underline">→ Go to Setup</Link>
            </div>
          </div>
        )}

        {/* Generate button */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            id="run-optimization-btn"
            onClick={runAnalysis}
            disabled={!hasSetup || loading}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-base"
          >
            {loading
              ? <><FaSync className="animate-spin" /> Analyzing...</>
              : <><FaBrain /> Generate AI Suggestions</>}
          </button>
          {generated && (
            <button
              id="clear-suggestions-btn"
              onClick={clearSuggestions}
              className="px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-red-600 font-bold rounded-2xl text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats row */}
        {generated && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Suggestions', value: suggestions.length, color: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'High Priority', value: highCount, color: 'text-red-500' },
              { label: 'Pending Fixes', value: pendingCount, color: 'text-amber-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 text-center">
                <div className={`text-3xl font-extrabold ${color} mb-1`}>{value}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestion cards */}
        {generated && (
          <div className="space-y-4 mb-8">
            {suggestions.map(s => {
              const isApplied = applied.has(s.id);
              return (
                <div
                  key={s.id}
                  className={`border rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 ${isApplied ? 'opacity-50' : SEV_STYLE[s.severity]}`}
                >
                  <span className="text-2xl flex-shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm">{s.title}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 ${BADGE_STYLE[s.severity]}`}>
                        {s.severity}
                      </span>
                      {isApplied && (
                        <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                          Applied ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed mb-2 opacity-80">{s.detail}</p>
                    <p className="text-xs font-semibold opacity-70">Suggested action: {s.action}</p>
                  </div>
                  <button
                    id={`apply-fix-${s.id}`}
                    onClick={() => applyFix(s.id)}
                    disabled={isApplied}
                    className="flex-shrink-0 px-4 py-2 bg-white/60 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-700 border border-current/20 text-xs font-bold rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isApplied ? <FaCheckCircle className="text-emerald-500 text-sm" /> : 'Apply Fix'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Link to="/ai-scheduling/conflicts" className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            ← Conflicts
          </Link>
          <Link to="/ai-scheduling/analytics" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-sm shadow-md transition-all hover:-translate-y-0.5">
            Timetable Analytics <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
