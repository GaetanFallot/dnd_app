/**
 * Shape of the scraped D&D 5e entries from the legacy `dnd_db/` bundles.
 * These types are intentionally loose where the upstream data is loose,
 * because the bundles originate from both the 5e API and the scraped
 * French wikidot — values are inconsistent across entries.
 */

export interface DndApiRef {
  slug: string;
  name: string;
  url?: string;
}

export interface DndClassEntry {
  slug: string;
  name: string;
  hit_die?: number;
  hd?: number;
  proficiencies?: string[];
  saving_throws?: string[];
  spellcasting_ability?: string;
  spell_type?: 'full' | 'half' | 'warlock' | 'third' | 'none';
  description?: string;
  features?: DndFeatureEntry[];
  subclasses?: DndApiRef[];
  [key: string]: unknown;
}

export interface DndSubclassEntry {
  slug: string;
  name: string;
  class: string;
  description?: string;
  features?: DndFeatureEntry[];
  [key: string]: unknown;
}

export interface DndRaceEntry {
  slug: string;
  name: string;
  speed?: number;
  size?: string;
  ability_bonuses?: Array<{ ability: string; bonus: number }>;
  traits?: DndApiRef[];
  description?: string;
  [key: string]: unknown;
}

export interface DndBackgroundEntry {
  slug: string;
  name: string;
  skill_proficiencies?: string[];
  tool_proficiencies?: string[];
  languages?: number;
  feature?: { name: string; description: string };
  description?: string;
  [key: string]: unknown;
}

export interface DndFeatEntry {
  slug: string;
  name: string;
  prerequisites?: string;
  description?: string;
  [key: string]: unknown;
}

export interface DndFeatureEntry {
  slug?: string;
  name: string;
  level?: number;
  description?: string;
  [key: string]: unknown;
}

export interface DndSpellEntry {
  slug: string;
  name: string;
  level: number;
  school?: string;
  casting_time?: string;
  range?: string;
  components?: { v?: boolean; s?: boolean; m?: boolean; material?: string };
  duration?: string;
  concentration?: boolean;
  ritual?: boolean;
  classes?: string[];
  description?: string;
  higher_level?: string;
  [key: string]: unknown;
}

export interface DndMonsterEntry {
  slug: string;
  name: string;
  size?: string;
  type?: string;
  subtype?: string;
  alignment?: string;
  cr?: number | string;
  challenge_rating?: number | string;
  xp?: number;
  proficiency_bonus?: number;
  armor_class?: number | Array<{ type: string; value: number }>;
  hit_points?: number;
  hit_dice?: string;
  speed?: string | Record<string, number | string>;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  saves?: Record<string, number>;
  skills?: Record<string, number>;
  damage_immunities?: string[];
  damage_resistances?: string[];
  damage_vulnerabilities?: string[];
  condition_immunities?: string[];
  senses?: string;
  languages?: string;
  traits?: Array<{ name: string; description: string }>;
  actions?: Array<{ name: string; description: string }>;
  reactions?: Array<{ name: string; description: string }>;
  legendary_actions?: Array<{ name: string; description: string }>;
  description?: string;
  [key: string]: unknown;
}

export type DndLang = 'en' | 'fr';

export interface DndDataset {
  classes: DndClassEntry[];
  subclasses: DndSubclassEntry[];
  races: DndRaceEntry[];
  backgrounds: DndBackgroundEntry[];
  feats: DndFeatEntry[];
  spells: DndSpellEntry[];
  monsters: DndMonsterEntry[];
}
