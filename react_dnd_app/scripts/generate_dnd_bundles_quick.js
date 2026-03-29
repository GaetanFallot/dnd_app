// Quick EN-only D&D 5e SRD Bundle Generator — no translation, for fast testing
// Run with: node scripts/generate_dnd_bundles_quick.js
// Requires Node 18+ (uses native fetch)

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://www.dnd5eapi.co';
const OUT_DIR = join(__dirname, '..', 'public', 'dnd_db');
const DELAY_MS = 200;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiFetch(path) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function writeBundle(filename, varName, data) {
  const filePath = join(OUT_DIR, filename);
  const content = `// Auto-generated bundle — DO NOT EDIT\nwindow.${varName} = ${JSON.stringify(data)}`;
  writeFileSync(filePath, content, 'utf8');
  console.log(`  Wrote ${filename} (${data.length} entries, ${Math.round(content.length / 1024)} KB)`);
}

// ─── Classes ─────────────────────────────────────────────────────────────────

async function fetchClasses() {
  console.log('\n[Classes] Fetching index...');
  const index = await apiFetch('/api/2014/classes');
  const classes = [];

  for (const entry of index.results) {
    console.log(`  Fetching class: ${entry.name}`);
    await delay(DELAY_MS);

    const detail = await apiFetch(entry.url);

    await delay(DELAY_MS);
    let levels = [];
    try {
      const levelsData = await apiFetch(`/api/2014/classes/${entry.index}/levels`);
      levels = levelsData.map(l => ({
        level: l.level,
        ability_score_bonuses: l.ability_score_bonuses,
        prof_bonus: l.prof_bonus,
        spellcasting: l.spellcasting || null,
        class_specific: l.class_specific || null,
      }));
    } catch (e) {
      console.warn(`    Warning: could not fetch levels for ${entry.name}: ${e.message}`);
    }

    classes.push({
      index: detail.index,
      name: detail.name,
      hit_die: detail.hit_die,
      proficiencies: (detail.proficiencies || []).map(p => p.name),
      proficiency_choices: (detail.proficiency_choices || []).map(pc => ({
        desc: pc.desc,
        choose: pc.choose,
        from: (pc.from?.options || []).map(o => o.item?.name || o.string || '').filter(Boolean),
      })),
      saving_throws: (detail.saving_throws || []).map(st => st.name),
      spellcasting: detail.spellcasting ? {
        level: detail.spellcasting.level,
        ability: detail.spellcasting.spellcasting_ability?.name || '',
      } : null,
      subclasses: (detail.subclasses || []).map(sc => ({
        index: sc.index,
        name: sc.name,
      })),
      levels,
    });
  }

  return classes;
}

// ─── Races ───────────────────────────────────────────────────────────────────

async function fetchRaces() {
  console.log('\n[Races] Fetching index...');
  const index = await apiFetch('/api/2014/races');
  const races = [];

  for (const entry of index.results) {
    console.log(`  Fetching race: ${entry.name}`);
    await delay(DELAY_MS);

    const detail = await apiFetch(entry.url);

    const subraces = [];
    for (const sr of (detail.subraces || [])) {
      console.log(`    Fetching subrace: ${sr.name}`);
      await delay(DELAY_MS);
      try {
        const srDetail = await apiFetch(sr.url);
        subraces.push({
          index: srDetail.index,
          name: srDetail.name,
          desc: srDetail.desc || '',
          ability_bonuses: (srDetail.ability_bonuses || []).map(ab => ({
            ability_score: ab.ability_score?.name || '',
            bonus: ab.bonus,
          })),
          racial_traits: (srDetail.racial_traits || []).map(t => t.name),
          languages: (srDetail.languages || []).map(l => l.name),
        });
      } catch (e) {
        console.warn(`    Warning: could not fetch subrace ${sr.name}: ${e.message}`);
        subraces.push({ index: sr.index, name: sr.name });
      }
    }

    races.push({
      index: detail.index,
      name: detail.name,
      speed: detail.speed,
      size: detail.size,
      size_description: detail.size_description || '',
      ability_bonuses: (detail.ability_bonuses || []).map(ab => ({
        ability_score: ab.ability_score?.name || '',
        bonus: ab.bonus,
      })),
      ability_bonus_options: detail.ability_bonus_options ? {
        choose: detail.ability_bonus_options.choose,
        from: (detail.ability_bonus_options.from?.options || []).map(o => ({
          ability_score: o.ability_score?.name || '',
          bonus: o.bonus,
        })),
      } : null,
      traits: (detail.traits || []).map(t => t.name),
      languages: (detail.languages || []).map(l => l.name),
      language_desc: detail.language_desc || '',
      alignment: detail.alignment || '',
      age: detail.age || '',
      subraces,
    });
  }

  return races;
}

