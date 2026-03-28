import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaUserTie, FaBook, FaDoorOpen, FaCalendarAlt, FaClock,
  FaShieldAlt, FaPlus, FaTrash, FaSave, FaEdit, FaArrowRight,
  FaCogs, FaInfoCircle,
} from 'react-icons/fa';
import { PageShell, Section, TagChip } from './AISchedulingIndex';

/* ── Constants ── */
const SETUP_KEY = 'ai_scheduling_setup';

/* 🇱🇰 Sri Lankan / Sinhala-context academic staff */
const ALL_TEACHERS = [
  'Dr. Nimal Perera',
  'Prof. Anjali Silva',
  'Dr. Kasun Fernando',
  'Prof. Chamari Wijesinghe',
  'Dr. Supun Jayasinghe',
  'Prof. Dilani Perera',
  'Dr. Sanduni Fernando',
  'Prof. Ruwan Kumara',
  'Dr. Tharindu Silva',
];

/* 📚 Student-friendly subject labels */
const ALL_SUBJECTS = [
  'Algorithms & Problem Solving',
  'Data Structures',
  'Operating Systems',
  'Computer Networks',
  'Database Systems',
  'Artificial Intelligence (AI)',
  'Machine Learning',
  'Software Engineering',
  'Mathematics III',
  'Digital Circuits & Logic Design',
];

