import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaBookOpen, FaExclamationTriangle, FaInfoCircle, FaTimes,
} from 'react-icons/fa';

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } }, { threshold: 0.08 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, delay = '0ms', className = '' }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal-on-scroll ${className}`} style={{ transitionDelay: delay }}>{children}</div>;
}

const INITIAL_SUBJECTS = [
  { id: 1,  name: 'Algorithms',       dept: 'Computer Science', teacher: 'Dr. Anita Sharma',    hoursPerWeek: 4, maxHours: 5, classes: ['CS-A', 'CS-B'] },
  { id: 2,  name: 'Data Structures',  dept: 'Computer Science', teacher: 'Dr. Anita Sharma',    hoursPerWeek: 3, maxHours: 4, classes: ['CS-A']         },
  { id: 3,  name: 'Math III',         dept: 'Mathematics',      teacher: 'Prof. Ravi Kumar',    hoursPerWeek: 4, maxHours: 4, classes: ['CS-A', 'EC-A']  },
  { id: 4,  name: 'Networks',         dept: 'Computer Science', teacher: 'Dr. Preethi Nair',    hoursPerWeek: 3, maxHours: 4, classes: ['CS-B']          },
  { id: 5,  name: 'OS Concepts',      dept: 'Computer Science', teacher: 'Dr. Preethi Nair',    hoursPerWeek: 3, maxHours: 3, classes: ['CS-A']          },
  { id: 6,  name: 'Databases',        dept: 'Computer Science', teacher: 'Dr. Meera Krishnan',  hoursPerWeek: 6, maxHours: 4, classes: ['CS-A', 'CS-B']  },
  { id: 7,  name: 'AI & ML',          dept: 'Computer Science', teacher: 'Dr. Anita Sharma',    hoursPerWeek: 4, maxHours: 4, classes: ['CS-A']          },
  { id: 8,  name: 'Physics I',        dept: 'Physics',          teacher: 'Mr. Suresh Babu',     hoursPerWeek: 0, maxHours: 3, classes: []                },
  { id: 9,  name: 'Calculus',         dept: 'Mathematics',      teacher: '',                    hoursPerWeek: 2, maxHours: 3, classes: ['EC-A']          },
  { id: 10, name: 'Web Dev',          dept: 'Computer Science', teacher: 'Dr. Meera Krishnan',  hoursPerWeek: 3, maxHours: 3, classes: ['CS-B']          },
  { id: 11, name: 'Cloud Computing',  dept: 'Computer Science', teacher: 'Dr. Meera Krishnan',  hoursPerWeek: 2, maxHours: 3, classes: ['CS-A']          },
  { id: 12, name: 'Digital Circuits', dept: 'Electronics',      teacher: 'Prof. Karthik Rajan', hoursPerWeek: 2, maxHours: 3, classes: ['EC-A']          },
];

const DEPT_BAR_COLORS = {
  'Computer Science': 'bg-blue-500',
  'Mathematics': 'bg-violet-500',
  'Physics': 'bg-amber-500',
  'Electronics': 'bg-emerald-500',
};

const TEACHERS = ['Dr. Anita Sharma', 'Prof. Ravi Kumar', 'Dr. Preethi Nair', 'Mr. Suresh Babu', 'Dr. Meera Krishnan', 'Prof. Karthik Rajan'];
const DEPTS    = ['Computer Science', 'Mathematics', 'Physics', 'Electronics'];

function getStatus(s) {
  if (s.hoursPerWeek === 0)              return 'unscheduled';
  if (s.hoursPerWeek > s.maxHours)       return 'over';
  if (s.hoursPerWeek < s.maxHours * 0.5) return 'under';
  if (!s.teacher)                         return 'no-teacher';
  return 'ok';
}

const STATUS_META = {
  over:        { label: 'Over-allocated',  cls: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
  under:       { label: 'Under-allocated', cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  unscheduled: { label: 'Not Scheduled',   cls: 'bg-slate-100 dark:bg-slate-700 text-muted dark:text-slate-400 border border-slate-200 dark:border-slate-600' },
  'no-teacher':{ label: 'No Teacher',      cls: 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800' },
  ok:          { label: 'OK',              cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
};

function validateSubject(s, all) {
  const errs = [];
  if (!s.name.trim())                                                                         errs.push('Subject name is required.');
  if (s.hoursPerWeek <= 0)                                                                    errs.push('Weekly hours must be > 0.');
  if (s.hoursPerWeek > s.maxHours)                                                            errs.push(`Hours (${s.hoursPerWeek}) exceed max (${s.maxHours}).`);
  if (!s.teacher)                                                                             errs.push('A teacher must be assigned.');
  if (all.some(x => x.id !== s.id && x.name.trim().toLowerCase() === s.name.trim().toLowerCase())) errs.push('Duplicate subject name.');
  return errs;
}

function AddSubjectModal({ onClose, onAdd, existing }) {
  const [form, setForm] = useState({ name: '', dept: 'Computer Science', teacher: '', hoursPerWeek: '', maxHours: '' });
  const [errors, setErrors] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    const candidate = { ...form, id: Date.now(), hoursPerWeek: Number(form.hoursPerWeek), maxHours: Number(form.maxHours), classes: [] };
    const errs = validateSubject(candidate, existing);
    if (errs.length) { setErrors(errs); return; }
    onAdd(candidate); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-navy dark:text-white text-lg">Add Subject</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted"><FaTimes /></button>
        </div>
        {errors.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 mb-4 space-y-1">
            {errors.map(e => <div key={e} className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5"><FaExclamationTriangle className="flex-shrink-0" />{e}</div>)}
          </div>
        )}
        <div className="space-y-3">
          {[
            { label: 'Subject Name *', k: 'name', type: 'text', ph: 'e.g. Software Engineering' },
            { label: 'Weekly Hours *', k: 'hoursPerWeek', type: 'number', ph: 'e.g. 3' },
            { label: 'Max Hours *',    k: 'maxHours',     type: 'number', ph: 'e.g. 4' },
          ].map(f => (
            <div key={f.k}>
              <label className="text-xs font-bold text-muted dark:text-slate-400 mb-1 block">{f.label}</label>
              <input type={f.type} placeholder={f.ph} value={form[f.k]} onChange={e => set(f.k, e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-slate-100 focus:outline-none focus:border-primary transition-colors" />
            </div>
          ))}
          <div>
            <label className="text-xs font-bold text-muted dark:text-slate-400 mb-1 block">Department *</label>
            <select value={form.dept} onChange={e => set('dept', e.target.value)} className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-slate-100 focus:outline-none focus:border-primary transition-colors">
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted dark:text-slate-400 mb-1 block">Assign Teacher *</label>
            <select value={form.teacher} onChange={e => set('teacher', e.target.value)} className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-slate-100 focus:outline-none focus:border-primary transition-colors">
              <option value="">-- Select teacher --</option>
              {TEACHERS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-600 rounded-xl text-muted dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-secondary to-violet-700 rounded-xl shadow-md hover:from-indigo-700 hover:to-violet-600 transition-all">Add Subject</button>
        </div>
      </div>
    </div>
  );
}

export default function SubjectDistribution() {
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  const issues   = subjects.filter(s => getStatus(s) !== 'ok');
  const filtered = filter === 'all' ? subjects : subjects.filter(s => getStatus(s) === filter);
  const noData   = subjects.length === 0;

  const deptTotals = Object.entries(subjects.reduce((acc, s) => { acc[s.dept] = (acc[s.dept] || 0) + s.hoursPerWeek; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const maxDept = Math.max(...deptTotals.map(d => d[1]), 1);

  const classTotals = Object.entries(subjects.reduce((acc, s) => { s.classes.forEach(c => { acc[c] = (acc[c] || 0) + s.hoursPerWeek; }); return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const maxClass = Math.max(...classTotals.map(c => c[1]), 1);

  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">
      {showModal && <AddSubjectModal onClose={() => setShowModal(false)} onAdd={s => setSubjects(p => [...p, s])} existing={subjects} />}

      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link to="/analytics" id="subj-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors"><FaArrowLeft className="text-xs" /> Analytics</Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold">Subject Distribution</span>
        <button id="add-subject-btn" onClick={() => setShowModal(true)} className="ml-auto text-xs font-bold text-white bg-gradient-to-r from-secondary to-violet-700 px-4 py-2 rounded-xl shadow-md hover:from-indigo-700 transition-all">+ Add Subject</button>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-10">
        <Reveal>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mb-2">Subject <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Distribution</span></h1>
          <p className="text-muted dark:text-slate-400 text-lg">Analyse subject-hour allocations, class distributions, and departmental load.</p>
        </Reveal>

        {noData && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-3">
            <FaExclamationTriangle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" />
            <div><div className="font-bold text-amber-700 dark:text-amber-300 mb-1">No Subject Data</div><div className="text-sm text-amber-600 dark:text-amber-400">Add subjects to view distribution charts.</div></div>
          </div>
        )}

        {issues.length > 0 && (
          <Reveal>
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 mb-3"><FaExclamationTriangle /> {issues.length} Subject{issues.length > 1 ? 's' : ''} Need Attention</div>
              <div className="space-y-1">
                {issues.map(s => (
                  <div key={s.id} className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <span className="font-semibold">{s.name}:</span>
                    {getStatus(s) === 'over'        && `Over-allocated by ${s.hoursPerWeek - s.maxHours}h`}
                    {getStatus(s) === 'under'       && 'Under-allocated (<50% of max hours)'}
                    {getStatus(s) === 'unscheduled' && '0 hours assigned — not scheduled'}
                    {getStatus(s) === 'no-teacher'  && 'No teacher assigned'}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Department chart */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Department-wise Allocation</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Total weekly subject hours per department</p>
            {noData
              ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No data available</div>
              : <div className="space-y-3">
                  {deptTotals.map(([dept, hrs]) => (
                    <div key={dept} className="flex items-center gap-3">
                      <div className="w-36 text-xs font-semibold text-muted dark:text-slate-400 truncate flex-shrink-0">{dept}</div>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${DEPT_BAR_COLORS[dept] || 'bg-primary'} transition-all duration-700`} style={{ width: `${(hrs / maxDept) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-muted dark:text-slate-400 w-10 text-right">{hrs}h</span>
                    </div>
                  ))}
                </div>
            }
          </section>
        </Reveal>

        {/* Class chart */}
        <Reveal>
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Class-wise Subject Hours</h2>
            <p className="text-sm text-muted dark:text-slate-400 mb-5">Weekly hours per class section</p>
            {noData || classTotals.length === 0
              ? <div className="h-28 flex items-center justify-center text-muted dark:text-slate-500 text-sm">No class data — assign subjects to classes</div>
              : <div className="flex items-end gap-4 h-36">
                  {classTotals.map(([cls, hrs]) => (
                    <div key={cls} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold text-secondary dark:text-indigo-400">{hrs}h</span>
                      <div className="w-full rounded-t-xl bg-gradient-to-t from-secondary to-violet-400 transition-all duration-700 hover:opacity-80" style={{ height: `${(hrs / maxClass) * 100}%`, minHeight: '8px' }} />
                      <span className="text-[10px] font-semibold text-muted dark:text-slate-400">{cls}</span>
                    </div>
                  ))}
                </div>
            }
          </section>
        </Reveal>

        {/* Subject list */}
        <Reveal>
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-extrabold text-navy dark:text-white">Subject Hours per Week</h2>
              <div className="flex flex-wrap gap-2">
                {['all', 'over', 'under', 'unscheduled', 'no-teacher', 'ok'].map(k => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter === k ? 'bg-secondary text-white border-secondary' : 'bg-white dark:bg-slate-800 text-muted dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                    {k === 'all' ? 'All' : k === 'no-teacher' ? 'No Teacher' : k === 'ok' ? 'OK' : k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {filtered.length === 0
              ? <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center text-muted dark:text-slate-400 text-sm">No subjects match this filter.</div>
              : <div className="grid gap-3">
                  {filtered.map(s => {
                    const st = getStatus(s); const meta = STATUS_META[st];
                    const pct = s.maxHours > 0 ? Math.min((s.hoursPerWeek / s.maxHours) * 100, 100) : 0;
                    const over = s.hoursPerWeek > s.maxHours;
                    return (
                      <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md p-5 hover:shadow-lg transition-shadow">
                        <div className="flex flex-wrap items-start gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-xl ${DEPT_BAR_COLORS[s.dept] || 'bg-primary'} flex items-center justify-center text-white text-xs flex-shrink-0`}><FaBookOpen /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-navy dark:text-slate-100 text-sm">{s.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                            </div>
                            <div className="text-xs text-muted dark:text-slate-400 mt-0.5">{s.dept} {s.teacher ? `· ${s.teacher}` : <span className="text-orange-500">· No teacher</span>}</div>
                          </div>
                          <span className={`text-xs font-bold ${over ? 'text-rose-500' : 'text-muted dark:text-slate-400'}`}>{s.hoursPerWeek}h / {s.maxHours}h</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-secondary to-accent'}`} style={{ width: `${pct}%` }} />
                        </div>
                        {s.classes.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{s.classes.map(c => <span key={c} className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-muted dark:text-slate-300 rounded-full px-2.5 py-0.5">{c}</span>)}</div>}
                        {s.hoursPerWeek === 0 && <div className="mt-2 text-[11px] font-bold text-amber-500 flex items-center gap-1.5"><FaInfoCircle />Subject has 0 hours — not yet scheduled</div>}
                        {!s.teacher && <div className="mt-1 text-[11px] font-bold text-orange-500 flex items-center gap-1.5"><FaExclamationTriangle />No teacher assigned</div>}
                      </div>
                    );
                  })}
                </div>
            }
          </section>
        </Reveal>
      </main>
      <style>{`.reveal-on-scroll{opacity:0;transform:translateY(24px);transition:opacity .55s ease,transform .55s ease}.reveal-on-scroll.is-visible{opacity:1;transform:translateY(0)}`}</style>
    </div>
  );
}
