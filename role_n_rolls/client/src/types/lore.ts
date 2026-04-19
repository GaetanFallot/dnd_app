import type { LoreEntityType } from './supabase';

export interface LoreEntity {
  id: string;
  campaignId: string;
  type: LoreEntityType;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoreRelation {
  id: string;
  campaignId: string;
  entityAId: string;
  entityBId: string;
  relationLabel: string;
}

export interface LoreEvent {
  id: string;
  campaignId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  entityIds: string[];
}

export const LORE_ENTITY_TYPES: Array<{
  id: LoreEntityType;
  label: string;
  color: string;
  icon: string;
}> = [
  { id: 'city', label: 'Ville', color: '#3b82f6', icon: '🏰' },
  { id: 'family', label: 'Famille', color: '#10b981', icon: '👑' },
  { id: 'npc', label: 'PNJ', color: '#f59e0b', icon: '👤' },
  { id: 'guild', label: 'Guilde', color: '#a855f7', icon: '⚒️' },
  { id: 'creature', label: 'Créature', color: '#ef4444', icon: '🐉' },
  { id: 'faction', label: 'Faction', color: '#06b6d4', icon: '⚔️' },
  { id: 'place', label: 'Lieu', color: '#84cc16', icon: '📍' },
  { id: 'object', label: 'Objet', color: '#d4a843', icon: '💎' },
  { id: 'deity', label: 'Divinité', color: '#ec4899', icon: '✨' },
  { id: 'other', label: 'Autre', color: '#94a3b8', icon: '❓' },
];

export const loreTypeMeta = (type: LoreEntityType) =>
  LORE_ENTITY_TYPES.find((t) => t.id === type) ?? LORE_ENTITY_TYPES[LORE_ENTITY_TYPES.length - 1];
