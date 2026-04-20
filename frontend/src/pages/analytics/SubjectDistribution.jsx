import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaBookOpen, FaExclamationTriangle, FaInfoCircle,
  FaTimes, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaPlus, FaSave, FaSync, FaSpinner,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import {
  fetchSubjects, fetchTimetables, calcSubjectDistribution,
  createSubject, updateSubject, deleteSubject, normalizeArray,
} from '../../services/analyticsService';

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

/* ── toast ── */
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
      <button onClick={close} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><FaTimes className="text-xs" /></button>
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
    const id = ++_tid; setList(p => [...p, { id, type, msg, title, dur }]);
  }, []);
  return { list, dismiss, toast: {
    success: (m, t, d) => push('success', m, t || 'Success', d),
    warning: (m, t, d) => push('warning', m, t || 'Warning', d),
    error:   (m, t, d) => push('error',   m, t || 'Error',   d),
    info:    (m, t, d) => push('info',    m, t || 'Info',    d),
  }};
}

/* ── constants ── */
const DEPT_OPTIONS = [
  'Information Technology','Computer Science',
  'Computer System Engineering','Computer System Networks',
];
const DEPT_COLORS = {
  'Information Technology':      'bg-violet-500',
  'Computer Science':            'bg-blue-500',
  'Computer System Engineering': 'bg-emerald-500',
  'Computer System Networks':    'bg-amber-500',
};

const STATUS_META = {
  over:        { label: 'Over-allocated',  cls: 'bg-rose-100 text-rose-600 border border-rose-200' },
  under:       { label: 'Under-allocated', cls: 'bg-amber-100 text-amber-600 border border-amber-200' },
  unscheduled: { label: 'Not Scheduled',   cls: 'bg-slate-100 text-muted border border-slate-200' },
  ok:          { label: 'OK',             cls: 'bg-emerald-100 text-emerald-600 border border-emerald-200' },
};

function getStatus(s) {
  if (!s.weeklyHours || s.weeklyHours === 0) return 'unscheduled';
  if (s.scheduledHours > s.weeklyHours)       return 'over';
  if (s.scheduledHours < s.weeklyHours * 0.5) return 'under';
  return 'ok';
}

const EMPTY_FORM = { name: '', department: '', weeklyHours: '' };

/* ── validation ── */
function validate(f, all, currentId = null) {
  const e = {};
  if (!f.name.trim())                              e.name        = 'Subject name is required';
  if (!f.department)                               e.department  = 'Department is required';
  if (!f.weeklyHours || Number(f.weeklyHours) <= 0) e.weeklyHours = 'Weekly hours must be > 0';
  const dup = all.find(s =>
    s.subjectId !== currentId &&
    s.subjectName.trim().toLowerCase() === f.name.trim().toLowerCase()
  );
  if (dup) e.name = 'A subject with this name already exists';
  return e;
}

