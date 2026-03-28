import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  FaChartBar, FaStar, FaBrain, FaBalanceScale, FaDoorOpen,
  FaClock, FaGraduationCap, FaSync, FaExclamationTriangle,
  FaCheckCircle, FaLightbulb, FaArrowUp, FaArrowDown,
  FaShieldAlt, FaRocket, FaUsers, FaThumbsUp, FaTrash,
  FaBook, FaFilter, FaInfoCircle,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { PageShell } from './AISchedulingIndex';

const SETUP_KEY     = 'ai_scheduling_setup';
const ANALYTICS_KEY = 'ai_analytics_data';

const PIE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#14b8a6', '#fb923c'];

/* ════════════════════════════════════════════
   VALIDATION
════════════════════════════════════════════ */
function validateSetup(setup) {
  if (!setup.teachers?.length)    { toast.error('At least one teacher is required');         return false; }
  if (!setup.subjects?.length)    { toast.error('Subjects must be provided');                return false; }
  if (!setup.rooms?.length)       { toast.error('Rooms are required');                       return false; }
  if (!setup.workingDays?.length) { toast.error('Working days must be provided');            return false; }
  const ts = Number(setup.timeSlots);
  if (!ts || ts < 1 || ts > 12)  { toast.error('Time slots must be between 1 and 12');     return false; }
  return true;
}

/* ════════════════════════════════════════════
   ANALYTICS ENGINE
════════════════════════════════════════════ */
function computeAnalytics(setup) {
  const { teachers, subjects, rooms, workingDays, timeSlots } = setup;
  const ts = Number(timeSlots) || 1;

  /* ── Teacher load (round-robin subject assignment) ── */
  const teacherData = teachers.map((name, i) => {
    const assignedSubjects = subjects.filter((_, si) => si % teachers.length === i);
    return { name, assignedSubjects, totalLoad: assignedSubjects.length };
  });
  const avgTeacherLoad = teachers.length
    ? teacherData.reduce((s, t) => s + t.totalLoad, 0) / teachers.length
    : 0;

  /* ── Room utilization ── */
  const totalSlots    = workingDays.length * ts;
  const scheduledEvts = Math.min(subjects.length * workingDays.length, totalSlots);
  const roomData = rooms.map((name, i) => {
    const assigned = Math.floor(scheduledEvts / rooms.length) + (i < scheduledEvts % rooms.length ? 1 : 0);
    const utilization = totalSlots > 0 ? Math.min(100, Math.round((assigned / (totalSlots / rooms.length)) * 100)) : 0;
    return { name, assigned, utilization };
  });
  const avgRoomUtil = rooms.length
    ? roomData.reduce((s, r) => s + r.utilization, 0) / rooms.length
    : 0;

  /* ── Subject frequency (times/week) ── */
  const subjectData = subjects.map((name, i) => {
    const frequency = Math.min(workingDays.length, Math.floor(workingDays.length / subjects.length) + (i < workingDays.length % subjects.length ? 1 : 0));
    return { name, frequency };
  });

  /* ── Daily load (classes per day) ── */
  const dailyLoad = workingDays.map((day) => {
    const classes = Math.min(ts, subjects.length);
    return { day: day.slice(0, 3), fullDay: day, classes };
  });

  /* ── Weekly slot trend ── */
  const weeklyTrend = workingDays.map((day, i) => ({
    day: day.slice(0, 3),
    scheduled: Math.min(ts, subjects.length - i >= 0 ? subjects.length - i : 0),
    utilPct: totalSlots > 0 ? Math.min(100, Math.round((scheduledEvts / totalSlots) * 100)) : 0,
  }));

  /* ── Efficiency score ── */
  const score = Math.min(100, Math.max(50,
    70
    + (scheduledEvts / Math.max(totalSlots, 1) >= 0.7 ? 10 : 0)
    + (avgTeacherLoad <= 3 ? 10 : -5)
    + (workingDays.length >= 4 ? 5 : -5)
    + (ts >= 5 && ts <= 8 ? 5 : 0)
  ));

  /* ── Derived flags ── */
  const overloadedTeachers = teacherData.filter(t => t.totalLoad > avgTeacherLoad * 1.3);
  const overbookedRooms    = roomData.filter(r => r.utilization > avgRoomUtil * 1.3);
  const highFreqSubjects   = subjectData.filter(s => s.frequency > 3);
  const rareSubjects       = subjectData.filter(s => s.frequency === 0);
  const gapIssues          = ts < 4 || workingDays.length < 3;

  return {
    teacherData, roomData, subjectData, dailyLoad, weeklyTrend,
    score, avgTeacherLoad, avgRoomUtil, overloadedTeachers, overbookedRooms,
    highFreqSubjects, rareSubjects, gapIssues,
    scheduledEvts, totalSlots,
    utilizationPct: totalSlots > 0 ? Math.min(100, Math.round((scheduledEvts / totalSlots) * 100)) : 0,
    imbalanced: overloadedTeachers.length > 0,
  };
}

