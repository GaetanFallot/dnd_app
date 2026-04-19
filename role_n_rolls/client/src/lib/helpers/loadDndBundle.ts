/**
 * Loads legacy `window.DND_*_EN/FR` bundles shipped under /dnd_db/.
 *
 * The bundles are plain `.js` files that set a single global variable —
 * we fetch them as text and evaluate the embedded JSON array rather than
 * polluting `window`, which plays nicer with HMR and testing.
 */

import type { DndLang } from '@/types/dnd';

export type BundleName =
  | 'backgrounds'
  | 'classes'
  | 'feats'
  | 'monsters'
  | 'races'
  | 'spells'
  | 'subclasses';

const cache = new Map<string, unknown[]>();

function extractJsonArray(src: string): string {
  // Match the `= [...];` payload after `window.DND_XXX=` / `const DND_XXX=` / `var ...=`.
  const i = src.indexOf('=[');
  if (i === -1) throw new Error('Bundle payload not found (expected "=[").');
  // Walk forward to the matching `];` (handles nested brackets inside strings).
  let depth = 0;
  let inStr: string | null = null;
  let escape = false;
  for (let j = i + 1; j < src.length; j++) {
    const ch = src[j];
    if (inStr) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return src.slice(i + 1, j + 1);
    }
  }
  throw new Error('Bundle payload not balanced.');
}

export async function loadDndBundle<T = unknown>(
  name: BundleName,
  lang: DndLang,
): Promise<T[]> {
  const key = `${name}_${lang}`;
  const cached = cache.get(key);
  if (cached) return cached as T[];

  const url = `/dnd_db/bundle_${name}_${lang}.js`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  const json = extractJsonArray(text);
  const raw = JSON.parse(json) as unknown[];
  const data = raw.map((entry) => normalizeEntry(name, entry)) as T[];
  cache.set(key, data);
  return data;
}

/**
 * The scraped bundles use shorthand keys (`desc`, `components: ['V','S']`,
 * `index` as slug). Consumers expect `description`, `{v,s,m}`, `slug`.
 * We reconcile once at load time so panels and filters stay dumb.
 */
function normalizeEntry(bundle: BundleName, raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const e = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...e };

  if (out.slug === undefined && typeof out.index === 'string') out.slug = out.index;

  if (out.description === undefined && typeof out.desc === 'string') {
    out.description = out.desc;
  }

  if (bundle === 'spells') {
    const c = out.components;
    if (Array.isArray(c)) {
      const arr = c.map((x) => String(x).toLowerCase());
      out.components = {
        v: arr.includes('v'),
        s: arr.includes('s'),
        m: arr.includes('m') || !!out.material,
        material: typeof out.material === 'string' ? (out.material as string) : undefined,
      };
    }
  }

  if (bundle === 'monsters') {
    const asArr = (v: unknown) => (Array.isArray(v) ? v : []);
    for (const k of ['special_abilities', 'actions', 'reactions', 'legendary_actions'] as const) {
      const list = asArr(out[k]);
      if (list.length) {
        out[k] = list.map((it) => {
          if (!it || typeof it !== 'object') return it;
          const o = it as Record<string, unknown>;
          if (o.description === undefined && typeof o.desc === 'string') {
            return { ...o, description: o.desc };
          }
          return o;
        });
      }
    }
    if (!out.traits && Array.isArray(out.special_abilities)) {
      out.traits = out.special_abilities;
    }
    if (!out.legendary_description && typeof out.legendary_desc === 'string') {
      out.legendary_description = out.legendary_desc;
    }
  }

  return out;
}
