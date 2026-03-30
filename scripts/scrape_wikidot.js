#!/usr/bin/env node
// Scrapes dnd5e.wikidot.com for feats, subclasses, classes, races, backgrounds.
// Uses cheerio for HTML parsing.
// Run: node scripts/scrape_wikidot.js
//
// Fully resumable — each page is saved to its own JSON file.
// If interrupted, re-run and already-saved files are skipped automatically.
// Rate limited to 1 request/second to be respectful to the server.

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { load } = require('cheerio');

const ROOT   = path.join(__dirname, '..');
const EN     = path.join(ROOT, 'dnd_db', 'en');
const WIKIDOT = 'https://dnd5e.wikidot.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Known class slugs (for subclass detection) ───────────────────────────────

const CLASS_SLUGS = new Set([
  'barbarian', 'bard', 'cleric', 'druid', 'fighter',
  'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
]);

// ── Official source allowlist ─────────────────────────────────────────────────
// Pages without a recognised "Source:" tag are skipped.

const OFFICIAL_SOURCES = [
  "player's handbook", "phb",
  "xanathar's guide to everything", "xgte",
  "tasha's cauldron of everything", "tcoe",
  "mordenkainen's tome of foes", "mtof",
  "sword coast adventurer's guide", "scag",
  "dungeon master's guide", "dmg",
  "volo's guide to monsters", "vgm",
  "fizban's treasury of dragons",
  "monsters of the multiverse",
  "van richten's guide",
  "acquisitions incorporated",
  "explorer's guide to wildemount",
  "mythic odysseys of theros",
  "eberron",
];

function isOfficialSource(sourceText) {
  if (!sourceText) return false;
  const lower = sourceText.toLowerCase();
  return OFFICIAL_SOURCES.some(s => lower.includes(s));
}

// Short abbreviation for progress display  e.g. "Player's Handbook" → "PHB"
function shortSource(sourceText) {
  if (!sourceText) return '?';
  const lower = sourceText.toLowerCase();
  if (lower.includes("player's handbook"))        return 'PHB';
  if (lower.includes("xanathar"))                 return "XGtE";
  if (lower.includes("tasha"))                    return "TCoE";
  if (lower.includes("mordenkainen"))             return "MToF";
  if (lower.includes("sword coast"))              return "SCAG";
  if (lower.includes("dungeon master"))           return "DMG";
  if (lower.includes("volo"))                     return "VGtM";
  if (lower.includes("fizban"))                   return "FToD";
  if (lower.includes("multiverse"))               return "MotM";
  if (lower.includes("van richten"))              return "VRGtR";
  if (lower.includes("acquisitions"))             return "AI";
  if (lower.includes("wildemount"))               return "EGtW";
  if (lower.includes("theros"))                   return "MOT";
  if (lower.includes("eberron"))                  return "ERftLW";
  return sourceText.split(':').pop().trim().slice(0, 8);
}