/* ── modal ── */
function SubjectModal({ mode, initial, existing, onClose, onSubmit, saving }) {
  const [form, setForm]     = useState(initial);
  const [errors, setErrors] = useState({});
  const firstRef            = useRef(null);
  const nameRef             = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const n={...e}; delete n[k]; return n; }); };

  const submit = () => {
    const e = validate(form, existing, initial.subjectId);
    if (Object.keys(e).length) {
      setErrors(e);
      setTimeout(() => firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    onSubmit({ subjectId: initial.subjectId, name: form.name.trim(), department: form.department, weeklyHours: Number(form.weeklyHours) });
    onClose();
  };

  const isAdd = mode === 'add';
  const ready = form.name.trim() && form.department && form.weeklyHours && Number(form.weeklyHours) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-navy text-lg">{isAdd ? '+ Add Subject' : '✎ Edit Subject'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-muted"><FaTimes /></button>
        </div>
        <div className="space-y-3" ref={firstRef}>
          {/* name */}
          <div>
            <label className="text-xs font-bold text-muted mb-1 block">Subject Name *</label>
            <input
              id="field-name" ref={nameRef} value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-all ${errors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-secondary'}`}
              placeholder="e.g. Algorithms"
            />
            {errors.name && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0" />{errors.name}</p>}
          </div>
          {/* department */}
          <div>
            <label className="text-xs font-bold text-muted mb-1 block">Department *</label>
            <select
              id="field-dept" value={form.department}
              onChange={e => set('department', e.target.value)}
              className={`w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-all ${errors.department ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-secondary'}`}
            >
              <option value="" disabled>Select Department</option>
              {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0" />{errors.department}</p>}
          </div>
          {/* weekly hours */}
          <div>
            <label className="text-xs font-bold text-muted mb-1 block">Weekly Hours *</label>
            <input
              id="field-hours" type="number" min="1" value={form.weeklyHours}
              onChange={e => set('weeklyHours', e.target.value)}
              onKeyDown={e => ['-','e','+','.'].includes(e.key) && e.preventDefault()}
              className={`w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-all ${errors.weeklyHours ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-secondary'}`}
              placeholder="e.g. 3"
            />
            {errors.weeklyHours && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0" />{errors.weeklyHours}</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-muted hover:bg-slate-50">Cancel</button>
          <button
            id="btn-modal-submit" onClick={submit}
            disabled={!ready || saving}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-secondary to-violet-700 rounded-xl shadow-md hover:from-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {saving ? <FaSpinner className="animate-spin-slow text-xs" /> : <FaSave className="text-[11px]" />}
            {saving ? 'Saving…' : (isAdd ? 'Add Subject' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Real backend data is loaded via fetchSubjects and fetchTimetables

/* ── main ── */
export default function SubjectDistribution() {
  const [rawSubjects, setRawSubjects] = useState([]);
  const [timetable,   setTimetable]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [editTarget,  setEditTarget]  = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [delId,       setDelId]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const { list, dismiss, toast } = useToast();

  /* Load real data */
  const loadData = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const [subjs, tts] = await Promise.all([
        fetchSubjects().catch(() => []),
        fetchTimetables().catch(() => []),
      ]);
      setRawSubjects(normalizeArray(subjs));
      setTimetable(normalizeArray(tts));
      if (showToast) toast.success('Data refreshed from backend', 'Synced');
    } catch (err) {
      toast.error(`Failed to load data: ${err.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Build subject list with scheduled hours from timetable */
  const subjects = calcSubjectDistribution(rawSubjects, timetable).map(s => ({
    subjectId:     s.subjectId     || s._id,
    subjectName:   s.subjectName   || s.name,
    department:    s.department    || '',
    weeklyHours:   s.weeklyHours   || 0,
    scheduledHours:s.scheduledHours|| 0,
  }));

  /* ── derived ── */
  const withStatus = subjects.map(s => ({ ...s, status: getStatus(s) }));
  const filtered   = filter === 'all' ? withStatus : withStatus.filter(s => s.status === filter);
  const issues     = withStatus.filter(s => s.status !== 'ok');

  const deptTotals = Object.entries(
    withStatus.reduce((acc, s) => { acc[s.department] = (acc[s.department] || 0) + s.scheduledHours; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxDept = Math.max(...deptTotals.map(d => d[1]), 1);

  /* ── CRUD (calls backend API) ── */
  function openAdd()  { setEditTarget(null); setModal('add');  toast.info('Fill in subject details', 'Info', 2500); }
  function openEdit(s){ setEditTarget(s);    setModal('edit'); toast.info(`Editing "${s.subjectName}"`, 'Info', 2500); }

  async function handleAdd(payload) {
    setSaving(true);
    try {
      await createSubject({ name: payload.name, department: payload.department, weeklyHours: payload.weeklyHours });
      toast.success(`"${payload.name}" added`, 'Success');
      await loadData();
    } catch (err) {
      toast.error(`Failed to add subject: ${err.message}`, 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(payload) {
    setSaving(true);
    try {
      await updateSubject(payload.subjectId, { name: payload.name, department: payload.department, weeklyHours: payload.weeklyHours });
      toast.success(`"${payload.name}" updated`, 'Success');
      await loadData();
    } catch (err) {
      toast.error(`Failed to update subject: ${err.message}`, 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteSubject(delId);
      setDelId(null);
      toast.success('Subject deleted', 'Success');
      await loadData();
    } catch (err) {
      toast.error(`Failed to delete subject: ${err.message}`, 'Error');
      setDelId(null);
    } finally {
      setSaving(false);
    }
  }

  /* modal data shape */
  const editSubjectForModal = editTarget
    ? {
        subjectId:   editTarget.subjectId,
        name:        editTarget.subjectName,
        department:  editTarget.department,
        weeklyHours: String(editTarget.weeklyHours),
      }
    : null;

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">
      <Toasts list={list} dismiss={dismiss} />

      {/* modals */}
      {modal === 'add' && (
        <SubjectModal mode="add" initial={EMPTY_FORM} existing={withStatus}
          onClose={() => setModal(null)} onSubmit={handleAdd} saving={saving} />
      )}
      {modal === 'edit' && editSubjectForModal && (
        <SubjectModal mode="edit" initial={editSubjectForModal} existing={withStatus}
          onClose={() => setModal(null)} onSubmit={handleUpdate} saving={saving} />
      )}

      {/* delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 text-xl"><FaTrash /></div>
              <div><h3 className="font-extrabold">Confirm Delete</h3><p className="text-xs text-muted mt-0.5">This action cannot be undone.</p></div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Delete subject <strong>"{subjects.find(s => s.subjectId === delId)?.subjectName || 'this subject'}"</strong> from the system?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50">Cancel</button>
              <button id="btn-confirm-delete" onClick={handleDelete} disabled={saving} className="px-5 py-2 text-xs font-extrabold rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40">
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="subj-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold">Subject Distribution</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => loadData(true)} className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 text-muted hover:bg-slate-200 transition-all" disabled={loading}>
            {loading ? <FaSpinner className="animate-spin-slow text-[10px]" /> : <FaSync className="text-[10px]" />} Sync
          </button>
          <button id="add-subject-btn" onClick={openAdd} className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-secondary to-violet-700 px-4 py-2 rounded-xl shadow-md hover:from-indigo-700 transition-all">
            <FaPlus className="text-[10px]" /> Add Subject
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">
        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Subject <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Distribution</span>
          </h1>
          <p className="text-muted text-lg">Subject allocation analytics — live data from backend.</p>
        </Reveal>

        {/* summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Subjects',   value: subjects.length,                                    color: 'text-secondary',   bg: 'bg-indigo-100' },
            { label: 'Scheduled',        value: withStatus.filter(s=>s.status==='ok').length,       color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Over-allocated',   value: withStatus.filter(s=>s.status==='over').length,     color: 'text-rose-500',    bg: 'bg-rose-100' },
            { label: 'Unscheduled',      value: withStatus.filter(s=>s.status==='unscheduled').length, color: 'text-amber-500', bg: 'bg-amber-100' },
          ].map((s,i) => (
            <Reveal key={s.label} delay={`${i*60}ms`}>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg flex-shrink-0`}><FaBookOpen /></div>
                <div>
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-muted mt-0.5">{s.label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* issues banner */}
        {issues.length > 0 && (
          <Reveal>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold text-rose-700 mb-3">
                <FaExclamationTriangle /> {issues.length} Subject{issues.length > 1 ? 's' : ''} Need Attention
              </div>
              <div className="space-y-1">
                {issues.map(s => (
                  <div key={s.subjectId} className="text-sm text-rose-600 flex items-center gap-2">
                    <span className="font-semibold">{s.subjectName}:</span>
                    {s.status === 'over'        && `Over-allocated by ${(s.scheduledHours - s.weeklyHours).toFixed(1)}h`}
                    {s.status === 'under'       && 'Under-allocated (<50% of weekly hours)'}
                    {s.status === 'unscheduled' && '0 hours scheduled in timetable'}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* dept chart */}
        <Reveal>
          <section className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold mb-1">Department-wise Allocation</h2>
            <p className="text-sm text-muted mb-5">Scheduled hours per department</p>
            <div className="space-y-3">
              {deptTotals.map(([dept, hrs]) => (
                <div key={dept} className="flex items-center gap-3">
                  <div className="w-52 text-xs font-semibold text-muted truncate flex-shrink-0">{dept}</div>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${DEPT_COLORS[dept] || 'bg-primary'} transition-all duration-700`} style={{ width: `${(hrs / maxDept) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-muted w-12 text-right">{hrs}h</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* subject list */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-extrabold">All Subjects</h2>
              <div className="flex flex-wrap gap-2">
                {['all','ok','over','under','unscheduled'].map(k => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter===k?'bg-secondary text-white border-secondary':'bg-white text-muted border-slate-200'}`}>
                    {k === 'all' ? 'All' : k === 'ok' ? 'OK' : k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-muted text-sm">No subjects match this filter.</div>
            ) : (
              <div className="grid gap-3">
                {filtered.map(s => {
                  const meta = STATUS_META[s.status];
                  const pct  = s.weeklyHours > 0 ? Math.min((s.scheduledHours / s.weeklyHours) * 100, 100) : 0;
                  const over = s.scheduledHours > s.weeklyHours;
                  return (
                    <div key={s.subjectId} className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 hover:shadow-lg transition-shadow">
                      <div className="flex flex-wrap items-start gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl ${DEPT_COLORS[s.department] || 'bg-primary'} flex items-center justify-center text-white text-xs flex-shrink-0`}><FaBookOpen /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm">{s.subjectName}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                          </div>
                          <div className="text-xs text-muted mt-0.5">{s.department}</div>
                        </div>
                        <span className={`text-xs font-bold ${over ? 'text-rose-500' : 'text-muted'}`}>{s.scheduledHours}h / {s.weeklyHours}h</span>
                        <div className="flex gap-1.5">
                          <button id={`edit-${s.subjectId}`} onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center" title="Edit"><FaEdit className="text-xs" /></button>
                          <button id={`del-${s.subjectId}`}  onClick={() => setDelId(s.subjectId)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center" title="Delete"><FaTrash className="text-xs" /></button>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-secondary to-accent'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {s.scheduledHours === 0 && <div className="mt-2 text-[11px] font-bold text-amber-500 flex items-center gap-1.5"><FaInfoCircle />Not yet scheduled in timetable</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>
      </main>

      <style>{`
        .reveal-on-scroll { opacity:0; transform:translateY(24px); transition:opacity .55s ease,transform .55s ease; }
        .reveal-on-scroll.is-visible { opacity:1; transform:translateY(0); }
        @keyframes sd-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes sd-spin { to{transform:rotate(360deg)} }
        .animate-spin-slow { animation: sd-spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
