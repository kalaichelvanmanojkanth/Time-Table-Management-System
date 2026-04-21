import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaPlus, FaSave, FaTimes, FaSync, FaSpinner,
  FaCalendarAlt, FaCheckCircle, FaExclamationTriangle,
  FaTimesCircle, FaInfoCircle, FaTrash,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import {
  fetchTeachers, fetchSubjects, fetchRooms,
  getSchedules, saveSchedule, deleteTimetable,
} from '../services/analyticsService';

/* ── toast ── */
const T_STYLE = {
  success: { bar: 'bg-emerald-500', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
  warning: { bar: 'bg-amber-400',   icon: 'text-amber-500',   ring: 'ring-amber-100'   },
  error:   { bar: 'bg-rose-500',    icon: 'text-rose-500',    ring: 'ring-rose-100'    },
  info:    { bar: 'bg-blue-500',    icon: 'text-blue-500',    ring: 'ring-blue-100'    },
};
const T_ICON = {
  success: <FaCheckCircle />, warning: <FaExclamationTriangle />,
  error:   <FaTimesCircle />, info:    <FaInfoCircle />,
};
function Toast({ t, onDismiss }) {
  const [show, setShow] = useState(false);
  const s = T_STYLE[t.type];
  useEffect(() => {
    const a = setTimeout(() => setShow(true), 10);
    const b = setTimeout(() => { setShow(false); setTimeout(() => onDismiss(t.id), 300); }, t.dur || 4000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <div role="alert" className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg ring-1 ${s.ring} px-4 pt-4 pb-3 min-w-[280px] max-w-[340px] overflow-hidden transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />
      <span className={`mt-0.5 flex-shrink-0 ${s.icon}`}>{T_ICON[t.type]}</span>
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-[10px] font-extrabold uppercase tracking-wide mb-0.5">{t.title}</p>}
        <p className="text-xs text-slate-600 leading-snug">{t.msg}</p>
      </div>
      <button onClick={() => { setShow(false); setTimeout(() => onDismiss(t.id), 300); }} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><FaTimes className="text-xs" /></button>
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.bar} origin-left`} style={{ animation: `ai-shrink ${t.dur || 4000}ms linear forwards` }} />
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
    error:   (m, t, d) => push('error',   m, t || 'Error',   d),
    info:    (m, t, d) => push('info',    m, t || 'Info',    d),
    warning: (m, t, d) => push('warning', m, t || 'Warning', d),
  }};
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const EMPTY_FORM = { teacherId: '', subjectId: '', roomId: '', day: '', startTime: '', endTime: '' };

export default function AISchedulingSetup() {
  const [teachers,  setTeachers]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [rooms,     setRooms]     = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [delId,     setDelId]     = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [showForm,  setShowForm]  = useState(false);
  const { list, dismiss, toast } = useToast();
  const formRef = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s, r, sc] = await Promise.all([
        fetchTeachers(), fetchSubjects(), fetchRooms(), getSchedules(),
      ]);
      setTeachers(t); setSubjects(s); setRooms(r); setSchedules(sc);
      toast.success(`Loaded ${t.length} teachers, ${s.length} subjects, ${r.length} rooms, ${sc.length} schedules`, 'Live Data', 4000);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load data', 'API Error', 5000);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function validate(f) {
    const e = {};
    if (!f.teacherId) e.teacherId = 'Select a teacher';
    if (!f.subjectId) e.subjectId = 'Select a subject';
    if (!f.roomId)    e.roomId    = 'Select a room';
    if (!f.day)       e.day       = 'Select a day';
    if (!f.startTime) e.startTime = 'Enter start time';
    if (!f.endTime)   e.endTime   = 'Enter end time';
    if (f.startTime && f.endTime && f.startTime >= f.endTime)
      e.endTime = 'End time must be after start time';
    return e;
  }

  async function handleSave() {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const entry = await saveSchedule(form);
      setSchedules(p => [entry, ...p]);
      setForm(EMPTY_FORM); setErrors({}); setShowForm(false);
      toast.success('Schedule entry saved successfully', 'Saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save schedule', 'Error', 5000);
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await deleteTimetable(id);
      setSchedules(p => p.filter(s => s._id !== id));
      setDelId(null);
      toast.success('Schedule entry deleted', 'Deleted');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete', 'Error', 5000);
    } finally { setSaving(false); }
  }

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(e => { const n={...e}; delete n[k]; return n; }); };
  const inputCls = k => `w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-all bg-white ${errors[k] ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-primary'}`;

  const getName = (arr, id, field = 'name') => arr.find(x => x._id === id)?.[field] || id;

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center space-y-4">
        <FaSpinner className="text-primary text-4xl mx-auto animate-spin" />
        <p className="text-muted font-semibold">Loading scheduling data…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">
      {/* toast layer */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {list.map(t => <div key={t.id} className="pointer-events-auto"><Toast t={t} onDismiss={dismiss} /></div>)}
      </div>

      {/* delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 text-xl"><FaTrash /></div>
              <div><h3 className="font-extrabold">Confirm Delete</h3><p className="text-xs text-muted mt-0.5">This action cannot be undone.</p></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(delId)} disabled={saving}
                className="px-5 py-2 text-xs font-extrabold rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40">
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="ai-setup-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold">AI Scheduling Setup</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={loadAll} className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 text-muted hover:bg-slate-200 transition-all">
            <FaSync className="text-[10px]" /> Sync
          </button>
          <button id="btn-add-schedule" onClick={() => { setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-sm">
            <FaPlus className="text-[10px]" /> Add Entry
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <HiSparkles /> Live Data
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* heading */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            AI Scheduling <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Setup</span>
          </h1>
          <p className="mt-2 text-muted text-lg">
            Build your timetable by adding scheduling entries. Each entry is saved to the live backend and used for conflict detection and AI optimisation.
          </p>
        </div>

        {/* summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Schedule Entries', value: schedules.length, color: 'text-primary' },
            { label: 'Teachers',         value: teachers.length,  color: 'text-indigo-500' },
            { label: 'Subjects',         value: subjects.length,  color: 'text-secondary' },
            { label: 'Rooms',            value: rooms.length,     color: 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 text-center hover:shadow-lg transition-shadow">
              <div className={`text-3xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs font-semibold text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* add-entry form */}
        {showForm && (
          <div ref={formRef} className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold flex items-center gap-2"><FaCalendarAlt className="text-primary" /> New Schedule Entry</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"><FaTimes className="text-xs" /></button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Teacher */}
              <div>
                <label className="text-xs font-bold text-muted mb-1 block">Teacher *</label>
                <select id="field-teacher" value={form.teacherId} onChange={e => set('teacherId', e.target.value)} className={inputCls('teacherId')}>
                  <option value="" disabled>Select Teacher</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
                {errors.teacherId && <p className="text-[10px] text-rose-500 mt-1">{errors.teacherId}</p>}
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-bold text-muted mb-1 block">Subject *</label>
                <select id="field-subject" value={form.subjectId} onChange={e => set('subjectId', e.target.value)} className={inputCls('subjectId')}>
                  <option value="" disabled>Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                {errors.subjectId && <p className="text-[10px] text-rose-500 mt-1">{errors.subjectId}</p>}
              </div>

              {/* Room */}
              <div>
                <label className="text-xs font-bold text-muted mb-1 block">Room *</label>
                <select id="field-room" value={form.roomId} onChange={e => set('roomId', e.target.value)} className={inputCls('roomId')}>
                  <option value="" disabled>Select Room</option>
                  {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
                {errors.roomId && <p className="text-[10px] text-rose-500 mt-1">{errors.roomId}</p>}
              </div>

              {/* Day */}
              <div>
                <label className="text-xs font-bold text-muted mb-1 block">Day *</label>
                <select id="field-day" value={form.day} onChange={e => set('day', e.target.value)} className={inputCls('day')}>
                  <option value="" disabled>Select Day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.day && <p className="text-[10px] text-rose-500 mt-1">{errors.day}</p>}
              </div>

              {/* Start Time */}
              <div>
                <label className="text-xs font-bold text-muted mb-1 block">Start Time *</label>
                <input id="field-start" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={inputCls('startTime')} />
                {errors.startTime && <p className="text-[10px] text-rose-500 mt-1">{errors.startTime}</p>}
              </div>

              {/* End Time */}
              <div>
                <label className="text-xs font-bold text-muted mb-1 block">End Time *</label>
                <input id="field-end" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className={inputCls('endTime')} />
                {errors.endTime && <p className="text-[10px] text-rose-500 mt-1">{errors.endTime}</p>}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50">Cancel</button>
              <button id="btn-save-entry" onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-40">
                {saving ? <FaSpinner className="animate-spin text-[10px]" /> : <FaSave className="text-[10px]" />}
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        )}

        {/* schedule list */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h2 className="text-xl font-extrabold">All Schedule Entries</h2>
            <span className="text-xs text-muted font-semibold">{schedules.length} entries loaded</span>
          </div>

          {schedules.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-muted">
              <FaCalendarAlt className="text-4xl text-slate-300" />
              <p className="font-semibold">No schedule entries yet.</p>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90">
                <FaPlus /> Add First Entry
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Teacher','Subject','Room','Day','Time','Actions'].map(h => (
                        <th key={h} className="text-left text-[10px] font-extrabold uppercase tracking-widest text-muted px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {schedules.map(sc => (
                      <tr key={sc._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{sc.teacherId?.name || getName(teachers, sc.teacherId)}</td>
                        <td className="px-4 py-3 text-xs text-muted">{sc.subjectId?.name || getName(subjects, sc.subjectId)}</td>
                        <td className="px-4 py-3 text-xs text-muted">{sc.roomId?.name || getName(rooms, sc.roomId)}</td>
                        <td className="px-4 py-3 text-xs font-semibold">{sc.day}</td>
                        <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{sc.startTime} – {sc.endTime}</td>
                        <td className="px-4 py-3">
                          <button id={`del-entry-${sc._id}`} onClick={() => setDelId(sc._id)}
                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors">
                            <FaTrash className="text-[10px]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* quick links */}
        <div className="grid sm:grid-cols-2 gap-4 pb-8">
          <Link to="/ai/conflict-detection" id="link-conflicts"
            className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <FaExclamationTriangle />
            </div>
            <div>
              <span className="font-bold text-sm text-navy">Conflict Detection</span>
              <p className="text-xs text-muted mt-0.5">Run AI conflict analysis on saved schedules</p>
            </div>
          </Link>
          <Link to="/ai/optimization" id="link-suggestions"
            className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <HiSparkles />
            </div>
            <div>
              <span className="font-bold text-sm text-navy">Optimisation Suggestions</span>
              <p className="text-xs text-muted mt-0.5">Get AI-powered scheduling recommendations</p>
            </div>
          </Link>
        </div>

      </main>

      <style>{`
        @keyframes ai-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