// ── HTTP helper (https, no external deps) ─────────────────────────────────────

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 dnd_app/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchHTML(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode === 404) {
        res.resume();
        return reject(new Error(`HTTP 404: ${url}`));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

// ── Text cleaning helpers ─────────────────────────────────────────────────────

/** Get plain text from a cheerio element, collapsing whitespace. */
function cleanText($el) {
  return $el.text().replace(/\s+/g, ' ').trim();
}

/**
 * Convert a cheerio element's contents to text, preserving paragraph and list
 * structure as newlines.
 */
function htmlToText($, $el) {
  let text = '';
  $el.contents().each((_, node) => {
    if (node.type === 'text') {
      text += node.data;
    } else if (node.name === 'p') {
      text += $(node).text() + '\n\n';
    } else if (node.name === 'li') {
      text += '• ' + $(node).text() + '\n';
    } else if (node.name === 'br') {
      text += '\n';
    } else if (node.name === 'h2' || node.name === 'h3' || node.name === 'h4') {
      text += '\n' + $(node).text() + '\n';
    } else {
      // recurse for span, em, strong, etc.
      text += $(node).text();
    }
  });
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Extract a "Source: ..." paragraph from page content.
 * Returns the source string or null.
 */
function extractSource($, $content) {
  let source = null;
  $content.find('p').each((_, el) => {
    const t = $(el).text().trim();
    if (t.startsWith('Source:')) {
      source = t.replace(/^Source:\s*/i, '').trim();
      return false; // break
    }
  });
  return source;
}

/**
 * Extract a named field like "Prerequisite: ..." from page content.
 */
function extractField($, $content, label) {
  let value = null;
  $content.find('p').each((_, el) => {
    const t = $(el).text().trim();
    const re = new RegExp(`^${label}[:\\s]`, 'i');
    if (re.test(t)) {
      value = t.replace(new RegExp(`^${label}[:\\s]*`, 'i'), '').trim();
      return false; // break
    }
  });
  return value;
}

// ── Page discovery ────────────────────────────────────────────────────────────

/**
 * Fetch the wikidot sitemap (all pages listing).
 * Handles pagination automatically.
 * Returns an array of href strings (relative, e.g. "/feat:alert").
 */
async function discoverPages() {
  const allHrefs = new Set();
  let page = 1;
  let hasMore = true;

  console.log('🗺️  Scanning sitemap...');

  while (hasMore) {
    const url = page === 1
      ? `${WIKIDOT}/system:list-all-pages`
      : `${WIKIDOT}/system:list-all-pages/p/${page}`;

    process.stdout.write(`\r  📄 Page ${page}...                    `);
    try {
      const html = await fetchHTML(url);
      const $    = load(html);

      // All page links are in .list-pages-box li a
      const found = [];
      $('.list-pages-box li a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/')) found.push(href);
      });

      if (!found.length) {
        hasMore = false;
      } else {
        found.forEach(h => allHrefs.add(h));
        // Wikidot pager shows "page X of Y" — check if more pages exist
        const pagerText = $('.pager-no').text().trim(); // e.g. "page 1 of 14"
        const m = pagerText.match(/page\s+(\d+)\s+of\s+(\d+)/i);
        if (m && parseInt(m[1]) < parseInt(m[2])) {
          page++;
        } else {
          hasMore = false;
        }
      }
    } catch(e) {
      console.error(`\n  ⚠ Sitemap page ${page}: ${e.message}`);
      hasMore = false;
    }
    if (hasMore) await sleep(1000);
  }

  console.log(`\n  ✅ Found ${allHrefs.size} pages total`);
  return [...allHrefs];
}

/**
 * Categorise a list of hrefs into feats, subclasses, classes, races, backgrounds.
 */
function categorisePages(hrefs) {
  const feats       = [];
  const subclasses  = [];  // { href, className, slug }
  const classes     = [];
  const races       = [];
  const backgrounds = [];

  // Known race slugs (base races + common subraces that appear as top-level pages)
  const RACE_SLUGS = new Set([
    'dragonborn', 'dwarf', 'elf', 'gnome', 'half-elf', 'half-orc',
    'halfling', 'human', 'tiefling',
    // common sub-pages that are racial
    'hill-dwarf', 'mountain-dwarf', 'high-elf', 'wood-elf', 'dark-elf', 'drow',
    'forest-gnome', 'rock-gnome', 'lightfoot-halfling', 'stout-halfling',
    'variant-human',
  ]);

  for (const href of hrefs) {
    // Strip leading slash
    const slug = href.slice(1);

    if (href.startsWith('/feat:')) {
      feats.push({ href, slug: slug.replace('feat:', '') });
      continue;
    }

    if (href.startsWith('/background:')) {
      backgrounds.push({ href, slug: slug.replace('background:', '') });
      continue;
    }

    // Check for subclass patterns: /{classname}:{subclassname}
    const colonIdx = slug.indexOf(':');
    if (colonIdx !== -1) {
      const prefix = slug.slice(0, colonIdx);
      if (CLASS_SLUGS.has(prefix)) {
        subclasses.push({ href, slug, className: prefix, subSlug: slug.slice(colonIdx + 1) });
      }
      // other colon-patterns (system:, etc.) are ignored
      continue;
    }

    // Bare slug — class, race, or other
    if (CLASS_SLUGS.has(slug)) {
      classes.push({ href, slug });
      continue;
    }

    if (RACE_SLUGS.has(slug)) {
      races.push({ href, slug });
      continue;
    }
    // Everything else is ignored (monsters, spells already fetched from API, etc.)
  }

  return { feats, subclasses, classes, races, backgrounds };
}

// ── FEAT PARSER ───────────────────────────────────────────────────────────────

/**
 * Parse a wikidot feat page.
 * Returns the structured feat object, or null if the page should be skipped.
 */
