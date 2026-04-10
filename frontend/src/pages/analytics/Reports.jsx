import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaFileAlt, FaFilePdf, FaFileExcel, FaSync,
  FaExclamationTriangle, FaCheckCircle, FaTimes, FaTimesCircle,
  FaInfoCircle, FaFilter, FaSpinner, FaDownload,
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
function Reveal({ children, delay = '0ms' }) {
  const ref = useReveal();
  return <div ref={ref} className="reveal-on-scroll" style={{ transitionDelay: delay }}>{children}</div>;
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
      <span className={`mt-0.5 flex-shrink-0 ${s.icon}`}>{T_ICON[t.type]}</span>
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-[10px] font-extrabold uppercase tracking-wide mb-0.5">{t.title}</p>}
        <p className="text-xs text-slate-600 leading-snug">{t.msg}</p>
      </div>
      <button onClick={close} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><FaTimes className="text-xs" /></button>
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.bar} origin-left`} style={{ animation: `rp-shrink ${t.dur || 4000}ms linear forwards` }} />
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

/* ── report types ── */
const REPORT_TYPES = [
  { id: 'workload',     label: 'Teacher Workload Report',    icon: '👨‍🏫', color: 'from-blue-600 to-primary' },
  { id: 'subjects',     label: 'Subject Distribution Report',icon: '📚',   color: 'from-indigo-600 to-violet-700' },
  { id: 'rooms',        label: 'Room Utilization Report',    icon: '🏫',   color: 'from-emerald-500 to-teal-600' },
  { id: 'conflicts',    label: 'Room Conflict Report',       icon: '⚠️',   color: 'from-rose-500 to-rose-600' },
  { id: 'insights',     label: 'AI Insights Report',         icon: '🤖',   color: 'from-amber-500 to-orange-500' },
  { id: 'full',         label: 'Full Analytics Report',      icon: '📊',   color: 'from-slate-600 to-slate-700' },
];

const DEPT_OPTIONS = [
  '', 'Information Technology', 'Computer Science',
  'Computer System Engineering', 'Computer System Networks',
];

/* ── table helpers ── */
function Table({ headers, rows, emptyMsg = 'No data available' }) {
  if (!rows.length) return <div className="py-8 text-center text-muted text-sm">{emptyMsg}</div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>{headers.map(h => <th key={h} className="text-left text-[10px] font-extrabold uppercase tracking-widest text-muted px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              {row.map((cell, j) => <td key={j} className="px-4 py-3 text-xs">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    overloaded:  'bg-rose-100 text-rose-600 border-rose-200',
    optimal:     'bg-emerald-100 text-emerald-600 border-emerald-200',
    underloaded: 'bg-amber-100 text-amber-600 border-amber-200',
    over:        'bg-rose-100 text-rose-600 border-rose-200',
    under:       'bg-amber-100 text-amber-600 border-amber-200',
    ok:          'bg-emerald-100 text-emerald-600 border-emerald-200',
    unscheduled: 'bg-slate-100 text-muted border-slate-200',
    overbooked:  'bg-rose-100 text-rose-600 border-rose-200',
    high:        'bg-amber-100 text-amber-600 border-amber-200',
    normal:      'bg-emerald-100 text-emerald-600 border-emerald-200',
    unused:      'bg-slate-100 text-muted border-slate-200',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${MAP[status] || MAP.ok}`}>{status}</span>;
}

/* ── Dummy Data ── */
const DUMMY_WORKLOAD = [
  { teacherId: 't001', teacherName: 'Dr. Nimal Perera',       department: 'Information Technology',      totalHours: 24, maxWeeklyHours: 20, status: 'overloaded'  },
  { teacherId: 't002', teacherName: 'Prof. Kasun Silva',      department: 'Computer Science',             totalHours: 18, maxWeeklyHours: 20, status: 'optimal'     },
  { teacherId: 't003', teacherName: 'Ms. Tharushi Dias',      department: 'Computer System Engineering',  totalHours: 8,  maxWeeklyHours: 20, status: 'underloaded' },
  { teacherId: 't004', teacherName: 'Mr. Ruwan Fernando',     department: 'Computer System Networks',     totalHours: 20, maxWeeklyHours: 20, status: 'optimal'     },
  { teacherId: 't005', teacherName: 'Dr. Amali Jayawardena',  department: 'Computer Science',             totalHours: 22, maxWeeklyHours: 20, status: 'overloaded'  },
  { teacherId: 't006', teacherName: 'Prof. Dinesh Mendis',    department: 'Information Technology',       totalHours: 16, maxWeeklyHours: 20, status: 'optimal'     },
  { teacherId: 't007', teacherName: 'Ms. Sachini Bandara',    department: 'Computer System Engineering',  totalHours: 6,  maxWeeklyHours: 20, status: 'underloaded' },
];

