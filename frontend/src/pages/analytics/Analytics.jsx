import { Link } from 'react-router-dom';
import { FaArrowLeft, FaChartBar, FaUserTie, FaBookOpen, FaDoorOpen, FaFileAlt, FaArrowRight } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

const CARDS = [
  {
    id: 'teacher-workload',
    to: '/analytics/teacher-workload',
    icon: <FaUserTie />,
    title: 'Teacher Workload',
    desc: 'Monitor teaching hours, detect overloaded faculty, and get AI-powered rebalancing suggestions.',
    color: 'from-blue-600 to-primary',
    glow: 'hover:shadow-[0_0_30px_rgba(30,58,138,0.2)]',
    badge: '6 Faculty',
    badgeCls: 'bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-400 border-blue-100 dark:border-blue-900',
  },
  {
    id: 'subject-distribution',
    to: '/analytics/subject-distribution',
    icon: <FaBookOpen />,
    title: 'Subject Distribution',
    desc: 'Analyse subject hours, department allocations, and detect over- or under-allocated courses.',
    color: 'from-secondary to-violet-700',
    glow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]',
    badge: '12 Subjects',
    badgeCls: 'bg-indigo-50 dark:bg-indigo-950/60 text-secondary dark:text-indigo-400 border-indigo-100 dark:border-indigo-900',
  },
  {
    id: 'resource-utilization',
    to: '/analytics/resource-utilization',
    icon: <FaDoorOpen />,
    title: 'Resource Utilization',
    desc: 'Track classroom usage, lab occupancy, free vs occupied rooms, and peak-hour analysis.',
    color: 'from-emerald-500 to-teal-600',
    glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    badge: '18 Rooms',
    badgeCls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
  },
  {
    id: 'reports',
    to: '/analytics/reports',
    icon: <FaFileAlt />,
    title: 'Reports & Insights',
    desc: 'Generate workload, subject, and resource reports. Export to PDF or Excel with one click.',
    color: 'from-amber-500 to-orange-500',
    glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    badge: 'Export Ready',
    badgeCls: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900',
  },
];

const QUICK_STATS = [
  { label: 'Faculty Members',   value: '6',    color: 'text-primary dark:text-blue-400'    },
  { label: 'Active Subjects',   value: '12',   color: 'text-secondary dark:text-indigo-400' },
  { label: 'Rooms Tracked',     value: '18',   color: 'text-emerald-500'                   },
  { label: 'Reports Generated', value: '34',   color: 'text-amber-500'                     },
];

export default function Analytics() {
  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">

      {/* ── Top bar ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link to="/" id="analytics-back-home" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
          <FaArrowLeft className="text-xs" /> Home
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold text-navy dark:text-slate-200">Academic Analytics</span>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary dark:text-accent bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-full px-3 py-1">
            <HiSparkles className="text-accent" /> Workload Intelligence
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10">

        {/* ── Heading ── */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-primary dark:text-accent bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-full px-3 py-1 mb-4">
            <HiSparkles /> Academic Analytics & Workload Intelligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white leading-tight mb-3">
            Analytics{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          <p className="text-muted dark:text-slate-400 text-lg max-w-2xl">
            Deep-dive into faculty workloads, subject allocations, resource usage, and generate comprehensive institutional reports.
          </p>
        </div>

        {/* ── Quick stats strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {QUICK_STATS.map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 text-center hover:shadow-lg transition-shadow">
              <div className={`text-3xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs font-semibold text-muted dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── 4 Navigation Cards ── */}
        <div className="grid sm:grid-cols-2 gap-6">
          {CARDS.map(c => (
            <Link
              key={c.id}
              to={c.to}
              id={`analytics-card-${c.id}`}
              className={`group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 p-7 flex flex-col ${c.glow}`}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white dark:from-slate-800 to-blue-50/40 dark:to-blue-950/20 pointer-events-none" />

              <div className="relative flex items-start justify-between mb-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.color} text-white flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {c.icon}
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.badgeCls}`}>{c.badge}</span>
              </div>

              <h2 className="relative font-extrabold text-navy dark:text-slate-100 text-xl mb-2">{c.title}</h2>
              <p className="relative text-muted dark:text-slate-400 text-sm leading-relaxed flex-1">{c.desc}</p>

              <div className="relative mt-5 flex items-center gap-1.5 text-sm font-bold text-primary dark:text-blue-400 group-hover:gap-2.5 transition-all duration-200">
                View {c.title} <FaArrowRight className="text-xs" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
