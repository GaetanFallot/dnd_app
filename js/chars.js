// ── Character management ──────────────────────────────────────────────────────

const DND_CLASSES = {
  barbarian:  { name:'Barbare',       icon:'⚔️',  type:'martial',   hd:12, spellType:null },
  bard:       { name:'Barde',         icon:'🎵',  type:'full',      hd:8,  spellType:'full' },
  cleric:     { name:'Clerc',         icon:'✝️',  type:'full',      hd:8,  spellType:'full' },
  druid:      { name:'Druide',        icon:'🌿',  type:'full',      hd:8,  spellType:'full' },
  fighter:    { name:'Guerrier',      icon:'🛡️',  type:'martial',   hd:10, spellType:null },
  monk:       { name:'Moine',         icon:'👊',  type:'martial',   hd:8,  spellType:null },
  paladin:    { name:'Paladin',       icon:'⚡',  type:'half',      hd:10, spellType:'half' },
  ranger:     { name:'Rôdeur',        icon:'🏹',  type:'half',      hd:10, spellType:'half' },
  rogue:      { name:'Roublard',      icon:'🗡️',  type:'martial',   hd:8,  spellType:null },
  sorcerer:   { name:'Ensorceleur',   icon:'✨',  type:'full',      hd:6,  spellType:'full' },
  warlock:    { name:'Occultiste',    icon:'👁️',  type:'warlock',   hd:8,  spellType:'warlock' },
  wizard:     { name:'Magicien',      icon:'📖',  type:'full',      hd:6,  spellType:'full' },
  artificer:  { name:'Artificier',    icon:'⚙️',  type:'half',      hd:8,  spellType:'half' },
  _full:      { name:'Lanceur de sorts (full)', icon:'🌟', type:'full',    hd:8, spellType:'full' },
  _half:      { name:'Mi-lanceur (paladin/artificier)', icon:'⚡', type:'half', hd:10, spellType:'half' },
  _martial:   { name:'Martial',       icon:'⚔️',  type:'martial',   hd:10, spellType:null },
};

// Full caster slots [level][spellLevel-1] (indices 1..20, 0 unused)
const SPELL_SLOTS_FULL = [
  null,
  [2,0,0,0,0,0,0,0,0], // 1
  [3,0,0,0,0,0,0,0,0], // 2
  [4,2,0,0,0,0,0,0,0], // 3
  [4,3,0,0,0,0,0,0,0], // 4
  [4,3,2,0,0,0,0,0,0], // 5
  [4,3,3,0,0,0,0,0,0], // 6
  [4,3,3,1,0,0,0,0,0], // 7
  [4,3,3,2,0,0,0,0,0], // 8
  [4,3,3,3,1,0,0,0,0], // 9
  [4,3,3,3,2,0,0,0,0], // 10
  [4,3,3,3,2,1,0,0,0], // 11
  [4,3,3,3,2,1,0,0,0], // 12
  [4,3,3,3,2,1,1,0,0], // 13
  [4,3,3,3,2,1,1,0,0], // 14
  [4,3,3,3,2,1,1,1,0], // 15
  [4,3,3,3,2,1,1,1,0], // 16
  [4,3,3,3,2,1,1,1,1], // 17
  [4,3,3,3,3,1,1,1,1], // 18
  [4,3,3,3,3,2,1,1,1], // 19
  [4,3,3,3,3,2,2,1,1], // 20
];

// Half caster (Paladin/Ranger/Artificer) — starts at level 2
const SPELL_SLOTS_HALF = [
  null,
  [0,0,0,0,0,0,0,0,0], // 1 — no slots
  [2,0,0,0,0,0,0,0,0], // 2
  [3,0,0,0,0,0,0,0,0], // 3
  [3,0,0,0,0,0,0,0,0], // 4
  [4,2,0,0,0,0,0,0,0], // 5
  [4,2,0,0,0,0,0,0,0], // 6
  [4,3,0,0,0,0,0,0,0], // 7
  [4,3,0,0,0,0,0,0,0], // 8
  [4,3,2,0,0,0,0,0,0], // 9
  [4,3,2,0,0,0,0,0,0], // 10
  [4,3,3,0,0,0,0,0,0], // 11
  [4,3,3,0,0,0,0,0,0], // 12
  [4,3,3,1,0,0,0,0,0], // 13
  [4,3,3,1,0,0,0,0,0], // 14
  [4,3,3,2,0,0,0,0,0], // 15
  [4,3,3,2,0,0,0,0,0], // 16
  [4,3,3,3,1,0,0,0,0], // 17
  [4,3,3,3,1,0,0,0,0], // 18
  [4,3,3,3,2,0,0,0,0], // 19
  [4,3,3,3,2,0,0,0,0], // 20
];

