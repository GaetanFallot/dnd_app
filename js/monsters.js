// ════════════════════════════════════════
// MY MONSTERS (persistent, DB-backed)
// ════════════════════════════════════════
let dmMonsters = JSON.parse(localStorage.getItem('dm_monsters') || '[]');

// ════════════════════════════════════════
// ENCOUNTER MONSTERS (dock / ephemeral)
// ════════════════════════════════════════
let encounterMonsters = JSON.parse(localStorage.getItem('dm_encounter') || '[]');
console.log(encounterMonsters)
let _expandedEid = null;
let _dbDirHandle = null;
let _dbNeedsReconnect = false;

// ── Persist helpers ──────────────────────────────────────────
function _saveMyMonsters(){
  localStorage.setItem('dm_monsters', JSON.stringify(dmMonsters));
  if(_dbDirHandle) dmMonsters.forEach(m => _dbSaveOne(m));
  _updateDbBar();
}

function _saveEncounter(){
  localStorage.setItem('dm_encounter', JSON.stringify(encounterMonsters));
}

// ── Add / remove from encounter ──────────────────────────────
function addToEncounter(data){
  const instance = Object.assign({}, data, { _eid: _genId() });
  delete instance.id; // avoid id conflict with My Monsters
  encounterMonsters.push(instance);
  _saveEncounter();
  renderMonsterDock();
  if(!_dockOpen) toggleMonsterDock();
  showToast('⚔ ' + (data.name || 'Monstre') + ' → rencontre');
}

function removeFromEncounter(eid){
  const m = encounterMonsters.find(x => x._eid === eid);
  encounterMonsters = encounterMonsters.filter(x => x._eid !== eid);
  _saveEncounter();
  if(_expandedEid === eid){
    _expandedEid = null;
    document.getElementById('monsterDockBody').classList.remove('has-expanded');
  }
  renderMonsterDock();
  if(m) showToast('✕ ' + (m.name||'Monstre') + ' retiré');
}

function clearEncounter(){
  if(!encounterMonsters.length) return;
  encounterMonsters = [];
  _saveEncounter();
  _expandedEid = null;
  document.getElementById('monsterDockBody').classList.remove('has-expanded');
  renderMonsterDock();
  showToast('🗑 Rencontre vidée');
}

function saveEncounterMonsterToMine(eid){
  const m = encounterMonsters.find(x => x._eid === eid);
  if(!m) return;
  const copy = Object.assign({}, m, { id: _genId() });
  delete copy._eid;
  delete copy.currentHp;
  const existing = dmMonsters.findIndex(x => x.name === copy.name);
  if(existing >= 0){ dmMonsters[existing] = copy; }
  else { dmMonsters.push(copy); }
  _saveMyMonsters();
  showToast('💾 ' + (copy.name||'Monstre') + ' sauvegardé dans Mes Monstres');
}

// ── DB status bar ────────────────────────────────────────────
function _updateDbBar(){
  const bar  = document.getElementById('dbBar');
  const icon = document.getElementById('dbBarIcon');
  const text = document.getElementById('dbBarText');
  const btn  = document.getElementById('dbConnectBtn');
  if(!bar) return;
  if(_dbDirHandle){
    bar.classList.add('connected'); bar.classList.remove('needs-reconnect');
    if(icon) icon.textContent = '✅';
    if(text) text.innerHTML = '<strong>DB connectée</strong> — sauvegarde auto de Mes Monstres';
    if(btn){ btn.textContent = '📁 Changer dossier'; btn.onclick = selectDbDir; }
  } else if(_dbNeedsReconnect){
    bar.classList.remove('connected'); bar.classList.add('needs-reconnect');
    if(icon) icon.textContent = '🔄';
    if(text) text.innerHTML = '<strong>DB connue</strong> — cliquez pour reconnecter';
    if(btn){ btn.textContent = '🔄 Reconnecter DB'; btn.onclick = reconnectDb; }
  } else {
    bar.classList.remove('connected'); bar.classList.remove('needs-reconnect');
    if(icon) icon.textContent = '💾';
    if(text) text.innerHTML = 'Mes Monstres : mémoire locale — <strong>Connectez un dossier DB</strong> pour persister';
    if(btn){ btn.textContent = '📁 Connecter dossier DB'; btn.onclick = selectDbDir; }
  }
  // update monster browser custom tab count
  const mbCount = document.getElementById('mb-tab-custom-count');
  if(mbCount) mbCount.textContent = dmMonsters.length || '';
}

async function selectDbDir(){
  if(!('showDirectoryPicker' in window)){ showToast('⚠️ Navigateur non compatible (Chrome/Edge)'); return; }
  try {
    _dbDirHandle = await window.showDirectoryPicker({ mode:'readwrite' });
    window._dbDir = _dbDirHandle;
    _dbNeedsReconnect = false;
    _pendingDbHandle = null;
    await _idbSaveHandle(_dbDirHandle);
    document.getElementById('dbStatus').className = 'db-status connected';
    document.getElementById('dbStatus').textContent = '💾 DB ✓';
    _updateDbBar();
    await _dbLoad();
  } catch(e){ if(e.name !== 'AbortError') showToast('⚠️ Erreur accès dossier'); }
}

