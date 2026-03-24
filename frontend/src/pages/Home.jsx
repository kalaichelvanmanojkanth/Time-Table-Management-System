import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarAlt, FaBrain, FaChartBar, FaBuilding,
  FaArrowRight, FaClock, FaExclamationTriangle, FaDoorOpen,
  FaLightbulb, FaGraduationCap, FaCheckCircle, FaRocket,
  FaTwitter, FaLinkedin, FaGithub, FaBars, FaTimes,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

/* ─────────────────────────────────────────────
   IntersectionObserver hook — adds `is-visible`
   class when element enters viewport
───────────────────────────────────────────── */
function useReveal(threshold = 0.14) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─────────────────────────────────────────────
   Reusable reveal wrapper
───────────────────────────────────────────── */
function Reveal({ children, delay = '0ms', className = '' }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{ transitionDelay: delay }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Label chip
───────────────────────────────────────────── */
function Chip({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-3">
      <HiSparkles className="text-accent" /> {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Feature Card
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <FaCalendarAlt />,
    title: 'Timetable Creation & Scheduling',
    desc: 'Build complete, conflict-free semester timetables in minutes with an intuitive drag-and-drop interface and bulk import support.',
    color: 'from-blue-500 to-blue-600',
    glow: 'group-hover:shadow-[0_0_24px_rgba(37,99,235,0.25)]',
  },
  {
    icon: <FaBrain />,
    title: 'AI-Powered Optimization',
    desc: 'Intelligent scheduling engine automatically resolves conflicts, balances faculty workload, and maximizes resource utilization.',
    color: 'from-violet-500 to-purple-600',
    glow: 'group-hover:shadow-[0_0_24px_rgba(139,92,246,0.25)]',
  },
  {
    icon: <FaChartBar />,
    title: 'Academic Analytics & Workload Intelligence',
    desc: 'Deep-dive dashboards reveal utilization trends, faculty load KPIs, and room occupancy — empowering data-driven decisions.',
    color: 'from-sky-400 to-cyan-500',
    glow: 'group-hover:shadow-[0_0_24px_rgba(56,189,248,0.3)]',
  },
  {
    icon: <FaBuilding />,
    title: 'Classroom & Resource Management',
    desc: 'Track room capacities, equipment, and availability in real time. Never double-book a venue or miss a resource constraint.',
    color: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]',
  },
];

function FeatureCard({ icon, title, desc, color, glow, delay }) {
  return (
    <Reveal delay={delay}>
      <div className={`group relative bg-white rounded-2xl p-7 border border-slate-100 shadow-md hover:-translate-y-2 hover:shadow-xl transition-all duration-300 cursor-default ${glow}`}>
        {/* Subtle gradient tint on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white via-white to-blue-50 pointer-events-none" />
        <div className={`relative w-13 h-13 w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center text-xl mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="relative font-bold text-navy text-[1.05rem] mb-2 leading-snug">{title}</h3>
        <p className="relative text-muted text-sm leading-relaxed">{desc}</p>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────
   Timetable Mock
───────────────────────────────────────────── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
const SCHEDULE = {
  Mon: { '08:00': { label: 'Algorithms', room: 'A101', tw: 'bg-blue-50 border-l-blue-500 text-blue-700' }, '10:00': { label: 'Data Structures', room: 'B202', tw: 'bg-violet-50 border-l-violet-500 text-violet-700' }, '13:00': { label: 'Networks', room: 'C301', tw: 'bg-cyan-50 border-l-cyan-500 text-cyan-700' } },
  Tue: { '09:00': { label: 'OS Concepts', room: 'A102', tw: 'bg-amber-50 border-l-amber-500 text-amber-700' }, '11:00': { label: 'Math III', room: 'B201', tw: 'bg-emerald-50 border-l-emerald-500 text-emerald-700' } },
  Wed: { '08:00': { label: 'Algorithms', room: 'A101', tw: 'bg-blue-50 border-l-blue-500 text-blue-700' }, '12:00': { label: 'Databases', room: 'D101', tw: 'bg-rose-50 border-l-rose-500 text-rose-700' } },
  Thu: { '09:00': { label: 'AI & ML', room: 'E201', tw: 'bg-violet-50 border-l-violet-500 text-violet-700' }, '13:00': { label: 'OS Concepts', room: 'A102', tw: 'bg-amber-50 border-l-amber-500 text-amber-700' } },
  Fri:  { '10:00': { label: 'Networks', room: 'C301', tw: 'bg-cyan-50 border-l-cyan-500 text-cyan-700' }, '11:00': { label: 'Databases', room: 'D101', tw: 'bg-rose-50 border-l-rose-500 text-rose-700' } },
};

function TimetableMock() {
  return (
    <div className="overflow-x-auto rounded-xl">
      {/* Header row */}
      <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-1.5 mb-1.5">
        <div />
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-muted tracking-widest uppercase py-1">{d}</div>
        ))}
      </div>
      {/* Time rows */}
      {SLOTS.map(slot => (
        <div key={slot} className="grid grid-cols-[56px_repeat(5,1fr)] gap-1.5 mb-1.5">
          <div className="text-[10px] text-muted font-semibold flex items-center justify-end pr-1.5">{slot}</div>
          {DAYS.map(day => {
            const cell = SCHEDULE[day]?.[slot];
            return cell ? (
              <div key={day} className={`rounded-lg border-l-[3px] px-2 py-1.5 ${cell.tw} hover:scale-[1.03] transition-transform duration-200 cursor-default`}>
                <div className="text-[10px] font-bold leading-tight truncate">{cell.label}</div>
                <div className="text-[9px] opacity-60 mt-0.5">{cell.room}</div>
              </div>
            ) : (
              <div key={day} className="rounded-lg bg-slate-50 border border-slate-100 min-h-[40px]" />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Analytics Preview Section
───────────────────────────────────────────── */
const STATS = [
  { label: 'Active Sections', value: '24', delta: '+3 this week', color: 'text-primary' },
  { label: 'Classrooms', value: '18', delta: '94% utilized', color: 'text-accent' },
  { label: 'Conflicts', value: '0', delta: 'Fully resolved', color: 'text-emerald-500' },
  { label: 'Faculty', value: '42', delta: 'All assigned', color: 'text-violet-500' },
];

const BAR_DATA = [
  { day: 'Mon', pct: 85 },
  { day: 'Tue', pct: 62 },
  { day: 'Wed', pct: 90 },
  { day: 'Thu', pct: 74 },
  { day: 'Fri', pct: 55 },
];

/* ─────────────────────────────────────────────
   Benefits
───────────────────────────────────────────── */
const BENEFITS = [
  { icon: <FaClock />, title: 'Save Time', desc: 'Reduce semester scheduling from weeks to minutes with intelligent automation.' },
  { icon: <FaExclamationTriangle />, title: 'Zero Conflicts', desc: 'AI detects and resolves all scheduling conflicts automatically before publication.' },
  { icon: <FaDoorOpen />, title: 'Optimize Resources', desc: 'Maximize room and equipment utilization across your entire campus network.' },
  { icon: <FaLightbulb />, title: 'Smarter Decisions', desc: 'Actionable analytics surface patterns and gaps to improve long-term academic planning.' },
];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const NAV_LINKS = ['Home', 'Features', 'About', 'Contact'];

  return (
    <div className="font-sans bg-surface text-navy antialiased overflow-x-hidden">

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white text-sm shadow">
              <FaCalendarAlt />
            </div>
            <span className="hidden sm:block">Smart <span className="text-secondary">TMS</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <a
                key={l}
                href={l === 'Home' ? '#' : `#${l.toLowerCase()}`}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-primary rounded-lg hover:bg-blue-50 transition-all duration-200"
              >
                {l}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-muted hover:text-primary transition-colors duration-200">
              Login
            </Link>
            <Link
              to="/register"
              id="nav-get-started"
              className="text-sm font-bold text-white bg-gradient-to-r from-primary to-blue-500 hover:from-blue-700 hover:to-primary px-5 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-muted hover:text-primary hover:bg-blue-50 transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg px-5 py-4 flex flex-col gap-2">
            {NAV_LINKS.map(l => (
              <a
                key={l}
                href={l === 'Home' ? '#' : `#${l.toLowerCase()}`}
                className="py-2 text-sm font-medium text-secondary hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {l}
              </a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Link to="/login" className="flex-1 text-center py-2 text-sm font-semibold border border-slate-200 rounded-xl text-muted">Login</Link>
              <Link to="/register" className="flex-1 text-center py-2 text-sm font-bold text-white bg-primary rounded-xl">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 bg-hero-gradient overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-200/40 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-32 w-[400px] h-[400px] rounded-full bg-sky-200/40 blur-[80px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full bg-violet-200/30 blur-[60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left — Text */}
          <div className="animate-fade-up">
            <Reveal>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-primary bg-blue-100/80 border border-blue-200/60 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
                <HiSparkles className="text-accent" /> Academic Intelligence Platform
              </div>
            </Reveal>

            <Reveal delay="80ms">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-extrabold leading-[1.12] tracking-tight text-navy mb-5">
                Smart Timetable{' '}
                <span className="bg-gradient-to-r from-primary via-blue-500 to-accent bg-clip-text text-transparent">
                  Management System
                </span>
              </h1>
            </Reveal>

            <Reveal delay="160ms">
              <p className="text-lg text-muted leading-relaxed mb-8 max-w-[500px]">
                AI-powered scheduling, analytics, and resource optimization for modern institutions — eliminate conflicts and save hundreds of administrative hours.
              </p>
            </Reveal>

            <Reveal delay="240ms">
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/register"
                  id="hero-get-started"
                  className="inline-flex items-center gap-2 font-bold text-white bg-gradient-to-r from-primary to-blue-500 hover:from-blue-700 hover:to-primary px-7 py-3.5 rounded-xl shadow-lg hover:shadow-glow transition-all duration-300 hover:-translate-y-1"
                >
                  Get Started <FaArrowRight className="text-sm" />
                </Link>
                <a
                  href="#features"
                  id="hero-explore-features"
                  className="inline-flex items-center gap-2 font-bold text-primary border-2 border-primary/30 hover:border-primary bg-white/70 backdrop-blur-sm hover:bg-white px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-1"
                >
                  Explore Features
                </a>
              </div>
            </Reveal>

            {/* Trust badges */}
            <Reveal delay="320ms">
              <div className="flex items-center gap-6 mt-10 flex-wrap">
                {[
                  { icon: <FaCheckCircle className="text-emerald-500" />, txt: 'Zero Conflicts' },
                  { icon: <FaRocket className="text-primary" />, txt: 'AI-Powered' },
                  { icon: <FaChartBar className="text-accent" />, txt: 'Real-time Analytics' },
                ].map(({ icon, txt }) => (
                  <div key={txt} className="flex items-center gap-1.5 text-sm font-medium text-muted">
                    {icon} {txt}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right — Dashboard Preview */}
          <Reveal delay="200ms" className="hidden lg:block">
            <div className="relative animate-float">
              {/* Main dashboard card */}
              <div className="relative bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white p-6 shadow-glow">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 mb-5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-semibold text-muted">Semester 2 — Timetable Grid</span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {STATS.map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-2.5 text-center hover:bg-blue-50 transition-colors">
                      <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] font-semibold text-muted uppercase tracking-wide mt-0.5 leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Timetable */}
                <TimetableMock />
              </div>

              {/* Floating info cards */}
              <div className="absolute -top-5 -right-8 bg-white rounded-2xl shadow-xl border border-primary/10 px-4 py-3 flex items-center gap-2.5 min-w-[180px] animate-pulse-slow">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-primary text-sm"><FaBrain /></div>
                <div>
                  <div className="text-[11px] font-bold text-navy">AI Optimized</div>
                  <div className="text-[10px] text-emerald-500 font-semibold">0 conflicts detected</div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl border border-primary/10 px-4 py-3 flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-sm"><FaBuilding /></div>
                <div>
                  <div className="text-[11px] font-bold text-navy">Room Utilization</div>
                  <div className="text-[10px] text-primary font-semibold">94% — Excellent</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Chip label="Core Features" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy mt-1 mb-3">Everything you need to schedule smarter</h2>
            <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              A complete suite of tools to automate, optimize, and analyze academic scheduling from end to end.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={`${i * 80}ms`} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ANALYTICS PREVIEW SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50/40 to-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Chip label="Live Preview" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy mt-1 mb-3">See the dashboard in action</h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Real-time timetable grid and workload analytics — all in a single, unified view.
            </p>
          </Reveal>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Timetable panel */}
            <Reveal className="lg:col-span-3">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-xl p-6 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-navy">Semester 2 Timetable</h3>
                    <p className="text-xs text-muted">Computer Science — Section A</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-3 py-1">Published</span>
                </div>
                <TimetableMock />
              </div>
            </Reveal>

            {/* Analytics panel */}
            <Reveal delay="100ms" className="lg:col-span-2 flex flex-col gap-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4">
                {STATS.map(s => (
                  <div key={s.label} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-md p-4 hover:shadow-lg transition-shadow">
                    <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                    <div className="text-xs font-semibold text-navy mt-0.5">{s.label}</div>
                    <div className="text-[10px] text-muted mt-0.5">{s.delta}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-md p-5 flex-1">
                <h4 className="text-sm font-bold text-navy mb-1">Weekly Room Usage</h4>
                <p className="text-[10px] text-muted mb-4">% average daily occupancy</p>
                <div className="flex items-end gap-2 h-28">
                  {BAR_DATA.map(({ day, pct }) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] font-bold text-primary">{pct}%</span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary to-accent transition-all duration-700 hover:from-blue-700 hover:to-primary"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="text-[9px] text-muted font-semibold">{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BENEFITS SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Chip label="Why Choose Us" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy mt-1 mb-3">Tangible benefits, from day one</h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(({ icon, title, desc }, i) => (
              <Reveal key={title} delay={`${i * 80}ms`}>
                <div className="group text-center p-7 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                  <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white text-xl shadow-md group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
                    {icon}
                  </div>
                  <h3 className="font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ABOUT SECTION
      ══════════════════════════════════════════ */}
      <section id="about" className="py-24 bg-gradient-to-br from-blue-50/60 to-slate-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Icon Visual */}
            <Reveal className="flex justify-center">
              <div className="relative">
                <div className="w-56 h-56 rounded-full bg-gradient-to-br from-blue-100 to-sky-100 border-4 border-white shadow-2xl flex items-center justify-center text-7xl text-primary">
                  <FaGraduationCap />
                </div>
                {/* Orbiting badges */}
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg border border-primary/10 p-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-primary text-xs"><FaBrain /></div>
                  <span className="text-[10px] font-bold text-navy">AI-Powered</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg border border-primary/10 p-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 text-xs"><FaCheckCircle /></div>
                  <span className="text-[10px] font-bold text-navy">Zero Conflicts</span>
                </div>
              </div>
            </Reveal>

            {/* Text */}
            <Reveal delay="100ms">
              <Chip label="About the System" />
              <h2 className="text-3xl sm:text-4xl font-extrabold text-navy mt-2 mb-5 leading-tight">
                Built for Academic Excellence
              </h2>
              <p className="text-muted leading-relaxed mb-4 text-[1.02rem]">
                This system helps universities automate scheduling, optimize resources, and improve academic planning using AI. Universities lose hundreds of administrative hours each semester wrestling with spreadsheets and manual reassignments.
              </p>
              <p className="text-muted leading-relaxed text-[1.02rem]">
                Our platform replaces that friction with intelligent automation — freeing faculty and staff to focus on what truly matters: delivering exceptional education. Whether you manage a small department or a multi-campus institution, Smart TMS scales to your needs.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {['40+ Universities', '500K+ Schedules Generated', '99.9% Uptime'].map(b => (
                  <span key={b} className="text-xs font-bold text-primary bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5">{b}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 bg-cta-gradient relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-white/5 blur-[80px]" />
          <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] rounded-full bg-white/5 blur-[60px]" />
        </div>
        <Reveal className="relative text-center max-w-2xl mx-auto px-5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-blue-200 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <HiSparkles /> Ready to get started?
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Start managing smarter today
          </h2>
          <p className="text-blue-200 text-lg mb-10 leading-relaxed">
            Join hundreds of institutions already using Smart TMS to schedule faster, smarter, and with zero conflicts.
          </p>
          <Link
            to="/register"
            id="cta-get-started"
            className="inline-flex items-center gap-2 font-bold text-primary bg-white hover:bg-blue-50 px-9 py-4 rounded-xl shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:-translate-y-1 text-base"
          >
            Get Started Free <FaArrowRight />
          </Link>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer id="contact" className="bg-navy text-slate-400 py-12 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-8 border-b border-slate-800">
            {/* Brand */}
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-sm shadow">
                <FaCalendarAlt />
              </div>
              Smart TMS
            </div>

            {/* Nav links */}
            <nav className="flex gap-6 flex-wrap justify-center">
              {['Home', 'Features', 'About', 'Contact'].map(l => (
                <a
                  key={l}
                  href={l === 'Home' ? '#' : `#${l.toLowerCase()}`}
                  id={`footer-${l.toLowerCase()}`}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
                >
                  {l}
                </a>
              ))}
            </nav>

            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: <FaTwitter />, id: 'footer-twitter' },
                { icon: <FaLinkedin />, id: 'footer-linkedin' },
                { icon: <FaGithub />, id: 'footer-github' },
              ].map(({ icon, id }) => (
                <a
                  key={id}
                  href="#"
                  id={id}
                  className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all duration-200 hover:-translate-y-0.5"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            © {new Date().getFullYear()} Smart Timetable Management System. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Global styles for reveal animations ── */}
      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .reveal-on-scroll.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default Home;
