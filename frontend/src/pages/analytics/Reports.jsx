import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft, FaFileAlt, FaDownload, FaSpinner,
  FaExclamationTriangle, FaCheckCircle, FaTimes,
  FaTimesCircle, FaInfoCircle, FaRedo,
} from 'react-icons/fa';

/* ══ TOAST ══ */
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
function Toast({ t, onDismiss }) {
  const [show, setShow] = useState(false);
  const s = T_STYLE[t.type];
  useEffect(() => {
    const a = setTimeout(() => setShow(true), 10);
    const b = setTimeout(() => { setShow(false); setTimeout(() => onDismiss(t.id), 300); }, t.dur || 3800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const close = () => { setShow(false); setTimeout(() => onDismiss(t.id), 300); };
  return (
    <div className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg ring-1 ${s.ring} px-4 pt-4 pb-3 min-w-[280px] max-w-[340px] overflow-hidden transition-all duration-300 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} role="alert">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />
      <span className={`mt-0.5 flex-shrink-0 ${s.icon}`}>{T_ICON[t.type]}</span>
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-[10px] font-extrabold text-navy uppercase tracking-wide mb-0.5">{t.title}</p>}
        <p className="text-xs text-slate-600 leading-snug">{t.msg}</p>
      </div>
      <button onClick={close} className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"><FaTimes className="text-xs" /></button>
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.bar} origin-left`} style={{ animation: `rp-shrink ${t.dur || 3800}ms linear forwards` }} />
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
    const id = ++_tid;
    setList(p => [...p, { id, type, msg, title, dur }]);
  }, []);
  return {
    list, dismiss,
    toast: {
      success: (m, t, d) => push('success', m, t || 'Success', d),
      warning: (m, t, d) => push('warning', m, t || 'Warning', d),
      error:   (m, t, d) => push('error',   m, t || 'Error',   d),
      info:    (m, t, d) => push('info',    m, t || 'Info',    d),
    },
  };
}

/* ══ CONSTANTS ══ */
const REPORT_TYPES = [
  { id: 'workload',  label: 'Teacher Workload Report',     desc: 'Summary of faculty hours, overloads, and distribution.' },
  { id: 'subject',   label: 'Subject Distribution Report', desc: 'Subject hours, class allocation, and dept load.'         },
  { id: 'resource',  label: 'Resource Utilization Report', desc: 'Room usage, lab occupancy, peak analysis.'               },
  { id: 'full',      label: 'Full Analytics Report',       desc: 'Comprehensive report combining all analytics data.'      },
];

const todayStr   = new Date().toISOString().split('T')[0];
const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const monthAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

/* ══ VALIDATE ══ */
function validate(form) {
  const field = {};
  if (!form.type)  field.type = 'Please select a report type';
  if (!form.from)  field.from = 'Start date is required';
  if (!form.to)    field.to   = 'End date is required';
  if (form.from && form.to && form.from > form.to) field.range = 'Start date must be before end date';
  return field;
}

/* ══ MOCK TABLE ROWS ══ */
const PREVIEW_ROWS = [
  ['1', 'Dr. Anita Sharma',  'Faculty',   '22h/week',    'Overloaded'],
  ['2', 'Databases',          'Subject',   '6h/week',     'Over-allocated'],
  ['3', 'Room D101',          'Resource',  '10/10 slots', 'Overbooked'],
  ['4', 'Prof. Ravi Kumar',   'Faculty',   '18h/week',    'Optimal'],
  ['5', 'Algorithms',         'Subject',   '4h/week',     'OK'],
];

/* ══ STATUS BADGE ══ */
const STATUS_CLS = (v) =>
  ['Overloaded', 'Over-allocated', 'Overbooked'].includes(v)
    ? 'text-rose-500 font-bold'
    : 'text-emerald-600 font-bold';

const STATUS_TIPS = {
  Overloaded:      'Faculty assignment exceeds weekly hour limit',
  'Over-allocated':'Subject hours exceed allowed maximum',
  Overbooked:      'Room usage at full capacity',
  Optimal:         'Within the recommended range',
  OK:              'Allocation is within normal limits',
};

/* ══ CONFIRM EXPORT DIALOG ══ */
function ConfirmExport({ fmt, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 rp-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500 text-xl">
            <FaDownload />
          </div>
          <div>
            <h3 className="font-extrabold text-navy dark:text-white">Export Report</h3>
            <p className="text-xs text-muted mt-0.5">This action will download the file.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Do you want to export this report as <strong>{fmt}</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-muted hover:bg-slate-50 transition-colors">Cancel</button>
          <button
            id={`confirm-export-${fmt?.toLowerCase()}`}
            onClick={onConfirm}
            className="px-5 py-2 text-xs font-extrabold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm"
          >
            Yes, Export
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ MAIN ══ */
export default function Reports() {
  const [form, setForm]           = useState({ type: '', from: weekAgoStr, to: todayStr });
  const [fieldErrs, setFieldErrs] = useState({});
  const [loading, setLoading]     = useState(false);
  const [generated, setGenerated] = useState(null);
  const [exporting, setExporting] = useState(null);   // fmt being exported
  const [exported, setExported]   = useState(null);   // last exported fmt
  const [confirmFmt, setConfirmFmt] = useState(null); // export confirm dialog
  const { list, dismiss, toast }  = useToast();

  const firstErrRef  = useRef(null);
  const typeRef      = useRef(null);
  const fromRef      = useRef(null);

  /* ── field setter — clears only that field error ── */
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setFieldErrs(prev => { const n = { ...prev }; delete n[k]; delete n.range; return n; });
    setGenerated(null);
  };

  /* ── quick date range presets ── */
  const applyPreset = (label) => {
    if (label === 'Today')      { set('from', todayStr);    setForm(f => ({ ...f, from: todayStr,    to: todayStr    })); }
    if (label === 'Last 7 days'){ setForm(f => ({ ...f, from: weekAgoStr,  to: todayStr })); setFieldErrs({}); setGenerated(null); }
    if (label === 'Last 30 days'){ setForm(f => ({ ...f, from: monthAgoStr, to: todayStr })); setFieldErrs({}); setGenerated(null); }
  };

  /* ── reset ── */
  const resetForm = () => {
    setForm({ type: '', from: weekAgoStr, to: todayStr });
    setFieldErrs({});
    setGenerated(null);
    setExported(null);
    toast.info('Form reset successfully', 'Reset');
  };

  /* ── generate ── */
  const generate = () => {
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setFieldErrs(errs);
      // scroll + focus first error
      setTimeout(() => firstErrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      if (errs.type)  { typeRef.current?.focus(); toast.error('Please select a report type', 'Validation'); return; }
      if (errs.from)  { fromRef.current?.focus(); toast.error('Start date is required', 'Validation'); return; }
      if (errs.to)                                { toast.error('End date is required', 'Validation'); return; }
      if (errs.range)                             { toast.error('Start date must be before end date', 'Validation'); return; }
      return;
    }

    const dayDiff = (new Date(form.to) - new Date(form.from)) / 86400000;
    if (dayDiff > 60) toast.warning('Large report may take longer to generate', 'Warning', 5000);

    setLoading(true); setGenerated(null); setExported(null);
    toast.info('Generating report…', 'Info', 2000);

    setTimeout(() => {
      setLoading(false);
      const rec = Math.floor(Math.random() * 40) + 20;
      setGenerated({
        type: form.type,
        label: REPORT_TYPES.find(r => r.id === form.type)?.label,
        from: form.from, to: form.to,
        records: rec,
        generatedAt: new Date().toLocaleTimeString(),
      });
      toast.success('Report generated successfully', 'Success');
      if (rec < 5) toast.warning('No data found for selected range', 'Warning', 5000);
    }, 2000);
  };

  /* ── export flow ── */
  const requestExport = (fmt) => setConfirmFmt(fmt);
  const doExport = () => {
    const fmt = confirmFmt;
    setConfirmFmt(null);
    if (!generated) return;
    setExporting(fmt);
    setTimeout(() => {
      setExporting(null);
      setExported(fmt);
      toast.success(`${fmt} file downloaded`, 'Success');
      toast.success('Report exported successfully', 'Success', 4200);
      setTimeout(() => setExported(null), 4000);
    }, 1500);
  };

  /* ── derived ── */
  const errs = fieldErrs;
  const formValid = !errs.type && !errs.from && !errs.to && !errs.range && form.type && form.from && form.to && form.from <= form.to;
  const canGenerate = !loading && formValid;
  const canExport   = !!generated && !loading && !exporting;

  return (
    <div className="min-h-screen bg-surface dark:bg-navy font-sans text-navy dark:text-slate-100 antialiased">
      <Toasts list={list} dismiss={dismiss} />
      {confirmFmt && <ConfirmExport fmt={confirmFmt} onConfirm={doExport} onCancel={() => setConfirmFmt(null)} />}

      {/* ── header ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link to="/analytics" id="reports-back" className="inline-flex items-center gap-2 text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
          <FaArrowLeft className="text-xs" /> Analytics
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold">Reports &amp; Insights</span>
        {/* Reset button in header */}
        <button
          id="reset-form-btn"
          onClick={resetForm}
          aria-label="Reset form"
          title="Reset all form fields"
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-muted hover:border-amber-400 hover:text-amber-600 transition-all"
        >
          <FaRedo className="text-[10px]" /> Reset Form
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* Heading */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mb-2">
            Reports &amp; <span className="bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent">Insights</span>
          </h1>
          <p className="text-muted dark:text-slate-400 text-lg">Generate and export workload, subject, and resource analytics reports.</p>
        </div>

        {/* ── Report Generator Card ── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl p-6 sm:p-8" ref={firstErrRef}>
          <h2 className="text-xl font-extrabold text-navy dark:text-white mb-1">Report Generator</h2>
          <p className="text-sm text-muted dark:text-slate-400 mb-6">Select a report type and date range, then generate to preview and export.</p>

          {/* ── Inline validation summary ── */}
          {Object.keys(errs).length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mb-5 space-y-1.5 rp-fade-in">
              {errs.type  && <div className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2"><FaExclamationTriangle className="flex-shrink-0" />Please select a report type</div>}
              {errs.from  && <div className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2"><FaExclamationTriangle className="flex-shrink-0" />Start date is required</div>}
              {errs.to    && <div className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2"><FaExclamationTriangle className="flex-shrink-0" />End date is required</div>}
              {errs.range && <div className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2"><FaExclamationTriangle className="flex-shrink-0" />Start date must be before end date</div>}
            </div>
          )}

          {/* ── Report type ── */}
          <p className="text-sm font-bold text-navy dark:text-slate-200 mb-1">1. Select Report Type *</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Choose the type of analytics report to generate</p>
          {errs.type && (
            <p className="text-[10px] text-rose-500 mb-2 flex items-center gap-1 rp-fade-in"><FaExclamationTriangle className="flex-shrink-0" />Please select a report type</p>
          )}
          <div
            ref={typeRef}
            tabIndex={-1}
            className={`grid sm:grid-cols-2 gap-3 mb-6 rounded-xl outline-none ${errs.type ? 'ring-2 ring-rose-300 ring-offset-2' : ''}`}
          >
            {REPORT_TYPES.map(r => (
              <button
                key={r.id}
                id={`report-type-${r.id}`}
                onClick={() => set('type', r.id)}
                title={r.desc}
                aria-label={`Select ${r.label}`}
                aria-pressed={form.type === r.id}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
                  form.type === r.id
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 scale-[1.02] shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:scale-[1.01] hover:shadow-sm bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaFileAlt className={form.type === r.id ? 'text-amber-500' : 'text-muted dark:text-slate-500'} />
                  <span className="font-bold text-sm text-navy dark:text-slate-100 flex-1">{r.label}</span>
                  {form.type === r.id && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] rp-fade-in">
                      <FaCheckCircle />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted dark:text-slate-400">{r.desc}</p>
              </button>
            ))}
          </div>

          {/* ── Date range ── */}
          <p className="text-sm font-bold text-navy dark:text-slate-200 mb-1">2. Select Date Range *</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Select a valid date range for report generation</p>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {['Today', 'Last 7 days', 'Last 30 days'].map(label => (
              <button
                key={label}
                onClick={() => applyPreset(label)}
                aria-label={`Apply ${label} preset`}
                className="text-[11px] font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-muted dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 transition-all"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-1">
            {/* From */}
            <div>
              <label htmlFor="date-from" className="text-xs font-bold text-muted dark:text-slate-400 mb-1 block">From *</label>
              <input
                id="date-from"
                ref={fromRef}
                type="date" value={form.from} max={todayStr}
                onChange={e => set('from', e.target.value)}
                aria-label="Start date"
                className={`w-full text-sm px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-700 text-navy dark:text-slate-100 focus:outline-none transition-colors ${
                  errs.from || errs.range ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-amber-500'
                }`}
              />
              {errs.from && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 rp-fade-in"><FaExclamationTriangle className="flex-shrink-0" />Start date is required</p>}
            </div>
            {/* To */}
            <div>
              <label htmlFor="date-to" className="text-xs font-bold text-muted dark:text-slate-400 mb-1 block">To *</label>
              <input
                id="date-to"
                type="date" value={form.to} max={todayStr}
                onChange={e => set('to', e.target.value)}
                aria-label="End date"
                className={`w-full text-sm px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-700 text-navy dark:text-slate-100 focus:outline-none transition-colors ${
                  errs.to || errs.range ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-amber-500'
                }`}
              />
              {errs.to && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 rp-fade-in"><FaExclamationTriangle className="flex-shrink-0" />End date is required</p>}
            </div>
          </div>
          {errs.range && (
            <p className="text-[10px] text-rose-500 mb-4 flex items-center gap-1 rp-fade-in"><FaExclamationTriangle className="flex-shrink-0" />Start date must be before end date</p>
          )}

          {/* Generate button */}
          <div className="mt-5">
            <span title={!canGenerate && !loading ? 'Complete required fields to generate report' : ''}>
              <button
                id="generate-report-btn"
                onClick={generate}
                disabled={!canGenerate}
                aria-label="Generate report"
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-white px-8 py-3.5 rounded-xl shadow-lg transition-all duration-200 text-sm ${
                  canGenerate
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2'
                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                {loading
                  ? <><FaSpinner className="animate-spin" /> Generating…</>
                  : <><FaFileAlt /> Generate Report</>
                }
              </button>
            </span>
            {!canGenerate && !loading && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Complete required fields to generate report</p>
            )}
          </div>
        </div>

        {/* ── Loading indicator ── */}
        {loading && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex items-center gap-4 rp-fade-in">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center text-primary dark:text-blue-400">
              <FaSpinner className="animate-spin text-lg" />
            </div>
            <div>
              <div className="font-bold text-navy dark:text-slate-100 mb-0.5">Generating Report…</div>
              <div className="text-sm text-muted dark:text-slate-400">Analysing data and compiling analytics. Please wait.</div>
            </div>
          </div>
        )}

        {/* ── Generated report preview ── */}
        {generated && !loading && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-emerald-300 dark:border-emerald-700 shadow-xl p-6 sm:p-8 rp-border-glow">
            {/* Ready header */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="text-emerald-500 text-lg" />
                  <h2 className="text-xl font-extrabold text-navy dark:text-white">Report Ready</h2>
                </div>
                <p className="text-sm text-muted dark:text-slate-400">Generated at {generated.generatedAt}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1 rp-badge-pop">
                  ✓ Ready for Export
                </span>
              </div>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-6">Your analytics report is ready for export</p>

            {/* Summary cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Report Type',   value: generated.label                        },
                { label: 'Date Range',    value: `${generated.from} → ${generated.to}` },
                { label: 'Total Records', value: `${generated.records} entries`         },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 dark:bg-slate-700/60 rounded-2xl p-4">
                  <div className="text-xs font-bold text-muted dark:text-slate-400 mb-1">{s.label}</div>
                  <div className="font-bold text-navy dark:text-slate-100 text-sm">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/60 sticky top-0 z-10">
                    <tr>
                      {['#', 'Name', 'Category', 'Value', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted dark:text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {PREVIEW_ROWS.map((row, ri) => (
                      <tr
                        key={row[0]}
                        className={`hover:bg-amber-50 dark:hover:bg-slate-700/30 transition-colors ${ri % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-700/20'}`}
                      >
                        {row.map((cell, i) => (
                          <td
                            key={i}
                            title={i === 4 ? STATUS_TIPS[cell] || '' : ''}
                            className={`px-4 py-3 ${i === 4 ? STATUS_CLS(cell) : 'text-navy dark:text-slate-200'}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/40 text-xs text-muted dark:text-slate-400">
                Showing 5 of {generated.records} records
              </div>
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
                    onClick={() => requestExport(fmt)}
                    disabled={!canExport}
                    aria-label={`Export report as ${fmt}`}
                    title={!canExport ? 'Generate a report first to enable export' : `Export as ${fmt}`}
                    className={`inline-flex items-center gap-2 font-bold text-white text-sm px-6 py-2.5 rounded-xl shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      canExport
                        ? `bg-gradient-to-r ${color} hover:-translate-y-0.5 hover:shadow-lg focus:ring-amber-400`
                        : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {exporting === fmt
                      ? <><FaSpinner className="animate-spin" /> Exporting…</>
                      : exported === fmt
                        ? <><FaCheckCircle /> {fmt} Downloaded!</>
                        : <><FaDownload /> {label}</>
                    }
                  </button>
                ))}
              </div>
              {!canExport && !generated && (
                <p className="text-xs text-muted dark:text-slate-500 mt-2">Generate a report first to enable export.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!generated && !loading && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center rp-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-4 rp-float">
              <FaFileAlt className="text-3xl text-amber-300 dark:text-amber-600" />
            </div>
            <div className="font-bold text-navy dark:text-slate-200 mb-1 text-lg">No report generated yet</div>
            <div className="text-sm text-muted dark:text-slate-400">Select options above and generate your report</div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes rp-shrink  { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes rp-fade-in { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rp-pop     { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes rp-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes rp-glow    { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,.15)} }
        .rp-fade-in   { animation: rp-fade-in 0.22s ease forwards; }
        .rp-badge-pop { animation: rp-pop     0.35s ease forwards; }
        .rp-float     { animation: rp-float   3s ease-in-out infinite; }
        .rp-border-glow { animation: rp-glow  2s ease-in-out 2; }
      `}</style>
    </div>
  );
}
