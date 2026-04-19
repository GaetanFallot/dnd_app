// Scene definitions ported verbatim from js/data.js (legacy).
// Each SCENE renders on the second window as a gradient background + emoji.

export interface Scene {
  id: string;
  name: string;
  tag: string;
  bg: string;
  overlay?: string;
  emoji: string;
  src?: string;
  isVideo?: boolean;
}

export const SCENES: Scene[] = [
  { id: 'taverne', name: 'La Taverne du Dragon', tag: 'Intérieur • Chaleureux',
    bg: 'linear-gradient(160deg,#3d1a00,#7a3a10 40%,#4a2808 70%,#2a1505)',
    overlay: 'radial-gradient(ellipse at 60% 40%,rgba(255,140,0,.25),transparent 60%)',
    emoji: '🍺' },
  { id: 'donjon', name: 'Les Profondeurs', tag: 'Souterrain • Danger',
    bg: 'linear-gradient(180deg,#0a0a0a,#1a1020 50%,#080808)',
    overlay: 'radial-gradient(ellipse at 30% 60%,rgba(80,0,120,.3),transparent 50%)',
    emoji: '💀' },
  { id: 'foret', name: 'La Forêt Ancienne', tag: 'Extérieur • Mystérieux',
    bg: 'linear-gradient(160deg,#0a1a08,#1a3a12 40%,#0d250a 70%,#060d05)',
    overlay: 'radial-gradient(ellipse at 50% 0%,rgba(60,120,30,.25),transparent 50%)',
    emoji: '🌲' },
  { id: 'chateau', name: 'Le Grand Château', tag: 'Architecture • Majesteux',
    bg: 'linear-gradient(160deg,#1a1520,#2d2535 50%,#15101a)',
    overlay: 'radial-gradient(ellipse at 50% 100%,rgba(100,80,160,.2),transparent 50%)',
    emoji: '🏰' },
  { id: 'ocean', name: 'La Mer Déchaînée', tag: 'Extérieur • Tempête',
    bg: 'linear-gradient(180deg,#0a1a30,#0f2a50 40%,#081820 80%,#050e14)',
    overlay: 'radial-gradient(ellipse at 50% 50%,rgba(20,60,120,.3),transparent 60%)',
    emoji: '🌊' },
  { id: 'marche', name: 'Le Marché de la Ville', tag: 'Urbain • Animé',
    bg: 'linear-gradient(160deg,#2a1a0a,#4a3020 40%,#3a2515 70%,#1a100a)',
    overlay: 'radial-gradient(ellipse at 40% 30%,rgba(200,150,50,.2),transparent 50%)',
    emoji: '⚖️' },
  { id: 'temple', name: 'Le Temple Oublié', tag: 'Sacré • Ancien',
    bg: 'linear-gradient(160deg,#1a1408,#2d2510 40%,#1a1808 80%,#0d0b05)',
    overlay: 'radial-gradient(ellipse at 50% 30%,rgba(200,170,80,.2),transparent 50%)',
    emoji: '⛩️' },
  { id: 'combat', name: 'En Plein Combat !', tag: 'Action • Urgent',
    bg: 'linear-gradient(160deg,#200000,#3d0a0a 40%,#1a0505 80%,#0d0000)',
    overlay: 'radial-gradient(ellipse at 50% 50%,rgba(200,30,0,.3),transparent 60%)',
    emoji: '⚔️' },
  { id: 'nuit', name: 'Camp de Nuit', tag: 'Extérieur • Repos',
    bg: 'linear-gradient(180deg,#050510,#0a0a20 40%,#080815 80%,#030308)',
    overlay: 'radial-gradient(ellipse at 30% 80%,rgba(255,140,0,.15),transparent 30%)',
    emoji: '🌙' },
  { id: 'montagne', name: 'Les Cimes Glacées', tag: 'Extérieur • Hostile',
    bg: 'linear-gradient(180deg,#0a1520,#1a2535 50%,#252d35 80%,#101520)',
    overlay: 'radial-gradient(ellipse at 50% 10%,rgba(150,200,255,.15),transparent 50%)',
    emoji: '🏔️' },
  { id: 'mine', name: 'La Mine Maudite', tag: 'Souterrain • Étroit',
    bg: 'linear-gradient(160deg,#0d0800,#1a1205 50%,#0a0800)',
    overlay: 'radial-gradient(ellipse at 40% 50%,rgba(255,100,0,.15),transparent 40%)',
    emoji: '⛏️' },
  { id: 'marais', name: 'Le Marais Pestilentiel', tag: 'Extérieur • Maudit',
    bg: 'linear-gradient(160deg,#080d05,#101808 50%,#0a1005)',
    overlay: 'radial-gradient(ellipse at 50% 50%,rgba(40,100,20,.25),transparent 60%)',
    emoji: '🐊' },
  { id: 'volcan', name: 'Les Entrailles du Volcan', tag: 'Danger • Feu',
    bg: 'linear-gradient(180deg,#1a0500,#3d0f00 40%,#200800 80%,#0d0300)',
    overlay: 'radial-gradient(ellipse at 50% 100%,rgba(255,60,0,.35),transparent 55%)',
    emoji: '🌋' },
  { id: 'abysses', name: 'Les Abysses', tag: 'Outer Plane • Chaos',
    bg: 'linear-gradient(160deg,#050010,#0f0020 50%,#050015)',
    overlay: 'radial-gradient(ellipse at 30% 30%,rgba(120,0,180,.3),transparent 50%)',
    emoji: '👁️' },
  { id: 'paradis', name: 'Les Plaines Célestes', tag: 'Outer Plane • Divin',
    bg: 'linear-gradient(180deg,#1a1530,#2a2545 40%,#1a1830)',
    overlay: 'radial-gradient(ellipse at 50% 0%,rgba(200,180,255,.2),transparent 50%)',
    emoji: '☁️' },
  { id: 'tombeau', name: 'Le Tombeau Ancien', tag: 'Mort-vivants • Sinistre',
    bg: 'linear-gradient(160deg,#0a0808,#181010 50%,#0d0a0a)',
    overlay: 'radial-gradient(ellipse at 50% 60%,rgba(0,80,30,.2),transparent 50%)',
    emoji: '⚰️' },
];
