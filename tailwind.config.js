/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'terminal-bg': '#0d0d0d',
        'terminal-green': '#00ff99',
      },
      fontFamily: {
        'mono': ['Fira Code', 'Source Code Pro', 'monospace'],
      },
      animation: {
        'blink': 'blink 1s infinite',
        'bounce': 'blockBounce 0.7s ease-in-out',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        blockBounce: {
          '0%': { transform: 'translateX(-50%) translateY(var(--bounce-y)) scale(1)' },
          '30%': { transform: 'translateX(-50%) translateY(calc(var(--bounce-y) - 10px)) scale(1.05)' },
          '60%': { transform: 'translateX(-50%) translateY(calc(var(--bounce-y) + 5px)) scale(0.98)' },
          '100%': { transform: 'translateX(-50%) translateY(var(--bounce-y)) scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
