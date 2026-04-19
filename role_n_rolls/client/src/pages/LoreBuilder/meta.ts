import type { LoreEntityType } from '@/types/supabase';

export const LORE_TYPE_META: Record<LoreEntityType, { label: string; emoji: string }> = {
  city:     { label: 'Cité',     emoji: '🏰' },
  family:   { label: 'Famille',  emoji: '👪' },
  npc:      { label: 'PNJ',      emoji: '🧙' },
  guild:    { label: 'Guilde',   emoji: '⚒️' },
  creature: { label: 'Créature', emoji: '🐉' },
  faction:  { label: 'Faction',  emoji: '⚔️' },
  place:    { label: 'Lieu',     emoji: '🗺️' },
  object:   { label: 'Objet',    emoji: '🗝️' },
  deity:    { label: 'Divinité', emoji: '✨' },
  other:    { label: 'Autre',    emoji: '📜' },
};

export const LORE_TYPE_ORDER: LoreEntityType[] = [
  'npc',
  'creature',
  'city',
  'place',
  'faction',
  'guild',
  'family',
  'object',
  'deity',
  'other',
];
