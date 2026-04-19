/**
 * DnDCharacter — matches the schema written by the legacy
 * dnd5e-sheets/shared/app.js, so existing db/characters/*.json
 * files load unchanged.
 */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type SpellType = 'full' | 'half' | 'warlock' | 'third' | 'none';

export interface DnDSpell {
  prepared: boolean;
  level: number;
  school: string;
  name: string;
  range: string;
  duration: string;
  v: boolean;
  s: boolean;
  m: boolean;
  summary: string;
  expanded: boolean;
  // Optional richer metadata — populated when added via the bibliothèque.
  casting_time?: string;
  material?: string;
  concentration?: boolean;
  ritual?: boolean;
  classes?: string[];
  higher_level?: string;
}

export interface DnDAttack {
  name: string;
  bonus: number;
  damage: string;
  notes?: string;
}

export interface DnDFeature {
  name: string;
  source: string;
  description: string;
}

export type ResourceRecharge = 'short' | 'long' | 'none';

export interface DnDResource {
  id: string;
  name: string;
  source?: string;
  current: number;
  max: number;
  recharge: ResourceRecharge;
}

export interface DnDDeathSaves {
  successes: boolean[];
  failures: boolean[];
}

export interface DnDCharacter {
  // Identity
  char_name: string;
  level: number;
  race: string;
  background: string;
  alignment: string;

  // Abilities
  ability_str: number;
  ability_dex: number;
  ability_con: number;
  ability_int: number;
  ability_wis: number;
  ability_cha: number;

  // Saves (proficiency flags)
  save_prof_str: boolean;
  save_prof_dex: boolean;
  save_prof_con: boolean;
  save_prof_int: boolean;
  save_prof_wis: boolean;
  save_prof_cha: boolean;

  // Combat
  ac: number;
  initiative: number;
  speed: string;
  hp_current: number;
  hp_max: number;
  hp_temp: number;

  // Spellcasting
  spell_dc: number;
  spell_attack: number;

  // Money
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;

  // Collections
  _attacks: DnDAttack[];
  _spells: DnDSpell[];
  _equipment: Array<{ name: string; qty?: number; notes?: string }>;
  _features: DnDFeature[];
  _resources: DnDResource[];
  _profLanguages: string[];

  // Narrative
  _traits: string;
  _ideals: string;
  _bonds: string;
  _flaws: string;
  _notes: string;
  _backstory: string;
  _portrait: string;

  // Class metadata
  _classId: string;
  _className: string;
  _classIcon: string;
  _spellType: SpellType;
  _spellAbility: AbilityKey;
  _hd: number;

  _slotUsed: Record<string, boolean>;
  _deathSaves: DnDDeathSaves;
}
