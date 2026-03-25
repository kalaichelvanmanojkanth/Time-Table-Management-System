import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaExclamationTriangle, FaCheckCircle, FaUserTie, FaDoorOpen,
  FaBook, FaClock, FaShieldAlt, FaTrash, FaSearch,
} from 'react-icons/fa';
import { PageShell } from './AISchedulingIndex';

const SETUP_KEY = 'ai_scheduling_setup';
const CONFLICTS_KEY = 'ai_detected_conflicts';

/* ── Sample timetable generator used for demo conflict simulation ── */
const SLOT_HOURS = Array.from({ length: 8 }, (_, i) => `${8 + i}:00`);

function buildDemoTimetable(setup) {
  const { teachers, subjects, rooms, workingDays } = setup;
  const data = {};
  workingDays.forEach(day => {
    data[day] = {};
    const n = Math.min(subjects.length, 4);
    for (let i = 0; i < n; i++) {
      const slot = SLOT_HOURS[i];
      data[day][slot] = {
        subject: subjects[i % subjects.length],
        teacher: teachers[i % teachers.length],
        room: rooms[i % rooms.length],
      };
    }
  });
  return data;
}

/* ── Conflict detection logic ── */
function detectAll(timetable, setup) {
  const conflicts = [];

  /* teacher across same slot on different days */
  const teacherSlotMap = {};
  Object.entries(timetable).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([slot, cell]) => {
      const key = `${cell.teacher}__${slot}`;
      if (teacherSlotMap[key]) {
        conflicts.push({
          id: `tc_${day}_${slot}`,
          type: 'teacher',
          severity: 'high',
          message: 'Teacher conflict detected',
          detail: `${cell.teacher} is double-scheduled at ${slot} on ${teacherSlotMap[key]} and ${day}`,
          icon: '👤',
        });
      } else { teacherSlotMap[key] = day; }
    });
  });

  /* room double-booking same day+slot */
  const roomMap = {};
  Object.entries(timetable).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([slot, cell]) => {
      const key = `${cell.room}__${day}__${slot}`;
      if (roomMap[key]) {
        conflicts.push({
          id: `rc_${day}_${slot}_${cell.room}`,
          type: 'room',
          severity: 'high',
          message: 'Room conflict detected',
          detail: `Room ${cell.room} is double-booked at ${slot} on ${day}`,
          icon: '🚪',
        });
      } else { roomMap[key] = true; }
    });
  });

  /* subject appearing too many times in a week */
  const subjectCount = {};
  Object.values(timetable).forEach(slots =>
    Object.values(slots).forEach(cell => { subjectCount[cell.subject] = (subjectCount[cell.subject] || 0) + 1; })
  );
  Object.entries(subjectCount).forEach(([subj, cnt]) => {
    if (cnt > 4) {
      conflicts.push({
        id: `so_${subj}`,
        type: 'subject',
        severity: 'medium',
        message: 'Subject overlap found',
        detail: `${subj} is scheduled ${cnt} times this week — exceeds recommended 4 sessions`,
        icon: '📚',
      });
    }
  });

  /* heavy day — 4+ back-to-back slots */
  Object.entries(timetable).forEach(([day, slots]) => {
    if (Object.keys(slots).length >= 4) {
      conflicts.push({
        id: `ts_${day}`,
        type: 'timeslot',
        severity: 'low',
        message: 'Time slot density high',
        detail: `${day} has ${Object.keys(slots).length} classes — consider redistribution`,
        icon: '⏰',
      });
    }
  });

  return conflicts;
}

const SEV = {
  high: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  medium: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  low: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
};
const BADGE = {
  high: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  medium: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  low: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
};

