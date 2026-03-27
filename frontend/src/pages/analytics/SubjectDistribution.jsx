import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaBookOpen, FaExclamationTriangle, FaInfoCircle,
  FaTimes, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaPlus, FaSave,
} from 'react-icons/fa';

/* ── reveal ── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); }
    }, { threshold: 0.08 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, delay = '0ms', className = '' }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal-on-scroll ${className}`} style={{ transitionDelay: delay }}>{children}</div>;
}

/* ══ TOAST ══ */
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
    const b = setTimeout(() => { setShow(false); setTimeout(() => onDismiss(t.id), 300); }, t.dur || 3500);
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
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.bar} origin-left`} style={{ animation: `sd-shrink ${t.dur || 3500}ms linear forwards` }} />
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
const DEPT_OPTIONS = [
  'Information Technology',
  'Computer Science',
  'Computer System Engineering',
  'Computer System Networks',
];

const DEPT_BAR_COLORS = {
  'Information Technology':      'bg-violet-500',
  'Computer Science':            'bg-blue-500',
  'Computer System Engineering': 'bg-emerald-500',
  'Computer System Networks':    'bg-amber-500',
};

const TEACHERS = [
  'Dr. Nimal Perera',
  'Prof. Kasun Silva',
  'Mr. Chamara Fernando',
  'Ms. Dilani Jayawardena',
  'Mr. Tharindu Wijesinghe',
  'Ms. Sanduni Peris',
  'Dr. Ruwan Gunasekara',
  'Mr. Supun Herath',
];

const SUBJECT_OPTIONS = ['ITPM', 'NDM', 'PAF', 'ESD', 'HCI', 'IAS', 'DS', 'DSA'];

const INITIAL_SUBJECTS = [
  { id: 1,  name: 'Algorithms',       dept: 'Computer Science',            teacher: 'Dr. Nimal Perera',        hoursPerWeek: 4, maxHours: 5, classes: ['CS-A', 'CS-B'] },
  { id: 2,  name: 'Data Structures',  dept: 'Computer Science',            teacher: 'Dr. Nimal Perera',        hoursPerWeek: 3, maxHours: 4, classes: ['CS-A']         },
  { id: 3,  name: 'Networks',         dept: 'Computer System Networks',    teacher: 'Ms. Dilani Jayawardena',  hoursPerWeek: 3, maxHours: 4, classes: ['CS-B']         },
  { id: 4,  name: 'OS Concepts',      dept: 'Computer Science',            teacher: 'Mr. Chamara Fernando',    hoursPerWeek: 3, maxHours: 3, classes: ['CS-A']         },
  { id: 5,  name: 'Databases',        dept: 'Information Technology',      teacher: 'Dr. Ruwan Gunasekara',    hoursPerWeek: 6, maxHours: 4, classes: ['CS-A', 'CS-B'] },
  { id: 6,  name: 'AI & ML',          dept: 'Computer Science',            teacher: 'Prof. Kasun Silva',       hoursPerWeek: 4, maxHours: 4, classes: ['CS-A']         },
  { id: 7,  name: 'Physics I',        dept: 'Computer System Engineering', teacher: 'Mr. Tharindu Wijesinghe', hoursPerWeek: 0, maxHours: 3, classes: []               },
  { id: 8,  name: 'Web Dev',          dept: 'Information Technology',      teacher: 'Ms. Sanduni Peris',       hoursPerWeek: 3, maxHours: 3, classes: ['CS-B']         },
  { id: 9,  name: 'Cloud Computing',  dept: 'Computer System Engineering', teacher: 'Mr. Supun Herath',        hoursPerWeek: 2, maxHours: 3, classes: ['CS-A']         },
  { id: 10, name: 'Digital Circuits', dept: 'Computer System Networks',    teacher: 'Ms. Dilani Jayawardena',  hoursPerWeek: 2, maxHours: 3, classes: ['EC-A']         },
];

/* ══ STATUS ══ */
function getStatus(s) {
  if (s.hoursPerWeek === 0)              return 'unscheduled';
  if (s.hoursPerWeek > s.maxHours)       return 'over';
  if (s.hoursPerWeek < s.maxHours * 0.5) return 'under';
  if (!s.teacher)                         return 'no-teacher';
  return 'ok';
}
const STATUS_META = {
  over:         { label: 'Over-allocated',  cls: 'bg-rose-100 text-rose-600 border border-rose-200' },
  under:        { label: 'Under-allocated', cls: 'bg-amber-100 text-amber-600 border border-amber-200' },
  unscheduled:  { label: 'Not Scheduled',   cls: 'bg-slate-100 text-muted border border-slate-200' },
  'no-teacher': { label: 'No Teacher',      cls: 'bg-orange-100 text-orange-600 border border-orange-200' },
  ok:           { label: 'OK',              cls: 'bg-emerald-100 text-emerald-600 border border-emerald-200' },
};

/* ══ VALIDATION ══ */
function validateSubject(s, all) {
  const errs = {};
  if (!s.dept)                                                                                         errs.dept         = 'Department selection is required';
  if (!s.name.trim())                                                                                  errs.name         = 'Subject selection is required';
  if (!s.teacher)                                                                                      errs.teacher      = 'Teacher selection is required';
  if (s.hoursPerWeek === '' || Number(s.hoursPerWeek) <= 0)                                           errs.hoursPerWeek = 'Weekly hours must be greater than zero';
  if (s.maxHours === '' || Number(s.maxHours) <= 0)                                                   errs.maxHours     = 'Max hours must be greater than zero';
  if (!errs.hoursPerWeek && !errs.maxHours && Number(s.hoursPerWeek) > Number(s.maxHours))            errs.hoursPerWeek = 'Weekly hours cannot exceed max hours';
  if (!errs.name && all.some(x => x.id !== s.id && x.name.trim().toLowerCase() === s.name.trim().toLowerCase())) errs.name = 'Duplicate subject not allowed';
  return errs;
}

/* ══ EMPTY FORM ══ */
const EMPTY_FORM = { name: '', dept: '', teacher: '', hoursPerWeek: '', maxHours: '' };

/* ══ INPUT FIELD COMPONENT ══ */
function Field({ label, id, type = 'text', placeholder, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-muted mb-1 block">{label}</label>
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={type === 'number' ? e => { if (['-', 'e', '+', '.'].includes(e.key)) e.preventDefault(); } : undefined}
        className={`w-full text-sm px-3 py-2.5 rounded-xl border bg-white text-navy focus:outline-none transition-all duration-200
          ${error ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-slate-200 focus:border-secondary'}`}
      />
      {error && (
        <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 animate-fade-in">
          <FaExclamationTriangle className="flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

/* ══ SUBJECT MODAL (Add / Edit) ══ */
function SubjectModal({ mode, initial, existing, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const firstErrRef = useRef(null);
  const subjectDropRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => subjectDropRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const candidate = {
      ...form,
      id: initial.id || Date.now(),
      hoursPerWeek: Number(form.hoursPerWeek),
      maxHours: Number(form.maxHours),
      classes: initial.classes || [],
    };
    const errs = validateSubject(candidate, existing);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setTimeout(() => firstErrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    onSubmit(candidate);
    onClose();
  };

  const isAdd = mode === 'add';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-navy text-lg">
            {isAdd ? '+ Add Subject' : '✎ Edit Subject'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-muted transition-colors"><FaTimes /></button>
        </div>

        <div className="space-y-3" ref={firstErrRef}>
          {/* Subject Name Dropdown */}
          <div>
            <label htmlFor="field-name" className="text-xs font-bold text-muted mb-1 block">Subject Name *</label>
            <select
              id="field-name"
              ref={subjectDropRef}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`w-full text-sm px-3 py-2.5 rounded-xl border bg-white text-navy focus:outline-none transition-all duration-200
                ${errors.name ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-slate-200 focus:border-secondary'}`}
            >
              <option value="" disabled>Select Subject</option>
              {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.name
              ? <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 animate-fade-in"><FaExclamationTriangle className="flex-shrink-0" />{errors.name}</p>
              : <p className="text-[10px] text-slate-400 mt-1">Select subject for distribution analytics</p>
            }
          </div>

          {/* Department dropdown */}
          <div>
            <label htmlFor="field-dept" className="text-xs font-bold text-muted mb-1 block">Department *</label>
            <select
              id="field-dept"
              value={form.dept}
              onChange={e => set('dept', e.target.value)}
              className={`w-full text-sm px-3 py-2.5 rounded-xl border bg-white text-navy focus:outline-none transition-all duration-200
                ${errors.dept ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-slate-200 focus:border-secondary'}`}
            >
              <option value="" disabled>Select Department</option>
              {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.dept
              ? <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 animate-fade-in"><FaExclamationTriangle className="flex-shrink-0" />{errors.dept}</p>
              : <p className="text-[10px] text-slate-400 mt-1">Changing department updates allocation charts</p>
            }
          </div>

          {/* Teacher dropdown */}
          <div>
            <label htmlFor="field-teacher" className="text-xs font-bold text-muted mb-1 block">Assign Teacher *</label>
            <select
              id="field-teacher"
              value={form.teacher}
              onChange={e => set('teacher', e.target.value)}
              className={`w-full text-sm px-3 py-2.5 rounded-xl border bg-white text-navy focus:outline-none transition-all duration-200
                ${errors.teacher ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-slate-200 focus:border-secondary'}`}
            >
              <option value="" disabled>Select Teacher</option>
              {TEACHERS.map(t => <option key={t}>{t}</option>)}
            </select>
            {errors.teacher && (
              <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 animate-fade-in">
                <FaExclamationTriangle className="flex-shrink-0" />{errors.teacher}
              </p>
            )}
          </div>

          {/* Hours row */}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Weekly Hours *" id="field-hours" type="number" placeholder="e.g. 3"
              value={form.hoursPerWeek} onChange={v => set('hoursPerWeek', v)} error={errors.hoursPerWeek}
            />
            <Field
              label="Max Hours *" id="field-maxhours" type="number" placeholder="e.g. 4"
              value={form.maxHours} onChange={v => set('maxHours', v)} error={errors.maxHours}
            />
          </div>
        </div>

        {/* actions */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-muted hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-modal-submit"
            onClick={submit}
            disabled={!form.name || !form.dept || !form.teacher}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-secondary to-violet-700 rounded-xl shadow-md hover:from-indigo-700 hover:to-violet-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <FaSave className="text-[11px]" />
            {isAdd ? 'Add Subject' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ MAIN ══ */
export default function SubjectDistribution() {
  const [subjects, setSubjects]   = useState(INITIAL_SUBJECTS);
  const [modal, setModal]         = useState(null);   // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [filter, setFilter]       = useState('all');
  const [delId, setDelId]         = useState(null);
  const { list, dismiss, toast }  = useToast();

  /* ── derived ── */
  const issues   = subjects.filter(s => getStatus(s) !== 'ok');
  const filtered = filter === 'all' ? subjects : subjects.filter(s => getStatus(s) === filter);
  const noData   = subjects.length === 0;

  const deptTotals = Object.entries(
    subjects.reduce((acc, s) => { acc[s.dept] = (acc[s.dept] || 0) + s.hoursPerWeek; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxDept = Math.max(...deptTotals.map(d => d[1]), 1);

  const classTotals = Object.entries(
    subjects.reduce((acc, s) => { s.classes.forEach(c => { acc[c] = (acc[c] || 0) + s.hoursPerWeek; }); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxClass = Math.max(...classTotals.map(c => c[1]), 1);

  /* ── CRUD ── */
  function openAdd() {
    setEditTarget(null);
    setModal('add');
    toast.info('Fill in subject details to add a new entry', 'Info', 3000);
  }
  function openEdit(s) {
    setEditTarget(s);
    setModal('edit');
    toast.info(`Editing "${s.name}"`, 'Info', 3000);
  }
  function handleAdd(candidate) {
    setSubjects(p => [...p, candidate]);
    toast.success('Subject added successfully', 'Success');
  }
  function handleUpdate(candidate) {
    setSubjects(p => p.map(s => s.id === candidate.id ? { ...s, ...candidate } : s));
    toast.success('Subject updated successfully', 'Success');
  }
  function confirmDelete(id) { setDelId(id); }
  function handleDelete() {
    const s = subjects.find(x => x.id === delId);
    setSubjects(p => p.filter(x => x.id !== delId));
    setDelId(null);
    toast.success(`"${s?.name}" deleted successfully`, 'Success');
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">
      <Toasts list={list} dismiss={dismiss} />

      {/* ── modals ── */}
      {modal === 'add' && (
        <SubjectModal
          mode="add"
          initial={EMPTY_FORM}
          existing={subjects}
          onClose={() => setModal(null)}
          onSubmit={handleAdd}
        />
      )}
      {modal === 'edit' && editTarget && (
        <SubjectModal
          mode="edit"
          initial={{
            id: editTarget.id, name: editTarget.name, dept: editTarget.dept,
            teacher: editTarget.teacher, hoursPerWeek: String(editTarget.hoursPerWeek),
            maxHours: String(editTarget.maxHours), classes: editTarget.classes,
          }}
          existing={subjects}
          onClose={() => setModal(null)}
          onSubmit={handleUpdate}
        />
      )}

      {/* ── delete confirm ── */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 text-xl"><FaTrash /></div>
              <div>
                <h3 className="font-extrabold text-navy">Confirm Delete</h3>
                <p className="text-xs text-muted mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Delete subject <strong>"{subjects.find(s => s.id === delId)?.name}"</strong>?
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

      {/* ── header ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link to="/analytics" id="subj-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold">Subject Distribution</span>
        <button id="add-subject-btn" onClick={openAdd} className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-secondary to-violet-700 px-4 py-2 rounded-xl shadow-md hover:from-indigo-700 transition-all">
          <FaPlus className="text-[10px]" /> Add Subject
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">
        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mb-2">
            Subject <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Distribution</span>
          </h1>
          <p className="text-muted dark:text-slate-400 text-lg">Analyse subject-hour allocations, class distributions, and departmental load.</p>
        </Reveal>

        {noData && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-3">
            <FaExclamationTriangle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" />
            <div><div className="font-bold text-amber-700 dark:text-amber-300 mb-1">No Subject Data</div><div className="text-sm text-amber-600 dark:text-amber-400">Add subjects to view distribution charts.</div></div>
          </div>
        )}

        {issues.length > 0 && (
          <Reveal>
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 mb-3">
                <FaExclamationTriangle /> {issues.length} Subject{issues.length > 1 ? 's' : ''} Need Attention
              </div>
              <div className="space-y-1">
                {issues.map(s => (
                  <div key={s.id} className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <span className="font-semibold">{s.name}:</span>
                    {getStatus(s) === 'over'        && `Over-allocated by ${s.hoursPerWeek - s.maxHours}h`}
                    {getStatus(s) === 'under'       && 'Under-allocated (<50% of max hours)'}
                    {getStatus(s) === 'unscheduled' && '0 hours assigned — not scheduled'}
                    {getStatus(s) === 'no-teacher'  && 'No teacher assigned'}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Department chart — auto-updates when subjects change */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Department-wise Allocation</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Total weekly subject hours per department</p>
            {noData
              ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No data available</div>
              : <div className="space-y-3">
                  {deptTotals.map(([dept, hrs]) => (
                    <div key={dept} className="flex items-center gap-3">
                      <div className="w-48 text-xs font-semibold text-muted dark:text-slate-400 truncate flex-shrink-0">{dept}</div>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${DEPT_BAR_COLORS[dept] || 'bg-primary'} transition-all duration-700`} style={{ width: `${(hrs / maxDept) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-muted dark:text-slate-400 w-10 text-right">{hrs}h</span>
                    </div>
                  ))}
                </div>
            }
          </section>
        </Reveal>

        {/* Class chart */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Class-wise Subject Hours</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Weekly hours per class section</p>
            {noData || classTotals.length === 0
              ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No class data — assign subjects to classes</div>
              : <div className="flex items-end gap-4 h-36">
                  {classTotals.map(([cls, hrs]) => (
                    <div key={cls} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold text-secondary dark:text-indigo-400">{hrs}h</span>
                      <div className="w-full rounded-t-xl bg-gradient-to-t from-secondary to-violet-400 transition-all duration-700 hover:opacity-80" style={{ height: `${(hrs / maxClass) * 100}%`, minHeight: '8px' }} />
                      <span className="text-[10px] font-semibold text-muted dark:text-slate-400">{cls}</span>
                    </div>
                  ))}
                </div>
            }
          </section>
        </Reveal>

        {/* Subject list */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-extrabold text-navy dark:text-white">Subject Hours per Week</h2>
              <div className="flex flex-wrap gap-2">
                {['all', 'over', 'under', 'unscheduled', 'no-teacher', 'ok'].map(k => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter === k ? 'bg-secondary text-white border-secondary' : 'bg-white dark:bg-slate-800 text-muted dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                    {k === 'all' ? 'All' : k === 'no-teacher' ? 'No Teacher' : k === 'ok' ? 'OK' : k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0
              ? <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center text-muted dark:text-slate-400 text-sm">No subjects match this filter.</div>
              : <div className="grid gap-3">
                  {filtered.map(s => {
                    const st = getStatus(s); const meta = STATUS_META[st];
                    const pct = s.maxHours > 0 ? Math.min((s.hoursPerWeek / s.maxHours) * 100, 100) : 0;
                    const over = s.hoursPerWeek > s.maxHours;
                    return (
                      <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 hover:shadow-lg transition-shadow">
                        <div className="flex flex-wrap items-start gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-xl ${DEPT_BAR_COLORS[s.dept] || 'bg-primary'} flex items-center justify-center text-white text-xs flex-shrink-0`}><FaBookOpen /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-navy dark:text-slate-100 text-sm">{s.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                            </div>
                            <div className="text-xs text-muted dark:text-slate-400 mt-0.5">
                              {s.dept} {s.teacher ? `· ${s.teacher}` : <span className="text-orange-500">· No teacher</span>}
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>{s.hoursPerWeek}h / {s.maxHours}h</span>
                          {/* edit / delete */}
                          <div className="flex gap-1.5">
                            <button id={`edit-${s.id}`} onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit"><FaEdit className="text-xs" /></button>
                            <button id={`del-${s.id}`} onClick={() => confirmDelete(s.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title="Delete"><FaTrash className="text-xs" /></button>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-secondary to-accent'}`} style={{ width: `${pct}%` }} />
                        </div>
                        {s.classes.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{s.classes.map(c => <span key={c} className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-muted dark:text-slate-300 rounded-full px-2.5 py-0.5">{c}</span>)}</div>}
                        {s.hoursPerWeek === 0 && <div className="mt-2 text-[11px] font-bold text-amber-500 flex items-center gap-1.5"><FaInfoCircle />Subject has 0 hours — not yet scheduled</div>}
                        {!s.teacher && <div className="mt-1 text-[11px] font-bold text-orange-500 flex items-center gap-1.5"><FaExclamationTriangle />No teacher assigned</div>}
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
        @keyframes sd-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes fade-in { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fade-in 0.2s ease forwards; }
      `}</style>
    </div>
  );
}
