// Auto-generated bundle script — generates EN and FR D&D 5e SRD bundles
// Run with: node scripts/generate_dnd_bundles.js
// Requires Node 18+ (uses native fetch)

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://www.dnd5eapi.co';
const API_BASE = `${BASE_URL}/api/2014`;
const OUT_DIR = join(__dirname, '..', 'public', 'dnd_db');
const DELAY_MS = 200;

// ─── Translation Maps ────────────────────────────────────────────────────────

const CLASS_NAMES_FR = {
  'Fighter': 'Guerrier',
  'Wizard': 'Magicien',
  'Rogue': 'Roublard',
  'Cleric': 'Clerc',
  'Paladin': 'Paladin',
  'Ranger': 'Rôdeur',
  'Barbarian': 'Barbare',
  'Bard': 'Barde',
  'Druid': 'Druide',
  'Monk': 'Moine',
  'Sorcerer': 'Ensorceleur',
  'Warlock': 'Occultiste',
};

const RACE_NAMES_FR = {
  'Human': 'Humain',
  'Elf': 'Elfe',
  'Dwarf': 'Nain',
  'Halfling': 'Halfelin',
  'Gnome': 'Gnome',
  'Half-Elf': 'Demi-Elfe',
  'Half-Orc': 'Demi-Orc',
  'Tiefling': 'Tiefelin',
  'Dragonborn': 'Drakéide',
};

const ABILITY_NAMES_FR = {
  'Strength': 'Force',
  'Dexterity': 'Dextérité',
  'Constitution': 'Constitution',
  'Intelligence': 'Intelligence',
  'Wisdom': 'Sagesse',
  'Charisma': 'Charisme',
  'STR': 'FOR',
  'DEX': 'DEX',
  'CON': 'CON',
  'INT': 'INT',
  'WIS': 'SAG',
  'CHA': 'CHA',
};

const SUBCLASS_NAMES_FR = {
  'Champion': 'Champion',
  'Battle Master': 'Maître de Bataille',
  'Eldritch Knight': 'Chevalier Occulte',
  'Evocation': 'Évocation',
  'Abjuration': 'Abjuration',
  'Illusion': 'Illusion',
  'Divination': 'Divination',
  'Necromancy': 'Nécromancie',
  'Transmutation': 'Transmutation',
  'Conjuration': 'Invocation',
  'Enchantment': 'Enchantement',
  'Thief': 'Voleur',
  'Assassin': 'Assassin',
  'Arcane Trickster': 'Filou Arcanique',
  'Life': 'Vie',
  'Light': 'Lumière',
  'Trickery': 'Tromperie',
  'Knowledge': 'Connaissance',
  'Nature': 'Nature',
  'Tempest': 'Tempête',
  'War': 'Guerre',
  'Oath of Devotion': 'Serment de Dévotion',
  'Oath of the Ancients': 'Serment des Anciens',
  'Oath of Vengeance': 'Serment de Vengeance',
  'Hunter': 'Chasseur',
  'Beast Master': 'Maître des Bêtes',
  'Path of the Berserker': 'Voie du Berserker',
  'Path of the Totem Warrior': 'Voie du Guerrier Totémique',
  'College of Lore': 'Collège du Savoir',
  'College of Valor': 'Collège de la Vaillance',
  'Circle of the Land': 'Cercle de la Terre',
  'Circle of the Moon': 'Cercle de la Lune',
  'Way of the Open Hand': 'Voie de la Main Ouverte',
  'Way of Shadow': 'Voie de l\'Ombre',
  'Way of the Four Elements': 'Voie des Quatre Éléments',
  'Draconic Bloodline': 'Lignée Draconique',
  'Wild Magic': 'Magie Sauvage',
  'The Fiend': 'Le Démon',
  'The Archfey': 'L\'Archifée',
  'The Great Old One': 'Le Grand Ancien',
};

