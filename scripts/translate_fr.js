#!/usr/bin/env node
// Translates D&D 5e data from English to French
// Reads from dnd_db/en/, writes to dnd_db/fr/ + builds FR bundles
// Run: node scripts/translate_fr.js
//
// Uses Google Translate unofficial endpoint (free, no key needed).
// Descriptions are translated in chunks to stay under URL limits.
// Progress is saved after each item so you can safely interrupt + resume.

const fs   = require('fs');
const path = require('path');
const https = require('https');
const { ft, ftSpeed, ftSenses } = require('./units');

const ROOT   = path.join(__dirname, '..');
const EN_DIR = path.join(ROOT, 'dnd_db', 'en');
const FR_DIR = path.join(ROOT, 'dnd_db', 'fr');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── D&D SPECIFIC DICTIONARIES ────────────────────────────────────────────────

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
  'aberration':    'aberration',
  'beast':         'bête',
  'celestial':     'céleste',
  'construct':     'artificiel',
  'dragon':        'dragon',
  'elemental':     'élémentaire',
  'fey':           'fée',
  'fiend':         'fiélon',
  'giant':         'géant',
  'humanoid':      'humanoïde',
  'monstrosity':   'monstruosité',
  'ooze':          'vase',
  'plant':         'plante',
  'undead':        'mort-vivant',
  'swarm of Tiny beasts': 'nuée de bêtes Très petites',
};

const ALIGN_MAP = {
  'any alignment':                  'tout alignement',
  'any chaotic alignment':          'tout alignement chaotique',
  'any evil alignment':             'tout alignement mauvais',
  'any good alignment':             'tout alignement bon',
  'any lawful alignment':           'tout alignement loyal',
  'any non-good alignment':         'tout alignement non bon',
  'any neutral alignment':          'tout alignement neutre',
  'chaotic evil':                   'chaotique mauvais',
  'chaotic good':                   'chaotique bon',
  'chaotic neutral':                'chaotique neutre',
  'lawful evil':                    'loyal mauvais',
  'lawful good':                    'loyal bon',
  'lawful neutral':                 'loyal neutre',
  'neutral':                        'neutre',
  'neutral evil':                   'neutre mauvais',
  'neutral good':                   'neutre bon',
  'true neutral':                   'vrai neutre',
  'unaligned':                      'sans alignement',
};

// ── GOOGLE TRANSLATE ──────────────────────────────────────────────────────────

function gtranslate(text) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) { resolve(text); return; }
    const q = encodeURIComponent(text.slice(0, 4800)); // stay under limit
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${q}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const translated = json[0].map(c => c[0]).join('');
          resolve(translated);
        } catch(e) {
          resolve(text); // fallback to original
        }
      });
    }).on('error', () => resolve(text));
  });
}

