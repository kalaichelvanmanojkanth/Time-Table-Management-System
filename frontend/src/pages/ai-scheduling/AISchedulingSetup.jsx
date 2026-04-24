import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaUserTie, FaBook, FaDoorOpen, FaCalendarAlt, FaClock,
  FaShieldAlt, FaPlus, FaTrash, FaSave, FaEdit, FaArrowRight,
  FaCogs, FaInfoCircle, FaSpinner, FaDatabase, FaCheckCircle,
  FaExclamationTriangle, FaExclamationCircle, FaSync, FaRocket,
  FaUsers, FaLayerGroup, FaBuilding, FaChartBar,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { PageShell, Section, TagChip } from './AISchedulingIndex';
import {
  saveSchedule, saveAISetup, getLatestAISetup, seedTimetableFromSetup,
  getTeachers, getSubjects, getRooms, seedSampleResources,
} from '../../services/api';

/* ── Constants ── */
const SETUP_KEY  = 'ai_scheduling_setup';
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EMPTY = {
  teachers:    [],   // stores ObjectId strings
  subjects:    [],   // stores ObjectId strings
  rooms:       [],   // stores ObjectId strings
  workingDays: [],
  timeSlots:   6,
  constraints: '',
};

/* ── Helper: find name from DB list by id ── */
function nameById(list, id) {
  const found = list.find(item => item._id === id || item._id?.toString() === id);
  return found ? found.name : id; // fallback to raw id if not found
}