function parseFeat($, slug) {
  const $content = $('#page-content');
  const name     = $('.page-title').text().trim() || slug;
  const source   = extractSource($, $content);

  if (!isOfficialSource(source)) return null;

  const prerequisite = extractField($, $content, 'Prerequisite');

  // Main description: first <p> that is NOT a Source/Prerequisite/meta line
  let desc = '';
  $content.find('p').each((_, el) => {
    const t = $(el).text().trim();
    if (t.startsWith('Source:') || t.startsWith('Prerequisite:') || !t) return;
    if (!desc) desc = t;
  });

  // Benefits: every <li> across all <ul>/<ol> blocks
  const benefits = [];
  $content.find('li').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t) benefits.push(t);
  });

  return { index: slug, name, source, prerequisite: prerequisite || null, desc, benefits };
}

// ── SUBCLASS PARSER ───────────────────────────────────────────────────────────

/**
 * Parse a wikidot subclass page.
 * Returns the structured subclass object, or null if it should be skipped.
 */
function parseSubclass($, slug, className) {
  const $content = $('#page-content');
  const name     = $('.page-title').text().trim() || slug;
  const source   = extractSource($, $content);

  if (!isOfficialSource(source)) return null;

  // Subclass flavor: first em/strong-em paragraph
  let subclassFlavor = '';
  $content.find('p').first().find('em, strong em').each((_, el) => {
    const t = $(el).text().trim();
    if (t && !subclassFlavor) subclassFlavor = t;
  });

  // Wikidot subclass pages wrap all content in .feature > .row > .col-lg-12
  // Fall back to #page-content if that structure is absent.
  const $inner = $content.find('.feature .col-lg-12').length
    ? $content.find('.feature .col-lg-12').first()
    : $content;

  // Flatten all direct children of $inner into a flat list for sequential parsing
  const nodes = $inner.children().toArray();

  // Intro desc: everything before the first h2/h3 (excluding source/meta lines)
  let desc = '';
  for (const el of nodes) {
    const tag = el.name;
    if (tag === 'h2' || tag === 'h3') break;
    if (tag === 'p') {
      const t = $(el).text().trim();
      if (t && !t.startsWith('Source:') && !t.startsWith('Prerequisite:')) {
        desc += (desc ? '\n\n' : '') + t;
      }
    }
  }

  // Features: every h2/h3 starts a new feature block
  const features = [];
  let currentFeature = null;

  for (const el of nodes) {
    const tag = el.name;

    if (tag === 'h2' || tag === 'h3') {
      if (currentFeature) features.push(currentFeature);
      const headerText = $(el).text().trim();
      // Extract level hint from text like "At 3rd level" or "Starting at 7th level"
      let level = null;
      const lvlMatch = headerText.match(/\b(\d+)(?:st|nd|rd|th)?\s*[Ll]evel\b|\b[Ll]evel\s+(\d+)\b/);
      if (lvlMatch) level = parseInt(lvlMatch[1] || lvlMatch[2], 10);
      currentFeature = { name: headerText, level, desc: '' };
      continue;
    }

    if (!currentFeature) continue;

    if (tag === 'p') {
      const t = $(el).text().trim();
      if (t && !t.startsWith('Source:')) {
        // Also extract level from "At Xth level" in the first sentence
        if (!currentFeature.level) {
          const lm = t.match(/(?:[Aa]t|[Ss]tarting at|[Bb]y|[Aa]t reach(?:ing)?)\s+(\d+)(?:st|nd|rd|th)\s+level\b/);
          if (lm) currentFeature.level = parseInt(lm[1], 10);
        }
        currentFeature.desc += (currentFeature.desc ? '\n\n' : '') + t;
      }
    } else if (tag === 'ul' || tag === 'ol') {
      $(el).find('li').each((_, li) => {
        const t = $(li).text().replace(/\s+/g, ' ').trim();
        if (t) currentFeature.desc += '\n• ' + t;
      });
    } else if (tag === 'table') {
      // Flatten table to text rows
      const rows = [];
      $(el).find('tr').each((_, tr) => {
        const cells = [];
        $(tr).find('th, td').each((_, td) => cells.push($(td).text().trim()));
        if (cells.length) rows.push(cells.join(' | '));
      });
      if (rows.length) currentFeature.desc += '\n' + rows.join('\n');
    }
  }
  if (currentFeature) features.push(currentFeature);

  return {
    index:           slug,
    name,
    class:           className,
    source,
    subclass_flavor: subclassFlavor,
    desc,
    features,
  };
}