function dbExportAll(){
  if(!dmMonsters.length){ showToast('⚠️ Aucun monstre dans Mes Monstres'); return; }
  dmMonsters.forEach((m, i) => {
    setTimeout(() => {
      const slug = (m.name||'monstre').replace(/\s+/g,'_').toLowerCase().replace(/[^a-z0-9_]/g,'') || ('monstre_'+i);
      const blob = new Blob([JSON.stringify(m, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = slug + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }, i * 150);
  });
  showToast('⬇ Export de ' + dmMonsters.length + ' monstre(s)…');
}

async function _dbLoad(){
  if(!_dbDirHandle) return;
  const monsters = [], sounds = [];
  for await(const [name, handle] of _dbDirHandle.entries()){
    if(!name.endsWith('.json')) continue;
    try {
      const f = await handle.getFile();
      const data = JSON.parse(await f.text());
      if(name.startsWith('sound_')) sounds.push(data);
      else if(!name.startsWith('char_') && !name.startsWith('encounter_')) monsters.push(data);
    } catch(e){}
  }
  if(monsters.length){
    dmMonsters = monsters;
    localStorage.setItem('dm_monsters', JSON.stringify(dmMonsters));
    _updateDbBar();
  }
  if(sounds.length){
    dmCustomSounds = sounds;
    localStorage.setItem('dm_custom_sounds', JSON.stringify(dmCustomSounds));
    renderCustomSounds();
  }
  if(typeof _dbLoadChars === 'function') await _dbLoadChars();
  const tot = monsters.length + sounds.length;
  if(tot) showToast('✓ DB : ' + monsters.length + ' Mes Monstres, ' + sounds.length + ' sons');
  else showToast('📂 Dossier DB vide');
}

async function _dbSaveOne(m){
  if(!_dbDirHandle) return;
  try {
    const handle = await _dbDirHandle.getFileHandle(m.id + '.json', { create:true });
    const w = await handle.createWritable();
    await w.write(JSON.stringify(m, null, 2));
    await w.close();
  } catch(e){ console.warn('DB write:', e); }
}

async function _dbDeleteOne(m){
  if(!_dbDirHandle || !m) return;
  try { await _dbDirHandle.removeEntry(m.id + '.json'); } catch(e){}
}

async function _dbSaveSound(s){
  if(!_dbDirHandle) return;
  try {
    const handle = await _dbDirHandle.getFileHandle('sound_' + s.id + '.json', { create:true });
    const w = await handle.createWritable();
    await w.write(JSON.stringify(s, null, 2));
    await w.close();
  } catch(e){ console.warn('DB sound write:', e); }
}

async function _dbDeleteSound(s){
  if(!_dbDirHandle || !s) return;
  try { await _dbDirHandle.removeEntry('sound_' + s.id + '.json'); } catch(e){}
}

// ── IndexedDB handle persistence ─────────────────────────────
function _idbOpen(){
  return new Promise((res, rej) => {
    const req = indexedDB.open('dm_screen', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
      if(!db.objectStoreNames.contains('scenes'))  db.createObjectStore('scenes', { keyPath:'id' });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}

async function _idbSaveHandle(handle){
  try {
    const db = await _idbOpen();
    const tx = db.transaction('handles','readwrite');
    tx.objectStore('handles').put(handle,'dbDir');
    await new Promise(r => tx.oncomplete = r);
    db.close();
  } catch(e){}
}

async function _idbLoadHandle(){
  try {
    const db = await _idbOpen();
    const tx = db.transaction('handles','readonly');
    const r = await new Promise(res => { const q = tx.objectStore('handles').get('dbDir'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); });
    db.close();
    return r || null;
  } catch(e){ return null; }
}

async function _autoConnectDb(){
  const handle = await _idbLoadHandle();
  if(!handle) return;
  try {
    const perm = await handle.queryPermission({ mode:'readwrite' });
    if(perm === 'granted'){
      _dbDirHandle = handle;
      window._dbDir = handle;
      document.getElementById('dbStatus').className = 'db-status connected';
      document.getElementById('dbStatus').textContent = '💾 DB ✓';
      _updateDbBar();
      await _dbLoad();
    } else {
      _dbNeedsReconnect = true;
      _dbDirHandle = null;
      _pendingDbHandle = handle;
      _updateDbBar();
    }
  } catch(e){}
}

let _pendingDbHandle = null;
async function reconnectDb(){
  const handle = _pendingDbHandle;
  if(!handle) return selectDbDir();
  try {
    const perm = await handle.requestPermission({ mode:'readwrite' });
    if(perm === 'granted'){
      _dbDirHandle = handle;
      window._dbDir = handle;
      _dbNeedsReconnect = false;
      _pendingDbHandle = null;
      document.getElementById('dbStatus').className = 'db-status connected';
      document.getElementById('dbStatus').textContent = '💾 DB ✓';
      _updateDbBar();
      await _dbLoad();
    }
  } catch(e){}
}

function _genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── HP helpers ───────────────────────────────────────────────
function _modStr(v){ const m = Math.floor(((parseInt(v)||10) - 10) / 2); return (m >= 0 ? '+' : '') + m; }
function _mod(v){ return Math.floor(((parseInt(v)||10) - 10) / 2); }

function _parseMaxHp(hpStr){
  if(!hpStr) return null;
  const n = parseInt(hpStr);
  return isNaN(n) ? null : n;
}

function _refreshHpColor(chip, m){
  const maxHp = _parseMaxHp(m.hp);
  if(maxHp === null) return;
  const cur = m.currentHp !== undefined ? m.currentHp : maxHp;
  const pct = maxHp > 0 ? cur / maxHp : 0;
  const cls = cur <= 0 ? 'hp-dead' : pct <= 0.25 ? 'hp-critical' : pct <= 0.5 ? 'hp-wounded' : '';
  const inp = chip.querySelector('.chip-hp-input');
  const max = chip.querySelector('.chip-hp-max');
  if(inp){ inp.className = 'chip-hp-input' + (cls ? ' '+cls : ''); }
  if(max){ max.className = 'chip-hp-max' + (cls ? ' '+cls : ''); }
}

// ── HP controls on encounter monsters ───────────────────────
function updateChipHp(eid, delta){
  const m = encounterMonsters.find(x => x._eid === eid);
  if(!m) return;
  if(m.currentHp === undefined || m.currentHp === null) m.currentHp = _parseMaxHp(m.hp) ?? 0;
  m.currentHp = Math.max(0, m.currentHp + delta);
  const chip = document.querySelector('[data-eid="' + eid + '"]');
  if(chip){
    const inp = chip.querySelector('.chip-hp-input');
    if(inp) inp.value = m.currentHp;
    _refreshHpColor(chip, m);
  }
  _saveEncounter();
}

function setChipHp(eid, val){
  const m = encounterMonsters.find(x => x._eid === eid);
  if(!m) return;
  m.currentHp = Math.max(0, parseInt(val) || 0);
  const chip = document.querySelector('[data-eid="' + eid + '"]');
  if(chip) _refreshHpColor(chip, m);
  _saveEncounter();
}

// ── Add to initiative from encounter ────────────────────────
function addEncounterMonsterToInit(eid){
  const m = encounterMonsters.find(x => x._eid === eid);
  if(!m) return;
  const dexMod = _mod(m.dex || 10);
  const roll = Math.ceil(Math.random() * 20) + dexMod;
  combatants.push({ id: Date.now() + Math.random(), name: m.name, init: roll });
  renderTurnList();
  showToast('⚔ ' + m.name + ' → init ' + roll + ' (d20' + (dexMod >= 0 ? '+' : '') + dexMod + ')');
}

// ── Action metadata helpers ───────────────────────────────────
const _DMG_FR = {
  piercing:'perf.', slashing:'tranch.', bludgeoning:'cont.',
  lightning:'foudre', fire:'feu', cold:'froid', acid:'acide',
  poison:'poison', necrotic:'néc.', radiant:'rad.',
  thunder:'tonner.', force:'force', psychic:'psy.'
};

function _fmtActionMeta(a){
  const parts = [];
  if(a.usage){
    const u = a.usage;
    if(u.type === 'recharge on roll') parts.push(`<span class="chip-tag recharge">⟳ ${u.min_value}–6</span>`);
    else if(u.type === 'per day' && u.times) parts.push(`<span class="chip-tag recharge">${u.times}/jour</span>`);
  }
  if(a.attack_bonus != null) parts.push(`<span class="chip-tag atk">+${a.attack_bonus} toucher</span>`);
  if(a.dc){
    const suf = a.dc.success_type === 'half' ? ' ½' : '';
    parts.push(`<span class="chip-tag dc">JS ${a.dc.dc_type?.name||''} DD ${a.dc.dc_value}${suf}</span>`);
  }
  if(a.damage && a.damage.length){
    const dmgStr = a.damage.map(d => {
      const t = d.damage_type ? (_DMG_FR[d.damage_type.index] || d.damage_type.name) : '';
      return `${d.damage_dice}${t?' '+t:''}`;
    }).join(' + ');
    parts.push(`<span class="chip-tag dmg">⚔ ${_esc(dmgStr)}</span>`);
  }
  return parts.length ? `<div class="chip-action-meta">${parts.join('')}</div>` : '';
}

function _chipEntry(a){
  console.log(a)
  return `<div class="chip-entry">
    <span class="chip-entry-name">${_esc(a.name||'')}${a.name?'. ':''}</span>
    <span class="chip-entry-desc">${_esc(a.desc||'')}</span>
    ${_fmtActionMeta(a)}
  </div>`;
}

// ── Render dock (encounter monsters) ────────────────────────
function renderMonsterDock(){
  const list  = document.getElementById('monsterList');
  const count = document.getElementById('dockCount');
  count.textContent = encounterMonsters.length || '';
  if(!encounterMonsters.length){
    list.innerHTML = '<div class="dock-empty">Aucun monstre dans la rencontre — ajoutez depuis la Bibliothèque ou Mes Monstres.</div>';
    return;
  }
  list.innerHTML = encounterMonsters.map(m => {
    const traits    = (m.traits||[]).map(t => _chipEntry(t)).join('');
    const actions   = (m.actions||[]).map(a => _chipEntry(a)).join('');
    const reactions = (m.reactions||[]).map(r => _chipEntry(r)).join('');
    const legendary = (m.legendary||[]).map(l => _chipEntry(l)).join('');

    const maxHp = _parseMaxHp(m.hp);
    const cur   = m.currentHp !== undefined ? m.currentHp : maxHp;
    const pct   = maxHp !== null && maxHp > 0 ? cur / maxHp : 1;
    const hpCls = cur <= 0 ? ' hp-dead' : pct <= 0.25 ? ' hp-critical' : pct <= 0.5 ? ' hp-wounded' : '';

    const hpHtml = maxHp !== null ? `
      <div class="chip-hp-row" onclick="event.stopPropagation()">
        <button class="chip-hp-btn" onclick="updateChipHp('${m._eid}',-10)">−10</button>
        <button class="chip-hp-btn" onclick="updateChipHp('${m._eid}',-5)">−5</button>
        <button class="chip-hp-btn" onclick="updateChipHp('${m._eid}',-1)">−</button>
        <input class="chip-hp-input${hpCls}" type="number" value="${cur??maxHp}" min="0"
          onchange="setChipHp('${m._eid}',this.value)" onclick="this.select()">
        <span class="chip-hp-max${hpCls}">/${maxHp}</span>
        <button class="chip-hp-btn" onclick="updateChipHp('${m._eid}',+1)">＋</button>
        <button class="chip-hp-btn" onclick="updateChipHp('${m._eid}',+5)">＋5</button>
        <button class="chip-hp-btn" onclick="updateChipHp('${m._eid}',+10)">＋10</button>
      </div>` : '';

    const bodyOpen = _expandedEid === m._eid ? ' open' : '';

    return `
    <div class="monster-chip" data-eid="${m._eid}">
      <div class="chip-head" onclick="toggleChipExpand('${m._eid}')">
        <span class="chip-name" title="${_esc(m.name||'')}">${_esc(m.name) || '<em style="opacity:.5">Sans nom</em>'}</span>
        <span class="chip-cr">FP ${_esc(m.cr||'?')}</span>
        ${hpHtml}
        <div class="chip-actions" onclick="event.stopPropagation()">
          <button class="chip-btn" onclick="addEncounterMonsterToInit('${m._eid}')" title="Initiative" style="color:#5b8dd9">⚔</button>
          <button class="chip-btn" onclick="editEncounterMonster('${m._eid}')" title="Éditer">✎</button>
          <button class="chip-btn" onclick="duplicateEncounterMonster('${m._eid}')" title="Dupliquer">📋</button>
          <button class="chip-btn" onclick="saveEncounterMonsterToMine('${m._eid}')" title="Sauvegarder dans Mes Monstres" style="color:#d4a843">💾</button>
          <button class="chip-btn danger" onclick="removeFromEncounter('${m._eid}')" title="Retirer">✕</button>
        </div>
      </div>
      <div class="chip-body${bodyOpen}" id="chip-body-${m._eid}">
        ${m.type ? `<div style="font-size:.72rem;color:var(--ink-dim);font-style:italic;margin-bottom:.35rem">${_esc(m.type)}</div>` : ''}
        <div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:.4rem">
          ${m.ac ? `CA <strong style="color:var(--ink)">${_esc(m.ac)}</strong>` : ''}
          ${m.ac && m.speed ? ' · ' : ''}
          ${m.speed ? `Vit. <strong style="color:var(--ink)">${_esc(m.speed)}</strong>` : ''}
          ${m.hp && !maxHp ? ` · PV ${_esc(m.hp)}` : ''}
        </div>
        <div class="chip-stat-grid">
          ${['str','dex','con','int','wis','cha'].map(s => `
            <div class="chip-stat-box">
              <div class="chip-stat-lbl">${s.toUpperCase()}</div>
              <div class="chip-stat-val">${m[s]||10}</div>
              <div class="chip-stat-mod">${_modStr(m[s]||10)}</div>
            </div>`).join('')}
        </div>
        ${traits    ? `<div class="chip-section">Capacités</div>${traits}`    : ''}
        ${actions   ? `<div class="chip-section">Actions</div>${actions}`     : ''}
        ${reactions ? `<div class="chip-section">Réactions</div>${reactions}` : ''}
        ${legendary ? `<div class="chip-section">Légendaires</div>${legendary}`: ''}
        ${m.notes   ? `<div class="chip-section">Notes</div><div class="chip-entry">${_esc(m.notes)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function toggleChipExpand(eid){
  const bodyEl = document.getElementById('chip-body-' + eid);
  if(!bodyEl) return;
  const isOpen = bodyEl.classList.contains('open');
  // Close all
  document.querySelectorAll('.chip-body.open').forEach(b => b.classList.remove('open'));
  _expandedEid = null;
  if(!isOpen){
    bodyEl.classList.add('open');
    _expandedEid = eid;
    if(!_dockOpen) toggleMonsterDock();
    setTimeout(() => bodyEl.parentElement?.scrollIntoView({behavior:'smooth', block:'nearest'}), 50);
  }
}

let _dockOpen = false;
function toggleMonsterDock(){
  _dockOpen = !_dockOpen;
  document.getElementById('monsterDockBody').classList.toggle('open', _dockOpen);
  document.getElementById('dockToggleArrow').classList.toggle('open', _dockOpen);
}

// ── Create/edit/duplicate encounter monsters ─────────────────
function newMonster(){
  const m = {
    _eid: _genId(), name:'', type:'', cr:'', xp:'', prof:'',
    ac:'', hp:'', speed:'',
    str:10, dex:10, con:10, int:10, wis:10, cha:10,
    saves:'', skills:'', dmg_immune:'', dmg_resist:'', dmg_vuln:'', cond_immune:'',
    senses:'', languages:'', legendary_desc:'', notes:'',
    traits:[], actions:[], reactions:[], legendary:[]
  };
  encounterMonsters.push(m);
  _saveEncounter();
  renderMonsterDock();
  openMonsterModal(m._eid);
  if(!_dockOpen) toggleMonsterDock();
}

function editEncounterMonster(eid){ openMonsterModal(eid); if(!_dockOpen) toggleMonsterDock(); }

function duplicateEncounterMonster(eid){
  const orig = encounterMonsters.find(m => m._eid === eid);
  if(!orig) return;
  const baseName = (orig.name||'Monstre').replace(/\s+\d+$/, '');
  const nums = encounterMonsters.map(m => m.name||'').filter(n => n.startsWith(baseName+' ')).map(n => parseInt(n.slice(baseName.length+1))).filter(n => !isNaN(n) && n > 0);
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 2;
  const copy = Object.assign({}, JSON.parse(JSON.stringify(orig)), { _eid: _genId(), name: baseName + ' ' + nextNum });
  encounterMonsters.push(copy);
  _saveEncounter();
  renderMonsterDock();
  showToast('📋 ' + copy.name);
}

// ── Import JSON → encounter ──────────────────────────────────

// Normalize proficiencies: handle flat {name,value} and nested {proficiency:{name},value}
function _normProf(profs) {
  return (profs || []).map(p => ({
    name:  p.name || p.proficiency?.name || '',
    value: p.value || 0,
  }));
}

function _crStrImport(v) {
  if (v === 0.125) return '1/8';
  if (v === 0.25)  return '1/4';
  if (v === 0.5)   return '1/2';
  return String(v ?? 0);
}

function _speedObjToStr(speed) {
  if (!speed || typeof speed !== 'object') return speed || '';
  return Object.entries(speed)
    .filter(([, v]) => v)
    .map(([k, v]) => k === 'walk' ? v : `${k} ${v}`)
    .join(', ');
}

// Detect dnd_db raw API format (has numeric challenge_rating or hit_points + full stat names)
function _isDndDbFormat(d) {
  return typeof d.challenge_rating === 'number'
      || typeof d.hit_points === 'number'
      || typeof d.strength === 'number';
}

// Convert a raw dnd_db monster JSON → internal dock format
function _fromDndDbFormat(d) {
  const profs  = _normProf(d.proficiencies);
  const saves  = profs
    .filter(p => p.name.startsWith('Saving Throw'))
    .map(p => p.name.replace('Saving Throw: ', '') + (p.value >= 0 ? ' +' : ' ') + p.value)
    .join(', ');
  const skills = profs
    .filter(p => p.name.startsWith('Skill:'))
    .map(p => p.name.replace('Skill: ', '') + (p.value >= 0 ? ' +' : ' ') + p.value)
    .join(', ');
  const ac = typeof d.armor_class === 'number' ? d.armor_class : (d.armor_class?.value ?? 10);
  const senses = d.senses
    ? Object.entries(d.senses).filter(([, v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ')
    : '';
  const mapAction = a => ({
    name: a.name, desc: a.desc || '',
    attack_bonus: a.attack_bonus ?? null,
    damage: a.damage || [], dc: a.dc || null, usage: a.usage || null,
  });
  const typeStr = `${d.size || ''} ${d.type || ''}`.trim()
    + (d.subtype ? ` (${d.subtype})` : '')
    + (d.alignment ? `, ${d.alignment}` : '');

  return {
    name:           d.name || '',
    type:           typeStr,
    cr:             _crStrImport(d.challenge_rating),
    xp:             String(d.xp || 0),
    prof:           `+${d.proficiency_bonus || 2}`,
    speed:          _speedObjToStr(d.speed),
    ac:             String(ac) + (d.armor_desc ? ` (${d.armor_desc})` : ''),
    hp:             `${d.hit_points} (${d.hit_dice || ''})`,
    str:            d.strength      || 10,
    dex:            d.dexterity     || 10,
    con:            d.constitution  || 10,
    int:            d.intelligence  || 10,
    wis:            d.wisdom        || 10,
    cha:            d.charisma      || 10,
    saves,
    skills,
    dmg_immune:     (d.damage_immunities      || []).join(', '),
    dmg_resist:     (d.damage_resistances     || []).join(', '),
    dmg_vuln:       (d.damage_vulnerabilities || []).join(', '),
    cond_immune:    (d.condition_immunities   || []).map(c => c.name || c).join(', '),
    senses,
    languages:      d.languages || '',
    legendary_desc: d.legendary_desc || '',
    notes:          d.notes || '',
    traits:         (d.special_abilities || []).map(a => ({ name: a.name, desc: a.desc || '', usage: a.usage || null })),
    actions:        (d.actions          || []).map(mapAction),
    reactions:      (d.reactions        || []).map(mapAction),
    legendary:      (d.legendary_actions || []).map(mapAction),
  };
}

function importMonsterJSON(){ document.getElementById('monsterImportInput').click(); }

function handleMonsterImport(event){
  Array.from(event.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const d = JSON.parse(e.target.result);
        const base = _isDndDbFormat(d) ? _fromDndDbFormat(d) : {
          name:           d.name || d.monster_name || '',
          type:           d.type || d.monster_type || '',
          cr:             d.cr || d.m_cr || '',
          xp:             d.xp || d.m_xp || '',
          prof:           d.prof || d.m_prof || '',
          ac:             d.ac || d.m_ac || '',
          hp:             d.hp || d.m_hp || '',
          speed:          d.speed || d.m_speed || '',
          str:            d.str || d.ability_str || 10,
          dex:            d.dex || d.ability_dex || 10,
          con:            d.con || d.ability_con || 10,
          int:            d.int || d.ability_int || 10,
          wis:            d.wis || d.ability_wis || 10,
          cha:            d.cha || d.ability_cha || 10,
          saves:          d.saves || d.m_saves || '',
          skills:         d.skills || d.m_skills || '',
          dmg_immune:     d.dmg_immune || d.m_dmg_immune || '',
          dmg_resist:     d.dmg_resist || d.m_dmg_resist || '',
          dmg_vuln:       d.dmg_vuln || d.m_dmg_vuln || '',
          cond_immune:    d.cond_immune || d.m_cond_immune || '',
          senses:         d.senses || d.m_senses || '',
          languages:      d.languages || d.m_languages || '',
          legendary_desc: d.legendary_desc || d.m_legendary_desc || '',
          notes:          d.notes || d._notes || '',
          traits:         d.traits || d._traits || [],
          actions:        d.actions || d._actions || [],
          reactions:      d.reactions || d._reactions || [],
          legendary:      d.legendary || d._legendary || [],
        };
        const m = Object.assign({ _eid: _genId() }, base);
        encounterMonsters.push(m);
        _saveEncounter();
        renderMonsterDock();
        showToast('✓ ' + (m.name || 'Monstre') + ' → rencontre');
      } catch(err){ showToast('⚠️ JSON invalide'); }
    };
    reader.readAsText(file);
  });
  event.target.value = '';
}

// ── Monster Modal (edits encounter monsters) ─────────────────
let _editingEid = null;

function openMonsterModal(eid){
  _editingEid = eid;
  const m = encounterMonsters.find(x => x._eid === eid);
  if(!m) return;
  document.getElementById('mmTitle').textContent = m.name || 'Nouveau Monstre';
  ['name','type','cr','xp','prof','ac','hp','speed',
   'saves','skills','dmg_immune','dmg_resist','dmg_vuln','cond_immune',
   'senses','languages','legendary_desc','notes'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) el.value = m[f] || '';
  });
  ['str','dex','con','int','wis','cha'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el){ el.value = m[f] || 10; updateMod(f); }
  });
  ['traits','actions','reactions','legendary'].forEach(s => renderModalList(s, m[s]||[]));
  document.getElementById('monsterModal').style.display = 'flex';
}

// ── My Monster Modal (edits dmMonsters, from browser) ────────
let _editingMyId = null;

function openMyMonsterModal(id){
  _editingMyId = id;
  _editingEid = null;
  const m = dmMonsters.find(x => x.id === id);
  if(!m) return;
  document.getElementById('mmTitle').textContent = '(Mes Monstres) ' + (m.name||'Nouveau Monstre');
  ['name','type','cr','xp','prof','ac','hp','speed',
   'saves','skills','dmg_immune','dmg_resist','dmg_vuln','cond_immune',
   'senses','languages','legendary_desc','notes'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) el.value = m[f] || '';
  });
  ['str','dex','con','int','wis','cha'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el){ el.value = m[f] || 10; updateMod(f); }
  });
  ['traits','actions','reactions','legendary'].forEach(s => renderModalList(s, m[s]||[]));
  document.getElementById('monsterModal').style.display = 'flex';
}

function _readModalFields(target){
  ['name','type','cr','xp','prof','ac','hp','speed',
   'saves','skills','dmg_immune','dmg_resist','dmg_vuln','cond_immune',
   'senses','languages','legendary_desc','notes'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) target[f] = el.value;
  });
  ['str','dex','con','int','wis','cha'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) target[f] = parseInt(el.value)||10;
  });
}

