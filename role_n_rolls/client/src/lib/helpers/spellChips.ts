import type { DnDSpell } from '@/types/character';
import type { ChipDef } from '@/components/shared/Chip';

/**
 * Spell metadata chips — level, school, concentration/ritual, attack type,
 * DC, damage type, area of effect. Kept pure: inputs are already normalised
 * (see SpellBrowser.toSheetSpell and useDndSpellsAoe), outputs are drawn by
 * <ChipRow> without any further lookup.
 */

/** Damage-type palette. Keys are lowercase so the renderer can do a
 * case-insensitive lookup off the PascalCase source (`Fire` -> `fire`). */
export const DAMAGE_TYPE_STYLE: Record<string, string> = {
  bludgeoning: 'bg-stone-900/40 text-stone-300 border-stone-500/40',
  piercing: 'bg-stone-900/40 text-stone-300 border-stone-500/40',
  slashing: 'bg-stone-900/40 text-stone-300 border-stone-500/40',
  fire: 'bg-orange-900/30 text-orange-300 border-orange-500/40',
  cold: 'bg-sky-900/30 text-sky-300 border-sky-500/40',
  lightning: 'bg-yellow-900/30 text-yellow-300 border-yellow-500/40',
  acid: 'bg-lime-900/30 text-lime-300 border-lime-500/40',
  poison: 'bg-emerald-900/30 text-emerald-300 border-emerald-500/40',
  necrotic: 'bg-neutral-900/60 text-neutral-300 border-neutral-500/40',
  radiant: 'bg-amber-900/30 text-amber-200 border-amber-400/40',
  thunder: 'bg-indigo-900/30 text-indigo-300 border-indigo-500/40',
  force: 'bg-violet-900/30 text-violet-200 border-violet-400/40',
  psychic: 'bg-fuchsia-900/30 text-fuchsia-300 border-fuchsia-500/40',
};

/** FR spell-school palette (the bundle localises school names to FR). */
export const SCHOOL_STYLE: Record<string, string> = {
  Abjuration: 'bg-sky-900/20 text-sky-300 border-sky-500/30',
  Invocation: 'bg-fuchsia-900/20 text-fuchsia-300 border-fuchsia-500/30',
  Conjuration: 'bg-fuchsia-900/20 text-fuchsia-300 border-fuchsia-500/30',
  Divination: 'bg-indigo-900/20 text-indigo-300 border-indigo-500/30',
  Enchantement: 'bg-rose-900/20 text-rose-300 border-rose-500/30',
  Enchantment: 'bg-rose-900/20 text-rose-300 border-rose-500/30',
  Évocation: 'bg-orange-900/20 text-orange-300 border-orange-500/30',
  Evocation: 'bg-orange-900/20 text-orange-300 border-orange-500/30',
  Illusion: 'bg-violet-900/20 text-violet-300 border-violet-500/30',
  Nécromancie: 'bg-neutral-900/60 text-neutral-300 border-neutral-500/40',
  Necromancy: 'bg-neutral-900/60 text-neutral-300 border-neutral-500/40',
  Transmutation: 'bg-emerald-900/20 text-emerald-300 border-emerald-500/30',
};

const HEAL_STYLE = 'bg-emerald-900/30 text-emerald-300 border-emerald-500/40';
const HEAL_REGEX = /point(s)? de vie|soigne|récupère|regagne/i;

const DC_SUCCESS_LABEL: Record<'half' | 'none' | 'other', string> = {
  half: '½ dégâts',
  none: 'tout ou rien',
  other: 'particulier',
};

const ATTACK_LABEL: Record<'ranged' | 'melee', string> = {
  ranged: 'Attaque à distance',
  melee: 'Attaque au corps à corps',
};

export interface BuildSpellChipsOptions {
  /** Current character level — only affects damage highlighting (used by the table). */
  characterLevel?: number;
}

export function buildSpellChips(spell: DnDSpell, _opts?: BuildSpellChipsOptions): ChipDef[] {
  const out: ChipDef[] = [];

  out.push({
    kind: 'level',
    text: spell.level === 0 ? 'Tour de magie' : `Niv. ${spell.level}`,
  });

  if (spell.school) {
    out.push({
      kind: 'school',
      text: spell.school,
      className: SCHOOL_STYLE[spell.school],
    });
  }

  if (spell.concentration) out.push({ kind: 'conc', text: 'Concentration' });
  if (spell.ritual) out.push({ kind: 'ritual', text: 'Rituel' });

  if (spell.attack_type) {
    out.push({ kind: 'atk', text: ATTACK_LABEL[spell.attack_type] });
  }

  if (spell.dc && spell.dc.dc_type) {
    const success = (spell.dc.dc_success ?? 'other') as 'half' | 'none' | 'other';
    out.push({
      kind: 'dc',
      text: `JS ${spell.dc.dc_type} — ${DC_SUCCESS_LABEL[success]}`,
    });
  }

  if (spell.damage?.damage_type) {
    const key = spell.damage.damage_type.toLowerCase();
    out.push({
      kind: 'dmg',
      text: spell.damage.damage_type,
      className: DAMAGE_TYPE_STYLE[key],
    });
  }

  if (spell.area_of_effect?.type) {
    const size = spell.area_of_effect.size;
    const label = typeof size === 'number' ? `${size} ft ${spell.area_of_effect.type}` : String(spell.area_of_effect.type);
    out.push({ kind: 'dmg', text: label, className: 'bg-teal-900/30 text-teal-200 border-teal-500/40' });
  }

  // Healing heuristic — only fires when the spell has neither damage nor DC
  // and the description clearly mentions HP restoration. Keeps false positives low.
  if (!spell.damage && !spell.dc && spell.summary && HEAL_REGEX.test(spell.summary)) {
    out.push({ kind: 'dmg', text: 'Soin', className: HEAL_STYLE });
  }

  return out;
}
