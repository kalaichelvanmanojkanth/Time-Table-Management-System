import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaUserTie, FaBook, FaDoorOpen, FaCalendarAlt, FaClock,
  FaShieldAlt, FaPlus, FaTrash, FaSave, FaEdit, FaArrowRight,
  FaCogs,
} from 'react-icons/fa';
import { PageShell, Section, TagChip } from './AISchedulingIndex';

/* ── Constants ── */
const SETUP_KEY = 'ai_scheduling_setup';

const ALL_TEACHERS = [
  'Dr. Ramesh Kumar', 'Prof. Anita Singh', 'Dr. Suresh Menon',
  'Prof. Kavitha Nair', 'Dr. Arun Babu', 'Prof. Deepa Pillai',
  'Dr. Rajiv Sharma', 'Prof. Sunita Das', 'Dr. Priya Ramesh',
];
const ALL_SUBJECTS = [
  'Algorithms', 'Data Structures', 'Operating Systems', 'Networks',
  'Database Systems', 'Artificial Intelligence', 'Machine Learning',
  'Software Engineering', 'Mathematics III', 'Digital Circuits',
];
const ALL_ROOMS = [
  'A101', 'A102', 'B201', 'B202', 'C301', 'C302', 'D101', 'E201', 'Lab-01', 'Lab-02',
];
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EMPTY = {
  teachers: [],
  subjects: [],
  rooms: [],
  workingDays: [],
  timeSlots: 6,
  constraints: '',
};

/* ── Tag color maps ── */
const TAG_COLORS = {
  blue: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  violet: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
  cyan: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
};