function closeMonsterModal(){
  saveMonsterModal();
  document.getElementById('monsterModal').style.display = 'none';
}

function updateMod(stat){
  const el = document.getElementById('mf_'+stat);
  const modEl = document.getElementById('mmod_'+stat);
  if(el && modEl){ const m = _mod(el.value); modEl.textContent = '('+(m>=0?'+':'')+m+')'; }
}

const _DMG_TYPES = [
  {i:'',n:'— Type —'},
  {i:'slashing',n:'Tranchant'},{i:'piercing',n:'Perforant'},{i:'bludgeoning',n:'Contondant'},
  {i:'fire',n:'Feu'},{i:'cold',n:'Froid'},{i:'lightning',n:'Foudre'},{i:'thunder',n:'Tonnerre'},
  {i:'acid',n:'Acide'},{i:'poison',n:'Poison'},{i:'necrotic',n:'Nécrotique'},
  {i:'radiant',n:'Radiant'},{i:'force',n:'Force'},{i:'psychic',n:'Psychique'}
];
const _ABILITIES = [{i:'',n:'— Car. —'},{i:'str',n:'FOR'},{i:'dex',n:'DEX'},{i:'con',n:'CON'},{i:'int',n:'INT'},{i:'wis',n:'SAG'},{i:'cha',n:'CHA'}];
const _ABILITY_NAMES = {str:'STR',dex:'DEX',con:'CON',int:'INT',wis:'SAG',cha:'CHA'};
const _DAMAGE_NAMES = {
  slashing:'Tranchant',piercing:'Perforant',bludgeoning:'Contondant',
  fire:'Feu',cold:'Froid',lightning:'Foudre',thunder:'Tonnerre',
  acid:'Acide',poison:'Poison',necrotic:'Nécrotique',radiant:'Radiant',force:'Force',psychic:'Psychique'
};