// ── CLASS PARSER ──────────────────────────────────────────────────────────────

/**
 * Parse a wikidot class page.
 * Saved with a "wikidot_" prefix to avoid overwriting API data.
 */
function parseClass($, slug) {
  const $content = $('#page-content');
  const name     = $('.page-title').text().trim() || slug;
  const source   = extractSource($, $content);

  if (!isOfficialSource(source)) return null;

  // Flavor: first italic/strong-italic paragraph
  let flavor = '';
  $content.find('p em, p strong em').first().each((_, el) => {
    flavor = $(el).text().trim();
  });

  // Hit die: look for "d6", "d8", "d10", "d12" near "Hit Die" text
  let hitDie = null;
  const allText = $content.text();
  const hitDieMatch = allText.match(/[Hh]it\s+[Dd]ie[:\s]+d(\d+)/);
  if (hitDieMatch) hitDie = parseInt(hitDieMatch[1], 10);

  // Proficiencies: look for Armor, Weapons, Tools, Skills sections in text
  const proficiencies = [];
  $content.find('p, li').each((_, el) => {
    const t = $(el).text().trim();
    if (/^(Armor|Weapons?|Tools?|Saving Throws?|Skills?):/i.test(t)) {
      proficiencies.push(t);
    }
  });

  // Features: h2/h3 sections
  const features = [];
  let currentFeature = null;

  $content.children().each((_, el) => {
    const tag = el.name;
    if (tag === 'h2' || tag === 'h3') {
      if (currentFeature) features.push(currentFeature);
      const headerText = $(el).text().trim();
      let level = null;
      const lvlMatch = headerText.match(/\b(\d+)(?:st|nd|rd|th)?\s+[Ll]evel\b|\bLevel\s+(\d+)\b/);
      if (lvlMatch) level = parseInt(lvlMatch[1] || lvlMatch[2], 10);
      currentFeature = { name: headerText, level, desc: '' };
      return;
    }
    if (!currentFeature) return;
    if (tag === 'p') {
      const t = $(el).text().trim();
      if (t) currentFeature.desc += (currentFeature.desc ? '\n\n' : '') + t;
    } else if (tag === 'ul' || tag === 'ol') {
      $(el).find('li').each((_, li) => {
        const t = $(li).text().replace(/\s+/g, ' ').trim();
        if (t) currentFeature.desc += '\n• ' + t;
      });
    }
  });
  if (currentFeature) features.push(currentFeature);

  return { index: slug, name, source, flavor, hit_die: hitDie, proficiencies, features };
}

// ── RACE PARSER ───────────────────────────────────────────────────────────────

function parseRace($, slug) {
  const $content = $('#page-content');
  const name     = $('.page-title').text().trim() || slug;
  const source   = extractSource($, $content);

  if (!isOfficialSource(source)) return null;

  // Intro desc: paragraphs before first h2/h3, excluding source
  let desc = '';
  $content.children().each((_, el) => {
    const tag = el.name;
    if (tag === 'h2' || tag === 'h3') return false;
    if (tag === 'p') {
      const t = $(el).text().trim();
      if (t && !t.startsWith('Source:')) {
        desc += (desc ? '\n\n' : '') + t;
      }
    }
  });

  // Traits: h3 sections (racial traits)
  const traits = [];
  let currentTrait = null;

  $content.children().each((_, el) => {
    const tag = el.name;
    if (tag === 'h3') {
      if (currentTrait) traits.push(currentTrait);
      currentTrait = { name: $(el).text().trim(), desc: '' };
      return;
    }
    if (!currentTrait) return;
    if (tag === 'p') {
      const t = $(el).text().trim();
      if (t) currentTrait.desc += (currentTrait.desc ? '\n\n' : '') + t;
    } else if (tag === 'ul' || tag === 'ol') {
      $(el).find('li').each((_, li) => {
        const t = $(li).text().replace(/\s+/g, ' ').trim();
        if (t) currentTrait.desc += '\n• ' + t;
      });
    }
  });
  if (currentTrait) traits.push(currentTrait);

  return { index: slug, name, source, desc, traits };
}

// ── BACKGROUND PARSER ─────────────────────────────────────────────────────────

