import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaDoorOpen, FaExclamationTriangle, FaCheckCircle,
  FaTimes, FaTimesCircle, FaInfoCircle, FaPlus, FaEdit, FaTrash, FaSave, FaSync, FaSpinner,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

/* ── DEMO MODE: Pure dummy data – no backend required ── */

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
    const b = setTimeout(() => { setShow(false); setTimeout(() => onDismiss(t.id), 300); }, t.dur || 4000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const close = () => { setShow(false); setTimeout(() => onDismiss(t.id), 300); };
  return (
    <div role="alert" className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg ring-1 ${s.ring} px-4 pt-4 pb-3 min-w-[280px] max-w-[340px] overflow-hidden transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />
      <span className={`mt-0.5 flex-shrink-0 text-sm ${s.icon}`}>{T_ICON[t.type]}</span>
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-[10px] font-extrabold text-navy uppercase tracking-wide mb-0.5">{t.title}</p>}
        <p className="text-xs text-slate-600 leading-snug">{t.msg}</p>
      </div>
      <button onClick={close} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><FaTimes className="text-xs" /></button>
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.bar} origin-left`} style={{ animation: `ru-shrink ${t.dur || 4000}ms linear forwards` }} />
    </div>
  );
}
function ToastContainer({ list, dismiss }) {
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
  const toast = {
    success: (m, dur) => push('success', m, 'Success', dur),
    warning: (m, dur) => push('warning', m, 'Warning', dur),
    error:   (m, dur) => push('error',   m, 'Error',   dur),
    info:    (m, dur) => push('info',    m, 'Info',    dur),
  };
  return { list, dismiss, toast };
}

/* ── constants ── */
const ROOM_TYPES = ['Classroom', 'Computer Lab', 'Physics Lab', 'Seminar Hall'];
const EMPTY_FORM  = { name: '', type: '', capacity: '', status: 'available' };
const AVAILABLE_HRS = 40;

const ROOM_STATUS_META = {
  overbooked: { label: 'Overbooked', cls: 'bg-rose-100 text-rose-600 border border-rose-200' },
  high:       { label: 'High Usage', cls: 'bg-amber-100 text-amber-600 border border-amber-200' },
  unused:     { label: 'Unused',     cls: 'bg-slate-100 text-muted border border-slate-200' },
  normal:     { label: 'Normal',     cls: 'bg-emerald-100 text-emerald-600 border border-emerald-200' },
};

const CHART_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#fb7185', '#3b82f6',
];

function getRoomBarColor(status, utilization, index) {
  if (utilization >= 100 || status === 'overbooked') return '#ef4444';
  if (utilization >= 70  || status === 'high')       return '#f59e0b';
  if (status === 'unused')                           return '#cbd5e1';
  return CHART_COLORS[index % CHART_COLORS.length];
}

function computeStatus(utilization) {
  if (utilization >= 100) return 'overbooked';
  if (utilization >= 70)  return 'high';
  if (utilization === 0)  return 'unused';
  return 'normal';
}

/* ── room form validation ── */
function validateRoomForm(form, rooms) {
  const e = {};
  if (!form.name.trim())                              e.name     = 'Room name is required';
  else if (rooms.some(r => r.roomId !== form.roomId && r.roomName.trim().toLowerCase() === form.name.trim().toLowerCase())) e.name = 'Duplicate room name';
  if (!form.type)                                     e.type     = 'Room type is required';
  if (!form.capacity || Number(form.capacity) <= 0)   e.capacity = 'Capacity must be > 0';
  return e;
}

/* ── room modal ── */
function RoomModal({ mode, initial, rooms, onClose, onSubmit, saving }) {
  const [form, setForm]     = useState(initial);
  const [errors, setErrors] = useState({});
  const firstRef            = useRef(null);
  const nameRef             = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const n={...e}; delete n[k]; return n; }); };

  const formReady = form.name.trim() && form.type && form.capacity && Number(form.capacity) > 0;

  const submit = () => {
    const errs = validateRoomForm(form, rooms);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setTimeout(() => firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    onSubmit({ roomId: initial.roomId, name: form.name.trim(), type: form.type, capacity: Number(form.capacity), status: form.status || 'available' });
    onClose();
  };

  const inputCls = (k) => `w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-all bg-white ${errors[k] ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-emerald-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-navy text-lg">{mode === 'add' ? '+ Add Room' : '✎ Edit Room'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-muted"><FaTimes /></button>
        </div>
        <div className="space-y-3" ref={firstRef}>
          {/* name */}
          <div>
            <label className="text-xs font-bold text-muted mb-1 block">Room Name *</label>
            <input id="field-room-name" ref={nameRef} value={form.name} onChange={e => set('name', e.target.value)} onBlur={e => set('name', e.target.value.trim())} className={inputCls('name')} placeholder="e.g. A101" />
            {errors.name && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0" />{errors.name}</p>}
          </div>
          {/* type */}
          <div>
            <label className="text-xs font-bold text-muted mb-1 block">Room Type *</label>
            <select id="field-room-type" value={form.type} onChange={e => set('type', e.target.value)} className={inputCls('type')}>
              <option value="" disabled>Select Room Type</option>
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.type && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0" />{errors.type}</p>}
          </div>
          {/* capacity */}
          <div>
            <label className="text-xs font-bold text-muted mb-1 block">Capacity *</label>
            <input id="field-capacity" type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} onKeyDown={e => ['-','e','+','.'].includes(e.key) && e.preventDefault()} className={inputCls('capacity')} placeholder="e.g. 60" />
            {errors.capacity && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0" />{errors.capacity}</p>}
          </div>
          {/* status */}
          <div>
            <label className="text-xs font-bold text-muted mb-1 block">Status</label>
            <select id="field-status" value={form.status} onChange={e => set('status', e.target.value)} className={inputCls('status')}>
              {['available','maintenance','closed'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-muted hover:bg-slate-50">Cancel</button>
          <span className="flex-1">
            <button id="btn-room-save" onClick={submit} disabled={!formReady || saving}
              className="w-full py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl shadow-md hover:from-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
              {saving ? <FaSpinner className="animate-spin-slow" /> : <FaSave className="text-xs" />}
              {saving ? 'Saving…' : (mode === 'add' ? 'Add Room' : 'Save Changes')}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Dummy Data ── */
const DUMMY_ROOMS = [
  { roomId: 'r001', roomName: 'Lab 1',       roomType: 'Computer Lab',  capacity: 40, scheduledHours: 36, availableHours: AVAILABLE_HRS },
  { roomId: 'r002', roomName: 'Lab 2',       roomType: 'Computer Lab',  capacity: 40, scheduledHours: 28, availableHours: AVAILABLE_HRS },
  { roomId: 'r003', roomName: 'Room A101',   roomType: 'Classroom',     capacity: 60, scheduledHours: 20, availableHours: AVAILABLE_HRS },
  { roomId: 'r004', roomName: 'Room B202',   roomType: 'Classroom',     capacity: 50, scheduledHours: 40, availableHours: AVAILABLE_HRS },
  { roomId: 'r005', roomName: 'Auditorium',  roomType: 'Seminar Hall',  capacity: 200, scheduledHours: 0, availableHours: AVAILABLE_HRS },
  { roomId: 'r006', roomName: 'Physics Lab', roomType: 'Physics Lab',   capacity: 30, scheduledHours: 12, availableHours: AVAILABLE_HRS },
];

function enrichRooms(rooms) {
  return rooms.map(r => {
    const utilization = Math.min(Math.round((r.scheduledHours / r.availableHours) * 100), 100);
    return { ...r, utilization, status: computeStatus(utilization) };
  });
}

/* ── main ── */
export default function ResourceUtilization() {
  const [rooms,      setRooms]     = useState(enrichRooms(DUMMY_ROOMS));
  const [saving,     setSaving]    = useState(false);
  const [filter,     setFilter]    = useState('all');
  const [modal,      setModal]     = useState(null);
  const [editTarget, setEditTarget]= useState(null);
  const [delId,      setDelId]     = useState(null);
  const { list, dismiss, toast } = useToast();

  /* ── derived ── */
  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter);
  const issues   = rooms.filter(r => ['overbooked','unused'].includes(r.status));

  const SUMMARY = [
    { label: 'Total Rooms',      value: rooms.length,                                                                                   color: 'text-primary',     bg: 'bg-blue-100' },
    { label: 'Avg Utilization',  value: rooms.length ? Math.round(rooms.reduce((a,r)=>a+r.utilization,0)/rooms.length)+'%' : '0%',      color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Conflict Rooms',   value: 0,                                                                                              color: 'text-rose-500',    bg: 'bg-rose-100' },
    { label: 'Unused Rooms',     value: rooms.filter(r=>r.status==='unused').length,                                                    color: 'text-amber-500',   bg: 'bg-amber-100' },
  ];

  /* ── CRUD (local only) ── */
  function openAdd()  { setEditTarget(null); setModal('add');  toast.info('Fill in room details', 3000); }
  function openEdit(r){ setEditTarget(r);    setModal('edit'); toast.info(`Editing "${r.roomName}"`, 3000); }

  function handleAdd(payload) {
    const scheduled = Math.floor(Math.random() * AVAILABLE_HRS);
    const utilization = Math.min(Math.round((scheduled / AVAILABLE_HRS) * 100), 100);
    setRooms(p => [...p, {
      roomId: 'r' + Date.now(),
      roomName: payload.name,
      roomType: payload.type,
      capacity: payload.capacity,
      scheduledHours: scheduled,
      availableHours: AVAILABLE_HRS,
      utilization,
      status: computeStatus(utilization),
    }]);
    toast.success('Room added successfully', 4000);
  }

  function handleUpdate(payload) {
    setRooms(p => p.map(r => r.roomId === payload.roomId
      ? { ...r, roomName: payload.name, roomType: payload.type, capacity: payload.capacity }
      : r
    ));
    toast.success('Room updated successfully', 4000);
  }

  function handleDelete() {
    setRooms(p => p.filter(r => r.roomId !== delId));
    setDelId(null);
    toast.success('Room deleted successfully', 4000);
  }

  const handleFilter = (k) => {
    setFilter(k);
    if (k === 'overbooked') toast.warning('Overbooked rooms — all slots occupied', 4000);
    if (k === 'unused')     toast.warning('Unused rooms — 0 hours scheduled', 4000);
  };

  const roomCardCls = (r) => {
    const base = 'bg-white rounded-2xl border shadow-md p-5 hover:shadow-lg transition-all duration-200';
    if (r.status === 'overbooked') return `${base} border-rose-300 ring-1 ring-rose-200`;
    if (r.status === 'unused')     return `${base} border-amber-200`;
    return `${base} border-slate-100`;
  };

  const editRoomForModal = editTarget
    ? { roomId: editTarget.roomId, name: editTarget.roomName, type: editTarget.roomType, capacity: String(editTarget.capacity), status: 'available' }
    : null;

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">
      <ToastContainer list={list} dismiss={dismiss} />

      {/* modals */}
      {modal === 'add' && (
        <RoomModal mode="add" initial={EMPTY_FORM} rooms={rooms} onClose={() => setModal(null)} onSubmit={handleAdd} saving={saving} />
      )}
      {modal === 'edit' && editRoomForModal && (
        <RoomModal mode="edit" initial={editRoomForModal} rooms={rooms} onClose={() => setModal(null)} onSubmit={handleUpdate} saving={saving} />
      )}

      {/* delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 text-xl"><FaExclamationTriangle /></div>
              <div><h3 className="font-extrabold">Delete Room</h3><p className="text-xs text-muted mt-0.5">This action cannot be undone.</p></div>
            </div>
            <p className="text-sm text-slate-600 mb-1">Delete <strong>"{rooms.find(r=>r.roomId===delId)?.roomName}"</strong>?</p>
            <p className="text-xs text-rose-500 font-semibold mb-5">⚠ This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50">Cancel</button>
              <button id="btn-confirm-delete-room" onClick={handleDelete} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm disabled:opacity-40">
                <FaTrash className="text-[10px]" /> {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="res-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold">Resource Utilization</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={() => {}} className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 text-muted hover:bg-slate-200 transition-all">
            <FaSync className="text-[10px]" /> Sync
          </button>
          <button id="btn-add-room" onClick={openAdd} disabled={!!modal}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-40">
            <FaPlus className="text-[10px]" /> Add Room
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Resource <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Utilization</span>
          </h1>
          <p className="text-muted text-lg">Room scheduling data — detect underutilized spaces and optimize allocations.</p>
        </Reveal>

        {/* summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY.map((s,i) => (
            <Reveal key={s.label} delay={`${i*60}ms`}>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg flex-shrink-0`}><FaDoorOpen /></div>
                <div>
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-muted mt-0.5">{s.label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* issues */}
        {issues.length > 0 && (
          <Reveal>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold text-rose-700 mb-3">
                <FaExclamationTriangle /> {issues.length} Room{issues.length > 1 ? 's' : ''} Need Attention
              </div>
              {issues.map(r => (
                <div key={r.roomId} className="text-sm text-rose-600 flex items-center gap-2">
                  <span className="font-semibold">{r.roomName}:</span>
                  {r.status === 'overbooked' && 'Overbooked — 100% utilization'}
                  {r.status === 'unused'     && 'Unused — 0 hours scheduled'}
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* utilization bar chart */}
        <Reveal>
          <section className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold mb-1">Room Utilization</h2>
            <p className="text-sm text-muted mb-5">
              Scheduled hours ÷ {AVAILABLE_HRS}h available per week
            </p>
            <div className="space-y-3">
              {rooms.map((r, i) => {
                const barColor = getRoomBarColor(r.status, r.utilization, i);
                return (
                  <div key={r.roomId} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-bold text-muted flex-shrink-0">{r.roomName}</div>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${r.utilization}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${r.utilization >= 100 ? 'text-rose-500' : 'text-muted'}`}>{r.utilization}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>

        {/* all rooms */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-extrabold">All Rooms</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { k:'all',        l:'All'        },
                  { k:'overbooked', l:'Overbooked' },
                  { k:'high',       l:'High'       },
                  { k:'normal',     l:'Normal'     },
                  { k:'unused',     l:'Unused'     },
                ].map(({ k, l }) => (
                  <button key={k} id={`room-filter-${k}`} onClick={() => handleFilter(k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter===k?'bg-emerald-600 text-white border-emerald-600 shadow-sm':'bg-white text-muted border-slate-200 hover:border-emerald-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div id="no-room-data" className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-muted text-sm">No rooms match this filter.</div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((r, idx) => {
                  const meta = ROOM_STATUS_META[r.status] || ROOM_STATUS_META.normal;
                  return (
                    <div key={r.roomId} id={`room-card-${r.roomId}`} className={roomCardCls(r)}>
                      <div className="flex flex-wrap items-start gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm flex-shrink-0"
                          style={{ backgroundColor: getRoomBarColor(r.status, r.utilization, idx) }}
                        >
                          <FaDoorOpen />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm">{r.roomName}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                          </div>
                          <div className="text-xs text-muted mt-0.5">{r.roomType} · Cap: {r.capacity} · {r.scheduledHours}h / {r.availableHours}h</div>
                        </div>
                        <span className={`text-xs font-bold ${r.utilization>=100?'text-rose-500':'text-muted'}`}>{r.utilization}%</span>
                        <div className="flex gap-1.5">
                          <button id={`edit-room-${r.roomId}`} onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center" title="Edit"><FaEdit className="text-xs" /></button>
                          <button id={`del-room-${r.roomId}`}  onClick={() => setDelId(r.roomId)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center" title="Delete"><FaTrash className="text-xs" /></button>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(r.utilization,100)}%`, backgroundColor: getRoomBarColor(r.status, r.utilization, idx) }}
                        />
                      </div>
                      {r.status === 'unused'     && <div className="mt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Unused — consider reassigning or closing</div>}
                      {r.status === 'overbooked' && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Overbooked — all slots occupied</div>}
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
        @keyframes ru-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes ru-spin { to{transform:rotate(360deg)} }
        .animate-spin-slow { animation: ru-spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