// Warlock pact magic {slots, level} per character level
const SPELL_SLOTS_WARLOCK = [
  null,
  {s:1,l:1},{s:2,l:1},{s:2,l:2},{s:2,l:2},{s:2,l:3},
  {s:2,l:3},{s:2,l:4},{s:2,l:4},{s:2,l:5},{s:2,l:5},
  {s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},
  {s:3,l:5},{s:4,l:5},{s:4,l:5},{s:4,l:5},{s:4,l:5},
];

const DND_SKILLS = [
  {name:'Acrobaties',         ability:'dex'},
  {name:'Arcanes',            ability:'int'},
  {name:'Athlétisme',         ability:'str'},
  {name:'Discrétion',         ability:'dex'},
  {name:'Dressage',           ability:'wis'},
  {name:'Escamotage',         ability:'dex'},
  {name:'Histoire',           ability:'int'},
  {name:'Intimidation',       ability:'cha'},
  {name:'Investigation',      ability:'int'},
  {name:'Médecine',           ability:'wis'},
  {name:'Nature',             ability:'int'},
  {name:'Perception',         ability:'wis'},
  {name:'Perspicacité',       ability:'wis'},
  {name:'Persuasion',         ability:'cha'},
  {name:'Religion',           ability:'int'},
  {name:'Représentation',     ability:'cha'},
  {name:'Survie',             ability:'wis'},
  {name:'Tromperie',          ability:'cha'},
];

function _getSpellSlots(spellType, level) {
  const lv = Math.max(1, Math.min(20, level || 1));
  if (spellType === 'warlock') {
    const w = SPELL_SLOTS_WARLOCK[lv];
    if (!w) return {};
    const out = {};
    out[w.l] = { max: w.s, used: 0 };
    return out;
  }
  const table = spellType === 'half' ? SPELL_SLOTS_HALF : SPELL_SLOTS_FULL;
  const row = table[lv];
  if (!row) return {};
  const out = {};
  row.forEach((max, i) => { if (max > 0) out[i + 1] = { max, used: 0 }; });
  return out;
}

function _profBonus(level) { return Math.ceil(level / 4) + 1; }
function _mod(score) { return Math.floor((score - 10) / 2); }
function _modStr(score) { const m = _mod(score); return (m >= 0 ? '+' : '') + m; }

// ── Persistence ───────────────────────────────────────────────────────────────
let dmChars = [];
try { dmChars = JSON.parse(localStorage.getItem('dmChars') || '[]'); } catch(e) { dmChars = []; }

function _saveChars() {
  localStorage.setItem('dmChars', JSON.stringify(dmChars));
}