const PROFICIENCY_NAMES_FR = {
  'Light Armor': 'Armure légère',
  'Medium Armor': 'Armure intermédiaire',
  'Heavy Armor': 'Armure lourde',
  'Shields': 'Boucliers',
  'Simple Weapons': 'Armes simples',
  'Martial Weapons': 'Armes de guerre',
  'Thieves\' Tools': 'Outils de voleur',
  'Disguise Kit': 'Kit de déguisement',
  'Forgery Kit': 'Kit de faussaire',
  'All armor': 'Toutes les armures',
  'Saving Throw: STR': 'Jet de sauvegarde : FOR',
  'Saving Throw: DEX': 'Jet de sauvegarde : DEX',
  'Saving Throw: CON': 'Jet de sauvegarde : CON',
  'Saving Throw: INT': 'Jet de sauvegarde : INT',
  'Saving Throw: WIS': 'Jet de sauvegarde : SAG',
  'Saving Throw: CHA': 'Jet de sauvegarde : CHA',
};

const TRAIT_NAMES_FR = {
  'Darkvision': 'Vision dans le noir',
  'Keen Senses': 'Sens aiguisés',
  'Fey Ancestry': 'Ascendance féerique',
  'Trance': 'Transe',
  'Dwarven Resilience': 'Résilience naine',
  'Stonecunning': 'Connaissance des pierres',
  'Dwarven Combat Training': 'Formation au combat nain',
  'Dwarven Toughness': 'Robustesse naine',
  'Tool Proficiency': 'Maîtrise des outils',
  'Lucky': 'Chanceux',
  'Brave': 'Courageux',
  'Halfling Nimbleness': 'Agilité halfeline',
  'Naturally Stealthy': 'Discrétion naturelle',
  'Gnome Cunning': 'Ruse gnome',
  'Tinker': 'Bricoleur',
  'Artificer\'s Lore': 'Savoir de l\'artificier',
  'Skill Versatility': 'Polyvalence',
  'Languages': 'Langues',
  'Extra Language': 'Langue supplémentaire',
  'Draconic Ancestry': 'Ascendance draconique',
  'Breath Weapon': 'Souffle',
  'Damage Resistance': 'Résistance aux dégâts',
  'Hellish Resistance': 'Résistance infernale',
  'Infernal Legacy': 'Héritage infernal',
  'Menacing': 'Menaçant',
  'Relentless Endurance': 'Endurance implacable',
  'Savage Attacks': 'Attaques sauvages',
  'Skill Proficiency': 'Maîtrise de compétence',
  'Feat': 'Don',
  'Elf Weapon Training': 'Entraînement aux armes elfiques',
  'Cantrip': 'Tour de magie',
  'Elf Weapon Training': 'Entraînement aux armes elfiques',
  'High Elf Cantrip': 'Tour de magie haut-elfe',
};

const BACKGROUND_NAMES_FR = {
  'Acolyte': 'Acolyte',
  'Charlatan': 'Charlatan',
  'Criminal': 'Criminel',
  'Entertainer': 'Artiste',
  'Folk Hero': 'Héros du peuple',
  'Guild Artisan': 'Artisan de guilde',
  'Hermit': 'Ermite',
  'Noble': 'Noble',
  'Outlander': 'Proscrit',
  'Sage': 'Sage',
  'Sailor': 'Marin',
  'Soldier': 'Soldat',
  'Urchin': 'Enfant des rues',
};

const FEAT_NAMES_FR = {
  'Alert': 'Vigilance',
  'Athlete': 'Athlète',
  'Actor': 'Acteur',
  'Charger': 'Chargeur',
  'Crossbow Expert': 'Expert en arbalète',
  'Defensive Duelist': 'Duelliste défensif',
  'Dual Wielder': 'Combattant à deux armes',
  'Dungeon Delver': 'Explorateur de donjons',
  'Durable': 'Résistant',
  'Elemental Adept': 'Adepte élémentaire',
  'Grappler': 'Lutteur',
  'Great Weapon Master': 'Maître des armes à deux mains',
  'Healer': 'Guérisseur',
  'Heavily Armored': 'Lourdement blindé',
  'Heavy Armor Master': 'Maître de l\'armure lourde',
  'Inspiring Leader': 'Chef inspirant',
  'Keen Mind': 'Esprit vif',
  'Lightly Armored': 'Légèrement blindé',
  'Linguist': 'Linguiste',
  'Lucky': 'Chanceux',
  'Mage Slayer': 'Tueur de mages',
  'Magic Initiate': 'Initié à la magie',
  'Martial Adept': 'Adepte martial',
  'Medium Armor Master': 'Maître de l\'armure intermédiaire',
  'Mobile': 'Mobile',
  'Moderately Armored': 'Modérément blindé',
  'Mounted Combatant': 'Combattant monté',
  'Observant': 'Observateur',
  'Polearm Master': 'Maître de la perche',
  'Resilient': 'Résilient',
  'Ritual Caster': 'Lanceur de rituels',
  'Savage Attacker': 'Attaquant sauvage',
  'Sentinel': 'Sentinelle',
  'Sharpshooter': 'Tireur d\'élite',
  'Shield Master': 'Maître du bouclier',
  'Skilled': 'Qualifié',
  'Skulker': 'Rôdeur furtif',
  'Spell Sniper': 'Sniper de sorts',
  'Tavern Brawler': 'Bagarreur de taverne',
  'Tough': 'Robuste',
  'War Caster': 'Lanceur de sorts guerrier',
  'Weapon Master': 'Maître des armes',
};