function renderModalList(section, items){
  const container = document.getElementById('ml_'+section);
  if(!container) return;
  const hasRich = section !== 'traits';

  container.innerHTML = items.map((item, i) => {
    // ── Usage / Recharge ──
    const ut = item.usage?.type || '';
    const uMin = item.usage?.min_value ?? 5;
    const uTimes = item.usage?.times ?? 1;
    const usageOpts = ['','recharge on roll','per day'].map(v =>
      `<option value="${v}"${ut===v?' selected':''}>${v===''?'Aucune':v==='recharge on roll'?'Recharge dé':'X/jour'}</option>`
    ).join('');
    let usageSub = '';
    if(ut === 'recharge on roll') usageSub = `<span class="mm-adv-hint">min:</span><input type="number" class="mm-adv-num" value="${uMin}" min="2" max="6" onchange="_mlUpdate('${section}',${i},'usage_min',this.value)"><span class="mm-adv-hint">–6</span>`;
    else if(ut === 'per day') usageSub = `<input type="number" class="mm-adv-num" value="${uTimes}" min="1" max="10" onchange="_mlUpdate('${section}',${i},'usage_times',this.value)"><span class="mm-adv-hint">/jour</span>`;

    let richHtml = '';
    if(hasRich){
      // ── Bonus attaque ──
      const atkVal = item.attack_bonus != null ? item.attack_bonus : '';
      richHtml += `
      <div class="mm-adv-field">
        <span class="mm-adv-lbl">Bonus attaque</span>
        <input type="number" class="mm-adv-num" placeholder="—" value="${_esc(String(atkVal))}"
          onchange="_mlUpdate('${section}',${i},'attack_bonus',this.value)">
        <span class="mm-adv-hint">vide = aucun</span>
      </div>`;

      // ── Jet de sauvegarde ──
      const dcIdx = item.dc?.dc_type?.index || '';
      const dcVal = item.dc?.dc_value ?? '';
      const dcSucc = item.dc?.success_type || 'none';
      const dcAbil = _ABILITIES.map(a => `<option value="${a.i}"${dcIdx===a.i?' selected':''}>${a.n}</option>`).join('');
      const dcSuccOpts = [['none','Pas d\'effet'],['half','Demi dégâts']].map(([v,n]) => `<option value="${v}"${dcSucc===v?' selected':''}>${n}</option>`).join('');
      richHtml += `
      <div class="mm-adv-field">
        <span class="mm-adv-lbl">JS / DD</span>
        <select class="mm-adv-select" onchange="_mlUpdate('${section}',${i},'dc_type',this.value)">${dcAbil}</select>
        <input type="number" class="mm-adv-num" placeholder="DD" value="${_esc(String(dcVal))}"
          onchange="_mlUpdate('${section}',${i},'dc_value',this.value)">
        <select class="mm-adv-select" onchange="_mlUpdate('${section}',${i},'dc_success',this.value)">${dcSuccOpts}</select>
      </div>`;

      // ── Dégâts ──
      const dmgRows = (item.damage||[]).map((d,di) => {
        const typeOpts = _DMG_TYPES.map(t => `<option value="${t.i}"${(d.damage_type?.index||'')===t.i?' selected':''}>${t.n}</option>`).join('');
        return `<div class="mm-dmg-row">
          <input type="text" class="mm-adv-dice" placeholder="2d6+3"
            value="${_esc(d.damage_dice||'')}"
            onchange="_mlUpdateDmg('${section}',${i},${di},'damage_dice',this.value)">
          <select class="mm-adv-select" onchange="_mlUpdateDmg('${section}',${i},${di},'damage_type',this.value)">${typeOpts}</select>
          <button class="mm-rm" style="flex-shrink:0" onclick="_mlRemoveDmg('${section}',${i},${di})">✕</button>
        </div>`;
      }).join('');
      richHtml += `
      <div class="mm-adv-field mm-adv-field-col">
        <span class="mm-adv-lbl">Dégâts</span>
        <div class="mm-dmg-list">${dmgRows}</div>
        <button class="mm-add-btn" style="font-size:.72rem;padding:2px 8px;margin-top:.2rem" onclick="_mlAddDmg('${section}',${i})">+ Dés</button>
      </div>`;
    }

    return `<div class="mm-list-row">
      <div class="mm-row-basic">
        <input type="text" value="${_esc(item.name||'')}" placeholder="Nom" oninput="_mlUpdate('${section}',${i},'name',this.value)">
        <textarea placeholder="Description" oninput="_mlUpdate('${section}',${i},'desc',this.value)">${_esc(item.desc||'')}</textarea>
        <button class="mm-rm" onclick="_mlRemove('${section}',${i})">✕</button>
      </div>
      <div class="mm-row-adv">
        <div class="mm-adv-field">
          <span class="mm-adv-lbl">Utilisation</span>
          <select class="mm-adv-select" onchange="_mlUpdate('${section}',${i},'usage_type',this.value)">${usageOpts}</select>
          ${usageSub}
        </div>
        ${richHtml}
      </div>
    </div>`;
  }).join('');
}