async function _dbSaveChar(c) {
  if (!window._dbDir) return;
  try {
    const fh = await window._dbDir.getFileHandle('char_' + c.id + '.json', { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify(c, null, 2));
    await w.close();
  } catch(e) { console.warn('DB save char', e); }
}

async function _dbDeleteChar(id) {
  if (!window._dbDir) return;
  try { await window._dbDir.removeEntry('char_' + id + '.json'); } catch(e) {}
}

// ── Render dock ───────────────────────────────────────────────────────────────
function renderCharDock() {
  const list = document.getElementById('charList');
  if (!list) return;
  const countEl = document.getElementById('charDockCount');
  if (countEl) countEl.textContent = dmChars.length;
  list.innerHTML = '';
  dmChars.forEach(c => {
    const cls = DND_CLASSES[c.classId] || DND_CLASSES._martial;
    const pct = c.maxHp > 0 ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 100;
    const hpClass = pct <= 0 ? 'dead' : pct <= 25 ? 'critical' : pct <= 50 ? 'wounded' : '';
    const div = document.createElement('div');
    div.className = 'char-chip' + (c._expanded ? ' expanded' : '');
    div.dataset.id = c.id;
    div.innerHTML = `
      <div class="chip-header" onclick="toggleCharExpand('${c.id}')">
        <span class="char-class-icon">${cls.icon}</span>
        <span class="chip-name">${c.name}</span>
        <span class="chip-sub">${cls.name} niv.${c.level}</span>
        <span class="chip-hp-badge ${hpClass}">${c.currentHp}/${c.maxHp}</span>
      </div>
      <div class="chip-hp-row">
        <button class="chip-hp-btn wide" onclick="updateCharHp('${c.id}',-10)">-10</button>
        <button class="chip-hp-btn" onclick="updateCharHp('${c.id}',-5)">-5</button>
        <button class="chip-hp-btn" onclick="updateCharHp('${c.id}',-1)">-1</button>
        <input class="chip-hp-input" type="number" value="${c.currentHp}"
               onchange="setCharHp('${c.id}',+this.value)" onclick="event.stopPropagation()">
        <button class="chip-hp-btn" onclick="updateCharHp('${c.id}',+1)">+1</button>
        <button class="chip-hp-btn" onclick="updateCharHp('${c.id}',+5)">+5</button>
        <button class="chip-hp-btn wide" onclick="updateCharHp('${c.id}',+10)">+10</button>
        <button class="chip-init-btn" onclick="addCharToInit('${c.id}')">⚔️ Init</button>
      </div>
      ${c._expanded ? _renderCharExpanded(c, cls) : ''}
      <div class="chip-actions">
        <button onclick="openCharSheet('${c.id}')">✏️ Fiche</button>
        <button onclick="_deleteChar('${c.id}')">🗑️</button>
      </div>`;
    list.appendChild(div);
  });
}

function _renderCharExpanded(c, cls) {
  const pb = _profBonus(c.level);
  const stats = ['str','dex','con','int','wis','cha'];
  const statLabels = {str:'FOR',dex:'DEX',con:'CON',int:'INT',wis:'SAG',cha:'CHA'};
  const statsHtml = stats.map(s =>
    `<span class="chip-stat"><b>${statLabels[s]}</b><br>${c.stats[s]||10}<br>(${_modStr(c.stats[s]||10)})</span>`
  ).join('');
  const savesHtml = stats.map(s => {
    const prof = (c.savingThrows||[]).includes(s);
    const val = _mod(c.stats[s]||10) + (prof ? pb : 0);
    return `<span class="chip-save ${prof?'prof':''}">${statLabels[s]} ${val>=0?'+':''}${val}</span>`;
  }).join('');
  const skillsHtml = DND_SKILLS.map(sk => {
    const prof = (c.skills||[]).includes(sk.name);
    const val = _mod(c.stats[sk.ability]||10) + (prof ? pb : 0);
    return `<span class="chip-skill ${prof?'prof':''}">${sk.name} ${val>=0?'+':''}${val}</span>`;
  }).join('');

  let slotsHtml = '';
  if (cls.spellType) {
    const slots = c.spellSlots || _getSpellSlots(cls.spellType, c.level);
    slotsHtml = '<div class="chip-section">Emplacements de sorts</div><div class="chip-slots">';
    Object.entries(slots).forEach(([lvl, sl]) => {
      const dots = Array.from({length: sl.max}, (_,i) =>
        `<span class="slot-dot ${i < sl.used ? 'used':''}"
              onclick="event.stopPropagation();_chipToggleSlot('${c.id}',${lvl},${i})"></span>`
      ).join('');
      slotsHtml += `<span class="chip-slot-row">Niv ${lvl}: ${dots}</span>`;
    });
    slotsHtml += '</div>';
  }

  return `<div class="chip-expanded-body">
    <div class="chip-section">Stats &nbsp; <span class="chip-pb">Bonus de maîtrise: +${pb}</span></div>
    <div class="chip-stats-row">${statsHtml}</div>
    <div class="chip-section">Jets de sauvegarde</div>
    <div class="chip-saves-row">${savesHtml}</div>
    <div class="chip-section">Compétences</div>
    <div class="chip-skills-grid">${skillsHtml}</div>
    ${slotsHtml}
    ${c.features && c.features.length ? `<div class="chip-section">Traits</div><div class="chip-features">${c.features.map(f=>`<div><b>${f.name}</b>: ${f.desc}</div>`).join('')}</div>` : ''}
  </div>`;
}

function toggleCharDock() {
  const body = document.getElementById('charDockBody');
  if (!body) return;
  body.style.display = body.style.display === 'none' ? '' : 'none';
}

function toggleCharExpand(id) {
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c._expanded = !c._expanded;
  renderCharDock();
}

function updateCharHp(id, delta) {
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.currentHp = Math.max(0, Math.min(c.maxHp, (c.currentHp || 0) + delta));
  _saveChars(); _dbSaveChar(c); renderCharDock();
}

function setCharHp(id, val) {
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.currentHp = Math.max(0, Math.min(c.maxHp, Math.round(val)));
  _saveChars(); _dbSaveChar(c); renderCharDock();
}

function addCharToInit(id) {
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  const dexMod = _mod(c.stats.dex || 10);
  const roll = Math.ceil(Math.random() * 20) + dexMod;
  addCombatant({ name: c.name, initiative: roll, isChar: true });
}

function _chipToggleSlot(id, lvl, idx) {
  const c = dmChars.find(x => x.id === id);
  if (!c || !c.spellSlots) return;
  const sl = c.spellSlots[lvl];
  if (!sl) return;
  sl.used = (sl.used === idx + 1) ? idx : idx + 1;
  _saveChars(); _dbSaveChar(c); renderCharDock();
}

function _deleteChar(id) {
  if (!confirm('Supprimer ce personnage ?')) return;
  dmChars = dmChars.filter(x => x.id !== id);
  _saveChars(); _dbDeleteChar(id); renderCharDock();
}

// ── Creation wizard ───────────────────────────────────────────────────────────
function newCharWizard() {
  const modal = document.getElementById('charWizardModal');
  if (!modal) return;
  const step1 = document.getElementById('cwStep1');
  const step2 = document.getElementById('cwStep2');
  step1.style.display = '';
  step2.style.display = 'none';

  const grid = document.getElementById('cwClassGrid');
  grid.innerHTML = '';
  const custom = ['_full','_half','_martial'];
  const main = Object.keys(DND_CLASSES).filter(k => !custom.includes(k));
  [...main, ...custom].forEach(k => {
    const cls = DND_CLASSES[k];
    const btn = document.createElement('button');
    btn.className = 'cw-class-btn';
    btn.innerHTML = `<span class="cw-class-icon">${cls.icon}</span><span>${cls.name}</span>`;
    btn.onclick = () => charWizardStep2(k);
    grid.appendChild(btn);
  });

  modal.style.display = 'flex';
}

function charWizardStep2(classId) {
  const cls = DND_CLASSES[classId];
  document.getElementById('cwStep1').style.display = 'none';
  const step2 = document.getElementById('cwStep2');
  step2.style.display = '';
  document.getElementById('cwStep2Title').textContent = cls.icon + ' ' + cls.name;
  document.getElementById('cwClassIdInput').value = classId;
  // reset
  ['cwName','cwLevel','cwMaxHp','cwStr','cwDex','cwCon','cwInt','cwWis','cwCha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'cwLevel' ? '1' : '';
  });
  document.querySelectorAll('.cw-saves input, .cw-skills input').forEach(cb => cb.checked = false);
  // render saves
  const savesDiv = document.getElementById('cwSaves');
  savesDiv.innerHTML = ['str','dex','con','int','wis','cha'].map(s =>
    `<label><input type="checkbox" name="cwSave" value="${s}"> ${s.toUpperCase()}</label>`
  ).join('');
  // render skills
  const skillsDiv = document.getElementById('cwSkills');
  skillsDiv.innerHTML = DND_SKILLS.map(sk =>
    `<label><input type="checkbox" name="cwSkill" value="${sk.name}"> ${sk.name}</label>`
  ).join('');
}

