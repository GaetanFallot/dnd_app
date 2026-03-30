#!/usr/bin/env node
// Traduit les fichiers FR qui ont _translated: false (ou sans _translated)
// dans dnd_db/fr/ pour : subclasses, feats, features, classes, traits
// Interruptible + reprendable.
// Run: node scripts/translate_missing_fr.js

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ROOT   = path.join(__dirname, '..');
const FR_DIR = path.join(ROOT, 'dnd_db', 'fr');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const CLASS_MAP = {
  'Barbarian': 'Barbare', 'Bard': 'Barde', 'Cleric': 'Clerc',
  'Druid': 'Druide', 'Fighter': 'Guerrier', 'Monk': 'Moine',
  'Paladin': 'Paladin', 'Ranger': 'Rôdeur', 'Rogue': 'Roublard',
  'Sorcerer': 'Ensorceleur', 'Warlock': 'Occultiste', 'Wizard': 'Magicien',
  'Artificer': 'Artificier',
};

// ── Google Translate ──────────────────────────────────────────────────────────

function gtranslate(text) {
  return new Promise((resolve) => {
    if (!text || !text.trim()) { resolve(text); return; }
    const q = encodeURIComponent(text.slice(0, 4800));
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${q}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json[0].map(c => c[0]).join(''));
        } catch { resolve(text); }
      });
    }).on('error', () => resolve(text));
  });
}

function chunkText(text, max = 4500) {
  if (!text || text.length <= max) return [text];
  const paras = text.split('\n');
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if (cur.length + p.length + 1 > max) { if (cur) chunks.push(cur); cur = p; }
    else { cur = cur ? `${cur}\n${p}` : p; }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function translateLong(text) {
  if (!text) return text;
  const chunks = chunkText(text);
  const results = [];
  for (const chunk of chunks) {
    results.push(await gtranslate(chunk));
    if (chunks.length > 1) await sleep(350);
  }
  return results.join('\n');
}

// ── Generic translate loop ────────────────────────────────────────────────────

async function translateDir(dirName, transformFn) {
  const dir = path.join(FR_DIR, dirName);
  if (!fs.existsSync(dir)) { console.log(`⏭  ${dirName} absent`); return; }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const toTranslate = files.filter(f => {
    try {
      const o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return !o._translated;
    } catch { return false; }
  });

  if (!toTranslate.length) { console.log(`✅ ${dirName}: déjà tout traduit`); return; }
  console.log(`🔄 ${dirName}: ${toTranslate.length} fichiers à traduire...`);

  let done = 0;
  for (let i = 0; i < toTranslate.length; i++) {
    const f    = toTranslate[i];
    const fPath = path.join(dir, f);
    const en   = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    process.stdout.write(`\r  🔄 ${i+1}/${toTranslate.length}  ${(en.index||f).padEnd(45)}`);

    try {
      const fr = await transformFn(en);
      fr._translated = true;
      fs.writeFileSync(fPath, JSON.stringify(fr, null, 2));
      done++;
      await sleep(400);
    } catch(e) {
      console.error(`\n  ⚠ ${en.index || f}: ${e.message}`);
    }
  }
  console.log(`\n  ✅ ${done} traduits`);
}

// ── Transformers ──────────────────────────────────────────────────────────────

async function transformSubclass(en) {
  const frName   = await gtranslate(en.name || ''); await sleep(200);
  const frFlavor = en.subclass_flavor ? await translateLong(en.subclass_flavor) : '';
  if (frFlavor) await sleep(200);
  const frDesc   = en.desc ? await translateLong(en.desc) : '';
  if (frDesc) await sleep(200);

  const frFeatures = [];
  for (const feat of (en.features || [])) {
    const frFeatName = await gtranslate(feat.name || ''); await sleep(150);
    const frFeatDesc = feat.desc ? await translateLong(feat.desc) : ''; await sleep(250);
    frFeatures.push({ ...feat, name: frFeatName, name_en: feat.name, desc: frFeatDesc });
  }

  return { ...en, name: frName, name_en: en.name, subclass_flavor: frFlavor, desc: frDesc, features: frFeatures };
}

async function transformFeat(en) {
  const frName = await gtranslate(en.name || ''); await sleep(200);
  const frDesc = en.desc ? await translateLong(en.desc) : ''; await sleep(200);
  const frBenefits = [];
  for (const b of (en.benefits || [])) {
    frBenefits.push(await gtranslate(b)); await sleep(200);
  }
  const frPrereq = en.prerequisite ? await gtranslate(en.prerequisite) : null;

  return { ...en, name: frName, name_en: en.name, desc: frDesc, benefits: frBenefits, prerequisite: frPrereq };
}

async function transformFeature(en) {
  const frName = await gtranslate(en.name || ''); await sleep(200);
  const frDescs = [];
  for (const d of (Array.isArray(en.desc) ? en.desc : [en.desc || ''])) {
    frDescs.push(await translateLong(d)); await sleep(200);
  }
  const className = en.class?.name || '';
  return { ...en, name: frName, name_en: en.name, desc: frDescs, class_name_fr: CLASS_MAP[className] || className };
}

async function transformClass(en) {
  const frName = CLASS_MAP[en.name] || await gtranslate(en.name || ''); await sleep(200);
  const frDesc = en.desc ? await translateLong(en.desc) : '';
  return { ...en, name: frName, name_en: en.name, desc: frDesc };
}

async function transformTrait(en) {
  const frName = await gtranslate(en.name || ''); await sleep(200);
  const frDesc = en.desc ? await translateLong(en.desc) : '';
  return { ...en, name: frName, name_en: en.name, desc: frDesc };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Traduction des fichiers FR manquants    ║');
  console.log('║  (interruptible, reprend où ça s\'arrête) ║');
  console.log('╚══════════════════════════════════════════╝\n');

  await translateDir('dnd_subclasses', transformSubclass); console.log();
  await translateDir('dnd_feats',      transformFeat);      console.log();
  await translateDir('dnd_features',   transformFeature);   console.log();
  await translateDir('dnd_classes',    transformClass);     console.log();
  await translateDir('dnd_traits',     transformTrait);     console.log();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Terminé ! Lance rebuild_bundles.js      ║');
  console.log('╚══════════════════════════════════════════╝');
}

main().catch(console.error);
