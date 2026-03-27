import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaDoorOpen, FaExclamationTriangle, FaCheckCircle,
  FaTimes, FaTimesCircle, FaInfoCircle, FaPlus, FaEdit, FaTrash, FaSave,
  FaSpinner,
} from 'react-icons/fa';

/* ── Reveal hook ── */
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

/* ══ TOAST SYSTEM ══ */
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
    <div role="alert" className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg ring-1 ${s.ring} px-4 pt-4 pb-3 min-w-[280px] max-w-[340px] overflow-hidden transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
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

/* ══ CONSTANTS ══ */
const ROOM_TYPES = ['Classroom', 'Computer Lab', 'Physics Lab', 'Seminar Hall'];

const PEAK_TIMES = [
  { time: 'Mon 08:00', rooms: 5 },
  { time: 'Tue 09:00', rooms: 4 },
  { time: 'Wed 10:00', rooms: 7 },
  { time: 'Thu 09:00', rooms: 4 },
  { time: 'Fri 10:00', rooms: 3 },
];

const INITIAL_ROOMS = [
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

const EMPTY_FORM = { name: '', type: '', capacity: '', totalSlots: '', usedSlots: '', peak: '', isLab: false };

/* ── helpers ── */
function getRoomStatus(r) {
  const pct = r.totalSlots > 0 ? (r.usedSlots / r.totalSlots) * 100 : 0;
  if (r.capacity <= 0)   return 'invalid';
  if (r.usedSlots === 0) return 'unused';
  if (pct >= 100)        return 'overbooked';
  if (pct >= 70)         return 'high';
  return 'normal';
}

const ROOM_STATUS_META = {
  overbooked: { label: 'Overbooked', cls: 'bg-rose-100 text-rose-600 border border-rose-200' },
  high:       { label: 'High Usage', cls: 'bg-amber-100 text-amber-600 border border-amber-200' },
  unused:     { label: 'Unused',     cls: 'bg-slate-100 text-muted border border-slate-200' },
  normal:     { label: 'Normal',     cls: 'bg-emerald-100 text-emerald-600 border border-emerald-200' },
  invalid:    { label: 'Invalid',    cls: 'bg-rose-100 text-rose-600 border border-rose-200' },
};

/* ── Room form validation ── */
function validateRoomForm(form, rooms) {
  const e = {};
  if (!form.name.trim())                                                          e.name       = 'Room name is required';
  else if (rooms.some(r => r.id !== form.id && r.name.trim().toLowerCase() === form.name.trim().toLowerCase())) e.name = 'Duplicate room name not allowed';
  if (!form.type)                                                                 e.type       = 'Room type must be selected';
  if (!form.capacity || Number(form.capacity) <= 0)                              e.capacity   = 'Capacity must be greater than zero';
  if (!form.totalSlots || Number(form.totalSlots) <= 0)                          e.totalSlots = 'Total slots must be greater than zero';
  if (form.usedSlots === '' || Number(form.usedSlots) < 0)                       e.usedSlots  = 'Used slots cannot be negative';
  else if (form.totalSlots && Number(form.usedSlots) > Number(form.totalSlots))  e.usedSlots  = 'Used slots cannot exceed total slots';
  return e;
}

/* ── Global data validation ── */
function validateRooms(rooms) {
  const errors = [], warnings = [];
  if (!rooms || rooms.length === 0) { errors.push('No room data available'); return { errors, warnings }; }
  const noSlots    = rooms.filter(r => !r.totalSlots || r.totalSlots <= 0);
  if (noSlots.length)    errors.push(`Timetable data missing for: ${noSlots.map(r => r.name).join(', ')}`);
  const invalidCap = rooms.filter(r => !r.capacity || r.capacity <= 0);
  if (invalidCap.length) errors.push(`Invalid capacity detected: ${invalidCap.map(r => r.name).join(', ')}`);
  const noName = rooms.filter(r => !r.name || !r.name.trim());
  if (noName.length)     errors.push('Room name is required for all rooms');
  const noType = rooms.filter(r => !r.type || !r.type.trim());
  if (noType.length)     errors.push('Room type must be selected for all rooms');
  const names = rooms.map(r => r.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length)      errors.push(`Duplicate room names detected: ${[...new Set(dupes)].join(', ')}`);
  const overbooked = rooms.filter(r => getRoomStatus(r) === 'overbooked');
  overbooked.forEach(r => warnings.push({ msg: `Overbooked room detected: ${r.name} — all ${r.totalSlots} slots occupied`, type: 'overbooked', room: r.name }));
  const unused = rooms.filter(r => getRoomStatus(r) === 'unused');
  if (unused.length) warnings.push({ msg: `Unused room detected: ${unused.map(r => r.name).join(', ')}`, type: 'unused' });
  const nearFull = rooms.filter(r => { const pct = (r.usedSlots / r.totalSlots) * 100; return pct >= 80 && pct < 100; });
  if (nearFull.length) warnings.push({ msg: `Room nearing full capacity: ${nearFull.map(r => r.name).join(', ')}`, type: 'nearfull' });
  const peakSlot = PEAK_TIMES.reduce((a, b) => a.rooms > b.rooms ? a : b);
  warnings.push({ msg: `Peak usage: ${peakSlot.time} with ${peakSlot.rooms} rooms occupied simultaneously`, type: 'peak' });
  return { errors, warnings };
}

/* ══ ROOM MODAL (Add / Edit) ══ */
function RoomModal({ mode, initial, rooms, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const firstErrRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  // formReady: all required fields filled with plausible values
  const formReady = form.name.trim() && form.type &&
    form.capacity && Number(form.capacity) > 0 &&
    form.totalSlots && Number(form.totalSlots) > 0 &&
    form.usedSlots !== '' && Number(form.usedSlots) >= 0 &&
    Number(form.usedSlots) <= Number(form.totalSlots);

  const submit = () => {
    const errs = validateRoomForm(form, rooms);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setTimeout(() => firstErrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    setSaving(true);
    onSubmit({
      ...form,
      id: initial.id || Date.now(),
      capacity:   Number(form.capacity),
      totalSlots: Number(form.totalSlots),
      usedSlots:  Number(form.usedSlots),
    });
    setSaving(false);
    onClose();
  };

  const FieldErr = ({ k }) => errors[k]
    ? <p className="text-[10px] text-rose-500 mt-1 ru-fade-in flex items-center gap-1"><FaExclamationTriangle className="flex-shrink-0" />{errors[k]}</p>
    : null;

  const inputCls = (k) =>
    `w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-all duration-200 bg-white text-navy
    ${errors[k] ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-slate-200 focus:border-emerald-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="modal-title" className="font-extrabold text-navy text-lg">{mode === 'add' ? '+ Add Room' : '✎ Edit Room'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-muted transition-colors" aria-label="Close modal"><FaTimes /></button>
        </div>

        <p className="text-[11px] text-slate-400 mb-4">Changes update utilization charts automatically</p>

        <div className="space-y-3" ref={firstErrRef}>
          {/* Room Name */}
          <div>
            <label htmlFor="field-room-name" className="text-xs font-bold text-muted mb-1 block">Room Name *</label>
            <input
              id="field-room-name" placeholder="e.g. A101"
              value={form.name} onChange={e => set('name', e.target.value)}
              onBlur={e => set('name', e.target.value.trim())}
              className={inputCls('name')}
              ref={nameRef}
              aria-required="true"
            />
            <FieldErr k="name" />
          </div>

          {/* Room Type */}
          <div>
            <label htmlFor="field-room-type" className="text-xs font-bold text-muted mb-1 block">Room Type *</label>
            <select
              id="field-room-type"
              value={form.type} onChange={e => set('type', e.target.value)}
              className={inputCls('type')}
              aria-required="true"
            >
              <option value="" disabled>Select Room Type</option>
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.type
              ? <FieldErr k="type" />
              : <p className="text-[10px] text-slate-400 mt-1">Room type affects utilization analytics</p>
            }
          </div>

          {/* Capacity / Total Slots */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="field-capacity" className="text-xs font-bold text-muted mb-1 block">Capacity *</label>
              <input
                id="field-capacity" type="number" placeholder="e.g. 60" min="1"
                value={form.capacity} onChange={e => set('capacity', e.target.value)}
                onKeyDown={e => ['-', 'e', '+', '.'].includes(e.key) && e.preventDefault()}
                className={inputCls('capacity')}
                aria-required="true"
              />
              <FieldErr k="capacity" />
            </div>
            <div>
              <label htmlFor="field-total-slots" className="text-xs font-bold text-muted mb-1 block">Total Slots *</label>
              <input
                id="field-total-slots" type="number" placeholder="e.g. 10" min="1"
                value={form.totalSlots} onChange={e => set('totalSlots', e.target.value)}
                onKeyDown={e => ['-', 'e', '+', '.'].includes(e.key) && e.preventDefault()}
                className={inputCls('totalSlots')}
                aria-required="true"
              />
              <FieldErr k="totalSlots" />
            </div>
          </div>

          {/* Used Slots */}
          <div>
            <label htmlFor="field-used-slots" className="text-xs font-bold text-muted mb-1 block">Used Slots *</label>
            <input
              id="field-used-slots" type="number" placeholder="e.g. 8" min="0"
              value={form.usedSlots} onChange={e => set('usedSlots', e.target.value)}
              onKeyDown={e => ['-', 'e', '+', '.'].includes(e.key) && e.preventDefault()}
              className={inputCls('usedSlots')}
              aria-required="true"
            />
            <FieldErr k="usedSlots" />
          </div>

          {/* Peak Time (optional) */}
          <div>
            <label htmlFor="field-peak" className="text-xs font-bold text-muted mb-1 block">Peak Time <span className="font-normal">(optional)</span></label>
            <input
              id="field-peak" placeholder="e.g. Mon 08:00"
              value={form.peak} onChange={e => set('peak', e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 bg-white text-navy transition-all"
            />
          </div>

          {/* Lab checkbox */}
          <label htmlFor="field-is-lab" className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              id="field-is-lab"
              type="checkbox" checked={form.isLab}
              onChange={e => set('isLab', e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="text-xs font-bold text-muted">Mark as Lab</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-muted hover:bg-slate-50 transition-colors"
            aria-label="Cancel room changes">
            Cancel
          </button>
          <span title={!formReady ? 'Please fill all required fields' : ''} className="flex-1">
            <button
              id="btn-room-save"
              onClick={submit}
              disabled={!formReady || saving}
              className="w-full py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl shadow-md hover:from-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              aria-label={mode === 'add' ? 'Add room' : 'Save room changes'}
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave className="text-xs" />}
              {saving ? 'Saving...' : (mode === 'add' ? 'Add Room' : 'Save Changes')}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══ MAIN ══ */
export default function ResourceUtilization() {
  const [rooms, setRooms]             = useState(INITIAL_ROOMS);
  const [filter, setFilter]           = useState('all');
  const [dataLoaded, setDataLoaded]   = useState(false);
  const [utilGenerated, setUtilGenerated] = useState(false);
  const [modal, setModal]             = useState(null);   // null | 'add' | 'edit'
  const [editTarget, setEditTarget]   = useState(null);
  const [delId, setDelId]             = useState(null);
  const [generating, setGenerating]   = useState(false);
  const { list, dismiss, toast }      = useToast();

  /* ── derived (all reactive off `rooms`) ── */
  const noData     = rooms.length === 0;
  const issues     = rooms.filter(r => ['overbooked', 'unused', 'invalid'].includes(getRoomStatus(r)));
  const filtered   = filter === 'all' ? rooms : rooms.filter(r => getRoomStatus(r) === filter);
  const classrooms = rooms.filter(r => !r.isLab);
  const labs       = rooms.filter(r => r.isLab);
  const maxPeak    = Math.max(...PEAK_TIMES.map(p => p.rooms));

  const SUMMARY = [
    { label: 'Total Rooms',      value: String(rooms.length),                                           color: 'text-primary',     bg: 'bg-blue-100'    },
    { label: 'Occupied Now',     value: String(rooms.filter(r => r.usedSlots > 0).length),              color: 'text-secondary',   bg: 'bg-indigo-100'  },
    { label: 'Free Rooms',       value: String(rooms.filter(r => r.usedSlots === 0).length),            color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { label: 'Overbooked Rooms', value: String(rooms.filter(r => getRoomStatus(r) === 'overbooked').length), color: 'text-rose-500', bg: 'bg-rose-100' },
  ];

  /* ── on-mount ── */
  useEffect(() => {
    toast.info('Calculating resource utilization...', 2500);
    const t1 = setTimeout(() => {
      const { errors, warnings } = validateRooms(rooms);
      if (errors.length) { errors.forEach(e => toast.error(e, 5500)); return; }
      toast.success('Utilization data loaded', 3500);
      setDataLoaded(true);
      const t2 = setTimeout(() => {
        warnings.forEach((w, idx) => {
          setTimeout(() => {
            if (w.type === 'overbooked')  toast.warning(`Overbooked room detected — ${w.room} is fully booked`, 5000);
            else if (w.type === 'unused') toast.warning('Unused room detected — consider reassigning or closing', 5000);
            else if (w.type === 'nearfull') toast.warning('Room nearing full capacity — plan for overflow', 5000);
            else if (w.type === 'peak')   toast.warning(w.msg, 5000);
          }, idx * 700);
        });
      }, 800);
      return () => clearTimeout(t2);
    }, 1200);
    return () => clearTimeout(t1);
  }, []);

  /* ── CRUD ── */
  function openAdd() {
    setEditTarget(null);
    setModal('add');
    toast.info('Fill in the room details to add a new record', 3000);
  }
  function openEdit(r) {
    setEditTarget(r);
    setModal('edit');
    toast.info(`Editing "${r.name}"`, 3000);
  }
  function handleAdd(room) {
    setRooms(p => [...p, room]);
    toast.success('Room added successfully', 4000);
    // warn about new room status
    const st = getRoomStatus(room);
    if (st === 'overbooked') toast.warning('Overbooked room detected', 4500);
    else if (st === 'unused') toast.warning('Unused room detected', 4500);
  }
  function handleUpdate(room) {
    setRooms(p => p.map(r => r.id === room.id ? room : r));
    toast.success('Room updated successfully', 4000);
  }
  function confirmDelete(id) { setDelId(id); }
  function handleDelete() {
    setRooms(p => p.filter(r => r.id !== delId));
    setDelId(null);
    setUtilGenerated(false);
    toast.success('Room deleted successfully', 4000);
  }

  /* ── generate utilization ── */
  const handleGenerate = () => {
    if (noData) { toast.error('No rooms available — add rooms before generating', 4000); return; }
    if (!dataLoaded) { toast.error('Timetable data missing — cannot generate utilization report', 5000); return; }
    setGenerating(true);
    toast.info('Calculating resource utilization...', 2000);
    setTimeout(() => {
      const { errors, warnings } = validateRooms(rooms);
      setGenerating(false);
      if (errors.length) { errors.forEach(e => toast.error(e, 5000)); return; }
      setUtilGenerated(true);
      toast.success('Resource utilization calculated successfully', 4000);
      warnings.forEach((w, idx) => {
        setTimeout(() => {
          if (w.type === 'overbooked')  toast.warning(`Overbooked room detected — ${w.room}`, 5000);
          if (w.type === 'unused')      toast.warning('Unused room detected', 5000);
          if (w.type === 'nearfull')    toast.warning('Room nearing full capacity', 5000);
        }, idx * 600);
      });
    }, 1800);
  };

  /* ── filter ── */
  const handleFilter = (k) => {
    setFilter(k);
    if (k === 'overbooked') toast.warning('Overbooked rooms highlighted — all slots occupied', 4500);
    if (k === 'unused')     toast.warning('Unused rooms detected — consider reassigning or closing', 4500);
    if (k === 'high')       toast.warning('Room nearing full capacity — plan for potential overflow', 4000);
  };

  /* ── card classes ── */
  const roomCardCls = (r) => {
    const base = 'bg-white rounded-2xl border shadow-md p-5 hover:shadow-lg transition-all duration-200';
    const st = getRoomStatus(r);
    if (st === 'overbooked') return `${base} border-rose-300 ring-1 ring-rose-200`;
    if (st === 'unused')     return `${base} border-amber-200`;
    if (st === 'high')       return `${base} border-amber-100`;
    return `${base} border-slate-100`;
  };

  /* ══ RENDER ══ */
  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">
      <ToastContainer list={list} dismiss={dismiss} />

      {/* ── Room Add/Edit Modal ── */}
      {modal === 'add' && (
        <RoomModal
          mode="add" initial={EMPTY_FORM} rooms={rooms}
          onClose={() => setModal(null)} onSubmit={handleAdd}
        />
      )}
      {modal === 'edit' && editTarget && (
        <RoomModal
          mode="edit"
          initial={{
            id: editTarget.id, name: editTarget.name, type: editTarget.type,
            capacity: String(editTarget.capacity), totalSlots: String(editTarget.totalSlots),
            usedSlots: String(editTarget.usedSlots), peak: editTarget.peak || '', isLab: editTarget.isLab,
          }}
          rooms={rooms}
          onClose={() => setModal(null)}
          onSubmit={handleUpdate}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 ru-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 text-xl ru-warn-pulse">
                <FaExclamationTriangle />
              </div>
              <div>
                <h3 className="font-extrabold text-navy">Delete Room</h3>
                <p className="text-xs text-muted mt-0.5">This will permanently delete the room.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Are you sure you want to delete <strong>"{rooms.find(r => r.id === delId)?.name}"</strong>?
            </p>
            <p className="text-xs text-rose-500 font-semibold mb-5">⚠ This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} aria-label="Cancel delete" className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50 transition-colors">Cancel</button>
              <button id="btn-confirm-delete-room" onClick={handleDelete} aria-label="Confirm delete room"
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm">
                <FaTrash className="text-[10px]" /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="res-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold">Resource Utilization</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Add Room — disabled while modal open */}
          <button
            id="btn-add-room"
            onClick={openAdd}
            disabled={!!modal}
            aria-label="Add a new room"
            title={modal ? 'Close the current modal first' : 'Add a new room'}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaPlus className="text-[10px]" /> Add Room
          </button>
          {/* Generate Utilization */}
          <span title={noData ? 'Add rooms before generating utilization' : generating ? 'Calculation in progress…' : 'Generate utilization report'}>
            <button
              id="btn-generate-util"
              onClick={handleGenerate}
              disabled={noData || generating}
              aria-label="Generate resource utilization"
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${generating ? 'ru-pulse' : ''}`}
            >
              {generating
                ? <><FaSpinner className="animate-spin text-[10px]" /> Calculating…</>
                : <><FaCheckCircle className="text-[10px]" /> Generate Utilization</>
              }
            </button>
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* heading */}
        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mb-2">
            Resource <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Utilization</span>
          </h1>
          <p className="text-muted dark:text-slate-400 text-lg">Track classroom and lab usage, detect overbooked or unused rooms, and identify peak hours.</p>
        </Reveal>

        {/* banners */}
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

        {/* Summary cards — reactive */}
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

        {/* No-data empty state */}
        {noData && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <FaDoorOpen className="text-amber-400 text-4xl" />
            <div className="font-bold text-amber-700 dark:text-amber-300 text-lg">No rooms added yet</div>
            <div className="text-sm text-amber-600 dark:text-amber-400">Add rooms to view utilization analytics.</div>
            <button onClick={openAdd}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-all">
              <FaPlus className="text-[10px]" /> Add First Room
            </button>
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
                    {getRoomStatus(r) === 'overbooked' && 'Overbooked room detected — all slots occupied, check for conflicts'}
                    {getRoomStatus(r) === 'unused'     && 'Unused room detected — 0 slots occupied this week'}
                    {getRoomStatus(r) === 'invalid'    && 'Invalid capacity detected (≤ 0) — update room details'}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Classroom usage chart — reactive */}
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
              {classrooms.length === 0
                ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No classroom data available</div>
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

        {/* Lab utilization — reactive */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Lab Utilization</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Usage rate for computer and physics labs</p>
            {labs.length === 0
              ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No lab data available</div>
              : <div className="grid sm:grid-cols-3 gap-4">
                  {labs.map(r => {
                    const pct = Math.round((r.usedSlots / r.totalSlots) * 100);
                    const st  = getRoomStatus(r); const meta = ROOM_STATUS_META[st];
                    return (
                      <div key={r.id} className={`rounded-2xl border p-4 hover:shadow-md transition-shadow ${st === 'overbooked' ? 'border-rose-200 bg-rose-50/30' : st === 'unused' ? 'border-amber-200' : 'border-slate-100 dark:border-slate-700'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-navy dark:text-slate-100">{r.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <div className={`text-2xl font-extrabold mb-1 ${st === 'overbooked' ? 'text-rose-500' : st === 'unused' ? 'text-amber-500' : 'text-emerald-500'}`}>{pct}%</div>
                        <p className="text-xs text-muted dark:text-slate-400">{r.type} · Cap: {r.capacity}</p>
                        <p className="text-xs text-muted dark:text-slate-400">Peak: {r.peak || '—'}</p>
                        {r.usedSlots === 0 && <div className="mt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1"><FaExclamationTriangle />Unused room this week</div>}
                        {st === 'overbooked' && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1"><FaExclamationTriangle />Room already fully booked</div>}
                      </div>
                    );
                  })}
                </div>
            }
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
                {PEAK_TIMES.map(({ time, rooms: cnt }) => (
                  <div key={time} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-emerald-500">{cnt}</span>
                    <div className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-700 hover:opacity-80" style={{ height: `${(cnt / maxPeak) * 100}%`, minHeight: '8px' }} />
                    <span className="text-[9px] text-center text-muted dark:text-slate-400 font-semibold leading-tight">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* All Rooms list — CRUD enabled */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-extrabold text-navy dark:text-white">All Rooms</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { k: 'all',        l: 'All',        tip: 'Show all rooms'                          },
                  { k: 'overbooked', l: 'Overbooked',  tip: 'Rooms with all slots occupied'           },
                  { k: 'high',       l: 'High',        tip: 'Rooms nearing full capacity'             },
                  { k: 'normal',     l: 'Normal',       tip: 'Rooms with normal usage levels'         },
                  { k: 'unused',     l: 'Unused',       tip: 'Rooms not used this week'               },
                ].map(({ k, l, tip }) => (
                  <button key={k} id={`room-filter-${k}`} onClick={() => handleFilter(k)}
                    title={tip}
                    aria-label={`Filter: ${l} — ${tip}`}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 ${filter === k ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-muted dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0
              ? <div id="no-room-data" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center text-muted dark:text-slate-400 text-sm">No rooms match this filter.</div>
              : <div className="grid gap-3">
                  {filtered.map(r => {
                    const pct  = Math.round((r.usedSlots / r.totalSlots) * 100);
                    const st   = getRoomStatus(r); const meta = ROOM_STATUS_META[st];
                    const over = pct >= 100;
                    return (
                      <div key={r.id} id={`room-card-${r.id}`} className={roomCardCls(r)}>
                        <div className="flex flex-wrap items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm flex-shrink-0 ${st === 'overbooked' ? 'bg-gradient-to-br from-rose-500 to-rose-400' : st === 'unused' ? 'bg-gradient-to-br from-amber-400 to-amber-500' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}><FaDoorOpen /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-navy dark:text-slate-100 text-sm">{r.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`} title={meta.label}>{meta.label}</span>
                              {r.isLab && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200">Lab</span>}
                              {pct >= 80 && pct < 100 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200" title="Room nearing full capacity">Near Capacity</span>}
                            </div>
                            <div className="text-xs text-muted dark:text-slate-400 mt-0.5">{r.type} · Cap: {r.capacity} · Peak: {r.peak || '—'}</div>
                          </div>
                          <span className={`text-xs font-bold ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>{r.usedSlots}/{r.totalSlots} slots</span>
                          {/* Edit / Delete */}
                          <div className="flex gap-1.5">
                            <button id={`edit-room-${r.id}`} onClick={() => openEdit(r)}
                              className="w-8 h-8 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit Room">
                              <FaEdit className="text-xs" />
                            </button>
                            <button id={`del-room-${r.id}`} onClick={() => confirmDelete(r.id)}
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title="Delete Room">
                              <FaTrash className="text-xs" />
                            </button>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        {r.usedSlots === 0 && <div className="mt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Unused room — consider reassigning or closing</div>}
                        {over && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Overbooked room detected — all slots occupied, check for conflicts</div>}
                        {r.capacity <= 0 && <div className="mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5"><FaExclamationTriangle />Invalid capacity detected — update room record</div>}
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
        @keyframes ru-shrink    { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes ru-fade-in   { from{opacity:0;transform:translateY(-3px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ru-warn-pulse{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes ru-pulse-btn { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)} 70%{box-shadow:0 0 0 6px rgba(16,185,129,0)} }
        @keyframes spin         { to{transform:rotate(360deg)} }
        .ru-fade-in   { animation: ru-fade-in    0.22s ease forwards; }
        .ru-warn-pulse{ animation: ru-warn-pulse 1s ease-in-out 3; }
        .ru-pulse     { animation: ru-pulse-btn  1.2s ease-in-out infinite; }
        .animate-spin { animation: spin 0.7s linear infinite; }
      `}</style>
    </div>
  );
}