function charWizardCreate() {
  const classId = document.getElementById('cwClassIdInput').value;
  const cls = DND_CLASSES[classId];
  const name = document.getElementById('cwName').value.trim() || cls.name;
  const level = parseInt(document.getElementById('cwLevel').value) || 1;
  const maxHp = parseInt(document.getElementById('cwMaxHp').value) || (cls.hd + _mod(parseInt(document.getElementById('cwCon').value)||10));
  const stats = {
    str: parseInt(document.getElementById('cwStr').value) || 10,
    dex: parseInt(document.getElementById('cwDex').value) || 10,
    con: parseInt(document.getElementById('cwCon').value) || 10,
    int: parseInt(document.getElementById('cwInt').value) || 10,
    wis: parseInt(document.getElementById('cwWis').value) || 10,
    cha: parseInt(document.getElementById('cwCha').value) || 10,
  };
  const savingThrows = [...document.querySelectorAll('input[name="cwSave"]:checked')].map(el => el.value);
  const skills = [...document.querySelectorAll('input[name="cwSkill"]:checked')].map(el => el.value);

  const id = 'c' + Date.now();
  const spellSlots = cls.spellType ? _getSpellSlots(cls.spellType, level) : {};
  const c = {
    id, classId, name, level, maxHp, currentHp: maxHp,
    stats, savingThrows, skills, spellSlots,
    spells: [], attacks: [], equipment: [], features: [],
    notes: '', _expanded: false,
  };

  dmChars.push(c);
  _saveChars();
  _dbSaveChar(c);
  renderCharDock();
  closeCharWizard();
}

