#!/usr/bin/env node
// Rebuilds browser bundles from existing downloaded data (no API calls needed).
// Applies feet → metres conversion to all distance fields.
// Also applies conversion to already-translated FR files.
// Run: node scripts/rebuild_bundles.js

const fs   = require('fs');
const path = require('path');
const { ft, ftSpeed, ftSenses } = require('./units');

const ROOT   = path.join(__dirname, '..');
const EN_DIR = path.join(ROOT, 'dnd_db', 'en');
const FR_DIR = path.join(ROOT, 'dnd_db', 'fr');

const SCHOOL_MAP = {
  'Abjuration':   'Abjuration',
  'Conjuration':  'Invocation',
  'Divination':   'Divination',
  'Enchantment':  'Enchantement',
  'Evocation':    'Évocation',
  'Illusion':     'Illusion',
  'Necromancy':   'Nécromancie',
  'Transmutation':'Transmutation',
};

const SIZE_MAP = {
  'Tiny':       'Très petite',
  'Small':      'Petite',
  'Medium':     'Moyenne',
  'Large':      'Grande',
  'Huge':       'Très grande',
  'Gargantuan': 'Gargantuesque',
};

const TYPE_MAP = {
  aberration:  'aberration', beast: 'bête', celestial: 'céleste',
  construct:   'artificiel', dragon: 'dragon', elemental: 'élémentaire',
  fey:         'fée', fiend: 'fiélon', giant: 'géant',
  humanoid:    'humanoïde', monstrosity: 'monstruosité', ooze: 'vase',
  plant:       'plante', undead: 'mort-vivant',
};

const ALIGN_MAP = {
  'any alignment': 'tout alignement',
  'any chaotic alignment': 'tout alignement chaotique',
  'any evil alignment': 'tout alignement mauvais',
  'any good alignment': 'tout alignement bon',
  'any lawful alignment': 'tout alignement loyal',
  'any non-good alignment': 'tout alignement non bon',
  'any neutral alignment': 'tout alignement neutre',
  'chaotic evil': 'chaotique mauvais', 'chaotic good': 'chaotique bon',
  'chaotic neutral': 'chaotique neutre', 'lawful evil': 'loyal mauvais',
  'lawful good': 'loyal bon', 'lawful neutral': 'loyal neutre',
  'neutral': 'neutre', 'neutral evil': 'neutre mauvais',
  'neutral good': 'neutre bon', 'true neutral': 'vrai neutre',
  'unaligned': 'sans alignement',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_index.json');
  } catch { return []; }
}

function acVal(m) {
  const ac = m.armor_class;
  if (typeof ac === 'number') return ac;
  if (Array.isArray(ac)) return ac[0]?.value ?? 10;
  return 10;
}

// ── EN SPELLS ─────────────────────────────────────────────────────────────────

function buildSpellsEN() {
  const dir = path.join(EN_DIR, 'dnd_spells');
  const files = listFiles(dir);
  if (!files.length) { console.warn('  ⚠ No EN spell files found'); return []; }

  const bundle = [];
  for (const f of files) {
    const s = readJSON(path.join(dir, f));
    if (!s) continue;
    bundle.push({
      index:         s.index,
      name:          s.name,
      level:         s.level,
      school:        s.school?.name || '',
      casting_time:  s.casting_time || '',
      range:         ft(s.range || ''),
      duration:      ft(s.duration || ''),
      concentration: !!s.concentration,
      ritual:        !!s.ritual,
      components:    s.components || [],
      material:      ft(s.material || ''),
      classes:       (s.classes || []).map(c => c.name),
      desc:          ft((s.desc || []).join('\n')),
      higher_level:  ft((s.higher_level || []).join('\n')),
      attack_type:   s.attack_type || '',
      damage:        s.damage ? {
        damage_type: s.damage.damage_type?.name || '',
        damage_at_slot_level: s.damage.damage_at_slot_level || {},
        damage_at_character_level: s.damage.damage_at_character_level || {},
      } : null,
      dc: s.dc ? { dc_type: s.dc.dc_type?.name||'', dc_success: s.dc.dc_success||'' } : null,
      area_of_effect: s.area_of_effect || null,
    });
  }
  bundle.sort((a,b) => a.level - b.level || a.name.localeCompare(b.name,'en'));
  return bundle;
}

