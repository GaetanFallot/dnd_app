/**
 * Canonical monster shape accepted by the encounter panel & monster modal.
 *
 * Merges fields used by:
 *  - The legacy custom-monster JSON format written by `js/monsters.js`
 *  - The scraped SRD bundles in /dnd_db/bundle_monsters_*.js
 *
 * Everything except `name` is optional — the bundles have wildly inconsistent
 * coverage (some FR entries only have name + description, for example).
 */

export interface Monster {
  id?: string;
  slug?: string;

  name: string;
  type?: string; // "Petite créature humanoïde (goblinoïde), neutre mauvais"
  size?: string;
  alignment?: string;

  cr?: number | string;
  challenge_rating?: number | string;
  xp?: number;
  proficiency_bonus?: number | string;

  armor_class?: number | string | Array<{ type: string; value: number }>;
  hit_points?: number | string;
  hit_dice?: string;
  speed?: string | Record<string, number | string>;

  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;

  saves?: string | Record<string, number>;
  skills?: string | Record<string, number>;
  damage_immunities?: string | string[];
  damage_resistances?: string | string[];
  damage_vulnerabilities?: string | string[];
  condition_immunities?: string | string[];
  senses?: string;
  languages?: string;

  traits?: Array<{ name: string; description: string }>;
  actions?: Array<{ name: string; description: string }>;
  reactions?: Array<{ name: string; description: string }>;
  legendary_actions?: Array<{ name: string; description: string }>;
  legendary_description?: string;

  notes?: string;
  description?: string;
  image?: string;

  // Provenance
  source?: 'srd' | 'custom' | 'lore';
  loreEntityId?: string; // set when the monster originates from a lore creature entity

  [key: string]: unknown;
}

/** Convenience: parse whatever the `cr` field contains into a sortable number. */
export function parseCr(cr: unknown): number | null {
  if (cr === null || cr === undefined || cr === '') return null;
  if (typeof cr === 'number') return cr;
  const s = String(cr).trim();
  if (/^\d+\/\d+$/.test(s)) {
    const [a, b] = s.split('/').map(Number);
    return b ? a / b : null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Coerce hit_points from "7 (2d6)" / 22 / "22" into the numeric current HP. */
export function parseHp(hp: unknown): number {
  if (typeof hp === 'number') return hp;
  if (typeof hp === 'string') {
    const m = hp.match(/\d+/);
    return m ? Number(m[0]) : 0;
  }
  return 0;
}
