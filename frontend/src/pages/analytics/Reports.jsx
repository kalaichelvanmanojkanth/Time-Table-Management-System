import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaFileAlt, FaDownload, FaSpinner, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const REPORT_TYPES = [
  { id: 'workload',  label: 'Teacher Workload Report',  desc: 'Summary of faculty hours, overloads, and distribution.' },
  { id: 'subject',   label: 'Subject Distribution Report', desc: 'Subject hours, class allocation, and dept load.' },
  { id: 'resource',  label: 'Resource Utilization Report', desc: 'Room usage, lab occupancy, peak analysis.' },
  { id: 'full',      label: 'Full Analytics Report',    desc: 'Comprehensive report combining all analytics data.' },
];

const today = new Date().toISOString().split('T')[0];
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

function validate(form) {
  const errs = [];
  if (!form.type)              errs.push('Please select a report type.');
  if (!form.from)              errs.push('Start date is required.');
  if (!form.to)                errs.push('End date is required.');
  if (form.from && form.to && form.from > form.to) errs.push('Start date must be before end date.');
  return errs;
}

export default function Reports() {
  const [form, setForm]           = useState({ type: '', from: weekAgo, to: today });
  const [errors, setErrors]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [generated, setGenerated] = useState(null);
  const [exported, setExported]   = useState(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors([]); setGenerated(null); };

  const generate = () => {
    const errs = validate(form);
    if (errs.length) { setErrors(errs); return; }
    setLoading(true); setGenerated(null); setExported(null);
    setTimeout(() => {
      setLoading(false);
      setGenerated({
        type: form.type,
        label: REPORT_TYPES.find(r => r.id === form.type)?.label,
        from: form.from, to: form.to,
        records: Math.floor(Math.random() * 40) + 20,
        generatedAt: new Date().toLocaleTimeString(),
      });
    }, 2000);
  };

  const exportReport = (fmt) => {
    if (!generated) return;
    setExported(fmt);
    setTimeout(() => setExported(null), 3000);
  };

  const canExport = !!generated && !loading;
  const canGenerate = !loading;

  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link to="/analytics" id="reports-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors"><FaArrowLeft className="text-xs" /> Analytics</Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold">Reports & Insights</span>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-10">
        {/* Heading */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mb-2">
            Reports & <span className="bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent">Insights</span>
          </h1>
          <p className="text-muted dark:text-slate-400 text-lg">Generate and export workload, subject, and resource analytics reports.</p>
        </div>

        {/* Report Generator */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Report Generator</h2>
          <p className="text-sm text-muted dark:text-slate-400 mb-6">Select a report type and date range, then generate to preview and export.</p>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mb-5 space-y-1.5">
              {errors.map(e => (
                <div key={e} className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2"><FaExclamationTriangle className="flex-shrink-0" />{e}</div>
              ))}
            </div>
          )}

          {/* Report type selection */}
          <p className="text-sm font-bold text-navy dark:text-slate-200 mb-3">1. Select Report Type *</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {REPORT_TYPES.map(r => (
              <button
                key={r.id}
                id={`report-type-${r.id}`}
                onClick={() => set('type', r.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                  form.type === r.id
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaFileAlt className={form.type === r.id ? 'text-amber-500' : 'text-muted dark:text-slate-500'} />
                  <span className="font-bold text-sm text-navy dark:text-slate-100">{r.label}</span>
                </div>
                <p className="text-xs text-muted dark:text-slate-400">{r.desc}</p>
              </button>
            ))}
          </div>

          {/* Date range */}
          <p className="text-sm font-bold text-navy dark:text-slate-200 mb-3">2. Select Date Range *</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[{ label: 'From', k: 'from' }, { label: 'To', k: 'to' }].map(f => (
              <div key={f.k}>
                <label className="text-xs font-bold text-muted dark:text-slate-400 mb-1 block">{f.label} *</label>
                <input
                  type="date" value={form[f.k]} max={today}
                  onChange={e => set(f.k, e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Generate button */}
          <button
            id="generate-report-btn"
            onClick={generate}
            disabled={!canGenerate}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-white px-8 py-3.5 rounded-xl shadow-lg transition-all duration-200 text-sm ${
              canGenerate
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-xl'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            {loading ? <><FaSpinner className="animate-spin" /> Generating…</> : <><FaFileAlt /> Generate Report</>}
          </button>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center text-primary dark:text-blue-400"><FaSpinner className="animate-spin text-lg" /></div>
            <div>
              <div className="font-bold text-navy dark:text-slate-100 mb-0.5">Generating Report…</div>
              <div className="text-sm text-muted dark:text-slate-400">Analysing data and compiling analytics. Please wait.</div>
            </div>
          </div>
        )}

        {/* Generated report preview */}
        {generated && !loading && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="text-emerald-500 text-lg" />
                  <h2 className="text-xl font-extrabold text-navy dark:text-white">Report Ready</h2>
                </div>
                <p className="text-sm text-muted dark:text-slate-400">Generated at {generated.generatedAt}</p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1">Ready for Export</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Report Type',   value: generated.label    },
                { label: 'Date Range',    value: `${generated.from} → ${generated.to}` },
                { label: 'Total Records', value: `${generated.records} entries` },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 dark:bg-slate-700/60 rounded-2xl p-4">
                  <div className="text-xs font-bold text-muted dark:text-slate-400 mb-1">{s.label}</div>
                  <div className="font-bold text-navy dark:text-slate-100 text-sm">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Preview table mock */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/60">
                  <tr>
                    {['#', 'Name', 'Category', 'Value', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted dark:text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {[
                    ['1', 'Dr. Anita Sharma',    'Faculty',   '22h/week', 'Overloaded'],
                    ['2', 'Databases',            'Subject',   '6h/week',  'Over-allocated'],
                    ['3', 'Room D101',            'Resource',  '10/10 slots', 'Overbooked'],
                    ['4', 'Prof. Ravi Kumar',     'Faculty',   '18h/week', 'Optimal'],
                    ['5', 'Algorithms',           'Subject',   '4h/week',  'OK'],
                  ].map(row => (
                    <tr key={row[0]} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      {row.map((cell, i) => (
                        <td key={i} className={`px-4 py-3 ${i === 4 ? (cell === 'Overloaded' || cell === 'Over-allocated' || cell === 'Overbooked' ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold') : 'text-navy dark:text-slate-200'}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/40 text-xs text-muted dark:text-slate-400">Showing 5 of {generated.records} records</div>
            </div>

            {/* Export buttons */}
            <div>
              <p className="text-sm font-bold text-navy dark:text-slate-200 mb-3">Export Report</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { fmt: 'PDF',   label: 'Export as PDF',   color: 'from-rose-500 to-red-500'    },
                  { fmt: 'Excel', label: 'Export as Excel', color: 'from-emerald-500 to-teal-500' },
                ].map(({ fmt, label, color }) => (
                  <button
                    key={fmt}
                    id={`export-${fmt.toLowerCase()}-btn`}
                    onClick={() => exportReport(fmt)}
                    disabled={!canExport}
                    className={`inline-flex items-center gap-2 font-bold text-white text-sm px-6 py-2.5 rounded-xl shadow-md transition-all duration-200 ${
                      canExport
                        ? `bg-gradient-to-r ${color} hover:-translate-y-0.5 hover:shadow-lg`
                        : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <FaDownload /> {exported === fmt ? `✓ ${fmt} Downloaded!` : label}
                  </button>
                ))}
              </div>
              {!canExport && <p className="text-xs text-muted dark:text-slate-500 mt-2">Generate a report first to enable export.</p>}
            </div>
          </div>
        )}

        {/* No data placeholder (shown when no report yet and not loading) */}
        {!generated && !loading && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center">
            <FaFileAlt className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <div className="font-bold text-navy dark:text-slate-200 mb-1">No Report Generated Yet</div>
            <div className="text-sm text-muted dark:text-slate-400">Fill in the form above and click "Generate Report" to create your analytics report.</div>
          </div>
        )}
      </main>
    </div>
  );
}
