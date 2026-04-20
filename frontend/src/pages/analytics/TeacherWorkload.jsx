import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaLightbulb,
  FaUserTie, FaClock, FaPlus, FaEdit, FaTrash, FaTimes,
  FaTimesCircle, FaInfoCircle, FaSave, FaSync, FaSpinner,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import {
  fetchLecturers, fetchTimetables, calcLecturerWorkload,
  createLecturer, updateLecturer, deleteLecturer,
  normalizeArray,
} from '../../services/analyticsService';

/* ── reveal ── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, delay = '0ms' }) {
  const ref = useReveal();
  return <div ref={ref} className="reveal-on-scroll" style={{ transitionDelay: delay }}>{children}</div>;
}

/* ── toast ── */
const T_STYLE = {
  success: { bar: 'bg-emerald-500', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
  warning: { bar: 'bg-amber-400',   icon: 'text-amber-500',   ring: 'ring-amber-100'   },
  error:   { bar: 'bg-rose-500',    icon: 'text-rose-500',    ring: 'ring-rose-100'    },
  info:    { bar: 'bg-blue-500',    icon: 'text-blue-500',    ring: 'ring-blue-100'    },
};
const T_ICON = {
  success: <FaCheckCircle />, warning: <FaExclamationTriangle />,
  error: <FaTimesCircle />,   info: <FaInfoCircle />,
};
function Toast({ t, onDismiss }) {
  const [show, setShow] = useState(false);
  const s = T_STYLE[t.type];
  useEffect(() => {
    const a = setTimeout(() => setShow(true), 10);
    const b = setTimeout(() => { setShow(false); setTimeout(() => onDismiss(t.id), 300); }, t.dur || 4000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const close = () => { setShow(false); setTimeout(() => onDismiss(t.id), 300); };
  return (
    <div className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg ring-1 ${s.ring} px-4 pt-4 pb-3 min-w-[280px] max-w-[340px] overflow-hidden transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} role="alert">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />
      <span className={`mt-0.5 flex-shrink-0 ${s.icon}`}>{T_ICON[t.type]}</span>
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-[10px] font-extrabold text-navy uppercase tracking-wide mb-0.5">{t.title}</p>}
        <p className="text-xs text-slate-600 leading-snug">{t.msg}</p>
      </div>
      <button onClick={close} className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"><FaTimes className="text-xs" /></button>
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.bar} origin-left`} style={{ animation: `tw-shrink ${t.dur || 4000}ms linear forwards` }} />
    </div>
  );
}
function Toasts({ list, dismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {list.map(t => <div key={t.id} className="pointer-events-auto"><Toast t={t} onDismiss={dismiss} /></div>)}
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
  return {
    list, dismiss,
    toast: {
      success: (m, t, d) => push('success', m, t || 'Success', d),
      warning: (m, t, d) => push('warning', m, t || 'Warning', d),
      error:   (m, t, d) => push('error',   m, t || 'Error',   d),
      info:    (m, t, d) => push('info',    m, t || 'Info',    d),
    },
  };
}

/* ── constants ── */
const DEPT_OPTIONS = [
  'Information Technology','Computer Science',
  'Computer System Engineering','Computer System Networks',
];

const STATUS_META = {
  overloaded:  { label: 'Overloaded',  cls: 'bg-rose-100 text-rose-600 border border-rose-200' },
  optimal:     { label: 'Optimal',     cls: 'bg-emerald-100 text-emerald-600 border border-emerald-200' },
  underloaded: { label: 'Under-load',  cls: 'bg-amber-100 text-amber-600 border border-amber-200' },
};

const CHART_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#fb7185', '#3b82f6',
];

function getBarColor(status, index) {
  if (status === 'overloaded')  return '#ef4444';
  if (status === 'underloaded') return '#f59e0b';
  return CHART_COLORS[index % CHART_COLORS.length];
}

function getAvatarGradient(status, index) {
  if (status === 'overloaded')  return 'from-rose-500 to-rose-400';
  if (status === 'underloaded') return 'from-amber-400 to-amber-500';
  const GRADIENTS = [
    'from-indigo-500 to-violet-600',
    'from-sky-500 to-cyan-400',
    'from-emerald-500 to-teal-600',
    'from-pink-500 to-rose-400',
    'from-violet-500 to-purple-600',
    'from-teal-500 to-emerald-400',
    'from-orange-500 to-amber-400',
    'from-cyan-500 to-blue-400',
  ];
  return GRADIENTS[index % GRADIENTS.length];
}

function HoursBar({ hours, max }) {
  const over = hours > max;
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />
        <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-primary to-accent'}`} style={{ width: `${Math.min((hours / max) * 100, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold w-14 text-right ${over ? 'text-rose-500' : 'text-muted'}`}>{hours}h / {max}h</span>
    </div>
  );
}

const EMPTY_FORM = { name: '', department: '', subjects: '', maxWeeklyHours: '20' };

/* ── Loading skeleton ── */
function LoadingCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full" />
    </div>
  );
}