// ── EN MONSTERS ───────────────────────────────────────────────────────────────

function buildMonstersEN() {
  const dir = path.join(EN_DIR, 'dnd_monsters');
  const files = listFiles(dir);
  if (!files.length) { console.warn('  ⚠ No EN monster files found'); return []; }

  const bundle = [];
  for (const f of files) {
    const m = readJSON(path.join(dir, f));
    if (!m) continue;
    bundle.push({
      index:                m.index,
      name:                 m.name,
      size:                 m.size || '',
      type:                 m.type || '',
      subtype:              m.subtype || '',
      alignment:            m.alignment || '',
      armor_class:          acVal(m),
      armor_desc:           Array.isArray(m.armor_class) ? (m.armor_class[0]?.desc||'') : '',
      hit_points:           m.hit_points || 0,
      hit_dice:             m.hit_dice || '',
      speed:                ftSpeed(m.speed || {}),
      strength:             m.strength || 10, dexterity: m.dexterity || 10,
      constitution:         m.constitution || 10, intelligence: m.intelligence || 10,
      wisdom:               m.wisdom || 10, charisma: m.charisma || 10,
      proficiencies:        (m.proficiencies||[]).map(p=>({ value:p.value, name:p.proficiency?.name||'' })),
      damage_vulnerabilities: m.damage_vulnerabilities || [],
      damage_resistances:   m.damage_resistances || [],
      damage_immunities:    m.damage_immunities || [],
      condition_immunities: (m.condition_immunities||[]).map(c=>c.name||c),
      senses:               ftSenses(m.senses || {}),
      languages:            m.languages || '',
      challenge_rating:     m.challenge_rating ?? 0,
      xp:                   m.xp || 0,
      proficiency_bonus:    m.proficiency_bonus || 2,
      special_abilities:    (m.special_abilities||[]).map(a=>({ name:a.name, desc:ft(a.desc||'') })),
      actions:              (m.actions||[]).map(a=>({ name:a.name, desc:ft(a.desc||''), attack_bonus:a.attack_bonus, damage:a.damage })),
      reactions:            (m.reactions||[]).map(a=>({ name:a.name, desc:ft(a.desc||'') })),
      legendary_desc:       ft(m.legendary_desc || ''),
      legendary_actions:    (m.legendary_actions||[]).map(a=>({ name:a.name, desc:ft(a.desc||'') })),
    });
  }
  bundle.sort((a,b) => (a.challenge_rating??0) - (b.challenge_rating??0) || a.name.localeCompare(b.name,'en'));
  return bundle;
}

// ── FR SPELLS ─────────────────────────────────────────────────────────────────