function parseBackground($, slug) {
  const $content = $('#page-content');
  const name     = $('.page-title').text().trim() || slug;
  const source   = extractSource($, $content);

  if (!isOfficialSource(source)) return null;

  let desc = '';
  $content.children().each((_, el) => {
    const tag = el.name;
    if (tag === 'h2' || tag === 'h3') return false;
    if (tag === 'p') {
      const t = $(el).text().trim();
      if (t && !t.startsWith('Source:')) {
        desc += (desc ? '\n\n' : '') + t;
      }
    }
  });

  // Skill proficiencies: look for "Skill Proficiencies:" paragraph
  const skillProfsText = extractField($, $content, 'Skill Proficiencies');
  const skillProficiencies = skillProfsText
    ? skillProfsText.split(/,\s*/).map(s => s.trim()).filter(Boolean)
    : [];

  // Feature: first h3 that contains "Feature:" or standalone h2/h3 named "Feature"
  let feature = null;
  $content.find('h2, h3').each((_, el) => {
    const t = $(el).text().trim();
    if (/feature/i.test(t) && !feature) {
      const featureName = t.replace(/^Feature:\s*/i, '').trim();
      let featureDesc = '';
      let sib = $(el).next();
      while (sib.length && !['h2', 'h3'].includes(sib[0].name)) {
        if (sib[0].name === 'p') featureDesc += sib.text().trim() + '\n\n';
        sib = sib.next();
      }
      feature = { name: featureName, desc: featureDesc.trim() };
    }
  });

  return { index: slug, name, source, desc, skill_proficiencies: skillProficiencies, feature };
}

// ── SCRAPING LOOPS ────────────────────────────────────────────────────────────

async function scrapeFeats(featList) {
  const dir = path.join(EN, 'dnd_feats');
  fs.mkdirSync(dir, { recursive: true });

  console.log(`⭐ Scraping ${featList.length} feat pages...`);
  let done = 0, skipped = 0, rejected = 0, errors = 0;

  for (let i = 0; i < featList.length; i++) {
    const { slug } = featList[i];
    const filePath = path.join(dir, `${slug}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(3)}/${featList.length}  (${skipped} skipped)  ${slug.padEnd(35)}`);
      continue;
    }

    const url = `${WIKIDOT}/feat:${slug}`;
    process.stdout.write(`\r  ⭐ ${String(i+1).padStart(3)}/${featList.length}  ${slug.padEnd(35)}`);

    try {
      const html = await fetchHTML(url);
      const $    = load(html);
      const feat = parseFeat($, slug);

      if (!feat) {
        const source = extractSource($, $('#page-content'));
        console.log(`\r  ⚠ feat:${slug.padEnd(30)} skipped (${source || 'no source'})`);
        rejected++;
      } else {
        fs.writeFileSync(filePath, JSON.stringify(feat, null, 2));
        console.log(`\r  ✓ feat:${slug.padEnd(30)} ${feat.name} (${shortSource(feat.source)})`);
        done++;
      }
    } catch(e) {
      console.error(`\r  ✗ feat:${slug.padEnd(30)} ERROR: ${e.message}`);
      errors++;
    }

    await sleep(1000); // 1 req/sec — respectful to wikidot
  }

  console.log(`\n  ✅ Feats: ${done} saved, ${skipped} already existed, ${rejected} unofficial, ${errors} errors`);
}

async function scrapeSubclasses(subclassList) {
  const dir = path.join(EN, 'dnd_subclasses');
  fs.mkdirSync(dir, { recursive: true });

  console.log(`🎭 Scraping ${subclassList.length} subclass pages...`);
  let done = 0, skipped = 0, rejected = 0, errors = 0;

  for (let i = 0; i < subclassList.length; i++) {
    const { slug, className, subSlug } = subclassList[i];
    // Save as className-subSlug.json to match API index conventions
    const fileIndex = slug.replace(':', '-');
    const filePath  = path.join(dir, `${fileIndex}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(3)}/${subclassList.length}  (${skipped} skipped)  ${slug.padEnd(35)}`);
      continue;
    }

    const url = `${WIKIDOT}/${slug}`;
    process.stdout.write(`\r  🎭 ${String(i+1).padStart(3)}/${subclassList.length}  ${slug.padEnd(35)}`);

    try {
      const html = await fetchHTML(url);
      const $    = load(html);
      const sc   = parseSubclass($, fileIndex, className);

      if (!sc) {
        const source = extractSource($, $('#page-content'));
        console.log(`\r  ⚠ ${slug.padEnd(35)} skipped (${source || 'no source'})`);
        rejected++;
      } else {
        fs.writeFileSync(filePath, JSON.stringify(sc, null, 2));
        console.log(`\r  ✓ ${slug.padEnd(35)} ${sc.name} (${shortSource(sc.source)})`);
        done++;
      }
    } catch(e) {
      console.error(`\r  ✗ ${slug.padEnd(35)} ERROR: ${e.message}`);
      errors++;
    }

    await sleep(1000);
  }

  console.log(`\n  ✅ Subclasses: ${done} saved, ${skipped} already existed, ${rejected} unofficial, ${errors} errors`);
}

