// D&D 5e constants extracted from app.js

export const SLOTS_FULL = [
  null,
  [2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]
]

export const SLOTS_HALF = [
  null,
  [0,0,0,0,0,0,0,0,0],[2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],[4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],[4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,0,0,0,0]
]

export const SLOTS_WARLOCK = [
  null,
  {s:1,l:1},{s:2,l:1},{s:2,l:2},{s:2,l:2},{s:2,l:3},{s:2,l:3},{s:2,l:4},{s:2,l:4},
  {s:2,l:5},{s:2,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},
  {s:4,l:5},{s:4,l:5},{s:4,l:5},{s:4,l:5}
]

export const SPELL_SCHOOLS = [
  'Abjuration','Invocation','Divination','Enchantement',
  'Évocation','Illusion','Nécromancie','Transmutation'
]

export const SKILLS = [
  { name: 'Acrobaties',    ability: 'dex' },
  { name: 'Arcanes',       ability: 'int' },
  { name: 'Athlétisme',   ability: 'str' },
  { name: 'Discrétion',   ability: 'dex' },
  { name: 'Dressage',      ability: 'wis' },
  { name: 'Escamotage',    ability: 'dex' },
  { name: 'Histoire',      ability: 'int' },
  { name: 'Intimidation',  ability: 'cha' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Médecine',     ability: 'wis' },
  { name: 'Nature',        ability: 'int' },
  { name: 'Perception',    ability: 'wis' },
  { name: 'Perspicacité', ability: 'wis' },
  { name: 'Persuasion',    ability: 'cha' },
  { name: 'Religion',      ability: 'int' },
  { name: 'Représentation',ability: 'cha' },
  { name: 'Survie',        ability: 'wis' },
  { name: 'Tromperie',     ability: 'cha' },
]

export const ABILITY_LABELS = {
  str: 'FOR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'SAG', cha: 'CHA'
}

export const ALIGNMENTS = [
  'Loyal Bon', 'Neutre Bon', 'Chaotique Bon',
  'Loyal Neutre', 'Neutre', 'Chaotique Neutre',
  'Loyal Mauvais', 'Neutre Mauvais', 'Chaotique Mauvais'
]

export const CLASSES = [
  { id: 'barbarian',  name: 'Barbare',     icon: '🪓', hd: 12, spellType: null,     spellAbility: null },
  { id: 'bard',       name: 'Barde',       icon: '🎵', hd: 8,  spellType: 'full',   spellAbility: 'cha' },
  { id: 'cleric',     name: 'Clerc',       icon: '✝️', hd: 8,  spellType: 'full',   spellAbility: 'wis' },
  { id: 'druid',      name: 'Druide',      icon: '🌿', hd: 8,  spellType: 'full',   spellAbility: 'wis' },
  { id: 'fighter',    name: 'Guerrier',    icon: '⚔️', hd: 10, spellType: null,     spellAbility: null },
  { id: 'monk',       name: 'Moine',       icon: '☯️', hd: 8,  spellType: null,     spellAbility: null },
  { id: 'paladin',    name: 'Paladin',     icon: '🛡️', hd: 10, spellType: 'half',   spellAbility: 'cha' },
  { id: 'ranger',     name: 'Rôdeur',     icon: '🏹', hd: 10, spellType: 'half',   spellAbility: 'wis' },
  { id: 'rogue',      name: 'Roublard',    icon: '🗡️', hd: 8,  spellType: null,     spellAbility: null },
  { id: 'sorcerer',   name: 'Ensorceleur', icon: '✨', hd: 6,  spellType: 'full',   spellAbility: 'cha' },
  { id: 'warlock',    name: 'Occultiste',  icon: '🔮', hd: 8,  spellType: 'warlock',spellAbility: 'cha' },
  { id: 'wizard',     name: 'Magicien',    icon: '📚', hd: 6,  spellType: 'full',   spellAbility: 'int' },
]

export function mod(score) {
  return Math.floor(((parseInt(score) || 10) - 10) / 2)
}

export function modStr(score) {
  const m = mod(score)
  return m >= 0 ? '+' + m : '' + m
}

export function profBonus(level) {
  return Math.ceil((parseInt(level) || 1) / 4) + 1
}

export function getSlots(spellType, level) {
  const lv = Math.max(1, Math.min(20, parseInt(level) || 1))
  if (spellType === 'warlock') {
    const w = SLOTS_WARLOCK[lv]
    if (!w) return {}
    return { [w.l]: w.s }
  }
  const row = (spellType === 'half' ? SLOTS_HALF : SLOTS_FULL)[lv]
  if (!row) return {}
  const out = {}
  row.forEach((max, i) => { if (max > 0) out[i + 1] = max })
  return out
}

// Multiclassing combined spell slot table (caster level 1-20 → slots for levels 1-9)
const MULTICLASS_SLOTS_TABLE = [
  [2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1],
]
const MC_WEIGHT = { full: 1, half: 0.5, third: 1/3, warlock: 0 }

// Returns { slots: {level: count}, warlockSlots: {slots, level} | null }
export function computeMulticlassSlots(picks) {
  let casterLevel = 0
  let warlockLevel = 0
  for (const pick of (picks || [])) {
    const cls = CLASSES.find(c => c.id === pick.classId)
    if (!cls) continue
    const lv = Math.max(1, Math.min(20, parseInt(pick.level) || 1))
    if (cls.spellType === 'warlock') {
      warlockLevel = lv
    } else {
      casterLevel += Math.floor(lv * (MC_WEIGHT[cls.spellType] || 0))
    }
  }
  const slots = {}
  if (casterLevel >= 1) {
    const row = MULTICLASS_SLOTS_TABLE[Math.min(casterLevel, 20) - 1]
    row.forEach((max, i) => { if (max > 0) slots[i + 1] = max })
  }
  const warlockSlots = warlockLevel > 0 ? SLOTS_WARLOCK[warlockLevel] : null
  return { slots, warlockSlots }
}

export const DEFAULT_CHARACTER = {
  char_name: '',
  level: 1,
  subclass: '',
  hd_current: 1,
  race: '',
  background: '',
  alignment: '',
  xp: 0,
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
  hp_current: 0,
  hp_max: 0,
  hp_temp: 0,
  hit_dice_remaining: '',
  hit_dice_total: '',
  spell_dc: 10,
  spell_attack: 0,
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
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
  _classIcon: '⚔️',
  _spellType: null,
  _spellAbility: null,
  _hd: null,
  _slotUsed: {},
  _deathSaves: { s1: false, s2: false, s3: false, f1: false, f2: false, f3: false },
  _skillProf: {},
  _skillExpert: {},
}

// DM Screen scene data (minimal built-in scenes)
export const SCENES = [
  { id: 'tavern',     name: 'Taverne',          emoji: '🍺', tag: 'Intérieur', bg: 'linear-gradient(135deg, #3d1a00 0%, #7a3810 50%, #2a1200 100%)', overlay: 'rgba(255,140,0,0.08)' },
  { id: 'dungeon',    name: 'Donjon',            emoji: '🏰', tag: 'Souterrain', bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0d0d0d 100%)', overlay: 'rgba(0,0,80,0.12)' },
  { id: 'forest',     name: 'Forêt',            emoji: '🌲', tag: 'Extérieur', bg: 'linear-gradient(135deg, #0d2b0d 0%, #1a4a1a 50%, #0a1a0a 100%)', overlay: 'rgba(0,80,0,0.08)' },
  { id: 'cave',       name: 'Grotte',            emoji: '🪨', tag: 'Souterrain', bg: 'linear-gradient(135deg, #1a1a1a 0%, #2d2020 50%, #111111 100%)', overlay: 'rgba(50,20,0,0.1)' },
  { id: 'castle',     name: 'Château',          emoji: '🏯', tag: 'Intérieur', bg: 'linear-gradient(135deg, #1a1410 0%, #2d2520 50%, #0d0b07 100%)', overlay: 'rgba(100,80,40,0.08)' },
  { id: 'village',    name: 'Village',           emoji: '🏘️', tag: 'Extérieur', bg: 'linear-gradient(135deg, #1a2a10 0%, #2d4a20 50%, #0d1a07 100%)', overlay: 'rgba(60,100,30,0.08)' },
  { id: 'sea',        name: 'Haute Mer',         emoji: '🌊', tag: 'Extérieur', bg: 'linear-gradient(135deg, #001a3a 0%, #003366 50%, #001020 100%)', overlay: 'rgba(0,50,120,0.12)' },
  { id: 'mountain',   name: 'Montagne',          emoji: '⛰️', tag: 'Extérieur', bg: 'linear-gradient(135deg, #1a1a1a 0%, #3d3d3d 50%, #0d0d0d 100%)', overlay: 'rgba(150,150,150,0.06)' },
  { id: 'desert',     name: 'Désert',           emoji: '🏜️', tag: 'Extérieur', bg: 'linear-gradient(135deg, #3d2a00 0%, #6b4a00 50%, #2a1a00 100%)', overlay: 'rgba(255,200,100,0.06)' },
  { id: 'graveyard',  name: 'Cimetière',        emoji: '⚰️', tag: 'Extérieur', bg: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #080808 100%)', overlay: 'rgba(100,0,100,0.06)' },
  { id: 'throne',     name: 'Salle du trône',   emoji: '👑', tag: 'Intérieur', bg: 'linear-gradient(135deg, #1a1000 0%, #3d2800 50%, #0d0a00 100%)', overlay: 'rgba(200,160,0,0.06)' },
  { id: 'swamp',      name: 'Marécage',         emoji: '🌿', tag: 'Extérieur', bg: 'linear-gradient(135deg, #0a1a0a 0%, #1a2d0a 50%, #060d06 100%)', overlay: 'rgba(0,100,0,0.1)' },
]
