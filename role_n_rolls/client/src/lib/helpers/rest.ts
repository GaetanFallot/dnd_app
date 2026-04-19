import type { DnDCharacter, DnDResource } from '@/types/character';
import { getSlots } from './dndRules';

/**
 * Short rest — restore resources flagged `recharge: 'short'`
 * AND Warlock spell slots (which refresh on short rest).
 */
export function applyShortRest(ch: DnDCharacter): DnDCharacter {
  const nextResources = ch._resources.map((r) =>
    r.recharge === 'short' ? { ...r, current: r.max } : r,
  );
  const nextSlots: Record<string, boolean> = { ...ch._slotUsed };
  if (ch._spellType === 'warlock') {
    // Warlock slots all clear on short rest.
    for (const key of Object.keys(nextSlots)) delete nextSlots[key];
  }
  return {
    ...ch,
    _resources: nextResources,
    _slotUsed: nextSlots,
  };
}

/**
 * Long rest — full HP, full spell slots (except Warlock who already refreshed
 * on short rest; slot table is identical), all resources back to max, death
 * saves reset.
 */
export function applyLongRest(ch: DnDCharacter): DnDCharacter {
  const slots = getSlots(ch._spellType, ch.level);
  const nextSlots: Record<string, boolean> = {};
  // Leave the map empty — absence of a key means "slot available".
  void slots; // kept for self-documentation; the absence encoding is enough.

  return {
    ...ch,
    hp_current: ch.hp_max,
    hp_temp: 0,
    _resources: ch._resources.map((r) => ({ ...r, current: r.max })),
    _slotUsed: nextSlots,
    _deathSaves: { successes: [false, false, false], failures: [false, false, false] },
  };
}

export function blankResource(): DnDResource {
  return {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    source: '',
    current: 1,
    max: 1,
    recharge: 'long',
  };
}