const DUMMY_SUBJECTS = [
  { subjectId: 's001', subjectName: 'Database Systems',           department: 'Computer Science',             weeklyHours: 4, scheduledHours: 4  },
  { subjectId: 's002', subjectName: 'Software Engineering',       department: 'Information Technology',       weeklyHours: 3, scheduledHours: 3  },
  { subjectId: 's003', subjectName: 'Computer Networking',        department: 'Computer System Networks',     weeklyHours: 4, scheduledHours: 5  },
  { subjectId: 's004', subjectName: 'Object Oriented Programming',department: 'Computer Science',             weeklyHours: 3, scheduledHours: 3  },
  { subjectId: 's005', subjectName: 'Statistics & Probability',   department: 'Information Technology',       weeklyHours: 3, scheduledHours: 1  },
  { subjectId: 's006', subjectName: 'Data Structures',            department: 'Computer Science',             weeklyHours: 4, scheduledHours: 4  },
  { subjectId: 's007', subjectName: 'Operating Systems',          department: 'Computer System Engineering',  weeklyHours: 3, scheduledHours: 3  },
  { subjectId: 's008', subjectName: 'Web Technologies',           department: 'Information Technology',       weeklyHours: 3, scheduledHours: 0  },
  { subjectId: 's009', subjectName: 'Digital Logic Design',       department: 'Computer System Engineering',  weeklyHours: 4, scheduledHours: 4  },
  { subjectId: 's010', subjectName: 'Network Security',           department: 'Computer System Networks',     weeklyHours: 3, scheduledHours: 3  },
];

const DUMMY_ROOMS = [
  { roomId: 'r001', roomName: 'Lab 1',       roomType: 'Computer Lab',  capacity: 40,  scheduledHours: 36, availableHours: 40, utilization: 90,  status: 'high'       },
  { roomId: 'r002', roomName: 'Lab 2',       roomType: 'Computer Lab',  capacity: 40,  scheduledHours: 28, availableHours: 40, utilization: 70,  status: 'high'       },
  { roomId: 'r003', roomName: 'Room A101',   roomType: 'Classroom',     capacity: 60,  scheduledHours: 20, availableHours: 40, utilization: 50,  status: 'normal'     },
  { roomId: 'r004', roomName: 'Room B202',   roomType: 'Classroom',     capacity: 50,  scheduledHours: 40, availableHours: 40, utilization: 100, status: 'overbooked' },
  { roomId: 'r005', roomName: 'Auditorium',  roomType: 'Seminar Hall',  capacity: 200, scheduledHours: 0,  availableHours: 40, utilization: 0,   status: 'unused'     },
  { roomId: 'r006', roomName: 'Physics Lab', roomType: 'Physics Lab',   capacity: 30,  scheduledHours: 12, availableHours: 40, utilization: 30,  status: 'normal'     },
];

const DUMMY_TIMETABLE_COUNT = 42;

function getSubjectStatus(s) {
  if (!s.weeklyHours || s.weeklyHours === 0) return 'unscheduled';
  if (s.scheduledHours > s.weeklyHours)       return 'over';
  if (s.scheduledHours < s.weeklyHours * 0.5) return 'under';
  return 'ok';
}

