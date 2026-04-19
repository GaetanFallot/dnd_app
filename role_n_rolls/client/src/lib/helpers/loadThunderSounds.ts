/**
 * Fetches the legacy thunder-sound data URLs (4 base64-encoded MP3s) so the
 * second screen can play real thunder buffers instead of the synth fallback.
 *
 * The file is ~660 KB — loaded lazily on first `open()` of the popup, not
 * at app startup.
 */

let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

export async function loadThunderSounds(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch('/dnd_db/thunder_sounds.js');
    if (!res.ok) throw new Error(`Failed to fetch thunder_sounds.js: ${res.status}`);
    const text = await res.text();
    // Match `const THUNDER_SOUNDS = { ... };` — value is a single object literal
    // using single-quoted string keys and values.
    const match = text.match(/THUNDER_SOUNDS\s*=\s*(\{[\s\S]*?\n\})\s*;?/);
    if (!match) throw new Error('THUNDER_SOUNDS literal not found in bundle');
    // Convert single-quoted object → JSON by swapping quotes on keys/values,
    // and strip trailing commas before `}` which are valid in JS but not JSON.
    const jsonish = match[1]
      .replace(/'([^']+)'\s*:/g, '"$1":')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/,(\s*[}\]])/g, '$1');
    const parsed = JSON.parse(jsonish) as Record<string, string>;
    cache = parsed;
    return parsed;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
