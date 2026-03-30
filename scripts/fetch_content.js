#!/usr/bin/env node
// Fetches D&D 5e classes, subclasses, races, features, traits, and backgrounds
// from dnd5eapi.co and saves to dnd_db/en/
// Also builds browser bundles (window.DND_CLASSES_EN, window.DND_RACES_EN, window.DND_FEATS_EN)
// Run: node scripts/fetch_content.js
//
// Fully resumable — individual JSON files are saved as they arrive.
// If interrupted, re-run and already-saved files are skipped automatically.

const fs   = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://www.dnd5eapi.co';
const API  = `${BASE}/api/2014`;
const ROOT = path.join(__dirname, '..');
const EN   = path.join(ROOT, 'dnd_db', 'en');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── HTTP helper (same pattern as existing scripts) ───────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 dnd_app/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

// ── File helpers ─────────────────────────────────────────────────────────────

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  } catch { return []; }
}

// ── FEATURES ─────────────────────────────────────────────────────────────────
// Fetched first — referenced by classes and subclasses

async function fetchFeatures() {
  const dir = path.join(EN, 'dnd_features');
  fs.mkdirSync(dir, { recursive: true });

  process.stdout.write('⚔️  Feature index... ');
  const index = await httpsGet(`${API}/features`);
  saveJSON(path.join(dir, '_index.json'), index);
  console.log(`${index.count} features`);

  let done = 0, skipped = 0;
  for (let i = 0; i < index.results.length; i++) {
    const item = index.results[i];
    const filePath = path.join(dir, `${item.index}.json`);

    // Resume: skip already saved
    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(3)}/${index.results.length}  (${skipped} skipped)  ${item.index.padEnd(45)}`);
      continue;
    }

    process.stdout.write(`\r  ⚔️  ${String(i+1).padStart(3)}/${index.results.length}  ${item.index.padEnd(45)}`);
    try {
      const f = await httpsGet(`${BASE}${item.url}`);

      // Flatten to our target schema
      const out = {
        index:    f.index,
        name:     f.name,
        level:    f.level || null,
        class:    f.class?.index || null,
        subclass: f.subclass?.index || null,
        desc:     (f.desc || []).join('\n'),
      };

      saveJSON(filePath, out);
      done++;
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
    }
    if (i % 25 === 24) await sleep(300);
  }
  console.log(`\n  ✅ ${done} features saved (${skipped} already existed)`);
}

// ── TRAITS ────────────────────────────────────────────────────────────────────

async function fetchTraits() {
  const dir = path.join(EN, 'dnd_traits');
  fs.mkdirSync(dir, { recursive: true });

  process.stdout.write('🌿 Trait index... ');
  const index = await httpsGet(`${API}/traits`);
  saveJSON(path.join(dir, '_index.json'), index);
  console.log(`${index.count} traits`);

  let done = 0, skipped = 0;
  for (let i = 0; i < index.results.length; i++) {
    const item = index.results[i];
    const filePath = path.join(dir, `${item.index}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(3)}/${index.results.length}  (${skipped} skipped)  ${item.index.padEnd(45)}`);
      continue;
    }

    process.stdout.write(`\r  🌿 ${String(i+1).padStart(3)}/${index.results.length}  ${item.index.padEnd(45)}`);
    try {
      const t = await httpsGet(`${BASE}${item.url}`);

      const out = {
        index:    t.index,
        name:     t.name,
        races:    (t.races    || []).map(r => r.index),
        subraces: (t.subraces || []).map(s => s.index),
        desc:     (t.desc     || []).join('\n'),
      };

      saveJSON(filePath, out);
      done++;
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
    }
    if (i % 25 === 24) await sleep(300);
  }
  console.log(`\n  ✅ ${done} traits saved (${skipped} already existed)`);
}

// ── SUBCLASSES ────────────────────────────────────────────────────────────────

async function fetchSubclasses() {
  const dir = path.join(EN, 'dnd_subclasses');
  fs.mkdirSync(dir, { recursive: true });

  process.stdout.write('🎭 Subclass index... ');
  const index = await httpsGet(`${API}/subclasses`);
  saveJSON(path.join(dir, '_index.json'), index);
  console.log(`${index.count} subclasses`);

  let done = 0, skipped = 0;
  for (let i = 0; i < index.results.length; i++) {
    const item = index.results[i];
    const filePath = path.join(dir, `${item.index}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(3)}/${index.results.length}  (${skipped} skipped)  ${item.index.padEnd(45)}`);
      continue;
    }

    process.stdout.write(`\r  🎭 ${String(i+1).padStart(3)}/${index.results.length}  ${item.index.padEnd(45)}`);
    try {
      const sc = await httpsGet(`${BASE}${item.url}`);

      // Fetch subclass levels to gather feature_indices
      let featureIndices = [];
      try {
        const levelsData = await httpsGet(`${BASE}${item.url}/levels`);
        const levels = Array.isArray(levelsData) ? levelsData : (levelsData.results || []);
        for (const lvl of levels) {
          for (const feat of (lvl.features || [])) {
            if (feat.index && !featureIndices.includes(feat.index)) {
              featureIndices.push(feat.index);
            }
          }
        }
      } catch { /* levels endpoint may not exist for SRD-only data */ }

      const out = {
        index:            sc.index,
        name:             sc.name,
        class:            sc.class?.index || null,
        subclass_flavor:  sc.subclass_flavor || '',
        desc:             (sc.desc || []).join('\n'),
        feature_indices:  featureIndices,
      };

      saveJSON(filePath, out);
      done++;
      await sleep(150); // extra pause — two requests per subclass
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
    }
    if (i % 25 === 24) await sleep(300);
  }
  console.log(`\n  ✅ ${done} subclasses saved (${skipped} already existed)`);
}

// ── CLASSES ───────────────────────────────────────────────────────────────────

async function fetchClasses() {
  const dir = path.join(EN, 'dnd_classes');
  fs.mkdirSync(dir, { recursive: true });

  process.stdout.write('🛡️  Class index... ');
  const index = await httpsGet(`${API}/classes`);
  saveJSON(path.join(dir, '_index.json'), index);
  console.log(`${index.count} classes`);

  const allClasses = [];
  let skipped = 0;

  for (let i = 0; i < index.results.length; i++) {
    const item = index.results[i];
    const filePath = path.join(dir, `${item.index}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      const existing = readJSON(filePath);
      if (existing) allClasses.push(existing);
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(2)}/${index.results.length}  (${skipped} skipped)  ${item.index.padEnd(20)}`);
      continue;
    }

    process.stdout.write(`\r  🛡️  ${String(i+1).padStart(2)}/${index.results.length}  ${item.index.padEnd(20)}`);
    try {
      const c = await httpsGet(`${BASE}${item.url}`);
      await sleep(200);

      // Fetch class levels for the level table
      let levels = [];
      try {
        const levelsData = await httpsGet(`${BASE}${item.url}/levels`);
        const rawLevels = Array.isArray(levelsData) ? levelsData : (levelsData.results || []);
        levels = rawLevels.map(lvl => ({
          level:          lvl.level,
          prof_bonus:     lvl.prof_bonus || 0,
          features:       (lvl.features || []).map(f => f.index),
          class_specific: lvl.class_specific || {},
        }));
      } catch { /* ignore if unavailable */ }
      await sleep(150);

      // Gather all feature indices across all levels
      const featureIndices = [];
      for (const lvl of levels) {
        for (const fi of lvl.features) {
          if (!featureIndices.includes(fi)) featureIndices.push(fi);
        }
      }

      // Proficiency choices: extract desc + option names
      const profChoices = (c.proficiency_choices || []).map(pc => ({
        desc:    pc.desc || '',
        choose:  pc.choose || 1,
        options: (pc.from?.options || []).map(o => o.item?.name || o.string || '').filter(Boolean),
      }));

      const out = {
        index:                c.index,
        name:                 c.name,
        hit_die:              c.hit_die || 0,
        proficiencies:        (c.proficiencies || []).map(p => p.name),
        saving_throws:        (c.saving_throws || []).map(st => st.name || st.index || ''),
        proficiency_choices:  profChoices,
        starting_equipment:   c.starting_equipment || [],
        subclasses:           (c.subclasses || []).map(sc => sc.index),
        levels:               levels,
        feature_indices:      featureIndices,
      };

      saveJSON(filePath, out);
      allClasses.push(out);
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
    }
    if (i % 25 === 24) await sleep(300);
  }
  console.log(`\n  ✅ ${allClasses.length} classes saved (${skipped} already existed)`);
  return allClasses;
}

// ── RACES + SUBRACES ──────────────────────────────────────────────────────────

async function fetchRaces() {
  const dir = path.join(EN, 'dnd_races');
  fs.mkdirSync(dir, { recursive: true });

  process.stdout.write('🧝 Race index... ');
  const index = await httpsGet(`${API}/races`);
  saveJSON(path.join(dir, '_index.json'), index);
  console.log(`${index.count} races`);

  const allRaces = [];
  let done = 0, skipped = 0;

  for (let i = 0; i < index.results.length; i++) {
    const item = index.results[i];
    const filePath = path.join(dir, `${item.index}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      const existing = readJSON(filePath);
      if (existing) allRaces.push(existing);
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(2)}/${index.results.length}  (${skipped} skipped)  ${item.index.padEnd(20)}`);
      continue;
    }

    process.stdout.write(`\r  🧝 ${String(i+1).padStart(2)}/${index.results.length}  ${item.index.padEnd(20)}`);
    try {
      const r = await httpsGet(`${BASE}${item.url}`);

      // Ability bonus options (for races like human with flexible bonuses)
      let abilityBonusOptions = null;
      if (r.ability_bonus_options) {
        abilityBonusOptions = {
          choose: r.ability_bonus_options.choose || 0,
          options: (r.ability_bonus_options.from?.options || []).map(o => ({
            ability: o.ability_score?.index?.toUpperCase() || '',
            bonus:   o.bonus || 0,
          })),
        };
      }

      const out = {
        index:                item.index,
        name:                 r.name,
        size:                 r.size || '',
        size_desc:            r.size_description || '',
        speed:                r.speed || 0,
        desc:                 '', // races have no top-level desc in the API
        ability_bonuses:      (r.ability_bonuses || []).map(ab => ({
          ability: ab.ability_score?.index?.toUpperCase() || '',
          bonus:   ab.bonus || 0,
        })),
        ability_bonus_options: abilityBonusOptions,
        age:                  r.age || '',
        alignment:            r.alignment || '',
        language_desc:        r.language_desc || '',
        trait_indices:        (r.traits || []).map(t => t.index),
        subraces:             (r.subraces || []).map(s => s.index),
      };

      saveJSON(filePath, out);
      allRaces.push(out);
      done++;
      await sleep(150);

      // Fetch and save each subrace
      for (const subRef of (r.subraces || [])) {
        const subPath = path.join(dir, `${subRef.index}.json`);
        if (fs.existsSync(subPath)) continue;

        process.stdout.write(`\r  🧝  → subrace: ${subRef.index.padEnd(35)}`);
        try {
          const sub = await httpsGet(`${BASE}${subRef.url}`);
          const subOut = {
            index:            sub.index,
            name:             sub.name,
            race:             item.index,
            desc:             sub.desc || '',
            ability_bonuses:  (sub.ability_bonuses || []).map(ab => ({
              ability: ab.ability_score?.index?.toUpperCase() || '',
              bonus:   ab.bonus || 0,
            })),
            trait_indices:    (sub.racial_traits || []).map(t => t.index),
          };
          saveJSON(subPath, subOut);
          await sleep(200);
        } catch(e) {
          console.error(`\n  ⚠ subrace ${subRef.index}: ${e.message}`);
        }
      }
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
    }
    if (i % 25 === 24) await sleep(300);
  }
  console.log(`\n  ✅ ${done} races saved (${skipped} already existed)`);
  return allRaces;
}

// ── BACKGROUNDS ───────────────────────────────────────────────────────────────

async function fetchBackgrounds() {
  const dir = path.join(EN, 'dnd_backgrounds');
  fs.mkdirSync(dir, { recursive: true });

  process.stdout.write('📜 Background index... ');
  const index = await httpsGet(`${API}/backgrounds`);
  saveJSON(path.join(dir, '_index.json'), index);
  console.log(`${index.count} backgrounds`);

  let done = 0, skipped = 0;
  for (let i = 0; i < index.results.length; i++) {
    const item = index.results[i];
    const filePath = path.join(dir, `${item.index}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(2)}/${index.results.length}  (${skipped} skipped)  ${item.index.padEnd(25)}`);
      continue;
    }

    process.stdout.write(`\r  📜 ${String(i+1).padStart(2)}/${index.results.length}  ${item.index.padEnd(25)}`);
    try {
      const b = await httpsGet(`${BASE}${item.url}`);

      // Skill proficiencies: from starting_proficiencies, filter "Skill:" prefix
      const skillProfs = (b.starting_proficiencies || [])
        .filter(p => p.name?.startsWith('Skill:'))
        .map(p => p.name.replace(/^Skill:\s*/, ''));

      // Language options
      let langOptions = null;
      if (b.language_options) {
        const opts = b.language_options.from?.options || [];
        langOptions = {
          choose: b.language_options.choose || 0,
          from:   opts.length ? opts.map(o => o.item?.name || 'any').join(', ') : 'any',
        };
      }

      // Feature — first entry in feature array or feature object
      let feature = null;
      if (b.feature) {
        feature = {
          name: b.feature.name || '',
          desc: (b.feature.desc || []).join('\n'),
        };
      }

      const out = {
        index:               b.index,
        name:                b.name,
        desc:                '', // API doesn't provide a top-level desc for backgrounds
        skill_proficiencies: skillProfs,
        language_options:    langOptions,
        starting_equipment:  b.starting_equipment || [],
        feature:             feature,
        personality_traits:  (b.personality_traits?.from?.options || []).map(o => o.string || '').filter(Boolean),
        ideals:              (b.ideals?.from?.options             || []).map(o => o.desc   || o.string || '').filter(Boolean),
        bonds:               (b.bonds?.from?.options              || []).map(o => o.string || '').filter(Boolean),
        flaws:               (b.flaws?.from?.options              || []).map(o => o.string || '').filter(Boolean),
      };

      saveJSON(filePath, out);
      done++;
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
    }
    if (i % 25 === 24) await sleep(300);
  }
  console.log(`\n  ✅ ${done} backgrounds saved (${skipped} already existed)`);
}

// ── FEATS (API — very limited, wikidot will enrich) ───────────────────────────

async function fetchFeats() {
  const dir = path.join(EN, 'dnd_feats');
  fs.mkdirSync(dir, { recursive: true });

  process.stdout.write('⭐ Feat index... ');
  const index = await httpsGet(`${API}/feats`);
  saveJSON(path.join(dir, '_index.json'), index);
  console.log(`${index.count} feats (API only — wikidot will add more)`);

  let done = 0, skipped = 0;
  for (let i = 0; i < index.results.length; i++) {
    const item = index.results[i];
    const filePath = path.join(dir, `${item.index}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(2)}/${index.results.length}  (${skipped} skipped)  ${item.index.padEnd(25)}`);
      continue;
    }

    process.stdout.write(`\r  ⭐ ${String(i+1).padStart(2)}/${index.results.length}  ${item.index.padEnd(25)}`);
    try {
      const f = await httpsGet(`${BASE}${item.url}`);

      const out = {
        index:        f.index,
        name:         f.name,
        source:       'Player\'s Handbook', // API feats are all SRD / PHB
        prerequisite: (f.prerequisites || []).map(p => p.minimum_score
          ? `${p.ability_score?.name} ${p.minimum_score}+`
          : p.name || ''
        ).filter(Boolean).join(', ') || null,
        desc:         (f.desc || []).join('\n'),
        benefits:     [],
        _source:      'api',
      };

      saveJSON(filePath, out);
      done++;
    } catch(e) {
      console.error(`\n  ⚠ ${item.index}: ${e.message}`);
    }
    if (i % 25 === 24) await sleep(300);
  }
  console.log(`\n  ✅ ${done} feats saved from API (${skipped} already existed)`);
}

// ── BUNDLE BUILDERS ───────────────────────────────────────────────────────────

function buildClassesBundle(allClasses) {
  // If allClasses is empty (all were skipped), read from files
  if (!allClasses.length) {
    const dir = path.join(EN, 'dnd_classes');
    allClasses = listFiles(dir).map(f => readJSON(path.join(dir, f))).filter(Boolean);
  }
  allClasses.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_classes_en.js'),
    `/* D&D 5e Classes — English — generated by scripts/fetch_content.js */\nwindow.DND_CLASSES_EN=${JSON.stringify(allClasses)};`
  );
  console.log(`  📦 dnd_db/bundle_classes_en.js  (${allClasses.length} classes)`);
}

function buildRacesBundle(allRaces) {
  if (!allRaces.length) {
    const dir = path.join(EN, 'dnd_races');
    allRaces = listFiles(dir).map(f => readJSON(path.join(dir, f))).filter(Boolean);
  }
  // Only top-level races (not subraces — subraces have a "race" field)
  const races = allRaces.filter(r => !r.race);
  races.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_races_en.js'),
    `/* D&D 5e Races — English — generated by scripts/fetch_content.js */\nwindow.DND_RACES_EN=${JSON.stringify(races)};`
  );
  console.log(`  📦 dnd_db/bundle_races_en.js  (${races.length} races)`);
}

function buildFeatsBundle() {
  const dir = path.join(EN, 'dnd_feats');
  const feats = listFiles(dir).map(f => readJSON(path.join(dir, f))).filter(Boolean);
  feats.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_feats_en.js'),
    `/* D&D 5e Feats — English — generated by scripts/fetch_content.js + scrape_wikidot.js */\nwindow.DND_FEATS_EN=${JSON.stringify(feats)};`
  );
  console.log(`  📦 dnd_db/bundle_feats_en.js  (${feats.length} feats)`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  D&D 5e Content Fetcher (EN)           ║');
  console.log('║  Classes · Races · Features · Traits  ║');
  console.log('║  Backgrounds · Subclasses · Feats      ║');
  console.log('╚════════════════════════════════════════╝\n');

  await fetchFeatures();
  console.log();

  await fetchTraits();
  console.log();

  await fetchSubclasses();
  console.log();

  const allClasses = await fetchClasses();
  console.log();

  const allRaces = await fetchRaces();
  console.log();

  await fetchBackgrounds();
  console.log();

  await fetchFeats();
  console.log();

  console.log('📦 Building bundles...');
  buildClassesBundle(allClasses);
  buildRacesBundle(allRaces);
  buildFeatsBundle();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Terminé !                             ║');
  console.log('║  Prochaine étape :                     ║');
  console.log('║    node scripts/scrape_wikidot.js      ║');
  console.log('╚════════════════════════════════════════╝');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