function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function _getEditedMonster(){
  return _editingEid
    ? encounterMonsters.find(x => x._eid === _editingEid)
    : dmMonsters.find(x => x.id === _editingMyId);
}

function _mlUpdate(section, i, field, val){
  const m = _getEditedMonster();
  if(!m || !m[section] || !m[section][i]) return;
  const item = m[section][i];
  if(field === 'name' || field === 'desc'){
    item[field] = val;
  } else if(field === 'attack_bonus'){
    item.attack_bonus = val === '' ? null : (parseInt(val) ?? null);
  } else if(field === 'usage_type'){
    item.usage = val ? { type:val, min_value:item.usage?.min_value??5, times:item.usage?.times??1 } : null;
    renderModalList(section, m[section]);
  } else if(field === 'usage_min'){
    if(!item.usage) item.usage = { type:'recharge on roll', min_value:5, times:1 };
    item.usage.min_value = parseInt(val)||5;
  } else if(field === 'usage_times'){
    if(!item.usage) item.usage = { type:'per day', min_value:5, times:1 };
    item.usage.times = parseInt(val)||1;
  } else if(field === 'dc_type'){
    if(!val){ item.dc = null; }
    else {
      if(!item.dc) item.dc = { dc_type:{ index:val, name:_ABILITY_NAMES[val]||val.toUpperCase() }, dc_value:10, success_type:'none' };
      else item.dc.dc_type = { index:val, name:_ABILITY_NAMES[val]||val.toUpperCase() };
    }
  } else if(field === 'dc_value'){
    if(!item.dc) item.dc = { dc_type:{ index:'', name:'' }, dc_value:parseInt(val)||10, success_type:'none' };
    else item.dc.dc_value = parseInt(val)||10;
  } else if(field === 'dc_success'){
    if(!item.dc) item.dc = { dc_type:{ index:'', name:'' }, dc_value:10, success_type:val };
    else item.dc.success_type = val;
  }
}