const SIZE_NAMES_FR = {
  'Small': 'Petite',
  'Medium': 'Moyenne',
  'Large': 'Grande',
  'Tiny': 'Très petite',
  'Huge': 'Très grande',
  'Gargantuan': 'Gargantuesque',
};

const ALIGNMENT_NAMES_FR = {
  'Lawful Good': 'Loyal Bon',
  'Neutral Good': 'Neutre Bon',
  'Chaotic Good': 'Chaotique Bon',
  'Lawful Neutral': 'Loyal Neutre',
  'True Neutral': 'Vrai Neutre',
  'Chaotic Neutral': 'Chaotique Neutre',
  'Lawful Evil': 'Loyal Mauvais',
  'Neutral Evil': 'Neutre Mauvais',
  'Chaotic Evil': 'Chaotique Mauvais',
  'Any Alignment': 'N\'importe quel alignement',
  'Any Non-Lawful Alignment': 'N\'importe quel alignement non-loyal',
  'Any Non-Good Alignment': 'N\'importe quel alignement non-bon',
};

const LANGUAGE_NAMES_FR = {
  'Common': 'Commun',
  'Elvish': 'Elfique',
  'Dwarvish': 'Nain',
  'Halfling': 'Halfelin',
  'Gnomish': 'Gnome',
  'Draconic': 'Draconique',
  'Infernal': 'Infernal',
  'Orc': 'Orc',
  'Giant': 'Géant',
  'Goblin': 'Gobelin',
  'Abyssal': 'Abyssal',
  'Celestial': 'Céleste',
  'Deep Speech': 'Langue des profondeurs',
  'Primordial': 'Primordial',
  'Sylvan': 'Sylvain',
  'Undercommon': 'Commun des profondeurs',
};

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

function translateName(name, map) {
  return map[name] || name;
}

function translateList(list, map) {
  if (!Array.isArray(list)) return list;
  return list.map(item => {
    if (typeof item === 'string') return map[item] || item;
    if (item && typeof item === 'object' && item.name) {
      return { ...item, name: map[item.name] || item.name };
    }
    return item;
  });
}

// ─── Caster type per class (for multiclassing spell slot calculation) ─────────
// full=1, half=0.5, third=0.333, warlock=special, null=non-caster
const CASTER_TYPE = {
  bard: 'full', cleric: 'full', druid: 'full', sorcerer: 'full', wizard: 'full',
  paladin: 'half', ranger: 'half',
  fighter: 'third',  // only Eldritch Knight, but stored at class level for simplicity
  rogue: 'third',    // only Arcane Trickster
  warlock: 'warlock',
  barbarian: null, monk: null,
};

// Multiclassing spell slots table (PHB p.165, SRD)
// index = combined_caster_level - 1, value = array of slots for spell levels 1-9
const MULTICLASS_SLOTS = [
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],
  [4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1],
  [4,3,3,3,3,2,2,1,1],
];

// ─── Classes ─────────────────────────────────────────────────────────────────

// Global features cache to avoid duplicate fetches
const featuresCache = {};

async function fetchFeature(url) {
  if (featuresCache[url]) return featuresCache[url];
  await delay(100);
  try {
    const f = await apiFetch(url);
    const result = {
      index: f.index,
      name: f.name,
      desc: Array.isArray(f.desc) ? f.desc : (f.desc ? [f.desc] : []),
    };
    featuresCache[url] = result;
    return result;
  } catch {
    return null;
  }
}