// ─── Feats ───────────────────────────────────────────────────────────────────

async function fetchFeats() {
  console.log('\n[Feats] Fetching index...');
  const index = await apiFetch('/api/2014/feats');
  const feats = [];

  for (const entry of index.results) {
    console.log(`  Fetching feat: ${entry.name}`);
    await delay(DELAY_MS);

    const detail = await apiFetch(entry.url);

    feats.push({
      index: detail.index,
      name: detail.name,
      desc: Array.isArray(detail.desc) ? detail.desc : [detail.desc || ''],
      prerequisites: (detail.prerequisites || []).map(p => ({
        type: p.type || '',
        minimum_score: p.minimum_score || null,
        ability_score: p.ability_score?.name || null,
        proficiency: p.proficiency?.name || null,
        race: p.race?.name || null,
        spell: p.spell?.name || null,
      })),
    });
  }

  return feats;
}

// ─── Backgrounds ─────────────────────────────────────────────────────────────

async function fetchBackgrounds() {
  console.log('\n[Backgrounds] Fetching index...');
  const index = await apiFetch('/api/2014/backgrounds');
  const backgrounds = [];

  for (const entry of index.results) {
    console.log(`  Fetching background: ${entry.name}`);
    await delay(DELAY_MS);

    const detail = await apiFetch(entry.url);

    backgrounds.push({
      index: detail.index,
      name: detail.name,
      starting_proficiencies: (detail.starting_proficiencies || []).map(p => p.name),
      starting_equipment: (detail.starting_equipment || []).map(eq => ({
        item: eq.equipment?.name || '',
        quantity: eq.quantity || 1,
      })),
      starting_equipment_options: (detail.starting_equipment_options || []).map(opt => ({
        desc: opt.desc || '',
        choose: opt.choose || 1,
      })),
      language_options: detail.language_options ? {
        choose: detail.language_options.choose,
        desc: 'Choose from standard languages',
      } : null,
      feature: detail.feature ? {
        name: detail.feature.name || '',
        desc: Array.isArray(detail.feature.desc) ? detail.feature.desc : [detail.feature.desc || ''],
      } : null,
      personality_traits: detail.personality_traits ? {
        choose: detail.personality_traits.choose,
        from: (detail.personality_traits.from?.options || []).map(o => o.string || ''),
      } : null,
      ideals: detail.ideals ? {
        choose: detail.ideals.choose,
        from: (detail.ideals.from?.options || []).map(o => ({
          desc: o.desc || '',
          alignments: (o.alignments || []).map(a => a.name || ''),
        })),
      } : null,
      bonds: detail.bonds ? {
        choose: detail.bonds.choose,
        from: (detail.bonds.from?.options || []).map(o => o.string || ''),
      } : null,
      flaws: detail.flaws ? {
        choose: detail.flaws.choose,
        from: (detail.flaws.from?.options || []).map(o => o.string || ''),
      } : null,
    });
  }

  return backgrounds;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('D&D 5e SRD Quick Bundle Generator (EN only)');
  console.log(`Node version: ${process.version}`);
  console.log(`Output directory: ${OUT_DIR}`);
  console.log('---');

  ensureDir(OUT_DIR);

  const classesEN = await fetchClasses();
  writeBundle('bundle_classes_en.js', 'DND_CLASSES_EN', classesEN);

  const racesEN = await fetchRaces();
  writeBundle('bundle_races_en.js', 'DND_RACES_EN', racesEN);

  const featsEN = await fetchFeats();
  writeBundle('bundle_feats_en.js', 'DND_FEATS_EN', featsEN);

  const backgroundsEN = await fetchBackgrounds();
  writeBundle('bundle_backgrounds_en.js', 'DND_BACKGROUNDS_EN', backgroundsEN);

  console.log('\nAll EN bundles generated successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
