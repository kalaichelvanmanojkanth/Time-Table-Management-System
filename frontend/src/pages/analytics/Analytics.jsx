import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaChartBar, FaUserTie, FaBookOpen, FaDoorOpen,
  FaFileAlt, FaArrowRight, FaSpinner,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
/* DEMO MODE: no backend required */

const QUICK_LINKS = [
  { to: '/analytics/teacher-workload',    label: 'Teacher Workload',    icon: <FaUserTie />,  color: 'from-blue-600 to-primary',        badge: 'bg-blue-50 text-primary border-blue-100' },
  { to: '/analytics/subject-distribution',label: 'Subject Distribution',icon: <FaBookOpen />, color: 'from-secondary to-violet-700',    badge: 'bg-indigo-50 text-secondary border-indigo-100' },
  { to: '/analytics/resource-utilization',label: 'Resource Utilization',icon: <FaDoorOpen />, color: 'from-emerald-500 to-teal-600',   badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { to: '/analytics/reports',             label: 'Reports & Insights',  icon: <FaFileAlt />,  color: 'from-amber-500 to-orange-500',    badge: 'bg-amber-50 text-amber-600 border-amber-100' },
];

export default function Analytics() {
  // DEMO MODE: static dummy counts — no backend required
  const [stats]   = useState({ teachers: 7, subjects: 10, rooms: 6, timetable: 42 });
  const [loading] = useState(false);

  const KPI = [
    { label: 'Registered Teachers', value: stats.teachers, color: 'text-primary'     },
    { label: 'Registered Subjects', value: stats.subjects, color: 'text-secondary'   },
    { label: 'Registered Rooms',    value: stats.rooms,    color: 'text-emerald-500'  },
    { label: 'Timetable Entries',   value: stats.timetable,color: 'text-amber-500'   },
  ];

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link to="/" id="analytics-back-home" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> Home
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-navy">Academic Analytics</span>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <HiSparkles /> Analytics
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* heading */}
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-primary bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
            <HiSparkles /> Academic Analytics &amp; Workload Intelligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy leading-tight mb-3">
            Analytics <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Hub</span>
          </h1>
          <p className="text-muted text-lg max-w-2xl">
            Real-time analytics powered by live timetable data — teachers, subjects, rooms, and scheduling entries updated continuously.
          </p>
        </div>


        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 text-center hover:shadow-lg transition-shadow">
              {loading
                ? <div className="flex justify-center mb-1"><FaSpinner className="animate-spin text-slate-300 text-2xl" /></div>
                : <div className={`text-3xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
              }
              <div className="text-xs font-semibold text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Featured: Open Dashboard CTA */}
        <Link to="/analytics/dashboard" id="analytics-card-dashboard"
          className="group relative flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl p-8 shadow-2xl hover:shadow-[0_0_40px_rgba(30,41,59,0.3)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          {/* glow blob */}
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-3xl shadow-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            <FaChartBar />
          </div>

          <div className="relative flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-blue-300 bg-white/10 border border-white/20 rounded-full px-2.5 py-0.5 mb-2">
              <HiSparkles /> Full Dashboard
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-1">Analytics Overview Dashboard</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              All analytics in one place — teacher workload, subject distribution, room utilisation, filters, AI insights, and CRUD actions.
            </p>
          </div>

          <div className="relative inline-flex items-center gap-2 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-xl transition-all flex-shrink-0">
            Open Dashboard <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>


        {/* Compact quick-links */}
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Detailed Analytics Pages</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_LINKS.map(l => (
              <Link key={l.to} to={l.to} id={`analytics-link-${l.to.split('/').pop()}`}
                className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${l.color} text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {l.icon}
                </div>
                <div>
                  <span className="font-bold text-sm text-navy group-hover:text-primary transition-colors block">{l.label}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${l.badge} mt-0.5 inline-block`}>Live</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
