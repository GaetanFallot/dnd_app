import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark fantasy palette
        parchment: '#e8e0d0',
        gold: {
          DEFAULT: '#c9a84c',
          light: '#d4b860',
          dark: '#a8882e',
        },
        blood: {
          DEFAULT: '#8b0000',
          light: '#a61a1a',
          dark: '#5c0000',
        },
        night: {
          DEFAULT: '#0d0d0f',
          deep: '#05050a',
          panel: '#16213e',
          muted: '#1a1a2e',
        },
        border: '#2a2f4a',
        ring: '#c9a84c',
        background: '#0d0d0f',
        foreground: '#e8e0d0',
        card: {
          DEFAULT: '#16213e',
          foreground: '#e8e0d0',
        },
        popover: {
          DEFAULT: '#0f1a2e',
          foreground: '#e8e0d0',
        },
        primary: {
          DEFAULT: '#c9a84c',
          foreground: '#0d0d0f',
        },
        secondary: {
          DEFAULT: '#1a1a2e',
          foreground: '#e8e0d0',
        },
        muted: {
          DEFAULT: '#1a1a2e',
          foreground: '#8b8b9c',
        },
        accent: {
          DEFAULT: '#8b0000',
          foreground: '#e8e0d0',
        },
        destructive: {
          DEFAULT: '#8b0000',
          foreground: '#e8e0d0',
        },
        input: '#1a1a2e',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        heading: ['MedievalSharp', 'Cinzel', 'serif'],
        body: ['Crimson Text', '"IM Fell English"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(201, 168, 76, 0.3)' },
          '50%': { boxShadow: '0 0 16px rgba(201, 168, 76, 0.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-in-right': 'slide-in-right 220ms ease-out',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