function closeCharWizard() {
  const modal = document.getElementById('charWizardModal');
  if (modal) modal.style.display = 'none';
}

// ── Character sheet modal ─────────────────────────────────────────────────────
function openCharSheet(id) {
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  const cls = DND_CLASSES[c.classId] || DND_CLASSES._martial;
  const modal = document.getElementById('charSheetModal');
  document.getElementById('csContent').innerHTML = _renderCharSheetModal(c, cls);
  modal.style.display = 'flex';
  modal.dataset.id = id;
}

function closeCharSheet() {
  document.getElementById('charSheetModal').style.display = 'none';
}

function _renderCharSheetModal(c, cls) {
  const pb = _profBonus(c.level);
  const stats = ['str','dex','con','int','wis','cha'];
  const statLabels = {str:'FOR',dex:'DEX',con:'CON',int:'INT',wis:'SAG',cha:'CHA'};

  const statsHtml = stats.map(s => `
    <div class="cs-stat-box">
      <div class="cs-stat-label">${statLabels[s]}</div>
      <input class="cs-stat-input" type="number" id="cs_stat_${s}" value="${c.stats[s]||10}" min="1" max="30" oninput="_csRecalc()">
      <div class="cs-stat-mod" id="cs_mod_${s}">${_modStr(c.stats[s]||10)}</div>
    </div>`).join('');

  const savesHtml = stats.map(s => {
    const prof = (c.savingThrows||[]).includes(s);
    const val = _mod(c.stats[s]||10) + (prof ? pb : 0);
    return `<label class="cs-check-row">
      <input type="checkbox" ${prof?'checked':''} data-save="${s}" onchange="_csAutoSave()">
      <span id="cs_save_${s}" class="cs-check-val">${val>=0?'+':''}${val}</span>
      ${statLabels[s]}</label>`;
  }).join('');

  const skillsHtml = DND_SKILLS.map(sk => {
    const prof = (c.skills||[]).includes(sk.name);
    const val = _mod(c.stats[sk.ability]||10) + (prof ? pb : 0);
    return `<label class="cs-check-row">
      <input type="checkbox" ${prof?'checked':''} data-skill="${sk.name}" data-ability="${sk.ability}" onchange="_csAutoSave()">
      <span id="cs_skill_${sk.name.replace(/\s/g,'_')}" class="cs-check-val">${val>=0?'+':''}${val}</span>
      ${sk.name}</label>`;
  }).join('');

  let slotsHtml = '';
  if (cls.spellType) {
    const slots = c.spellSlots || _getSpellSlots(cls.spellType, c.level);
    slotsHtml = '<div class="cs-section">Emplacements de sorts</div><div class="cs-slots-grid">';
    Object.entries(slots).forEach(([lvl, sl]) => {
      const dots = Array.from({length: sl.max}, (_,i) =>
        `<span class="cs-slot-dot ${i < sl.used ? 'used':''}" onclick="_csToggleSlotDot(${lvl},${i},${sl.max})"></span>`
      ).join('');
      slotsHtml += `<div class="cs-slot-row"><span class="cs-slot-label">Niv ${lvl}</span>${dots}
        <button class="cs-reset-slot" onclick="_csResetSlots(${lvl})">↺</button></div>`;
    });
    slotsHtml += '</div>';

    const spellsHtml = (c.spells||[]).map((sp,i) => _renderSpellItem(sp,i)).join('');
    slotsHtml += `<div class="cs-section">Sorts <button class="cs-add-btn" onclick="_csAddSpell()">+ Sort</button></div>
      <div id="cs_spells">${spellsHtml}</div>`;
  }

  const attacksHtml = (c.attacks||[]).map((a,i) => _renderAttackRow(a,i)).join('');
  const equipHtml   = (c.equipment||[]).map((e,i) => _renderEquipItem(e,i)).join('');
  const featHtml    = (c.features||[]).map((f,i) => _renderFeatureItem(f,i)).join('');

  return `
    <div class="cs-top-bar">
      <input class="cs-name-input" id="cs_name" value="${c.name}" oninput="_csAutoSave()">
      <span class="cs-class-lbl">${cls.icon} ${cls.name}</span>
      <label>Niveau <input type="number" id="cs_level" value="${c.level}" min="1" max="20" style="width:3em" oninput="_csRecalc()"></label>
      <label>PV Max <input type="number" id="cs_maxhp" value="${c.maxHp}" style="width:4em" oninput="_csAutoSave()"></label>
      <label>PV actuels <input type="number" id="cs_hp" value="${c.currentHp}" style="width:4em" oninput="_csAutoSave()"></label>
      <label>CA <input type="number" id="cs_ac" value="${c.ac||10}" style="width:3em" oninput="_csAutoSave()"></label>
      <span id="cs_pb_display">Maîtrise: +${pb}</span>
    </div>
    <div class="cs-columns">
      <div class="cs-col-left">
        <div class="cs-section">Caractéristiques</div>
        <div class="cs-stats-row">${statsHtml}</div>
        <div class="cs-section">Jets de sauvegarde</div>
        <div class="cs-saves-col">${savesHtml}</div>
        <div class="cs-section">Compétences</div>
        <div class="cs-skills-col">${skillsHtml}</div>
      </div>
      <div class="cs-col-right">
        ${slotsHtml}
        <div class="cs-section">Attaques <button class="cs-add-btn" onclick="_csAddAttack()">+ Attaque</button></div>
        <div id="cs_attacks">${attacksHtml}</div>
        <div class="cs-section">Équipement <button class="cs-add-btn" onclick="_csAddEquip()">+ Item</button></div>
        <div id="cs_equip">${equipHtml}</div>
        <div class="cs-section">Traits & capacités <button class="cs-add-btn" onclick="_csAddFeature()">+ Trait</button></div>
        <div id="cs_features">${featHtml}</div>
        <div class="cs-section">Notes</div>
        <textarea id="cs_notes" class="cs-notes" oninput="_csAutoSave()">${c.notes||''}</textarea>
      </div>
    </div>`;
}