async function fetchClasses() {
  console.log('\n[Classes] Fetching index...');
  const index = await apiFetch('/api/2014/classes');
  const classes = [];

  for (const entry of index.results) {
    console.log(`  Fetching class: ${entry.name}`);
    await delay(DELAY_MS);
    const detail = await apiFetch(entry.url);

    // ── Levels with full feature descriptions ──
    await delay(DELAY_MS);
    let levels = [];
    try {
      const levelsData = await apiFetch(`/api/2014/classes/${entry.index}/levels`);
      for (const l of levelsData) {
        const features = [];
        for (const f of (l.features || [])) {
          const feat = await fetchFeature(f.url);
          if (feat) features.push(feat);
        }
        levels.push({
          level: l.level,
          prof_bonus: l.prof_bonus,
          ability_score_bonuses: l.ability_score_bonuses || 0,
          features,
          spellcasting: l.spellcasting || null,
          class_specific: l.class_specific || null,
        });
      }
      console.log(`    Levels fetched (${levels.length})`);
    } catch (e) {
      console.warn(`    Warning: could not fetch levels for ${entry.name}: ${e.message}`);
    }

    // ── Subclasses with full details + levels ──
    await delay(DELAY_MS);
    const subclasses = [];
    try {
      const scList = await apiFetch(`/api/2014/classes/${entry.index}/subclasses`);
      for (const scRef of (scList.results || [])) {
        console.log(`    Subclass: ${scRef.name}`);
        await delay(DELAY_MS);
        const sc = await apiFetch(scRef.url);

        // Subclass levels
        await delay(DELAY_MS);
        let scLevels = [];
        try {
          const scLevelsData = await apiFetch(`/api/2014/subclasses/${scRef.index}/levels`);
          for (const l of scLevelsData) {
            const features = [];
            for (const f of (l.features || [])) {
              const feat = await fetchFeature(f.url);
              if (feat) features.push(feat);
            }
            scLevels.push({
              level: l.level,
              features,
              spellcasting: l.spellcasting || null,
            });
          }
        } catch {}

        subclasses.push({
          index: sc.index,
          name: sc.name,
          subclass_flavor: sc.subclass_flavor || '',
          desc: Array.isArray(sc.desc) ? sc.desc : (sc.desc ? [sc.desc] : []),
          levels: scLevels,
        });
      }
    } catch (e) {
      console.warn(`    Warning: could not fetch subclasses for ${entry.name}: ${e.message}`);
    }

    // ── Multiclassing ──
    const mc = detail.multi_classing || {};
    const multiclassing = {
      prerequisites: (mc.prerequisites || []).map(p => ({
        ability: p.ability_score?.name || '',
        minimum: p.minimum_score || 0,
      })),
      proficiencies_gained: (mc.proficiencies || []).map(p => p.name),
      proficiency_choices: (mc.proficiency_choices || []).map(pc => ({
        choose: pc.choose,
        from: (pc.from?.options || []).map(o => o.item?.name || '').filter(Boolean),
      })),
    };

    classes.push({
      index: detail.index,
      name: detail.name,
      hit_die: detail.hit_die,
      caster_type: CASTER_TYPE[detail.index] || null,
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
        info: (detail.spellcasting.info || []).map(i => ({ name: i.name, desc: i.desc })),
      } : null,
      multiclassing,
      subclasses,
      levels,
      // Embed multiclass slots table for convenience
      multiclass_slots_table: MULTICLASS_SLOTS,
    });
  }

  return classes;
}

