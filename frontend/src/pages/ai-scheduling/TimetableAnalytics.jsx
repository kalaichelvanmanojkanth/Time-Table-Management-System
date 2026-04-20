import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarCheck, FaCheckCircle, FaTimesCircle,
  FaSync, FaSave, FaFilePdf, FaFileExcel,
  FaBrain, FaArrowLeft, FaRocket, FaGlobe,
  FaDatabase, FaSearch, FaUsers, FaDoorOpen,
  FaBook, FaBalanceScale, FaShieldAlt, FaLock,
  FaTable, FaRedoAlt, FaExclamationTriangle, FaBolt,
  FaLayerGroup, FaChartBar, FaCalendarAlt, FaClock,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { PageShell } from './AISchedulingIndex';
import {
  getTimetables,
  optimizeTimetable,
  applyTimetableFixes,
  seedTimetableFromSetup,
  approveTimetable,
  publishTimetable,
} from '../../services/api';

/* ── Constants ── */
const ALL_DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const WEEKDAYS  = new Set(['Monday','Tuesday','Wednesday','Thursday','Friday']);
const WEEKEND   = new Set(['Saturday','Sunday']);

/* ── Framer Motion Variants ── */
const fadeUp = {
  hidden:  { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Helpers ── */
function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function overlapsTime(s1, e1, s2, e2) {
  return toMinutes(s1) < toMinutes(e2) && toMinutes(s2) < toMinutes(e1);
}

/**
 * If a value looks like a raw MongoDB ObjectId (24 hex chars),
 * return the fallback instead. This is a safety net for old data
 * seeded before the backend name-resolution fix.
 */
function resolveDisplayName(value, fallback) {
  if (!value) return fallback || '—';
  // 24-char hex string = ObjectId — should never reach UI
  if (/^[a-f\d]{24}$/i.test(String(value))) return fallback || String(value);
  return String(value);
}

function buildGridFromEntries(entries) {
  const grid = {};
  const slotSet = new Set();
  for (const e of entries) {
    if (!e.day || !e.startTime) continue;
    if (!grid[e.day]) grid[e.day] = {};
    grid[e.day][e.startTime] = {
      subject:   resolveDisplayName(e.subject,  e.subjectId?.name || e.subjectId),
      teacher:   resolveDisplayName(e.teacher,  e.teacherId?.name || e.teacherId),
      room:      resolveDisplayName(e.room,      e.roomId?.name    || e.roomId),
      status:    e.status || 'draft',
      _id:       e._id,
      startTime: e.startTime,
      endTime:   e.endTime,
    };
    slotSet.add(e.startTime);
  }
  const sortedSlots = [...slotSet].sort();
  return { grid, sortedSlots };
}

function countConflicts(entries) {
  let n = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (a.day !== b.day) continue;
      if (!overlapsTime(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
      if (a.teacher === b.teacher || a.room === b.room) n++;
    }
  }
  return n;
}

function buildValidation(entries) {
  if (!entries.length) return [];

  let teacherOverlap = false;
  const byDay = {};
  for (const e of entries) {
    if (!byDay[e.day]) byDay[e.day] = [];
    byDay[e.day].push(e);
  }
  outer: for (const list of Object.values(byDay)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].teacher === list[j].teacher &&
            overlapsTime(list[i].startTime, list[i].endTime, list[j].startTime, list[j].endTime)) {
          teacherOverlap = true; break outer;
        }
      }
    }
  }

  const conflicts = countConflicts(entries);
  const loads = {};
  for (const e of entries) loads[e.teacher] = (loads[e.teacher] || 0) + 1;
  const vals = Object.values(loads);
  const balanced = vals.length === 0 || (Math.max(...vals) - Math.min(...vals)) <= 3;
  const subjects = [...new Set(entries.map(e => e.subject))].filter(Boolean);

  return [
    { label: 'No Teacher Overlap',   pass: !teacherOverlap,    icon: <FaUsers />,        detail: teacherOverlap ? 'Duplicate teacher found in overlapping slot' : 'All teacher assignments are unique' },
    { label: 'No Room Conflict',     pass: conflicts === 0,     icon: <FaDoorOpen />,     detail: conflicts > 0 ? `${conflicts} resource conflict(s) detected` : 'No room double-bookings found' },
    { label: 'Balanced Workload',    pass: balanced,            icon: <FaBalanceScale />, detail: balanced ? 'Load is evenly spread across teachers' : 'Workload imbalance detected — rebalance needed' },
    { label: 'All Subjects Present', pass: subjects.length > 0, icon: <FaBook />,         detail: subjects.length > 0 ? `${subjects.length} subjects scheduled` : 'No subjects found in timetable' },
  ];
}