function _renderSpellItem(sp, i) {
  return `<div class="cs-spell-row" id="cs_spell_${i}">
    <input class="cs-spell-prepared" type="checkbox" ${sp.prepared?'checked':''} title="Préparé"
           onchange="_csAutoSave()">
    <input class="cs-spell-name" type="text" value="${sp.name||''}" placeholder="Nom du sort"
           oninput="_csAutoSave()">
    <select class="cs-spell-lvl" onchange="_csAutoSave()">
      ${[0,1,2,3,4,5,6,7,8,9].map(l=>`<option value="${l}" ${sp.level==l?'selected':''}>${l===0?'Tour':l}</option>`).join('')}
    </select>
    <input class="cs-spell-dur" type="text" value="${sp.duration||''}" placeholder="Durée"
           style="width:5em" oninput="_csAutoSave()">
    <label title="Vocal"><input type="checkbox" ${sp.v?'checked':''} onchange="_csAutoSave()">V</label>
    <label title="Somatique"><input type="checkbox" ${sp.s?'checked':''} onchange="_csAutoSave()">S</label>
    <label title="Matériel"><input type="checkbox" ${sp.m?'checked':''} onchange="_csAutoSave()">M</label>
    <button class="cs-del-btn" onclick="_csDelSpell(${i})">✕</button>
  </div>`;
}

function _renderAttackRow(a, i) {
  return `<div class="cs-attack-row">
    <input type="text" value="${a.name||''}" placeholder="Nom" oninput="_csAutoSave()">
    <input type="text" value="${a.bonus||''}" placeholder="+Atk" style="width:4em" oninput="_csAutoSave()">
    <input type="text" value="${a.damage||''}" placeholder="Dégâts" style="width:6em" oninput="_csAutoSave()">
    <input type="text" value="${a.type||''}" placeholder="Type" style="width:5em" oninput="_csAutoSave()">
    <button class="cs-del-btn" onclick="_csDelAttack(${i})">✕</button>
  </div>`;
}

function _renderEquipItem(e, i) {
  return `<div class="cs-equip-row">
    <input type="text" value="${e.name||''}" placeholder="Item" oninput="_csAutoSave()">
    <input type="number" value="${e.qty||1}" style="width:3.5em" oninput="_csAutoSave()">
    <button class="cs-del-btn" onclick="_csDelEquip(${i})">✕</button>
  </div>`;
}

function _renderFeatureItem(f, i) {
  return `<div class="cs-feature-row">
    <input type="text" value="${f.name||''}" placeholder="Nom du trait" oninput="_csAutoSave()">
    <textarea class="cs-feature-desc" oninput="_csAutoSave()" placeholder="Description">${f.desc||''}</textarea>
    <button class="cs-del-btn" onclick="_csDelFeature(${i})">✕</button>
  </div>`;
}

