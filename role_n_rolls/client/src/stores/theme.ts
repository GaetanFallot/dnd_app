/**
 * User theme — drives the entire Tailwind palette through CSS variables.
 *
 * The Tailwind config (see `tailwind.config.ts`) declares `gold`, `blood`,
 * `parchment`, `night.*` as `rgb(var(--tw-*) / <alpha-value>)`. This file is
 * the single source of truth that writes those variables onto `:root`, so
 * every `text-gold`, `bg-night-panel`, `border-blood/40` etc. retints
 * instantly when the user changes colours.
 *
 * The Role'n'Rolls logo uses a fixed gradient on the `Dices` icon and the
 * brand mark — it never follows the user palette (it's the app's identity).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  accent: string;
}

export const THEME_PRESETS: Record<string, ThemeColors> = {
  'Grimoire Doré': {
    primary: '#c9a84c',
    secondary: '#8b0000',
    tertiary: '#16213e',
    background: '#0d0d0f',
    accent: '#e8e0d0',
  },
  'Nuit Glacée': {
    primary: '#7aabf0',
    secondary: '#8a6fb3',
    tertiary: '#1a2a35',
    background: '#0a0d14',
    accent: '#e0e8f0',
  },
  'Marais Putride': {
    primary: '#748b3d',
    secondary: '#8b5a00',
    tertiary: '#1f2a1a',
    background: '#0a0d0a',
    accent: '#dde0c9',
  },
  'Sang Dragon': {
    primary: '#c04530',
    secondary: '#d4a857',
    tertiary: '#2a1818',
    background: '#120909',
    accent: '#f0e0c8',
  },
  'Arcane Pourpre': {
    primary: '#b099d0',
    secondary: '#d4a857',
    tertiary: '#1e1830',
    background: '#0c0818',
    accent: '#ece4f0',
  },
};

interface ThemeState {
  colors: ThemeColors;
  setColors: (patch: Partial<ThemeColors>) => void;
  resetToPreset: (name: keyof typeof THEME_PRESETS) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      colors: THEME_PRESETS['Grimoire Doré'],
      setColors: (patch) => set((s) => ({ colors: { ...s.colors, ...patch } })),
      resetToPreset: (name) => set({ colors: THEME_PRESETS[name] }),
    }),
    { name: 'rnr.theme' },
  ),
);

// ─── Palette derivation helpers ──────────────────────────────────────────

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [201, 168, 76];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function triplet([r, g, b]: Rgb): string {
  return `${r} ${g} ${b}`;
}

function lighten([r, g, b]: Rgb, amt = 0.2): Rgb {
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return [mix(r), mix(g), mix(b)];
}

function darken([r, g, b]: Rgb, amt = 0.2): Rgb {
  const mix = (c: number) => Math.max(0, Math.round(c * (1 - amt)));
  return [mix(r), mix(g), mix(b)];
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Push the current theme colours onto `:root` as CSS custom properties.
 * Both the raw user colours (`--user-*`) and the Tailwind RGB triplets
 * (`--tw-gold`, etc.) are set, so every color token in the app tracks the
 * user's choice in real time.
 */
export function applyThemeToDocument(colors: ThemeColors) {
  const root = document.documentElement;

  // Raw user-facing (for inline styles / preview only).
  root.style.setProperty('--user-primary',    colors.primary);
  root.style.setProperty('--user-secondary',  colors.secondary);
  root.style.setProperty('--user-tertiary',   colors.tertiary);
  root.style.setProperty('--user-background', colors.background);
  root.style.setProperty('--user-accent',     colors.accent);

  const primary   = hexToRgb(colors.primary);
  const secondary = hexToRgb(colors.secondary);
  const tertiary  = hexToRgb(colors.tertiary);
  const bg        = hexToRgb(colors.background);
  const accent    = hexToRgb(colors.accent);

  // Palette the Tailwind config consumes.
  root.style.setProperty('--tw-gold',        triplet(primary));
  root.style.setProperty('--tw-gold-light',  triplet(lighten(primary, 0.25)));
  root.style.setProperty('--tw-gold-dark',   triplet(darken(primary, 0.25)));

  root.style.setProperty('--tw-blood',       triplet(secondary));
  root.style.setProperty('--tw-blood-light', triplet(lighten(secondary, 0.25)));
  root.style.setProperty('--tw-blood-dark',  triplet(darken(secondary, 0.25)));

  root.style.setProperty('--tw-parchment',   triplet(accent));

  root.style.setProperty('--tw-night',       triplet(bg));
  root.style.setProperty('--tw-night-deep',  triplet(darken(bg, 0.4)));
  root.style.setProperty('--tw-night-panel', triplet(tertiary));
  root.style.setProperty('--tw-night-muted', triplet(mixRgb(tertiary, bg, 0.4)));

  // Muted foreground ~= 55% accent over background.
  root.style.setProperty('--tw-muted-fg',    triplet(mixRgb(bg, accent, 0.55)));

  // Border / ring track the primary at a subdued level.
  root.style.setProperty('--tw-border',      triplet(mixRgb(bg, primary, 0.2)));
}
