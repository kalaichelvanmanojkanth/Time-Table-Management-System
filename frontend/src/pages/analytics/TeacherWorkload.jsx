import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaLightbulb,
  FaUserTie, FaClock, FaPlus, FaEdit, FaTrash, FaTimes,
  FaTimesCircle, FaInfoCircle, FaSave,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

/* ── reveal hook ── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, delay = '0ms' }) {
  const ref = useReveal();
  return <div ref={ref} className="reveal-on-scroll" style={{ transitionDelay: delay }}>{children}</div>;
}

/* ══ TOAST ══ */
const T_STYLE = {
  success: { bar: 'bg-emerald-500', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
  warning: { bar: 'bg-amber-400',   icon: 'text-amber-500',   ring: 'ring-amber-100'   },
  error:   { bar: 'bg-rose-500',    icon: 'text-rose-500',    ring: 'ring-rose-100'    },
  info:    { bar: 'bg-blue-500',    icon: 'text-blue-500',    ring: 'ring-blue-100'    },
};
const T_ICON = { success: <FaCheckCircle />, warning: <FaExclamationTriangle />, error: <FaTimesCircle />, info: <FaInfoCircle /> };

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

/* ══ CONSTANTS ══ */
const MAX_H = 20;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOTS = ['8:00–9:00', '9:00–10:00', '10:00–11:00', '11:00–12:00', '13:00–14:00', '14:00–15:00', '15:00–16:00', '16:00–17:00'];
const CLASSES = ['CSE-A', 'CSE-B', 'ECE-A', 'ECE-B', 'MECH-A', 'IT-A', 'IT-B'];

const INITIAL = [
  { id: 1, name: 'Dr. Anita Sharma',   dept: 'Computer Science', subject: 'Algorithms',      cls: 'CSE-A', hours: 22, max: MAX_H, days: ['Mon','Wed','Fri'], slots: ['8:00–9:00','9:00–10:00'] },
  { id: 2, name: 'Prof. Ravi Kumar',   dept: 'Mathematics',      subject: 'Calculus',         cls: 'CSE-B', hours: 18, max: MAX_H, days: ['Tue','Thu'],       slots: ['10:00–11:00'] },
  { id: 3, name: 'Dr. Preethi Nair',   dept: 'Computer Science', subject: 'Networks',         cls: 'CSE-A', hours: 14, max: MAX_H, days: ['Mon','Wed'],       slots: ['13:00–14:00'] },
  { id: 4, name: 'Mr. Suresh Babu',    dept: 'Physics',          subject: 'Physics I',        cls: 'ECE-A', hours: 20, max: MAX_H, days: ['Mon','Tue','Thu'], slots: ['11:00–12:00'] },
  { id: 5, name: 'Dr. Meera Krishnan', dept: 'Computer Science', subject: 'Databases',        cls: 'CSE-B', hours: 24, max: MAX_H, days: ['Mon','Tue','Wed','Thu','Fri'], slots: ['14:00–15:00','15:00–16:00'] },
  { id: 6, name: 'Prof. Karthik Rajan',dept: 'Electronics',      subject: 'Digital Circuits', cls: 'ECE-B', hours: 10, max: MAX_H, days: ['Tue','Thu'],       slots: ['16:00–17:00'] },
];

const SUGGESTIONS = [
  { icon: <FaLightbulb />, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 border-amber-100', title: 'Redistribute Databases to Prof. Karthik Rajan', desc: 'Dr. Meera Krishnan is 4h over limit. Moving "Databases" to Prof. Karthik Rajan (10h/week) would balance both to ~18h.' },
  { icon: <FaLightbulb />, color: 'from-blue-500 to-primary',     bg: 'bg-blue-50 border-blue-100',   title: 'Assign an elective to Dr. Preethi Nair',        desc: 'Dr. Preethi Nair is at 14h/week. Consider assigning the "Software Engineering" elective.' },
  { icon: <FaCheckCircle />, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 border-emerald-100', title: 'Prof. Ravi Kumar & Mr. Suresh Babu are well balanced', desc: 'Both are within the optimal 18–20h range. No action required.' },
];

function getStatus(h) { return h > MAX_H ? 'overloaded' : h < 12 ? 'underloaded' : 'optimal'; }

const STATUS_META = {
  overloaded:  { label: 'Overloaded',  cls: 'bg-rose-100 text-rose-600 border border-rose-200' },
  optimal:     { label: 'Optimal',     cls: 'bg-emerald-100 text-emerald-600 border border-emerald-200' },
  underloaded: { label: 'Under-load',  cls: 'bg-amber-100 text-amber-600 border border-amber-200' },
};

function HoursBar({ hours, max }) {
  const over = hours > max;
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />
        <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-primary to-accent'}`} style={{ width: `${Math.min((hours / max) * 100, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold w-12 text-right ${over ? 'text-rose-500' : 'text-muted'}`}>{hours}h / {max}h</span>
    </div>
  );
}

/* ══ EMPTY FORM ══ */
const EMPTY_FORM = { name: '', dept: '', subject: '', cls: '', hours: '', days: [], slots: [] };

/* ══ MAIN ══ */
export default function TeacherWorkload() {
  const [teachers, setTeachers] = useState(INITIAL);
  const [filter, setFilter]     = useState('all');
  const [view, setView]         = useState('cards'); // 'cards' | 'table'
  const [modal, setModal]       = useState(null);    // null | 'add' | 'edit'
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [delId, setDelId]       = useState(null);   // confirm-delete id
  const { list, dismiss, toast } = useToast();

  /* ── computed ── */
  const withStatus = teachers.map(t => ({ ...t, status: getStatus(t.hours) }));
  const filtered   = filter === 'all' ? withStatus : withStatus.filter(t => t.status === filter);
  const overCount  = withStatus.filter(t => t.status === 'overloaded').length;
  const underCount = withStatus.filter(t => t.status === 'underloaded').length;

  const STATS = [
    { label: 'Total Faculty',      value: teachers.length,  icon: <FaUserTie />,             color: 'text-primary',   bg: 'bg-blue-100'    },
    { label: 'Avg Weekly Hours',   value: teachers.length ? Math.round(teachers.reduce((a,t)=>a+Number(t.hours),0)/teachers.length)+'h' : '0h', icon: <FaClock />, color: 'text-indigo-500', bg: 'bg-indigo-100' },
    { label: 'Overloaded Faculty', value: overCount,        icon: <FaExclamationTriangle />, color: 'text-rose-500',  bg: 'bg-rose-100'    },
    { label: 'Optimal Load',       value: withStatus.filter(t=>t.status==='optimal').length, icon: <FaCheckCircle />, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  ];

  /* ── VALIDATION ── */
  function validate(f, currentId = null) {
    const e = {};
    if (!f.name.trim())    e.name    = 'Teacher name is required';
    if (!f.subject.trim()) e.subject = 'Subject is required';
    if (!f.cls)            e.cls     = 'Class is required';
    if (!f.hours || Number(f.hours) <= 0) e.hours = 'Weekly hours must be > 0';
    else if (Number(f.hours) > MAX_H)     e.hours = `Cannot exceed ${MAX_H}h/week`;
    if (f.days.length === 0)  e.days  = 'Select at least one day';
    if (f.slots.length === 0) e.slots = 'Select at least one time slot';

    // duplicate check: same teacher + subject + class
    const dup = teachers.find(t =>
      t.id !== currentId &&
      t.name.trim().toLowerCase() === f.name.trim().toLowerCase() &&
      t.subject.trim().toLowerCase() === f.subject.trim().toLowerCase() &&
      t.cls === f.cls
    );
    if (dup) e.dup = 'Duplicate: this teacher already has this subject in this class';

    // overlapping slot check for same teacher (different record)
    const sameTeacher = teachers.filter(t => t.id !== currentId && t.name.trim().toLowerCase() === f.name.trim().toLowerCase());
    for (const t of sameTeacher) {
      const dayOverlap  = f.days.some(d => t.days.includes(d));
      const slotOverlap = f.slots.some(s => t.slots.includes(s));
      if (dayOverlap && slotOverlap) {
        e.overlap = `Overlapping time slot with existing record (${t.subject} – ${t.cls})`;
        break;
      }
    }
    return e;
  }

  /* ── form helpers ── */
  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  function openAdd() {
    setForm(EMPTY_FORM); setErrors({}); setEditId(null); setModal('add');
    toast.info('Fill in teacher workload details', 'Info', 3000);
  }
  function openEdit(t) {
    setForm({ name: t.name, dept: t.dept, subject: t.subject, cls: t.cls, hours: String(t.hours), days: [...t.days], slots: [...t.slots] });
    setErrors({}); setEditId(t.id); setModal('edit');
    toast.info(`Editing workload for ${t.name}`, 'Info', 3000);
  }

  /* ── CREATE ── */
  function handleCreate() {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); toast.error('Please fix validation errors before saving', 'Error'); return; }
    const newT = { ...form, id: Date.now(), hours: Number(form.hours), max: MAX_H, days: form.days, slots: form.slots };
    setTeachers(p => [...p, newT]);
    setModal(null);
    toast.success(`${form.name} added successfully`, 'Success');
  }

  /* ── UPDATE ── */
  function handleUpdate() {
    const e = validate(form, editId);
    if (Object.keys(e).length) { setErrors(e); toast.error('Please fix validation errors before saving', 'Error'); return; }
    setTeachers(p => p.map(t => t.id === editId ? { ...t, ...form, hours: Number(form.hours) } : t));
    setModal(null);
    toast.success(`Workload updated for ${form.name}`, 'Success');
  }

  /* ── DELETE ── */
  function confirmDelete(id) {
    const t = teachers.find(x => x.id === id);
    if (!t) { toast.error('Record not found', 'Error'); return; }
    setDelId(id);
  }
  function handleDelete() {
    const t = teachers.find(x => x.id === delId);
    setTeachers(p => p.filter(x => x.id !== delId));
    setDelId(null);
    toast.success(`Deleted workload for ${t?.name}`, 'Success');
  }

  /* ── filter with toast ── */
  function changeFilter(k) {
    setFilter(k);
    if (k === 'overloaded' && overCount > 0) toast.warning(`${overCount} overloaded teacher(s) detected`, 'Warning');
    if (k === 'underloaded' && underCount > 0) toast.warning(`${underCount} idle/under-loaded teacher(s)`, 'Warning');
  }

  /* ── on mount validation ── */
  useEffect(() => {
    toast.info('Loading teacher workload data…', 'Info', 2500);
    const t = setTimeout(() => {
      if (!teachers.length) { toast.error('No teacher data available', 'Error'); return; }
      toast.success('Teacher workload data loaded successfully', 'Success', 3500);
      setTimeout(() => {
        if (overCount > 0)  toast.warning(`Overloaded teacher detected (${overCount} faculty)`, 'Warning', 5000);
        if (underCount > 0) toast.warning(`Idle teacher detected (${underCount} faculty under 12h)`, 'Warning', 5500);
        const hrs = teachers.map(x => x.hours);
        if (Math.max(...hrs) - Math.min(...hrs) >= 8) toast.warning('Workload imbalance detected — review distribution', 'Warning', 6000);
      }, 800);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const cardCls = (status) => {
    const base = 'bg-white rounded-2xl border shadow-md p-5 hover:shadow-lg transition-shadow';
    if (status === 'overloaded')  return `${base} border-rose-300 ring-1 ring-rose-200`;
    if (status === 'underloaded') return `${base} border-amber-200`;
    return `${base} border-slate-100 dark:border-slate-700`;
  };

  /* ══ RENDER ══ */
  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">
      <Toasts list={list} dismiss={dismiss} />

      {/* ── header ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-4 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="back-to-analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-navy dark:text-slate-200">Teacher Workload Analytics</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* view toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
            <button onClick={() => setView('cards')} className={`px-3 py-1.5 transition-colors ${view==='cards' ? 'bg-primary text-white' : 'bg-white text-muted hover:bg-slate-50'}`}>Cards</button>
            <button onClick={() => setView('table')} className={`px-3 py-1.5 transition-colors ${view==='table' ? 'bg-primary text-white' : 'bg-white text-muted hover:bg-slate-50'}`}>Table</button>
          </div>
          {/* add */}
          <button id="btn-add-teacher" onClick={openAdd} className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-sm">
            <FaPlus className="text-[10px]" /> Add Workload
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <HiSparkles /> Academic Analytics
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-12">

        {/* heading */}
        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Teacher Workload{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Analytics</span>
          </h1>
          <p className="mt-2 text-muted text-lg">Monitor teaching hours, identify overloaded faculty, and rebalance workloads across departments.</p>
        </Reveal>

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={`${i * 60}ms`}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg flex-shrink-0`}>{s.icon}</div>
                <div>
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-muted mt-0.5">{s.label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* filter pills + view */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-navy dark:text-white">Teaching Hours per Faculty</h2>
                <p className="text-sm text-muted mt-0.5">Maximum allowed: {MAX_H}h/week per faculty member</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { k:'all', l:'All', c: teachers.length },
                  { k:'overloaded', l:'Overloaded', c: overCount },
                  { k:'optimal', l:'Optimal', c: withStatus.filter(t=>t.status==='optimal').length },
                  { k:'underloaded', l:'Under-load', c: underCount },
                ].map(f => (
                  <button key={f.k} id={`filter-${f.k}`} onClick={() => changeFilter(f.k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 ${filter===f.k ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-muted border-slate-200 hover:border-primary'}`}>
                    {f.l} ({f.c})
                  </button>
                ))}
              </div>
            </div>

            {/* empty state */}
            {filtered.length === 0 ? (
              <div id="no-data-state" className="flex flex-col items-center justify-center py-16 text-muted">
                <FaExclamationTriangle className="text-4xl text-slate-300 mb-3" />
                <p className="font-semibold mb-3">No teacher data for this filter.</p>
                <button onClick={openAdd} className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-all">
                  <FaPlus /> Add Teacher Workload
                </button>
              </div>
            ) : view === 'cards' ? (
              /* ── CARD VIEW ── */
              <div className="grid gap-4">
                {filtered.map((t, i) => {
                  const meta = STATUS_META[t.status];
                  return (
                    <div key={t.id} id={`tc-${t.id}`} className={cardCls(t.status)} style={{ animationDelay: `${i*50}ms` }}>
                      <div className="flex flex-wrap items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-bold flex-shrink-0 ${t.status==='overloaded'?'bg-gradient-to-br from-rose-500 to-rose-400':t.status==='underloaded'?'bg-gradient-to-br from-amber-400 to-amber-500':'bg-gradient-to-br from-primary to-secondary'}`}>
                          {t.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm">{t.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                            {t.status==='underloaded' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Idle Risk</span>}
                          </div>
                          <div className="text-xs text-muted mt-0.5">{t.dept} · {t.subject} · {t.cls}</div>
                          <div className="text-xs text-muted mt-0.5">Days: {t.days.join(', ')} | Slots: {t.slots.join(', ')}</div>
                        </div>
                        {t.status==='overloaded' && (
                          <div className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1">
                            <FaExclamationTriangle className="text-[10px]" />+{t.hours-t.max}h over
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <button id={`edit-${t.id}`} onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit"><FaEdit className="text-xs" /></button>
                          <button id={`del-${t.id}`} onClick={() => confirmDelete(t.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title="Delete"><FaTrash className="text-xs" /></button>
                        </div>
                      </div>
                      <HoursBar hours={t.hours} max={t.max} />
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {t.slots.map(s => <span key={s} className="text-[10px] font-semibold bg-slate-100 text-muted rounded-full px-2.5 py-0.5">{s}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── TABLE VIEW ── */
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        {['Teacher','Dept','Subject','Class','Days','Hours','Status','Actions'].map(h => (
                          <th key={h} className="text-left text-[10px] font-extrabold uppercase tracking-widest text-muted px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                      {filtered.map(t => {
                        const meta = STATUS_META[t.status];
                        return (
                          <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${t.status==='overloaded'?'bg-rose-50/30':t.status==='underloaded'?'bg-amber-50/30':''}`}>
                            <td className="px-4 py-3 font-semibold text-navy dark:text-slate-100 whitespace-nowrap">{t.name}</td>
                            <td className="px-4 py-3 text-muted text-xs">{t.dept}</td>
                            <td className="px-4 py-3 text-xs">{t.subject}</td>
                            <td className="px-4 py-3 text-xs">{t.cls}</td>
                            <td className="px-4 py-3 text-xs">{t.days.join(', ')}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold ${t.hours>t.max?'text-rose-500':t.hours<12?'text-amber-500':'text-emerald-600'}`}>{t.hours}h</span>
                              <span className="text-[10px] text-muted">/{t.max}h</span>
                            </td>
                            <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center transition-colors"><FaEdit className="text-[10px]" /></button>
                                <button onClick={() => confirmDelete(t.id)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"><FaTrash className="text-[10px]" /></button>
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

        {/* weekly chart */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Weekly Workload Comparison</h2>
            <p className="text-sm text-muted mb-6">Current teaching hours per faculty vs {MAX_H}h limit</p>
            <div className="flex items-end gap-2 h-44 overflow-x-auto">
              {withStatus.map((t, i) => (
                <div key={t.id} className="flex-1 min-w-[52px] flex flex-col items-center gap-1">
                  <div className="w-full flex items-end h-36">
                    <div
                      className={`w-full rounded-t-md transition-all duration-700 hover:opacity-80 ${t.status==='overloaded'?'bg-rose-400':t.status==='underloaded'?'bg-amber-300':'bg-gradient-to-t from-primary to-secondary'}`}
                      style={{ height: `${Math.min((t.hours / 28) * 100, 100)}%` }}
                      title={`${t.name}: ${t.hours}h`}
                    />
                  </div>
                  <span className="text-[8px] font-semibold text-muted text-center leading-tight">{t.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <div className="w-6 border-t-2 border-dashed border-slate-300" />
              <span>{MAX_H}h/week = maximum allowed workload</span>
            </div>
          </section>
        </Reveal>

        {/* overloaded alerts */}
        {overCount > 0 && (
          <Reveal>
            <section>
              <h2 className="text-xl font-extrabold mb-4">
                <FaExclamationTriangle className="inline text-rose-500 mr-2" />Overloaded Teacher Alerts
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {withStatus.filter(t=>t.status==='overloaded').map((t,i) => (
                  <Reveal key={t.id} delay={`${i*80}ms`}>
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-400 text-white flex items-center justify-center text-sm font-bold">{t.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
                        <div><div className="font-bold text-sm">{t.name}</div><div className="text-xs text-muted">{t.dept}</div></div>
                      </div>
                      <div className="text-sm text-rose-700 font-semibold mb-1">⚠ {t.hours}h assigned — {t.hours-t.max}h above limit</div>
                      <div className="text-xs text-rose-600">Subject: {t.subject} · Class: {t.cls}</div>
                      <div className="mt-2 text-[11px] font-bold text-rose-500 bg-rose-100 border border-rose-200 rounded-lg px-3 py-1.5 inline-block">Action Required: Reassign or reduce load</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* suggestions */}
        <Reveal>
          <section className="pb-10">
            <h2 className="text-xl font-extrabold mb-1">Workload Balance Suggestions</h2>
            <p className="text-sm text-muted mb-6">AI-generated recommendations to optimize faculty workload.</p>
            <div className="grid gap-4">
              {SUGGESTIONS.map((s,i) => (
                <Reveal key={s.title} delay={`${i*80}ms`}>
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

      {/* ══ ADD / EDIT MODAL ══ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm" onClick={e => { if(e.target===e.currentTarget) setModal(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{modal==='add' ? '+ Add Teacher Workload' : '✎ Edit Teacher Workload'}</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"><FaTimes className="text-xs" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* global errors */}
              {errors.dup && <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">⚠ {errors.dup}</div>}
              {errors.overlap && <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">⚠ {errors.overlap}</div>}

              {/* row: name / dept */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Teacher Name *</label>
                  <input id="field-name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${errors.name?'border-rose-400 bg-rose-50':'border-slate-200 focus:border-primary'}`} placeholder="Dr. John Doe" />
                  {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Department</label>
                  <input id="field-dept" value={form.dept} onChange={e=>setForm(p=>({...p,dept:e.target.value}))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary transition-all" placeholder="Computer Science" />
                </div>
              </div>

              {/* row: subject / class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Subject *</label>
                  <input id="field-subject" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${errors.subject?'border-rose-400 bg-rose-50':'border-slate-200 focus:border-primary'}`} placeholder="Algorithms" />
                  {errors.subject && <p className="text-[10px] text-rose-500 mt-1">{errors.subject}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Class *</label>
                  <select id="field-class" value={form.cls} onChange={e=>setForm(p=>({...p,cls:e.target.value}))}
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${errors.cls?'border-rose-400 bg-rose-50':'border-slate-200 focus:border-primary'}`}>
                    <option value="">Select class</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.cls && <p className="text-[10px] text-rose-500 mt-1">{errors.cls}</p>}
                </div>
              </div>

              {/* hours */}
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Weekly Hours * <span className="font-normal">(max {MAX_H}h)</span></label>
                <input id="field-hours" type="number" min="1" max={MAX_H} value={form.hours} onChange={e=>setForm(p=>({...p,hours:e.target.value}))}
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${errors.hours?'border-rose-400 bg-rose-50':'border-slate-200 focus:border-primary'}`} placeholder="e.g. 16" />
                {errors.hours && <p className="text-[10px] text-rose-500 mt-1">{errors.hours}</p>}
                {form.hours && Number(form.hours) > MAX_H-2 && Number(form.hours) <= MAX_H && (
                  <p className="text-[10px] text-amber-500 mt-1">⚠ Near maximum limit</p>
                )}
              </div>

              {/* days */}
              <div>
                <label className="block text-xs font-bold text-muted mb-2">Assigned Days *</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={()=>setForm(p=>({...p,days:toggleArr(p.days,d)}))}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${form.days.includes(d)?'bg-primary text-white border-primary':'bg-white text-muted border-slate-200 hover:border-primary'}`}>
                      {d}
                    </button>
                  ))}
                </div>
                {errors.days && <p className="text-[10px] text-rose-500 mt-1">{errors.days}</p>}
              </div>

              {/* slots */}
              <div>
                <label className="block text-xs font-bold text-muted mb-2">Time Slots *</label>
                <div className="flex flex-wrap gap-2">
                  {SLOTS.map(s => (
                    <button key={s} type="button" onClick={()=>setForm(p=>({...p,slots:toggleArr(p.slots,s)}))}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${form.slots.includes(s)?'bg-primary text-white border-primary':'bg-white text-muted border-slate-200 hover:border-primary'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                {errors.slots && <p className="text-[10px] text-rose-500 mt-1">{errors.slots}</p>}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-5 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50 transition-colors">Cancel</button>
              <button id="btn-save" onClick={modal==='add' ? handleCreate : handleUpdate}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm">
                <FaSave className="text-[10px]" /> {modal==='add' ? 'Add Workload' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM ══ */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 text-xl"><FaTrash /></div>
              <div>
                <h3 className="font-extrabold text-navy dark:text-white">Confirm Delete</h3>
                <p className="text-xs text-muted mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Are you sure you want to delete workload record for <strong>{teachers.find(t=>t.id===delId)?.name}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50 transition-colors">Cancel</button>
              <button id="btn-confirm-delete" onClick={handleDelete} className="px-5 py-2 text-xs font-extrabold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reveal-on-scroll { opacity:0; transform:translateY(24px); transition:opacity .55s ease,transform .55s ease; }
        .reveal-on-scroll.is-visible { opacity:1; transform:translateY(0); }
        @keyframes tw-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
      `}</style>
    </div>
  );
}
