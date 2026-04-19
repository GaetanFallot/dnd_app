/**
 * D&D 5e rule helpers — ported verbatim from dnd5e-sheets/shared/app.js
 * so characters behave identically after migration.
 */

import type { AbilityKey, DnDCharacter, SpellType } from '@/types/character';

export const ABILITIES: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'Force',
  dex: 'Dextérité',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Sagesse',
  cha: 'Charisme',
};

export const ABILITY_SHORT: Record<AbilityKey, string> = {
  str: 'FOR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'SAG',
  cha: 'CHA',
};

export const SKILLS: Array<{ name: string; ability: AbilityKey }> = [
  { name: 'Acrobaties', ability: 'dex' },
  { name: 'Arcanes', ability: 'int' },
  { name: 'Athlétisme', ability: 'str' },
  { name: 'Discrétion', ability: 'dex' },
  { name: 'Dressage', ability: 'wis' },
  { name: 'Escamotage', ability: 'dex' },
  { name: 'Histoire', ability: 'int' },
  { name: 'Intimidation', ability: 'cha' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Médecine', ability: 'wis' },
  { name: 'Nature', ability: 'int' },
  { name: 'Perception', ability: 'wis' },
  { name: 'Perspicacité', ability: 'wis' },
  { name: 'Persuasion', ability: 'cha' },
  { name: 'Religion', ability: 'int' },
  { name: 'Représentation', ability: 'cha' },
  { name: 'Survie', ability: 'wis' },
  { name: 'Tromperie', ability: 'cha' },
];

export const SPELL_SCHOOLS = [
  'Abjuration', 'Invocation', 'Divination', 'Enchantement',
  'Évocation', 'Illusion', 'Nécromancie', 'Transmutation',
];

// Spell slot tables (index 0 unused — level 1 starts at index 1).
const SLOTS_FULL: Array<number[] | null> = [
  null,
  [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

const SLOTS_HALF: Array<number[] | null> = [
  null,
  [0, 0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
];

const SLOTS_WARLOCK: Array<{ s: number; l: number } | null> = [
  null,
  { s: 1, l: 1 }, { s: 2, l: 1 }, { s: 2, l: 2 }, { s: 2, l: 2 }, { s: 2, l: 3 },
  { s: 2, l: 3 }, { s: 2, l: 4 }, { s: 2, l: 4 }, { s: 2, l: 5 }, { s: 2, l: 5 },
  { s: 3, l: 5 }, { s: 3, l: 5 }, { s: 3, l: 5 }, { s: 3, l: 5 }, { s: 3, l: 5 },
  { s: 3, l: 5 }, { s: 4, l: 5 }, { s: 4, l: 5 }, { s: 4, l: 5 }, { s: 4, l: 5 },
];

export function mod(score: number): number {
  return Math.floor(((Number.isFinite(score) ? score : 10) - 10) / 2);
}

export function modStr(score: number): string {
  const m = mod(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

export function profBonus(level: number): number {
  const lv = Number.isFinite(level) ? level : 1;
  return Math.ceil(lv / 4) + 1;
}

export function getSlots(spellType: SpellType, level: number): Record<number, number> {
  const lv = Math.max(1, Math.min(20, level || 1));
  if (spellType === 'warlock') {
    const w = SLOTS_WARLOCK[lv];
    return w ? { [w.l]: w.s } : {};
  }
  if (spellType === 'none') return {};
  const row = (spellType === 'half' ? SLOTS_HALF : SLOTS_FULL)[lv];
  if (!row) return {};
  const out: Record<number, number> = {};
  row.forEach((max, i) => {
    if (max > 0) out[i + 1] = max;
  });
  return out;
}

export function blankCharacter(): DnDCharacter {
  return {
    char_name: 'Nouveau personnage',
    level: 1,
    race: '',
    background: '',
    alignment: '',

    ability_str: 10,
    ability_dex: 10,
    ability_con: 10,
    ability_int: 10,
    ability_wis: 10,
    ability_cha: 10,

    save_prof_str: false,
    save_prof_dex: false,
    save_prof_con: false,
    save_prof_int: false,
    save_prof_wis: false,
    save_prof_cha: false,

    ac: 10,
    initiative: 0,
    speed: '9m',
    hp_current: 8,
    hp_max: 8,
    hp_temp: 0,

    spell_dc: 10,
    spell_attack: 0,

    cp: 0, sp: 0, ep: 0, gp: 0, pp: 0,

    _attacks: [],
    _spells: [],
    _equipment: [],
    _features: [],
    _resources: [],
    _profLanguages: [],

    _traits: '',
    _ideals: '',
    _bonds: '',
    _flaws: '',
    _notes: '',
    _backstory: '',
    _portrait: '',

    _classId: '',
    _className: '',
    _classIcon: '🗡️',
    _spellType: 'none',
    _spellAbility: 'wis',
    _hd: 8,

    _slotUsed: {},
    _deathSaves: { successes: [false, false, false], failures: [false, false, false] },
  };
}

export function abilityOf(ch: DnDCharacter, key: AbilityKey): number {
  return Number(ch[`ability_${key}` as keyof DnDCharacter] ?? 10);
}

export function saveProfOf(ch: DnDCharacter, key: AbilityKey): boolean {
  return Boolean(ch[`save_prof_${key}` as keyof DnDCharacter]);
}

/** Recompute derived stats (init, spell DC/attack, HP temp is authoritative). */
export function recalcDerived(ch: DnDCharacter): DnDCharacter {
  const dex = mod(ch.ability_dex);
  const pb = profBonus(ch.level);
  const castMod = mod(abilityOf(ch, ch._spellAbility));

  return {
    ...ch,
    initiative: dex,
    spell_dc: ch._spellType === 'none' ? 10 : 8 + pb + castMod,
    spell_attack: ch._spellType === 'none' ? 0 : pb + castMod,
  };
}