const DUMMY_INSIGHTS = [
  { type: 'error',   icon: '⚠️', title: '2 Faculty Members Overloaded',       desc: 'Dr. Nimal Perera & Dr. Amali Jayawardena exceed their 20h weekly limit. Consider redistributing subjects.' },
  { type: 'warning', icon: '⚡', title: 'Room B202 Fully Booked',              desc: 'Room B202 has reached 100% utilization. No additional sessions can be scheduled in this room.' },
  { type: 'warning', icon: '💤', title: 'Auditorium Underutilized',            desc: 'The Auditorium (cap: 200) has 0 scheduled hours this week. Consider using it for large group sessions.' },
  { type: 'warning', icon: '📚', title: 'Computer Networking Over-allocated',  desc: 'Computer Networking has 5h scheduled against a 4h weekly target.' },
  { type: 'info',    icon: '📊', title: 'Web Technologies Not Yet Scheduled',  desc: 'Web Technologies has 0 scheduled hours. Assign a slot in the timetable to resolve this gap.' },
  { type: 'success', icon: '✅', title: 'No Room Scheduling Conflicts',        desc: 'All rooms are free of double-booking conflicts. The timetable is conflict-free!' },
];

/* ── main ── */
export default function Reports() {
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);

  /* ── filters ── */
  const [reportType,   setReportType]   = useState('full');
  const [deptFilter,   setDeptFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generated,    setGenerated]    = useState(false);
  const reportRef = useRef(null);

  const { list, dismiss, toast } = useToast();

  /* ── computed analytics (from dummy data) ── */
  const workload    = DUMMY_WORKLOAD;
  const roomUtil    = DUMMY_ROOMS;
  const subjectDist = DUMMY_SUBJECTS.map(s => ({ ...s, status: getSubjectStatus(s) }));
  const insights    = DUMMY_INSIGHTS;

  /* ── filtered data ── */
  const filteredWorkload = workload
    .filter(t => !deptFilter || t.department === deptFilter)
    .filter(t => statusFilter === 'all' || t.status === statusFilter);

  const filteredSubjects = subjectDist
    .filter(s => !deptFilter || s.department === deptFilter);

  const filteredRooms = roomUtil
    .filter(r => statusFilter === 'all' || r.status === statusFilter);

  /* ── generate ── */
  const handleGenerate = () => {
    setGenerating(true);
    toast.info('Generating report from sample data…', 'Info', 2000);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      toast.success('Report generated successfully!', 'Success', 4000);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }, 1200);
  };

  /* ── export CSV ── */
  const exportCSV = (data, filename) => {
    if (!data.length) { toast.warning('No data to export', 'Warning'); return; }
    const keys = Object.keys(data[0]);
    const csv  = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`, 'Export', 3000);
  };

  /* ── export print/PDF ── */
  const exportPDF = () => {
    toast.info('Opening print dialog for PDF export…', 'Export', 3000);
    setTimeout(() => window.print(), 500);
  };

  const resetFilters = () => {
    setDeptFilter(''); setStatusFilter('all'); setGenerated(false);
    toast.info('Filters reset', 'Info', 2000);
  };

  /* ── render ── */
  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased">
      <Toasts list={list} dismiss={dismiss} />

      {/* header */}
      <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm flex-wrap">
        <Link to="/analytics" id="reports-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold">Reports & Insights</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={() => {}} className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 text-muted hover:bg-slate-200">
            <FaSync className="text-[10px]" /> Sync
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <HiSparkles /> Reports
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10 print:py-4">

        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Reports &{' '}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Insights</span>
          </h1>
          <p className="mt-2 text-muted text-lg">Generate comprehensive analytics reports from sample timetable data.</p>
        </Reveal>

        {/* db summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Teachers',         value: DUMMY_WORKLOAD.length,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
            { label: 'Subjects',         value: DUMMY_SUBJECTS.length,   color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-200' },
            { label: 'Rooms',            value: DUMMY_ROOMS.length,      color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Timetable Entries',value: DUMMY_TIMETABLE_COUNT,   color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={`${i * 60}ms`}>
              <div className={`rounded-2xl border ${s.bg} p-5 text-center`}>
                <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
                <div className="text-xs font-semibold text-muted mt-1">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── Report builder ── */}
        <Reveal>
          <section className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 print:hidden">
            <div className="flex items-center gap-2 mb-5">
              <FaFilter className="text-amber-500" />
              <h2 className="text-xl font-extrabold">Report Builder</h2>
            </div>

            {/* report type cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.id}
                  id={`report-type-${rt.id}`}
                  onClick={() => setReportType(rt.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${reportType === rt.id ? 'border-primary bg-blue-50 shadow-sm ring-1 ring-primary/30' : 'border-slate-200 hover:border-primary/50 bg-white'}`}
                >
                  <span className="text-2xl">{rt.icon}</span>
                  <span className={`text-xs font-bold ${reportType === rt.id ? 'text-primary' : 'text-navy'}`}>{rt.label}</span>
                </button>
              ))}
            </div>

            {/* filters row */}
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-muted mb-1.5">Department Filter</label>
                <select
                  id="filter-dept"
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary bg-white"
                >
                  <option value="">All Departments</option>
                  {DEPT_OPTIONS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1.5">Status Filter</label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="overloaded">Overloaded</option>
                  <option value="optimal">Optimal</option>
                  <option value="underloaded">Under-loaded</option>
                  <option value="over">Over-allocated</option>
                  <option value="under">Under-allocated</option>
                  <option value="overbooked">Overbooked</option>
                  <option value="unused">Unused</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  id="btn-reset-filters"
                  onClick={resetFilters}
                  className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-muted hover:bg-slate-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  id="btn-generate-report"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md hover:from-amber-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {generating ? <FaSpinner className="animate-spin-slow text-xs" /> : <FaFileAlt className="text-xs" />}
                  {generating ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── Generated report ── */}
        {generated && (
          <div ref={reportRef}>
            <Reveal>
              <section className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">

                {/* report header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mb-2">
                      <HiSparkles /> {REPORT_TYPES.find(r => r.id === reportType)?.label}
                    </div>
                    <h2 className="text-xl font-extrabold">Analytics Report</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Generated: {new Date().toLocaleString()}
                      {deptFilter && ` · Dept: ${deptFilter}`}
                      {statusFilter !== 'all' && ` · Status: ${statusFilter}`}
                    </p>
                  </div>
                  {/* Export buttons */}
                  <div className="flex gap-2 flex-wrap print:hidden">
                    <button
                      id="btn-export-pdf"
                      onClick={exportPDF}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
                    >
                      <FaFilePdf /> Export PDF
                    </button>
                    <button
                      id="btn-export-teacher-csv"
                      onClick={() => exportCSV(
                        filteredWorkload.map(t => ({ Teacher: t.teacherName, Department: t.department, 'Scheduled Hours': t.totalHours, 'Max Hours': t.maxWeeklyHours, Status: t.status })),
                        'teacher_workload.csv'
                      )}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                    >
                      <FaFileExcel /> Teacher CSV
                    </button>
                    <button
                      id="btn-export-room-csv"
                      onClick={() => exportCSV(
                        filteredRooms.map(r => ({ Room: r.roomName, Type: r.roomType, Capacity: r.capacity, 'Scheduled Hrs': r.scheduledHours, 'Available Hrs': r.availableHours, 'Utilization %': r.utilization, Status: r.status })),
                        'room_utilization.csv'
                      )}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    >
                      <FaDownload /> Room CSV
                    </button>
                  </div>
                </div>

                {/* ── Teacher Workload section ── */}
                {['workload','full'].includes(reportType) && (
                  <div className="mb-8">
                    <h3 className="font-extrabold text-base mb-3 flex items-center gap-2">
                      <span className="text-xl">👨‍🏫</span> Teacher Workload
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{filteredWorkload.length} records</span>
                    </h3>
                    <Table
                      headers={['Teacher','Department','Scheduled Hrs','Max Hrs','Status']}
                      rows={filteredWorkload.map(t => [
                        <span className="font-semibold">{t.teacherName}</span>,
                        t.department,
                        <span className={t.totalHours > t.maxWeeklyHours ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>{t.totalHours}h</span>,
                        `${t.maxWeeklyHours}h`,
                        <StatusBadge status={t.status} />,
                      ])}
                      emptyMsg="No teacher workload data matching filters"
                    />
                  </div>
                )}

                {/* ── Subject Distribution section ── */}
                {['subjects','full'].includes(reportType) && (
                  <div className="mb-8">
                    <h3 className="font-extrabold text-base mb-3 flex items-center gap-2">
                      <span className="text-xl">📚</span> Subject Distribution
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{filteredSubjects.length} records</span>
                    </h3>
                    <Table
                      headers={['Subject','Department','Weekly Hours (target)','Scheduled Hrs']}
                      rows={filteredSubjects.map(s => [
                        <span className="font-semibold">{s.subjectName}</span>,
                        s.department,
                        `${s.weeklyHours}h`,
                        <span className={s.scheduledHours > s.weeklyHours ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>{s.scheduledHours}h</span>,
                      ])}
                      emptyMsg="No subject data matching filters"
                    />
                  </div>
                )}

                {/* ── Room Utilization section ── */}
                {['rooms','full'].includes(reportType) && (
                  <div className="mb-8">
                    <h3 className="font-extrabold text-base mb-3 flex items-center gap-2">
                      <span className="text-xl">🏫</span> Room Utilization
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{filteredRooms.length} records</span>
                    </h3>
                    <Table
                      headers={['Room','Type','Capacity','Scheduled Hrs','Available Hrs','Utilization','Status']}
                      rows={filteredRooms.map(r => [
                        <span className="font-semibold">{r.roomName}</span>,
                        r.roomType,
                        r.capacity,
                        `${r.scheduledHours}h`,
                        `${r.availableHours}h`,
                        <span className={r.utilization >= 100 ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>{r.utilization}%</span>,
                        <StatusBadge status={r.status} />,
                      ])}
                      emptyMsg="No room data matching filters"
                    />
                  </div>
                )}

                {/* ── Room Conflicts section ── */}
                {['conflicts','full'].includes(reportType) && (
                  <div className="mb-8">
                    <h3 className="font-extrabold text-base mb-3 flex items-center gap-2">
                      <span className="text-xl">⚠️</span> Room Conflicts
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">0 conflicts</span>
                    </h3>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm font-semibold flex items-center gap-2">
                      <FaCheckCircle /> No room conflicts detected — timetable is clean!
                    </div>
                  </div>
                )}

                {/* ── AI Insights section ── */}
                {['insights','full'].includes(reportType) && (
                  <div className="mb-4">
                    <h3 className="font-extrabold text-base mb-3 flex items-center gap-2">
                      <span className="text-xl">🤖</span> AI Insights
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">{insights.length} insights</span>
                    </h3>
                    <div className="space-y-3">
                      {insights.map((ins, i) => {
                        const bg = ins.type === 'warning' ? 'bg-amber-50 border-amber-200' : ins.type === 'error' ? 'bg-rose-50 border-rose-200' : ins.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200';
                        return (
                          <div key={i} className={`rounded-xl border ${bg} p-4 flex gap-3`}>
                            <span className="text-xl flex-shrink-0">{ins.icon}</span>
                            <div>
                              <div className="font-bold text-sm text-navy">{ins.title}</div>
                              <div className="text-xs text-muted mt-0.5 leading-relaxed">{ins.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </section>
            </Reveal>
          </div>
        )}

        {/* empty-state when not generated */}
        {!generated && !loading && (
          <Reveal>
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-muted">
              <FaFileAlt className="text-5xl mx-auto mb-4 text-slate-300" />
              <p className="font-bold text-lg">No report generated yet</p>
              <p className="text-sm mt-1">Select a report type, apply optional filters, then click <strong>Generate</strong>.</p>
            </div>
          </Reveal>
        )}

      </main>

      <style>{`
        .reveal-on-scroll { opacity:0; transform:translateY(24px); transition:opacity .55s ease,transform .55s ease; }
        .reveal-on-scroll.is-visible { opacity:1; transform:translateY(0); }
        @keyframes rp-shrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes rp-spin { to{transform:rotate(360deg)} }
        .animate-spin-slow { animation: rp-spin 1s linear infinite; }
        @media print {
          header, .print\\:hidden { display:none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
