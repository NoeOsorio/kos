/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Fira Code'", "'SF Mono'", 'monospace'],
        sans: ['-apple-system', 'Inter', 'sans-serif'],
      },
      colors: {
        'bg-deep':        '#05000e',
        'bg-tool':        '#0e0e12',
        'bg-card':        '#16161c',
        'purple-primary': '#8b5cf6',
        'purple-bright':  '#a78bfa',
        'purple-soft':    '#c4b5fd',
        'purple-dim':     '#6d28d9',
        'text-primary':   '#f0eeff',
      },
    },
  },
  plugins: [],
}