function _mlUpdateDmg(section, i, di, field, val){
  const m = _getEditedMonster();
  if(!m || !m[section] || !m[section][i]) return;
  const item = m[section][i];
  if(!item.damage || !item.damage[di]) return;
  if(field === 'damage_dice') item.damage[di].damage_dice = val;
  else if(field === 'damage_type') item.damage[di].damage_type = val ? { index:val, name:_DAMAGE_NAMES[val]||val } : null;
}

function _mlAddDmg(section, i){
  const m = _getEditedMonster();
  if(!m || !m[section] || !m[section][i]) return;
  const item = m[section][i];
  if(!item.damage) item.damage = [];
  item.damage.push({ damage_dice:'', damage_type:null });
  renderModalList(section, m[section]);
}

function _mlRemoveDmg(section, i, di){
  const m = _getEditedMonster();
  if(!m || !m[section] || !m[section][i]) return;
  m[section][i].damage.splice(di, 1);
  renderModalList(section, m[section]);
}

function addModalListItem(section){
  const m = _getEditedMonster();
  if(!m) return;
  if(!m[section]) m[section] = [];
  const item = { name:'', desc:'', usage:null };
  if(section !== 'traits'){ item.attack_bonus = null; item.damage = []; item.dc = null; }
  m[section].push(item);
  renderModalList(section, m[section]);
}