function buildSpellsFR(enSpells) {
  const enDir = path.join(EN_DIR, 'dnd_spells');
  const frDir = path.join(FR_DIR, 'dnd_spells');
  const frFiles = new Set(listFiles(frDir));

  const bundle = [];
  for (const enSpell of enSpells) {
    const frFile = `${enSpell.index}.json`;
    const hasFR  = frFiles.has(frFile);
    const src    = hasFR ? readJSON(path.join(frDir, frFile)) : null;
    const s      = src || readJSON(path.join(enDir, `${enSpell.index}.json`));
    if (!s) continue;

    const descRaw = Array.isArray(s.desc) ? s.desc.join('\n') : (s.desc || '');
    const hlRaw   = Array.isArray(s.higher_level) ? s.higher_level.join('\n') : (s.higher_level || '');

    bundle.push({
      index:         s.index,
      name:          s.name,
      name_en:       s.name_en || enSpell.name,
      level:         s.level,
      school:        SCHOOL_MAP[s.school?.name] || s.school?.name_fr || s.school?.name || enSpell.school,
      casting_time:  ft(s.casting_time || ''),
      range:         ft(s.range || ''),
      duration:      ft(s.duration || ''),
      concentration: !!s.concentration,
      ritual:        !!s.ritual,
      components:    s.components || [],
      material:      ft(s.material || ''),
      classes:       (s.classes || []).map(c => c.name),
      desc:          ft(descRaw),
      higher_level:  ft(hlRaw),
      attack_type:   s.attack_type || '',
      damage:        s.damage ? {
        damage_type: s.damage.damage_type?.name || '',
        damage_at_slot_level: s.damage.damage_at_slot_level || {},
        damage_at_character_level: s.damage.damage_at_character_level || {},
      } : null,
      dc: s.dc ? { dc_type: s.dc.dc_type?.name||'', dc_success: s.dc.dc_success||'' } : null,
      _translated: !!src,
    });
  }
  return bundle;
}

// ── FR MONSTERS ───────────────────────────────────────────────────────────────

function buildMonstersFR(enMonsters) {
  const enDir = path.join(EN_DIR, 'dnd_monsters');
  const frDir = path.join(FR_DIR, 'dnd_monsters');
  const frFiles = new Set(listFiles(frDir));

  const bundle = [];
  for (const enM of enMonsters) {
    const frFile = `${enM.index}.json`;
    const hasFR  = frFiles.has(frFile);
    const src    = hasFR ? readJSON(path.join(frDir, frFile)) : null;
    const m      = src || readJSON(path.join(enDir, `${enM.index}.json`));
    if (!m) continue;

    bundle.push({
      index:                m.index,
      name:                 m.name,
      name_en:              m.name_en || enM.name,
      size:                 SIZE_MAP[m.size] || m.size || '',
      size_en:              enM.size || m.size || '',
      type:                 TYPE_MAP[(m.type||'').toLowerCase()] || m.type || '',
      type_en:              enM.type || m.type || '',
      subtype:              m.subtype || '',
      alignment:            ALIGN_MAP[(m.alignment||'').toLowerCase()] || m.alignment || '',
      armor_class:          acVal(m),
      armor_desc:           m.armor_desc || '',
      hit_points:           m.hit_points || 0,
      hit_dice:             m.hit_dice || '',
      speed:                ftSpeed(m.speed || {}),
      strength:             m.strength || 10, dexterity: m.dexterity || 10,
      constitution:         m.constitution || 10, intelligence: m.intelligence || 10,
      wisdom:               m.wisdom || 10, charisma: m.charisma || 10,
      proficiencies:        (m.proficiencies||[]).map(p=>({ value:p.value, name:p.proficiency?.name||p.name||'' })),
      damage_vulnerabilities: m.damage_vulnerabilities || [],
      damage_resistances:   m.damage_resistances || [],
      damage_immunities:    m.damage_immunities || [],
      condition_immunities: (m.condition_immunities||[]).map(c=>c.name||c),
      senses:               ftSenses(m.senses || {}),
      languages:            m.languages || '',
      challenge_rating:     m.challenge_rating ?? 0,
      xp:                   m.xp || 0,
      proficiency_bonus:    m.proficiency_bonus || 2,
      special_abilities:    (m.special_abilities||[]).map(a=>({ name:a.name||'', desc:ft(a.desc||'') })),
      actions:              (m.actions||[]).map(a=>({ name:a.name||'', desc:ft(a.desc||''), attack_bonus:a.attack_bonus, damage:a.damage })),
      reactions:            (m.reactions||[]).map(a=>({ name:a.name||'', desc:ft(a.desc||'') })),
      legendary_desc:       ft(m.legendary_desc || ''),
      legendary_actions:    (m.legendary_actions||[]).map(a=>({ name:a.name||'', desc:ft(a.desc||'') })),
      _translated:          !!src && !!src._translated,
    });
  }
  return bundle;
}

