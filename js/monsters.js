// ════════════════════════════════════════
// MONSTER DOCK
// ════════════════════════════════════════
let dmMonsters = JSON.parse(localStorage.getItem('dm_monsters') || '[]');
let _expandedChipId = null;
let _dbDirHandle = null;
let _dbNeedsReconnect = false;

function _saveMonsters(){
  localStorage.setItem('dm_monsters', JSON.stringify(dmMonsters));
  if(_dbDirHandle) dmMonsters.forEach(m => _dbSaveOne(m));
  _updateDbBar();
}

function _updateDbBar(){
  const bar = document.getElementById('dbBar');
  const icon = document.getElementById('dbBarIcon');
  const text = document.getElementById('dbBarText');
  const btn = document.getElementById('dbConnectBtn');
  if(!bar) return;
  if(_dbDirHandle){
    bar.classList.add('connected'); bar.classList.remove('needs-reconnect');
    if(icon) icon.textContent = '✅';
    if(text) text.innerHTML = '<strong>DB connectée</strong> — sauvegarde auto activée (monstres &amp; sons)';
    if(btn){ btn.textContent = '📁 Changer dossier'; btn.onclick = selectDbDir; }
  } else if(_dbNeedsReconnect){
    bar.classList.remove('connected'); bar.classList.add('needs-reconnect');
    if(icon) icon.textContent = '🔄';
    if(text) text.innerHTML = '<strong>DB connue</strong> — cliquez pour reconnecter (un seul clic suffit)';
    if(btn){ btn.textContent = '🔄 Reconnecter DB'; btn.onclick = reconnectDb; }
  } else {
    bar.classList.remove('connected'); bar.classList.remove('needs-reconnect');
    if(icon) icon.textContent = '💾';
    if(text) text.innerHTML = 'Sauvegarde locale uniquement — <strong>Connectez un dossier DB</strong> pour persister';
    if(btn){ btn.textContent = '📁 Connecter dossier DB'; btn.onclick = selectDbDir; }
  }
}