function _mlRemove(section, i){
  const m = _getEditedMonster();
  if(!m || !m[section]) return;
  m[section].splice(i, 1);
  renderModalList(section, m[section]);
}

async function saveMonsterModal(){
  if(_editingEid){
    // Save to encounter
    const m = encounterMonsters.find(x => x._eid === _editingEid);
    if(!m) return;
    _readModalFields(m);
    _saveEncounter();
    renderMonsterDock();
    document.getElementById('mmTitle').textContent = m.name || 'Monstre';
    showToast('✓ ' + (m.name||'Monstre') + ' sauvegardé (rencontre)');
  } else if(_editingMyId){
    // Save to My Monsters
    const m = dmMonsters.find(x => x.id === _editingMyId);
    if(!m) return;
    _readModalFields(m);
    _saveMyMonsters();
    document.getElementById('mmTitle').textContent = m.name || 'Monstre';
    showToast('✓ ' + (m.name||'Monstre') + ' sauvegardé (Mes Monstres)');
    if(typeof MonsterBrowser !== 'undefined') MonsterBrowser.renderList();
  }
}

async function _shortenUrl(url) {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const short = (await res.text()).trim();
    return short.startsWith('http') ? short : null;
  } catch { return null; }
}

async function shareMonsterLink(){
  saveMonsterModal();
  const m = _editingEid
    ? encounterMonsters.find(x => x._eid === _editingEid)
    : dmMonsters.find(x => x.id === _editingMyId);
  if(!m) return;
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(m))));
  const url = 'https://gaetanfallot.github.io/dnd_app/monster-view.html#' + b64;
  showToast('⏳ Raccourcissement…');
  const short = await _shortenUrl(url);
  const final = short || url;
  if(navigator.clipboard){
    navigator.clipboard.writeText(final)
      .then(()=>showToast(short ? '🔗 Lien court copié !' : '🔗 Lien copié !'))
      .catch(()=>prompt('Copie ce lien :', final));
  } else {
    prompt('Copie ce lien :', final);
  }
}