export default function AISchedulingSetup() {
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);

  /* ── Load saved data (READ) ── */
  useEffect(() => {
    const raw = localStorage.getItem(SETUP_KEY);
    if (raw) {
      setForm(JSON.parse(raw));
      setSaved(true);
    }
  }, []);

  /* ── Add helpers ── */
  function addToList(field, value, color) {
    const v = (value || '').trim();
    if (!v) return;
    if (form[field].includes(v)) {
      toast.error('Duplicate entry detected');
      return;
    }
    setForm(f => ({ ...f, [field]: [...f[field], v] }));
  }

  function removeFromList(field, value) {
    setForm(f => ({ ...f, [field]: f[field].filter(i => i !== value) }));
  }

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter(d => d !== day)
        : [...f.workingDays, day],
    }));
  }

  /* ── Validate & Save (CREATE / UPDATE) ── */
  function handleSave() {
    if (form.teachers.length === 0) { toast.error('Please select teachers'); return; }
    if (form.subjects.length === 0) { toast.error('Please select subjects'); return; }
    if (form.rooms.length === 0) { toast.error('Please select classrooms'); return; }
    if (form.workingDays.length === 0) { toast.error('Working days required'); return; }
    if (!form.timeSlots || form.timeSlots <= 0) { toast.error('Time slots must be greater than zero'); return; }

    localStorage.setItem(SETUP_KEY, JSON.stringify(form));
    setSaved(true);
    setEditMode(false);
    toast.success('Setup saved successfully');
  }

  /* ── Reset / Clear ── */
  function handleReset() {
    localStorage.removeItem(SETUP_KEY);
    setForm(EMPTY);
    setSaved(false);
    setEditMode(false);
    toast.info('Setup cleared');
  }

  const isEditable = !saved || editMode;

  return (
    <PageShell
      title="AI Scheduling Setup"
      subtitle="Configure your scheduling data — teachers, subjects, rooms & constraints"
      icon={<FaCogs />}
      gradient="bg-gradient-to-r from-blue-700 to-indigo-700"
      breadcrumb="Setup"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 space-y-7">

        {/* Status banner */}
        {saved && !editMode && (
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-6 py-4">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
              <span className="text-xl">✓</span>
              <div>
                <div className="font-bold text-sm">Setup is saved</div>
                <div className="text-xs opacity-70">
                  {form.teachers.length} teachers · {form.subjects.length} subjects · {form.rooms.length} rooms · {form.workingDays.length} days
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                id="edit-setup-btn"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                <FaEdit /> Edit
              </button>
              <button
                id="reset-setup-btn"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-100 dark:bg-red-950/40 hover:bg-red-200 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs transition-colors"
              >
                <FaTrash /> Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Teachers ── */}
        <TeacherSection
          items={form.teachers}
          disabled={!isEditable}
          onAdd={v => addToList('teachers', v)}
          onRemove={v => removeFromList('teachers', v)}
        />

        {/* ── Subjects ── */}
        <SubjectSection
          items={form.subjects}
          disabled={!isEditable}
          onAdd={v => addToList('subjects', v)}
          onRemove={v => removeFromList('subjects', v)}
        />

        {/* ── Classrooms ── */}
        <RoomSection
          items={form.rooms}
          disabled={!isEditable}
          onAdd={v => addToList('rooms', v)}
          onRemove={v => removeFromList('rooms', v)}
        />

        {/* ── Working Days ── */}
        <Section icon={<FaCalendarAlt />} title="Working Days" gradient="bg-gradient-to-r from-emerald-600 to-emerald-700" badge={form.workingDays.length}>
          <div className="flex flex-wrap gap-3">
            {DAY_OPTIONS.map(day => (
              <button
                key={day}
                id={`day-${day.toLowerCase()}`}
                onClick={() => isEditable && toggleDay(day)}
                disabled={!isEditable}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  form.workingDays.includes(day)
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-[1.03]'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Time Slots ── */}
        <Section icon={<FaClock />} title="Daily Time Slots" gradient="bg-gradient-to-r from-amber-500 to-amber-600">
          <div className="flex items-center gap-4">
            <input
              id="time-slots-input"
              type="number"
              min="1"
              max="12"
              value={form.timeSlots}
              disabled={!isEditable}
              onChange={e => setForm(f => ({ ...f, timeSlots: Number(e.target.value) }))}
              className="w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none text-center disabled:opacity-50"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">slots per day (max 12)</span>
          </div>
        </Section>

        {/* ── Constraints ── */}
        <Section icon={<FaShieldAlt />} title="Scheduling Constraints" gradient="bg-gradient-to-r from-rose-500 to-rose-600">
          <textarea
            id="constraints-input"
            value={form.constraints}
            disabled={!isEditable}
            onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))}
            rows={3}
            placeholder="e.g. No teacher should have more than 3 consecutive classes..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none disabled:opacity-50"
          />
        </Section>

        {/* ── Action Buttons ── */}
        {isEditable && (
          <div className="flex items-center justify-between pt-2">
            <Link
              to="/ai-scheduling"
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Back
            </Link>
            <div className="flex gap-3">
              {editMode && (
                <button
                  onClick={() => { setEditMode(false); const raw = localStorage.getItem(SETUP_KEY); if (raw) setForm(JSON.parse(raw)); }}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                id="save-setup-btn"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-sm"
              >
                <FaSave /> {editMode ? 'Update Setup' : 'Save Setup'}
              </button>
            </div>
          </div>
        )}

        {/* Next step hint */}
        {saved && !editMode && (
          <div className="flex justify-end pt-2">
            <Link
              to="/ai-scheduling/conflicts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 text-sm"
            >
              Run Conflict Detection <FaArrowRight className="text-xs" />
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ── Teacher Section ── */
function TeacherSection({ items, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');
  return (
    <Section icon={<FaUserTie />} title="Teachers" gradient="bg-gradient-to-r from-blue-600 to-blue-800" badge={items.length}>
      <div className="flex gap-2 mb-4">
        <select
          id="teacher-select"
          value={sel}
          disabled={disabled}
          onChange={e => setSel(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
        >
          <option value="">— Select a teacher —</option>
          {ALL_TEACHERS.map(t => <option key={t}>{t}</option>)}
        </select>
        <button
          id="add-teacher-btn"
          disabled={disabled}
          onClick={() => { if (!sel) { toast.warning('Please select teachers'); return; } onAdd(sel); setSel(''); }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPlus /> Add
        </button>
      </div>
      {items.length === 0
        ? <p className="text-xs text-slate-400 italic">No teachers added yet.</p>
        : (
          <div className="flex flex-wrap gap-2">
            {items.map(t => (
              <TagChip key={t} label={t} onRemove={() => !disabled && onRemove(t)}
                colorClass="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" />
            ))}
          </div>
        )
      }
    </Section>
  );
}

/* ── Subject Section ── */
function SubjectSection({ items, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');
  return (
    <Section icon={<FaBook />} title="Subjects" gradient="bg-gradient-to-r from-violet-600 to-violet-800" badge={items.length}>
      <div className="flex gap-2 mb-4">
        <select
          id="subject-select"
          value={sel}
          disabled={disabled}
          onChange={e => setSel(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50"
        >
          <option value="">— Select a subject —</option>
          {ALL_SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          id="add-subject-btn"
          disabled={disabled}
          onClick={() => { if (!sel) { toast.warning('Please select subjects'); return; } onAdd(sel); setSel(''); }}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPlus /> Add
        </button>
      </div>
      {items.length === 0
        ? <p className="text-xs text-slate-400 italic">No subjects added yet.</p>
        : (
          <div className="flex flex-wrap gap-2">
            {items.map(s => (
              <TagChip key={s} label={s} onRemove={() => !disabled && onRemove(s)}
                colorClass="bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300" />
            ))}
          </div>
        )
      }
    </Section>
  );
}

/* ── Room Section ── */
function RoomSection({ items, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');
  return (
    <Section icon={<FaDoorOpen />} title="Classrooms" gradient="bg-gradient-to-r from-cyan-600 to-cyan-800" badge={items.length}>
      <div className="flex gap-2 mb-4">
        <select
          id="room-select"
          value={sel}
          disabled={disabled}
          onChange={e => setSel(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none disabled:opacity-50"
        >
          <option value="">— Select a classroom —</option>
          {ALL_ROOMS.map(r => <option key={r}>{r}</option>)}
        </select>
        <button
          id="add-room-btn"
          disabled={disabled}
          onClick={() => { if (!sel) { toast.warning('Please select classrooms'); return; } onAdd(sel); setSel(''); }}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPlus /> Add
        </button>
      </div>
      {items.length === 0
        ? <p className="text-xs text-slate-400 italic">No classrooms added yet.</p>
        : (
          <div className="flex flex-wrap gap-2">
            {items.map(r => (
              <TagChip key={r} label={r} onRemove={() => !disabled && onRemove(r)}
                colorClass="bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300" />
            ))}
          </div>
        )
      }
    </Section>
  );
}
