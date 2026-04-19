/**
 * Character share-link codec. Backwards-compatible with the legacy
 * `dnd5e-sheets/view.html` format: `#base64(encodeURIComponent(JSON))`.
 */

import type { DnDCharacter } from '@/types/character';

export function encodeCharacter(ch: DnDCharacter): string {
  const json = JSON.stringify(ch);
  // `unescape(encodeURIComponent(x))` is the legacy safe-UTF8-to-binary idiom.
  const binary = unescape(encodeURIComponent(json));
  return btoa(binary).replace(/=+$/, '');
}

export function decodeCharacter(encoded: string): DnDCharacter {
  const clean = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (clean.length % 4)) % 4);
  const binary = atob(clean + pad);
  const json = decodeURIComponent(escape(binary));
  return JSON.parse(json) as DnDCharacter;
}

export function downloadJson(ch: DnDCharacter) {
  const blob = new Blob([JSON.stringify(ch, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ch.char_name.replace(/[^\w\-]+/g, '_') || 'character'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildShareUrl(ch: DnDCharacter): string {
  const base = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`;
  return `${base}#/character/shared/${encodeCharacter(ch)}`;
}
