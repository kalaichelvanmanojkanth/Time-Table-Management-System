/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:    '#2563EB',
        secondary:  '#1E293B',
        accent:     '#38BDF8',
        surface:    '#F8FAFC',
        card:       '#FFFFFF',
        navy:       '#0F172A',
        muted:      '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 50%, #F8FAFC 100%)',
        'cta-gradient':  'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #0EA5E9 100%)',
        'blue-gradient': 'linear-gradient(135deg, #2563EB, #38BDF8)',
      },
      animation: {
        'fade-up':    'fadeUp 0.7s ease both',
        'fade-in':    'fadeIn 0.6s ease both',
        'float':      'float 5s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
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
      },
      boxShadow: {
        'glow':    '0 0 30px rgba(37,99,235,0.2)',
        'glow-lg': '0 0 60px rgba(37,99,235,0.25)',
        'accent':  '0 0 24px rgba(56,189,248,0.3)',
      },
    },
  },
  plugins: [],
};