function scoreLabel(s) {
  if (s >= 85) return { text: 'Excellent', color: 'text-emerald-500', bg: 'from-emerald-400 to-emerald-600' };
  if (s >= 70) return { text: 'Good',      color: 'text-blue-500',    bg: 'from-blue-400 to-blue-600'       };
  if (s >= 55) return { text: 'Fair',      color: 'text-amber-500',   bg: 'from-amber-400 to-amber-600'     };
  return             { text: 'Needs Work', color: 'text-red-500',     bg: 'from-red-400 to-red-600'          };
}

/* ════════════════════════════════════════════
   DYNAMIC INSIGHTS
════════════════════════════════════════════ */
function buildInsights(a) {
  const insights = [];
  if (a.overloadedTeachers.length)
    insights.push({ sev:'high',   icon:'⚠️', text:`${a.overloadedTeachers.length} teacher(s) overloaded`, action:'Redistribute workload across additional faculty' });
  if (a.overbookedRooms.length)
    insights.push({ sev:'high',   icon:'⚠️', text:`${a.overbookedRooms.length} room(s) overbooked (above average)`, action:'Add more rooms or stagger class times' });
  if (a.gapIssues)
    insights.push({ sev:'medium', icon:'⚠️', text:'Daily slots or working days are fewer than recommended', action:'Increase daily slots to 5–8 and add more working days' });
  if (a.highFreqSubjects.length)
    insights.push({ sev:'medium', icon:'💡', text:`${a.highFreqSubjects.length} subject(s) scheduled too often (>3×/week)`, action:'Reschedule to balance subject frequency' });
  if (a.rareSubjects.length)
    insights.push({ sev:'low',    icon:'💡', text:`${a.rareSubjects.length} subject(s) rarely scheduled`, action:'Reschedule rare subjects for better balance' });
  if (a.utilizationPct < 70)
    insights.push({ sev:'medium', icon:'💡', text:`Schedule utilization is low (${a.utilizationPct}%)`, action:'Increase subject allocation to fill available slots' });
  if (!a.overloadedTeachers.length && !a.overbookedRooms.length)
    insights.push({ sev:'info',   icon:'✅', text:'Faculty and room resources are well-balanced', action:'No immediate action needed' });
  if (a.score >= 85)
    insights.push({ sev:'info',   icon:'✅', text:'Schedule quality is excellent — all key metrics are optimal', action:'Continue monitoring each semester' });
  return insights;
}

function buildRecommendations(a) {
  const recs = [];
  if (a.overloadedTeachers.length)
    recs.push({ icon:<FaUsers />, title:'Redistribute Workload', desc:`${a.overloadedTeachers.map(t=>t.name).join(', ')} carry above-average loads.`, color:'bg-gradient-to-br from-violet-500 to-indigo-700' });
  if (a.overbookedRooms.length)
    recs.push({ icon:<FaDoorOpen />, title:'Add More Rooms', desc:`${a.overbookedRooms.map(r=>r.name).join(', ')} are operating above average utilisation.`, color:'bg-gradient-to-br from-cyan-500 to-teal-600' });
  if (Number(a.totalSlots / Math.max(a.roomData?.length,1)) > 8)
    recs.push({ icon:<FaClock />, title:'Reduce Daily Slots', desc:'Too many slots per day may cause fatigue. Cap at 8 per day per room.', color:'bg-gradient-to-br from-amber-500 to-orange-600' });
  if (a.rareSubjects.length)
    recs.push({ icon:<FaBook />, title:'Balance Subject Scheduling', desc:`${a.rareSubjects.map(s=>s.name).join(', ')} rarely appears. Reschedule for consistency.`, color:'bg-gradient-to-br from-blue-500 to-blue-700' });
  if (!recs.length)
    recs.push({ icon:<FaThumbsUp />, title:'Schedule is Optimal', desc:'No major issues detected. Keep monitoring analytics each semester.', color:'bg-gradient-to-br from-emerald-500 to-teal-600' });
  return recs;
}

