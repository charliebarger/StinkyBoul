import type { Config } from 'tailwindcss';

export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './src/**/*.{ts,tsx}',
    './.storybook/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        'hunt-expanded': '20.75rem',
      },
      colors: {
        ink: '#111827',
        mist: '#f6f7fb',
        accent: '#d97706',
        sky: '#0f766e',
        hunt: {
          shell: '#d1d5dc',
          border: '#99a1af',
          panel: '#f3f4f6',
          text: '#1d293d',
          blue: '#dbeafe',
          blueStrong: '#bedbff',
          blueInk: '#1c398e',
          blueInkHover: '#193cb8',
          destructive: '#c10007',
          destructiveHover: '#e7000b',
          success: '#dcfce7',
          successInk: '#15803d',
          failure: '#ffe2e2',
          failureInk: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 45px rgba(17, 24, 39, 0.12)',
        hunt: '0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 4px 6px 0 rgba(0, 0, 0, 0.1)',
        'hunt-place': '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
      },
      keyframes: {
        'hunt-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'hunt-spin': 'hunt-spin 0.9s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
