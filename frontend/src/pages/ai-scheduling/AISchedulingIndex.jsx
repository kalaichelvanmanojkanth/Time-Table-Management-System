import { Link } from 'react-router-dom';
import {
  FaCogs, FaExclamationTriangle, FaLightbulb, FaCalendarCheck,
  FaArrowRight, FaBrain, FaRocket, FaShieldAlt, FaCheckCircle,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

/* ─────────────────────────────────────────
   Shared PageShell
───────────────────────────────────────── */
export function PageShell({ title, subtitle, icon, gradient, breadcrumb, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans">
      <div className={`${gradient} px-5 sm:px-8 pt-12 pb-12 relative overflow-hidden`}>
        {/* decorative orbs */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-5 flex-wrap">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link to="/ai-scheduling" className="hover:text-white transition-colors">AI Scheduling</Link>
            {breadcrumb && <><span>/</span><span className="text-white font-semibold">{breadcrumb}</span></>}
          </nav>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-lg">
              {icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{title}</h1>
              <p className="text-white/70 text-sm mt-1">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   Shared Section wrapper
───────────────────────────────────────── */
export function Section({ title, icon, gradient, badge, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
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

/* ─────────────────────────────────────────
   TagChip — improved with animation
───────────────────────────────────────── */
export function TagChip({ label, onRemove, colorClass }) {
  return (
    <span className={`group inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1.5 transition-all duration-200 hover:scale-105 hover:shadow-md ${colorClass}`}>
      {label}
      <button
        onClick={onRemove}
        className="w-4 h-4 flex items-center justify-center rounded-full opacity-50 group-hover:opacity-100 group-hover:bg-black/10 dark:group-hover:bg-white/20 transition-all duration-150 ml-0.5 leading-none flex-shrink-0"
        aria-label={`Remove ${label}`}
      >
        ✕
      </button>
    </span>
  );
}

/* ═══════════════════════════════════════════
   CARDS DATA
═══════════════════════════════════════════ */
const CARDS = [
  {
    id: 'setup', icon: <FaCogs />, step: '01',
    title: 'AI Scheduling Setup',
    desc: 'Configure teachers, subjects, classrooms, constraints, working days, and time slots before running the AI engine.',
    link: '/ai-scheduling/setup',
    gradient: 'from-blue-600 to-indigo-700',
    glow: 'hover:shadow-blue-200/60 dark:hover:shadow-blue-900/60',
    badgeColor: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
    accent: 'bg-blue-500',
  },
  {
    id: 'conflicts', icon: <FaExclamationTriangle />, step: '02',
    title: 'Conflict Detection',
    desc: 'Detect and resolve teacher conflicts, room double-bookings, and subject overlaps automatically with one click.',
    link: '/ai-scheduling/conflicts',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'hover:shadow-amber-200/60 dark:hover:shadow-amber-900/60',
    badgeColor: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
    accent: 'bg-amber-500',
  },
  {
    id: 'optimization', icon: <FaLightbulb />, step: '03',
    title: 'Optimization & AI Suggestions',
    desc: 'Analyze your timetable, detect inefficiencies, and apply AI-powered fixes with a single action.',
    link: '/ai-scheduling/optimization',
    gradient: 'from-violet-600 to-purple-700',
    glow: 'hover:shadow-violet-200/60 dark:hover:shadow-violet-900/60',
    badgeColor: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300',
    accent: 'bg-violet-500',
  },
  {
    id: 'analytics', icon: <FaCalendarCheck />, step: '04',
    title: 'Final Schedule & Approval',
    desc: 'Review the AI-generated timetable, validate constraints, fix remaining issues, and finalize for deployment.',
    link: '/ai-scheduling/analytics',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'hover:shadow-emerald-200/60 dark:hover:shadow-emerald-900/60',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
    accent: 'bg-emerald-500',
  },
];

const HIGHLIGHTS = [
  { icon: <FaRocket />,      label: 'AI-Powered'     },
  { icon: <FaShieldAlt />,   label: 'Zero Conflicts'  },
  { icon: <FaCheckCircle />, label: 'Auto-Optimized'  },
  { icon: <FaBrain />,       label: 'Smart Insights'  },
];

const WORKFLOW_STEPS = [
  { step:'01', color:'bg-blue-600',    label:'Configure Setup',         desc:'Add teachers, subjects, rooms, and working days' },
  { step:'02', color:'bg-amber-500',   label:'Detect Conflicts',         desc:'Find and resolve scheduling conflicts' },
  { step:'03', color:'bg-violet-600',  label:'Apply AI Optimizations',   desc:'Let the AI suggest improvements' },
  { step:'04', color:'bg-emerald-500', label:'Approve & Deploy',         desc:'Review, validate, and publish the timetable' },
];

/* ═══════════════════════════════════════════
   MAIN INDEX PAGE
═══════════════════════════════════════════ */
export default function AISchedulingIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 font-sans">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-blue-800 pt-16 pb-24 px-5 sm:px-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[450px] h-[450px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-indigo-200 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <HiSparkles className="text-cyan-300" /> AI Scheduling Module
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-[1.12]">
            Smart Timetable Optimization<br />
            <span className="text-cyan-300">& AI Scheduling</span>
          </h1>
          <p className="text-indigo-200 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            A complete AI-powered workflow to configure, detect conflicts, optimize,
            and publish your academic timetable — all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {HIGHLIGHTS.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold rounded-full px-4 py-2 transition-colors cursor-default">
                <span className="text-cyan-300">{icon}</span> {label}
              </div>
            ))}
          </div>
          <Link
            to="/ai-scheduling/setup"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-extrabold px-8 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-sm"
          >
            <FaRocket className="text-indigo-500" /> Get Started → Setup
          </Link>
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

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-16 space-y-10">

        {/* ── Step Progress Bar ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md px-6 py-5">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Recommended Workflow</p>
          <div className="flex items-center gap-0">
            {WORKFLOW_STEPS.map((ws, i) => (
              <div key={ws.step} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0 px-1">
                  <div className={`w-9 h-9 rounded-full ${ws.color} text-white flex items-center justify-center text-xs font-black mb-2 flex-shrink-0 shadow-md`}>
                    {ws.step}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{ws.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block leading-tight">{ws.desc}</div>
                  </div>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="flex-shrink-0 mx-1">
                    <FaArrowRight className="text-slate-300 dark:text-slate-600 text-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Cards Grid ── */}
        <div className="grid sm:grid-cols-2 gap-6">
          {CARDS.map((card) => (
            <Link
              key={card.id}
              to={card.link}
              id={`ai-card-${card.id}`}
              className={`group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-2xl hover:-translate-y-2 ${card.glow} transition-all duration-300 overflow-hidden`}
            >
              {/* top gradient bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${card.gradient}`} />

              {/* subtle bg glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none`} />

              <div className="p-7 relative">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} text-white flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    {card.icon}
                  </div>
                  <span className={`text-[10px] font-black tracking-widest uppercase rounded-full px-3 py-1 ${card.badgeColor}`}>
                    Step {card.step}
                  </span>
                </div>
                <h2 className="text-[1.1rem] font-extrabold text-slate-800 dark:text-slate-100 mb-2 leading-snug group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-200">
                  {card.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                  {card.desc}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 translate-x-0 group-hover:translate-x-1 transition-transform duration-200 opacity-0 group-hover:opacity-100">
                  Open {card.title} <FaArrowRight className="text-[10px]" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Workflow info box ── */}
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
            <FaBrain />
          </div>
          <div>
            <h3 className="font-bold text-indigo-800 dark:text-indigo-200 mb-1">How It Works</h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 leading-relaxed">
              Start with <strong>Setup</strong> to configure your data → run <strong>Conflict Detection</strong> to find issues →
              use <strong>Optimization</strong> to apply AI fixes → finalize with <strong>Final Schedule & Approval</strong> to review, validate, and publish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
