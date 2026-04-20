import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Colour tokens are declared as `rgb(var(--tw-*) / <alpha-value>)` so that
 * the user-editable theme (see `stores/theme.ts` + Settings page) re-tints
 * the entire app at runtime without a rebuild. Raw hex fallbacks live in
 * `styles.css` :root so the default palette still shows during SSR or if
 * JS hasn't run yet.
 */
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: withAlpha('--tw-parchment'),
        gold: {
          DEFAULT: withAlpha('--tw-gold'),
          light:   withAlpha('--tw-gold-light'),
          dark:    withAlpha('--tw-gold-dark'),
        },
        blood: {
          DEFAULT: withAlpha('--tw-blood'),
          light:   withAlpha('--tw-blood-light'),
          dark:    withAlpha('--tw-blood-dark'),
        },
        night: {
          DEFAULT: withAlpha('--tw-night'),
          deep:    withAlpha('--tw-night-deep'),
          panel:   withAlpha('--tw-night-panel'),
          muted:   withAlpha('--tw-night-muted'),
        },
        border:      withAlpha('--tw-border'),
        ring:        withAlpha('--tw-gold'),
        background:  withAlpha('--tw-night'),
        foreground:  withAlpha('--tw-parchment'),
        card: {
          DEFAULT:     withAlpha('--tw-night-panel'),
          foreground:  withAlpha('--tw-parchment'),
        },
        popover: {
          DEFAULT:     withAlpha('--tw-night-panel'),
          foreground:  withAlpha('--tw-parchment'),
        },
        primary: {
          DEFAULT:     withAlpha('--tw-gold'),
          foreground:  withAlpha('--tw-night'),
        },
        secondary: {
          DEFAULT:     withAlpha('--tw-night-muted'),
          foreground:  withAlpha('--tw-parchment'),
        },
        muted: {
          DEFAULT:     withAlpha('--tw-night-muted'),
          foreground:  withAlpha('--tw-muted-fg'),
        },
        accent: {
          DEFAULT:     withAlpha('--tw-blood'),
          foreground:  withAlpha('--tw-parchment'),
        },
        destructive: {
          DEFAULT:     withAlpha('--tw-blood'),
          foreground:  withAlpha('--tw-parchment'),
        },
        input:        withAlpha('--tw-night-muted'),
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
          '0%, 100%': { boxShadow: '0 0 8px rgb(var(--tw-gold) / 0.3)' },
          '50%':      { boxShadow: '0 0 16px rgb(var(--tw-gold) / 0.6)' },
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