function translateClasses(classes) {
  function translateFeature(f) {
    return { ...f, name: SUBCLASS_NAMES_FR[f.name] || f.name };
  }
  function translateLevel(l) {
    return { ...l, features: (l.features || []).map(translateFeature) };
  }

  return classes.map(cls => ({
    ...cls,
    name: translateName(cls.name, CLASS_NAMES_FR),
    name_en: cls.name,
    saving_throws: cls.saving_throws.map(st => ABILITY_NAMES_FR[st] || st),
    spellcasting: cls.spellcasting ? {
      ...cls.spellcasting,
      ability: ABILITY_NAMES_FR[cls.spellcasting.ability] || cls.spellcasting.ability,
    } : null,
    multiclassing: {
      ...cls.multiclassing,
      prerequisites: cls.multiclassing.prerequisites.map(p => ({
        ...p,
        ability: ABILITY_NAMES_FR[p.ability] || p.ability,
      })),
    },
    levels: cls.levels.map(translateLevel),
    subclasses: cls.subclasses.map(sc => ({
      ...sc,
      name: translateName(sc.name, SUBCLASS_NAMES_FR),
      name_en: sc.name,
      levels: sc.levels.map(translateLevel),
    })),
  }));
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

    // Fetch each subrace inline
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

function translateRaces(races) {
  return races.map(race => ({
    ...race,
    name: translateName(race.name, RACE_NAMES_FR),
    name_en: race.name,
    size: SIZE_NAMES_FR[race.size] || race.size,
    ability_bonuses: race.ability_bonuses.map(ab => ({
      ...ab,
      ability_score: ABILITY_NAMES_FR[ab.ability_score] || ab.ability_score,
    })),
    ability_bonus_options: race.ability_bonus_options ? {
      ...race.ability_bonus_options,
      from: race.ability_bonus_options.from.map(o => ({
        ...o,
        ability_score: ABILITY_NAMES_FR[o.ability_score] || o.ability_score,
      })),
    } : null,
    traits: race.traits.map(t => TRAIT_NAMES_FR[t] || t),
    languages: race.languages.map(l => LANGUAGE_NAMES_FR[l] || l),
    subraces: race.subraces.map(sr => ({
      ...sr,
      name: translateName(sr.name, RACE_NAMES_FR),
      name_en: sr.name,
      ability_bonuses: (sr.ability_bonuses || []).map(ab => ({
        ...ab,
        ability_score: ABILITY_NAMES_FR[ab.ability_score] || ab.ability_score,
      })),
      racial_traits: (sr.racial_traits || []).map(t => TRAIT_NAMES_FR[t] || t),
      languages: (sr.languages || []).map(l => LANGUAGE_NAMES_FR[l] || l),
    })),
  }));
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

function translateFeats(feats) {
  return feats.map(feat => ({
    ...feat,
    name: translateName(feat.name, FEAT_NAMES_FR),
    name_en: feat.name,
    prerequisites: feat.prerequisites.map(p => ({
      ...p,
      ability_score: p.ability_score ? (ABILITY_NAMES_FR[p.ability_score] || p.ability_score) : null,
    })),
  }));
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

function translateBackgrounds(backgrounds) {
  return backgrounds.map(bg => ({
    ...bg,
    name: translateName(bg.name, BACKGROUND_NAMES_FR),
    name_en: bg.name,
    starting_proficiencies: bg.starting_proficiencies.map(p => PROFICIENCY_NAMES_FR[p] || p),
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('D&D 5e SRD Bundle Generator');
  console.log(`Node version: ${process.version}`);
  console.log(`Output directory: ${OUT_DIR}`);
  console.log(`API base: ${API_BASE}`);
  console.log('---');

  ensureDir(OUT_DIR);

  // ── Classes ──
  const classesEN = await fetchClasses();
  writeBundle('bundle_classes_en.js', 'DND_CLASSES_EN', classesEN);
  const classesFR = translateClasses(classesEN);
  writeBundle('bundle_classes_fr.js', 'DND_CLASSES_FR', classesFR);

  // ── Races ──
  const racesEN = await fetchRaces();
  writeBundle('bundle_races_en.js', 'DND_RACES_EN', racesEN);
  const racesFR = translateRaces(racesEN);
  writeBundle('bundle_races_fr.js', 'DND_RACES_FR', racesFR);

  // ── Feats ──
  const featsEN = await fetchFeats();
  writeBundle('bundle_feats_en.js', 'DND_FEATS_EN', featsEN);
  const featsFR = translateFeats(featsEN);
  writeBundle('bundle_feats_fr.js', 'DND_FEATS_FR', featsFR);

  // ── Backgrounds ──
  const backgroundsEN = await fetchBackgrounds();
  writeBundle('bundle_backgrounds_en.js', 'DND_BACKGROUNDS_EN', backgroundsEN);
  const backgroundsFR = translateBackgrounds(backgroundsEN);
  writeBundle('bundle_backgrounds_fr.js', 'DND_BACKGROUNDS_FR', backgroundsFR);

  console.log('\nAll bundles generated successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