/* ════════════════════════════════════════════
   REUSABLE COMPONENTS
════════════════════════════════════════════ */
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i=0) => ({ opacity:1, y:0, transition:{ delay: i*0.06, duration:0.45, ease:'easeOut' } }),
};

function ChartCard({ title, icon, children, delay=0 }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={delay}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg p-6">
      <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
        <span className="text-indigo-500">{icon}</span>{title}
      </h2>
      {children}
    </motion.div>
  );
}

function KPICard({ icon, label, value, sub, color, gradient, pct, trend, tooltip, delay=0 }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={delay}
      title={tooltip}
      className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${gradient} transition-opacity duration-300 pointer-events-none rounded-2xl`} />
      <div className={`flex justify-center mb-2 ${color} text-xl`}>{icon}</div>
      <div className={`text-2xl sm:text-3xl font-extrabold ${color} mb-0.5`}>{value}</div>
      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">{label}</div>
      {pct != null && (
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
            initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:1, delay: delay*0.06+0.3 }} />
        </div>
      )}
      {trend && sub && (
        <div className={`flex items-center justify-center gap-1 mt-2 text-[10px] font-bold ${trend==='up'?'text-emerald-500':'text-red-400'}`}>
          {trend==='up'?<FaArrowUp />:<FaArrowDown />} {sub}
        </div>
      )}
      {!trend && sub && <div className={`text-[10px] mt-1.5 font-semibold ${color}`}>{sub}</div>}
    </motion.div>
  );
}

const SEV_INSIGHT = {
  high:   'border border-red-200   dark:border-red-800   bg-red-50   dark:bg-red-950/30   text-red-700   dark:text-red-300',
  medium: 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  low:    'border border-blue-200  dark:border-blue-800  bg-blue-50  dark:bg-blue-950/30  text-blue-700  dark:text-blue-300',
  info:   'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
};

function InsightRow({ icon, text, action, sev, delay=0 }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={delay}
      className={`rounded-xl px-4 py-3 flex items-start gap-3 text-sm ${SEV_INSIGHT[sev]}`}>
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold leading-relaxed">{text}</span>
        <div className="text-[11px] opacity-70 mt-0.5">→ {action}</div>
      </div>
    </motion.div>
  );
}

function RecCard({ icon, title, desc, color, delay=0 }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={delay}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 flex items-start gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-lg ${color}`}>{icon}</div>
      <div>
        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</div>
      </div>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
      <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="text-center py-20">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 flex items-center justify-center text-4xl">📊</div>
      <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-xl mb-2">No Analytics Yet</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed mb-4">
        Click <strong>Load AI Analytics</strong> to generate detailed insights for your timetable.
      </p>
      <Link to="/ai-scheduling/setup" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">→ Go to Setup if you haven't configured yet</Link>
    </motion.div>
  );
}

/* ── Filter tab bar ── */
const FILTERS = ['All','Teachers','Rooms','Subjects','Days'];

function FilterTabs({ active, setActive }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {FILTERS.map(f => (
        <button key={f} onClick={() => setActive(f)}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200
            ${active===f
              ? 'bg-indigo-600 text-white shadow-md scale-[1.04]'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:scale-[1.02]'}`}>
          <FaFilter className="text-[9px]" />{f}
        </button>
      ))}
    </div>
  );
}

