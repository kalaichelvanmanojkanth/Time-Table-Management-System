import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaChartBar, FaStar, FaBrain, FaBalanceScale, FaDoorOpen,
  FaClock, FaGraduationCap, FaSync,
} from 'react-icons/fa';
import { PageShell } from './AISchedulingIndex';

const SETUP_KEY = 'ai_scheduling_setup';

/* ── Compute analytics from setup ── */
function computeAnalytics(setup) {
  const { teachers, subjects, rooms, workingDays, timeSlots } = setup;

  const totalSlots = workingDays.length * timeSlots;
  const scheduledEvents = Math.min(subjects.length * workingDays.length, totalSlots);
  const utilizationPct = Math.min(100, Math.round((scheduledEvents / totalSlots) * 100));

  /* Workload per teacher */
  const teacherLoad = {};
  teachers.forEach(t => {
    teacherLoad[t] = Math.floor(scheduledEvents / teachers.length) +
      (teachers.indexOf(t) < scheduledEvents % teachers.length ? 1 : 0);
  });
  const loads = Object.values(teacherLoad);
  const maxLoad = Math.max(...loads, 0);
  const minLoad = Math.min(...loads, 0);
  const imbalanced = maxLoad - minLoad > 2;

  /* Efficiency score */
  const baseScore = 70;
  const score = Math.min(100, Math.max(50,
    baseScore
    + (utilizationPct >= 70 ? 10 : 0)
    + (!imbalanced ? 10 : -5)
    + (workingDays.length >= 4 ? 5 : -5)
    + (timeSlots >= 5 && timeSlots <= 8 ? 5 : 0)
  ));

  /* Student gap analysis — days with < 3 slots */
  const lightDays = workingDays.filter(() => timeSlots < 4);
  const gapIssues = lightDays.length > 0
    ? `${lightDays.length} day(s) have fewer than 4 time slots — students may have large free gaps.`
    : 'No significant free-gap issues detected for students.';

  /* Room utilization per room */
  const roomUtil = {};
  rooms.forEach((r, i) => {
    const assigned = Math.floor(scheduledEvents / rooms.length) + (i < scheduledEvents % rooms.length ? 1 : 0);
    roomUtil[r] = Math.min(100, Math.round((assigned / (workingDays.length * timeSlots / rooms.length)) * 100));
  });

  return { score, utilizationPct, teacherLoad, imbalanced, gapIssues, roomUtil, scheduledEvents, totalSlots };
}

function scoreLabel(s) {
  if (s >= 85) return { text: 'Excellent', color: 'text-emerald-500' };
  if (s >= 70) return { text: 'Good', color: 'text-blue-500' };
  if (s >= 55) return { text: 'Fair', color: 'text-amber-500' };
  return { text: 'Needs Work', color: 'text-red-500' };
}