// Slot interaction
function _csToggleSlotDot(lvl, idx, max) {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c || !c.spellSlots) return;
  const sl = c.spellSlots[lvl];
  if (!sl) return;
  sl.used = (sl.used === idx + 1) ? idx : idx + 1;
  _saveChars(); _dbSaveChar(c);
  // refresh dots in place
  const dots = document.querySelectorAll(`.cs-slot-row:nth-child(${Object.keys(c.spellSlots).indexOf(String(lvl))+1}) .cs-slot-dot`);
  dots.forEach((d, i) => d.classList.toggle('used', i < sl.used));
}

function _csResetSlots(lvl) {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c || !c.spellSlots || !c.spellSlots[lvl]) return;
  c.spellSlots[lvl].used = 0;
  _saveChars(); _dbSaveChar(c);
  document.querySelectorAll('.cs-slot-dot').forEach(d => {
    const row = d.closest('.cs-slot-row');
    if (row && row.querySelector('.cs-slot-label').textContent === 'Niv ' + lvl) d.classList.remove('used');
  });
}

function _csRecalc() {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  const level = parseInt(document.getElementById('cs_level').value) || 1;
  const pb = _profBonus(level);
  document.getElementById('cs_pb_display').textContent = 'Maîtrise: +' + pb;
  const stats = ['str','dex','con','int','wis','cha'];
  const saves = [...document.querySelectorAll('input[data-save]')];
  const skillEls = [...document.querySelectorAll('input[data-skill]')];
  stats.forEach(s => {
    const val = parseInt(document.getElementById('cs_stat_' + s).value) || 10;
    document.getElementById('cs_mod_' + s).textContent = _modStr(val);
    const saveEl = saves.find(el => el.dataset.save === s);
    if (saveEl) {
      const v = _mod(val) + (saveEl.checked ? pb : 0);
      document.getElementById('cs_save_' + s).textContent = (v >= 0 ? '+' : '') + v;
    }
  });
  skillEls.forEach(el => {
    const ability = el.dataset.ability;
    const statVal = parseInt(document.getElementById('cs_stat_' + ability).value) || 10;
    const v = _mod(statVal) + (el.checked ? pb : 0);
    const key = 'cs_skill_' + el.dataset.skill.replace(/\s/g,'_');
    const span = document.getElementById(key);
    if (span) span.textContent = (v >= 0 ? '+' : '') + v;
  });
  _csAutoSave();
}

let _csAutoSaveTimer = null;
function _csAutoSave() {
  clearTimeout(_csAutoSaveTimer);
  _csAutoSaveTimer = setTimeout(saveCharSheet, 300);
}

// Add/delete rows
function _csAddSpell() {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.spells = c.spells || [];
  c.spells.push({ name:'', level:0, duration:'', v:false, s:false, m:false, prepared:false });
  const div = document.createElement('div');
  div.innerHTML = _renderSpellItem(c.spells[c.spells.length-1], c.spells.length-1);
  document.getElementById('cs_spells').appendChild(div.firstElementChild);
  _csAutoSave();
}
function _csDelSpell(i) {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.spells.splice(i,1);
  _saveChars(); _dbSaveChar(c);
  openCharSheet(id);
}
function _csAddAttack() {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.attacks = c.attacks || [];
  c.attacks.push({name:'',bonus:'',damage:'',type:''});
  const div = document.createElement('div');
  div.innerHTML = _renderAttackRow(c.attacks[c.attacks.length-1], c.attacks.length-1);
  document.getElementById('cs_attacks').appendChild(div.firstElementChild);
  _csAutoSave();
}
function _csDelAttack(i) {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.attacks.splice(i,1);
  _saveChars(); _dbSaveChar(c);
  openCharSheet(id);
}
function _csAddEquip() {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.equipment = c.equipment || [];
  c.equipment.push({name:'',qty:1});
  const div = document.createElement('div');
  div.innerHTML = _renderEquipItem(c.equipment[c.equipment.length-1], c.equipment.length-1);
  document.getElementById('cs_equip').appendChild(div.firstElementChild);
  _csAutoSave();
}
function _csDelEquip(i) {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.equipment.splice(i,1);
  _saveChars(); _dbSaveChar(c);
  openCharSheet(id);
}
function _csAddFeature() {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.features = c.features || [];
  c.features.push({name:'',desc:''});
  const div = document.createElement('div');
  div.innerHTML = _renderFeatureItem(c.features[c.features.length-1], c.features.length-1);
  document.getElementById('cs_features').appendChild(div.firstElementChild);
  _csAutoSave();
}
function _csDelFeature(i) {
  const id = document.getElementById('charSheetModal').dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;
  c.features.splice(i,1);
  _saveChars(); _dbSaveChar(c);
  openCharSheet(id);
}