// ── EN FEATS ──────────────────────────────────────────────────────────────────

function buildFeatsEN() {
  const dir = path.join(EN_DIR, 'dnd_feats');
  const files = listFiles(dir);
  if (!files.length) return [];
  const bundle = files
    .map(f => readJSON(path.join(dir, f)))
    .filter(Boolean);
  bundle.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return bundle;
}

function buildFeatsFR(enFeats) {
  const frDir = path.join(FR_DIR, 'dnd_feats');
  const enDir = path.join(EN_DIR, 'dnd_feats');
  const frFiles = new Set(listFiles(frDir));
  return enFeats.map(en => {
    const frFile = `${en.index}.json`;
    const src = frFiles.has(frFile) ? readJSON(path.join(frDir, frFile)) : null;
    return src || readJSON(path.join(enDir, `${en.index}.json`)) || en;
  }).filter(Boolean);
}

// ── EN SUBCLASSES ─────────────────────────────────────────────────────────────

function buildSubclassesEN() {
  const dir = path.join(EN_DIR, 'dnd_subclasses');
  const files = listFiles(dir);
  if (!files.length) return [];
  const bundle = files.map(f => readJSON(path.join(dir, f))).filter(Boolean);
  bundle.sort((a, b) => (a.class||'').localeCompare(b.class||'', 'en') || a.name.localeCompare(b.name, 'en'));
  return bundle;
}

function buildSubclassesFR(enSubclasses) {
  const frDir = path.join(FR_DIR, 'dnd_subclasses');
  const enDir = path.join(EN_DIR, 'dnd_subclasses');
  const frFiles = new Set(listFiles(frDir));
  return enSubclasses.map(en => {
    const fileBase = en.index ? `${en.index}.json` : null;
    if (!fileBase) return en;
    const src = frFiles.has(fileBase) ? readJSON(path.join(frDir, fileBase)) : null;
    return src || readJSON(path.join(enDir, fileBase)) || en;
  }).filter(Boolean);
}

// ── EN CLASSES ────────────────────────────────────────────────────────────────

function buildClassesEN() {
  const dir = path.join(EN_DIR, 'dnd_classes');
  const files = listFiles(dir);
  if (!files.length) return [];
  const bundle = files.map(f => readJSON(path.join(dir, f))).filter(Boolean);
  bundle.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return bundle;
}

function buildClassesFR(enClasses) {
  const frDir = path.join(FR_DIR, 'dnd_classes');
  const enDir = path.join(EN_DIR, 'dnd_classes');
  const frFiles = new Set(listFiles(frDir));
  return enClasses.map(en => {
    const frFile = `${en.index}.json`;
    const src = frFiles.has(frFile) ? readJSON(path.join(frDir, frFile)) : null;
    return src || readJSON(path.join(enDir, `${en.index}.json`)) || en;
  }).filter(Boolean);
}

// ── EN RACES ──────────────────────────────────────────────────────────────────

function buildRacesEN() {
  const dir = path.join(EN_DIR, 'dnd_races');
  const files = listFiles(dir);
  if (!files.length) return [];
  const bundle = files.map(f => readJSON(path.join(dir, f))).filter(Boolean);
  bundle.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return bundle;
}

function buildRacesFR(enRaces) {
  const frDir = path.join(FR_DIR, 'dnd_races');
  const enDir = path.join(EN_DIR, 'dnd_races');
  const frFiles = new Set(listFiles(frDir));
  return enRaces.map(en => {
    const frFile = `${en.index}.json`;
    const src = frFiles.has(frFile) ? readJSON(path.join(frDir, frFile)) : null;
    return src || readJSON(path.join(enDir, `${en.index}.json`)) || en;
  }).filter(Boolean);
}

// ── EN BACKGROUNDS ────────────────────────────────────────────────────────────