/* 🏫 Realistic room / venue names */
const ALL_ROOMS = [
  'A101 - Lecture Hall',
  'A102 - Lecture Hall',
  'B201 - Seminar Room',
  'B202 - Seminar Room',
  'B505 - Lecture Hall',
  'G1306 - Main Auditorium',
  'D101 - Tutorial Room',
  'E201 - Lecture Hall',
  'Computer Lab 01',
  'Computer Lab 02',
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

/* ══════════════════════════════════════════════
   MAIN SETUP PAGE
══════════════════════════════════════════════ */
export default function AISchedulingSetup() {
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);

  /* ── Load saved data on mount ── */
  useEffect(() => {
    const raw = localStorage.getItem(SETUP_KEY);
    if (raw) {
      setForm(JSON.parse(raw));
      setSaved(true);
    }
  }, []);

  /* ── Add to list with duplicate check ── */
  function addToList(field, value) {
    const v = (value || '').trim();
    if (!v) return;
    if (form[field].includes(v)) {
      toast.warning('Already added — duplicate entry detected');
      return;
    }
    setForm(f => ({ ...f, [field]: [...f[field], v] }));
    toast.success('Added successfully');
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

  /* ── Validate & Save ── */
  function handleSave() {
    if (form.teachers.length === 0)   { toast.error('Please add at least one teacher'); return; }
    if (form.subjects.length === 0)   { toast.error('Please add at least one subject'); return; }
    if (form.rooms.length === 0)      { toast.error('Please add at least one classroom'); return; }
    if (form.workingDays.length === 0){ toast.error('Working days are required'); return; }
    if (!form.timeSlots || form.timeSlots <= 0) { toast.error('Time slots must be greater than zero'); return; }

    localStorage.setItem(SETUP_KEY, JSON.stringify(form));
    setSaved(true);
    setEditMode(false);
    toast.success('Setup saved successfully ✓');
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
      subtitle="Configure your scheduling data — lecturers, subjects, rooms & constraints"
      icon={<FaCogs />}
      gradient="bg-gradient-to-r from-blue-700 to-indigo-700"
      breadcrumb="Setup"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 space-y-7">

        {/* ── Saved status banner ── */}
        {saved && !editMode && (
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-6 py-4 animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
              <span className="text-xl">✓</span>
              <div>
                <div className="font-bold text-sm">Setup is saved</div>
                <div className="text-xs opacity-70">
                  {form.teachers.length} lecturers · {form.subjects.length} subjects · {form.rooms.length} rooms · {form.workingDays.length} working days
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                id="edit-setup-btn"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.03] active:scale-95"
              >
                <FaEdit /> Edit
              </button>
              <button
                id="reset-setup-btn"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-100 dark:bg-red-950/40 hover:bg-red-200 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.03] active:scale-95"
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
        <Section
          icon={<FaCalendarAlt />}
          title="Working Days"
          gradient="bg-gradient-to-r from-emerald-600 to-emerald-700"
          badge={form.workingDays.length}
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <FaInfoCircle className="text-emerald-500 flex-shrink-0" />
            Select the days on which classes will be scheduled each week
          </p>
          <div className="flex flex-wrap gap-3">
            {DAY_OPTIONS.map(day => (
              <button
                key={day}
                id={`day-${day.toLowerCase()}`}
                onClick={() => isEditable && toggleDay(day)}
                disabled={!isEditable}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
                  form.workingDays.includes(day)
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40 scale-[1.03]'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Time Slots ── */}
        <Section
          icon={<FaClock />}
          title="Daily Time Slots"
          gradient="bg-gradient-to-r from-amber-500 to-amber-600"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <FaInfoCircle className="text-amber-500 flex-shrink-0" />
            Number of class periods per day — recommended range is 5–8 slots
          </p>
          <div className="flex items-center gap-4">
            <input
              id="time-slots-input"
              type="number"
              min="1"
              max="12"
              value={form.timeSlots}
              disabled={!isEditable}
              onChange={e => setForm(f => ({ ...f, timeSlots: Number(e.target.value) }))}
              className="w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none text-center disabled:opacity-50 transition-all duration-200"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">slots per day (max 12)</span>
          </div>
        </Section>

        {/* ── Scheduling Constraints ── */}
        <Section
          icon={<FaShieldAlt />}
          title="Scheduling Constraints"
          gradient="bg-gradient-to-r from-rose-500 to-rose-600"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <FaInfoCircle className="text-rose-500 flex-shrink-0" />
            Specify any special restrictions — e.g. no consecutive lectures for a lecturer
          </p>
          <textarea
            id="constraints-input"
            value={form.constraints}
            disabled={!isEditable}
            onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))}
            rows={3}
            placeholder="e.g. Dr. Nimal Perera should not have more than 3 consecutive classes. Lab sessions must be in the afternoon..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none disabled:opacity-50 transition-all duration-200"
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
                  onClick={() => {
                    setEditMode(false);
                    const raw = localStorage.getItem(SETUP_KEY);
                    if (raw) setForm(JSON.parse(raw));
                  }}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                id="save-setup-btn"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm"
              >
                <FaSave /> {editMode ? 'Update Setup' : 'Save Setup'}
              </button>
            </div>
          </div>
        )}

        {/* ── Next step hint ── */}
        {saved && !editMode && (
          <div className="flex justify-end pt-2">
            <Link
              to="/ai-scheduling/conflicts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:scale-95 text-sm"
            >
              Run Conflict Detection <FaArrowRight className="text-xs" />
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ══════════════════════════════════════════════
   TEACHER SECTION
══════════════════════════════════════════════ */
function TeacherSection({ items, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');

  function handleAdd() {
    if (!sel) { toast.warning('Please select a teacher first'); return; }
    onAdd(sel);
    setSel('');
  }

  return (
    <Section
      icon={<FaUserTie />}
      title="Lecturers / Teachers"
      gradient="bg-gradient-to-r from-blue-600 to-blue-800"
      badge={items.length}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
        <FaInfoCircle className="text-blue-500 flex-shrink-0" />
        Add the lecturers who will handle subjects in this timetable
      </p>
      <div className="flex gap-2 mb-4">
        <select
          id="teacher-select"
          value={sel}
          disabled={disabled}
          onChange={e => setSel(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 transition-all duration-200"
        >
          <option value="">— Select a lecturer —</option>
          {ALL_TEACHERS.map(t => (
            <option key={t} disabled={items.includes(t)}>{t}{items.includes(t) ? ' ✓' : ''}</option>
          ))}
        </select>
        <button
          id="add-teacher-btn"
          disabled={disabled}
          onClick={handleAdd}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md"
        >
          <FaPlus /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
          <FaUserTie className="opacity-40" />
          No teachers added yet. Please select and add lecturers above.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(t => (
            <div
              key={t}
              className="transition-all duration-200 hover:scale-[1.03]"
            >
              <TagChip
                label={t}
                onRemove={() => !disabled && onRemove(t)}
                colorClass="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm hover:shadow-blue-100 dark:hover:shadow-blue-900/20"
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ══════════════════════════════════════════════
   SUBJECT SECTION
══════════════════════════════════════════════ */
function SubjectSection({ items, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');

  function handleAdd() {
    if (!sel) { toast.warning('Please select a subject first'); return; }
    onAdd(sel);
    setSel('');
  }

  return (
    <Section
      icon={<FaBook />}
      title="Subjects"
      gradient="bg-gradient-to-r from-violet-600 to-violet-800"
      badge={items.length}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
        <FaInfoCircle className="text-violet-500 flex-shrink-0" />
        Select all subjects that need to be scheduled in this timetable
      </p>
      <div className="flex gap-2 mb-4">
        <select
          id="subject-select"
          value={sel}
          disabled={disabled}
          onChange={e => setSel(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50 transition-all duration-200"
        >
          <option value="">— Select a subject —</option>
          {ALL_SUBJECTS.map(s => (
            <option key={s} disabled={items.includes(s)}>{s}{items.includes(s) ? ' ✓' : ''}</option>
          ))}
        </select>
        <button
          id="add-subject-btn"
          disabled={disabled}
          onClick={handleAdd}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md"
        >
          <FaPlus /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
          <FaBook className="opacity-40" />
          No subjects added yet. Please select and add subjects above.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(s => (
            <div key={s} className="transition-all duration-200 hover:scale-[1.03]">
              <TagChip
                label={s}
                onRemove={() => !disabled && onRemove(s)}
                colorClass="bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 shadow-sm hover:shadow-violet-100 dark:hover:shadow-violet-900/20"
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ══════════════════════════════════════════════
   ROOM SECTION
══════════════════════════════════════════════ */
function RoomSection({ items, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');

  function handleAdd() {
    if (!sel) { toast.warning('Please select a classroom first'); return; }
    onAdd(sel);
    setSel('');
  }

  return (
    <Section
      icon={<FaDoorOpen />}
      title="Classrooms & Venues"
      gradient="bg-gradient-to-r from-cyan-600 to-cyan-800"
      badge={items.length}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
        <FaInfoCircle className="text-cyan-500 flex-shrink-0" />
        Choose the classrooms, labs, and halls available for scheduling
      </p>
      <div className="flex gap-2 mb-4">
        <select
          id="room-select"
          value={sel}
          disabled={disabled}
          onChange={e => setSel(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none disabled:opacity-50 transition-all duration-200"
        >
          <option value="">— Select a classroom —</option>
          {ALL_ROOMS.map(r => (
            <option key={r} disabled={items.includes(r)}>{r}{items.includes(r) ? ' ✓' : ''}</option>
          ))}
        </select>
        <button
          id="add-room-btn"
          disabled={disabled}
          onClick={handleAdd}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md"
        >
          <FaPlus /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
          <FaDoorOpen className="opacity-40" />
          No classrooms added yet. Please select and add venues above.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(r => (
            <div key={r} className="transition-all duration-200 hover:scale-[1.03]">
              <TagChip
                label={r}
                onRemove={() => !disabled && onRemove(r)}
                colorClass="bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 shadow-sm hover:shadow-cyan-100 dark:hover:shadow-cyan-900/20"
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