export default function ConflictDetection() {
  const [conflicts, setConflicts] = useState([]);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState('all');
  const [hasSetup, setHasSetup] = useState(false);

  /* READ persisted conflicts */
  useEffect(() => {
    const setupRaw = localStorage.getItem(SETUP_KEY);
    setHasSetup(!!setupRaw);
    const saved = localStorage.getItem(CONFLICTS_KEY);
    if (saved) {
      setConflicts(JSON.parse(saved));
      setScanned(true);
    }
  }, []);

  /* CREATE — run scan */
  async function runScan() {
    const setupRaw = localStorage.getItem(SETUP_KEY);
    if (!setupRaw) { toast.error('No timetable data available'); return; }
    setScanning(true);
    setConflicts([]);
    await new Promise(r => setTimeout(r, 1000));

    const setup = JSON.parse(setupRaw);
    const timetable = buildDemoTimetable(setup);
    const found = detectAll(timetable, setup);

    /* De-duplicate by id (prevent duplicate entries) */
    const unique = found.filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx);

    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(unique));
    setConflicts(unique);
    setScanned(true);
    setScanning(false);

    if (unique.length === 0) {
      toast.success('No conflicts detected');
    } else {
      if (unique.some(c => c.type === 'teacher')) toast.error('Teacher conflict detected');
      if (unique.some(c => c.type === 'room'))    toast.error('Room conflict detected');
      if (unique.some(c => c.type === 'subject')) toast.warning('Subject overlap found');
    }
  }

  /* DELETE — resolve individual conflict */
  function resolveConflict(id) {
    const updated = conflicts.filter(c => c.id !== id);
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(updated));
    setConflicts(updated);
    toast.success('Conflict resolved successfully');
  }

  /* DELETE — clear all */
  function clearAll() {
    localStorage.removeItem(CONFLICTS_KEY);
    setConflicts([]);
    setScanned(false);
    toast.info('All conflicts cleared');
  }

  const filtered = filter === 'all' ? conflicts : conflicts.filter(c => c.type === filter);

  const counts = {
    all: conflicts.length,
    teacher: conflicts.filter(c => c.type === 'teacher').length,
    room: conflicts.filter(c => c.type === 'room').length,
    subject: conflicts.filter(c => c.type === 'subject').length,
    timeslot: conflicts.filter(c => c.type === 'timeslot').length,
  };

  return (
    <PageShell
      title="Conflict Detection"
      subtitle="Detect and resolve teacher, room, subject, and time slot conflicts"
      icon={<FaExclamationTriangle />}
      gradient="bg-gradient-to-r from-amber-600 to-orange-600"
      breadcrumb="Conflicts"
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">

        {/* No setup warning */}
        {!hasSetup && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">Setup Required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">Complete the AI Scheduling Setup before running conflict detection.</p>
              <Link to="/ai-scheduling/setup" className="text-sm font-bold text-amber-700 dark:text-amber-300 hover:underline">→ Go to Setup</Link>
            </div>
          </div>
        )}

        {/* Icon summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <FaUserTie />, label: 'Teacher Conflicts', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', count: counts.teacher },
            { icon: <FaDoorOpen />, label: 'Room Conflicts', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', count: counts.room },
            { icon: <FaBook />, label: 'Subject Overlaps', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', count: counts.subject },
            { icon: <FaClock />, label: 'Time Slot Issues', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', count: counts.timeslot },
          ].map(({ icon, label, color, bg, count }) => (
            <div key={label} className={`${bg} rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center`}>
              <div className={`text-2xl ${color} flex justify-center mb-1`}>{icon}</div>
              {scanned && <div className={`text-xl font-extrabold ${color} mb-0.5`}>{count}</div>}
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            id="scan-conflicts-btn"
            onClick={runScan}
            disabled={!hasSetup || scanning}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-base"
          >
            {scanning
              ? <><FaSearch className="animate-bounce" /> Scanning...</>
              : <><FaShieldAlt /> Run Conflict Scan</>}
          </button>
          {scanned && conflicts.length > 0 && (
            <button
              id="clear-conflicts-btn"
              onClick={clearAll}
              className="inline-flex items-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold rounded-2xl transition-colors text-sm"
            >
              <FaTrash /> Clear All
            </button>
          )}
        </div>

        {/* Results */}
        {scanned && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
            {/* Summary bar */}
            <div className={`px-6 py-4 flex items-center gap-3 ${conflicts.length === 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/30'}`}>
              {conflicts.length === 0
                ? <FaCheckCircle className="text-emerald-500 text-xl flex-shrink-0" />
                : <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0" />}
              <div>
                <div className={`font-bold text-base ${conflicts.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {conflicts.length === 0 ? 'No conflicts detected' : `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} found`}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Scan complete</div>
              </div>
            </div>

            {conflicts.length > 0 && (
              <>
                {/* Filter tabs */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'teacher', label: 'Teachers' },
                    { key: 'room', label: 'Rooms' },
                    { key: 'subject', label: 'Subjects' },
                    { key: 'timeslot', label: 'Time Slots' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      id={`conflict-filter-${key}`}
                      onClick={() => setFilter(key)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        filter === key
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                      }`}
                    >
                      {label}{counts[key] > 0 && ` (${counts[key]})`}
                    </button>
                  ))}
                </div>

                {/* Conflict list */}
                <div className="p-6 space-y-3">
                  {filtered.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No conflicts of this type.</p>
                  )}
                  {filtered.map(c => (
                    <div key={c.id} className={`border rounded-xl p-4 flex items-start gap-3 ${SEV[c.severity]}`}>
                      <span className="text-xl flex-shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm">{c.message}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 ${BADGE[c.severity]}`}>
                            {c.severity}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-80">{c.detail}</p>
                      </div>
                      <button
                        id={`resolve-${c.id}`}
                        onClick={() => resolveConflict(c.id)}
                        title="Mark as resolved"
                        className="flex-shrink-0 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors opacity-70 hover:opacity-100"
                      >
                        <FaCheckCircle className="text-emerald-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Link to="/ai-scheduling/setup" className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            ← Setup
          </Link>
          <Link to="/ai-scheduling/optimization" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all hover:-translate-y-0.5">
            Optimization & AI →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
