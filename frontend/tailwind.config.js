/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:    '#1E3A8A',   // Deep Blue
        secondary:  '#6366F1',   // Indigo
        accent:     '#22D3EE',   // Cyan
        surface:    '#F8FAFC',
        card:       '#FFFFFF',
        navy:       '#0F172A',
        muted:      '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient':     'linear-gradient(135deg, #EEF2FF 0%, #E0F2FE 50%, #F8FAFC 100%)',
        'hero-gradient-dark':'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0c1a3a 100%)',
        'cta-gradient':      'linear-gradient(135deg, #1E3A8A 0%, #4F46E5 60%, #0EA5E9 100%)',
        'blue-gradient':     'linear-gradient(135deg, #1E3A8A, #22D3EE)',
      },
      animation: {
        'fade-up':    'fadeUp 0.7s ease both',
        'fade-in':    'fadeIn 0.6s ease both',
        'float':      'float 5s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 8s linear infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      boxShadow: {
        'glow':       '0 0 30px rgba(30,58,138,0.2)',
        'glow-lg':    '0 0 60px rgba(30,58,138,0.25)',
        'glow-cyan':  '0 0 30px rgba(34,211,238,0.3)',
        'accent':     '0 0 24px rgba(34,211,238,0.3)',
        'indigo':     '0 0 24px rgba(99,102,241,0.25)',
      },
    },
  },
  plugins: [],
};