/* ── Subject Frequency Table ── */
function SubjectTable({ subjects }) {
  const max = Math.max(...subjects.map(s => s.frequency), 1);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/80">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
            <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sessions/Week</th>
            <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s, i) => (
            <tr key={s.name} className={`border-t border-slate-100 dark:border-slate-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 text-xs max-w-[200px] truncate">{s.name}</td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${s.frequency > 3 ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'}`}>
                  {s.frequency}×
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden w-full">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-700"
                    style={{ width:`${(s.frequency / max)*100}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Teacher workload detail bars ── */
function TeacherBars({ teacherData, avgLoad }) {
  const max = Math.max(...teacherData.map(t => t.totalLoad), 1);
  return (
    <div className="space-y-3">
      {teacherData.map((t, i) => {
        const isOver = t.totalLoad > avgLoad * 1.3;
        return (
          <motion.div key={t.name} variants={fadeUp} initial="hidden" animate="visible" custom={i * 0.3}>
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              <span className="flex items-center gap-2 truncate max-w-[260px]">
                {t.name}
                {isOver && <span className="text-[9px] font-black uppercase bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-full px-2 py-0.5 flex-shrink-0">Overloaded</span>}
              </span>
              <span>{t.totalLoad} subject{t.totalLoad !== 1 ? 's' : ''}</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isOver ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-violet-400 to-indigo-500'}`}
                initial={{ width:0 }}
                animate={{ width:`${(t.totalLoad / max)*100}%` }}
                transition={{ duration:0.8, delay:0.2 + i*0.08 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function TimetableAnalytics() {
  const [analytics,  setAnalytics]  = useState(null);
  const [setup,      setSetup]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [hasSetup,   setHasSetup]   = useState(false);
  const [activeTab,  setActiveTab]  = useState('All');

  /* ── Load setup + persisted analytics on mount ── */
  useEffect(() => {
    const raw = localStorage.getItem(SETUP_KEY);
    if (raw) {
      try {
        setSetup(JSON.parse(raw));
        setHasSetup(true);
      } catch {
        localStorage.removeItem(SETUP_KEY);
        toast.error('Corrupted setup data reset. Please reconfigure.');
      }
    }
    const saved = localStorage.getItem(ANALYTICS_KEY);
    if (saved) {
      try {
        setAnalytics(JSON.parse(saved));
      } catch {
        localStorage.removeItem(ANALYTICS_KEY);
        toast.error('Corrupted analytics data reset. Please re-generate.');
      }
    }
  }, []);

  /* ── Load / generate analytics ── */
  async function loadAnalytics() {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) { toast.error('No timetable setup found'); return; }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      localStorage.removeItem(SETUP_KEY);
      toast.error('Corrupted data reset. Please reconfigure.');
      return;
    }
    if (!validateSetup(parsed)) return;

    setLoading(true);
    setAnalytics(null);
    await new Promise(r => setTimeout(r, 1000));

    const result = computeAnalytics(parsed);

    /* Build localStorage structure */
    const stored = {
      teachers:  result.teacherData,
      rooms:     result.roomData,
      subjects:  result.subjectData,
      dailyLoad: result.dailyLoad,
      score:     result.score,
      meta:      { generatedAt: new Date().toISOString() },
    };
    try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(stored)); }
    catch { toast.warning('Could not persist analytics — localStorage may be full'); }

    setAnalytics(result);
    setSetup(parsed);
    setLoading(false);

    toast.success('AI Analytics generated ✨');
    if (result.overloadedTeachers.length || result.overbookedRooms.length)
      toast.warning('Issues detected in schedule');
    setTimeout(() => toast.info('Smart recommendations ready 💡'), 600);
  }

  /* ── Clear analytics ── */
  function clearAnalytics() {
    if (!window.confirm('Clear all analytics data?')) return;
    localStorage.removeItem(ANALYTICS_KEY);
    setAnalytics(null);
    toast.info('Analytics cleared');
  }

  /* ── Derived ── */
  const sl     = analytics ? scoreLabel(analytics.score) : null;
  const insights  = analytics ? buildInsights(analytics)      : [];
  const recs      = analytics ? buildRecommendations(analytics): [];

  /* ── Filter-aware data ── */
  const showTeachers = activeTab === 'All' || activeTab === 'Teachers';
  const showRooms    = activeTab === 'All' || activeTab === 'Rooms';
  const showSubjects = activeTab === 'All' || activeTab === 'Subjects';
  const showDays     = activeTab === 'All' || activeTab === 'Days';

  /* Recharts data */
  const teacherBarData = analytics?.teacherData.map(t => ({
    name: t.name.split(' ').slice(-1)[0],
    fullName: t.name,
    Subjects: t.totalLoad,
  })) ?? [];

  const roomPieData = analytics?.roomData.map(r => ({ name: r.name, value: r.utilization })) ?? [];

  return (
    <PageShell
      title="Timetable Analytics"
      subtitle="AI-powered efficiency insights, workload distribution, and smart recommendations"
      icon={<FaChartBar />}
      gradient="bg-gradient-to-r from-emerald-600 to-teal-700"
      breadcrumb="Analytics"
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">

        {/* ── No setup warning ── */}
        <AnimatePresence>
          {!hasSetup && (
            <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}
              className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8 flex items-start gap-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">No Timetable Data Available</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">Complete the AI Scheduling Setup before loading analytics.</p>
                <Link to="/ai-scheduling/setup" className="text-sm font-bold text-amber-700 dark:text-amber-300 hover:underline">→ Go to Setup</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Setup pills ── */}
        {setup && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-wrap gap-2 mb-6">
            {[
              { icon:'👤', val:`${setup.teachers?.length||0} Teachers`  },
              { icon:'📚', val:`${setup.subjects?.length||0} Subjects`  },
              { icon:'🏫', val:`${setup.rooms?.length||0} Rooms`        },
              { icon:'📅', val:`${setup.workingDays?.length||0} Days`   },
              { icon:'⏰', val:`${setup.timeSlots||0} Slots/day`        },
            ].map(({ icon, val }) => (
              <span key={val} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 shadow-sm">
                {icon} {val}
              </span>
            ))}
          </motion.div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <motion.button id="load-analytics-btn" onClick={loadAnalytics} disabled={!hasSetup || loading}
            whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-base">
            {loading
              ? <><FaSync className="animate-spin" /> Generating AI Analytics...</>
              : <><FaBrain /><HiSparkles className="text-emerald-200" /> Load AI Analytics</>}
          </motion.button>
          {analytics && (
            <motion.button onClick={clearAnalytics} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              className="inline-flex items-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold rounded-2xl transition-all duration-200 text-sm">
              <FaTrash /> Clear
            </motion.button>
          )}
        </div>

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <FaBrain className="text-emerald-500 animate-pulse" />
              <span className="font-semibold">AI engine is computing timetable analytics...</span>
            </div>
            {[1,2,3].map(i=><SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !analytics && <EmptyState />}

        {/* ════ ANALYTICS ════ */}
        <AnimatePresence>
          {!loading && analytics && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-8">

              {/* ── Filter tabs ── */}
              <FilterTabs active={activeTab} setActive={setActiveTab} />

              {/* ── KPI cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPICard icon={<FaStar />}          label="Efficiency Score"  value={analytics.score}          sub={sl.text}                              color={sl.color}                      gradient={sl.bg}                                    pct={analytics.score}        trend={analytics.score>=70?'up':'down'} tooltip="Overall schedule quality score"          delay={0} />
                <KPICard icon={<FaDoorOpen />}       label="Room Utilization"  value={`${analytics.utilizationPct}%`} sub={analytics.utilizationPct>=70?'Efficient':'Low'} color={analytics.utilizationPct>=70?'text-emerald-500':'text-amber-500'} gradient={analytics.utilizationPct>=70?'from-emerald-400 to-emerald-600':'from-amber-400 to-amber-600'} pct={analytics.utilizationPct} trend={analytics.utilizationPct>=70?'up':'down'} tooltip="% of time slots currently scheduled" delay={1} />
                <KPICard icon={<FaUsers />}          label="Overloaded"        value={analytics.overloadedTeachers.length} sub={analytics.overloadedTeachers.length?'Fix Needed':'None'} color={analytics.overloadedTeachers.length?'text-red-500':'text-emerald-500'} gradient={analytics.overloadedTeachers.length?'from-red-400 to-red-600':'from-emerald-400 to-emerald-600'} pct={analytics.overloadedTeachers.length?60:95} tooltip="Teachers with above-average workload" delay={2} />
                <KPICard icon={<FaClock />}          label="Scheduled Events"  value={analytics.scheduledEvts}  sub={`of ${analytics.totalSlots} total`}   color="text-indigo-500 dark:text-indigo-400" gradient="from-indigo-400 to-violet-500"    pct={analytics.totalSlots>0?Math.round((analytics.scheduledEvts/analytics.totalSlots)*100):0} trend="up" tooltip="Classes scheduled vs available slots" delay={3} />
              </div>

              {/* ── Efficiency score bar ── */}
              <ChartCard title="Schedule Efficiency Score" icon={<FaStar className="text-amber-400" />} delay={4}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      <span>0 — Needs Work</span><span>100 — Excellent</span>
                    </div>
                    <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full bg-gradient-to-r ${sl.bg}`}
                        initial={{width:0}} animate={{width:`${analytics.score}%`}} transition={{duration:1.2,ease:'easeOut'}} />
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[50,60,70,80,90,100].map(t=>(
                        <div key={t} className={`flex-1 text-center text-[9px] font-bold ${analytics.score>=t?sl.color:'text-slate-300 dark:text-slate-600'}`}>{t}</div>
                      ))}
                    </div>
                  </div>
                  <div className={`text-4xl font-extrabold ${sl.color} w-20 text-right`}>{analytics.score}</div>
                </div>
              </ChartCard>

              {/* ── Charts grid ── */}
              <div className="grid lg:grid-cols-2 gap-6">

                {/* Teacher Workload Bar Chart */}
                {showTeachers && (
                  <ChartCard title="Teacher Workload Distribution" icon={<FaUsers />} delay={5}>
                    {teacherBarData.length===0
                      ? <p className="text-sm text-slate-400 text-center py-6">No teacher data available.</p>
                      : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={teacherBarData} margin={{top:5,right:10,left:-20,bottom:5}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{fontSize:11,fill:'#64748b'}} />
                            <YAxis tick={{fontSize:11,fill:'#64748b'}} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{fontSize:11}} />
                            <Bar dataKey="Subjects" fill="#6366f1" radius={[6,6,0,0]} maxBarSize={40}
                              label={{position:'top',fontSize:10,fill:'#6366f1'}} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                  </ChartCard>
                )}

                {/* Room Utilization Pie Chart */}
                {showRooms && (
                  <ChartCard title="Classroom Utilization (%)" icon={<FaDoorOpen />} delay={6}>
                    {roomPieData.length===0
                      ? <p className="text-sm text-slate-400 text-center py-6">No room data available.</p>
                      : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={roomPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                              paddingAngle={3} dataKey="value"
                              label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                              {roomPieData.map((_,i)=>(
                                <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={v=>`${v}%`} />
                            <Legend wrapperStyle={{fontSize:11}} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                  </ChartCard>
                )}
              </div>

              {/* ── Daily Load Line Chart ── */}
              {showDays && analytics.dailyLoad?.length > 0 && (
                <ChartCard title="Daily Class Load" icon={<FaCalendar />} delay={7}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.dailyLoad} margin={{top:5,right:10,left:-20,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{fontSize:11,fill:'#64748b'}} />
                      <YAxis tick={{fontSize:11,fill:'#64748b'}} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{fontSize:11}} />
                      <Line type="monotone" dataKey="classes" stroke="#6366f1" strokeWidth={2.5}
                        dot={{r:4,fill:'#6366f1'}} activeDot={{r:6}} name="Classes/Day" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* ── Weekly Trend Line Chart ── */}
              {showDays && analytics.weeklyTrend?.length > 0 && (
                <ChartCard title="Weekly Slot Usage Trend" icon={<FaChartBar />} delay={8}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.weeklyTrend} margin={{top:5,right:10,left:-20,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{fontSize:11,fill:'#64748b'}} />
                      <YAxis tick={{fontSize:11,fill:'#64748b'}} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{fontSize:11}} />
                      <Line type="monotone" dataKey="scheduled" stroke="#6366f1" strokeWidth={2.5}
                        dot={{r:4,fill:'#6366f1'}} activeDot={{r:6}} name="Scheduled Slots" />
                      <Line type="monotone" dataKey="utilPct" stroke="#22d3ee" strokeWidth={2.5}
                        dot={{r:4,fill:'#22d3ee'}} activeDot={{r:6}} name="Utilisation %" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* ── Subject Frequency Table ── */}
              {showSubjects && analytics.subjectData?.length > 0 && (
                <ChartCard title="Subject Frequency This Week" icon={<FaBook />} delay={9}>
                  <SubjectTable subjects={analytics.subjectData} />
                </ChartCard>
              )}

              {/* ── Teacher Workload Bars detail ── */}
              {showTeachers && analytics.teacherData?.length > 0 && (
                <ChartCard title="Lecturer Workload Details" icon={<FaBalanceScale />} delay={10}>
                  <TeacherBars teacherData={analytics.teacherData} avgLoad={analytics.avgTeacherLoad} />
                  {analytics.imbalanced && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-2.5">
                      ⚠️ Workload imbalance detected — consider redistributing classes.
                    </div>
                  )}
                </ChartCard>
              )}

              {/* ── AI Insights ── */}
              <ChartCard title="AI-Powered Insights" icon={<FaBrain />} delay={11}>
                <div className="space-y-3">
                  {insights.map((ins,i)=>(
                    <InsightRow key={i} {...ins} delay={11+i*0.4} />
                  ))}
                </div>
              </ChartCard>

              {/* ── Risk Detection ── */}
              {(analytics.overloadedTeachers.length > 0 || analytics.overbookedRooms.length > 0 || analytics.gapIssues) && (
                <ChartCard title="Risk Detection" icon={<FaShieldAlt />} delay={12}>
                  <div className="space-y-3">
                    {analytics.overloadedTeachers.length > 0 && (
                      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={12}
                        className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                        <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-red-700 dark:text-red-300 text-sm mb-1">Overloaded Teachers</div>
                          <div className="text-xs text-red-600 dark:text-red-400">{analytics.overloadedTeachers.map(t=>t.name).join(', ')} — above average load. Recommend immediate redistribution.</div>
                        </div>
                      </motion.div>
                    )}
                    {analytics.overbookedRooms.length > 0 && (
                      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={12.5}
                        className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                        <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-amber-700 dark:text-amber-300 text-sm mb-1">Overbooked Rooms</div>
                          <div className="text-xs text-amber-600 dark:text-amber-400">{analytics.overbookedRooms.map(r=>r.name).join(', ')} — utilization above average. Consider adding rooms.</div>
                        </div>
                      </motion.div>
                    )}
                    {analytics.gapIssues && (
                      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={13}
                        className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                        <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-blue-700 dark:text-blue-300 text-sm mb-1">Schedule Gaps Detected</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">Daily time slots or working days are below recommended minimums. Increase to 5+ slots/day and 4+ working days.</div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ChartCard>
              )}

              {/* ── AI Recommendations ── */}
              <ChartCard title="Smart Recommendations" icon={<FaRocket />} delay={13}>
                <div className="grid sm:grid-cols-2 gap-4">
                  {recs.map((r,i)=>(
                    <RecCard key={i} {...r} delay={13+i*0.5} />
                  ))}
                </div>
              </ChartCard>

              {/* ── AI Summary Card ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={14}
                className="bg-gradient-to-br from-indigo-600 via-violet-700 to-blue-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center text-white text-lg"><FaBrain /></div>
                  <h2 className="font-extrabold text-white text-lg">AI Summary</h2>
                  <div className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-200 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                    <HiSparkles className="text-cyan-300" /> AI Generated
                  </div>
                </div>
                <ul className="space-y-2">
                  {[
                    `Overall schedule quality: ${sl.text} (${analytics.score}/100)`,
                    `Room utilization is at ${analytics.utilizationPct}% — ${analytics.utilizationPct>=70?'well optimized':'could be improved'}.`,
                    `Faculty workload is ${analytics.imbalanced?'imbalanced — redistribution recommended':'evenly distributed'}.`,
                    `${analytics.scheduledEvts} events scheduled across ${analytics.totalSlots} available slots.`,
                    analytics.overbookedRooms.length ? `${analytics.overbookedRooms.length} room(s) operating above average utilization.` : 'All rooms within acceptable utilisation range.',
                  ].map((line,i)=>(
                    <motion.li key={i} className="flex items-start gap-2 text-sm text-indigo-100"
                      initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.4+i*0.1}}>
                      <span className="text-cyan-300 mt-0.5 flex-shrink-0"><FaCheckCircle /></span>
                      <span>{line}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* ── Navigation ── */}
              <div className="flex justify-between pt-2">
                <Link to="/ai-scheduling/optimization"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  ← Optimization
                </Link>
                <motion.button id="reload-analytics-btn" onClick={loadAnalytics}
                  whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-sm hover:bg-emerald-100 transition-colors">
                  <FaSync className="text-xs" /> Refresh
                </motion.button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

/* inline stub to avoid missing import */
function FaCalendar() { return <FaClock />; }
