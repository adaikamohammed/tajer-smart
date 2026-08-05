/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        cairo:   ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        tajawal: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'slide-up':   'slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-in':    'fade-in 0.25s ease both',
        'bounce-in':  'bounce-in 0.4s ease both',
        'toast-in':   'toast-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-in': {
          '0%':   { transform: 'scale(0.8)',  opacity: '0' },
          '60%':  { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        'toast-in': {
          from: { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
          to:   { transform: 'translateY(0) scale(1)',        opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