/* ══════════════════════════════════════════════
   LOADING SKELETON
══════════════════════════════════════════════ */
function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl w-full" />
      <div className="flex flex-wrap gap-2 pt-1">
        {[1,2,3].map(i => (
          <div key={i} className="h-7 w-24 bg-slate-100 dark:bg-slate-700 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════ */
function EmptyState({ icon: Icon, title, hint, link, linkLabel }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center">
      <span className="text-3xl opacity-25"><Icon /></span>
      <div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{hint}</p>
      </div>
      {link && (
        <Link
          to={link}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {linkLabel} <FaArrowRight className="text-[10px]" />
        </Link>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   SYSTEM SUMMARY CARD
══════════════════════════════════════════════ */
function SummaryCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-4 border ${color} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
      <div className="flex items-center gap-2">
        <span className="text-base opacity-70"><Icon /></span>
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <span className="text-2xl font-black leading-none">{value}</span>
      {subtext && <span className="text-[11px] opacity-60 leading-tight">{subtext}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN SETUP PAGE
══════════════════════════════════════════════ */
export default function AISchedulingSetup() {
  const navigate = useNavigate();

  /* ── Form state ── */
  const [form,      setForm]      = useState(EMPTY);
  const [saved,     setSaved]     = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [dbSynced,  setDbSynced]  = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [dbSeeded,  setDbSeeded]  = useState(false);

  /* ── DB resource state ── */
  const [dbTeachers, setDbTeachers] = useState([]);
  const [dbSubjects, setDbSubjects] = useState([]);
  const [dbRooms,    setDbRooms]    = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [seedingResources, setSeedingResources] = useState(false);

  /* ── Fetch teachers / subjects / rooms from MongoDB ──
     silent = true  → background poll: no spinner, no toasts
  */
  const fetchResources = useCallback(async (silent = false) => {
    if (!silent) setLoadingResources(true);
    try {
      const [tRes, sRes, rRes] = await Promise.all([
        getTeachers(), getSubjects(), getRooms(),
      ]);
      const teachers = tRes.data?.data || [];
      const subjects = sRes.data?.data || [];
      const rooms    = rRes.data?.data || [];
      console.log('[Setup] fetchResources:', teachers.length, 'teachers,', subjects.length, 'subjects,', rooms.length, 'rooms', silent ? '(background poll)' : '(manual)');
      setDbTeachers(teachers);
      setDbSubjects(subjects);
      setDbRooms(rooms);
    } catch (err) {
      console.warn('[Setup] fetchResources failed:', err.message);
      if (!silent) toast.warning('Could not load resources from database — check backend connection', { autoClose: 3000 });
    } finally {
      if (!silent) setLoadingResources(false);
    }
  }, []);

  /* ── Load saved setup on mount (localStorage → MongoDB fallback) ── */
  useEffect(() => {
    const raw = localStorage.getItem(SETUP_KEY);
    if (raw) {
      try {
        setForm(JSON.parse(raw));
        setSaved(true);
      } catch {
        localStorage.removeItem(SETUP_KEY);
        toast.error('Corrupted setup data cleared — please reconfigure');
      }
    } else {
      getLatestAISetup()
        .then(res => {
          const dbSetup = res.data?.data;
          if (dbSetup?.teachers?.length) {
            localStorage.setItem(SETUP_KEY, JSON.stringify(dbSetup));
            setForm(dbSetup);
            setSaved(true);
            setDbSynced(true);
            toast.info('📡 Setup restored from database', { autoClose: 2500 });
          }
        })
        .catch(() => { /* backend offline — normal on first run */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Initial resource load + 5-second auto-polling ── */
  useEffect(() => {
    fetchResources();

    const interval = setInterval(() => fetchResources(true), 5000);
    return () => clearInterval(interval);
  }, [fetchResources]);

  /* ── Seed sample data (first-time setup helper) ── */
  async function handleSeedSamples() {
    setSeedingResources(true);
    try {
      const res = await seedSampleResources();
      toast.success(res.data?.message || 'Sample data seeded to database ✓', { autoClose: 3000 });
      await fetchResources();
    } catch (err) {
      toast.error('Failed to seed sample data: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSeedingResources(false);
    }
  }

  /* ── Add ID to list (duplicate check) ── */
  function addToList(field, id) {
    if (!id) return;
    if (form[field].includes(id)) {
      toast.warning('Already added — duplicate entry detected');
      return;
    }
    setForm(f => ({ ...f, [field]: [...f[field], id] }));
    toast.success('Added successfully');
  }

  function removeFromList(field, id) {
    setForm(f => ({ ...f, [field]: f[field].filter(i => i !== id) }));
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
  async function handleSave() {
    if (form.teachers.length === 0)         { toast.error('Please select at least one teacher');              return; }
    if (form.subjects.length === 0)         { toast.error('Please select at least one subject');              return; }
    if (form.rooms.length === 0)            { toast.error('Please select at least one classroom');            return; }
    if (form.workingDays.length === 0)      { toast.error('Working days are required');                       return; }
    if (!form.timeSlots || form.timeSlots <= 0) { toast.error('Time slots must be greater than zero');         return; }
    if (form.timeSlots > 12)                { toast.error('Time slots cannot exceed 12');                     return; }

    setSaving(true);
    setDbSynced(false);

    // 1️⃣ localStorage (instant, offline-safe)
    localStorage.setItem(SETUP_KEY, JSON.stringify(form));
    setSaved(true);
    setEditMode(false);
    toast.success('Setup saved locally ✓');

    // 2️⃣ Persist to MongoDB AISetup collection
    try {
      await saveAISetup({
        teachers:    form.teachers,
        subjects:    form.subjects,
        rooms:       form.rooms,
        workingDays: form.workingDays,
        timeSlots:   form.timeSlots,
        constraints: form.constraints || '',
      });
      setDbSynced(true);
      toast.success('📡 Synced to MongoDB ✓', { autoClose: 2500 });
    } catch (aiSetupErr) {
      console.warn('[AISetup] saveAISetup failed:', aiSetupErr?.response?.data?.message || aiSetupErr.message);
      toast.warning('MongoDB sync failed — data saved locally only', { autoClose: 2500 });
    }

    // 3️⃣ Legacy Schedule collection (best-effort)
    try { await saveSchedule({ ...form, entries: [] }); } catch { /* intentionally silent */ }

    setSaving(false);
  }

  /* ── Reset / Clear ── */
  function handleReset() {
    localStorage.removeItem(SETUP_KEY);
    localStorage.removeItem('timetable_entries');
    setForm(EMPTY);
    setSaved(false);
    setEditMode(false);
    setDbSynced(false);
    setDbSeeded(false);
    toast.info('Setup cleared');
  }

  /* ── Generate / Seed timetable from setup ── */
  async function handleRegenerate() {
    if (!form.teachers.length)    { toast.error('Select at least one teacher before generating');     return; }
    if (!form.subjects.length)    { toast.error('Select at least one subject before generating');     return; }
    if (!form.rooms.length)       { toast.error('Select at least one classroom before generating');   return; }
    if (!form.workingDays.length) { toast.error('Select at least one working day');                   return; }
    if (!saved) { toast.warning('Save your setup first before generating the timetable');             return; }

    setReseeding(true);
    setDbSeeded(false);
    try {
      const res = await seedTimetableFromSetup();
      const count = res.data?.count ?? 0;
      setDbSeeded(true);
      toast.success(`🗓 Timetable generated — ${count} entries saved to MongoDB`, { autoClose: 3500 });
      // Navigate to conflict detection after short delay
      setTimeout(() => navigate('/ai-scheduling/conflicts'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Generation failed';
      toast.error(`Generate failed: ${msg}`);
    } finally {
      setReseeding(false);
    }
  }

  /* ── Smart setup health analysis ── */
  function getSetupHealth() {
    const warnings = [];
    const t = form.teachers.length;
    const s = form.subjects.length;
    const r = form.rooms.length;
    const d = form.workingDays.length;
    const ts = form.timeSlots;

    if (!t || !s || !r || !d) {
      return { status: 'incomplete', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', icon: FaExclamationTriangle, label: 'Incomplete Setup', warnings };
    }
    if (t < s) warnings.push(`⚠ Only ${t} teacher(s) for ${s} subject(s) — may cause scheduling gaps`);
    if (r < s) warnings.push(`⚠ Only ${r} room(s) for ${s} subject(s) — rooms may be overbooked`);
    if (ts < 4) warnings.push(`⚠ Only ${ts} time slot(s)/day — very limited scheduling capacity`);
    if (d < 3) warnings.push(`⚠ Only ${d} working day(s) — classes may be too concentrated`);

    if (warnings.length > 0) {
      return { status: 'warning', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', icon: FaExclamationCircle, label: 'Limited Resources', warnings };
    }
    return { status: 'ready', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: FaCheckCircle, label: 'Setup Ready', warnings };
  }

  const isEditable = !saved || editMode;
  const health = getSetupHealth();

  /* ── Check if all resources are empty (guide user to seed) ── */
  const allResourcesEmpty = !loadingResources && dbTeachers.length === 0 && dbSubjects.length === 0 && dbRooms.length === 0;

  return (
    <PageShell
      title="AI Scheduling Setup"
      subtitle="Configure your scheduling data — lecturers, subjects, rooms & constraints"
      icon={<FaCogs />}
      gradient="bg-gradient-to-r from-blue-700 to-indigo-700"
      breadcrumb="Setup"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 space-y-7">

        {/* ── No Database Resources Banner ── */}
        {allResourcesEmpty && (
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200 dark:border-indigo-700 rounded-2xl px-6 py-5">
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-indigo-600/5 rounded-full pointer-events-none" />
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <FaDatabase className="text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-indigo-800 dark:text-indigo-200 mb-0.5">No Resources in Database</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 leading-relaxed mb-3">
                  Your database has no teachers, subjects, or rooms yet. Seed sample academic data to get started instantly, or add records from the Admin panel.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSeedSamples}
                    disabled={seedingResources}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-md"
                  >
                    {seedingResources
                      ? <><FaSpinner className="animate-spin" /> Seeding…</>
                      : <><HiSparkles /> Seed Sample Data</>}
                  </button>
                  <button
                    onClick={fetchResources}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-semibold rounded-xl text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <FaSync /> Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Saved Status Banner ── */}
        {saved && !editMode && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-6 py-5 animate-[fadeIn_0.3s_ease]">
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 rounded-full pointer-events-none" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: status info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FaCheckCircle className="text-lg" />
                </div>
                <div>
                  <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 flex-wrap">
                    Setup Saved
                    {dbSynced && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full px-2.5 py-0.5">
                        <FaDatabase className="text-[8px]" /> MongoDB Synced
                      </span>
                    )}
                    {dbSeeded && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-0.5">
                        ✅ Timetable Generated
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 opacity-80">
                    {form.teachers.length} lecturer{form.teachers.length !== 1 ? 's' : ''} ·{' '}
                    {form.subjects.length} subject{form.subjects.length !== 1 ? 's' : ''} ·{' '}
                    {form.rooms.length} room{form.rooms.length !== 1 ? 's' : ''} ·{' '}
                    {form.workingDays.length} working day{form.workingDays.length !== 1 ? 's' : ''} ·{' '}
                    {form.timeSlots} slots/day
                  </div>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  id="regenerate-timetable-btn"
                  onClick={handleRegenerate}
                  disabled={reseeding}
                  title="Generate timetable entries in MongoDB from this setup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-md"
                >
                  {reseeding
                    ? <><FaSpinner className="animate-spin" /> Generating…</>
                    : dbSeeded
                      ? <><FaRocket /> Re-generate Timetable</>
                      : <><FaRocket /> Generate Timetable</>}
                </button>
                <button
                  id="edit-setup-btn"
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-md"
                >
                  <FaEdit /> Edit Setup
                </button>
                <button
                  id="reset-setup-btn"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.03] active:scale-95"
                >
                  <FaTrash /> Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── System Summary ── */}
        {saved && !editMode && (
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">System Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <SummaryCard
                icon={FaUsers}
                label="Lecturers"
                value={form.teachers.length}
                color="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                subtext="selected from DB"
              />
              <SummaryCard
                icon={FaBook}
                label="Subjects"
                value={form.subjects.length}
                color="bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-800 text-violet-700 dark:text-violet-300"
                subtext="selected from DB"
              />
              <SummaryCard
                icon={FaBuilding}
                label="Rooms"
                value={form.rooms.length}
                color="bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300"
                subtext="selected from DB"
              />
              <SummaryCard
                icon={FaCalendarAlt}
                label="Days"
                value={form.workingDays.length}
                color="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                subtext="per week"
              />
              <SummaryCard
                icon={FaClock}
                label="Slots/Day"
                value={form.timeSlots}
                color="bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                subtext={`${form.workingDays.length * form.timeSlots} total weekly`}
              />
            </div>
          </div>
        )}

        {/* ── Setup Health / Readiness ── */}
        {(form.teachers.length > 0 || form.subjects.length > 0 || form.rooms.length > 0) && (
          <div className={`rounded-2xl border px-5 py-4 ${health.bg} transition-all duration-200`}>
            <div className="flex items-start gap-3">
              <health.icon className={`text-lg mt-0.5 flex-shrink-0 ${health.color}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${health.color}`}>{health.label}</p>
                {health.warnings.length === 0 && health.status === 'ready' && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    All required resources are configured. You can save and generate a timetable.
                  </p>
                )}
                {health.status === 'incomplete' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Please complete all required sections before saving the setup.
                  </p>
                )}
                {health.warnings.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {health.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-orange-600 dark:text-orange-400 leading-relaxed">{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Teachers ── */}
        <TeacherSection
          items={form.teachers}
          dbTeachers={dbTeachers}
          loading={loadingResources}
          disabled={!isEditable}
          onAdd={id => addToList('teachers', id)}
          onRemove={id => removeFromList('teachers', id)}
        />

        {/* ── Subjects ── */}
        <SubjectSection
          items={form.subjects}
          dbSubjects={dbSubjects}
          loading={loadingResources}
          disabled={!isEditable}
          onAdd={id => addToList('subjects', id)}
          onRemove={id => removeFromList('subjects', id)}
        />

        {/* ── Classrooms ── */}
        <RoomSection
          items={form.rooms}
          dbRooms={dbRooms}
          loading={loadingResources}
          disabled={!isEditable}
          onAdd={id => addToList('rooms', id)}
          onRemove={id => removeFromList('rooms', id)}
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
          {form.workingDays.length === 0 && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-3 flex items-center gap-1.5">
              <FaExclamationTriangle /> Select at least one working day to continue
            </p>
          )}
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
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">slots per day</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">(max 12)</span>
              {form.timeSlots < 4 && (
                <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                  <FaExclamationTriangle /> Consider at least 5 slots for a balanced schedule
                </p>
              )}
            </div>
          </div>
          {form.workingDays.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1.5">
              <FaChartBar className="text-amber-400" />
              Total weekly slots: <strong className="text-amber-600 dark:text-amber-400 ml-1">{form.workingDays.length * form.timeSlots}</strong>
            </p>
          )}
        </Section>

        {/* ── Scheduling Constraints ── */}
        <Section
          icon={<FaShieldAlt />}
          title="Scheduling Constraints"
          gradient="bg-gradient-to-r from-rose-500 to-rose-600"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <FaInfoCircle className="text-rose-500 flex-shrink-0" />
            Specify any special restrictions the AI engine should respect
          </p>
          <textarea
            id="constraints-input"
            value={form.constraints}
            disabled={!isEditable}
            onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))}
            rows={4}
            placeholder={`Examples:\n• No lecturer should have more than 3 consecutive classes\n• Labs should be scheduled in the afternoon (after 13:00)\n• Avoid Saturday sessions for specific lecturers\n• Mathematics must not overlap with Computer Networks`}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none disabled:opacity-50 transition-all duration-200 leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            These constraints are stored but currently used as reference. Full constraint-based scheduling is available in the Optimization module.
          </p>
        </Section>

        {/* ── Action Buttons (edit mode) ── */}
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
                disabled={saving}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm"
              >
                {saving
                  ? <><FaSpinner className="animate-spin" /> Saving…</>
                  : <><FaSave /> {editMode ? 'Update Setup' : 'Save Setup'}</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Next Step CTA ── */}
        {saved && !editMode && (
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  <FaLayerGroup />
                </div>
                <div>
                  <p className="font-bold text-indigo-800 dark:text-indigo-200 text-sm">Next Step</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    {dbSeeded
                      ? 'Timetable generated — run conflict detection to validate your schedule'
                      : 'Generate the timetable first, then run conflict detection'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!dbSeeded && (
                  <button
                    onClick={handleRegenerate}
                    disabled={reseeding}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md"
                  >
                    {reseeding ? <><FaSpinner className="animate-spin" /> Generating…</> : <><FaRocket /> Generate Timetable</>}
                  </button>
                )}
                <Link
                  to="/ai-scheduling/conflicts"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md"
                >
                  Run Conflict Detection <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}

/* ══════════════════════════════════════════════
   TEACHER SECTION  (DB-driven)
══════════════════════════════════════════════ */
function TeacherSection({ items, dbTeachers, loading, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');

  function handleAdd() {
    if (!sel) { toast.warning('Please select a teacher first'); return; }
    onAdd(sel);
    setSel('');
  }

  const availableTeachers = dbTeachers.filter(t => !items.includes(t._id));

  return (
    <Section
      icon={<FaUserTie />}
      title="Lecturers / Teachers"
      gradient="bg-gradient-to-r from-blue-600 to-blue-800"
      badge={items.length}
    >
      {/* Helper text + manage link */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <FaInfoCircle className="text-blue-500 flex-shrink-0" />
          Select lecturers who will handle subjects in this timetable — sourced from database
        </p>
        <Link
          to="/teachers"
          className="flex-shrink-0 text-[11px] font-bold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors whitespace-nowrap"
        >
          Manage Teachers →
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : dbTeachers.length === 0 ? (
        <EmptyState
          icon={FaUserTie}
          title="No teachers found in database"
          hint="Add teachers from the Admin panel, or seed sample data above."
          link="/teachers"
          linkLabel="Go to Teacher Management"
        />
      ) : (
        <div className="flex gap-2 mb-4">
          <select
            id="teacher-select"
            value={sel}
            disabled={disabled || availableTeachers.length === 0}
            onChange={e => setSel(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 transition-all duration-200"
          >
            <option value="">
              {availableTeachers.length === 0 ? '— All teachers selected —' : '— Select a lecturer —'}
            </option>
            {availableTeachers.map(t => (
              <option key={t._id} value={t._id}>
                {t.name}{t.department ? ` (${t.department})` : ''}
              </option>
            ))}
          </select>
          <button
            id="add-teacher-btn"
            disabled={disabled || !sel}
            onClick={handleAdd}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md"
          >
            <FaPlus /> Add
          </button>
        </div>
      )}

      {items.length === 0 ? (
        !loading && dbTeachers.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-dashed border-blue-200 dark:border-blue-800 px-4 py-3">
            <FaUserTie className="text-blue-300 dark:text-blue-700 flex-shrink-0" />
            <span className="text-xs text-blue-500 dark:text-blue-400">No teachers selected yet. Use the dropdown above to add lecturers.</span>
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(id => (
            <div key={id} className="transition-all duration-200 hover:scale-[1.03]">
              <TagChip
                label={nameById(dbTeachers, id)}
                onRemove={() => !disabled && onRemove(id)}
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
   SUBJECT SECTION  (DB-driven)
══════════════════════════════════════════════ */
function SubjectSection({ items, dbSubjects, loading, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');

  function handleAdd() {
    if (!sel) { toast.warning('Please select a subject first'); return; }
    onAdd(sel);
    setSel('');
  }

  const availableSubjects = dbSubjects.filter(s => !items.includes(s._id));

  return (
    <Section
      icon={<FaBook />}
      title="Subjects"
      gradient="bg-gradient-to-r from-violet-600 to-violet-800"
      badge={items.length}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <FaInfoCircle className="text-violet-500 flex-shrink-0" />
          Select all subjects that need to be scheduled — sourced from database
        </p>
        <Link
          to="/subjects"
          className="flex-shrink-0 text-[11px] font-bold text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 hover:underline transition-colors whitespace-nowrap"
        >
          Manage Subjects →
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : dbSubjects.length === 0 ? (
        <EmptyState
          icon={FaBook}
          title="No subjects found in database"
          hint="Add subjects from the Admin panel, or seed sample data above."
          link="/subjects"
          linkLabel="Go to Subject Management"
        />
      ) : (
        <div className="flex gap-2 mb-4">
          <select
            id="subject-select"
            value={sel}
            disabled={disabled || availableSubjects.length === 0}
            onChange={e => setSel(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50 transition-all duration-200"
          >
            <option value="">
              {availableSubjects.length === 0 ? '— All subjects selected —' : '— Select a subject —'}
            </option>
            {availableSubjects.map(s => (
              <option key={s._id} value={s._id}>
                {s.name}{s.code ? ` [${s.code}]` : ''}
              </option>
            ))}
          </select>
          <button
            id="add-subject-btn"
            disabled={disabled || !sel}
            onClick={handleAdd}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md"
          >
            <FaPlus /> Add
          </button>
        </div>
      )}

      {items.length === 0 ? (
        !loading && dbSubjects.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-dashed border-violet-200 dark:border-violet-800 px-4 py-3">
            <FaBook className="text-violet-300 dark:text-violet-700 flex-shrink-0" />
            <span className="text-xs text-violet-500 dark:text-violet-400">No subjects selected yet. Use the dropdown above to add subjects.</span>
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(id => (
            <div key={id} className="transition-all duration-200 hover:scale-[1.03]">
              <TagChip
                label={nameById(dbSubjects, id)}
                onRemove={() => !disabled && onRemove(id)}
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
   ROOM SECTION  (DB-driven)
══════════════════════════════════════════════ */
function RoomSection({ items, dbRooms, loading, disabled, onAdd, onRemove }) {
  const [sel, setSel] = useState('');

  function handleAdd() {
    if (!sel) { toast.warning('Please select a classroom first'); return; }
    onAdd(sel);
    setSel('');
  }

  const availableRooms = dbRooms.filter(r => !items.includes(r._id));

  return (
    <Section
      icon={<FaDoorOpen />}
      title="Classrooms & Venues"
      gradient="bg-gradient-to-r from-cyan-600 to-cyan-800"
      badge={items.length}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <FaInfoCircle className="text-cyan-500 flex-shrink-0" />
          Choose classrooms, labs, and halls available for scheduling — sourced from database
        </p>
        <Link
          to="/rooms"
          className="flex-shrink-0 text-[11px] font-bold text-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline transition-colors whitespace-nowrap"
        >
          Manage Rooms →
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : dbRooms.length === 0 ? (
        <EmptyState
          icon={FaDoorOpen}
          title="No rooms found in database"
          hint="Add rooms from the Admin panel, or seed sample data above."
          link="/rooms"
          linkLabel="Go to Room Management"
        />
      ) : (
        <div className="flex gap-2 mb-4">
          <select
            id="room-select"
            value={sel}
            disabled={disabled || availableRooms.length === 0}
            onChange={e => setSel(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none disabled:opacity-50 transition-all duration-200"
          >
            <option value="">
              {availableRooms.length === 0 ? '— All rooms selected —' : '— Select a classroom —'}
            </option>
            {availableRooms.map(r => (
              <option key={r._id} value={r._id}>
                {r.name}{r.type ? ` — ${r.type}` : ''}{r.capacity ? ` (cap. ${r.capacity})` : ''}
              </option>
            ))}
          </select>
          <button
            id="add-room-btn"
            disabled={disabled || !sel}
            onClick={handleAdd}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95 shadow-sm hover:shadow-md"
          >
            <FaPlus /> Add
          </button>
        </div>
      )}

      {items.length === 0 ? (
        !loading && dbRooms.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-dashed border-cyan-200 dark:border-cyan-800 px-4 py-3">
            <FaDoorOpen className="text-cyan-300 dark:text-cyan-700 flex-shrink-0" />
            <span className="text-xs text-cyan-500 dark:text-cyan-400">No classrooms selected yet. Use the dropdown above to add venues.</span>
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(id => (
            <div key={id} className="transition-all duration-200 hover:scale-[1.03]">
              <TagChip
                label={nameById(dbRooms, id)}
                onRemove={() => !disabled && onRemove(id)}
                colorClass="bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 shadow-sm hover:shadow-cyan-100 dark:hover:shadow-cyan-900/20"
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