async function scrapeClasses(classList) {
  const dir = path.join(EN, 'dnd_classes');
  fs.mkdirSync(dir, { recursive: true });

  console.log(`🛡️  Scraping ${classList.length} class pages...`);
  let done = 0, skipped = 0, rejected = 0, errors = 0;

  for (let i = 0; i < classList.length; i++) {
    const { slug } = classList[i];
    // Prefix wikidot_ to not overwrite the API data fetched by fetch_content.js
    const filePath = path.join(dir, `wikidot_${slug}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(2)}/${classList.length}  (${skipped} skipped)  ${slug.padEnd(20)}`);
      continue;
    }

    const url = `${WIKIDOT}/${slug}`;
    process.stdout.write(`\r  🛡️  ${String(i+1).padStart(2)}/${classList.length}  ${slug.padEnd(20)}`);

    try {
      const html = await fetchHTML(url);
      const $    = load(html);
      const cls  = parseClass($, slug);

      if (!cls) {
        const source = extractSource($, $('#page-content'));
        console.log(`\r  ⚠ ${slug.padEnd(20)} skipped (${source || 'no source'})`);
        rejected++;
      } else {
        fs.writeFileSync(filePath, JSON.stringify(cls, null, 2));
        console.log(`\r  ✓ ${slug.padEnd(20)} ${cls.name} (${shortSource(cls.source)})`);
        done++;
      }
    } catch(e) {
      console.error(`\r  ✗ ${slug.padEnd(20)} ERROR: ${e.message}`);
      errors++;
    }

    await sleep(1000);
  }

  console.log(`\n  ✅ Classes: ${done} saved, ${skipped} already existed, ${rejected} unofficial, ${errors} errors`);
}

async function scrapeRaces(raceList) {
  const dir = path.join(EN, 'dnd_races');
  fs.mkdirSync(dir, { recursive: true });

  console.log(`🧝 Scraping ${raceList.length} race pages...`);
  let done = 0, skipped = 0, rejected = 0, errors = 0;

  for (let i = 0; i < raceList.length; i++) {
    const { slug } = raceList[i];
    const filePath = path.join(dir, `wikidot_${slug}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(2)}/${raceList.length}  (${skipped} skipped)  ${slug.padEnd(20)}`);
      continue;
    }

    const url = `${WIKIDOT}/${slug}`;
    process.stdout.write(`\r  🧝 ${String(i+1).padStart(2)}/${raceList.length}  ${slug.padEnd(20)}`);

    try {
      const html = await fetchHTML(url);
      const $    = load(html);
      const race = parseRace($, slug);

      if (!race) {
        const source = extractSource($, $('#page-content'));
        console.log(`\r  ⚠ ${slug.padEnd(20)} skipped (${source || 'no source'})`);
        rejected++;
      } else {
        fs.writeFileSync(filePath, JSON.stringify(race, null, 2));
        console.log(`\r  ✓ ${slug.padEnd(20)} ${race.name} (${shortSource(race.source)})`);
        done++;
      }
    } catch(e) {
      console.error(`\r  ✗ ${slug.padEnd(20)} ERROR: ${e.message}`);
      errors++;
    }

    await sleep(1000);
  }

  console.log(`\n  ✅ Races: ${done} saved, ${skipped} already existed, ${rejected} unofficial, ${errors} errors`);
}