/* ── PDF Export ── */
async function exportPDF(entries, meta) {
  try {
    const { default: jsPDF }     = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const days  = [...new Set(entries.map(e => e.day))].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
    const slots = [...new Set(entries.map(e => e.startTime))].sort();
    const grid  = {};
    for (const e of entries) { if (!grid[e.day]) grid[e.day] = {}; grid[e.day][e.startTime] = e; }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(5, 150, 105); doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text('Smart Timetable — Weekly Schedule', 14, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleString(), 220, 14);
    doc.setTextColor(50, 50, 50);
    doc.text(`Teachers: ${meta?.teachers?.length ?? '?'} | Subjects: ${meta?.subjects?.length ?? '?'} | Rooms: ${meta?.rooms?.length ?? '?'} | Entries: ${entries.length}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [['Time', ...days]],
      body: slots.map(s => [s, ...days.map(d => {
        const c = grid[d]?.[s];
        return c ? `${c.subject}\n${c.teacher}\n${c.room}` : '—';
      })]),
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 2.5, valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 247, 250] } },
      margin: { left: 14, right: 14 },
    });

    doc.save('smart-timetable.pdf');
    toast.success('📄 PDF exported successfully!');
  } catch (err) {
    console.error('[Export PDF]', err);
    toast.error('PDF export failed — install jspdf and jspdf-autotable');
  }
}

/* ── Excel Export ── */
async function exportExcel(entries) {
  try {
    const XLSX      = await import('xlsx');
    const FileSaver = await import('file-saver');
    const days  = [...new Set(entries.map(e => e.day))].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
    const slots = [...new Set(entries.map(e => e.startTime))].sort();
    const grid  = {};
    for (const e of entries) { if (!grid[e.day]) grid[e.day] = {}; grid[e.day][e.startTime] = e; }

    const wb   = XLSX.utils.book_new();
    const rows = [['Time', ...days]];
    slots.forEach(s => rows.push([s, ...days.map(d => {
      const c = grid[d]?.[s];
      return c ? `${c.subject} | ${c.teacher} | ${c.room}` : '—';
    })]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, ...days.map(() => ({ wch: 28 }))];
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable');

    const blob = new Blob(
      [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
      { type: 'application/octet-stream' }
    );
    FileSaver.saveAs(blob, 'smart-timetable.xlsx');
    toast.success('📊 Excel exported successfully!');
  } catch (err) {
    console.error('[Export Excel]', err);
    toast.error('Excel export failed — install xlsx and file-saver');
  }
}

/* ══════════════════════════════════════════
   CELL STYLING
══════════════════════════════════════════ */
function getCellClasses(status, isWeekend) {
  if (status === 'published') return 'bg-violet-50 dark:bg-violet-950/60 border-violet-300 dark:border-violet-600 shadow-violet-100 dark:shadow-violet-900/10';
  if (status === 'approved')  return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-600 shadow-emerald-100 dark:shadow-emerald-900/10';
  if (status === 'optimized') return 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-600 shadow-teal-100 dark:shadow-teal-900/10';
  if (status === 'conflict')  return 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-600 shadow-rose-100 dark:shadow-rose-900/10';
  if (isWeekend)              return 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-700';
  return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
}

function getCellBadge(status) {
  if (status === 'published') return <span className="text-[9px] font-black text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/70 rounded-full px-1.5 py-0.5 flex-shrink-0">LIVE</span>;
  if (status === 'approved')  return <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/70 rounded-full px-1.5 py-0.5 flex-shrink-0">OK</span>;
  if (status === 'optimized') return <span className="text-[9px] font-black text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/70 rounded-full px-1.5 py-0.5 flex-shrink-0">FIXED</span>;
  if (status === 'conflict')  return <span className="text-[9px] font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/70 rounded-full px-1.5 py-0.5 flex-shrink-0">⚠</span>;
  return null;
}

/* ══════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════ */
function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0,1,2,3].map(i => (
        <div key={i} className={`rounded-xl w-full ${i === 0 ? 'h-10 bg-slate-200 dark:bg-slate-700' : 'h-14 bg-slate-100 dark:bg-slate-800'}`} />
      ))}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
      {label}
    </span>
  );
}

/* ── Upgraded Stat Card (was StatPill) ── */
function StatCard({ icon, value, label, color, bg, borderColor }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.04, y: -2 }}
      className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-sm hover:shadow-md backdrop-blur-sm transition-all duration-200 cursor-default ${bg} ${borderColor}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xl ${color}`}>{icon}</span>
        <span className={`text-2xl font-black tracking-tight ${color}`}>{value}</span>
      </div>
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
    </motion.div>
  );
}