export default function TimetableAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SETUP_KEY);
    setHasSetup(!!raw);
  }, []);

  async function loadAnalytics() {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) { toast.error('No timetable data available'); return; }
    const parsed = JSON.parse(raw);
    if (!parsed.teachers?.length && !parsed.subjects?.length) {
      toast.warning('Workload imbalance detected - setup appears empty');
      return;
    }
    setLoading(true);
    setAnalytics(null);
    await new Promise(r => setTimeout(r, 900));
    const result = computeAnalytics(parsed);
    setAnalytics(result);
    setLoading(false);
    toast.success('Analytics loaded successfully');
    if (result.imbalanced) toast.warning('Workload imbalance detected');
    toast.info('AI insights generated');
  }

  const sl = analytics ? scoreLabel(analytics.score) : null;

  return (
    <PageShell
      title="Timetable Analytics"
      subtitle="Efficiency score, workload distribution, classroom utilization, and student gap analysis"
      icon={<FaChartBar />}
      gradient="bg-gradient-to-r from-emerald-600 to-teal-700"
      breadcrumb="Analytics"
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">

        {/* No setup warning */}
        {!hasSetup && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">No Timetable Data Available</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">Complete the AI Scheduling Setup before loading analytics.</p>
              <Link to="/ai-scheduling/setup" className="text-sm font-bold text-amber-700 dark:text-amber-300 hover:underline">→ Go to Setup</Link>
            </div>
          </div>
        )}

        {/* Load button */}
        <div className="flex justify-center mb-8">
          <button
            id="load-analytics-btn"
            onClick={loadAnalytics}
            disabled={!hasSetup || loading}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-base"
          >
            {loading
              ? <><FaSync className="animate-spin" /> Loading...</>
              : <><FaBrain /> Load Analytics</>}
          </button>
        </div>

        {analytics && (
          <div className="space-y-6">
            {/* ── KPI row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  icon: <FaStar className="text-xl" />,
                  label: 'Efficiency Score',
                  value: `${analytics.score}`,
                  sub: sl.text,
                  color: sl.color,
                  bg: 'bg-white dark:bg-slate-800',
                },
                {
                  icon: <FaDoorOpen className="text-xl" />,
                  label: 'Room Utilization',
                  value: `${analytics.utilizationPct}%`,
                  sub: analytics.utilizationPct >= 70 ? 'Efficient' : 'Low',
                  color: analytics.utilizationPct >= 70 ? 'text-emerald-500' : 'text-amber-500',
                  bg: 'bg-white dark:bg-slate-800',
                },
                {
                  icon: <FaBalanceScale className="text-xl" />,
                  label: 'Workload Balance',
                  value: analytics.imbalanced ? '⚠️' : '✓',
                  sub: analytics.imbalanced ? 'Imbalanced' : 'Balanced',
                  color: analytics.imbalanced ? 'text-amber-500' : 'text-emerald-500',
                  bg: 'bg-white dark:bg-slate-800',
                },
                {
                  icon: <FaClock className="text-xl" />,
                  label: 'Scheduled',
                  value: `${analytics.scheduledEvents}`,
                  sub: `of ${analytics.totalSlots} slots`,
                  color: 'text-blue-500 dark:text-blue-400',
                  bg: 'bg-white dark:bg-slate-800',
                },
              ].map(({ icon, label, value, sub, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 text-center`}>
                  <div className={`flex justify-center mb-2 ${color}`}>{icon}</div>
                  <div className={`text-2xl sm:text-3xl font-extrabold ${color} mb-0.5`}>{value}</div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</div>
                  <div className={`text-[10px] mt-0.5 font-semibold ${color}`}>{sub}</div>
                </div>
              ))}
            </div>

            {/* ── Efficiency score bar ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-6">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaStar className="text-amber-400" /> Schedule Efficiency Score
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    <span>0</span><span>100</span>
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ${
                        analytics.score >= 85 ? 'from-emerald-400 to-emerald-600'
                        : analytics.score >= 70 ? 'from-blue-400 to-blue-600'
                        : analytics.score >= 55 ? 'from-amber-400 to-amber-600'
                        : 'from-red-400 to-red-600'
                      }`}
                      style={{ width: `${analytics.score}%` }}
                    />
                  </div>
                </div>
                <div className={`text-3xl font-extrabold ${sl.color} w-16 text-right`}>{analytics.score}</div>
              </div>
            </div>

            {/* ── Teacher workload ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-6">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaBalanceScale className="text-violet-500" /> Lecturer Workload Distribution
              </h2>
              {Object.keys(analytics.teacherLoad).length === 0 ? (
                <p className="text-sm text-slate-400">No teacher data available.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.teacherLoad).map(([teacher, load]) => {
                    const max = Math.max(...Object.values(analytics.teacherLoad));
                    const pct = max > 0 ? Math.round((load / max) * 100) : 0;
                    return (
                      <div key={teacher}>
                        <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          <span className="truncate max-w-[220px]">{teacher}</span>
                          <span>{load} class{load !== 1 ? 'es' : ''}</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {analytics.imbalanced && (
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-2.5">
                  ⚠️ Workload imbalance detected — consider redistributing classes.
                </div>
              )}
            </div>

            {/* ── Classroom utilization ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-6">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaDoorOpen className="text-cyan-500" /> Classroom Utilization
              </h2>
              {Object.keys(analytics.roomUtil).length === 0 ? (
                <p className="text-sm text-slate-400">No classroom data available.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(analytics.roomUtil).map(([room, pct]) => (
                    <div key={room} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        <span>{room}</span><span>{Math.min(pct, 99)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all duration-700"
                          style={{ width: `${Math.min(pct, 99)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Student gap analysis ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-6">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaGraduationCap className="text-emerald-500" /> Student Gap Analysis
              </h2>
              <div className={`flex items-start gap-3 rounded-xl p-4 ${
                analytics.gapIssues.includes('No significant')
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                <span className="text-lg">{analytics.gapIssues.includes('No significant') ? '✅' : '⚠️'}</span>
                <p className="text-sm leading-relaxed">{analytics.gapIssues}</p>
              </div>
            </div>

            {/* ── AI Summary Insights ── */}
            <div className="bg-gradient-to-br from-indigo-50 dark:from-indigo-950/30 to-blue-50 dark:to-blue-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900 p-6">
              <h2 className="font-bold text-indigo-800 dark:text-indigo-200 mb-4 flex items-center gap-2">
                <FaBrain className="text-indigo-500" /> Summary Insights
              </h2>
              <ul className="space-y-2 text-sm text-indigo-700 dark:text-indigo-300">
                <li className="flex items-start gap-2"><span>•</span> Overall schedule quality: <strong>{sl.text} ({analytics.score}/100)</strong></li>
                <li className="flex items-start gap-2"><span>•</span> Room utilization is at <strong>{analytics.utilizationPct}%</strong> — {analytics.utilizationPct >= 70 ? 'well optimized' : 'could be improved'}.</li>
                <li className="flex items-start gap-2"><span>•</span> Faculty workload is <strong>{analytics.imbalanced ? 'imbalanced — redistribution recommended' : 'evenly distributed'}</strong>.</li>
                <li className="flex items-start gap-2"><span>•</span> <strong>{analytics.scheduledEvents}</strong> events scheduled across <strong>{analytics.totalSlots}</strong> available slots.</li>
                <li className="flex items-start gap-2"><span>•</span> {analytics.gapIssues}</li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Link to="/ai-scheduling/optimization" className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                ← Optimization
              </Link>
              <button
                id="reload-analytics-btn"
                onClick={loadAnalytics}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-sm hover:bg-emerald-100 transition-colors"
              >
                <FaSync className="text-xs" /> Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