function exportMonsterFromModal(){
  saveMonsterModal();
  const m = _editingEid
    ? encounterMonsters.find(x => x._eid === _editingEid)
    : dmMonsters.find(x => x.id === _editingMyId);
  if(!m) return;
  const blob = new Blob([JSON.stringify(m, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = (m.name||'monstre').replace(/\s+/g,'_').toLowerCase().replace(/[^a-z0-9_]/g,'');
  a.download = `monstre_${slug}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ════════════════════════════════════════
// CUSTOM SOUNDBOARD
// ════════════════════════════════════════
let dmCustomSounds = JSON.parse(localStorage.getItem('dm_custom_sounds') || '[]');

function _saveCustomSounds(){
  localStorage.setItem('dm_custom_sounds', JSON.stringify(dmCustomSounds));
  if(_dbDirHandle) dmCustomSounds.forEach(s => _dbSaveSound(s));
}

function renderCustomSounds(){
  const grid = document.getElementById('customSbGrid');
  if(!dmCustomSounds.length){ grid.innerHTML = ''; return; }
  grid.innerHTML = dmCustomSounds.map(s => `
    <div class="sb-custom-wrap">
      <button class="sb-custom-btn" onclick="playCustomSound('${s.id}')" title="${_esc(s.name)}">${_esc(s.name.slice(0,14))}</button>
      <button class="sb-custom-del" onclick="deleteCustomSound('${s.id}')" title="Supprimer">✕</button>
    </div>
  `).join('');
}

function addCustomSound(event){
  Array.from(event.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 28);
      dmCustomSounds.push({ id: _genId(), name, dataUrl: e.target.result });
      _saveCustomSounds();
      renderCustomSounds();
      showToast('✓ Son ajouté : ' + name);
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function playCustomSound(id){
  const s = dmCustomSounds.find(x => x.id === id);
  if(!s) return;
  try {
    const audio = new Audio(s.dataUrl);
    audio.volume = Math.min(1, masterVolume * 1.5);
    audio.play();
    showToast('🎵 ' + s.name);
  } catch(e){ showToast('⚠️ Erreur lecture audio'); }
}

function deleteCustomSound(id){
  const s = dmCustomSounds.find(x => x.id === id);
  dmCustomSounds = dmCustomSounds.filter(x => x.id !== id);
  _saveCustomSounds();
  if(s) _dbDeleteSound(s);
  renderCustomSounds();
  showToast('🗑 Son supprimé');
}

// Init
renderMonsterDock();
renderCustomSounds();
_updateDbBar();
_autoConnectDb();