/* ── Upgraded Validation Row ── */
function ValidationRow({ label, pass, icon, detail }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.015 }}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all duration-200 ${pass
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20 hover:shadow-md'
        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 hover:shadow-rose-100 dark:hover:shadow-rose-900/20 hover:shadow-md'}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm shadow-sm ${pass
        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
        : 'bg-rose-100 dark:bg-rose-900/60 text-rose-500 dark:text-rose-400'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-sm leading-tight ${pass ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}>{label}</div>
        <div className={`text-[11px] font-normal mt-0.5 leading-snug ${pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{detail}</div>
      </div>
      {pass
        ? <FaCheckCircle className="text-emerald-500 dark:text-emerald-400 flex-shrink-0 text-base" />
        : <FaTimesCircle className="text-rose-500 dark:text-rose-400 flex-shrink-0 text-base" />}
    </motion.div>
  );
}

/* ── Timetable Grid ── */
function TimetableGrid({ grid, sortedSlots, days }) {
  const weekdays = days.filter(d => WEEKDAYS.has(d));
  const weekend  = days.filter(d => WEEKEND.has(d));

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700" style={{ boxShadow: 'inset 0 2px 12px 0 rgba(0,0,0,0.04)' }}>
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest rounded-tl-2xl w-28 border-r border-white/20">
              <div className="flex items-center gap-1.5 opacity-90"><FaTable /> Time</div>
            </th>
            {weekdays.length > 0 && (
              <th colSpan={weekdays.length} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-r border-white/20">
                📅 Weekdays
              </th>
            )}
            {weekend.length > 0 && (
              <th colSpan={weekend.length} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest bg-violet-700/80 rounded-tr-2xl">
                🌅 Weekend
              </th>
            )}
          </tr>
          <tr className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white border-t border-white/10">
            <th className="px-4 py-2 text-[10px] font-bold text-left border-r border-white/20 opacity-80">Slot</th>
            {days.map(d => (
              <th key={d} className={`px-3 py-2 text-[10px] font-bold text-center whitespace-nowrap min-w-[115px] tracking-wide ${WEEKEND.has(d) ? 'bg-violet-700/60' : ''}`}>
                {d.slice(0, 3).toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {sortedSlots.map((time, idx) => (
            <tr key={idx} className={`transition-colors duration-150 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${idx % 2 === 0 ? 'bg-slate-50/20 dark:bg-slate-800/10' : ''}`}>
              <td className="px-4 py-2.5 font-bold text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap align-middle w-28">
                <div className="flex items-center gap-1.5">
                  <FaClock className="text-[9px] opacity-40" />
                  {time}
                </div>
              </td>
              {days.map(day => {
                const cell   = grid[day]?.[time];
                const isWknd = WEEKEND.has(day);
                if (!cell) return (
                  <td key={day} className={`px-2 py-1.5 align-middle ${isWknd ? 'bg-violet-50/30 dark:bg-violet-950/10' : ''}`}>
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-600 px-2 py-4 text-center text-[10px] text-slate-300 dark:text-slate-600 select-none">—</div>
                  </td>
                );
                return (
                  <td key={day} className={`px-2 py-1.5 align-middle ${isWknd ? 'bg-violet-50/20 dark:bg-violet-950/10' : ''}`}>
                    <motion.div
                      whileHover={{ scale: 1.04, y: -2 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                      className={`rounded-xl border px-2.5 py-2.5 flex flex-col gap-1.5 cursor-default shadow-sm transition-shadow hover:shadow-md ${getCellClasses(cell.status, isWknd)}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-[11px] leading-tight truncate max-w-[86px] text-slate-700 dark:text-slate-100">
                          {cell.subject}
                        </span>
                        {getCellBadge(cell.status)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <FaUsers className="text-[8px] opacity-50 flex-shrink-0" />
                        <span className="truncate max-w-[86px]">{cell.teacher}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                        <FaDoorOpen className="text-[8px] opacity-50 flex-shrink-0" />
                        <span className="truncate max-w-[86px]">{cell.room}</span>
                      </div>
                    </motion.div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Section Header reusable component ── */
function SectionHeader({ icon, title, subtitle, badge, badgeColor = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge != null && (
        <span className={`text-[10px] font-black rounded-full px-3 py-1 ${badgeColor}`}>{badge}</span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function TimetableAnalytics() {
  const [entries,         setEntries]         = useState([]);
  const [grid,            setGrid]            = useState({});
  const [sortedSlots,     setSortedSlots]     = useState([]);
  const [days,            setDays]            = useState([]);
  const [dbMeta,          setDbMeta]          = useState(null);
  const [timetableStatus, setTimetableStatus] = useState('draft');

  const [loading,    setLoading]    = useState(false);
  const [seeding,    setSeeding]    = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [applying,   setApplying]   = useState(false);
  const [approving,  setApproving]  = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting,  setExporting]  = useState('');

  const [optimResult, setOptimResult] = useState(null);
  const [filter,      setFilter]      = useState({ teacher: '', subject: '', room: '' });

  // Initial load + 5-second auto-polling so other admins' changes appear automatically
  useEffect(() => {
    loadTimetable();

    const interval = setInterval(() => {
      loadTimetable({ silent: true });
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!entries.length) { setTimetableStatus('draft'); return; }
    const statuses = entries.map(e => e.status);
    if (statuses.every(s => s === 'published'))                          setTimetableStatus('published');
    else if (statuses.every(s => s === 'approved' || s === 'published')) setTimetableStatus('approved');
    else                                                                 setTimetableStatus('draft');
  }, [entries]);

  /* ── Load timetable from MongoDB ──
     filters.silent = true  → background poll (no toasts, no loading spinner)
  */
  const loadTimetable = useCallback(async (filters = {}) => {
    const isSilent = filters.silent === true;
    const apiFilters = { ...filters };
    delete apiFilters.silent;

    if (!isSilent) setLoading(true);
    try {
      const res = await getTimetables(apiFilters);
      const { data: dbEntries = [], meta } = res.data;

      // Debug: log a sample to verify names are resolving correctly
      console.log('[FinalSchedule] Fetched timetable:', dbEntries.length, 'entries', isSilent ? '(background poll)' : '(manual)');
      if (dbEntries.length > 0) {
        const sample = dbEntries[0];
        console.log('[FinalSchedule] Sample entry →', {
          subject: sample.subject, teacher: sample.teacher, room: sample.room,
        });
      }

      // Normalize: replace any raw ObjectId strings with readable names before storing in state
      const normalizedEntries = dbEntries.map(e => ({
        ...e,
        subject: resolveDisplayName(e.subject, e.subjectId?.name || e.subjectId),
        teacher: resolveDisplayName(e.teacher, e.teacherId?.name || e.teacherId),
        room:    resolveDisplayName(e.room,    e.roomId?.name    || e.roomId),
      }));

      const { grid: g, sortedSlots: ss } = buildGridFromEntries(normalizedEntries);
      const existingDays = [...new Set(normalizedEntries.map(e => e.day))]
        .sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));

      setEntries(normalizedEntries);
      setGrid(g);
      setSortedSlots(ss);
      setDays(existingDays);
      setDbMeta(meta);

      // Only show toasts on manual reloads — background polls are silent
      if (!isSilent) {
        if (!normalizedEntries.length) {
          toast.info('No timetable data — seed the DB from AI Setup first');
        } else {
          const conflicts = countConflicts(normalizedEntries);
          if (conflicts > 0) toast.warning(`⚠️ ${conflicts} conflict(s) found in timetable`);
          else               toast.success(`✅ ${normalizedEntries.length} entries loaded — no conflicts`);
        }
      }
    } catch (err) {
      console.error('[TimetableAnalytics] load error:', err.message);
      if (!isSilent) toast.error(err?.response?.data?.message || 'Failed to load timetable');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  /* ── Seed DB ── */
  const handleSeed = useCallback(async () => {
    if (!window.confirm('This will replace all existing timetable entries with a fresh seed from the latest AI Setup.\n\nContinue?')) return;
    setSeeding(true);
    try {
      const res = await seedTimetableFromSetup();
      toast.success(`✅ ${res.data?.count ?? 0} entries seeded to MongoDB`);
      await loadTimetable();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Seed failed';
      console.error('[Seed]', msg);
      if (err?.response?.status === 409) {
        toast.warning('Clearing duplicate data — retrying...');
        try {
          const retry = await seedTimetableFromSetup();
          toast.success(`✅ ${retry.data?.count ?? 0} entries seeded on retry`);
          await loadTimetable();
        } catch (e2) {
          toast.error('Retry failed: ' + (e2?.response?.data?.message || e2.message));
        }
      } else {
        toast.error('Seed failed: ' + msg);
      }
    } finally {
      setSeeding(false);
    }
  }, [loadTimetable]);

  /* ── Filter ── */
  const handleFilter = useCallback(() => {
    loadTimetable({
      teacher: filter.teacher || undefined,
      subject: filter.subject || undefined,
      room:    filter.room    || undefined,
    });
  }, [filter, loadTimetable]);

  /* ── Auto Optimize ── */
  const handleAutoOptimize = useCallback(async () => {
    setOptimizing(true);
    setOptimResult(null);
    try {
      const res = await optimizeTimetable();
      setOptimResult(res.data);
      const { grid: og, sortedSlots: os } = buildGridFromEntries(res.data.after.entries);
      const existDays = [...new Set(res.data.after.entries.map(e => e.day))]
        .sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
      setGrid(og); setSortedSlots(os); setDays(existDays);
      setEntries(res.data.after.entries);
      const { improvement } = res.data.meta;
      if (improvement > 0) toast.success(`✅ Resolved ${improvement} conflict(s)!`);
      else                 toast.info('Timetable is already optimal');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  }, []);

  /* ── Apply Fixes ── */
  const handleApplyFixes = useCallback(async () => {
    if (!optimResult?.after?.entries) { toast.error('Run Auto Optimize first'); return; }
    setApplying(true);
    try {
      const res = await applyTimetableFixes(optimResult.after.entries);
      toast.success(`🚀 ${res.data?.updatedCount ?? 0} entries saved to MongoDB`);
      await loadTimetable();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  }, [optimResult, loadTimetable]);

  /* ── Approve ── */
  const handleApprove = useCallback(async () => {
    if (!entries.length) { toast.error('No timetable to approve — seed first'); return; }
    if (!window.confirm('Mark the entire timetable as "Approved"?\n\nThis will fail if high-severity conflicts exist.')) return;
    setApproving(true);
    try {
      const res = await approveTimetable();
      toast.success(`✅ ${res.data?.approvedCount ?? 0} entries approved!`);
      await loadTimetable();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.conflictCount) {
        toast.error(`Cannot approve — ${data.conflictCount} conflict(s) exist. Resolve them first.`);
      } else {
        toast.error(data?.message || 'Approval failed');
      }
    } finally {
      setApproving(false);
    }
  }, [entries, loadTimetable]);

  /* ── Publish ── */
  const handlePublish = useCallback(async () => {
    if (timetableStatus !== 'approved') { toast.error('Approve the timetable before publishing'); return; }
    if (!window.confirm('Publish the timetable? This makes it live for everyone.')) return;
    setPublishing(true);
    try {
      const res = await publishTimetable();
      toast.success(`🚀 ${res.data?.publishedCount ?? 0} entries published — timetable is now LIVE!`, { autoClose: 6000 });
      await loadTimetable();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }, [timetableStatus, loadTimetable]);

  async function handleExportPDF()   { setExporting('pdf');   await exportPDF(entries, dbMeta);   setExporting(''); }
  async function handleExportExcel() { setExporting('excel'); await exportExcel(entries);          setExporting(''); }

  /* ── Derived ── */
  const checks     = buildValidation(entries);
  const allValid   = checks.length > 0 && checks.every(c => c.pass);
  const conflicts  = countConflicts(entries);
  const isPublished = timetableStatus === 'published';
  const isApproved  = timetableStatus === 'approved' || isPublished;

  return (
    <PageShell
      title="Final Schedule & Approval"
      subtitle="Real MongoDB timetable — validate, approve, and publish your academic schedule"
      icon={<FaCalendarCheck />}
      gradient="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700"
      breadcrumb="Final Schedule"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ══ DB CONTROLS BAR ══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-wrap gap-3 items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-lg px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${entries.length > 0 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'}`}>
              <FaDatabase className="text-base" />
            </div>
            <div>
              <div className={`font-bold text-sm ${entries.length > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {entries.length > 0
                  ? <span className="flex items-center gap-2">{entries.length} entries loaded
                      <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5 ${
                        isPublished ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300' :
                        isApproved  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' :
                                      'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>{timetableStatus}</span>
                    </span>
                  : 'No timetable data in MongoDB'}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {entries.length > 0
                  ? `${days.length} days · ${dbMeta?.teachers?.length ?? 0} teachers · ${dbMeta?.subjects?.length ?? 0} subjects`
                  : 'Complete AI Setup → Click Seed DB to begin'}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              id="reload-timetable-btn" onClick={() => loadTimetable()} disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-sm hover:shadow-md"
            >
              {loading ? <FaSync className="animate-spin" /> : <FaSync />} Reload
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              id="seed-final-btn" onClick={handleSeed} disabled={seeding}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-sm hover:shadow-md"
            >
              {seeding ? <FaSync className="animate-spin" /> : <FaDatabase />} {seeding ? 'Seeding…' : 'Seed DB'}
            </motion.button>
            <Link to="/ai-scheduling/setup"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"
            >
              <FaArrowLeft className="text-[10px]" /> AI Setup
            </Link>
          </div>
        </motion.div>

        {/* ══ FILTER BAR ══ */}
        {entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-md px-5 py-4"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <FaSearch className="text-emerald-500" /> Filter Timetable
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              {[
                { key: 'teacher', label: 'Teacher',  ph: 'e.g. Dr. Nimal' },
                { key: 'subject', label: 'Subject',  ph: 'e.g. Algorithms' },
                { key: 'room',    label: 'Room',     ph: 'e.g. A101' },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">{label}</label>
                  <input
                    value={filter[key]}
                    onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none w-40 transition-all"
                  />
                </div>
              ))}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleFilter} disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
              >
                <FaSearch /> Search
              </motion.button>
              <button
                onClick={() => { setFilter({ teacher: '', subject: '', room: '' }); loadTimetable(); }}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm transition-all"
              >
                Reset
              </button>
            </div>
          </motion.div>
        )}

        {/* ══ STATUS BANNERS ══ */}
        <AnimatePresence>
          {isPublished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden flex items-center gap-4 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white rounded-2xl px-6 py-5 shadow-2xl"
              style={{ boxShadow: '0 8px 32px -4px rgba(139, 92, 246, 0.5), 0 0 0 1px rgba(139,92,246,0.2)' }}
            >
              {/* glow orb */}
              <div className="absolute -left-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                <FaGlobe />
              </div>
              <div className="flex-1 relative">
                <div className="font-extrabold text-xl leading-tight flex items-center gap-2">🚀 Timetable is LIVE!<HiSparkles className="text-violet-200 text-lg" /></div>
                <div className="text-sm opacity-80 mt-0.5">{entries.length} entries published — your schedule is now visible to everyone.</div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 bg-white/20 border border-white/30 rounded-xl px-4 py-2.5 shadow-sm">
                <FaLock className="text-sm" />
                <span className="font-black text-sm tracking-wider">PUBLISHED</span>
              </div>
            </motion.div>
          )}
          {isApproved && !isPublished && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700 rounded-2xl px-6 py-4 shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <FaCheckCircle className="text-lg" />
              </div>
              <div>
                <div className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">Timetable is Approved</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">All entries are approved — click Publish below to make the schedule live.</div>
              </div>
            </motion.div>
          )}
          {!isApproved && !isPublished && entries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-6 py-4 shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                <FaExclamationTriangle className="text-lg" />
              </div>
              <div>
                <div className="font-bold text-amber-800 dark:text-amber-200 text-sm">Draft — Pending Approval</div>
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Validate all checks below, then approve and publish the timetable.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ STAT CARDS ══ */}
        {entries.length > 0 && (
          <motion.div
            variants={containerVariants} initial="hidden" animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          >
            <StatCard icon={<FaUsers />}       value={dbMeta?.teachers?.length ?? 0} label="Teachers"  color="text-blue-600 dark:text-blue-400"    bg="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm"    borderColor="border-blue-100 dark:border-blue-800" />
            <StatCard icon={<FaBook />}         value={dbMeta?.subjects?.length ?? 0} label="Subjects"  color="text-violet-600 dark:text-violet-400" bg="bg-violet-50/80 dark:bg-violet-950/30 backdrop-blur-sm" borderColor="border-violet-100 dark:border-violet-800" />
            <StatCard icon={<FaDoorOpen />}     value={dbMeta?.rooms?.length ?? 0}    label="Rooms"     color="text-cyan-600 dark:text-cyan-400"     bg="bg-cyan-50/80 dark:bg-cyan-950/30 backdrop-blur-sm"    borderColor="border-cyan-100 dark:border-cyan-800" />
            <StatCard icon={<FaCalendarAlt />}  value={days.length}                    label="Days"      color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50/80 dark:bg-emerald-950/30 backdrop-blur-sm" borderColor="border-emerald-100 dark:border-emerald-800" />
            <StatCard
              icon={conflicts > 0 ? <FaExclamationTriangle /> : <FaCheckCircle />}
              value={conflicts}
              label="Conflicts"
              color={conflicts > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}
              bg={conflicts > 0 ? 'bg-rose-50/80 dark:bg-rose-950/30 backdrop-blur-sm' : 'bg-emerald-50/80 dark:bg-emerald-950/30 backdrop-blur-sm'}
              borderColor={conflicts > 0 ? 'border-rose-100 dark:border-rose-800' : 'border-emerald-100 dark:border-emerald-800'}
            />
          </motion.div>
        )}

        {/* ══ LOADING ══ */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-8 space-y-5"
          >
            <div className="flex items-center gap-3 text-sm">
              <FaBrain className="text-emerald-500 animate-pulse text-xl" />
              <span className="font-bold text-slate-700 dark:text-slate-200">Loading timetable from MongoDB…</span>
            </div>
            <Skeleton />
          </motion.div>
        )}

        {/* ══ MAIN CONTENT (when data is present) ══ */}
        <AnimatePresence>
          {!loading && entries.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">

              {/* ── TIMETABLE GRID ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm"
              >
                <SectionHeader
                  icon={<FaCalendarCheck className="text-emerald-600 dark:text-emerald-400" />}
                  title="Real MongoDB Timetable"
                  subtitle={`${days.length} days · ${entries.length} entries · Status: ${timetableStatus}`}
                  badge={<span className="flex items-center gap-1.5">
                    <LegendDot color="bg-violet-400"  label="Published" />
                    <LegendDot color="bg-emerald-400" label="Approved" />
                    <LegendDot color="bg-teal-400"    label="Optimized" />
                    <LegendDot color="bg-rose-400"    label="Conflict" />
                    <LegendDot color="bg-slate-300 dark:bg-slate-600" label="Draft" />
                  </span>}
                />
                <div className="p-5 bg-white/60 dark:bg-slate-800/60">
                  <TimetableGrid grid={grid} sortedSlots={sortedSlots} days={days} />
                </div>
              </motion.div>

              {/* ── VALIDATION PANEL ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm"
              >
                <SectionHeader
                  icon={<FaShieldAlt className="text-blue-600 dark:text-blue-400" />}
                  title="Validation Summary"
                  subtitle="Real-data constraint checks before approval"
                  badge={allValid
                    ? `All ${checks.length} Passed ✓`
                    : `${checks.filter(c => !c.pass).length} Issue(s) Found`}
                  badgeColor={allValid
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'}
                />
                <div className="p-5">
                  <motion.div
                    variants={containerVariants} initial="hidden" animate="visible"
                    className="grid sm:grid-cols-2 gap-3"
                  >
                    {checks.map(c => <ValidationRow key={c.label} {...c} />)}
                  </motion.div>
                </div>
              </motion.div>

              {/* ── AI QUICK FIX CARDS ── */}
              {!isPublished && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}
                  className="rounded-2xl border border-amber-200 dark:border-amber-800 shadow-xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-100 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                      <FaBolt />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">AI Quick Fix</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Run greedy optimizer then save improved data to MongoDB</p>
                    </div>
                  </div>
                  <div className="p-5 flex flex-wrap gap-4">
                    {/* Auto Optimize Card */}
                    <motion.button
                      id="auto-optimize-final-btn"
                      whileHover={{ scale: 1.04, y: -3 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleAutoOptimize}
                      disabled={optimizing}
                      className="flex items-center gap-4 p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:to-orange-950/30 hover:shadow-xl hover:shadow-amber-100 dark:hover:shadow-amber-900/20 transition-all duration-200 text-left disabled:opacity-60 min-w-[220px]"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl shadow-lg flex-shrink-0">
                        {optimizing ? <FaSync className="animate-spin" /> : <FaBrain />}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Auto-Optimize</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">AI greedy conflict resolver</div>
                        {optimizing && <div className="text-[10px] text-amber-600 mt-1 font-semibold animate-pulse">Processing…</div>}
                      </div>
                    </motion.button>

                    {/* Apply Fixes Card (shown after optimize) */}
                    {optimResult && (
                      <motion.button
                        id="apply-fixes-btn"
                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.04, y: -3 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleApplyFixes}
                        disabled={applying}
                        className="flex items-center gap-4 p-5 rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 via-indigo-50 to-violet-50 dark:from-violet-950/40 dark:to-indigo-950/30 hover:shadow-xl hover:shadow-violet-100 dark:hover:shadow-violet-900/20 transition-all duration-200 text-left disabled:opacity-60 min-w-[220px]"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center text-xl shadow-lg flex-shrink-0">
                          {applying ? <FaSync className="animate-spin" /> : <FaSave />}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Apply & Save to DB</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {optimResult.meta?.improvement ?? 0} conflict(s) resolved
                          </div>
                          <div className="text-[10px] text-violet-600 dark:text-violet-400 mt-1 font-semibold">
                            {optimResult.meta?.conflictsAfter ?? 0} remaining
                          </div>
                        </div>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── FINAL ACTIONS ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm"
              >
                <SectionHeader
                  icon={<FaLayerGroup className="text-slate-600 dark:text-slate-300" />}
                  title="Final Actions"
                  subtitle="Export · Approve · Publish"
                />
                <div className="p-5 space-y-6">

                  {/* Export buttons */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                      <FaChartBar className="text-slate-400" /> Export Schedule
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <motion.button
                        id="export-pdf-btn"
                        whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.96 }}
                        onClick={handleExportPDF} disabled={!!exporting}
                        className="flex flex-col items-center justify-center gap-2.5 px-4 py-6 rounded-2xl font-bold text-sm text-white shadow-lg bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 hover:shadow-xl hover:shadow-rose-200 dark:hover:shadow-rose-900/30 transition-all duration-200 disabled:opacity-60"
                      >
                        <span className="text-2xl">{exporting === 'pdf' ? <FaSync className="animate-spin" /> : <FaFilePdf />}</span>
                        Export PDF
                        <span className="text-[10px] font-normal opacity-80">smart-timetable.pdf</span>
                      </motion.button>

                      <motion.button
                        id="export-excel-btn"
                        whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.96 }}
                        onClick={handleExportExcel} disabled={!!exporting}
                        className="flex flex-col items-center justify-center gap-2.5 px-4 py-6 rounded-2xl font-bold text-sm text-white shadow-lg bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 hover:shadow-xl hover:shadow-teal-200 dark:hover:shadow-teal-900/30 transition-all duration-200 disabled:opacity-60"
                      >
                        <span className="text-2xl">{exporting === 'excel' ? <FaSync className="animate-spin" /> : <FaFileExcel />}</span>
                        Export Excel
                        <span className="text-[10px] font-normal opacity-80">smart-timetable.xlsx</span>
                      </motion.button>

                      <motion.button
                        id="reload-final-btn"
                        whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.96 }}
                        onClick={() => loadTimetable()} disabled={loading}
                        className="flex flex-col items-center justify-center gap-2.5 px-4 py-6 rounded-2xl font-bold text-sm text-white shadow-lg bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 hover:shadow-xl transition-all duration-200 disabled:opacity-60"
                      >
                        <span className="text-2xl"><FaRedoAlt /></span>
                        Reload from DB
                        <span className="text-[10px] font-normal opacity-80">Refresh live data</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Approve / Publish */}
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-6 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                      <FaShieldAlt className="text-slate-400" /> Workflow Actions
                    </p>
                    <AnimatePresence mode="wait">
                      {isPublished ? (
                        <motion.div key="published"
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="relative overflow-hidden flex items-center justify-between gap-4 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white rounded-2xl px-6 py-5 shadow-2xl"
                          style={{ boxShadow: '0 8px 32px -4px rgba(139, 92, 246, 0.45)' }}
                        >
                          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center gap-4 relative">
                            <div className="w-14 h-14 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center text-2xl shadow-md"><FaGlobe /></div>
                            <div>
                              <div className="font-extrabold text-xl flex items-center gap-2">🚀 Timetable is LIVE! <HiSparkles className="text-violet-200" /></div>
                              <div className="text-sm opacity-80 mt-0.5">{entries.length} entries published to MongoDB.</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-xl px-4 py-2.5 flex-shrink-0 relative">
                            <FaLock /><span className="font-bold text-sm">Published</span>
                          </div>
                        </motion.div>
                      ) : isApproved ? (
                        <motion.div key="publish-block" className="space-y-3"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                            <FaCheckCircle /> Timetable approved — ready to publish
                          </div>
                          <motion.button
                            id="publish-timetable-btn"
                            whileHover={{ scale: 1.02, y: -3 }} whileTap={{ scale: 0.97 }}
                            onClick={handlePublish} disabled={publishing}
                            className="w-full inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-extrabold text-lg bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-xl hover:shadow-2xl hover:shadow-violet-300/30 dark:hover:shadow-violet-900/40 transition-all duration-300 disabled:opacity-60"
                          >
                            {publishing
                              ? <><FaSync className="animate-spin" /> Publishing…</>
                              : <><FaRocket /> Publish Timetable <HiSparkles className="text-violet-200" /></>}
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div key="approve-block" className="space-y-3"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        >
                          {!allValid && (
                            <div className="flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
                              <FaExclamationTriangle className="flex-shrink-0" />
                              Fix {checks.filter(c => !c.pass).length} validation issue(s) above before approving.
                            </div>
                          )}
                          <motion.button
                            id="approve-timetable-btn"
                            whileHover={allValid ? { scale: 1.02, y: -3 } : {}}
                            whileTap={allValid ? { scale: 0.97 } : {}}
                            onClick={handleApprove}
                            disabled={!allValid || approving}
                            className={`w-full inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-extrabold text-lg shadow-lg transition-all duration-300 ${
                              allValid
                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white hover:shadow-2xl hover:shadow-emerald-300/30 dark:hover:shadow-emerald-900/40 cursor-pointer'
                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {approving
                              ? <><FaSync className="animate-spin" /> Approving…</>
                              : <><FaCalendarCheck className="text-xl" /> Approve Final Timetable <HiSparkles className={allValid ? 'text-emerald-200' : 'text-slate-400'} /></>}
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* ── FOOTER NAV ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
                className="flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900 rounded-2xl px-6 py-4 shadow-sm"
              >
                <div className="flex items-center gap-2.5 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                  <FaCheckCircle className="flex-shrink-0" />
                  Final step of the AI scheduling workflow — approve then publish.
                </div>
                <Link to="/ai-scheduling"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline transition-colors"
                >
                  <FaArrowLeft className="text-[10px]" /> Back to Hub
                </Link>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ EMPTY STATE ══ */}
        {!loading && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-center py-24 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 shadow-xl"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="text-7xl mb-6 select-none"
            >📋</motion.div>
            <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-2xl mb-3">No Timetable in MongoDB</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">
              Complete <strong className="text-slate-700 dark:text-slate-300">AI Setup</strong>, then click{' '}
              <strong className="text-slate-700 dark:text-slate-300">Seed DB</strong> to populate the Timetable
              collection and unlock the full workflow.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/ai-scheduling/setup"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-xl text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <FaArrowLeft className="text-xs" /> Go to AI Setup
              </Link>
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                onClick={handleSeed} disabled={seeding}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {seeding ? <FaSync className="animate-spin" /> : <FaDatabase />}
                {seeding ? 'Seeding…' : 'Seed DB from AI Setup'}
              </motion.button>
            </div>
          </motion.div>
        )}

      </div>
    </PageShell>
  );
}
