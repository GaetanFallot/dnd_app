// ════════════════════════════════════════════════════════════════
//  Monster Browser — DM Screen
//  Onglets : Bibliothèque (dnd5eapi) + Mes Monstres (dmMonsters)
//  Dépend de : window.DND_MONSTERS_EN/FR, dmMonsters, initiative.js
// ════════════════════════════════════════════════════════════════

const MonsterBrowser = (() => {

  let _lang     = 'fr';
  let _library  = [];   // bundle data (API monsters)
  let _filtered = [];
  let _selected = null; // { source: 'library'|'custom', data: {...} }
  let _tab      = 'library'; // 'library' | 'custom'

  // ── Helpers ──────────────────────────────────────────────────────

  // Normalize proficiencies: handles flat {name,value} and nested {proficiency:{name},value}
  function _normProf(profs) {
    return (profs || []).map(p => ({
      name:  p.name || p.proficiency?.name || '',
      value: p.value || 0,
    }));
  }

  function getLibrary() {
    if (_lang === 'fr' && window.DND_MONSTERS_FR?.length) return window.DND_MONSTERS_FR;
    return window.DND_MONSTERS_EN || [];
  }

  function getCustom() { return typeof dmMonsters !== 'undefined' ? dmMonsters : []; }

  function _addToEncounterFromLib(m) {
    if (typeof addToEncounter !== 'function') return;
    const makeId = typeof _genId === 'function' ? _genId : () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const speedS = speedStr(m.speed);
    const profs0 = _normProf(m.proficiencies);
    const saves  = profs0.filter(p=>p.name.startsWith('Saving Throw')).map(p=>p.name.replace('Saving Throw: ','')+(p.value>=0?' +':' ')+p.value).join(', ');
    const skills = profs0.filter(p=>p.name.startsWith('Skill:')).map(p=>p.name.replace('Skill: ','')+(p.value>=0?' +':' ')+p.value).join(', ');
    const cr     = crStr(m.challenge_rating);
    const ac     = typeof m.armor_class === 'number' ? m.armor_class : (m.armor_class?.value ?? 10);
    addToEncounter({
      name:        m.name,
      type:        `${m.size||''} ${m.type||''}`.trim() + (m.subtype?` (${m.subtype})`:'') + (m.alignment?`, ${m.alignment}`:''),
      cr, xp: String(m.xp||0), prof: `+${m.proficiency_bonus||2}`, speed: speedS,
      ac: String(ac) + (m.armor_desc?` (${m.armor_desc})`:''),
      hp: `${m.hit_points} (${m.hit_dice})`,
      str: m.strength||10, dex: m.dexterity||10, con: m.constitution||10,
      int: m.intelligence||10, wis: m.wisdom||10, cha: m.charisma||10,
      saves, skills,
      dmg_immune:  (m.damage_immunities||[]).join(', '),
      dmg_resist:  (m.damage_resistances||[]).join(', '),
      dmg_vuln:    (m.damage_vulnerabilities||[]).join(', '),
      cond_immune: (m.condition_immunities||[]).map(c=>c.name||c).join(', '),
      senses:      m.senses ? Object.entries(m.senses).filter(([,v])=>v).map(([k,v])=>`${k.replace(/_/g,' ')} ${v}`).join(', ') : '',
      languages:   m.languages||'',
      traits:      (m.special_abilities||[]).map(a=>({ name:a.name, desc:a.desc||'', usage:a.usage||null })),
      actions:     (m.actions||[]).map(a=>({ name:a.name, desc:a.desc||'', attack_bonus:a.attack_bonus??null, damage:a.damage||[], dc:a.dc||null, usage:a.usage||null })),
      reactions:   (m.reactions||[]).map(a=>({ name:a.name, desc:a.desc||'', attack_bonus:a.attack_bonus??null, damage:a.damage||[], dc:a.dc||null, usage:a.usage||null })),
      legendary:   (m.legendary_actions||[]).map(a=>({ name:a.name, desc:a.desc||'', attack_bonus:a.attack_bonus??null, damage:a.damage||[], dc:a.dc||null, usage:a.usage||null })),
      notes: '',
    });
  }

  function mod(score) {
    const m = Math.floor((score - 10) / 2);
    return (m >= 0 ? '+' : '') + m;
  }

  function crStr(v) {
    if (v === 0.125) return '1/8';
    if (v === 0.25)  return '1/4';
    if (v === 0.5)   return '1/2';
    return String(v ?? 0);
  }

  function speedStr(speed) {
    if (!speed || typeof speed !== 'object') return speed || '—';
    return Object.entries(speed)
      .filter(([,v]) => v)
      .map(([k,v]) => k === 'walk' ? v : `${k} ${v}`)
      .join(', ') || '—';
  }

  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Tab switch ────────────────────────────────────────────────────

  function setTab(tab) {
    _tab = tab;
    document.getElementById('mb-tab-library')?.classList.toggle('active', tab === 'library');
    document.getElementById('mb-tab-custom')?.classList.toggle('active', tab === 'custom');
    const customCount = document.getElementById('mb-tab-custom-count');
    if (customCount) customCount.textContent = getCustom().length || '';
    const newBtn = document.getElementById('mb-new-custom-btn');
    if (newBtn) newBtn.style.display = tab === 'custom' ? '' : 'none';
    // Show/hide lang toggle
    const langDiv = document.querySelector('.mb-lang-container');
    if (langDiv) langDiv.style.display = tab === 'library' ? '' : 'none';
    buildFilters();
    renderList();
    // Clear preview
    const panel = document.getElementById('mb-preview');
    if (panel) panel.innerHTML = '<div style="color:#7a6a55;font-style:italic;font-size:0.8rem;text-align:center;padding-top:3rem">Cliquez sur un monstre pour voir sa fiche.</div>';
    _selected = null;
  }

  function newCustomMonster() {
    if (typeof dmMonsters === 'undefined') return;
    const makeId = typeof _genId === 'function' ? _genId : () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const m = {
      id: makeId(), name:'', type:'', cr:'', xp:'', prof:'',
      ac:'', hp:'', speed:'', str:10, dex:10, con:10, int:10, wis:10, cha:10,
      saves:'', skills:'', dmg_immune:'', dmg_resist:'', dmg_vuln:'', cond_immune:'',
      senses:'', languages:'', legendary_desc:'', notes:'',
      traits:[], actions:[], reactions:[], legendary:[]
    };
    dmMonsters.push(m);
    if (typeof _saveMyMonsters === 'function') _saveMyMonsters();
    close();
    if (typeof openMyMonsterModal === 'function') openMyMonsterModal(m.id);
  }

  // ── Filters ──────────────────────────────────────────────────────

  function getFilters() {
    return {
      query: (document.getElementById('mb-search')?.value || '').trim().toLowerCase(),
      crMin: parseFloat(document.getElementById('mb-cr-min')?.value) || 0,
      crMax: parseFloat(document.getElementById('mb-cr-max')?.value ?? 30) || 30,
      type:  document.getElementById('mb-filter-type')?.value  || '',
      size:  document.getElementById('mb-filter-size')?.value  || '',
    };
  }

  function matchLib(m, f) {
    const name   = (m.name || '').toLowerCase();
    const nameEn = (m.name_en || '').toLowerCase();
    if (f.query && !name.includes(f.query) && !nameEn.includes(f.query)) return false;
    const cr = m.challenge_rating ?? 0;
    if (cr < f.crMin || cr > f.crMax) return false;
    if (f.type && !(m.type||'').toLowerCase().includes(f.type.toLowerCase())) return false;
    if (f.size && m.size !== f.size) return false;
    return true;
  }

  function matchCustom(m, f) {
    if (f.query && !(m.name||'').toLowerCase().includes(f.query)) return false;
    const cr = parseFloat(m.cr) || 0;
    if (cr < f.crMin || cr > f.crMax) return false;
    if (f.type && !(m.type||'').toLowerCase().includes(f.type.toLowerCase())) return false;
    return true;
  }

  // ── Render list ───────────────────────────────────────────────────

  function renderList() {
    const listEl = document.getElementById('mb-list');
    if (!listEl) return;

    if (_tab === 'custom') {
      renderCustomList(listEl);
    } else {
      renderLibraryList(listEl);
    }
  }

  function renderLibraryList(listEl) {
    _library = getLibrary();
    const f  = getFilters();
    _filtered = _library.filter(m => matchLib(m, f));

    const lbl = document.getElementById('mb-count-label');
    if (lbl) lbl.textContent = _library.length ? `${_filtered.length} / ${_library.length} monstres` : '';

    if (!_library.length) {
      listEl.innerHTML = `<div class="mb-empty">
        Aucune donnée. Lancez d'abord :<br>
        <code>node scripts/fetch_all.js</code>
        ${_lang==='fr' ? '<br>puis <code>node scripts/translate_fr.js</code>' : ''}
      </div>`;
      return;
    }
    if (!_filtered.length) {
      listEl.innerHTML = '<div class="mb-empty">Aucun monstre pour ces filtres.</div>';
      return;
    }
    let html = '';
    for (const m of _filtered) {
      const cr   = crStr(m.challenge_rating);
      const type = m.size ? `${m.size} ${m.type}` : (m.type || '—');
      html += `<div class="mb-row" data-index="${m.index}" onclick="MonsterBrowser.previewLib('${m.index}')">
        <span class="mb-row-name">${_esc(m.name)}</span>
        <span class="mb-row-type">${_esc(type)}</span>
        <span class="mb-row-cr">FP ${cr}</span>
        <button class="mb-add-init-btn" onclick="event.stopPropagation();MonsterBrowser.addToEncounterFromLib('${m.index}')" title="Ajouter à la rencontre">⚔</button>
      </div>`;
    }
    listEl.innerHTML = html;
  }

  function renderCustomList(listEl) {
    const customs = getCustom();
    const f = getFilters();
    const filtered = customs.filter(m => matchCustom(m, f));

    const lbl = document.getElementById('mb-count-label');
    if (lbl) lbl.textContent = `${filtered.length} / ${customs.length} monstres sauvegardés`;

    if (!customs.length) {
      listEl.innerHTML = '<div class="mb-empty">Aucun monstre sauvegardé.<br>Créez-en via le dock ou importez-en depuis la bibliothèque.</div>';
      return;
    }
    if (!filtered.length) {
      listEl.innerHTML = '<div class="mb-empty">Aucun monstre pour ces filtres.</div>';
      return;
    }
    let html = '';
    for (const m of filtered) {
      html += `<div class="mb-row" data-id="${m.id}" onclick="MonsterBrowser.previewCustom('${m.id}')">
        <span class="mb-row-name">${_esc(m.name || '—')}</span>
        <span class="mb-row-type">${_esc(m.type || '—')}</span>
        <span class="mb-row-cr">FP ${_esc(m.cr || '?')}</span>
        <button class="mb-add-init-btn" onclick="event.stopPropagation();MonsterBrowser.addCustomToEncounter('${m.id}')" title="Ajouter à la rencontre">⚔</button>
        <button class="mb-del-btn" onclick="event.stopPropagation();MonsterBrowser.deleteCustom('${m.id}')" title="Supprimer">✕</button>
      </div>`;
    }
    listEl.innerHTML = html;
  }

  // ── Library preview (API monster) ────────────────────────────────

  function previewLib(index) {
    const m = _library.find(x => x.index === index);
    if (!m) return;
    _selected = { source: 'library', data: m };

    document.querySelectorAll('.mb-row').forEach(r => r.classList.remove('active'));
    document.querySelector(`.mb-row[data-index="${index}"]`)?.classList.add('active');

    renderStatblock(m, false);
  }

  // ── Custom preview (saved monster) ───────────────────────────────

  function previewCustom(id) {
    const m = getCustom().find(x => x.id === id);
    if (!m) return;
    _selected = { source: 'custom', id };

    document.querySelectorAll('.mb-row').forEach(r => r.classList.remove('active'));
    document.querySelector(`.mb-row[data-id="${id}"]`)?.classList.add('active');

    // Show custom stat block
    const panel = document.getElementById('mb-preview');
    if (!panel) return;

    const modStr = v => { const n = Math.floor(((parseInt(v)||10) - 10) / 2); return (n>=0?'+':'')+n; };

    const traits   = (m.traits||[]).map(a => `<div class="mb-entry"><strong>${_esc(a.name||'')}${a.name?'. ':''}</strong>${_esc(a.desc||'')}</div>`).join('');
    const actions  = (m.actions||[]).map(a => `<div class="mb-entry"><strong>${_esc(a.name||'')}${a.name?'. ':''}</strong>${_esc(a.desc||'')}</div>`).join('');
    const reactions= (m.reactions||[]).map(a => `<div class="mb-entry"><strong>${_esc(a.name||'')}${a.name?'. ':''}</strong>${_esc(a.desc||'')}</div>`).join('');
    const legendary= (m.legendary||[]).map(a => `<div class="mb-entry"><strong>${_esc(a.name||'')}${a.name?'. ':''}</strong>${_esc(a.desc||'')}</div>`).join('');

    panel.innerHTML = `
      <div class="mb-statblock">
        <div class="mb-statblock-header">
          <div class="mb-statblock-name">${_esc(m.name || 'Sans nom')}</div>
          <div class="mb-statblock-type">${_esc(m.type || '—')}</div>
        </div>
        <div class="mb-divider-red"></div>
        ${m.ac    ? `<div class="mb-stat-row"><span>Classe d'armure</span><span>${_esc(m.ac)}</span></div>` : ''}
        ${m.hp    ? `<div class="mb-stat-row"><span>Points de vie</span><span>${_esc(m.hp)}</span></div>` : ''}
        ${m.speed ? `<div class="mb-stat-row"><span>Vitesse</span><span>${_esc(m.speed)}</span></div>` : ''}
        <div class="mb-divider-red"></div>
        <div class="mb-ability-grid">
          ${['str','dex','con','int','wis','cha'].map((s,i) => {
            const labels = ['FOR','DEX','CON','INT','SAG','CHA'];
            const val = m[s] || 10;
            return `<div class="mb-ability"><div class="mb-abl-name">${labels[i]}</div><div class="mb-abl-score">${val}</div><div class="mb-abl-mod">(${modStr(val)})</div></div>`;
          }).join('')}
        </div>
        <div class="mb-divider-red"></div>
        ${m.saves     ? `<div class="mb-stat-row"><span>Jets de sauvegarde</span><span>${_esc(m.saves)}</span></div>` : ''}
        ${m.skills    ? `<div class="mb-stat-row"><span>Compétences</span><span>${_esc(m.skills)}</span></div>` : ''}
        ${m.dmg_immune  ? `<div class="mb-stat-row"><span>Immunités (dégâts)</span><span>${_esc(m.dmg_immune)}</span></div>` : ''}
        ${m.dmg_resist  ? `<div class="mb-stat-row"><span>Résistances</span><span>${_esc(m.dmg_resist)}</span></div>` : ''}
        ${m.dmg_vuln    ? `<div class="mb-stat-row"><span>Vulnérabilités</span><span>${_esc(m.dmg_vuln)}</span></div>` : ''}
        ${m.cond_immune ? `<div class="mb-stat-row"><span>Immunités (états)</span><span>${_esc(m.cond_immune)}</span></div>` : ''}
        ${m.senses    ? `<div class="mb-stat-row"><span>Sens</span><span>${_esc(m.senses)}</span></div>` : ''}
        ${m.languages ? `<div class="mb-stat-row"><span>Langues</span><span>${_esc(m.languages)}</span></div>` : ''}
        <div class="mb-stat-row"><span>FP</span><span>${_esc(m.cr||'?')} (${_esc(m.xp||'?')} XP)</span></div>
        ${traits    ? `<div class="mb-divider-red"></div>${traits}` : ''}
        ${actions   ? `<div class="mb-section-title">Actions</div><div class="mb-divider-thin"></div>${actions}` : ''}
        ${reactions ? `<div class="mb-section-title">Réactions</div><div class="mb-divider-thin"></div>${reactions}` : ''}
        ${legendary ? `<div class="mb-section-title">Actions légendaires</div><div class="mb-divider-thin"></div>${legendary}` : ''}
        ${m.notes   ? `<div class="mb-section-title">Notes</div><div class="mb-entry">${_esc(m.notes)}</div>` : ''}
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="mb-action-btn" onclick="MonsterBrowser.addCustomToEncounter('${m.id}')">⚔ Ajouter à la rencontre</button>
          <button class="mb-action-btn secondary" onclick="openMyMonsterModal('${m.id}');MonsterBrowser.close()">✏ Éditer</button>
          <button class="mb-action-btn danger" onclick="MonsterBrowser.deleteCustom('${m.id}')">🗑 Supprimer</button>
        </div>
      </div>`;
  }

  // ── Full stat block for library monster ───────────────────────────

  function renderStatblock(m, isCustom) {
    const panel = document.getElementById('mb-preview');
    if (!panel) return;

    const cr      = crStr(m.challenge_rating);
    const speed   = speedStr(m.speed);
    const profs1  = _normProf(m.proficiencies);
    const saves   = profs1.filter(p=>p.name.startsWith('Saving Throw'));
    const skills  = profs1.filter(p=>p.name.startsWith('Skill:'));
    const ac      = typeof m.armor_class === 'number' ? m.armor_class : (m.armor_class?.value ?? 10);
    const savesStr  = saves.map(p=>p.name.replace('Saving Throw: ','')+(p.value>=0?' +':' ')+p.value).join(', ') || '—';
    const skillsStr = skills.map(p=>p.name.replace('Skill: ','')+(p.value>=0?' +':' ')+p.value).join(', ') || '—';
    const dmgVuln = m.damage_vulnerabilities?.join(', ') || '—';
    const dmgRes  = m.damage_resistances?.join(', ') || '—';
    const dmgImm  = m.damage_immunities?.join(', ') || '—';
    const condImm = (m.condition_immunities||[]).map(c=>c.name||c).join(', ') || '—';
    const sensesStr = m.senses ? Object.entries(m.senses).filter(([,v])=>v).map(([k,v])=>`${k.replace(/_/g,' ')} ${v}`).join(', ') : '—';
    const nameEn  = m.name_en && m.name_en !== m.name ? `<div class="mb-preview-en">${_esc(m.name_en)}</div>` : '';
    const armorDesc = m.armor_desc ? ` (${_esc(m.armor_desc)})` : '';

    function renderEntries(list) {
      if (!list?.length) return '';
      return list.map(a => `<div class="mb-entry"><strong>${_esc(a.name||'')}${a.name?'. ':''}</strong>${_esc(a.desc||'')}</div>`).join('');
    }

    panel.innerHTML = `
      <div class="mb-statblock">
        <div class="mb-statblock-header">
          <div class="mb-statblock-name">${_esc(m.name)}</div>
          ${nameEn}
          <div class="mb-statblock-type">${_esc(m.size||'')} ${_esc(m.type||'')}${m.subtype?` (${_esc(m.subtype)})`:''}${m.alignment?`, ${_esc(m.alignment)}`:''}
          </div>
        </div>
        <div class="mb-divider-red"></div>
        <div class="mb-stat-row"><span>Classe d'armure</span><span>${ac}${armorDesc}</span></div>
        <div class="mb-stat-row"><span>Points de vie</span><span>${m.hit_points} (${m.hit_dice})</span></div>
        <div class="mb-stat-row"><span>Vitesse</span><span>${speed}</span></div>
        <div class="mb-divider-red"></div>
        <div class="mb-ability-grid">
          ${['strength','dexterity','constitution','intelligence','wisdom','charisma'].map((a,i)=>{
            const labels=['FOR','DEX','CON','INT','SAG','CHA']; const val=m[a]||10;
            return `<div class="mb-ability"><div class="mb-abl-name">${labels[i]}</div><div class="mb-abl-score">${val}</div><div class="mb-abl-mod">(${mod(val)})</div></div>`;
          }).join('')}
        </div>
        <div class="mb-divider-red"></div>
        ${saves.length?`<div class="mb-stat-row"><span>Jets de sauvegarde</span><span>${savesStr}</span></div>`:''}
        ${skills.length?`<div class="mb-stat-row"><span>Compétences</span><span>${skillsStr}</span></div>`:''}
        ${dmgVuln!=='—'?`<div class="mb-stat-row"><span>Vulnérabilités</span><span>${dmgVuln}</span></div>`:''}
        ${dmgRes !=='—'?`<div class="mb-stat-row"><span>Résistances</span><span>${dmgRes}</span></div>`:''}
        ${dmgImm !=='—'?`<div class="mb-stat-row"><span>Immunités (dégâts)</span><span>${dmgImm}</span></div>`:''}
        ${condImm!=='—'?`<div class="mb-stat-row"><span>Immunités (états)</span><span>${condImm}</span></div>`:''}
        <div class="mb-stat-row"><span>Sens</span><span>${sensesStr}</span></div>
        ${m.languages?`<div class="mb-stat-row"><span>Langues</span><span>${_esc(m.languages)}</span></div>`:''}
        <div class="mb-stat-row"><span>Facteur de puissance</span><span>${cr} (${m.xp} XP)</span></div>
        ${m.special_abilities?.length?`<div class="mb-divider-red"></div>${renderEntries(m.special_abilities)}`:''}
        ${m.actions?.length?`<div class="mb-section-title">Actions</div><div class="mb-divider-thin"></div>${renderEntries(m.actions)}`:''}
        ${m.reactions?.length?`<div class="mb-section-title">Réactions</div><div class="mb-divider-thin"></div>${renderEntries(m.reactions)}`:''}
        ${m.legendary_actions?.length?`
          <div class="mb-section-title">Actions légendaires</div><div class="mb-divider-thin"></div>
          ${m.legendary_desc?`<div class="mb-entry" style="font-style:italic">${_esc(m.legendary_desc)}</div>`:''}
          ${renderEntries(m.legendary_actions)}`:''}
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="mb-action-btn" onclick="MonsterBrowser.addToEncounterFromLib('${m.index}')">⚔ Ajouter à la rencontre</button>
          <button class="mb-action-btn secondary" onclick="MonsterBrowser.importToDock('${m.index}')">💾 Sauvegarder dans Mes Monstres</button>
        </div>
      </div>`;
  }

  // ── Add library monster to encounter ─────────────────────────────

  function addToEncounterFromLib(index) {
    const m = _library.find(x => x.index === index);
    if (!m) return;
    _addToEncounterFromLib(m);
    // Feedback
    const row = document.querySelector(`.mb-row[data-index="${index}"] .mb-add-init-btn`);
    if (row) { row.textContent='✓'; row.style.color='#8f5'; setTimeout(()=>{row.textContent='⚔';row.style.color='';},1500); }
  }

  // ── Add My Monster to encounter ───────────────────────────────────

  function addCustomToEncounter(id) {
    const m = getCustom().find(x => x.id === id);
    if (!m || typeof addToEncounter !== 'function') return;
    addToEncounter(m);
    // Feedback
    const row = document.querySelector(`.mb-row[data-id="${id}"] .mb-add-init-btn`);
    if (row) { row.textContent='✓'; row.style.color='#8f5'; setTimeout(()=>{row.textContent='⚔';row.style.color='';},1500); }
  }

  // ── Legacy: addToInitFromLib (kept for compatibility) ─────────────

  function addToInitFromLib(index) {
    addToEncounterFromLib(index);
  }

  function addCustomToInit(id) {
    addCustomToEncounter(id);
  }

  // ── Import library monster to dock (without adding to initiative) ─

  function importToDock(index) {
    const m = _library.find(x => x.index === index);
    if (!m) return;

    const existing = (typeof dmMonsters !== 'undefined' ? dmMonsters : []).find(x => x._libraryIndex === index);
    if (existing) {
      if (typeof showToast === 'function') showToast(`${m.name} est déjà dans Mes Monstres`);
      return;
    }

    const monster = _convertToDockFormat(m);
    monster._libraryIndex = index;
    dmMonsters.push(monster);
    if (typeof _saveMyMonsters === 'function') _saveMyMonsters();
    if (typeof showToast === 'function') showToast(`💾 ${m.name} sauvegardé dans Mes Monstres`);

    // Update tab count
    const customCount = document.getElementById('mb-tab-custom-count');
    if (customCount) customCount.textContent = getCustom().length || '';
  }

  // ── Convert API monster → dock format ─────────────────────────────

  function _convertToDockFormat(m) {
    const speedStr2 = speedStr(m.speed);
    const profs2 = _normProf(m.proficiencies);
    const saves  = profs2.filter(p=>p.name.startsWith('Saving Throw')).map(p=>p.name.replace('Saving Throw: ','')+(p.value>=0?' +':' ')+p.value).join(', ');
    const skills = profs2.filter(p=>p.name.startsWith('Skill:')).map(p=>p.name.replace('Skill: ','')+(p.value>=0?' +':' ')+p.value).join(', ');
    const cr     = crStr(m.challenge_rating);
    const ac     = typeof m.armor_class === 'number' ? m.armor_class : (m.armor_class?.value ?? 10);
    const makeId = typeof _genId === 'function' ? _genId : () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

    return {
      id:          makeId(),
      name:        m.name,
      type:        `${m.size||''} ${m.type||''}`.trim() + (m.subtype?` (${m.subtype})`:'') + (m.alignment?`, ${m.alignment}`:''),
      cr:          cr,
      xp:          String(m.xp || 0),
      prof:        `+${m.proficiency_bonus || 2}`,
      speed:       speedStr2,
      ac:          String(ac) + (m.armor_desc ? ` (${m.armor_desc})` : ''),
      hp:          `${m.hit_points} (${m.hit_dice})`,
      str:         m.strength   || 10,
      dex:         m.dexterity  || 10,
      con:         m.constitution||10,
      int:         m.intelligence||10,
      wis:         m.wisdom     || 10,
      cha:         m.charisma   || 10,
      saves:       saves,
      skills:      skills,
      dmg_immune:  (m.damage_immunities||[]).join(', '),
      dmg_resist:  (m.damage_resistances||[]).join(', '),
      dmg_vuln:    (m.damage_vulnerabilities||[]).join(', '),
      cond_immune: (m.condition_immunities||[]).map(c=>c.name||c).join(', '),
      senses:      m.senses ? Object.entries(m.senses).filter(([,v])=>v).map(([k,v])=>`${k.replace(/_/g,' ')} ${v}`).join(', ') : '',
      languages:   m.languages || '',
      traits:      (m.special_abilities||[]).map(a=>({ name:a.name, desc:a.desc||'', usage:a.usage||null })),
      actions:     (m.actions||[]).map(a=>({ name:a.name, desc:a.desc||'', attack_bonus:a.attack_bonus??null, damage:a.damage||[], dc:a.dc||null, usage:a.usage||null })),
      reactions:   (m.reactions||[]).map(a=>({ name:a.name, desc:a.desc||'', attack_bonus:a.attack_bonus??null, damage:a.damage||[], dc:a.dc||null, usage:a.usage||null })),
      legendary:   (m.legendary_actions||[]).map(a=>({ name:a.name, desc:a.desc||'', attack_bonus:a.attack_bonus??null, damage:a.damage||[], dc:a.dc||null, usage:a.usage||null })),
      legendaryDesc: m.legendary_desc || '',
      notes:       '',
    };
  }

  // ── Filters population ────────────────────────────────────────────

  function buildFilters() {
    const data = _tab === 'custom' ? getCustom() : getLibrary();
    const typeSel = document.getElementById('mb-filter-type');
    if (typeSel) {
      const types = [...new Set(data.map(m=>m.type).filter(Boolean))].sort();
      typeSel.innerHTML = '<option value="">Tous les types</option>' + types.map(t=>`<option value="${t}">${t}</option>`).join('');
    }
    const sizeSel = document.getElementById('mb-filter-size');
    if (sizeSel && _tab !== 'custom') {
      const sizes = [...new Set(getLibrary().map(m=>m.size).filter(Boolean))].sort();
      sizeSel.innerHTML = '<option value="">Toutes les tailles</option>' + sizes.map(s=>`<option value="${s}">${s}</option>`).join('');
      sizeSel.style.display = '';
    } else if (sizeSel) {
      sizeSel.style.display = 'none';
    }
  }

  // ── Open / Close ──────────────────────────────────────────────────

  function open() {
    const modal = document.getElementById('monster-browser-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    // Update custom count badge
    const customCount = document.getElementById('mb-tab-custom-count');
    if (customCount) customCount.textContent = getCustom().length || '';
    // Reset search
    const search = document.getElementById('mb-search');
    if (search) search.value = '';
    buildFilters();
    renderList();
  }

  function close() {
    const modal = document.getElementById('monster-browser-modal');
    if (modal) modal.style.display = 'none';
  }

  function setLang(l) {
    _lang = l;
    document.getElementById('mb-lang-en')?.classList.toggle('active', l === 'en');
    document.getElementById('mb-lang-fr')?.classList.toggle('active', l === 'fr');
    buildFilters();
    renderList();
    if (_selected?.source === 'library') previewLib(_selected.data.index);
  }

  // ── Delete saved monster ──────────────────────────────────────────

  function deleteCustom(id) {
    if (typeof dmMonsters === 'undefined') return;
    const m = dmMonsters.find(x => x.id === id);
    if (!m) return;
    if (!confirm(`Supprimer « ${m.name} » de vos monstres ?`)) return;
    dmMonsters.splice(dmMonsters.findIndex(x => x.id === id), 1);
    if (typeof _saveMyMonsters === 'function') _saveMyMonsters();
    if (typeof renderMonsterDock === 'function') renderMonsterDock();
    // Update count badge
    const customCount = document.getElementById('mb-tab-custom-count');
    if (customCount) customCount.textContent = getCustom().length || '';
    // Clear preview if this monster was selected
    if (_selected?.id === id) {
      _selected = null;
      const panel = document.getElementById('mb-preview');
      if (panel) panel.innerHTML = '<div style="color:#7a6a55;font-style:italic;font-size:0.8rem;text-align:center;padding-top:3rem">Cliquez sur un monstre pour voir sa fiche.</div>';
    }
    renderList();
    if (typeof showToast === 'function') showToast(`🗑 ${m.name} supprimé`);
  }

  // ── Public API ────────────────────────────────────────────────────
  return { open, close, setLang, setTab, renderList, previewLib, previewCustom,
           addToInitFromLib, addCustomToInit,
           addToEncounterFromLib, addCustomToEncounter,
           importToDock, deleteCustom };

})();