// Split long text into ≤4800-char chunks at paragraph boundaries
function chunkText(text, max = 4500) {
  if (!text || text.length <= max) return [text];
  const paras = text.split('\n');
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if (cur.length + p.length + 1 > max) {
      if (cur) chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n${p}` : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function translateLong(text, delayMs = 400) {
  if (!text) return text;
  const chunks = chunkText(text);
  const results = [];
  for (const chunk of chunks) {
    results.push(await gtranslate(chunk));
    if (chunks.length > 1) await sleep(delayMs);
  }
  return results.join('\n');
}

// ── SPELLS ───────────────────────────────────────────────────────────────────

async function translateSpells() {
  const enDir = path.join(EN_DIR, 'dnd_spells');
  const frDir = path.join(FR_DIR, 'dnd_spells');
  fs.mkdirSync(frDir, { recursive: true });

  const indexPath = path.join(enDir, '_index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ dnd_db/en/dnd_spells/_index.json not found – run fetch_all.js first');
    return [];
  }

  const index = JSON.parse(fs.readFileSync(indexPath));
  const results = index.results;
  console.log(`📖 Traduction de ${results.length} sorts...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const frPath = path.join(frDir, `${item.index}.json`);

    // Resume: skip already translated
    if (fs.existsSync(frPath)) {
      const existing = JSON.parse(fs.readFileSync(frPath));
      bundle.push(existing);
      skipped++;
      process.stdout.write(`\r  ⏭  ${i+1}/${results.length}  (${skipped} ignorés)  ${item.index.padEnd(40)}`);
      continue;
    }

    const enPath = path.join(enDir, `${item.index}.json`);
    if (!fs.existsSync(enPath)) {
      console.error(`\n  ⚠ Not found: ${enPath}`);
      continue;
    }

    const en = JSON.parse(fs.readFileSync(enPath));
    process.stdout.write(`\r  🔄 ${i+1}/${results.length}  ${item.index.padEnd(40)}`);

    try {
      // Convert feet → metres BEFORE translating (avoids "30 pieds" in output)
      const enDesc = ft((en.desc || []).join('\n'));
      const enHL   = ft((en.higher_level || []).join('\n'));

      const descChunks  = await translateLong(enDesc);
      await sleep(300);
      const hlChunks    = enHL ? await translateLong(enHL) : '';
      await sleep(300);

      const frName        = await gtranslate(en.name);
      await sleep(150);
      const frCastingTime = await gtranslate(ft(en.casting_time || ''));
      await sleep(150);
      const frRange    = await gtranslate(ft(en.range || ''));
      await sleep(150);
      const frDuration = await gtranslate(ft(en.duration || ''));
      await sleep(150);
      const frMaterial = en.material ? await gtranslate(ft(en.material)) : '';

      const fr = {
        ...en,
        name:         frName,
        name_en:      en.name,
        school:       { ...en.school, name_fr: SCHOOL_MAP[en.school?.name] || en.school?.name },
        desc:         [descChunks],
        higher_level: hlChunks ? [hlChunks] : [],
        casting_time: frCastingTime,
        range:        frRange,
        duration:     frDuration,
        material:     frMaterial,
        _translated: true,
      };

      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(500);
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
      // Save EN as fallback
      const fallback = { ...en, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  // Build FR bundle (all data already translated and saved per-file)
  const bundleData = bundle.map(s => {
    // name_en: stored during translation, or read from EN file
    const nameEn = s.name_en || s.name;
    return {
      index:         s.index,
      name:          s.name,
      name_en:       nameEn,
      level:         s.level,
      school:        SCHOOL_MAP[s.school?.name] || s.school?.name_fr || s.school?.name || '',
      casting_time:  s.casting_time || '',
      range:         s.range || '',
      duration:      s.duration || '',
      concentration: !!s.concentration,
      ritual:        !!s.ritual,
      components:    s.components || [],
      material:      s.material || '',
      classes:       (s.classes || []).map(c => c.name),
      desc:          Array.isArray(s.desc) ? s.desc.join('\n') : (s.desc || ''),
      higher_level:  Array.isArray(s.higher_level) ? s.higher_level.join('\n') : (s.higher_level || ''),
      attack_type:   s.attack_type || '',
      damage:        s.damage ? {
        damage_type: s.damage.damage_type?.name || '',
        damage_at_slot_level: s.damage.damage_at_slot_level || {},
        damage_at_character_level: s.damage.damage_at_character_level || {},
      } : null,
    };
  });

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_spells_fr.js'),
    `/* D&D 5e Spells — Français — generated by scripts/translate_fr.js */\nwindow.DND_SPELLS_FR=${JSON.stringify(bundleData)};`
  );
  console.log('  📦 dnd_db/bundle_spells_fr.js');
  return bundleData;
}

// ── MONSTERS ─────────────────────────────────────────────────────────────────

async function translateMonsters() {
  const enDir = path.join(EN_DIR, 'dnd_monsters');
  const frDir = path.join(FR_DIR, 'dnd_monsters');
  fs.mkdirSync(frDir, { recursive: true });

  const indexPath = path.join(enDir, '_index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ dnd_db/en/dnd_monsters/_index.json not found – run fetch_all.js first');
    return [];
  }

  const index  = JSON.parse(fs.readFileSync(indexPath));
  const results = index.results;
  console.log(`🐉 Traduction de ${results.length} monstres...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < results.length; i++) {
    const item    = results[i];
    const frPath  = path.join(frDir, `${item.index}.json`);

    if (fs.existsSync(frPath)) {
      const existing = JSON.parse(fs.readFileSync(frPath));
      bundle.push(existing);
      skipped++;
      process.stdout.write(`\r  ⏭  ${i+1}/${results.length}  (${skipped} ignorés)  ${item.index.padEnd(40)}`);
      continue;
    }

    const enPath = path.join(enDir, `${item.index}.json`);
    if (!fs.existsSync(enPath)) {
      console.error(`\n  ⚠ Not found: ${enPath}`);
      continue;
    }

    const en = JSON.parse(fs.readFileSync(enPath));
    process.stdout.write(`\r  🔄 ${i+1}/${results.length}  ${item.index.padEnd(40)}`);

    try {
      const frName  = await gtranslate(en.name);
      await sleep(250);
      const frType  = TYPE_MAP[en.type?.toLowerCase()] || await gtranslate(en.type || '');
      await sleep(200);

      // Translate special_abilities descriptions (convert ft → m first)
      const frAbilities = [];
      for (const a of (en.special_abilities || [])) {
        const desc = await translateLong(ft(a.desc || ''));
        frAbilities.push({ name: await gtranslate(a.name || ''), desc });
        await sleep(300);
      }

      // Translate actions
      const frActions = [];
      for (const a of (en.actions || [])) {
        const desc = await translateLong(ft(a.desc || ''));
        frActions.push({ ...a, name: await gtranslate(a.name || ''), desc });
        await sleep(300);
      }

      // Translate reactions
      const frReactions = [];
      for (const a of (en.reactions || [])) {
        const desc = await translateLong(ft(a.desc || ''));
        frReactions.push({ name: await gtranslate(a.name || ''), desc });
        await sleep(250);
      }

      // Translate legendary
      const frLegendary = [];
      for (const a of (en.legendary_actions || [])) {
        const desc = await translateLong(ft(a.desc || ''));
        frLegendary.push({ name: await gtranslate(a.name || ''), desc });
        await sleep(250);
      }

      const frLegendaryDesc = en.legendary_desc
        ? await translateLong(ft(en.legendary_desc))
        : '';

      const ac = Array.isArray(en.armor_class)
        ? (en.armor_class[0]?.value ?? 10)
        : (en.armor_class ?? 10);

      const fr = {
        ...en,
        name:              frName,
        name_en:           en.name,
        size:              SIZE_MAP[en.size] || en.size,
        size_en:           en.size,
        type:              frType,
        type_en:           en.type,
        alignment:         ALIGN_MAP[en.alignment?.toLowerCase()] || en.alignment,
        armor_class:       ac,
        armor_desc:        Array.isArray(en.armor_class) ? (en.armor_class[0]?.desc || '') : '',
        speed:             ftSpeed(en.speed || {}),
        senses:            ftSenses(en.senses || {}),
        special_abilities: frAbilities,
        actions:           frActions,
        reactions:         frReactions,
        legendary_actions: frLegendary,
        legendary_desc:    frLegendaryDesc,
        _translated:       true,
      };

      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(500);
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
      const fallback = { ...en, name_en: en.name, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  // Build FR bundle
  const bundleData = bundle.map(m => {
    const ac = typeof m.armor_class === 'number' ? m.armor_class
      : Array.isArray(m.armor_class) ? (m.armor_class[0]?.value ?? 10) : 10;
    return {
      index:                m.index,
      name:                 m.name,
      name_en:              m.name_en || m.name,
      size:                 m.size || '',
      type:                 m.type || '',
      subtype:              m.subtype || '',
      alignment:            m.alignment || '',
      armor_class:          ac,
      armor_desc:           m.armor_desc || '',
      hit_points:           m.hit_points || 0,
      hit_dice:             m.hit_dice || '',
      speed:                m.speed || {},
      strength:             m.strength || 10,
      dexterity:            m.dexterity || 10,
      constitution:         m.constitution || 10,
      intelligence:         m.intelligence || 10,
      wisdom:               m.wisdom || 10,
      charisma:             m.charisma || 10,
      proficiencies:        (m.proficiencies || []).map(p => ({ value: p.value, name: p.proficiency?.name || p.name || '' })),
      damage_vulnerabilities: m.damage_vulnerabilities || [],
      damage_resistances:   m.damage_resistances || [],
      damage_immunities:    m.damage_immunities || [],
      condition_immunities: (m.condition_immunities || []).map(c => c.name || c),
      senses:               m.senses || {},
      languages:            m.languages || '',
      challenge_rating:     m.challenge_rating ?? 0,
      xp:                   m.xp || 0,
      proficiency_bonus:    m.proficiency_bonus || 2,
      special_abilities:    m.special_abilities || [],
      actions:              m.actions || [],
      reactions:            m.reactions || [],
      legendary_desc:       m.legendary_desc || '',
      legendary_actions:    m.legendary_actions || [],
    };
  });

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_monsters_fr.js'),
    `/* D&D 5e Monsters — Français — generated by scripts/translate_fr.js */\nwindow.DND_MONSTERS_FR=${JSON.stringify(bundleData)};`
  );
  console.log('  📦 dnd_db/bundle_monsters_fr.js');
  return bundleData;
}

// ── D&D CLASS/RACE/FEAT DICTIONARIES ─────────────────────────────────────────

const CLASS_MAP = {
  'Barbarian': 'Barbare', 'Bard': 'Barde', 'Cleric': 'Clerc',
  'Druid': 'Druide', 'Fighter': 'Guerrier', 'Monk': 'Moine',
  'Paladin': 'Paladin', 'Ranger': 'Rôdeur', 'Rogue': 'Roublard',
  'Sorcerer': 'Ensorceleur', 'Warlock': 'Occultiste', 'Wizard': 'Magicien',
};

const RACE_MAP = {
  'Dragonborn': 'Draconide', 'Dwarf': 'Nain', 'Elf': 'Elfe',
  'Gnome': 'Gnome', 'Half-Elf': 'Demi-Elfe', 'Half-Orc': 'Demi-Orc',
  'Halfling': 'Halfelin', 'Human': 'Humain', 'Tiefling': 'Tieffelin',
  'Hill Dwarf': 'Nain des collines', 'Mountain Dwarf': 'Nain des montagnes',
  'High Elf': 'Haut-Elfe', 'Wood Elf': 'Elfe des bois', 'Dark Elf': 'Elfe noir',
  'Drow': 'Drow', 'Forest Gnome': 'Gnome des forêts', 'Rock Gnome': 'Gnome des rochers',
  'Lightfoot Halfling': 'Halfelin pieds-légers', 'Stout Halfling': 'Halfelin robuste',
};

/** Translate a list of string items */
async function translateList(items, delayMs = 300) {
  const result = [];
  for (const item of (items || [])) {
    result.push(await gtranslate(item));
    await sleep(delayMs);
  }
  return result;
}

// ── FEATS ────────────────────────────────────────────────────────────────────

async function translateFeats() {
  const enDir = path.join(EN_DIR, 'dnd_feats');
  const frDir = path.join(FR_DIR, 'dnd_feats');
  if (!fs.existsSync(enDir)) { console.log('⏭  dnd_feats: pas de données EN (lancer scrape_wikidot.js)'); return []; }
  fs.mkdirSync(frDir, { recursive: true });

  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`⭐ Traduction de ${files.length} dons...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const frPath = path.join(frDir, files[i]);
    if (fs.existsSync(frPath)) {
      const existing = JSON.parse(fs.readFileSync(frPath));
      bundle.push(existing);
      skipped++;
      process.stdout.write(`\r  ⏭  ${i+1}/${files.length}  (${skipped} skipped)  ${files[i].replace('.json','').padEnd(35)}`);
      continue;
    }

    const en = JSON.parse(fs.readFileSync(path.join(enDir, files[i])));
    process.stdout.write(`\r  🔄 ${i+1}/${files.length}  ${en.index.padEnd(35)}`);

    try {
      const frName = await gtranslate(en.name);
      await sleep(250);
      const frDesc = en.desc ? await translateLong(en.desc) : '';
      await sleep(250);
      const frBenefits = await translateList(en.benefits);
      const frPrereq = en.prerequisite ? await gtranslate(en.prerequisite) : null;

      const fr = { ...en, name: frName, name_en: en.name, desc: frDesc, benefits: frBenefits, prerequisite: frPrereq, _translated: true };
      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(400);
    } catch(e) {
      console.error(`\n  ⚠ ${en.index}: ${e.message}`);
      const fallback = { ...en, name_en: en.name, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  bundle.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_feats_fr.js'),
    `/* D&D 5e Feats — Français — generated by scripts/translate_fr.js */\nwindow.DND_FEATS_FR=${JSON.stringify(bundle)};`
  );
  console.log('  📦 dnd_db/bundle_feats_fr.js');
  return bundle;
}

// ── FEATURES ─────────────────────────────────────────────────────────────────

async function translateFeatures() {
  const enDir = path.join(EN_DIR, 'dnd_features');
  const frDir = path.join(FR_DIR, 'dnd_features');
  if (!fs.existsSync(enDir)) { console.log('⏭  dnd_features: pas de données EN'); return []; }
  fs.mkdirSync(frDir, { recursive: true });

  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`⚔️  Traduction de ${files.length} capacités de classe...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const frPath = path.join(frDir, files[i]);
    if (fs.existsSync(frPath)) {
      const existing = JSON.parse(fs.readFileSync(frPath));
      bundle.push(existing);
      skipped++;
      process.stdout.write(`\r  ⏭  ${i+1}/${files.length}  (${skipped} sk)  ${files[i].replace('.json','').padEnd(45)}`);
      continue;
    }

    const en = JSON.parse(fs.readFileSync(path.join(enDir, files[i])));
    process.stdout.write(`\r  🔄 ${i+1}/${files.length}  ${(en.index||'').padEnd(45)}`);

    try {
      const frName = await gtranslate(en.name || '');
      await sleep(200);
      const frDescs = [];
      for (const d of (en.desc || [])) {
        frDescs.push(await translateLong(d));
        await sleep(200);
      }
      const className = en.class?.name || '';
      const fr = { ...en, name: frName, name_en: en.name, desc: frDescs, class_name_fr: CLASS_MAP[className] || className, _translated: true };
      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(300);
    } catch(e) {
      console.error(`\n  ⚠ ${en.index}: ${e.message}`);
      const fallback = { ...en, name_en: en.name, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_features_fr.js'),
    `/* D&D 5e Features — Français — generated by scripts/translate_fr.js */\nwindow.DND_FEATURES_FR=${JSON.stringify(bundle)};`
  );
  console.log('  📦 dnd_db/bundle_features_fr.js');
  return bundle;
}

// ── CLASSES ───────────────────────────────────────────────────────────────────

async function translateClasses() {
  const enDir = path.join(EN_DIR, 'dnd_classes');
  const frDir = path.join(FR_DIR, 'dnd_classes');
  if (!fs.existsSync(enDir)) { console.log('⏭  dnd_classes: pas de données EN'); return []; }
  fs.mkdirSync(frDir, { recursive: true });

  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`🛡️  Traduction de ${files.length} classes...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const frPath = path.join(frDir, files[i]);
    if (fs.existsSync(frPath)) {
      bundle.push(JSON.parse(fs.readFileSync(frPath)));
      skipped++;
      continue;
    }

    const en = JSON.parse(fs.readFileSync(path.join(enDir, files[i])));
    process.stdout.write(`\r  🔄 ${i+1}/${files.length}  ${en.index.padEnd(20)}`);

    try {
      const frName = CLASS_MAP[en.name] || await gtranslate(en.name);
      await sleep(200);
      const frDesc = en.desc ? await translateLong(en.desc) : '';

      const fr = { ...en, name: frName, name_en: en.name, desc: frDesc, _translated: true };
      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(300);
    } catch(e) {
      console.error(`\n  ⚠ ${en.index}: ${e.message}`);
      const fallback = { ...en, name_en: en.name, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_classes_fr.js'),
    `/* D&D 5e Classes — Français — generated by scripts/translate_fr.js */\nwindow.DND_CLASSES_FR=${JSON.stringify(bundle)};`
  );
  console.log('  📦 dnd_db/bundle_classes_fr.js');
  return bundle;
}

// ── SUBCLASSES ────────────────────────────────────────────────────────────────

async function translateSubclasses() {
  const enDir = path.join(EN_DIR, 'dnd_subclasses');
  const frDir = path.join(FR_DIR, 'dnd_subclasses');
  if (!fs.existsSync(enDir)) { console.log('⏭  dnd_subclasses: pas de données EN'); return []; }
  fs.mkdirSync(frDir, { recursive: true });

  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`🎭 Traduction de ${files.length} sous-classes...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const frPath = path.join(frDir, files[i]);
    if (fs.existsSync(frPath)) {
      bundle.push(JSON.parse(fs.readFileSync(frPath)));
      skipped++;
      continue;
    }

    const en = JSON.parse(fs.readFileSync(path.join(enDir, files[i])));
    process.stdout.write(`\r  🔄 ${i+1}/${files.length}  ${(en.index||files[i]).padEnd(40)}`);

    try {
      const frName = await gtranslate(en.name || '');
      await sleep(200);
      const frDesc = en.desc ? await translateLong(en.desc) : '';
      await sleep(200);
      const frFeatures = [];
      for (const feat of (en.features || [])) {
        const frFeatName = await gtranslate(feat.name || '');
        await sleep(150);
        const frFeatDesc = feat.desc ? await translateLong(feat.desc) : '';
        frFeatures.push({ ...feat, name: frFeatName, desc: frFeatDesc });
        await sleep(200);
      }

      const className = en.class || '';
      const fr = { ...en, name: frName, name_en: en.name, desc: frDesc, features: frFeatures, class_name_fr: CLASS_MAP[className] || className, _translated: true };
      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(400);
    } catch(e) {
      console.error(`\n  ⚠ ${en.index}: ${e.message}`);
      const fallback = { ...en, name_en: en.name, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_subclasses_fr.js'),
    `/* D&D 5e Subclasses — Français — generated by scripts/translate_fr.js */\nwindow.DND_SUBCLASSES_FR=${JSON.stringify(bundle)};`
  );
  console.log('  📦 dnd_db/bundle_subclasses_fr.js');
  return bundle;
}

// ── RACES ─────────────────────────────────────────────────────────────────────

async function translateRaces() {
  const enDir = path.join(EN_DIR, 'dnd_races');
  const frDir = path.join(FR_DIR, 'dnd_races');
  if (!fs.existsSync(enDir)) { console.log('⏭  dnd_races: pas de données EN'); return []; }
  fs.mkdirSync(frDir, { recursive: true });

  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`🧝 Traduction de ${files.length} races...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const frPath = path.join(frDir, files[i]);
    if (fs.existsSync(frPath)) {
      bundle.push(JSON.parse(fs.readFileSync(frPath)));
      skipped++;
      continue;
    }

    const en = JSON.parse(fs.readFileSync(path.join(enDir, files[i])));
    process.stdout.write(`\r  🔄 ${i+1}/${files.length}  ${en.index.padEnd(25)}`);

    try {
      const frName = RACE_MAP[en.name] || await gtranslate(en.name);
      await sleep(200);
      const frDesc = en.desc ? await translateLong(en.desc) : '';
      await sleep(200);
      const frTraits = [];
      for (const t of (en.traits || [])) {
        const frTName = await gtranslate(t.name || '');
        await sleep(150);
        const frTDesc = t.desc ? await translateLong(t.desc) : '';
        frTraits.push({ ...t, name: frTName, desc: frTDesc });
        await sleep(200);
      }

      const fr = { ...en, name: frName, name_en: en.name, desc: frDesc, traits: frTraits, _translated: true };
      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(400);
    } catch(e) {
      console.error(`\n  ⚠ ${en.index}: ${e.message}`);
      const fallback = { ...en, name_en: en.name, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_races_fr.js'),
    `/* D&D 5e Races — Français — generated by scripts/translate_fr.js */\nwindow.DND_RACES_FR=${JSON.stringify(bundle)};`
  );
  console.log('  📦 dnd_db/bundle_races_fr.js');
  return bundle;
}

// ── BACKGROUNDS ───────────────────────────────────────────────────────────────

async function translateBackgrounds() {
  const enDir = path.join(EN_DIR, 'dnd_backgrounds');
  const frDir = path.join(FR_DIR, 'dnd_backgrounds');
  if (!fs.existsSync(enDir)) { console.log('⏭  dnd_backgrounds: pas de données EN'); return []; }
  fs.mkdirSync(frDir, { recursive: true });

  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`📜 Traduction de ${files.length} historiques...`);

  const bundle = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const frPath = path.join(frDir, files[i]);
    if (fs.existsSync(frPath)) {
      bundle.push(JSON.parse(fs.readFileSync(frPath)));
      skipped++;
      continue;
    }

    const en = JSON.parse(fs.readFileSync(path.join(enDir, files[i])));
    process.stdout.write(`\r  🔄 ${i+1}/${files.length}  ${en.index.padEnd(30)}`);

    try {
      const frName = await gtranslate(en.name || '');
      await sleep(200);
      const frDesc = en.desc ? await translateLong(en.desc) : '';
      await sleep(200);
      const frSkillProf = en.skill_proficiencies ? await translateList(en.skill_proficiencies) : [];
      const frFeature = en.feature ? {
        name: await gtranslate(en.feature.name || ''),
        desc: en.feature.desc ? await translateLong(en.feature.desc) : '',
      } : null;

      const fr = { ...en, name: frName, name_en: en.name, desc: frDesc, skill_proficiencies: frSkillProf, feature: frFeature, _translated: true };
      fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
      bundle.push(fr);
      done++;
      await sleep(400);
    } catch(e) {
      console.error(`\n  ⚠ ${en.index}: ${e.message}`);
      const fallback = { ...en, name_en: en.name, _translated: false };
      fs.writeFileSync(frPath, JSON.stringify(fallback, null, 2));
      bundle.push(fallback);
    }
  }

  console.log(`\n  ✅ ${done} traduits, ${skipped} déjà existants`);

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_backgrounds_fr.js'),
    `/* D&D 5e Backgrounds — Français — generated by scripts/translate_fr.js */\nwindow.DND_BACKGROUNDS_FR=${JSON.stringify(bundle)};`
  );
  console.log('  📦 dnd_db/bundle_backgrounds_fr.js');
  return bundle;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  D&D 5e Traducteur EN → FR             ║');
  console.log('║  (interruptible, reprend où ça s\'arrête)║');
  console.log('╚════════════════════════════════════════╝\n');

  await translateSpells();
  console.log();
  await translateMonsters();
  console.log();
  await translateFeats();
  console.log();
  await translateClasses();
  console.log();
  await translateSubclasses();
  console.log();
  await translateRaces();
  console.log();
  await translateBackgrounds();
  console.log();
  await translateFeatures();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Terminé !                             ║');
  console.log('║  Fichiers créés :                      ║');
  console.log('║   dnd_db/bundle_spells_fr.js           ║');
  console.log('║   dnd_db/bundle_monsters_fr.js         ║');
  console.log('║   dnd_db/bundle_feats_fr.js            ║');
  console.log('║   dnd_db/bundle_classes_fr.js          ║');
  console.log('║   dnd_db/bundle_subclasses_fr.js       ║');
  console.log('║   dnd_db/bundle_races_fr.js            ║');
  console.log('║   dnd_db/bundle_backgrounds_fr.js      ║');
  console.log('║   dnd_db/bundle_features_fr.js         ║');
  console.log('╚════════════════════════════════════════╝');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