async function selectDbDir(){
  if(!('showDirectoryPicker' in window)){ showToast('⚠️ Navigateur non compatible (utilisez Chrome/Edge)'); return; }
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
  if(!dmMonsters.length){ showToast('⚠️ Aucun monstre à exporter'); return; }
  dmMonsters.forEach((m, i) => {
    setTimeout(() => {
      const slug = (m.name || 'monstre').replace(/s+/g,'_').toLowerCase().replace(/[^a-z0-9_]/g,'') || ('monstre_'+i);
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
      else if(!name.startsWith('char_')) monsters.push(data);
    } catch(e){}
  }
  if(monsters.length){
    dmMonsters = monsters;
    localStorage.setItem('dm_monsters', JSON.stringify(dmMonsters));
    renderMonsterDock();
  }
  if(sounds.length){
    dmCustomSounds = sounds;
    localStorage.setItem('dm_custom_sounds', JSON.stringify(dmCustomSounds));
    renderCustomSounds();
  }
  // Load chars if chars.js is loaded
  if(typeof _dbLoadChars === 'function') await _dbLoadChars();
  const tot = monsters.length + sounds.length;
  if(tot) showToast('✓ DB : ' + monsters.length + ' monstres, ' + sounds.length + ' sons');
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

// ── IndexedDB handle persistence ──
function _idbOpen(){
  return new Promise((res, rej) => {
    const req = indexedDB.open('dm_screen', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}

async function _idbSaveHandle(handle){
  try {
    const db = await _idbOpen();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'dbDir');
    await new Promise(r => tx.oncomplete = r);
    db.close();
  } catch(e){ console.warn('idb save:', e); }
}

async function _idbLoadHandle(){
  try {
    const db = await _idbOpen();
    const tx = db.transaction('handles', 'readonly');
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
  } catch(e){ console.warn('Auto-connect:', e); }
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
  } catch(e){ console.warn('Reconnect:', e); }
}

function _genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function toggleChipExpand(event, id){
  const el = event.currentTarget;
  const wasExpanded = el.classList.contains('expanded');
  document.querySelectorAll('.monster-chip.expanded').forEach(c => c.classList.remove('expanded'));
  const body = document.getElementById('monsterDockBody');
  if(!wasExpanded){
    if(!_dockOpen) toggleMonsterDock();
    el.classList.add('expanded');
    _expandedChipId = id;
    body.classList.add('has-expanded');
    setTimeout(() => el.scrollIntoView({behavior:'smooth', block:'nearest', inline:'nearest'}), 50);
  } else {
    _expandedChipId = null;
    body.classList.remove('has-expanded');
  }
}

function _modStr(v){ const m = Math.floor((parseInt(v)||10 - 10) / 2); return (m >= 0 ? '+' : '') + m; }
function _mod(v){ return Math.floor(((parseInt(v)||10) - 10) / 2); }

function _parseMaxHp(hpStr){
  if(!hpStr) return null;
  const n = parseInt(hpStr);
  return isNaN(n) ? null : n;
}

function addMonsterToInit(id){
  const m = dmMonsters.find(x => x.id === id);
  if(!m) return;
  const name = m.name || 'Monstre';
  const dexMod = _mod(m.dex || 10);
  const roll = Math.ceil(Math.random() * 20) + dexMod;
  combatants.push({ id: Date.now() + Math.random(), name, init: roll });
  renderTurnList();
  showToast('⚔ ' + name + ' → init ' + roll + ' (d20' + (dexMod >= 0 ? '+' : '') + dexMod + ')');
}

function updateChipHp(id, delta){
  const m = dmMonsters.find(x => x.id === id);
  if(!m) return;
  if(m.currentHp === undefined || m.currentHp === null) m.currentHp = _parseMaxHp(m.hp) ?? 0;
  m.currentHp = Math.max(0, m.currentHp + delta);
  const chip = document.querySelector('[data-id="' + id + '"]');
  if(chip){
    const inp = chip.querySelector('.chip-hp-input');
    if(inp) inp.value = m.currentHp;
    _refreshHpBadge(chip, m);
  }
  _saveMonsters();
}

function setChipHp(id, val){
  const m = dmMonsters.find(x => x.id === id);
  if(!m) return;
  m.currentHp = Math.max(0, parseInt(val) || 0);
  const chip = document.querySelector('[data-id="' + id + '"]');
  if(chip) _refreshHpBadge(chip, m);
  _saveMonsters();
}

function _refreshHpBadge(chip, m){
  const badge = chip.querySelector('.chip-hp-badge');
  if(!badge) return;
  const maxHp = _parseMaxHp(m.hp);
  if(maxHp === null) return;
  const cur = m.currentHp !== undefined ? m.currentHp : maxHp;
  const pct = maxHp > 0 ? cur / maxHp : 0;
  badge.className = 'chip-hp-badge' + (cur <= 0 ? ' dead' : pct <= 0.25 ? ' critical' : pct <= 0.5 ? ' wounded' : '');
  badge.textContent = '♥ ' + cur + '/' + maxHp;
}

function renderMonsterDock(){
  const list = document.getElementById('monsterList');
  const count = document.getElementById('dockCount');
  count.textContent = dmMonsters.length;
  if(!dmMonsters.length){
    list.innerHTML = '<div class="dock-empty">Aucun monstre — cliquez ＋ Nouveau pour créer</div>';
    return;
  }
  list.innerHTML = dmMonsters.map(m => {
    const traits = (m.traits||[]).map(t => `<div class="chip-entry"><span class="chip-entry-name">${_esc(t.name||'')}${t.name?'. ':''}</span><span class="chip-entry-desc">${_esc(t.desc||'')}</span></div>`).join('');
    const actions = (m.actions||[]).map(a => `<div class="chip-entry"><span class="chip-entry-name">${_esc(a.name||'')}${a.name?'. ':''}</span><span class="chip-entry-desc">${_esc(a.desc||'')}</span></div>`).join('');
    const reactions = (m.reactions||[]).map(r => `<div class="chip-entry"><span class="chip-entry-name">${_esc(r.name||'')}${r.name?'. ':''}</span><span class="chip-entry-desc">${_esc(r.desc||'')}</span></div>`).join('');
    const legendary = (m.legendary||[]).map(l => `<div class="chip-entry"><span class="chip-entry-name">${_esc(l.name||'')}${l.name?'. ':''}</span><span class="chip-entry-desc">${_esc(l.desc||'')}</span></div>`).join('');
    return `
    <div class="monster-chip" data-id="${m.id}" onclick="toggleChipExpand(event,'${m.id}')">
      <div class="chip-header-row">
        <div class="chip-name" title="${_esc(m.name||'')}" style="flex:1;min-width:0">${_esc(m.name) || '<em style="opacity:.5">Sans nom</em>'}</div>
        <span class="chip-arrow">▼</span>
      </div>
      <div class="chip-type">${_esc(m.type||'—')}</div>
      <div class="chip-meta" onclick="event.stopPropagation()">
        <span class="chip-cr">FP ${_esc(m.cr||'?')}</span>
        ${(() => {
          const maxHp = _parseMaxHp(m.hp);
          if(maxHp === null) return m.hp ? `<span class="chip-hp-badge">♥ ${_esc(m.hp)}</span>` : '';
          const cur = m.currentHp !== undefined ? m.currentHp : maxHp;
          const pct = maxHp > 0 ? cur / maxHp : 0;
          const cls = cur <= 0 ? ' dead' : pct <= 0.25 ? ' critical' : pct <= 0.5 ? ' wounded' : '';
          return `<div class="chip-hp-row">
            <button class="chip-hp-btn wide" onclick="updateChipHp('${m.id}',-10)" title="-10">−10</button>
            <button class="chip-hp-btn wide" onclick="updateChipHp('${m.id}',-5)" title="-5">−5</button>
            <button class="chip-hp-btn" onclick="updateChipHp('${m.id}',-1)">−</button>
            <input class="chip-hp-input" type="number" value="${cur}" min="0"
              onchange="setChipHp('${m.id}',this.value)" onclick="this.select()" oninput="this.style.width=(this.value.length+1)*8+'px'">
            <span class="chip-hp-badge${cls}" title="PV actuels / max">/${maxHp}</span>
            <button class="chip-hp-btn" onclick="updateChipHp('${m.id}',+1)">＋</button>
            <button class="chip-hp-btn wide" onclick="updateChipHp('${m.id}',+5)" title="+5">＋5</button>
            <button class="chip-hp-btn wide" onclick="updateChipHp('${m.id}',+10)" title="+10">＋10</button>
          </div>`;
        })()}
        <button class="chip-init-btn" onclick="addMonsterToInit('${m.id}')" title="Ajouter à l'initiative (roll dex)">⚔</button>
      </div>
      <div class="chip-expand-body">
        <div class="chip-stat-row">
          ${['str','dex','con','int','wis','cha'].map(s => `<div class="chip-stat"><span class="chip-stat-lbl">${s.toUpperCase()}</span><span class="chip-stat-val">${m[s]||10}</span><span class="chip-stat-mod">${_modStr(m[s]||10)}</span></div>`).join('')}
        </div>
        ${m.ac||m.speed ? `<div style="font-size:.6rem;color:var(--ink-dim);margin-bottom:.2rem">${m.ac?'CA '+_esc(m.ac):''}${m.ac&&m.speed?' · ':''}${m.speed?'Vit. '+_esc(m.speed):''}</div>` : ''}
        ${traits ? `<div class="chip-section">Capacités</div>${traits}` : ''}
        ${actions ? `<div class="chip-section">Actions</div>${actions}` : ''}
        ${reactions ? `<div class="chip-section">Réactions</div>${reactions}` : ''}
        ${legendary ? `<div class="chip-section">Légendaires</div>${legendary}` : ''}
        ${m.notes ? `<div class="chip-section">Notes</div><div class="chip-entry-desc">${_esc(m.notes)}</div>` : ''}
      </div>
      <div class="chip-btns" onclick="event.stopPropagation()">
        <button class="chip-btn" onclick="editMonster('${m.id}')">✏ Éditer</button>
        <button class="chip-btn" onclick="duplicateMonster('${m.id}')">📋 Dup</button>
        <button class="chip-btn danger" onclick="deleteMonster('${m.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
  // Re-apply expanded state after re-render
  if(_expandedChipId){
    const el = list.querySelector(`[data-id="${_expandedChipId}"]`);
    if(el){ el.classList.add('expanded'); document.getElementById('monsterDockBody').classList.add('has-expanded'); }
    else { _expandedChipId = null; document.getElementById('monsterDockBody').classList.remove('has-expanded'); }
  }
}

let _dockOpen = false;
function toggleMonsterDock(){
  _dockOpen = !_dockOpen;
  document.getElementById('monsterDockBody').classList.toggle('open', _dockOpen);
  document.getElementById('dockToggleArrow').classList.toggle('open', _dockOpen);
}

function newMonster(){
  const m = {
    id: _genId(), name:'', type:'', cr:'', xp:'', prof:'',
    ac:'', hp:'', speed:'',
    str:10, dex:10, con:10, int:10, wis:10, cha:10,
    saves:'', skills:'', dmg_immune:'', dmg_resist:'', dmg_vuln:'', cond_immune:'',
    senses:'', languages:'', legendary_desc:'', notes:'',
    traits:[], actions:[], reactions:[], legendary:[]
  };
  dmMonsters.push(m);
  _saveMonsters();
  renderMonsterDock();
  openMonsterModal(m.id);
  if(!_dockOpen) toggleMonsterDock();
}

function editMonster(id){ openMonsterModal(id); if(!_dockOpen) toggleMonsterDock(); }

function duplicateMonster(id){
  const orig = dmMonsters.find(m => m.id === id);
  if(!orig) return;
  const rawName = orig.name || 'Monstre';
  // Strip trailing number to get the base name
  const baseName = rawName.replace(/\s+\d+$/, '');
  // Find the highest existing number for this base name
  const nums = dmMonsters
    .map(m => m.name || '')
    .filter(n => n.startsWith(baseName + ' '))
    .map(n => parseInt(n.slice(baseName.length + 1)))
    .filter(n => !isNaN(n) && n > 0);
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 2;
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = _genId();
  copy.name = baseName + ' ' + nextNum;
  dmMonsters.push(copy);
  _saveMonsters();
  renderMonsterDock();
  showToast('📋 ' + copy.name);
}

function deleteMonster(id){
  const m = dmMonsters.find(x => x.id === id);
  const name = m ? (m.name || 'Monstre') : 'Monstre';
  dmMonsters = dmMonsters.filter(m => m.id !== id);
  _saveMonsters();
  renderMonsterDock();
  showToast('🗑 ' + name + ' supprimé');
}

function importMonsterJSON(){ document.getElementById('monsterImportInput').click(); }

function handleMonsterImport(event){
  Array.from(event.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const d = JSON.parse(e.target.result);
        const m = {
          id: d.id || _genId(),
          name: d.name || d.monster_name || '',
          type: d.type || d.monster_type || '',
          cr: d.cr || d.m_cr || '',
          xp: d.xp || d.m_xp || '',
          prof: d.prof || d.m_prof || '',
          ac: d.ac || d.m_ac || '',
          hp: d.hp || d.m_hp || '',
          speed: d.speed || d.m_speed || '',
          str: d.str || d.ability_str || 10,
          dex: d.dex || d.ability_dex || 10,
          con: d.con || d.ability_con || 10,
          int: d.int || d.ability_int || 10,
          wis: d.wis || d.ability_wis || 10,
          cha: d.cha || d.ability_cha || 10,
          saves: d.saves || d.m_saves || '',
          skills: d.skills || d.m_skills || '',
          dmg_immune: d.dmg_immune || d.m_dmg_immune || '',
          dmg_resist: d.dmg_resist || d.m_dmg_resist || '',
          dmg_vuln: d.dmg_vuln || d.m_dmg_vuln || '',
          cond_immune: d.cond_immune || d.m_cond_immune || '',
          senses: d.senses || d.m_senses || '',
          languages: d.languages || d.m_languages || '',
          legendary_desc: d.legendary_desc || d.m_legendary_desc || '',
          notes: d.notes || d._notes || '',
          traits: d.traits || d._traits || [],
          actions: d.actions || d._actions || [],
          reactions: d.reactions || d._reactions || [],
          legendary: d.legendary || d._legendary || [],
        };
        const idx = dmMonsters.findIndex(x => x.id === m.id);
        if(idx >= 0) dmMonsters[idx] = m; else dmMonsters.push(m);
        _saveMonsters();
        renderMonsterDock();
        showToast('✓ ' + (m.name || 'Monstre') + ' importé');
      } catch(err){ showToast('⚠️ JSON invalide'); }
    };
    reader.readAsText(file);
  });
  event.target.value = '';
}

// ── Monster Modal ──
let _editingId = null;

function openMonsterModal(id){
  _editingId = id;
  const m = dmMonsters.find(x => x.id === id);
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
  ['traits','actions','reactions','legendary'].forEach(s => renderModalList(s, m[s] || []));
  document.getElementById('monsterModal').style.display = 'flex';
}

function _saveMonsterFields(){
  const m = dmMonsters.find(x => x.id === _editingId);
  if(!m) return;
  ['name','type','cr','xp','prof','ac','hp','speed',
   'saves','skills','dmg_immune','dmg_resist','dmg_vuln','cond_immune',
   'senses','languages','legendary_desc','notes'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) m[f] = el.value;
  });
  ['str','dex','con','int','wis','cha'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) m[f] = parseInt(el.value) || 10;
  });
  _saveMonsters();
  renderMonsterDock();
}

function closeMonsterModal(){
  _saveMonsterFields();
  document.getElementById('monsterModal').style.display = 'none';
}

function updateMod(stat){
  const el = document.getElementById('mf_'+stat);
  const modEl = document.getElementById('mmod_'+stat);
  if(el && modEl){ const m = _mod(el.value); modEl.textContent = '('+(m>=0?'+':'')+m+')'; }
}

function renderModalList(section, items){
  const container = document.getElementById('ml_'+section);
  if(!container) return;
  container.innerHTML = items.map((item, i) => `
    <div class="mm-list-row">
      <input type="text" value="${_esc(item.name||'')}" placeholder="Nom" oninput="_mlUpdate('${section}',${i},'name',this.value)">
      <textarea placeholder="Description" oninput="_mlUpdate('${section}',${i},'desc',this.value)">${_esc(item.desc||'')}</textarea>
      <button class="mm-rm" onclick="_mlRemove('${section}',${i})">✕</button>
    </div>
  `).join('');
}

function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function _mlUpdate(section, i, field, val){
  const m = dmMonsters.find(x => x.id === _editingId);
  if(!m || !m[section] || !m[section][i]) return;
  m[section][i][field] = val;
}

function addModalListItem(section){
  const m = dmMonsters.find(x => x.id === _editingId);
  if(!m) return;
  if(!m[section]) m[section] = [];
  m[section].push({name:'', desc:''});
  renderModalList(section, m[section]);
}

function _mlRemove(section, i){
  const m = dmMonsters.find(x => x.id === _editingId);
  if(!m || !m[section]) return;
  m[section].splice(i, 1);
  renderModalList(section, m[section]);
}

async function saveMonsterModal(){
  const m = dmMonsters.find(x => x.id === _editingId);
  if(!m) return;
  ['name','type','cr','xp','prof','ac','hp','speed',
   'saves','skills','dmg_immune','dmg_resist','dmg_vuln','cond_immune',
   'senses','languages','legendary_desc','notes'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) m[f] = el.value;
  });
  ['str','dex','con','int','wis','cha'].forEach(f => {
    const el = document.getElementById('mf_'+f);
    if(el) m[f] = parseInt(el.value) || 10;
  });
  _saveMonsters();
  renderMonsterDock();
  document.getElementById('mmTitle').textContent = m.name || 'Monstre';
  if(!_dbDirHandle && 'showDirectoryPicker' in window){
    const pick = confirm('Pas de dossier DB connecté.\nVoulez-vous choisir un dossier pour sauvegarder les fiches en fichiers JSON ?');
    if(pick) await selectDbDir();
  }
  showToast('✓ ' + (m.name || 'Monstre') + ' sauvegardé');
}

function exportMonsterFromModal(){
  saveMonsterModal();
  const m = dmMonsters.find(x => x.id === _editingId);
  if(!m) return;
  const blob = new Blob([JSON.stringify(m, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = (m.name || 'monstre').replace(/\s+/g,'_').toLowerCase().replace(/[^a-z0-9_]/g,'');
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
    reader.readAsDataURL(file); // → data:audio/wav;base64,...
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