/* ── main ── */
export default function LecturerWorkload() {
  const [lecturers, setLecturers] = useState([]);
  const [workload,  setWorkload]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [isDemo,    setIsDemo]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [filter,    setFilter]    = useState('all');
  const [view,      setView]      = useState('cards');
  const [modal,     setModal]     = useState(null);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [delId,     setDelId]     = useState(null);
  const { list, dismiss, toast } = useToast();
  const firstErrRef = useRef(null);

  /* ── Load real data from backend ── */
  const loadData = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const [lecs, tts] = await Promise.all([
        fetchLecturers().catch(e => { console.error('[LecturerWorkload] fetchLecturers:', e.message); return []; }),
        fetchTimetables().catch(e => { console.error('[LecturerWorkload] fetchTimetables:', e.message); return []; }),
      ]);
      const lecsArr = normalizeArray(lecs);
      const ttsArr  = normalizeArray(tts);
      setLecturers(lecsArr);
      setWorkload(calcLecturerWorkload(lecsArr, ttsArr));
      if (showToast) toast.success('Data synced from backend', 'Synced');
    } catch (err) {
      console.error('[LecturerWorkload] loadData error:', err.message);
      toast.error(`Failed to load data: ${err.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Demo-data fallback (presentation only) ─────────────────────────────
   * Fires ONLY after loading completes and real backend returned nothing.
   * If backend later returns real data, isDemo resets to false automatically.
   * ──────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (loading) return;           // wait for real fetch to finish
    if (workload.length > 0) {     // real data arrived → clear demo flag
      setIsDemo(false);
      return;
    }
    // No real workload data — inject realistic presentation data
    setIsDemo(true);
    setWorkload([
      { lecturerId: 'd1', lecturerName: 'Dr. Nimal',    totalHours:  7, totalMinutes:  420, totalClasses: 5,  maxWeeklyHours: 20, department: 'Computer Science',            status: 'underloaded' },
      { lecturerId: 'd2', lecturerName: 'Jana',         totalHours: 11, totalMinutes:  660, totalClasses: 8,  maxWeeklyHours: 20, department: 'Information Technology',       status: 'optimal'     },
      { lecturerId: 'd3', lecturerName: 'Jaysooriya',   totalHours: 14, totalMinutes:  840, totalClasses: 10, maxWeeklyHours: 20, department: 'Computer System Engineering',  status: 'optimal'     },
      { lecturerId: 'd4', lecturerName: 'Perera',       totalHours: 17, totalMinutes: 1020, totalClasses: 12, maxWeeklyHours: 20, department: 'Computer System Networks',     status: 'optimal'     },
      { lecturerId: 'd5', lecturerName: 'Thilani',      totalHours: 22, totalMinutes: 1320, totalClasses: 16, maxWeeklyHours: 20, department: 'Information Technology',       status: 'overloaded'  },
    ]);
    if (lecturers.length === 0) {
      setLecturers([
        { _id: 'd1', name: 'Dr. Nimal',  department: 'Computer Science',           maxWeeklyHours: 20 },
        { _id: 'd2', name: 'Jana',        department: 'Information Technology',      maxWeeklyHours: 20 },
        { _id: 'd3', name: 'Jaysooriya', department: 'Computer System Engineering', maxWeeklyHours: 20 },
        { _id: 'd4', name: 'Perera',     department: 'Computer System Networks',    maxWeeklyHours: 20 },
        { _id: 'd5', name: 'Thilani',    department: 'Information Technology',      maxWeeklyHours: 20 },
      ]);
    }
  }, [loading, workload.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── computed ── */
  const withStatus  = workload;
  const filtered    = filter === 'all' ? withStatus : withStatus.filter(l => l.status === filter);
  const overCount   = withStatus.filter(l => l.status === 'overloaded').length;
  const underCount  = withStatus.filter(l => l.status === 'underloaded').length;
  const avgHours    = workload.length
    ? (workload.reduce((a, l) => a + l.totalHours, 0) / workload.length).toFixed(1)
    : '0';

  const STATS = [
    { label: 'Total Faculty',      value: lecturers.length, icon: <FaUserTie />,             color: 'text-primary',   bg: 'bg-blue-100'    },
    { label: 'Avg Weekly Hours',   value: `${avgHours}h`,   icon: <FaClock />,               color: 'text-indigo-500',bg: 'bg-indigo-100'  },
    { label: 'Overloaded Faculty', value: overCount,        icon: <FaExclamationTriangle />,  color: 'text-rose-500',  bg: 'bg-rose-100'    },
    { label: 'Optimal Load',       value: withStatus.filter(l=>l.status==='optimal').length, icon: <FaCheckCircle />, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  ];

  /* ── validation ── */
  function validate(f, currentId = null) {
    const e = {};
    if (!f.name.trim())           e.name           = 'Lecturer name is required';
    if (!f.department)            e.department     = 'Department is required';
    if (!f.maxWeeklyHours || Number(f.maxWeeklyHours) <= 0) e.maxWeeklyHours = 'Max weekly hours must be > 0';
    const dup = lecturers.find(l =>
      String(l._id) !== String(currentId) &&
      (l.name || '').trim().toLowerCase() === f.name.trim().toLowerCase()
    );
    if (dup) e.name = 'A lecturer with this name already exists';
    return e;
  }

  const formReady = form.name.trim() && form.department && form.maxWeeklyHours && Number(form.maxWeeklyHours) > 0;
  const clearErr = (key) => setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });

  function openAdd() {
    setForm(EMPTY_FORM); setErrors({}); setEditId(null); setModal('add');
  }
  function openEdit(l) {
    setForm({
      name:           l.lecturerName || l.name || '',
      department:     l.department   || '',
      subjects:       '',
      maxWeeklyHours: String(l.maxWeeklyHours || 20),
    });
    setErrors({});
    setEditId(l.lecturerId || l._id || '');
    setModal('edit');
  }

  /* ── CREATE — calls backend API ── */
  async function handleCreate() {
    const e = validate(form);
    if (Object.keys(e).length) {
      setErrors(e);
      setTimeout(() => firstErrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:           form.name.trim(),
        department:     form.department,
        subjects:       form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : [],
        maxWeeklyHours: Number(form.maxWeeklyHours),
      };
      await createLecturer(payload);
      setModal(null);
      toast.success(`${form.name.trim()} added successfully`, 'Success');
      await loadData();
    } catch (err) {
      console.error('[LecturerWorkload] createLecturer error:', err.message);
      toast.error(`Failed to add lecturer: ${err.message}`, 'Error');
    } finally {
      setSaving(false);
    }
  }

  /* ── UPDATE — calls backend API ── */
  async function handleUpdate() {
    const e = validate(form, editId);
    if (Object.keys(e).length) {
      setErrors(e);
      setTimeout(() => firstErrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:           form.name.trim(),
        department:     form.department,
        maxWeeklyHours: Number(form.maxWeeklyHours),
      };
      await updateLecturer(editId, payload);
      setModal(null);
      toast.success('Lecturer updated successfully', 'Success');
      await loadData();
    } catch (err) {
      console.error('[LecturerWorkload] updateLecturer error:', err.message);
      toast.error(`Failed to update lecturer: ${err.message}`, 'Error');
    } finally {
      setSaving(false);
    }
  }

  /* ── DELETE — calls backend API ── */
  async function handleDelete() {
    setSaving(true);
    try {
      await deleteLecturer(delId);
      setDelId(null);
      toast.success('Lecturer deleted successfully', 'Success');
      await loadData();
    } catch (err) {
      console.error('[LecturerWorkload] deleteLecturer error:', err.message);
      toast.error(`Failed to delete lecturer: ${err.message}`, 'Error');
      setDelId(null);
    } finally {
      setSaving(false);
    }
  }

  function changeFilter(k) {
    setFilter(k);
    if (k === 'overloaded'  && overCount  > 0) toast.warning(`${overCount} overloaded lecturer(s)`, 'Warning');
    if (k === 'underloaded' && underCount > 0) toast.warning(`${underCount} under-loaded lecturer(s)`, 'Warning');
  }

  /* ── AI suggestions ── */
  const suggestions = (() => {
    const out = [];
    withStatus.filter(l => l.status === 'overloaded').forEach(l => {
      out.push({
        icon: <FaExclamationTriangle />, color: 'from-rose-500 to-rose-400', bg: 'bg-rose-50 border-rose-100',
        title: `${l.lecturerName} is overloaded`,
        desc: `${l.totalHours}h assigned — ${(l.totalHours - l.maxWeeklyHours).toFixed(1)}h above limit. Consider redistributing subjects.`,
      });
    });
    withStatus.filter(l => l.status === 'underloaded').forEach(l => {
      out.push({
        icon: <FaLightbulb />, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 border-amber-100',
        title: `${l.lecturerName} has spare capacity`,
        desc: `Only ${l.totalHours}h assigned out of ${l.maxWeeklyHours}h. Consider assigning additional subjects.`,
      });
    });
    if (!out.length) out.push({
      icon: <FaCheckCircle />, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 border-emerald-100',
      title: 'All faculty loads are balanced',
      desc: 'No over/under-load detected. Great timetable planning!',
    });
    return out;
  })();

  const cardCls = (status) => {
    const base = 'bg-white rounded-2xl border shadow-md p-5 hover:shadow-lg transition-shadow';
    if (status === 'overloaded')  return `${base} border-rose-300 ring-1 ring-rose-200`;
    if (status === 'underloaded') return `${base} border-amber-200`;
    return `${base} border-slate-100`;
  };

  /* ── render ── */
  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">
      <Toasts list={list} dismiss={dismiss} />

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-4 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="back-to-analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold">Lecturer Workload Analytics</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
            <button onClick={() => setView('cards')} className={`px-3 py-1.5 transition-colors ${view==='cards'?'bg-primary text-white':'bg-white text-muted hover:bg-slate-50'}`}>Cards</button>
            <button onClick={() => setView('table')} className={`px-3 py-1.5 transition-colors ${view==='table'?'bg-primary text-white':'bg-white text-muted hover:bg-slate-50'}`}>Table</button>
          </div>
          <button id="btn-sync" onClick={() => loadData(true)} title="Refresh" className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 text-muted hover:bg-slate-200 transition-all" disabled={loading}>
            {loading ? <FaSpinner className="animate-spin-slow text-[10px]" /> : <FaSync className="text-[10px]" />} Sync
          </button>
          <button id="btn-add-lecturer" onClick={openAdd} className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-sm">
            <FaPlus className="text-[10px]" /> Add Lecturer
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-12">

        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Lecturer Workload{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Analytics</span>
          </h1>
          <p className="mt-2 text-muted text-lg flex items-center gap-2">
            Monitor teaching hours and identify overloaded faculty. Rebalance workloads with ease.
            {isDemo && (
              <span className="inline-block text-[11px] font-semibold text-slate-400 opacity-60 border border-slate-200 rounded-full px-2 py-0.5 ml-1">
                Sample Data · Demo
              </span>
            )}
          </p>
        </Reveal>

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={`${i * 60}ms`}>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg flex-shrink-0`}>{s.icon}</div>
                <div>
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-muted mt-0.5">{s.label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* filter pills + list */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-extrabold">Teaching Hours per Faculty</h2>
                <p className="text-sm text-muted mt-0.5">
                {loading
                  ? 'Loading from backend…'
                  : isDemo
                    ? <span className="text-amber-500 font-medium">Demo data shown — no backend data available</span>
                    : `${workload.length} lecturer(s) — live data from backend`
                }
              </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { k:'all',        l:'All',       c: withStatus.length },
                  { k:'overloaded', l:'Overloaded', c: overCount },
                  { k:'optimal',    l:'Optimal',    c: withStatus.filter(l=>l.status==='optimal').length },
                  { k:'underloaded',l:'Under-load', c: underCount },
                ].map(f => (
                  <button key={f.k} id={`filter-${f.k}`} onClick={() => changeFilter(f.k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter===f.k?'bg-primary text-white border-primary shadow-md':'bg-white text-muted border-slate-200 hover:border-primary'}`}>
                    {f.l} ({f.c})
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1,2,3].map(i => <LoadingCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">
                {workload.length === 0
                  ? 'No lecturers found in the database. Add some using the "Add Lecturer" button.'
                  : 'No lecturers match this filter.'}
              </div>
            ) : view === 'cards' ? (
              <div className="grid gap-4">
                {filtered.map((l, i) => {
                  const meta = STATUS_META[l.status];
                  return (
                    <div key={l.lecturerId || i} id={`lc-${l.lecturerId}`} className={cardCls(l.status)}>
                      <div className="flex flex-wrap items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-bold flex-shrink-0 bg-gradient-to-br ${getAvatarGradient(l.status, i)}`}>
                          {(l.lecturerName || '').split(' ').map(w=>w[0]).slice(0,2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm">{l.lecturerName}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                          </div>
                          <div className="text-xs text-muted mt-0.5">{l.department}</div>
                        </div>
                        {l.status === 'overloaded' && (
                          <div className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1">
                            <FaExclamationTriangle className="text-[10px]" />+{(l.totalHours - l.maxWeeklyHours).toFixed(1)}h over
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <button id={`edit-${l.lecturerId}`} onClick={() => openEdit(l)} className="w-8 h-8 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit"><FaEdit className="text-xs" /></button>
                          <button id={`del-${l.lecturerId}`}  onClick={() => setDelId(l.lecturerId || l._id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title="Delete"><FaTrash className="text-xs" /></button>
                        </div>
                      </div>
                      <HoursBar hours={l.totalHours} max={l.maxWeeklyHours} />
                    </div>
                  );
                })}
              </div>
            ) : (
              /* table view */
              <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Lecturer','Department','Hours','Max Hrs','Status','Actions'].map(h => (
                          <th key={h} className="text-left text-[10px] font-extrabold uppercase tracking-widest text-muted px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((l, i) => {
                        const meta = STATUS_META[l.status];
                        return (
                          <tr key={l.lecturerId || i} className={`hover:bg-slate-50 transition-colors ${l.status==='overloaded'?'bg-rose-50/30':l.status==='underloaded'?'bg-amber-50/30':''}`}>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{l.lecturerName}</td>
                            <td className="px-4 py-3 text-xs text-muted">{l.department}</td>
                            <td className="px-4 py-3"><span className={`text-xs font-bold ${l.totalHours>l.maxWeeklyHours?'text-rose-500':'text-emerald-600'}`}>{l.totalHours}h</span></td>
                            <td className="px-4 py-3 text-xs text-muted">{l.maxWeeklyHours}h</td>
                            <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => openEdit(l)} className="w-7 h-7 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center transition-colors"><FaEdit className="text-[10px]" /></button>
                                <button onClick={() => setDelId(l.lecturerId || l._id)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"><FaTrash className="text-[10px]" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </Reveal>

        {/* weekly bar chart */}
        {workload.length > 0 && (
          <Reveal>
            <section className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
              <h2 className="text-xl font-extrabold mb-1">Weekly Workload Comparison</h2>
              <p className="text-sm text-muted mb-6">Teaching hours vs max weekly limit</p>
              <div className="flex items-end gap-2 h-44 overflow-x-auto">
                {withStatus.map((l, i) => (
                  <div key={l.lecturerId || i} className="flex-1 min-w-[52px] flex flex-col items-center gap-1">
                    <div className="w-full flex items-end h-36">
                      <div
                        className="w-full rounded-t-md transition-all duration-700 hover:opacity-80"
                        style={{
                          height: `${Math.min(((l.totalHours) / (l.maxWeeklyHours * 1.4)) * 100, 100)}%`,
                          minHeight: '4px',
                          backgroundColor: getBarColor(l.status, i),
                        }}
                        title={`${l.lecturerName}: ${l.totalHours}h`}
                      />
                    </div>
                    <span className="text-[8px] font-semibold text-muted text-center leading-tight">{(l.lecturerName || '').split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* overloaded alerts */}
        {overCount > 0 && (
          <Reveal>
            <section>
              <h2 className="text-xl font-extrabold mb-4"><FaExclamationTriangle className="inline text-rose-500 mr-2" />Overloaded Lecturer Alerts</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {withStatus.filter(l=>l.status==='overloaded').map((l,i) => (
                  <Reveal key={l.lecturerId || i} delay={`${i*80}ms`}>
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-400 text-white flex items-center justify-center text-sm font-bold">{(l.lecturerName || '').split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
                        <div><div className="font-bold text-sm">{l.lecturerName}</div><div className="text-xs text-muted">{l.department}</div></div>
                      </div>
                      <div className="text-sm text-rose-700 font-semibold mb-1">⚠ {l.totalHours}h — {(l.totalHours-l.maxWeeklyHours).toFixed(1)}h above limit</div>
                      <div className="mt-2 text-[11px] font-bold text-rose-500 bg-rose-100 border border-rose-200 rounded-lg px-3 py-1.5 inline-block">Action Required: Reassign or reduce load</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* AI suggestions */}
        <Reveal>
          <section className="pb-10">
            <h2 className="text-xl font-extrabold mb-1">AI Workload Insights</h2>
            <p className="text-sm text-muted mb-6">Recommendations based on live timetable data from backend.</p>
            <div className="grid gap-4">
              {suggestions.map((s,i) => (
                <Reveal key={i} delay={`${i*80}ms`}>
                  <div className={`flex gap-4 rounded-2xl border p-5 ${s.bg} hover:shadow-md transition-all`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center text-sm flex-shrink-0`}>{s.icon}</div>
                    <div><div className="font-bold text-sm mb-1">{s.title}</div><div className="text-xs text-muted leading-relaxed">{s.desc}</div></div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm" onClick={e => { if(e.target===e.currentTarget) setModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold">{modal==='add'?'+ Add Lecturer':'✎ Edit Lecturer'}</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"><FaTimes className="text-xs" /></button>
            </div>
            <div className="px-6 py-5 space-y-4" ref={firstErrRef}>
              {/* name */}
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Full Name *</label>
                <input
                  id="field-name" value={form.name}
                  onChange={e => { setForm(p=>({...p,name:e.target.value})); clearErr('name'); }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${errors.name?'border-rose-400 bg-rose-50':'border-slate-200 focus:border-primary'}`}
                  placeholder="e.g. Dr. Nimal Perera"
                />
                {errors.name && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0"/>{errors.name}</p>}
              </div>
              {/* department */}
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Department *</label>
                <select
                  id="field-dept" value={form.department}
                  onChange={e => { setForm(p=>({...p,department:e.target.value})); clearErr('department'); }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${errors.department?'border-rose-400 bg-rose-50':'border-slate-200 focus:border-primary'}`}
                >
                  <option value="" disabled>Select Department</option>
                  {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0"/>{errors.department}</p>}
              </div>
              {/* subjects */}
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Subjects <span className="font-normal">(comma-separated, optional)</span></label>
                <input
                  id="field-subjects" value={form.subjects}
                  onChange={e => setForm(p=>({...p,subjects:e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary transition-all"
                  placeholder="e.g. Algorithms, Data Structures"
                />
              </div>
              {/* max hours */}
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Max Weekly Hours *</label>
                <input
                  id="field-maxhours" type="number" min="1" max="40" value={form.maxWeeklyHours}
                  onChange={e => { setForm(p=>({...p,maxWeeklyHours:e.target.value})); clearErr('maxWeeklyHours'); }}
                  onKeyDown={e => ['-','e','+','.'].includes(e.key) && e.preventDefault()}
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${errors.maxWeeklyHours?'border-rose-400 bg-rose-50':'border-slate-200 focus:border-primary'}`}
                  placeholder="e.g. 20"
                />
                {errors.maxWeeklyHours && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0"/>{errors.maxWeeklyHours}</p>}
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50 transition-colors">Cancel</button>
              <button
                id="btn-save"
                onClick={modal==='add' ? handleCreate : handleUpdate}
                disabled={!formReady || saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <FaSpinner className="animate-spin-slow text-[10px]" /> : <FaSave className="text-[10px]" />}
                {saving ? 'Saving…' : (modal==='add'?'Add Lecturer':'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 text-xl"><FaTrash /></div>
              <div>
                <h3 className="font-extrabold">Confirm Delete</h3>
                <p className="text-xs text-muted mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Delete <strong>{lecturers.find(l => String(l._id) === String(delId) || String(l.lecturerId) === String(delId))?.name || 'this lecturer'}</strong> from the system?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50">Cancel</button>
              <button id="btn-confirm-delete" onClick={handleDelete} disabled={saving} className="px-5 py-2 text-xs font-extrabold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm disabled:opacity-40">
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reveal-on-scroll { opacity:0; transform:translateY(24px); transition:opacity .55s ease,transform .55s ease; }
        .reveal-on-scroll.is-visible { opacity:1; transform:translateY(0); }
        @keyframes tw-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes tw-spin { to{transform:rotate(360deg)} }
        .animate-spin-slow { animation: tw-spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
