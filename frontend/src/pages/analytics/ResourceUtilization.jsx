import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaDoorOpen, FaExclamationTriangle, FaCheckCircle,
  FaTimes, FaTimesCircle, FaInfoCircle,
} from 'react-icons/fa';

/* ── Reveal hook ── */
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

/* ══ TOAST SYSTEM ══ */
const T_STYLE = {
  success: { bar: 'bg-emerald-500', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
  warning: { bar: 'bg-amber-400',   icon: 'text-amber-500',   ring: 'ring-amber-100'   },
  error:   { bar: 'bg-rose-500',    icon: 'text-rose-500',    ring: 'ring-rose-100'    },
  info:    { bar: 'bg-blue-500',    icon: 'text-blue-500',    ring: 'ring-blue-100'    },
};
const T_ICON = {
  success: <FaCheckCircle />,
  warning: <FaExclamationTriangle />,
  error:   <FaTimesCircle />,
  info:    <FaInfoCircle />,
};

function ToastItem({ t, onDismiss }) {
  const [show, setShow] = useState(false);
  const s = T_STYLE[t.type];
  useEffect(() => {
    const a = setTimeout(() => setShow(true), 10);
    const b = setTimeout(() => { setShow(false); setTimeout(() => onDismiss(t.id), 300); }, t.dur || 4000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const close = () => { setShow(false); setTimeout(() => onDismiss(t.id), 300); };
  return (
    <div role="alert"
      className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg ring-1 ${s.ring} px-4 pt-4 pb-3 min-w-[280px] max-w-[340px] overflow-hidden transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />
      <span className={`mt-0.5 flex-shrink-0 text-sm ${s.icon}`}>{T_ICON[t.type]}</span>
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-[10px] font-extrabold text-navy uppercase tracking-wide mb-0.5">{t.title}</p>}
        <p className="text-xs text-slate-600 leading-snug">{t.msg}</p>
      </div>
      <button onClick={close} className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"><FaTimes className="text-xs" /></button>
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.bar} origin-left`} style={{ animation: `ru-shrink ${t.dur || 4000}ms linear forwards` }} />
    </div>
  );
}
function ToastContainer({ list, dismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {list.map(t => <div key={t.id} className="pointer-events-auto"><ToastItem t={t} onDismiss={dismiss} /></div>)}
    </div>
  );
}

let _tid = 0;
function useToast() {
  const [list, setList] = useState([]);
  const dismiss = useCallback(id => setList(p => p.filter(t => t.id !== id)), []);
  const push = useCallback((type, msg, title, dur) => {
    const id = ++_tid;
    setList(p => [...p, { id, type, msg, title, dur }]);
  }, []);
  const toast = {
    success: (m, dur) => push('success', m, 'Success', dur),
    warning: (m, dur) => push('warning', m, 'Warning', dur),
    error:   (m, dur) => push('error',   m, 'Error',   dur),
    info:    (m, dur) => push('info',    m, 'Info',    dur),
  };
  return { list, dismiss, toast };
}

/* ══ DATA ══ */
const ROOMS = [
  { id: 1,  name: 'A101',  type: 'Classroom',    capacity: 60,  usedSlots: 8,  totalSlots: 10, peak: 'Mon 08:00', isLab: false },
  { id: 2,  name: 'A102',  type: 'Classroom',    capacity: 60,  usedSlots: 6,  totalSlots: 10, peak: 'Tue 09:00', isLab: false },
  { id: 3,  name: 'B202',  type: 'Classroom',    capacity: 80,  usedSlots: 4,  totalSlots: 10, peak: 'Mon 10:00', isLab: false },
  { id: 4,  name: 'B201',  type: 'Classroom',    capacity: 80,  usedSlots: 2,  totalSlots: 10, peak: 'Tue 11:00', isLab: false },
  { id: 5,  name: 'C301',  type: 'Classroom',    capacity: 50,  usedSlots: 4,  totalSlots: 10, peak: 'Mon 13:00', isLab: false },
  { id: 6,  name: 'D101',  type: 'Classroom',    capacity: 70,  usedSlots: 10, totalSlots: 10, peak: 'Wed 12:00', isLab: false },
  { id: 7,  name: 'E201',  type: 'Classroom',    capacity: 60,  usedSlots: 2,  totalSlots: 10, peak: 'Thu 09:00', isLab: false },
  { id: 8,  name: 'LAB-1', type: 'Computer Lab', capacity: 40,  usedSlots: 9,  totalSlots: 10, peak: 'Wed 10:00', isLab: true  },
  { id: 9,  name: 'LAB-2', type: 'Computer Lab', capacity: 40,  usedSlots: 5,  totalSlots: 10, peak: 'Thu 14:00', isLab: true  },
  { id: 10, name: 'LAB-3', type: 'Physics Lab',  capacity: 30,  usedSlots: 0,  totalSlots: 10, peak: '—',         isLab: true  },
  { id: 11, name: 'F101',  type: 'Seminar Hall', capacity: 120, usedSlots: 1,  totalSlots: 10, peak: 'Fri 10:00', isLab: false },
];

const PEAK_TIMES = [
  { time: 'Mon 08:00', rooms: 5 },
  { time: 'Tue 09:00', rooms: 4 },
  { time: 'Wed 10:00', rooms: 7 },
  { time: 'Thu 09:00', rooms: 4 },
  { time: 'Fri 10:00', rooms: 3 },
];
const maxPeak = Math.max(...PEAK_TIMES.map(p => p.rooms));

/* ── helpers ── */
function getRoomStatus(r) {
  const pct = (r.usedSlots / r.totalSlots) * 100;
  if (r.capacity <= 0)   return 'invalid';
  if (r.usedSlots === 0) return 'unused';
  if (pct >= 100)        return 'overbooked';
  if (pct >= 70)         return 'high';
  return 'normal';
}

const ROOM_STATUS_META = {
  overbooked: { label: 'Overbooked', cls: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
  high:       { label: 'High Usage', cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  unused:     { label: 'Unused',     cls: 'bg-slate-100 dark:bg-slate-700 text-muted dark:text-slate-400 border border-slate-200 dark:border-slate-600' },
  normal:     { label: 'Normal',     cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
  invalid:    { label: 'Invalid',    cls: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
};

/* ── VALIDATION ── */
function validateRooms(rooms) {
  const errors = [], warnings = [];

  if (!rooms || rooms.length === 0) {
    errors.push('No room data available');
    return { errors, warnings };
  }

  // missing timetable check — rooms with no slots defined
  const noSlots = rooms.filter(r => !r.totalSlots || r.totalSlots <= 0);
  if (noSlots.length) errors.push(`Timetable data missing for: ${noSlots.map(r => r.name).join(', ')}`);

  // invalid capacity
  const invalidCap = rooms.filter(r => !r.capacity || r.capacity <= 0);
  if (invalidCap.length) errors.push(`Invalid room capacity for: ${invalidCap.map(r => r.name).join(', ')}`);

  // missing room name
  const noName = rooms.filter(r => !r.name || !r.name.trim());
  if (noName.length) errors.push('Room name is required for all rooms');

  // missing room type
  const noType = rooms.filter(r => !r.type || !r.type.trim());
  if (noType.length) errors.push('Room type must be selected for all rooms');

  // duplicate room names
  const names = rooms.map(r => r.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) errors.push(`Duplicate room assignment detected: ${[...new Set(dupes)].join(', ')}`);

  // overbooked
  const overbooked = rooms.filter(r => getRoomStatus(r) === 'overbooked');
  overbooked.forEach(r => warnings.push({ msg: `Room ${r.name} already booked for selected time — all ${r.totalSlots} slots occupied`, type: 'overbooked', room: r.name }));

  // unused
  const unused = rooms.filter(r => getRoomStatus(r) === 'unused');
  if (unused.length) warnings.push({ msg: `Unused classrooms detected: ${unused.map(r => r.name).join(', ')}`, type: 'unused' });

  // underutilized (< 30%)
  const under = rooms.filter(r => {
    const pct = (r.usedSlots / r.totalSlots) * 100;
    return pct > 0 && pct < 30;
  });
  if (under.length) warnings.push({ msg: `Underutilized rooms identified: ${under.map(r => r.name).join(', ')} (< 30% usage)`, type: 'under' });

  // near full (>= 80% but < 100%)
  const nearFull = rooms.filter(r => {
    const pct = (r.usedSlots / r.totalSlots) * 100;
    return pct >= 80 && pct < 100;
  });
  if (nearFull.length) warnings.push({ msg: `Room nearing full capacity: ${nearFull.map(r => r.name).join(', ')}`, type: 'nearfull' });

  // peak usage
  const peakSlot = PEAK_TIMES.reduce((a, b) => a.rooms > b.rooms ? a : b);
  warnings.push({ msg: `Peak usage time identified: ${peakSlot.time} with ${peakSlot.rooms} rooms occupied simultaneously`, type: 'peak' });

  return { errors, warnings };
}

const SUMMARY = [
  { label: 'Total Rooms',      value: String(ROOMS.length),                                       color: 'text-primary dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950'    },
  { label: 'Occupied Now',     value: String(ROOMS.filter(r => r.usedSlots > 0).length),          color: 'text-secondary dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-950' },
  { label: 'Free Rooms',       value: String(ROOMS.filter(r => r.usedSlots === 0).length),        color: 'text-emerald-500',                    bg: 'bg-emerald-100 dark:bg-emerald-950' },
  { label: 'Overbooked Rooms', value: String(ROOMS.filter(r => getRoomStatus(r) === 'overbooked').length), color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-950' },
];

/* ══ MAIN ══ */
export default function ResourceUtilization() {
  const [filter, setFilter]           = useState('all');
  const [dataLoaded, setDataLoaded]   = useState(false);
  const [utilGenerated, setUtilGenerated] = useState(false);
  const { list, dismiss, toast }      = useToast();

  const noData   = ROOMS.length === 0;
  const issues   = ROOMS.filter(r => ['overbooked', 'unused', 'invalid'].includes(getRoomStatus(r)));
  const filtered = filter === 'all' ? ROOMS : ROOMS.filter(r => getRoomStatus(r) === filter);
  const classrooms = ROOMS.filter(r => !r.isLab);
  const labs       = ROOMS.filter(r => r.isLab);

  /* ── on-mount validations ── */
  useEffect(() => {
    toast.info('Calculating resource utilization...', 2500);

    const t1 = setTimeout(() => {
      const { errors, warnings } = validateRooms(ROOMS);

      if (errors.length) {
        errors.forEach(e => toast.error(e, 5500));
        return;
      }

      toast.success('Utilization data loaded', 3500);
      setDataLoaded(true);

      const t2 = setTimeout(() => {
        toast.info('Checking room availability...', 2500);

        const t3 = setTimeout(() => {
          toast.info('Analyzing peak usage...', 2500);

          const t4 = setTimeout(() => {
            warnings.forEach((w, idx) => {
              setTimeout(() => {
                if (w.type === 'overbooked')  toast.warning(`Room already booked for selected time — ${w.room} is fully booked`, 5000);
                else if (w.type === 'unused') toast.warning('Unused classrooms detected — consider reassigning', 5000);
                else if (w.type === 'under')  toast.warning('Underutilized rooms identified — review scheduling', 5000);
                else if (w.type === 'nearfull') toast.warning('Room nearing full capacity — plan for overflow', 5000);
                else if (w.type === 'peak')   toast.warning(w.msg, 5000);
              }, idx * 700);
            });
          }, 800);

          return () => clearTimeout(t4);
        }, 900);

        return () => clearTimeout(t3);
      }, 500);

      return () => clearTimeout(t2);
    }, 1200);

    return () => clearTimeout(t1);
  }, []);

  /* ── generate utilization ── */
  const handleGenerate = () => {
    if (!dataLoaded) { toast.error('Timetable data missing — cannot generate utilization report', 5000); return; }
    toast.info('Calculating resource utilization...', 2000);
    setTimeout(() => {
      const { errors } = validateRooms(ROOMS);
      if (errors.length) { errors.forEach(e => toast.error(e, 5000)); return; }
      setUtilGenerated(true);
      toast.success('Resource utilization calculated successfully', 4000);
    }, 2000);
  };

  /* ── filter with contextual toasts ── */
  const handleFilter = (k) => {
    setFilter(k);
    if (k === 'overbooked') toast.warning('Overbooked rooms highlighted — all slots occupied, check for conflicts', 4500);
    if (k === 'unused')     toast.warning('Unused classrooms detected — consider reassigning or closing', 4500);
    if (k === 'high')       toast.warning('Room nearing full capacity — plan for potential overflow', 4000);
  };

  /* ── room card highlight class ── */
  const roomCardCls = (r) => {
    const base = 'bg-white dark:bg-slate-800 rounded-2xl border shadow-md p-5 hover:shadow-lg transition-shadow';
    const st = getRoomStatus(r);
    if (st === 'overbooked') return `${base} border-rose-300 dark:border-rose-700 ring-1 ring-rose-200 dark:ring-rose-900`;
    if (st === 'unused')     return `${base} border-amber-200 dark:border-amber-700`;
    if (st === 'high')       return `${base} border-amber-100 dark:border-amber-800`;
    return `${base} border-slate-100 dark:border-slate-700`;
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">

      {/* toasts */}
      <ToastContainer list={list} dismiss={dismiss} />

      {/* header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="res-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold">Resource Utilization</span>
        <div className="ml-auto">
          <button
            id="btn-generate-util"
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
          >
            <FaCheckCircle className="text-[10px]" /> Generate Utilization
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* page heading */}
        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mb-2">
            Resource <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Utilization</span>
          </h1>
          <p className="text-muted dark:text-slate-400 text-lg">Track classroom and lab usage, detect overbooked or unused rooms, and identify peak hours.</p>
        </Reveal>

        {/* inline banners */}
        {!dataLoaded && !noData && (
          <div id="loading-banner" className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4 text-sm text-blue-700 dark:text-blue-300 font-semibold">
            <FaInfoCircle className="text-blue-500 flex-shrink-0" />
            Loading room data… Charts will be enabled once data is verified.
          </div>
        )}
        {utilGenerated && (
          <div id="util-success-banner" className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-4 text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
            <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
            Resource utilization calculated successfully — data is up to date.
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY.map((s, i) => (
            <Reveal key={s.label} delay={`${i * 60}ms`}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg flex-shrink-0`}><FaDoorOpen /></div>
                <div>
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-muted dark:text-slate-400 mt-0.5">{s.label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* No-data warning */}
        {noData && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-3">
            <FaExclamationTriangle className="text-amber-500 text-xl flex-shrink-0" />
            <div>
              <div className="font-bold text-amber-700 dark:text-amber-300 mb-1">No Resource Data</div>
              <div className="text-sm text-amber-600 dark:text-amber-400">Add rooms to view utilization analytics.</div>
            </div>
          </div>
        )}

        {/* Issues banner */}
        {issues.length > 0 && (
          <Reveal>
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 mb-3">
                <FaExclamationTriangle /> {issues.length} Room{issues.length > 1 ? 's' : ''} Need Attention
              </div>
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
            <div className={`relative ${!dataLoaded ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              {!dataLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">Chart disabled — waiting for data verification</span>
                </div>
              )}
              {noData
                ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No data available</div>
                : <div className="space-y-3">
                    {classrooms.map(r => {
                      const pct = Math.round((r.usedSlots / r.totalSlots) * 100);
                      const over = pct >= 100;
                      return (
                        <div key={r.id} className="flex items-center gap-3">
                          <div className="w-14 text-xs font-bold text-muted dark:text-slate-400 flex-shrink-0">{r.name}</div>
                          <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-10 text-right ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>
          </section>
        </Reveal>

        {/* Lab utilization */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Lab Utilization</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Usage rate for computer and physics labs</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {labs.map(r => {
                const pct = Math.round((r.usedSlots / r.totalSlots) * 100);
                const st  = getRoomStatus(r); const meta = ROOM_STATUS_META[st];
                return (
                  <div key={r.id} className={`rounded-2xl border p-4 hover:shadow-md transition-shadow ${st === 'overbooked' ? 'border-rose-200 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/10' : st === 'unused' ? 'border-amber-200 dark:border-amber-700' : 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-navy dark:text-slate-100">{r.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <div className={`text-2xl font-extrabold mb-1 ${st === 'overbooked' ? 'text-rose-500' : st === 'unused' ? 'text-amber-500' : 'text-emerald-500'}`}>{pct}%</div>
                    <p className="text-xs text-muted dark:text-slate-400">{r.type} · Cap: {r.capacity}</p>
                    <p className="text-xs text-muted dark:text-slate-400">Peak: {r.peak}</p>
                    {r.usedSlots === 0 && <div className="mt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1"><FaExclamationTriangle />Unused room this week</div>}
                    {st === 'overbooked' && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1"><FaExclamationTriangle />Room already fully booked</div>}
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>

        {/* Peak usage chart */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Peak Usage Analysis</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Rooms occupied simultaneously by time slot</p>
            <div className={`relative ${!dataLoaded ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              {!dataLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">Chart disabled — waiting for data</span>
                </div>
              )}
              <div className="flex items-end gap-4 h-36">
                {PEAK_TIMES.map(({ time, rooms }) => (
                  <div key={time} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-emerald-500">{rooms}</span>
                    <div className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-700 hover:opacity-80" style={{ height: `${(rooms / maxPeak) * 100}%`, minHeight: '8px' }} />
                    <span className="text-[9px] text-center text-muted dark:text-slate-400 font-semibold leading-tight">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* All Rooms list */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-extrabold text-navy dark:text-white">All Rooms</h2>
              <div className="flex flex-wrap gap-2">
                {['all', 'overbooked', 'high', 'normal', 'unused'].map(k => (
                  <button key={k} id={`room-filter-${k}`} onClick={() => handleFilter(k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-muted dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}`}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0
              ? <div id="no-room-data" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center text-muted dark:text-slate-400 text-sm">No rooms match this filter.</div>
              : <div className="grid gap-3">
                  {filtered.map(r => {
                    const pct = Math.round((r.usedSlots / r.totalSlots) * 100);
                    const st  = getRoomStatus(r); const meta = ROOM_STATUS_META[st];
                    const over = pct >= 100;
                    return (
                      <div key={r.id} id={`room-card-${r.id}`} className={roomCardCls(r)}>
                        <div className="flex flex-wrap items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm flex-shrink-0 ${st === 'overbooked' ? 'bg-gradient-to-br from-rose-500 to-rose-400' : st === 'unused' ? 'bg-gradient-to-br from-amber-400 to-amber-500' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}><FaDoorOpen /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-navy dark:text-slate-100 text-sm">{r.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                              {r.isLab && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Lab</span>}
                              {pct >= 80 && pct < 100 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Near Capacity</span>}
                            </div>
                            <div className="text-xs text-muted dark:text-slate-400 mt-0.5">{r.type} · Cap: {r.capacity} · Peak: {r.peak}</div>
                          </div>
                          <span className={`text-xs font-bold ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>{r.usedSlots}/{r.totalSlots} slots</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        {r.usedSlots === 0 && <div className="mt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Unused room — consider reassigning or closing</div>}
                        {over && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Overbooked — all slots occupied, check for conflicts</div>}
                        {r.capacity <= 0 && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Invalid capacity — update room record</div>}
                        {pct >= 80 && pct < 100 && <div className="mt-2 text-[11px] text-amber-600 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Room nearing full capacity — plan for overflow</div>}
                      </div>
                    );
                  })}
                </div>
            }
          </section>
        </Reveal>
      </main>

      <style>{`
        .reveal-on-scroll { opacity:0; transform:translateY(24px); transition:opacity .55s ease,transform .55s ease; }
        .reveal-on-scroll.is-visible { opacity:1; transform:translateY(0); }
        @keyframes ru-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
      `}</style>
    </div>
  );
}
