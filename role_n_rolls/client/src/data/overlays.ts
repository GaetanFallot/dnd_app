// Overlay definitions for the MJ effects panel.
// `canvas`: drawn by the 2nd screen canvas loop
// `css`: applied as a CSS class on the overlay layer
// `audio`: drives a procedural ambient sound via Web Audio API

export type OverlayKind = 'canvas' | 'css' | 'audio';

export interface OverlayDef {
  id: string;
  label: string;
  emoji: string;
  kinds: OverlayKind[];
  defaultVol?: number;
}

export const OVERLAYS: OverlayDef[] = [
  { id: 'rain',     label: 'Pluie',     emoji: '🌧️', kinds: ['canvas', 'audio'], defaultVol: 0.6 },
  { id: 'snow',     label: 'Neige',     emoji: '❄️', kinds: ['canvas', 'audio'], defaultVol: 0.6 },
  { id: 'thunder',  label: 'Orage',     emoji: '⚡', kinds: ['canvas', 'audio'], defaultVol: 0.6 },
  { id: 'wind',     label: 'Vent',      emoji: '💨', kinds: ['canvas', 'audio'], defaultVol: 0.6 },
  { id: 'waves',    label: 'Vagues',    emoji: '🌊', kinds: ['css', 'audio'], defaultVol: 0.6 },
  { id: 'magic',    label: 'Magie',     emoji: '✨', kinds: ['canvas', 'audio'], defaultVol: 0.6 },
  { id: 'fog',      label: 'Brume',     emoji: '🌫️', kinds: ['css'] },
  { id: 'fire',     label: 'Feu',       emoji: '🔥', kinds: ['css', 'audio'], defaultVol: 0.6 },
  { id: 'blood',    label: 'Sang',      emoji: '🩸', kinds: ['css'] },
  { id: 'darkness', label: 'Ombre',     emoji: '🌑', kinds: ['css'] },
  { id: 'vignette', label: 'Vignette',  emoji: '⚫', kinds: ['css'] },
];

export const OVERLAY_IDS = OVERLAYS.map((o) => o.id);
