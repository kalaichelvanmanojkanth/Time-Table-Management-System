import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaDoorOpen, FaExclamationTriangle, FaCheckCircle, FaSync } from 'react-icons/fa';
import { buildAnalyticsFromEntries } from '../../services/generateTimetableEntries';

/* ── Reveal animation hook ── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } }, { threshold: 0.08 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, delay = '0ms', className = '' }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal-on-scroll ${className}`} style={{ transitionDelay: delay }}>{children}</div>;
}

/* ── Load helpers ── */
function loadEntries() {
  try { const r = localStorage.getItem('timetable_entries'); return r ? JSON.parse(r) : null; } catch { return null; }
}
function loadSetup() {
  try { const r = localStorage.getItem('ai_scheduling_setup'); return r ? JSON.parse(r) : null; } catch { return null; }
}

/* ── Static demo rooms (shown when no real data) ── */
const DEMO_ROOMS = [
  { id: 1,  name: 'A101', type: 'Classroom',   capacity: 60,  usedSlots: 8,  totalSlots: 10, peak: 'Mon 08:00', isLab: false },
  { id: 2,  name: 'A102', type: 'Classroom',   capacity: 60,  usedSlots: 6,  totalSlots: 10, peak: 'Tue 09:00', isLab: false },
  { id: 3,  name: 'B202', type: 'Classroom',   capacity: 80,  usedSlots: 4,  totalSlots: 10, peak: 'Mon 10:00', isLab: false },
  { id: 4,  name: 'B201', type: 'Classroom',   capacity: 80,  usedSlots: 2,  totalSlots: 10, peak: 'Tue 11:00', isLab: false },
  { id: 5,  name: 'C301', type: 'Classroom',   capacity: 50,  usedSlots: 4,  totalSlots: 10, peak: 'Mon 13:00', isLab: false },
  { id: 6,  name: 'D101', type: 'Classroom',   capacity: 70,  usedSlots: 10, totalSlots: 10, peak: 'Wed 12:00', isLab: false },
  { id: 7,  name: 'E201', type: 'Classroom',   capacity: 60,  usedSlots: 2,  totalSlots: 10, peak: 'Thu 09:00', isLab: false },
  { id: 8,  name: 'LAB-1',type: 'Computer Lab',capacity: 40,  usedSlots: 9,  totalSlots: 10, peak: 'Wed 10:00', isLab: true  },
  { id: 9,  name: 'LAB-2',type: 'Computer Lab',capacity: 40,  usedSlots: 5,  totalSlots: 10, peak: 'Thu 14:00', isLab: true  },
  { id: 10, name: 'LAB-3',type: 'Physics Lab', capacity: 30,  usedSlots: 0,  totalSlots: 10, peak: '—',         isLab: true  },
  { id: 11, name: 'F101', type: 'Seminar Hall',capacity: 120, usedSlots: 1,  totalSlots: 10, peak: 'Fri 10:00', isLab: false },
];

function getRoomStatus(r) {
  const pct = r.totalSlots > 0 ? (r.usedSlots / r.totalSlots) * 100 : 0;
  if (r.capacity <= 0)   return 'invalid';
  if (r.usedSlots === 0) return 'unused';
  if (pct >= 100)        return 'overbooked';
  if (pct >= 70)         return 'high';
  return 'normal';
}