function buildBackgroundsEN() {
  const dir = path.join(EN_DIR, 'dnd_backgrounds');
  const files = listFiles(dir);
  if (!files.length) return [];
  const bundle = files.map(f => readJSON(path.join(dir, f))).filter(Boolean);
  bundle.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return bundle;
}

function buildBackgroundsFR(enBgs) {
  const frDir = path.join(FR_DIR, 'dnd_backgrounds');
  const enDir = path.join(EN_DIR, 'dnd_backgrounds');
  const frFiles = new Set(listFiles(frDir));
  return enBgs.map(en => {
    const frFile = `${en.index}.json`;
    const src = frFiles.has(frFile) ? readJSON(path.join(frDir, frFile)) : null;
    return src || readJSON(path.join(enDir, `${en.index}.json`)) || en;
  }).filter(Boolean);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Rebuild Bundles (ft → m)            ║');
  console.log('╚══════════════════════════════════════╝\n');

  // EN Spells
  process.stdout.write('📖 Building EN spells bundle... ');
  const enSpells = buildSpellsEN();
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_spells_en.js'),
    `/* D&D 5e Spells — English — ${enSpells.length} spells, ft→m converted */\nwindow.DND_SPELLS_EN=${JSON.stringify(enSpells)};`
  );
  console.log(`${enSpells.length} sorts ✓`);

  // EN Monsters
  process.stdout.write('🐉 Building EN monsters bundle... ');
  const enMonsters = buildMonstersEN();
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_monsters_en.js'),
    `/* D&D 5e Monsters — English — ${enMonsters.length} monsters, ft→m converted */\nwindow.DND_MONSTERS_EN=${JSON.stringify(enMonsters)};`
  );
  console.log(`${enMonsters.length} monstres ✓`);

  // EN Feats
  process.stdout.write('⭐ Building EN feats bundle... ');
  const enFeats = buildFeatsEN();
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_feats_en.js'),
    `/* D&D 5e Feats — English — ${enFeats.length} feats */\nwindow.DND_FEATS_EN=${JSON.stringify(enFeats)};`
  );
  console.log(`${enFeats.length} dons ✓`);

  // EN Subclasses
  process.stdout.write('🎭 Building EN subclasses bundle... ');
  const enSubclasses = buildSubclassesEN();
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_subclasses_en.js'),
    `/* D&D 5e Subclasses — English — ${enSubclasses.length} subclasses */\nwindow.DND_SUBCLASSES_EN=${JSON.stringify(enSubclasses)};`
  );
  console.log(`${enSubclasses.length} sous-classes ✓`);

  // EN Classes
  process.stdout.write('🛡️  Building EN classes bundle... ');
  const enClasses = buildClassesEN();
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_classes_en.js'),
    `/* D&D 5e Classes — English — ${enClasses.length} classes */\nwindow.DND_CLASSES_EN=${JSON.stringify(enClasses)};`
  );
  console.log(`${enClasses.length} classes ✓`);

  // EN Races
  process.stdout.write('🧝 Building EN races bundle... ');
  const enRaces = buildRacesEN();
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_races_en.js'),
    `/* D&D 5e Races — English — ${enRaces.length} races */\nwindow.DND_RACES_EN=${JSON.stringify(enRaces)};`
  );
  console.log(`${enRaces.length} races ✓`);

  // EN Backgrounds
  process.stdout.write('📜 Building EN backgrounds bundle... ');
  const enBgs = buildBackgroundsEN();
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_backgrounds_en.js'),
    `/* D&D 5e Backgrounds — English — ${enBgs.length} backgrounds */\nwindow.DND_BACKGROUNDS_EN=${JSON.stringify(enBgs)};`
  );
  console.log(`${enBgs.length} historiques ✓`);

  // FR Spells
  process.stdout.write('📖 Building FR spells bundle... ');
  const frSpells = buildSpellsFR(enSpells);
  const frSpellsTranslated = frSpells.filter(s => s._translated).length;
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_spells_fr.js'),
    `/* D&D 5e Spells — Français — ${frSpellsTranslated}/${frSpells.length} traduits */\nwindow.DND_SPELLS_FR=${JSON.stringify(frSpells)};`
  );
  console.log(`${frSpells.length} sorts (${frSpellsTranslated} traduits) ✓`);

  // FR Monsters
  process.stdout.write('🐉 Building FR monsters bundle... ');
  const frMonsters = buildMonstersFR(enMonsters);
  const frMonstersTranslated = frMonsters.filter(m => m._translated).length;
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_monsters_fr.js'),
    `/* D&D 5e Monsters — Français — ${frMonstersTranslated}/${frMonsters.length} traduits */\nwindow.DND_MONSTERS_FR=${JSON.stringify(frMonsters)};`
  );
  console.log(`${frMonsters.length} monstres (${frMonstersTranslated} traduits) ✓`);

  // FR Feats
  process.stdout.write('⭐ Building FR feats bundle... ');
  const frFeats = buildFeatsFR(enFeats);
  const frFeatsTranslated = frFeats.filter(f => f._translated).length;
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_feats_fr.js'),
    `/* D&D 5e Feats — Français — ${frFeatsTranslated}/${frFeats.length} traduits */\nwindow.DND_FEATS_FR=${JSON.stringify(frFeats)};`
  );
  console.log(`${frFeats.length} dons (${frFeatsTranslated} traduits) ✓`);

  // FR Subclasses
  process.stdout.write('🎭 Building FR subclasses bundle... ');
  const frSubclasses = buildSubclassesFR(enSubclasses);
  const frSubclassesTranslated = frSubclasses.filter(s => s._translated).length;
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_subclasses_fr.js'),
    `/* D&D 5e Subclasses — Français — ${frSubclassesTranslated}/${frSubclasses.length} traduits */\nwindow.DND_SUBCLASSES_FR=${JSON.stringify(frSubclasses)};`
  );
  console.log(`${frSubclasses.length} sous-classes (${frSubclassesTranslated} traduits) ✓`);

  // FR Classes
  process.stdout.write('🛡️  Building FR classes bundle... ');
  const frClasses = buildClassesFR(enClasses);
  const frClassesTranslated = frClasses.filter(c => c._translated).length;
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_classes_fr.js'),
    `/* D&D 5e Classes — Français — ${frClassesTranslated}/${frClasses.length} traduits */\nwindow.DND_CLASSES_FR=${JSON.stringify(frClasses)};`
  );
  console.log(`${frClasses.length} classes (${frClassesTranslated} traduits) ✓`);

  // FR Races
  process.stdout.write('🧝 Building FR races bundle... ');
  const frRaces = buildRacesFR(enRaces);
  const frRacesTranslated = frRaces.filter(r => r._translated).length;
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_races_fr.js'),
    `/* D&D 5e Races — Français — ${frRacesTranslated}/${frRaces.length} traduits */\nwindow.DND_RACES_FR=${JSON.stringify(frRaces)};`
  );
  console.log(`${frRaces.length} races (${frRacesTranslated} traduits) ✓`);

  // FR Backgrounds
  process.stdout.write('📜 Building FR backgrounds bundle... ');
  const frBgs = buildBackgroundsFR(enBgs);
  const frBgsTranslated = frBgs.filter(b => b._translated).length;
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_backgrounds_fr.js'),
    `/* D&D 5e Backgrounds — Français — ${frBgsTranslated}/${frBgs.length} traduits */\nwindow.DND_BACKGROUNDS_FR=${JSON.stringify(frBgs)};`
  );
  console.log(`${frBgs.length} historiques (${frBgsTranslated} traduits) ✓`);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Bundles mis à jour !                ║');
  console.log('║  (relancer après translate_fr.js)    ║');
  console.log('╚══════════════════════════════════════╝');
}

main();