async function scrapeBackgrounds(bgList) {
  const dir = path.join(EN, 'dnd_backgrounds');
  fs.mkdirSync(dir, { recursive: true });

  console.log(`📜 Scraping ${bgList.length} background pages...`);
  let done = 0, skipped = 0, rejected = 0, errors = 0;

  for (let i = 0; i < bgList.length; i++) {
    const { slug } = bgList[i];
    const filePath = path.join(dir, `${slug}.json`);

    if (fs.existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r  ⏭  ${String(i+1).padStart(3)}/${bgList.length}  (${skipped} skipped)  ${slug.padEnd(30)}`);
      continue;
    }

    const url = `${WIKIDOT}/background:${slug}`;
    process.stdout.write(`\r  📜 ${String(i+1).padStart(3)}/${bgList.length}  ${slug.padEnd(30)}`);

    try {
      const html = await fetchHTML(url);
      const $    = load(html);
      const bg   = parseBackground($, slug);

      if (!bg) {
        const source = extractSource($, $('#page-content'));
        console.log(`\r  ⚠ background:${slug.padEnd(25)} skipped (${source || 'no source'})`);
        rejected++;
      } else {
        fs.writeFileSync(filePath, JSON.stringify(bg, null, 2));
        console.log(`\r  ✓ background:${slug.padEnd(25)} ${bg.name} (${shortSource(bg.source)})`);
        done++;
      }
    } catch(e) {
      console.error(`\r  ✗ background:${slug.padEnd(25)} ERROR: ${e.message}`);
      errors++;
    }

    await sleep(1000);
  }

  console.log(`\n  ✅ Backgrounds: ${done} saved, ${skipped} already existed, ${rejected} unofficial, ${errors} errors`);
}

// ── BUNDLE BUILDER ────────────────────────────────────────────────────────────

function buildFeatsBundle() {
  const dir = path.join(EN, 'dnd_feats');
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'))
    : [];

  const feats = files
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; } })
    .filter(Boolean);

  feats.sort((a, b) => a.name.localeCompare(b.name, 'en'));

  fs.writeFileSync(
    path.join(ROOT, 'dnd_db', 'bundle_feats_en.js'),
    `/* D&D 5e Feats — English — generated by scripts/scrape_wikidot.js */\nwindow.DND_FEATS_EN=${JSON.stringify(feats)};`
  );
  console.log(`  📦 dnd_db/bundle_feats_en.js  (${feats.length} feats)`);
}

// ── CACHED SITEMAP (so you can re-run without rescanning everything) ───────────

const SITEMAP_CACHE = path.join(ROOT, 'dnd_db', '_wikidot_sitemap.json');

async function getSitemap() {
  if (fs.existsSync(SITEMAP_CACHE)) {
    console.log('  ℹ️  Using cached sitemap (delete dnd_db/_wikidot_sitemap.json to refresh)');
    return JSON.parse(fs.readFileSync(SITEMAP_CACHE, 'utf8'));
  }
  const hrefs = await discoverPages();
  fs.writeFileSync(SITEMAP_CACHE, JSON.stringify(hrefs, null, 2));
  return hrefs;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  D&D 5e Wikidot Scraper                ║');
  console.log('║  Feats · Subclasses · Classes          ║');
  console.log('║  Races · Backgrounds                   ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('  Rate limited to 1 req/sec. Large runs will take time.');
  console.log('  Safe to interrupt (Ctrl+C) and resume any time.\n');

  // Step 1: Discover all pages
  const hrefs = await getSitemap();
  console.log();

  // Step 2: Categorise
  const { feats, subclasses, classes, races, backgrounds } = categorisePages(hrefs);
  console.log(`  Categorised: ${feats.length} feats, ${subclasses.length} subclasses, ${classes.length} classes, ${races.length} races, ${backgrounds.length} backgrounds\n`);

  // Step 3: Scrape each category
  await scrapeFeats(feats);
  console.log();

  await scrapeSubclasses(subclasses);
  console.log();

  await scrapeClasses(classes);
  console.log();

  await scrapeRaces(races);
  console.log();

  await scrapeBackgrounds(backgrounds);
  console.log();

  // Step 4: Rebuild feat bundle with everything collected
  console.log('📦 Rebuilding feat bundle...');
  buildFeatsBundle();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Terminé !                             ║');
  console.log('║  Fichiers créés dans dnd_db/en/        ║');
  console.log('║  Prochaine étape :                     ║');
  console.log('║    node scripts/rebuild_bundles.js     ║');
  console.log('╚════════════════════════════════════════╝');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