const ROOM_STATUS_META = {
  overbooked: { label: 'Overbooked',  cls: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
  high:       { label: 'High Usage',  cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  unused:     { label: 'Unused',      cls: 'bg-slate-100 dark:bg-slate-700 text-muted dark:text-slate-400 border border-slate-200 dark:border-slate-600' },
  normal:     { label: 'Normal',      cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
  invalid:    { label: 'Invalid',     cls: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
};

/* ── Detect lab rooms by common keywords ── */
function isLab(name) {
  const lc = (name || '').toLowerCase();
  return lc.includes('lab') || lc.includes('laboratory');
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function ResourceUtilization() {
  const [filter, setFilter] = useState('all');
  const [tick, setTick]     = useState(0);

  /* ── Build room data from real entries ── */
  const { ROOMS, hasRealData, peakTimes } = useMemo(() => {
    const entries = loadEntries();
    const setup   = loadSetup();

    if (!entries || entries.length === 0) {
      const PEAK_TIMES_DEMO = [
        { time: 'Mon 08:00', rooms: 5 },
        { time: 'Tue 09:00', rooms: 4 },
        { time: 'Wed 10:00', rooms: 7 },
        { time: 'Thu 09:00', rooms: 4 },
        { time: 'Fri 10:00', rooms: 3 },
      ];
      return { ROOMS: DEMO_ROOMS, hasRealData: false, peakTimes: PEAK_TIMES_DEMO };
    }

    const { roomStats } = buildAnalyticsFromEntries(entries, setup || {});
    const totalSlots    = roomStats.length ? roomStats[0].totalSlots : 10;

    const ROOMS = roomStats.map((r, idx) => ({
      id:         idx + 1,
      name:       r.name,
      type:       isLab(r.name) ? 'Computer Lab' : 'Classroom',
      capacity:   60,
      usedSlots:  r.slots,
      totalSlots,
      peak:       entries.find(e => e.room === r.name)
                    ? `${entries.find(e => e.room === r.name).day?.slice(0,3)} ${entries.find(e => e.room === r.name).slotLabel?.split('–')[0]?.trim() || '08:00'}`
                    : '—',
      isLab:      isLab(r.name),
    }));

    /* Build peak usage from day × slot counts */
    const daySlotCount = {};
    for (const e of entries) {
      const key = `${e.day?.slice(0, 3)} ${e.slotLabel?.split('–')[0]?.trim() || '08:00'}`;
      daySlotCount[key] = (daySlotCount[key] || 0) + 1;
    }
    const peakTimes = Object.entries(daySlotCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([time, rooms]) => ({ time, rooms }));

    return { ROOMS, hasRealData: true, peakTimes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const maxPeak = peakTimes.length ? Math.max(...peakTimes.map(p => p.rooms)) : 1;

  const noData   = ROOMS.length === 0;
  const issues   = ROOMS.filter(r => ['overbooked', 'unused', 'invalid'].includes(getRoomStatus(r)));
  const filtered = filter === 'all' ? ROOMS : ROOMS.filter(r => getRoomStatus(r) === filter);

  const classrooms = ROOMS.filter(r => !r.isLab);
  const labs       = ROOMS.filter(r => r.isLab);

  const totalOccupied = ROOMS.filter(r => r.usedSlots > 0).length;
  const totalFree     = ROOMS.filter(r => r.usedSlots === 0).length;
  const overbooked    = ROOMS.filter(r => getRoomStatus(r) === 'overbooked').length;

  const SUMMARY = [
    { label: 'Total Rooms',      value: String(ROOMS.length),  color: 'text-primary dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950'    },
    { label: 'Occupied Rooms',   value: String(totalOccupied), color: 'text-secondary dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-950' },
    { label: 'Free Rooms',       value: String(totalFree),     color: 'text-emerald-500',                    bg: 'bg-emerald-100 dark:bg-emerald-950' },
    { label: 'Overbooked Rooms', value: String(overbooked),    color: 'text-rose-500',                       bg: 'bg-rose-100 dark:bg-rose-950'    },
  ];

  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link to="/analytics" id="res-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold">Resource Utilization</span>
        <div className="ml-auto flex items-center gap-2">
          {hasRealData && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 rounded-full px-3 py-1">
              Live Data
            </span>
          )}
          <button
            id="refresh-resource-utilization"
            onClick={() => setTick(t => t + 1)}
            title="Refresh from timetable entries"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-muted dark:text-slate-400 transition-colors"
          >
            <FaSync className="text-sm" />
          </button>
        </div>
      </header>

      {/* Warning banner if no real data */}
      {!hasRealData && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-5 sm:px-8 py-3 flex items-center gap-3">
          <FaExclamationTriangle className="text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Showing <strong>demo data</strong> — go to{' '}
            <Link to="/ai-scheduling/setup" className="underline font-semibold hover:text-amber-800">
              AI Scheduling Setup
            </Link>{' '}
            and save your setup to see real room analytics.
          </span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">
        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mb-2">
            Resource <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Utilization</span>
          </h1>
          <p className="text-muted dark:text-slate-400 text-lg">Track classroom and lab usage, detect overbooked or unused rooms, and identify peak hours.</p>
        </Reveal>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY.map((s, i) => (
            <Reveal key={s.label} delay={`${i * 60}ms`}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg flex-shrink-0`}><FaDoorOpen /></div>
                <div><div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div><div className="text-xs font-semibold text-muted dark:text-slate-400 mt-0.5">{s.label}</div></div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Warnings */}
        {noData && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-3">
            <FaExclamationTriangle className="text-amber-500 text-xl flex-shrink-0" />
            <div><div className="font-bold text-amber-700 dark:text-amber-300 mb-1">No Resource Data</div><div className="text-sm text-amber-600 dark:text-amber-400">Add rooms to view utilization analytics.</div></div>
          </div>
        )}
        {issues.length > 0 && (
          <Reveal>
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 mb-3"><FaExclamationTriangle /> {issues.length} Room{issues.length > 1 ? 's' : ''} Need Attention</div>
              <div className="space-y-1">
                {issues.map(r => (
                  <div key={r.id} className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <span className="font-semibold">{r.name}:</span>
                    {getRoomStatus(r) === 'overbooked' && 'Overbooked — all slots used, check for conflicts'}
                    {getRoomStatus(r) === 'unused'     && 'Unused room — 0 slots occupied this week'}
                    {getRoomStatus(r) === 'invalid'    && 'Invalid capacity (≤ 0) — update room details'}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Classroom usage chart */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Classroom Usage</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Occupied slots out of total available slots per classroom</p>
            {noData || classrooms.length === 0
              ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No classroom data available</div>
              : <div className="space-y-3">
                  {classrooms.map(r => {
                    const pct = r.totalSlots > 0 ? Math.round((r.usedSlots / r.totalSlots) * 100) : 0;
                    const over = pct >= 100;
                    return (
                      <div key={r.id} className="flex items-center gap-3">
                        <div className="w-20 text-xs font-bold text-muted dark:text-slate-400 flex-shrink-0 truncate">{r.name}</div>
                        <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-10 text-right ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
            }
          </section>
        </Reveal>

        {/* Lab utilization */}
        {labs.length > 0 && (
          <Reveal>
            <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
              <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Lab Utilization</h2>
              <p className="text-sm text-muted dark:text-slate-400 mb-5">Usage rate for computer and physics labs</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {labs.map(r => {
                  const pct  = r.totalSlots > 0 ? Math.round((r.usedSlots / r.totalSlots) * 100) : 0;
                  const st   = getRoomStatus(r);
                  const meta = ROOM_STATUS_META[st];
                  return (
                    <div key={r.id} className="rounded-2xl border border-slate-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-navy dark:text-slate-100">{r.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <div className="text-2xl font-extrabold text-emerald-500 mb-1">{pct}%</div>
                      <p className="text-xs text-muted dark:text-slate-400">{r.type} · Cap: {r.capacity}</p>
                      <p className="text-xs text-muted dark:text-slate-400">Peak: {r.peak}</p>
                      {r.usedSlots === 0 && <div className="mt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1"><FaExclamationTriangle />Unused room this week</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          </Reveal>
        )}

        {/* Peak usage */}
        {peakTimes.length > 0 && (
          <Reveal>
            <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
              <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Peak Usage Analysis</h2>
              <p className="text-sm text-muted dark:text-slate-400 mb-5">Rooms occupied simultaneously by time slot</p>
              <div className="flex items-end gap-4 h-36">
                {peakTimes.map(({ time, rooms }) => (
                  <div key={time} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-emerald-500">{rooms}</span>
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-700 hover:opacity-80"
                      style={{ height: `${(rooms / maxPeak) * 100}%`, minHeight: '8px' }}
                    />
                    <span className="text-[9px] text-center text-muted dark:text-slate-400 font-semibold leading-tight">{time}</span>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Room list */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-extrabold text-navy dark:text-white">All Rooms</h2>
              <div className="flex flex-wrap gap-2">
                {['all', 'overbooked', 'high', 'normal', 'unused'].map(k => (
                  <button key={k} id={`room-filter-${k}`} onClick={() => setFilter(k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-muted dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {filtered.length === 0
              ? <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center text-muted dark:text-slate-400 text-sm">No rooms match this filter.</div>
              : <div className="grid gap-3">
                  {filtered.map(r => {
                    const pct  = r.totalSlots > 0 ? Math.round((r.usedSlots / r.totalSlots) * 100) : 0;
                    const st   = getRoomStatus(r);
                    const meta = ROOM_STATUS_META[st];
                    const over = pct >= 100;
                    return (
                      <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 hover:shadow-lg transition-shadow">
                        <div className="flex flex-wrap items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-sm flex-shrink-0"><FaDoorOpen /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-navy dark:text-slate-100 text-sm">{r.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                              {r.isLab && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Lab</span>}
                            </div>
                            <div className="text-xs text-muted dark:text-slate-400 mt-0.5">{r.type} · Cap: {r.capacity} · Peak: {r.peak}</div>
                          </div>
                          <span className={`text-xs font-bold ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>{r.usedSlots}/{r.totalSlots} slots</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        {r.usedSlots === 0  && <div className="mt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Unused room — consider reassigning or closing</div>}
                        {over               && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Overbooked — all slots occupied, check for conflicts</div>}
                        {r.capacity <= 0    && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Invalid capacity — update room record</div>}
                      </div>
                    );
                  })}
                </div>
            }
          </section>
        </Reveal>
      </main>
      <style>{`.reveal-on-scroll{opacity:0;transform:translateY(24px);transition:opacity .55s ease,transform .55s ease}.reveal-on-scroll.is-visible{opacity:1;transform:translateY(0)}`}</style>
    </div>
  );
}
