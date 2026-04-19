/**
 * Soundboard utilities — shared AudioContext, buffer cache for static WAVs,
 * and Web Audio synthesisers ported from the legacy js/soundboard.js.
 *
 * Sounds live in /public/sounds/ so they're served as real static assets
 * (Vite would otherwise try to bundle them as base64 data URLs).
 */

let sharedCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctx: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

export async function loadBuffer(url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  const ctx = getAudioContext();
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  const arr = await resp.arrayBuffer();
  const buf = await ctx.decodeAudioData(arr);
  bufferCache.set(url, buf);
  return buf;
}

export function playBuffer(buf: AudioBuffer, volume: number) {
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(0);
}

/** Synthesised "fireball" whoosh — filtered noise with a low-frequency tail. */
export function synthFireball(volume: number) {
  const ctx = getAudioContext();
  const dur = 1.8;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(400, ctx.currentTime);
  filt.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + dur);
  filt.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(filt);
  filt.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + dur + 0.1);
}

export function synthSwordClash(volume: number) {
  const ctx = getAudioContext();
  const dur = 0.4;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = 1500;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filt);
  filt.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + dur);
}

export function synthMagicSpell(volume: number) {
  const ctx = getAudioContext();
  const dur = 1.4;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.08;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.45;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  feedback.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.1);
}

export function synthDrumImpact(volume: number) {
  const ctx = getAudioContext();
  const dur = 0.6;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

/** Built-in soundboard buttons. */
export interface SoundDef {
  id: string;
  label: string;
  emoji: string;
  kind: 'buffer' | 'synth';
  url?: string;
  synth?: 'fireball' | 'sword' | 'magic' | 'impact';
  baseVolume?: number;
}

export const BUILT_IN_SOUNDS: SoundDef[] = [
  { id: 'thunder',   label: 'Tonnerre',  emoji: '⚡',   kind: 'buffer', url: '/sounds/thunder.wav', baseVolume: 1.0 },
  { id: 'fireball',  label: 'Fireball',  emoji: '🔥',  kind: 'synth',  synth: 'fireball', baseVolume: 0.9 },
  { id: 'sword',     label: 'Épée',      emoji: '⚔️',  kind: 'synth',  synth: 'sword',    baseVolume: 0.8 },
  { id: 'magic',     label: 'Sortilège', emoji: '✨',  kind: 'synth',  synth: 'magic',    baseVolume: 0.8 },
  { id: 'impact',    label: 'Impact',    emoji: '🥁',  kind: 'synth',  synth: 'impact',   baseVolume: 1.0 },
];

export async function playBuiltIn(def: SoundDef, masterVolume: number) {
  const vol = (def.baseVolume ?? 1) * masterVolume;
  if (def.kind === 'buffer' && def.url) {
    try {
      const buf = await loadBuffer(def.url);
      playBuffer(buf, vol);
      return;
    } catch (err) {
      console.warn('[soundboard] buffer load failed, no fallback for', def.id, err);
      return;
    }
  }
  if (def.kind === 'synth') {
    switch (def.synth) {
      case 'fireball': synthFireball(vol); break;
      case 'sword':    synthSwordClash(vol); break;
      case 'magic':    synthMagicSpell(vol); break;
      case 'impact':   synthDrumImpact(vol); break;
    }
  }
}
