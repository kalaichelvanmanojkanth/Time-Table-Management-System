import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarAlt, FaBrain, FaChartBar, FaBuilding,
  FaArrowRight, FaClock, FaExclamationTriangle, FaDoorOpen,
  FaLightbulb, FaGraduationCap, FaCheckCircle, FaRocket,
  FaTwitter, FaLinkedin, FaGithub, FaBars, FaTimes,
  FaDatabase, FaCogs, FaShieldAlt, FaQuoteLeft, FaStar,
  FaMoon, FaSun, FaPlay,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

/* ─────────────────────────────────────────────
   Dark-mode hook — persists to localStorage
───────────────────────────────────────────── */
function useDarkMode() {
  const [dark, setDark] = useState(() =>
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, setDark];
}

/* ─────────────────────────────────────────────
   IntersectionObserver hook
───────────────────────────────────────────── */
function useReveal(threshold = 0.12) {
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
   Reveal wrapper
───────────────────────────────────────────── */
function Reveal({ children, delay = '0ms', className = '' }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal-on-scroll ${className}`} style={{ transitionDelay: delay }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Label chip
───────────────────────────────────────────── */
function Chip({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary dark:text-accent bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-full px-3 py-1 mb-3">
      <HiSparkles className="text-accent" /> {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Star rating helpers
───────────────────────────────────────────── */
function Stars({ n = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <FaStar key={i} className="text-amber-400 text-[11px]" />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   DATA
══════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: <FaCalendarAlt />,
    title: 'Timetable Creation & Scheduling',
    desc: 'Easily generate and manage academic schedules with an intuitive drag-and-drop interface and bulk import support.',
    color: 'from-blue-600 to-blue-800',
    glow: 'group-hover:shadow-[0_0_24px_rgba(30,58,138,0.25)]',
    ring: 'group-hover:ring-blue-300 dark:group-hover:ring-blue-700',
  },
  {
    icon: <FaBrain />,
    title: 'Smart Timetable Optimization & AI Scheduling',
    desc: 'AI-powered conflict-free scheduling and smart optimization — resolves clashes and balances faculty workload automatically.',
    color: 'from-secondary to-violet-700',
    glow: 'group-hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]',
    ring: 'group-hover:ring-indigo-300 dark:group-hover:ring-indigo-700',
    link: '/ai-scheduling',
  },
  {
    icon: <FaChartBar />,
    title: 'Academic Analytics & Workload Intelligence',
    desc: 'Track performance, workload distribution, and data insights with deep-dive dashboards and real-time KPIs.',
    color: 'from-cyan-500 to-accent',
    glow: 'group-hover:shadow-[0_0_24px_rgba(34,211,238,0.3)]',
    ring: 'group-hover:ring-cyan-300 dark:group-hover:ring-cyan-700',
    link: '/analytics',
  },
  {
    icon: <FaBuilding />,
    title: 'Classroom & Resource Management',
    desc: 'Efficiently allocate classrooms and institutional resources — track capacities, equipment, and availability in real time.',
    color: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]',
    ring: 'group-hover:ring-emerald-300 dark:group-hover:ring-emerald-700',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: <FaDatabase />,
    title: 'Input Your Data',
    desc: 'Enter subjects, teachers, rooms, and constraints through our intuitive data management interface.',
    color: 'from-blue-600 to-primary',
  },
  {
    step: '02',
    icon: <FaBrain />,
    title: 'AI Processes & Optimizes',
    desc: 'Our intelligent engine analyzes all constraints and automatically generates the best conflict-free schedule.',
    color: 'from-secondary to-violet-700',
  },
  {
    step: '03',
    icon: <FaCalendarAlt />,
    title: 'Generate & Manage Instantly',
    desc: 'Publish, export, and manage your complete timetable in seconds — with one-click updates and notifications.',
    color: 'from-accent to-cyan-600',
  },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
const SCHEDULE = {
  Mon: { '08:00': { label: 'Algorithms', room: 'A101', tw: 'bg-blue-50 dark:bg-blue-950/50 border-l-blue-500 text-blue-700 dark:text-blue-300' }, '10:00': { label: 'Data Structures', room: 'B202', tw: 'bg-violet-50 dark:bg-violet-950/50 border-l-violet-500 text-violet-700 dark:text-violet-300' }, '13:00': { label: 'Networks', room: 'C301', tw: 'bg-cyan-50 dark:bg-cyan-950/50 border-l-cyan-500 text-cyan-700 dark:text-cyan-300' } },
  Tue: { '09:00': { label: 'OS Concepts', room: 'A102', tw: 'bg-amber-50 dark:bg-amber-950/50 border-l-amber-500 text-amber-700 dark:text-amber-300' }, '11:00': { label: 'Math III', room: 'B201', tw: 'bg-emerald-50 dark:bg-emerald-950/50 border-l-emerald-500 text-emerald-700 dark:text-emerald-300' } },
  Wed: { '08:00': { label: 'Algorithms', room: 'A101', tw: 'bg-blue-50 dark:bg-blue-950/50 border-l-blue-500 text-blue-700 dark:text-blue-300' }, '12:00': { label: 'Databases', room: 'D101', tw: 'bg-rose-50 dark:bg-rose-950/50 border-l-rose-500 text-rose-700 dark:text-rose-300' } },
  Thu: { '09:00': { label: 'AI & ML', room: 'E201', tw: 'bg-violet-50 dark:bg-violet-950/50 border-l-violet-500 text-violet-700 dark:text-violet-300' }, '13:00': { label: 'OS Concepts', room: 'A102', tw: 'bg-amber-50 dark:bg-amber-950/50 border-l-amber-500 text-amber-700 dark:text-amber-300' } },
  Fri: { '10:00': { label: 'Networks', room: 'C301', tw: 'bg-cyan-50 dark:bg-cyan-950/50 border-l-cyan-500 text-cyan-700 dark:text-cyan-300' }, '11:00': { label: 'Databases', room: 'D101', tw: 'bg-rose-50 dark:bg-rose-950/50 border-l-rose-500 text-rose-700 dark:text-rose-300' } },
};

const STATS = [
  { label: 'Active Sections', value: '24', delta: '+3 this week', color: 'text-primary dark:text-blue-400' },
  { label: 'Classrooms', value: '18', delta: '94% utilized', color: 'text-accent dark:text-cyan-400' },
  { label: 'Conflicts', value: '0', delta: 'Fully resolved', color: 'text-emerald-500' },
  { label: 'Faculty', value: '42', delta: 'All assigned', color: 'text-secondary dark:text-indigo-400' },
];

const BAR_DATA = [
  { day: 'Mon', pct: 85 }, { day: 'Tue', pct: 62 }, { day: 'Wed', pct: 90 },
  { day: 'Thu', pct: 74 }, { day: 'Fri', pct: 55 },
];

const BENEFITS = [
  { icon: <FaExclamationTriangle />, title: 'Reduce Scheduling Conflicts', desc: 'AI detects and resolves all scheduling conflicts automatically before publication.' },
  { icon: <FaClock />, title: 'Save Time with Automation', desc: 'Reduce semester scheduling from weeks to minutes with intelligent automation.' },
  { icon: <FaDoorOpen />, title: 'Improve Resource Utilization', desc: 'Maximize room and equipment utilization across your entire campus network.' },
  { icon: <FaLightbulb />, title: 'Data-Driven Decisions', desc: 'Actionable analytics surface patterns and gaps to improve long-term planning.' },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Priya Ramesh',
    role: 'Head of Academic Affairs, IIT Madras',
    avatar: 'PR',
    avatarColor: 'from-blue-600 to-primary',
    text: 'Smart TMS completely transformed how we handle semester scheduling. What used to take weeks now takes hours, and the AI-driven conflict resolution is accurate every single time.',
    stars: 5,
  },
  {
    name: 'Arun Krishnamurthy',
    role: 'Department Admin, VIT University',
    avatar: 'AK',
    avatarColor: 'from-secondary to-violet-700',
    text: 'The dashboard analytics gave us insights we never had before. Resource utilization jumped from 67% to 94% in the very first semester of using the platform.',
    stars: 5,
  },
  {
    name: 'Meena Subramanian',
    role: 'Student, Computer Science – Semester 6',
    avatar: 'MS',
    avatarColor: 'from-accent to-cyan-600',
    text: 'As a student, having a clear, conflict-free timetable published on day one of the semester made a massive difference. No more clashes, no confusion — just clarity.',
    stars: 5,
  },
];

/* ─────────────────────────────────────────────
   Timetable Mock Component
───────────────────────────────────────────── */
function TimetableMock() {
  return (
    <div className="overflow-x-auto rounded-xl">
      <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-1.5 mb-1.5">
        <div />
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-muted dark:text-slate-400 tracking-widest uppercase py-1">{d}</div>
        ))}
      </div>
      {SLOTS.map(slot => (
        <div key={slot} className="grid grid-cols-[56px_repeat(5,1fr)] gap-1.5 mb-1.5">
          <div className="text-[10px] text-muted dark:text-slate-500 font-semibold flex items-center justify-end pr-1.5">{slot}</div>
          {DAYS.map(day => {
            const cell = SCHEDULE[day]?.[slot];
            return cell ? (
              <div key={day} className={`rounded-lg border-l-[3px] px-2 py-1.5 ${cell.tw} hover:scale-[1.03] transition-transform duration-200 cursor-default`}>
                <div className="text-[10px] font-bold leading-tight truncate">{cell.label}</div>
                <div className="text-[9px] opacity-60 mt-0.5">{cell.room}</div>
              </div>
            ) : (
              <div key={day} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 min-h-[40px]" />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Feature Card
───────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, color, glow, ring, link, delay }) {
  const cardContent = (
    <div className={`group relative bg-white dark:bg-slate-800 rounded-2xl p-7 border border-slate-100 dark:border-slate-700 shadow-md hover:-translate-y-2 hover:shadow-xl transition-all duration-300 ${link ? 'cursor-pointer' : 'cursor-default'} ring-1 ring-transparent ${ring} ${glow} h-full`}>
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white dark:from-slate-800 via-white dark:via-slate-800 to-blue-50 dark:to-blue-950/30 pointer-events-none" />
      <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center text-xl mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="relative font-bold text-navy dark:text-slate-100 text-[1.05rem] mb-2 leading-snug">{title}</h3>
      <p className="relative text-muted dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
      {link && (
        <div className="relative mt-4 flex items-center gap-1 text-xs font-bold text-primary dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {link === '/ai-scheduling' ? 'AI Scheduling →' : 'View Analytics →'}
        </div>
      )}
    </div>
  );

  return (
    <Reveal delay={delay}>
      {link
        ? <Link to={link} className="block" id={`feature-card-link-${link.replace(/\//g, '-').slice(1)}`}>{cardContent}</Link>
        : cardContent
      }
    </Reveal>
  );
}

/* ─────────────────────────────────────────────
   How It Works Step Card
───────────────────────────────────────────── */
function StepCard({ step, icon, title, desc, color, delay, isLast }) {
  return (
    <Reveal delay={delay} className="relative flex flex-col items-center text-center">
      {/* Connector line */}
      {!isLast && (
        <div className="hidden lg:block absolute top-10 left-[calc(50%+52px)] right-[-calc(50%-52px)] h-0.5 bg-gradient-to-r from-slate-200 dark:from-slate-700 to-slate-100 dark:to-slate-800 z-0" />
      )}
      <div className="relative z-10">
        {/* Step number */}
        <div className="text-[11px] font-black tracking-widest text-muted dark:text-slate-500 mb-3 uppercase">{step}</div>
        {/* Icon circle */}
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center text-3xl shadow-lg mx-auto mb-5 hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="font-bold text-navy dark:text-slate-100 text-lg mb-2">{title}</h3>
        <p className="text-muted dark:text-slate-400 text-sm leading-relaxed max-w-[220px] mx-auto">{desc}</p>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────
   Testimonial Card
───────────────────────────────────────────── */
function TestimonialCard({ name, role, avatar, avatarColor, text, stars, delay }) {
  return (
    <Reveal delay={delay}>
      <div className="group relative bg-white dark:bg-slate-800 rounded-2xl p-7 border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
        <FaQuoteLeft className="text-blue-100 dark:text-blue-900 text-4xl mb-4" />
        <p className="text-slate-600 dark:text-slate-300 text-[0.95rem] leading-relaxed mb-6">"{text}"</p>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
            {avatar}
          </div>
          <div>
            <div className="font-bold text-navy dark:text-slate-100 text-sm">{name}</div>
            <div className="text-muted dark:text-slate-400 text-xs">{role}</div>
          </div>
          <div className="ml-auto"><Stars n={stars} /></div>
        </div>
      </div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════
   MAIN HOME COMPONENT
══════════════════════════════════════════════ */
const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useDarkMode();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const NAV_LINKS = ['Home', 'Features', 'How It Works', 'Dashboard', 'About', 'Contact'];

  return (
    <div className="font-sans bg-surface dark:bg-navy text-navy dark:text-slate-100 antialiased overflow-x-hidden transition-colors duration-300">

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-navy/90 backdrop-blur-md shadow-sm border-b border-slate-100 dark:border-slate-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary dark:text-blue-400">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white text-sm shadow">
              <FaCalendarAlt />
            </div>
            <span className="hidden sm:block">Smart <span className="text-secondary dark:text-indigo-400">TMS</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(l => (
              <a
                key={l}
                href={l === 'Home' ? '#' : `#${l.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3 py-2 text-sm font-medium text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all duration-200"
              >
                {l}
              </a>
            ))}
          </nav>

          {/* Desktop CTA + Dark Mode */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              id="dark-mode-toggle"
              className="p-2 rounded-xl text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {dark ? <FaSun size={16} /> : <FaMoon size={16} />}
            </button>
            <Link to="/login" className="text-sm font-semibold text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors duration-200">
              Login
            </Link>
            <Link
              to="/register"
              id="nav-get-started"
              className="text-sm font-bold text-white bg-gradient-to-r from-primary to-secondary hover:from-blue-800 hover:to-indigo-700 px-5 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setDark(!dark)} className="p-2 rounded-lg text-muted dark:text-slate-400" aria-label="Toggle dark mode">
              {dark ? <FaSun size={16} /> : <FaMoon size={16} />}
            </button>
            <button
              className="p-2 rounded-lg text-muted dark:text-slate-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-lg px-5 py-4 flex flex-col gap-2">
            {NAV_LINKS.map(l => (
              <a
                key={l}
                href={l === 'Home' ? '#' : `#${l.toLowerCase().replace(/\s+/g, '-')}`}
                className="py-2 text-sm font-medium text-muted dark:text-slate-400 hover:text-primary dark:hover:text-blue-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                {l}
              </a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link to="/login" className="flex-1 text-center py-2 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl text-muted dark:text-slate-400">Login</Link>
              <Link to="/register" className="flex-1 text-center py-2 text-sm font-bold text-white bg-primary dark:bg-blue-700 rounded-xl">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 bg-hero-gradient dark:bg-hero-gradient-dark overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-200/40 dark:bg-blue-900/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-32 w-[400px] h-[400px] rounded-full bg-indigo-200/40 dark:bg-indigo-900/20 blur-[80px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full bg-cyan-200/30 dark:bg-cyan-900/20 blur-[60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left — Text */}
          <div className="animate-fade-up">
            <Reveal>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-primary dark:text-blue-400 bg-blue-100/80 dark:bg-blue-950/80 border border-blue-200/60 dark:border-blue-800/60 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
                <HiSparkles className="text-accent" /> Academic Intelligence Platform
              </div>
            </Reveal>

            <Reveal delay="80ms">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-extrabold leading-[1.12] tracking-tight text-navy dark:text-white mb-5">
                Smart Timetable{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Management System
                </span>
              </h1>
            </Reveal>

            <Reveal delay="160ms">
              <p className="text-lg text-muted dark:text-slate-400 leading-relaxed mb-8 max-w-[500px]">
                Automate scheduling, optimize resources, and gain intelligent insights with AI-powered solutions for modern academic institutions.
              </p>
            </Reveal>

            <Reveal delay="240ms">
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/register"
                  id="hero-get-started"
                  className="inline-flex items-center gap-2 font-bold text-white bg-gradient-to-r from-primary to-secondary hover:from-blue-800 hover:to-indigo-700 px-7 py-3.5 rounded-xl shadow-lg hover:shadow-glow transition-all duration-300 hover:-translate-y-1"
                >
                  Get Started <FaArrowRight className="text-sm" />
                </Link>
                <button
                  id="hero-view-demo"
                  onClick={() => document.querySelector('#dashboard')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 font-bold text-primary dark:text-blue-400 border-2 border-primary/30 dark:border-blue-700 hover:border-primary dark:hover:border-blue-400 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <FaPlay className="text-xs" /> View Demo
                </button>
              </div>
            </Reveal>

            {/* Trust badges */}
            <Reveal delay="320ms">
              <div className="flex items-center gap-6 mt-10 flex-wrap">
                {[
                  { icon: <FaCheckCircle className="text-emerald-500" />, txt: 'Zero Conflicts' },
                  { icon: <FaRocket className="text-primary dark:text-blue-400" />, txt: 'AI-Powered' },
                  { icon: <FaChartBar className="text-accent" />, txt: 'Real-time Analytics' },
                ].map(({ icon, txt }) => (
                  <div key={txt} className="flex items-center gap-1.5 text-sm font-medium text-muted dark:text-slate-400">
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
              <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white dark:border-slate-700 p-6 shadow-glow">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 mb-5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-semibold text-muted dark:text-slate-400">Semester 2 — Timetable Grid</span>
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {STATS.map(s => (
                    <div key={s.label} className="bg-slate-50 dark:bg-slate-700/60 rounded-xl p-2.5 text-center hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
                      <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wide mt-0.5 leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>
                <TimetableMock />
              </div>

              {/* Floating info cards */}
              <div className="absolute -top-5 -right-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-primary/10 dark:border-blue-800/40 px-4 py-3 flex items-center gap-2.5 min-w-[180px] animate-pulse-slow">
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center text-primary dark:text-blue-400 text-sm"><FaBrain /></div>
                <div>
                  <div className="text-[11px] font-bold text-navy dark:text-slate-100">AI Optimized</div>
                  <div className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold">0 conflicts detected</div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-primary/10 dark:border-blue-800/40 px-4 py-3 flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm"><FaBuilding /></div>
                <div>
                  <div className="text-[11px] font-bold text-navy dark:text-slate-100">Room Utilization</div>
                  <div className="text-[10px] text-primary dark:text-blue-400 font-semibold">94% — Excellent</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Chip label="Core Features" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mt-1 mb-3">Everything you need to schedule smarter</h2>
            <p className="text-muted dark:text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
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
          HOW IT WORKS SECTION
      ══════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-50 dark:from-slate-950 via-indigo-50/30 dark:via-indigo-950/10 to-white dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-16">
            <Chip label="How It Works" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mt-1 mb-3">From data to timetable in 3 simple steps</h2>
            <p className="text-muted dark:text-slate-400 text-lg max-w-xl mx-auto">
              Our streamlined workflow gets you from raw data to a fully optimized, published schedule in minutes.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-10 lg:gap-16 relative">
            {HOW_IT_WORKS.map((s, i) => (
              <StepCard key={s.step} {...s} delay={`${i * 120}ms`} isLast={i === HOW_IT_WORKS.length - 1} />
            ))}
          </div>

          {/* Arrow connector visual for mobile */}
          <div className="flex justify-center gap-6 mt-12 md:hidden">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xs font-black flex items-center justify-center">{i + 1}</div>
                {i < HOW_IT_WORKS.length - 1 && <FaArrowRight className="text-slate-300 dark:text-slate-600 text-xs" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DASHBOARD PREVIEW SECTION
      ══════════════════════════════════════════ */}
      <section id="dashboard" className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Chip label="Live Preview" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mt-1 mb-3">See the dashboard in action</h2>
            <p className="text-muted dark:text-slate-400 text-lg max-w-xl mx-auto">
              Real-time timetable grid and workload analytics — all in a single, unified view.
            </p>
          </Reveal>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Timetable panel */}
            <Reveal className="lg:col-span-3">
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-navy dark:text-slate-100">Semester 2 Timetable</h3>
                    <p className="text-xs text-muted dark:text-slate-400">Computer Science — Section A</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-full px-3 py-1">Published</span>
                </div>
                <TimetableMock />
              </div>
            </Reveal>

            {/* Analytics panel */}
            <Reveal delay="100ms" className="lg:col-span-2 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                {STATS.map(s => (
                  <div key={s.label} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md p-4 hover:shadow-lg transition-shadow">
                    <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                    <div className="text-xs font-semibold text-navy dark:text-slate-100 mt-0.5">{s.label}</div>
                    <div className="text-[10px] text-muted dark:text-slate-400 mt-0.5">{s.delta}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md p-5 flex-1">
                <h4 className="text-sm font-bold text-navy dark:text-slate-100 mb-1">Weekly Room Usage</h4>
                <p className="text-[10px] text-muted dark:text-slate-400 mb-4">% average daily occupancy</p>
                <div className="flex items-end gap-2 h-28">
                  {BAR_DATA.map(({ day, pct }) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] font-bold text-primary dark:text-blue-400">{pct}%</span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary to-accent transition-all duration-700 hover:from-blue-800 hover:to-primary opacity-90 hover:opacity-100"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="text-[9px] text-muted dark:text-slate-400 font-semibold">{day}</span>
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
      <section className="py-24 bg-gradient-to-br from-slate-50 dark:from-slate-950 to-white dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Chip label="Why Choose Us" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mt-1 mb-3">Tangible benefits, from day one</h2>
            <p className="text-muted dark:text-slate-400 text-lg max-w-xl mx-auto">
              Measurable improvements across every dimension of academic scheduling and resource management.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(({ icon, title, desc }, i) => (
              <Reveal key={title} delay={`${i * 80}ms`}>
                <div className="group text-center p-7 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                  <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white text-xl shadow-md group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
                    {icon}
                  </div>
                  <h3 className="font-bold text-navy dark:text-slate-100 mb-2">{title}</h3>
                  <p className="text-sm text-muted dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Chip label="Testimonials" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mt-1 mb-3">Trusted by institutions & students</h2>
            <p className="text-muted dark:text-slate-400 text-lg max-w-xl mx-auto">
              Hear from the administrators and students who rely on Smart TMS every semester.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.name} {...t} delay={`${i * 100}ms`} />
            ))}
          </div>

          {/* Stats strip */}
          <Reveal delay="200ms">
            <div className="mt-16 grid grid-cols-3 gap-6 bg-gradient-to-r from-primary via-secondary to-accent p-px rounded-2xl">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center col-span-1">
                <div className="text-3xl font-extrabold text-primary dark:text-blue-400 mb-1">40+</div>
                <div className="text-sm font-semibold text-muted dark:text-slate-400">Universities Served</div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center col-span-1">
                <div className="text-3xl font-extrabold text-secondary dark:text-indigo-400 mb-1">500K+</div>
                <div className="text-sm font-semibold text-muted dark:text-slate-400">Schedules Generated</div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center col-span-1">
                <div className="text-3xl font-extrabold text-accent dark:text-cyan-400 mb-1">99.9%</div>
                <div className="text-sm font-semibold text-muted dark:text-slate-400">Uptime Guaranteed</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ABOUT SECTION
      ══════════════════════════════════════════ */}
      <section id="about" className="py-24 bg-gradient-to-br from-blue-50/60 dark:from-blue-950/20 to-slate-50 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal className="flex justify-center">
              <div className="relative">
                <div className="w-56 h-56 rounded-full bg-gradient-to-br from-blue-100 dark:from-blue-950 to-indigo-100 dark:to-indigo-950 border-4 border-white dark:border-slate-700 shadow-2xl flex items-center justify-center text-7xl text-primary dark:text-blue-400">
                  <FaGraduationCap />
                </div>
                <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-primary/10 dark:border-blue-800/40 p-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center text-primary dark:text-blue-400 text-xs"><FaBrain /></div>
                  <span className="text-[10px] font-bold text-navy dark:text-slate-100">AI-Powered</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-primary/10 dark:border-blue-800/40 p-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs"><FaCheckCircle /></div>
                  <span className="text-[10px] font-bold text-navy dark:text-slate-100">Zero Conflicts</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay="100ms">
              <Chip label="About the System" />
              <h2 className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white mt-2 mb-5 leading-tight">
                Built for Academic Excellence
              </h2>
              <p className="text-muted dark:text-slate-400 leading-relaxed mb-4 text-[1.02rem]">
                Universities lose hundreds of administrative hours each semester wrestling with spreadsheets and manual scheduling. Smart TMS replaces that friction with intelligent automation — freeing faculty and staff to focus on what truly matters: delivering exceptional education.
              </p>
              <p className="text-muted dark:text-slate-400 leading-relaxed text-[1.02rem]">
                Whether you manage a small department or a multi-campus institution, our platform scales to your needs with enterprise-grade reliability and an intuitive interface.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {['40+ Universities', '500K+ Schedules Generated', '99.9% Uptime'].map(b => (
                  <span key={b} className="text-xs font-bold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-full px-4 py-1.5">{b}</span>
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[100px]" />
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
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              id="cta-get-started"
              className="inline-flex items-center gap-2 font-bold text-primary bg-white hover:bg-blue-50 px-9 py-4 rounded-xl shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:-translate-y-1 text-base"
            >
              Get Started Free <FaArrowRight />
            </Link>
            <a
              href="#features"
              id="cta-learn-more"
              className="inline-flex items-center gap-2 font-bold text-white border-2 border-white/30 hover:border-white hover:bg-white/10 px-9 py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 text-base"
            >
              Learn More
            </a>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer id="contact" className="bg-navy dark:bg-slate-950 text-slate-400 py-12 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 pb-10 border-b border-slate-800">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-sm shadow">
                  <FaCalendarAlt />
                </div>
                Smart TMS
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                AI-powered timetable management for modern academic institutions. Automate, optimize, and gain insights.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Quick Links</h4>
              <nav className="flex flex-col gap-2">
                {[
                  { label: 'Home', href: '#' },
                  { label: 'Features', href: '#features' },
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Dashboard', href: '#dashboard' },
                  { label: 'Contact', href: '#contact' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    id={`footer-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Contact + Social */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Connect</h4>
              <p className="text-sm text-slate-500 mb-4">Follow us for updates, tips, and academic scheduling insights.</p>
              <div className="flex gap-3">
                {[
                  { icon: <FaTwitter />, id: 'footer-twitter', label: 'Twitter' },
                  { icon: <FaLinkedin />, id: 'footer-linkedin', label: 'LinkedIn' },
                  { icon: <FaGithub />, id: 'footer-github', label: 'GitHub' },
                ].map(({ icon, id, label }) => (
                  <a
                    key={id}
                    href="#"
                    id={id}
                    aria-label={label}
                    className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all duration-200 hover:-translate-y-0.5"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            © {new Date().getFullYear()} Smart Timetable Management System. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Global styles for reveal + dark transitions ── */}
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
        /* Dark mode background for hero */
        .dark .bg-hero-gradient {
          background-image: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0c1a3a 100%) !important;
        }
      `}</style>
    </div>
  );
};

export default Home;