// ── Save from modal ───────────────────────────────────────────────────────────
function saveCharSheet() {
  const modal = document.getElementById('charSheetModal');
  if (!modal || modal.style.display === 'none') return;
  const id = modal.dataset.id;
  const c = dmChars.find(x => x.id === id);
  if (!c) return;

  c.name    = document.getElementById('cs_name').value.trim() || c.name;
  c.level   = parseInt(document.getElementById('cs_level').value) || c.level;
  c.maxHp   = parseInt(document.getElementById('cs_maxhp').value) || c.maxHp;
  c.currentHp = parseInt(document.getElementById('cs_hp').value) ?? c.currentHp;
  c.ac      = parseInt(document.getElementById('cs_ac').value) || c.ac;
  c.notes   = document.getElementById('cs_notes').value;

  const stats = ['str','dex','con','int','wis','cha'];
  stats.forEach(s => { c.stats[s] = parseInt(document.getElementById('cs_stat_' + s).value) || 10; });

  c.savingThrows = [...document.querySelectorAll('input[data-save]:checked')].map(el => el.dataset.save);
  c.skills       = [...document.querySelectorAll('input[data-skill]:checked')].map(el => el.dataset.skill);

  // Spells
  if (c.spells) {
    document.querySelectorAll('#cs_spells .cs-spell-row').forEach((row, i) => {
      if (!c.spells[i]) return;
      c.spells[i].name     = row.querySelector('.cs-spell-name').value;
      c.spells[i].level    = parseInt(row.querySelector('.cs-spell-lvl').value);
      c.spells[i].duration = row.querySelector('.cs-spell-dur').value;
      const cbs = row.querySelectorAll('input[type="checkbox"]');
      c.spells[i].prepared = cbs[0].checked;
      c.spells[i].v        = cbs[1].checked;
      c.spells[i].s        = cbs[2].checked;
      c.spells[i].m        = cbs[3].checked;
    });
  }
  // Attacks
  document.querySelectorAll('#cs_attacks .cs-attack-row').forEach((row, i) => {
    if (!c.attacks[i]) return;
    const inputs = row.querySelectorAll('input');
    c.attacks[i] = { name: inputs[0].value, bonus: inputs[1].value, damage: inputs[2].value, type: inputs[3].value };
  });
  // Equipment
  document.querySelectorAll('#cs_equip .cs-equip-row').forEach((row, i) => {
    if (!c.equipment[i]) return;
    const inputs = row.querySelectorAll('input');
    c.equipment[i] = { name: inputs[0].value, qty: parseInt(inputs[1].value)||1 };
  });
  // Features
  document.querySelectorAll('#cs_features .cs-feature-row').forEach((row, i) => {
    if (!c.features[i]) return;
    c.features[i].name = row.querySelector('input[type="text"]').value;
    c.features[i].desc = row.querySelector('textarea').value;
  });

  // Recalculate spell slots if level changed
  const cls = DND_CLASSES[c.classId] || DND_CLASSES._martial;
  if (cls.spellType) {
    const fresh = _getSpellSlots(cls.spellType, c.level);
    Object.keys(fresh).forEach(lvl => {
      if (!c.spellSlots[lvl]) c.spellSlots[lvl] = fresh[lvl];
      else c.spellSlots[lvl].max = fresh[lvl].max;
    });
  }

  _saveChars(); _dbSaveChar(c); renderCharDock();
}

// ── DB load hook (called from monsters.js _dbLoad) ────────────────────────────
async function _dbLoadChars() {
  if (!window._dbDir) return;
  const loaded = [];
  try {
    for await (const [name, handle] of window._dbDir.entries()) {
      if (name.startsWith('char_') && name.endsWith('.json')) {
        const file = await handle.getFile();
        const text = await file.text();
        try { loaded.push(JSON.parse(text)); } catch(e) {}
      }
    }
  } catch(e) { console.warn('DB load chars', e); }
  if (loaded.length > 0) {
    dmChars = loaded;
    localStorage.setItem('dmChars', JSON.stringify(dmChars));
    renderCharDock();
  }
}

// Init
renderCharDock();
