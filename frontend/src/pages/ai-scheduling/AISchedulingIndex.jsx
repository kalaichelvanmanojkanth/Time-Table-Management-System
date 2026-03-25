import { Link } from 'react-router-dom';
import {
  FaCogs, FaExclamationTriangle, FaLightbulb, FaChartBar,
  FaArrowRight, FaBrain, FaRocket, FaShieldAlt, FaCheckCircle,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

/* ────────────────────────────────────────────
   Shared page shell (header + breadcrumb)
──────────────────────────────────────────── */
export function PageShell({ title, subtitle, icon, gradient, breadcrumb, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans">
      <div className={`${gradient} px-5 sm:px-8 pt-12 pb-10`}>
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-4 flex-wrap">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link to="/ai-scheduling" className="hover:text-white transition-colors">AI Scheduling</Link>
            {breadcrumb && <><span>/</span><span className="text-white font-semibold">{breadcrumb}</span></>}
          </nav>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-white text-2xl flex-shrink-0">
              {icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{title}</h1>
              <p className="text-white/70 text-sm mt-1">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────
   Reusable Section wrapper
──────────────────────────────────────────── */
export function Section({ title, icon, gradient, badge, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md overflow-hidden">
      <div className={`flex items-center justify-between px-6 py-4 ${gradient} text-white`}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <h2 className="font-bold text-base">{title}</h2>
        </div>
        {badge != null && (
          <span className="text-xs font-black bg-white/20 border border-white/30 rounded-full px-3 py-0.5">
            {badge} selected
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Reusable Tag chip
──────────────────────────────────────────── */
export function TagChip({ label, onRemove, colorClass }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1.5 ${colorClass}`}>
      {label}
      <button
        onClick={onRemove}
        className="opacity-60 hover:opacity-100 transition-opacity ml-0.5 leading-none"
        aria-label={`Remove ${label}`}
      >
        ✕
      </button>
    </span>
  );
}

/* ════════════════════════════════════════════
   MAIN INDEX PAGE
════════════════════════════════════════════ */
const CARDS = [
  {
    id: 'setup',
    icon: <FaCogs />,
    title: 'AI Scheduling Setup',
    desc: 'Configure teachers, subjects, classrooms, constraints, working days, and time slots before running the AI engine.',
    link: '/ai-scheduling/setup',
    gradient: 'from-blue-600 to-blue-800',
    badgeColor: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    step: '01',
  },
  {
    id: 'conflicts',
    icon: <FaExclamationTriangle />,
    title: 'Conflict Detection',
    desc: 'Detect and resolve teacher conflicts, room double-bookings, and subject overlaps automatically with one click.',
    link: '/ai-scheduling/conflicts',
    gradient: 'from-amber-500 to-orange-600',
    badgeColor: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    step: '02',
  },
  {
    id: 'optimization',
    icon: <FaLightbulb />,
    title: 'Optimization & AI Suggestions',
    desc: 'Analyze your timetable, detect inefficiencies, and apply AI-powered fixes with a single action.',
    link: '/ai-scheduling/optimization',
    gradient: 'from-violet-600 to-indigo-700',
    badgeColor: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
    step: '03',
  },
  {
    id: 'analytics',
    icon: <FaChartBar />,
    title: 'Timetable Analytics',
    desc: 'View efficiency scores, lecturer workload distributions, classroom utilization, and student gap analysis.',
    link: '/ai-scheduling/analytics',
    gradient: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    step: '04',
  },
];

const HIGHLIGHTS = [
  { icon: <FaRocket />, label: 'AI-Powered' },
  { icon: <FaShieldAlt />, label: 'Zero Conflicts' },
  { icon: <FaCheckCircle />, label: 'Auto-Optimized' },
  { icon: <FaBrain />, label: 'Smart Insights' },
];

export default function AISchedulingIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 font-sans">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-blue-800 pt-16 pb-20 px-5 sm:px-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-indigo-200 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <HiSparkles className="text-cyan-300" /> AI Scheduling Module
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-[1.12]">
            Smart Timetable Optimization<br />
            <span className="text-cyan-300">&amp; AI Scheduling</span>
          </h1>
          <p className="text-indigo-200 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            A complete AI-powered workflow to configure, detect conflicts, optimize,
            and analyze your academic timetable — all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {HIGHLIGHTS.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-full px-4 py-2">
                <span className="text-cyan-300">{icon}</span> {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-5">
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">AI Scheduling</span>
        </nav>
      </div>

      {/* ── Cards Grid ── */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-16">
        <div className="grid sm:grid-cols-2 gap-6">
          {CARDS.map((card) => (
            <Link
              key={card.id}
              to={card.link}
              id={`ai-card-${card.id}`}
              className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              <div className={`h-1 w-full bg-gradient-to-r ${card.gradient}`} />
              <div className="p-7">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} text-white flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {card.icon}
                  </div>
                  <span className={`text-[10px] font-black tracking-widest uppercase rounded-full px-3 py-1 ${card.badgeColor}`}>
                    Step {card.step}
                  </span>
                </div>
                <h2 className="text-[1.1rem] font-extrabold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                  {card.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                  {card.desc}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Open {card.title} <FaArrowRight className="text-[10px]" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Workflow hint */}
        <div className="mt-10 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
            <FaBrain />
          </div>
          <div>
            <h3 className="font-bold text-indigo-800 dark:text-indigo-200 mb-1">Recommended Workflow</h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 leading-relaxed">
              Start with <strong>Setup</strong> to configure your data → then run <strong>Conflict Detection</strong> → use <strong>Optimization</strong> to apply AI fixes → finally view <strong>Analytics</strong> for a full picture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
