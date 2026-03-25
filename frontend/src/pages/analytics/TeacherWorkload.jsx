import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaChartBar, FaExclamationTriangle, FaCheckCircle,
  FaLightbulb, FaUserTie, FaClock, FaCalendarAlt,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

/* ─────────────────────────────────────────────
   IntersectionObserver reveal hook
───────────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = '0ms', className = '' }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal-on-scroll ${className}`} style={{ transitionDelay: delay }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const TEACHERS = [
  { name: 'Dr. Anita Sharma',      dept: 'Computer Science', hours: 22, max: 20, subjects: ['Algorithms', 'Data Structures', 'AI & ML'], status: 'overloaded'  },
  { name: 'Prof. Ravi Kumar',       dept: 'Mathematics',      hours: 18, max: 20, subjects: ['Math III', 'Calculus'],                       status: 'optimal'    },
  { name: 'Dr. Preethi Nair',       dept: 'Computer Science', hours: 14, max: 20, subjects: ['Networks', 'OS Concepts'],                    status: 'underloaded' },
  { name: 'Mr. Suresh Babu',        dept: 'Physics',          hours: 20, max: 20, subjects: ['Physics I', 'Lab Sessions'],                  status: 'optimal'    },
  { name: 'Dr. Meera Krishnan',     dept: 'Computer Science', hours: 24, max: 20, subjects: ['Databases', 'Web Dev', 'Cloud Computing'],    status: 'overloaded'  },
  { name: 'Prof. Karthik Rajan',    dept: 'Electronics',      hours: 10, max: 20, subjects: ['Digital Circuits'],                           status: 'underloaded' },
];

const WEEKLY_DATA = [
  { week: 'Week 1', avg: 17, peak: 24, min: 10 },
  { week: 'Week 2', avg: 18, peak: 24, min: 10 },
  { week: 'Week 3', avg: 19, peak: 24, min: 12 },
  { week: 'Week 4', avg: 17, peak: 22, min: 10 },
  { week: 'Week 5', avg: 18, peak: 24, min: 11 },
  { week: 'Week 6', avg: 20, peak: 24, min: 14 },
];

const SUGGESTIONS = [
  {
    icon: <FaLightbulb />,
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900',
    title: 'Redistribute Databases to Prof. Karthik Rajan',
    desc: 'Dr. Meera Krishnan is 4h over limit. Moving "Databases" to Prof. Karthik Rajan (10h/week) would balance both to ~18h.',
  },
  {
    icon: <FaLightbulb />,
    color: 'from-blue-500 to-primary',
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900',
    title: 'Assign an elective to Dr. Preethi Nair',
    desc: 'Dr. Preethi Nair is running at 14h/week (30% below capacity). Consider assigning the "Software Engineering" elective.',
  },
  {
    icon: <FaCheckCircle />,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900',
    title: 'Prof. Ravi Kumar & Mr. Suresh Babu are well balanced',
    desc: 'Both faculty members are within the optimal 18–20h range. No action required for next semester.',
  },
];

const STATUS_META = {
  overloaded:  { label: 'Overloaded', cls: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
  optimal:     { label: 'Optimal',    cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
  underloaded: { label: 'Under-load', cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
};

const SUMMARY_STATS = [
  { label: 'Total Faculty',      value: '6',   icon: <FaUserTie />,             color: 'text-primary dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950'    },
  { label: 'Avg Weekly Hours',   value: '18h', icon: <FaClock />,               color: 'text-secondary dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-950' },
  { label: 'Overloaded Faculty', value: '2',   icon: <FaExclamationTriangle />, color: 'text-rose-500',                        bg: 'bg-rose-100 dark:bg-rose-950'    },
  { label: 'Optimal Load',       value: '2',   icon: <FaCheckCircle />,         color: 'text-emerald-500',                     bg: 'bg-emerald-100 dark:bg-emerald-950' },
];

/* ─────────────────────────────────────────────
   Bar fill component for teaching hours
───────────────────────────────────────────── */
function HoursBar({ hours, max }) {
  const pct = Math.min((hours / max) * 100, 120); // allow overflow to 120%
  const over = hours > max;
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
        {/* Max marker line */}
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-600 z-10" />
        <div
          className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-primary to-accent'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-12 text-right ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>
        {hours}h / {max}h
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════ */
export default function TeacherWorkload() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? TEACHERS
    : TEACHERS.filter(t => t.status === activeFilter);

  const overloadedCount  = TEACHERS.filter(t => t.status === 'overloaded').length;
  const underloadedCount = TEACHERS.filter(t => t.status === 'underloaded').length;

  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">

      {/* ── Top bar ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-4 sticky top-0 z-40 shadow-sm">
        <Link
          to="/analytics"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
          id="back-to-analytics"
        >
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold text-navy dark:text-slate-200">Teacher Workload Analytics</span>

        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary dark:text-accent bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-full px-3 py-1">
            <HiSparkles className="text-accent" /> Academic Analytics
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-12">

        {/* ── Page heading ── */}
        <Reveal>
          <div className="mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white leading-tight">
              Teacher Workload{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Analytics
              </span>
            </h1>
            <p className="mt-2 text-muted dark:text-slate-400 text-lg">
              Monitor teaching hours, identify overloaded faculty, and rebalance workloads across departments.
            </p>
          </div>
        </Reveal>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_STATS.map((s, i) => (
            <Reveal key={s.label} delay={`${i * 60}ms`}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-muted dark:text-slate-400 mt-0.5">{s.label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── Teaching Hours Per Teacher ── */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-navy dark:text-white">Teaching Hours per Faculty</h2>
                <p className="text-sm text-muted dark:text-slate-400 mt-0.5">Maximum allowed: 20h/week per faculty member</p>
              </div>
              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all',         label: 'All', count: TEACHERS.length },
                  { key: 'overloaded',  label: 'Overloaded', count: overloadedCount },
                  { key: 'optimal',     label: 'Optimal', count: TEACHERS.filter(t => t.status === 'optimal').length },
                  { key: 'underloaded', label: 'Under-load', count: underloadedCount },
                ].map(f => (
                  <button
                    key={f.key}
                    id={`filter-${f.key}`}
                    onClick={() => setActiveFilter(f.key)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      activeFilter === f.key
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white dark:bg-slate-800 text-muted dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-blue-600'
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filtered.map((t, i) => {
                const meta = STATUS_META[t.status];
                return (
                  <div
                    key={t.name}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 hover:shadow-lg transition-shadow"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-navy dark:text-slate-100 text-sm">{t.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <div className="text-xs text-muted dark:text-slate-400 mt-0.5">{t.dept}</div>
                      </div>
                      {t.status === 'overloaded' && (
                        <div className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded-lg px-2 py-1">
                          <FaExclamationTriangle className="text-[10px]" />
                          +{t.hours - t.max}h over limit
                        </div>
                      )}
                    </div>

                    {/* Hours bar */}
                    <HoursBar hours={t.hours} max={t.max} />

                    {/* Subjects */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {t.subjects.map(s => (
                        <span key={s} className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-muted dark:text-slate-300 rounded-full px-2.5 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>

        {/* ── Weekly Workload Comparison ── */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-navy dark:text-white">Weekly Workload Comparison</h2>
              <p className="text-sm text-muted dark:text-slate-400 mt-1">Average, peak, and minimum teaching hours across all faculty over 6 weeks</p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
              {[
                { label: 'Average',   color: 'bg-gradient-to-r from-primary to-secondary' },
                { label: 'Peak',      color: 'bg-rose-400' },
                { label: 'Minimum',   color: 'bg-emerald-400' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                  <span className="text-xs font-semibold text-muted dark:text-slate-400">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="flex items-end gap-3 h-44">
              {WEEKLY_DATA.map(({ week, avg, peak, min }, i) => (
                <div key={week} className="flex-1 flex flex-col items-center gap-1" style={{ animationDelay: `${i * 80}ms` }}>
                  {/* Grouped bars */}
                  <div className="flex items-end gap-0.5 w-full h-36">
                    {/* Avg bar */}
                    <div
                      className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-secondary transition-all duration-700 hover:opacity-80"
                      style={{ height: `${(avg / 26) * 100}%` }}
                      title={`Avg: ${avg}h`}
                    />
                    {/* Peak bar */}
                    <div
                      className="flex-1 rounded-t-md bg-rose-400 transition-all duration-700 hover:opacity-80"
                      style={{ height: `${(peak / 26) * 100}%` }}
                      title={`Peak: ${peak}h`}
                    />
                    {/* Min bar */}
                    <div
                      className="flex-1 rounded-t-md bg-emerald-400 transition-all duration-700 hover:opacity-80"
                      style={{ height: `${(min / 26) * 100}%` }}
                      title={`Min: ${min}h`}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-muted dark:text-slate-400">{week}</span>
                </div>
              ))}
            </div>

            {/* Max line annotation */}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted dark:text-slate-400">
              <div className="w-6 h-0.5 bg-dashed border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
              <span>20h/week = maximum allowed workload</span>
            </div>
          </section>
        </Reveal>

        {/* ── Overloaded Teacher Alerts ── */}
        {overloadedCount > 0 && (
          <Reveal>
            <section>
              <h2 className="text-xl font-extrabold text-navy dark:text-white mb-4">
                <FaExclamationTriangle className="inline text-rose-500 mr-2 text-lg" />
                Overloaded Teacher Alerts
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {TEACHERS.filter(t => t.status === 'overloaded').map((t, i) => (
                  <Reveal key={t.name} delay={`${i * 80}ms`}>
                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-400 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-navy dark:text-slate-100 text-sm">{t.name}</div>
                          <div className="text-xs text-muted dark:text-slate-400">{t.dept}</div>
                        </div>
                      </div>
                      <div className="text-sm text-rose-700 dark:text-rose-300 font-semibold mb-1">
                        ⚠ {t.hours}h assigned — {t.hours - t.max}h above the 20h/week limit
                      </div>
                      <div className="text-xs text-rose-600 dark:text-rose-400">
                        Subjects: {t.subjects.join(', ')}
                      </div>
                      <div className="mt-3 text-[11px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-1.5 inline-block">
                        Action Required: Reassign or reduce teaching load
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* ── Workload Balance Suggestions ── */}
        <Reveal>
          <section className="pb-10">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-2">Workload Balance Suggestions</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-6">AI-generated recommendations to optimize faculty workload distribution.</p>

            <div className="grid gap-4">
              {SUGGESTIONS.map((s, i) => (
                <Reveal key={s.title} delay={`${i * 80}ms`}>
                  <div className={`flex gap-4 rounded-2xl border p-5 ${s.bg} transition-all hover:shadow-md`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center text-sm flex-shrink-0`}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="font-bold text-navy dark:text-slate-100 text-sm mb-1">{s.title}</div>
                      <div className="text-xs text-muted dark:text-slate-400 leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>
      </main>

      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .reveal-on-scroll.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
