// ── URL Shortener (is.gd, fallback null) ─────────────────────────────────────
async function _shortenUrl(url) {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const short = (await res.text()).trim();
    return short.startsWith('http') ? short : null;
  } catch { return null; }
}

const DND = {
  // Spell slot tables
  _SLOTS_FULL: [null, [2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],[4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]],
  _SLOTS_HALF: [null,[0,0,0,0,0,0,0,0,0],[2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],[4,3,2,0,0,0,0,0,0],[4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,3,1,0,0,0,0],[4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,0,0,0,0]],
  _SLOTS_WARLOCK: [null,{s:1,l:1},{s:2,l:1},{s:2,l:2},{s:2,l:2},{s:2,l:3},{s:2,l:3},{s:2,l:4},{s:2,l:4},{s:2,l:5},{s:2,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:3,l:5},{s:4,l:5},{s:4,l:5},{s:4,l:5},{s:4,l:5}],
  _SCHOOLS: ['Abjuration','Invocation','Divination','Enchantement','Évocation','Illusion','Nécromancie','Transmutation'],

  getSlots(spellType, level) {
    const lv = Math.max(1, Math.min(20, parseInt(level)||1));
    if (spellType === 'warlock') {
      const w = this._SLOTS_WARLOCK[lv]; if(!w) return {};
      return { [w.l]: w.s };
    }
    const row = (spellType==='half' ? this._SLOTS_HALF : this._SLOTS_FULL)[lv];
    if(!row) return {};
    const out={};
    row.forEach((max,i)=>{ if(max>0) out[i+1]=max; });
    return out;
  },

  skills: [
    {name:'Acrobaties',ability:'dex'},{name:'Arcanes',ability:'int'},
    {name:'Athlétisme',ability:'str'},{name:'Discrétion',ability:'dex'},
    {name:'Dressage',ability:'wis'},{name:'Escamotage',ability:'dex'},
    {name:'Histoire',ability:'int'},{name:'Intimidation',ability:'cha'},
    {name:'Investigation',ability:'int'},{name:'Médecine',ability:'wis'},
    {name:'Nature',ability:'int'},{name:'Perception',ability:'wis'},
    {name:'Perspicacité',ability:'wis'},{name:'Persuasion',ability:'cha'},
    {name:'Religion',ability:'int'},{name:'Représentation',ability:'cha'},
    {name:'Survie',ability:'wis'},{name:'Tromperie',ability:'cha'},
  ],

  storageKey: null,
  _saveTimer: null,
  _meta: null,
  _mobileTab: 'tab-combat',
  _isSpellcaster: false,

  mod(score) { return Math.floor(((parseInt(score)||10)-10)/2); },
  modStr(score) { const m=this.mod(score); return m>=0?'+'+m:''+m; },
  profBonus(level) { return Math.ceil((parseInt(level)||1)/4)+1; },

  _loadMeta() {
    if(this._meta) return this._meta;
    try { this._meta = JSON.parse(localStorage.getItem(this.storageKey)||'{}'); } catch(e){ this._meta={}; }
    return this._meta;
  },

  initSortablePanels() {
    if(typeof Sortable === 'undefined') return;
    // Give each panel a stable ID based on its title text
    document.querySelectorAll('.panel').forEach(p => {
      if(!p.dataset.panelId) {
        const t = p.querySelector('.panel-title')?.textContent.trim() || p.id || '';
        p.dataset.panelId = t.toLowerCase().replace(/[^\w]/g,'_') || ('p_'+Math.random().toString(36).slice(2));
      }
    });
    // Inject drag handle into every panel-header
    document.querySelectorAll('.panel-header').forEach(h => {
      if(!h.querySelector('.panel-drag')) {
        const s = document.createElement('span');
        s.className = 'panel-drag'; s.title = 'Déplacer'; s.textContent = '⠿';
        h.prepend(s);
      }
    });
    // Restore saved order first
    this._restorePanelOrder();
    // Init Sortable on each column
    ['col-left','col-center','col-right'].forEach(cls => {
      const col = document.querySelector('.'+cls);
      if(!col) return;
      Sortable.create(col, {
        animation: 150,
        handle: '.panel-drag',
        group: 'sheet-panels',
        ghostClass: 'sortable-ghost',
        onEnd: () => this._savePanelOrder()
      });
    });
  },

  _savePanelOrder() {
    if(!this.storageKey) return;
    const order = {};
    ['col-left','col-center','col-right'].forEach(cls => {
      const col = document.querySelector('.'+cls);
      if(col) order[cls] = [...col.querySelectorAll(':scope > .panel')].map(p => p.dataset.panelId);
    });
    localStorage.setItem(this.storageKey+'_panel_order', JSON.stringify(order));
  },

  _restorePanelOrder() {
    if(!this.storageKey) return;
    const raw = localStorage.getItem(this.storageKey+'_panel_order');
    if(!raw) return;
    try {
      const order = JSON.parse(raw);
      Object.entries(order).forEach(([cls, ids]) => {
        const col = document.querySelector('.'+cls);
        if(!col) return;
        ids.forEach(id => {
          const p = document.querySelector('.panel[data-panel-id="'+id+'"]');
          if(p) col.appendChild(p);
        });
      });
    } catch(e) {}
  },

  init() {
    const id = new URLSearchParams(location.search).get('id');
    const notice = document.getElementById('no-char-notice');
    const body   = document.getElementById('sheet-body');
    if(!id) {
      if(notice) notice.style.display='flex';
      return;
    }
    if(body) body.style.display='';
    this.storageKey = 'dnd5e_char_'+id;
    this.load();
    this.bindAll();
    this.recalcAll();
    this.initSortablePanels();
    // Mobile: restore last tab or default to combat
    const savedTab = localStorage.getItem('_mtab_'+this.storageKey) || 'tab-combat';
    this.showMobileTab(savedTab);
    // Reapply on resize
    window.addEventListener('resize', ()=>{
      if(window.innerWidth > 768) {
        // Desktop: remove inline styles, CSS grid takes over
        document.querySelectorAll('.panel[data-tab]').forEach(el=>{
          el.style.display = '';
        });
        // Spell panel: only remove inline if it's a caster (otherwise keep it hidden)
        const sp = document.getElementById('spell-panel');
        if(sp && !this._isSpellcaster) sp.style.display = 'none';
      } else {
        this.showMobileTab(this._mobileTab);
      }
    }, {passive:true});
  },

  save() {
    if(!this.storageKey) return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.gatherData()));
  },
  autoSave() { clearTimeout(this._saveTimer); this._saveTimer=setTimeout(()=>this.save(),400); },

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if(!raw) return;
    const data = JSON.parse(raw);
    this._meta = data;
    this.applyData(data);
    document.title = 'D&D — '+(data.char_name||data._className||'Personnage');
    this.showToast('Fiche chargée');
  },

  gatherData() {
    const data={};
    document.querySelectorAll('[data-field]').forEach(el=>{
      data[el.dataset.field] = el.type==='checkbox' ? el.checked : el.value;
    });
    data._attacks   = this.gatherAttacks();
    data._spells    = this.gatherSpells();
    data._equipment = this.gatherList('equipment-list');
    data._features  = this.gatherFeatures();
    data._resources = this.gatherResources();
    data._profLanguages = this.gatherTags('prof-lang-tags');
    ['traits','ideals','bonds','flaws','notes','backstory','custom_rules'].forEach(id=>{
      data['_'+id] = document.getElementById(id)?.value||'';
    });
    document.querySelectorAll('.spell-slot-dot').forEach(dot=>{
      data['_slot_'+dot.dataset.level+'_'+dot.dataset.index] = dot.classList.contains('used');
    });
    document.querySelectorAll('[data-death]').forEach(cb=>{
      data['_death_'+cb.dataset.death] = cb.checked;
    });
    const meta = this._loadMeta();
    ['_id','_classId','_className','_classIcon','_spellType','_spellAbility','_hd'].forEach(k=>{
      if(meta[k]!==undefined) data[k]=meta[k];
    });
    data._portrait = this._portrait || '';
    return data;
  },

  applyData(data) {
    document.querySelectorAll('[data-field]').forEach(el=>{
      const v=data[el.dataset.field];
      if(v!==undefined){ if(el.type==='checkbox') el.checked=!!v; else el.value=v; }
    });
    if(data._attacks)   this.restoreAttacks(data._attacks);
    if(data._spells)    this.restoreSpells(data._spells);
    if(data._equipment) this.restoreList('equipment-list',data._equipment);
    if(data._features)  this.restoreFeatures(data._features);
    if(data._resources) this.restoreResources(data._resources);
    if(data._profLanguages) this.restoreTags('prof-lang-tags',data._profLanguages);
    ['traits','ideals','bonds','flaws','notes','backstory','custom_rules'].forEach(id=>{
      const el=document.getElementById(id); if(el&&data['_'+id]) el.value=data['_'+id];
    });
    document.querySelectorAll('[data-death]').forEach(cb=>{
      const k='_death_'+cb.dataset.death; if(data[k]!==undefined) cb.checked=data[k];
    });
    if(data._classIcon){ const el=document.getElementById('header-class-icon'); if(el) el.textContent=data._classIcon; }
    if(data._className){ const el=document.getElementById('header-class-name'); if(el) el.textContent=data._className; }
    if(data._hd){ const el=document.getElementById('hd-display'); if(el) el.textContent='d'+data._hd; }
    if(data.char_name){ const el=document.getElementById('header-char-name'); if(el) el.textContent=data.char_name||'—'; }
    if(data._portrait){ this._portrait=data._portrait; const img=document.getElementById('portrait-img'); if(img){img.src=data._portrait;img.style.display='';} const ph=document.getElementById('portrait-placeholder'); if(ph) ph.style.display='none'; }
    this._isSpellcaster = !!data._spellType;
    if(data._spellType){
      const sp=document.getElementById('spell-panel'); if(sp) sp.style.display='';
      this.renderSpellSlots(data._spellType, parseInt(data.level)||1, data);
    }
  },

  renderSpellSlots(spellType, level, savedData) {
    const container=document.getElementById('spell-slots-grid');
    if(!container) return;
    const saved={};
    container.querySelectorAll('.spell-slot-dot').forEach(dot=>{
      saved[dot.dataset.level+'_'+dot.dataset.index]=dot.classList.contains('used');
    });
    container.innerHTML='';
    const slots=this.getSlots(spellType, level);
    Object.entries(slots).forEach(([lvl,max])=>{
      if(!max) return;
      const item=document.createElement('div'); item.className='spell-slot-item';
      let dots='';
      for(let i=0;i<max;i++){
        const key=lvl+'_'+i;
        const used = savedData ? !!savedData['_slot_'+key] : !!saved[key];
        dots+=`<div class="spell-slot-dot${used?' used':''}" data-level="${lvl}" data-index="${i}" onclick="DND.toggleSlot(this)"></div>`;
      }
      item.innerHTML=`<div class="spell-slot-level">Niv.${lvl}</div><div class="spell-slot-dots">${dots}</div>`;
      container.appendChild(item);
    });
  },
  toggleSlot(el){ el.classList.toggle('used'); this.autoSave(); },

  recalcAll() {
    const ab={};
    ['str','dex','con','int','wis','cha'].forEach(k=>{
      ab[k]=parseInt(document.querySelector('[data-field="ability_'+k+'"]')?.value)||10;
    });
    const level=parseInt(document.querySelector('[data-field="level"]')?.value)||1;
    const prof=this.profBonus(level);
    const profEl=document.getElementById('prof-bonus'); if(profEl) profEl.textContent='+'+prof;
    ['str','dex','con','int','wis','cha'].forEach(k=>{
      const el=document.getElementById('mod_'+k); if(el) el.textContent=this.modStr(ab[k]);
    });
    ['str','dex','con','int','wis','cha'].forEach(k=>{
      const cb=document.querySelector('[data-field="save_prof_'+k+'"]');
      const el=document.getElementById('save_'+k); if(!el) return;
      const total=this.mod(ab[k])+(cb?.checked?prof:0);
      el.textContent=total>=0?'+'+total:''+total;
    });
    this.skills.forEach((sk,i)=>{
      const cb=document.querySelector('[data-field="skill_prof_'+i+'"]');
      const ex=document.querySelector('[data-field="skill_expert_'+i+'"]');
      const el=document.getElementById('skill_mod_'+i); if(!el) return;
      let total=this.mod(ab[sk.ability]);
      if(ex?.checked) total+=prof*2; else if(cb?.checked) total+=prof;
      el.textContent=total>=0?'+'+total:''+total;
    });
    const percIdx=this.skills.findIndex(s=>s.name==='Perception');
    const percEl=document.getElementById('skill_mod_'+percIdx);
    const passiveEl=document.getElementById('passive-perception');
    if(passiveEl&&percEl) passiveEl.textContent=10+parseInt(percEl.textContent);
    this.updateHPBar();
    const meta=this._loadMeta();
    const sp=document.getElementById('spell-panel');
    if(sp&&sp.style.display!=='none'&&meta._spellType) this.renderSpellSlots(meta._spellType,level);
    this.autoSave();
  },

  updateHPBar() {
    const cur=parseInt(document.querySelector('[data-field="hp_current"]')?.value)||0;
    const max=parseInt(document.querySelector('[data-field="hp_max"]')?.value)||1;
    const temp=parseInt(document.querySelector('[data-field="hp_temp"]')?.value)||0;
    const pct=Math.max(0,Math.min(100,cur/Math.max(max,1)*100));
    const bg=pct<25?'linear-gradient(90deg,#4a0000,#8b1a1a)':pct<50?'linear-gradient(90deg,#8b1a1a,#b22222)':'linear-gradient(90deg,#8b1a1a,#cc3333)';
    const label=cur+'/'+max+(temp?' (+'+temp+')':'');
    // Main HP bar
    const bar=document.getElementById('hp-bar-fill'); if(bar){ bar.style.width=pct+'%'; bar.style.background=bg; }
    const txt=document.getElementById('hp-bar-text'); if(txt) txt.textContent=label;
    // Mobile HP widget (sync values only when not actively focused)
    const mobBar=document.getElementById('mob-hp-fill'); if(mobBar){ mobBar.style.width=pct+'%'; mobBar.style.background=bg; }
    const mobTxt=document.getElementById('mob-hp-text'); if(mobTxt) mobTxt.textContent=label;
    const mobCur=document.getElementById('mob-hp-cur'); if(mobCur&&document.activeElement!==mobCur) mobCur.value=cur||'';
    const mobMax=document.getElementById('mob-hp-max'); if(mobMax&&document.activeElement!==mobMax) mobMax.value=max||'';
    const mobTmp=document.getElementById('mob-hp-tmp'); if(mobTmp&&document.activeElement!==mobTmp) mobTmp.value=temp||'';
  },

  bindAll() {
    document.querySelectorAll('[data-field^="ability_"],[data-field="level"]').forEach(el=>{
      el.addEventListener('input',()=>this.recalcAll());
    });
    document.querySelectorAll('[data-field^="save_prof_"],[data-field^="skill_prof_"],[data-field^="skill_expert_"]').forEach(el=>{
      el.addEventListener('change',()=>this.recalcAll());
    });
    document.querySelectorAll('[data-field^="hp_"]').forEach(el=>{
      el.addEventListener('input',()=>{ this.updateHPBar(); this.autoSave(); });
    });
    document.querySelectorAll('[data-field]').forEach(el=>{
      el.addEventListener(el.type==='checkbox'?'change':'input',()=>this.autoSave());
    });
    const charNameEl=document.querySelector('[data-field="char_name"]');
    if(charNameEl) charNameEl.addEventListener('input',()=>{
      const hdr=document.getElementById('header-char-name'); if(hdr) hdr.textContent=charNameEl.value||'—';
    });
    ['traits','ideals','bonds','flaws','notes','backstory'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.addEventListener('input',()=>this.autoSave());
    });
    document.querySelectorAll('[data-death]').forEach(cb=>{
      cb.addEventListener('change',()=>this.autoSave());
    });
    // Mobile HP widget — syncs to main hp_* inputs bidirectionally
    [['mob-hp-cur','hp_current'],['mob-hp-max','hp_max'],['mob-hp-tmp','hp_temp']].forEach(([mobId,field])=>{
      const mobEl=document.getElementById(mobId);
      if(!mobEl) return;
      mobEl.addEventListener('input',()=>{
        const mainEl=document.querySelector(`[data-field="${field}"]`);
        if(mainEl) mainEl.value=mobEl.value;
        this.updateHPBar();
        this.autoSave();
      });
    });
  },

  // ---- MOBILE TABS ----
  showMobileTab(name) {
    this._mobileTab = name;
    document.querySelectorAll('.mobile-tab-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.tabTarget === name);
    });
    if(this.storageKey) localStorage.setItem('_mtab_'+this.storageKey, name);
    if(window.innerWidth > 768) return;
    // Must use 'block' not '' — CSS media rule hides [data-tab] panels, inline '' won't override it
    document.querySelectorAll('.panel[data-tab]').forEach(el=>{
      const isActive = el.dataset.tab === name;
      if(el.id === 'spell-panel') {
        el.style.display = (isActive && this._isSpellcaster) ? 'block' : 'none';
      } else {
        el.style.display = isActive ? 'block' : 'none';
      }
    });
  },

  // ---- RESTS ----
  longRest() {
    if(!confirm('🌙 Effectuer un long repos ?\nPV restaurés au max, emplacements et ressources rechargés.')) return;
    const maxEl=document.querySelector('[data-field="hp_max"]');
    const curEl=document.querySelector('[data-field="hp_current"]');
    if(maxEl&&curEl){ curEl.value=maxEl.value; this.updateHPBar(); }
    document.querySelectorAll('.spell-slot-dot.used').forEach(d=>d.classList.remove('used'));
    document.querySelectorAll('[data-death]').forEach(cb=>cb.checked=false);
    // Reset ALL resources (long + short recharge)
    document.querySelectorAll('.resource-item').forEach(item=>{
      const recharge=item.querySelector('.resource-recharge')?.value;
      if(recharge==='long'||recharge==='short'){
        item.querySelectorAll('.resource-dot').forEach(d=>d.classList.remove('spent'));
      }
    });
    this.save();
    this.showToast('🌙 Long repos effectué !');
  },

  shortRest() {
    if(!confirm('☀️ Effectuer un court repos ?\nLes ressources à court repos sont rechargées.')) return;
    // Reset only short-rest resources
    document.querySelectorAll('.resource-item').forEach(item=>{
      const recharge=item.querySelector('.resource-recharge')?.value;
      if(recharge==='short'){
        item.querySelectorAll('.resource-dot').forEach(d=>d.classList.remove('spent'));
      }
    });
    this.save();
    this.showToast('☀️ Court repos effectué !');
  },

  // ---- ATTACKS ----
  gatherAttacks() {
    return [...document.querySelectorAll('#attacks-body tr')].map(tr=>{
      const inp=tr.querySelectorAll('input');
      return {name:inp[0]?.value||'',bonus:inp[1]?.value||'',damage:inp[2]?.value||'',type:inp[3]?.value||''};
    });
  },
  restoreAttacks(list) {
    const body=document.getElementById('attacks-body'); if(!body) return;
    body.innerHTML=''; list.forEach(a=>this.addAttackRow(a));
  },
  addAttackRow(data={}) {
    const body=document.getElementById('attacks-body'); if(!body) return;
    const tr=document.createElement('tr'); tr.className='attack-row';
    tr.innerHTML=`<td><input type="text" placeholder="Nom" value="${data.name||''}"></td><td><input type="text" placeholder="+0" value="${data.bonus||''}" style="width:48px;text-align:center"></td><td><input type="text" placeholder="1d8+3" value="${data.damage||''}"></td><td><input type="text" placeholder="Tranchant" value="${data.type||''}"></td><td><button class="attack-delete" onclick="this.closest('tr').remove();DND.autoSave()">×</button></td>`;
    tr.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',()=>this.autoSave()));
    body.appendChild(tr);
  },

  // ---- SPELLS ----
  gatherSpells() {
    return [...document.querySelectorAll('#spell-list .spell-item')].map(item=>{
      const selects=item.querySelectorAll('select');
      const texts=item.querySelectorAll('input[type="text"]');
      const cbs=item.querySelectorAll('input[type="checkbox"]');
      return {
        prepared: cbs[0]?.checked||false,
        level:    parseInt(selects[0]?.value)||0,
        school:   selects[1]?.value||'',
        name:     texts[0]?.value||'',
        range:    texts[1]?.value||'',
        duration: texts[2]?.value||'',
        v: cbs[1]?.checked||false,
        s: cbs[2]?.checked||false,
        m: cbs[3]?.checked||false,
        summary:  item.querySelector('.spell-summary')?.value||''
      };
    });
  },
  restoreSpells(data) {
    const container=document.getElementById('spell-list'); if(!container) return;
    container.innerHTML='';
    const list=Array.isArray(data)?data:Object.entries(data).flatMap(([lvl,spells])=>spells.map(s=>({...s,level:parseInt(lvl)})));
    list.forEach(s=>this.addSpellItem(s));
  },
  addSpell() { this.addSpellItem({}); this.autoSave(); },
  addSpellItem(data={}) {
    const container=document.getElementById('spell-list'); if(!container) return;
    const div=document.createElement('div'); div.className='spell-item';
    const schoolOpts=this._SCHOOLS.map(s=>`<option value="${s}" ${data.school===s?'selected':''}>${s}</option>`).join('');
    const levelOpts=[0,1,2,3,4,5,6,7,8,9].map(l=>`<option value="${l}" ${data.level==l?'selected':''}>${l===0?'Tour':l}</option>`).join('');
    div.innerHTML=`
      <div class="spell-item-actions">
        <button class="spell-expand-btn" onclick="this.closest('.spell-item').classList.toggle('expanded')" title="Résumé">▾</button>
        <button class="spell-delete" onclick="this.closest('.spell-item').remove();DND.autoSave()">×</button>
      </div>
      <div class="spell-item-row">
        <input type="checkbox" class="spell-prepared-cb" title="Préparé" ${data.prepared?'checked':''}>
        <select class="spell-level-select" title="Niveau">${levelOpts}</select>
        <select class="spell-school-select" title="École de magie"><option value="">—</option>${schoolOpts}</select>
        <input type="text" class="spell-name-input" placeholder="Nom du sort" value="${data.name||''}">
        <input type="text" class="spell-range-input" placeholder="Portée" value="${data.range||''}">
        <input type="text" class="spell-duration-input" placeholder="Durée" value="${data.duration||''}">
        <label class="spell-component"><input type="checkbox" ${data.v?'checked':''}>V</label>
        <label class="spell-component"><input type="checkbox" ${data.s?'checked':''}>S</label>
        <label class="spell-component"><input type="checkbox" ${data.m?'checked':''}>M</label>
      </div>
      <textarea class="spell-summary" placeholder="Résumé du sort, effets, conditions…">${data.summary||''}</textarea>`;
    div.querySelectorAll('input[type="text"],select').forEach(el=>el.addEventListener('input',()=>this.autoSave()));
    div.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.addEventListener('change',()=>this.autoSave()));
    div.querySelector('.spell-summary').addEventListener('input',()=>this.autoSave());
    container.appendChild(div);
  },

  sortSpells(by) {
    const container=document.getElementById('spell-list'); if(!container) return;
    const items=[...container.querySelectorAll('.spell-item')];
    items.sort((a,b)=>{
      if(by==='level') return parseInt(a.querySelector('.spell-level-select').value)-parseInt(b.querySelector('.spell-level-select').value);
      if(by==='school'){
        const sa=a.querySelector('.spell-school-select').value||'zzz';
        const sb=b.querySelector('.spell-school-select').value||'zzz';
        return sa.localeCompare(sb,'fr');
      }
      return 0;
    });
    items.forEach(item=>container.appendChild(item));
    this.autoSave();
  },

  // ---- RESOURCES ----
  addResource() { this.addResourceItem({}); },
  addResourceItem(data={}) {
    const container=document.getElementById('resources-list'); if(!container) return;
    const max=parseInt(data.max)||3;
    const div=document.createElement('div'); div.className='resource-item';
    div.innerHTML=`
      <div class="resource-header-row">
        <input type="text" class="resource-name" placeholder="Rage, Ki, Inspiration bardique…" value="${data.name||''}">
        <select class="resource-recharge">
          <option value="long" ${!data.recharge||data.recharge==='long'?'selected':''}>⟳ Long</option>
          <option value="short" ${data.recharge==='short'?'selected':''}>⟳ Court</option>
          <option value="manual" ${data.recharge==='manual'?'selected':''}>Manuel</option>
        </select>
        <label class="resource-max-label">Max<input type="number" class="resource-max-input" value="${max}" min="0" max="30"></label>
        <button class="equipment-delete" style="display:flex" onclick="this.closest('.resource-item').remove();DND.autoSave()">×</button>
      </div>
      <div class="resource-dots-row"></div>`;
    this._renderResourceDots(div, max, data.dots);
    div.querySelector('.resource-max-input').addEventListener('input',e=>{
      this._renderResourceDots(div, parseInt(e.target.value)||0, null);
      this.autoSave();
    });
    div.querySelector('.resource-name').addEventListener('input',()=>this.autoSave());
    div.querySelector('.resource-recharge').addEventListener('change',()=>this.autoSave());
    container.appendChild(div);
  },
  _renderResourceDots(itemEl, max, savedStates) {
    const row=itemEl.querySelector('.resource-dots-row'); if(!row) return;
    row.innerHTML='';
    for(let i=0;i<Math.min(max,30);i++){
      const dot=document.createElement('div');
      dot.className='resource-dot'+(savedStates&&savedStates[i]?' spent':'');
      dot.onclick=()=>{ dot.classList.toggle('spent'); this.autoSave(); };
      row.appendChild(dot);
    }
  },
  gatherResources() {
    return [...document.querySelectorAll('#resources-list .resource-item')].map(item=>({
      name:     item.querySelector('.resource-name')?.value||'',
      max:      parseInt(item.querySelector('.resource-max-input')?.value)||0,
      recharge: item.querySelector('.resource-recharge')?.value||'long',
      dots:     [...item.querySelectorAll('.resource-dot')].map(d=>d.classList.contains('spent'))
    }));
  },
  restoreResources(list) {
    const c=document.getElementById('resources-list'); if(!c) return;
    c.innerHTML='';
    list.forEach(r=>this.addResourceItem(r));
  },

  // ---- FEATURES ----
  gatherFeatures() {
    return [...document.querySelectorAll('#features-list .feature-edit')].map(item=>({
      name:item.querySelector('input[type="text"]')?.value||'',
      desc:item.querySelector('textarea')?.value||''
    }));
  },
  restoreFeatures(list) {
    const container=document.getElementById('features-list'); if(!container) return;
    container.innerHTML='';
    list.forEach(f=>this.addFeatureItem(typeof f==='string'?{name:f,desc:''}:f));
  },
  addFeature() { this.addFeatureItem({}); this.autoSave(); },
  addFeatureItem(data={}) {
    const container=document.getElementById('features-list'); if(!container) return;
    const div=document.createElement('div'); div.className='feature-edit';
    div.style.cssText='display:flex;gap:0.5rem;align-items:flex-start;margin-bottom:0.5rem';
    div.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;gap:0.3rem"><input type="text" class="field-input" placeholder="Nom du trait" value="${data.name||''}"><textarea class="notes-area" placeholder="Description…" style="min-height:38px;font-size:0.85rem">${data.desc||''}</textarea></div><button class="equipment-delete" onclick="this.closest('.feature-edit').remove();DND.autoSave()">×</button>`;
    div.querySelectorAll('input,textarea').forEach(el=>el.addEventListener('input',()=>this.autoSave()));
    container.appendChild(div);
  },

  // ---- EQUIPMENT ----
  gatherList(containerId) {
    return [...document.querySelectorAll('#'+containerId+' .equipment-item input')].map(inp=>inp.value).filter(v=>v.trim());
  },
  restoreList(containerId,items) {
    const c=document.getElementById(containerId); if(!c) return;
    c.innerHTML=''; items.forEach(v=>this.addListItem(containerId,v));
  },
  addListItem(containerId,value='') {
    const c=document.getElementById(containerId); if(!c) return;
    const div=document.createElement('div'); div.className='equipment-item';
    div.innerHTML=`<input type="text" placeholder="…" value="${value}"><button class="equipment-delete" onclick="this.parentElement.remove();DND.autoSave()">×</button>`;
    div.querySelector('input').addEventListener('input',()=>this.autoSave());
    c.appendChild(div); this.autoSave();
  },

  // ---- TAGS ----
  gatherTags(id) {
    return [...document.querySelectorAll('#'+id+' .tag')].map(t=>t.childNodes[0]?.textContent?.trim()).filter(Boolean);
  },
  restoreTags(id,tags) {
    const c=document.getElementById(id); if(!c) return;
    c.innerHTML=''; tags.forEach(t=>this.addTag(id,t));
  },
  addTag(id,value) {
    if(!value?.trim()) return;
    const c=document.getElementById(id); if(!c) return;
    const span=document.createElement('span'); span.className='tag';
    span.innerHTML=value+'<span class="tag-delete" onclick="this.parentElement.remove();DND.autoSave()">×</span>';
    c.appendChild(span); this.autoSave();
  },
  addTagFromInput(containerId,inputId) {
    const input=document.getElementById(inputId); if(!input?.value?.trim()) return;
    this.addTag(containerId,input.value.trim()); input.value='';
  },

  // ---- PORTRAIT ----
  uploadPortrait() {
    const input=document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange=(e)=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=(ev)=>{
        this._portrait=ev.target.result;
        const img=document.getElementById('portrait-img');
        if(img){img.src=ev.target.result;img.style.display='';}
        const ph=document.getElementById('portrait-placeholder'); if(ph) ph.style.display='none';
        this.autoSave();
        this.showToast('Portrait mis à jour');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  // ---- PDF EXPORT ----
  exportPDF() {
    const d=this.gatherData();
    const win=window.open('','_blank');
    win.document.write(this._buildPDFHTML(d));
    win.document.close();
    setTimeout(()=>win.print(),600);
  },

  _buildPDFHTML(d) {
    const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const mod=s=>{const m=Math.floor(((parseInt(s)||10)-10)/2);return(m>=0?'+':'')+m;};
    const pb=this.profBonus(d.level||1);
    const abilities=[
      {k:'str',l:'FOR'},{k:'dex',l:'DEX'},{k:'con',l:'CON'},
      {k:'int',l:'INT'},{k:'wis',l:'SAG'},{k:'cha',l:'CHA'},
    ];
    const skillMap=[
      {n:'Acrobaties',a:'dex'},{n:'Arcanes',a:'int'},{n:'Athlétisme',a:'str'},
      {n:'Discrétion',a:'dex'},{n:'Dressage',a:'wis'},{n:'Escamotage',a:'dex'},
      {n:'Histoire',a:'int'},{n:'Intimidation',a:'cha'},{n:'Investigation',a:'int'},
      {n:'Médecine',a:'wis'},{n:'Nature',a:'int'},{n:'Perception',a:'wis'},
      {n:'Perspicacité',a:'wis'},{n:'Persuasion',a:'cha'},{n:'Religion',a:'int'},
      {n:'Représentation',a:'cha'},{n:'Survie',a:'wis'},{n:'Tromperie',a:'cha'},
    ];
    const abilityMap={str:'ability_str',dex:'ability_dex',con:'ability_con',int:'ability_int',wis:'ability_wis',cha:'ability_cha'};
    const saveMap={str:'save_prof_str',dex:'save_prof_dex',con:'save_prof_con',int:'save_prof_int',wis:'save_prof_wis',cha:'save_prof_cha'};

    // Build abilities HTML
    const abilitiesHTML=abilities.map(({k,l})=>{
      const score=parseInt(d[abilityMap[k]])||10;
      const m=mod(score);
      return `<div style="text-align:center;border:1.5px solid #8b1a1a;border-radius:6px;padding:4px 8px;min-width:60px;background:#fff8ee">
        <div style="font-size:9px;font-weight:700;letter-spacing:1px;color:#8b1a1a;font-family:'Cinzel',serif">${l}</div>
        <div style="font-size:18px;font-weight:700;color:#2c1810;font-family:'Cinzel',serif">${score}</div>
        <div style="font-size:13px;color:#5c3a2e;background:#f0d9a8;border-radius:10px;padding:1px 6px;margin-top:2px;font-family:'Cinzel',serif">${m}</div>
      </div>`;
    }).join('');

    // Saves HTML
    const savesHTML=abilities.map(({k,l})=>{
      const score=parseInt(d[abilityMap[k]])||10;
      const prof=d[saveMap[k]]; const val=mod(score)+(prof?pb:0);
      return `<div style="display:flex;align-items:center;gap:5px;font-size:11px;padding:1px 0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid #8b1a1a;background:${prof?'#8b1a1a':'transparent'};flex-shrink:0"></span>
        <span style="color:#5c3a2e;min-width:30px;font-family:'Cinzel',serif;font-size:10px">${l}</span>
        <span style="font-weight:700;color:#2c1810">${val>=0?'+'+val:val}</span>
      </div>`;
    }).join('');

    // Skills HTML
    const passivePerc=10+(parseInt(mod(parseInt(d.ability_wis)||10)))+(d['skill_prof_11']?pb:0)+(d['skill_expert_11']?pb:0);
    const skillsHTML=skillMap.map((sk,i)=>{
      const score=parseInt(d[abilityMap[sk.a]])||10;
      const prof=d[`skill_prof_${i}`]; const exp=d[`skill_expert_${i}`];
      const bonus=Math.floor(((score-10)/2))+(exp?pb*2:(prof?pb:0));
      return `<div style="display:flex;align-items:center;gap:4px;font-size:10px;padding:1px 0;border-bottom:1px dotted #d4c089">
        <span style="display:inline-block;width:9px;height:9px;border-radius:${exp?'2px':'50%'};border:1.5px solid #8b1a1a;background:${prof||exp?'#8b1a1a':'transparent'};flex-shrink:0"></span>
        <span style="flex:1;color:#2c1810">${sk.n}</span>
        <span style="color:#5c3a2e;font-size:9px;min-width:24px;text-align:right;font-style:italic">${sk.a.toUpperCase()}</span>
        <span style="font-weight:700;color:#2c1810;min-width:22px;text-align:right">${bonus>=0?'+'+bonus:bonus}</span>
      </div>`;
    }).join('');

    // Attacks HTML
    const attacksHTML=(d._attacks||[]).length ? `
      <section style="margin-top:12px">
        <h3 style="font-family:'Cinzel',serif;font-size:11px;color:#8b1a1a;border-bottom:2px solid #8b1a1a;padding-bottom:2px;margin-bottom:5px;letter-spacing:1px">⚔ ATTAQUES</h3>
        <table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead><tr style="background:#8b1a1a;color:#f4e4c1">
            <th style="padding:3px 5px;text-align:left;font-family:'Cinzel',serif;font-weight:600">Nom</th>
            <th style="padding:3px 5px;text-align:center;font-family:'Cinzel',serif;font-weight:600">Bonus</th>
            <th style="padding:3px 5px;text-align:center;font-family:'Cinzel',serif;font-weight:600">Dégâts</th>
            <th style="padding:3px 5px;text-align:left;font-family:'Cinzel',serif;font-weight:600">Type</th>
          </tr></thead>
          <tbody>${(d._attacks||[]).map((a,i)=>`<tr style="background:${i%2?'#fdf5e6':'#fff8ee'}">
            <td style="padding:3px 5px;font-weight:600">${esc(a.name||'—')}</td>
            <td style="padding:3px 5px;text-align:center">${esc(a.bonus||'—')}</td>
            <td style="padding:3px 5px;text-align:center">${esc(a.damage||'—')}</td>
            <td style="padding:3px 5px">${esc(a.type||'—')}</td>
          </tr>`).join('')}</tbody>
        </table>
      </section>` : '';

    // Features HTML
    const featuresHTML=(d._features||[]).length ? `
      <section style="margin-top:0">
        <h3 style="font-family:'Cinzel',serif;font-size:11px;color:#8b1a1a;border-bottom:2px solid #8b1a1a;padding-bottom:2px;margin-bottom:6px;letter-spacing:1px">📋 CAPACITÉS &amp; TRAITS</h3>
        ${(d._features||[]).map(f=>`<div style="margin-bottom:6px;font-size:10px">
          <strong style="color:#2c1810;font-family:'Cinzel',serif">${esc(f.name||'')}</strong>${f.uses?`<span style="color:#8b1a1a;font-size:9px"> (${esc(f.used||0)}/${esc(f.uses)} ${esc(f.recharge||'')})</span>`:''}
          ${f.desc?`<div style="color:#5c3a2e;margin-top:1px;line-height:1.4">${esc(f.desc)}</div>`:''}
        </div>`).join('')}
      </section>` : '';

    // Equipment HTML
    const equipHTML=(d._equipment||[]).length ? `
      <section>
        <h3 style="font-family:'Cinzel',serif;font-size:11px;color:#8b1a1a;border-bottom:2px solid #8b1a1a;padding-bottom:2px;margin-bottom:5px;letter-spacing:1px">🎒 ÉQUIPEMENT</h3>
        ${(d._equipment||[]).map(e=>`<div style="font-size:10px;padding:1px 0;border-bottom:1px dotted #d4c089">${esc(e.text||e)}</div>`).join('')}
        <div style="margin-top:5px;font-size:10px;display:flex;gap:8px;flex-wrap:wrap">
          ${['pp','gp','ep','sp','cp'].map(c=>`<span><strong style="color:#8b1a1a">${c.toUpperCase()}:</strong> ${esc(d[c]||0)}</span>`).join('')}
        </div>
      </section>` : '';

    // Personality HTML
    const persoHTML=`
      <section>
        <h3 style="font-family:'Cinzel',serif;font-size:11px;color:#8b1a1a;border-bottom:2px solid #8b1a1a;padding-bottom:2px;margin-bottom:5px;letter-spacing:1px">📜 PERSONNALITÉ</h3>
        ${d._traits?`<div style="font-size:10px;margin-bottom:4px"><strong style="color:#5c3a2e">Traits:</strong> ${esc(d._traits)}</div>`:''}
        ${d._ideals?`<div style="font-size:10px;margin-bottom:4px"><strong style="color:#5c3a2e">Idéaux:</strong> ${esc(d._ideals)}</div>`:''}
        ${d._bonds?`<div style="font-size:10px;margin-bottom:4px"><strong style="color:#5c3a2e">Liens:</strong> ${esc(d._bonds)}</div>`:''}
        ${d._flaws?`<div style="font-size:10px;margin-bottom:4px"><strong style="color:#5c3a2e">Défauts:</strong> ${esc(d._flaws)}</div>`:''}
      </section>`;

    // Prof & languages
    const profHTML=(d._profLanguages||[]).length?`
      <section style="margin-top:8px">
        <h3 style="font-family:'Cinzel',serif;font-size:11px;color:#8b1a1a;border-bottom:2px solid #8b1a1a;padding-bottom:2px;margin-bottom:5px;letter-spacing:1px">🗣 MAÎTRISES &amp; LANGUES</h3>
        <div style="font-size:10px;line-height:1.8">${(d._profLanguages||[]).map(t=>`<span style="background:#f0d9a8;border:1px solid #c9a84c;border-radius:3px;padding:1px 5px;margin:2px;display:inline-block">${esc(t)}</span>`).join(' ')}</div>
      </section>`:'';

    // Backstory
    const backstoryHTML=(d._backstory||d._notes)?`
      <div style="page-break-before:auto;margin-top:12px">
        ${d._backstory?`<section><h3 style="font-family:'Cinzel',serif;font-size:11px;color:#8b1a1a;border-bottom:2px solid #8b1a1a;padding-bottom:2px;margin-bottom:5px;letter-spacing:1px">📖 HISTOIRE</h3><p style="font-size:10px;line-height:1.6;color:#2c1810">${esc(d._backstory)}</p></section>`:''}
        ${d._notes?`<section style="margin-top:8px"><h3 style="font-family:'Cinzel',serif;font-size:11px;color:#8b1a1a;border-bottom:2px solid #8b1a1a;padding-bottom:2px;margin-bottom:5px;letter-spacing:1px">📝 NOTES</h3><p style="font-size:10px;line-height:1.6;color:#2c1810">${esc(d._notes)}</p></section>`:''}
      </div>`:'';

    // Spells HTML
    const spellsHTML=d._spellType&&(d._spells||[]).length?`
      <div style="page-break-before:always">
        <h2 style="font-family:'Cinzel',serif;font-size:13px;color:#8b1a1a;border-bottom:3px solid #8b1a1a;padding-bottom:4px;margin-bottom:10px;letter-spacing:2px">🔮 SORTS</h2>
        <div style="font-size:10px;margin-bottom:8px">
          DD: <strong>${esc(d.spell_dc||10)}</strong> &nbsp;|&nbsp; Bonus attaque: <strong>${esc(d.spell_attack||0)}</strong>
        </div>
        ${[0,1,2,3,4,5,6,7,8,9].map(lvl=>{
          const lvlSpells=(d._spells||[]).filter(s=>(parseInt(s.level)||0)===lvl);
          if(!lvlSpells.length) return '';
          return `<div style="margin-bottom:8px">
            <div style="font-family:'Cinzel',serif;font-size:10px;color:#8b1a1a;background:#f0d9a8;padding:2px 6px;border-left:3px solid #8b1a1a;margin-bottom:3px">
              ${lvl===0?'Tours de magie':`Niveau ${lvl}`}
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:9px">
              <thead><tr style="background:#e8d5a3">
                <th style="padding:2px 4px;text-align:left">Nom</th>
                <th style="padding:2px 4px">École</th>
                <th style="padding:2px 4px">Portée</th>
                <th style="padding:2px 4px">Durée</th>
                <th style="padding:2px 4px">Comp.</th>
              </tr></thead>
              <tbody>${lvlSpells.map((s,i)=>`<tr style="background:${i%2?'#fdf5e6':'#fff8ee'}">
                <td style="padding:2px 4px;font-weight:${s.prepared?'700':'400'};color:${s.prepared?'#2c1810':'#5c3a2e'}">${esc(s.name)}${s.concentration?' ⟳':''}${s.ritual?' ℟':''}</td>
                <td style="padding:2px 4px;text-align:center;color:#5c3a2e">${esc(s.school||'—')}</td>
                <td style="padding:2px 4px;text-align:center">${esc(s.range||'—')}</td>
                <td style="padding:2px 4px;text-align:center">${esc(s.duration||'—')}</td>
                <td style="padding:2px 4px;text-align:center">${esc((s.components||[]).join(', '))}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>`;
        }).join('')}
      </div>`:'';

    const portraitHTML=d._portrait?`<img src="${d._portrait}" style="width:90px;height:90px;object-fit:cover;border-radius:6px;border:2px solid #8b1a1a;float:right;margin-left:10px">`:'';

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>${esc(d.char_name||'Personnage')} — Fiche D&amp;D 5e</title>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 1.2cm 1.5cm; }
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Crimson Text',Georgia,serif;background:#f4e4c1;color:#2c1810;font-size:11px;line-height:1.5}
        .page{background:#f4e4c1;min-height:100%}
        h1{font-family:'Cinzel',serif;font-size:22px;color:#2c1810;letter-spacing:2px;line-height:1.1}
        .ornate-border{border:3px double #8b1a1a;padding:10px 14px;margin-bottom:10px;background:#fffdf5;position:relative}
        .ornate-border::before{content:'✦';position:absolute;top:-8px;left:10px;background:#f4e4c1;padding:0 4px;color:#8b1a1a;font-size:12px}
        .ornate-border::after{content:'✦';position:absolute;top:-8px;right:10px;background:#f4e4c1;padding:0 4px;color:#8b1a1a;font-size:12px}
        .divider{border:none;border-top:2px solid #8b1a1a;margin:8px 0}
        .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
        .box{background:#fffdf5;border:1px solid #c9a84c;border-radius:4px;padding:6px 8px}
        .box-title{font-family:'Cinzel',serif;font-size:9px;color:#8b1a1a;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #d4c089;margin-bottom:5px;padding-bottom:2px}
        .stat-row{display:flex;justify-content:space-between;font-size:10px;padding:1px 0;border-bottom:1px dotted #d4c089}
        .stat-row .val{font-weight:700;color:#2c1810}
        .abilities-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head>
    <body><div class="page">

      <!-- HEADER -->
      <div class="ornate-border" style="margin-bottom:10px">
        ${portraitHTML}
        <h1>${esc(d.char_name||'Personnage Sans Nom')}</h1>
        <div style="font-family:'Cinzel',serif;font-size:11px;color:#5c3a2e;margin-top:4px">
          ${d._className?`<strong>${esc(d._className)}</strong>`:''}${d.subclass?` — ${esc(d.subclass)}`:''} ${d.level?`Niveau <strong>${esc(d.level)}</strong>`:''}
          ${d.race?` &nbsp;|&nbsp; Race: <strong>${esc(d.race)}</strong>`:''}
          ${d.background?` &nbsp;|&nbsp; Fond.: <strong>${esc(d.background)}</strong>`:''}
        </div>
        <div style="font-size:10px;color:#8b6f5e;margin-top:2px">
          ${d.alignment?`Alignement: ${esc(d.alignment)} &nbsp;|&nbsp; `:''}
          Niveau: ${esc(d.level||1)} &nbsp;|&nbsp; XP: ${esc(d.xp||0)} &nbsp;|&nbsp; Maîtrise: +${pb}
        </div>
        <div style="clear:both"></div>
      </div>

      <!-- ROW 1: Abilities | Combat | Skills -->
      <div class="grid-3">

        <!-- Abilities + Saves -->
        <div>
          <div class="box" style="margin-bottom:6px">
            <div class="box-title">Caractéristiques</div>
            <div class="abilities-grid">${abilitiesHTML}</div>
          </div>
          <div class="box">
            <div class="box-title">Jets de sauvegarde</div>
            ${savesHTML}
          </div>
        </div>

        <!-- Combat -->
        <div>
          <div class="box" style="margin-bottom:6px">
            <div class="box-title">Combat</div>
            <div class="stat-row"><span>Classe d'armure</span><span class="val">${esc(d.ac||10)}</span></div>
            <div class="stat-row"><span>Points de vie</span><span class="val">${esc(d.hp_current||0)}/${esc(d.hp_max||0)}</span></div>
            ${d.hp_temp&&parseInt(d.hp_temp)?`<div class="stat-row"><span>PV temporaires</span><span class="val">${esc(d.hp_temp)}</span></div>`:''}
            <div class="stat-row"><span>Vitesse</span><span class="val">${esc(d.speed||'9m')}</span></div>
            <div class="stat-row"><span>Initiative</span><span class="val">${esc(d.initiative||0)}</span></div>
            <div class="stat-row"><span>Dés de vie</span><span class="val">${esc(d.hit_dice_remaining||d.hit_dice_total||'—')}</span></div>
          </div>
          <div class="box">
            <div class="box-title">Mort &amp; Agonie</div>
            <div style="font-size:10px;margin-bottom:3px">Réussites:
              ${[1,2,3].map(i=>`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid #2d5a27;background:${d['_death_s'+i]?'#2d5a27':'transparent'};margin:0 1px"></span>`).join('')}
            </div>
            <div style="font-size:10px">Échecs:
              ${[1,2,3].map(i=>`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid #8b1a1a;background:${d['_death_f'+i]?'#8b1a1a':'transparent'};margin:0 1px"></span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Skills -->
        <div class="box">
          <div class="box-title">Compétences</div>
          ${skillsHTML}
          <div style="margin-top:4px;padding-top:3px;border-top:1px solid #c9a84c;font-size:10px;display:flex;justify-content:space-between">
            <span style="color:#5c3a2e">Perception passive</span>
            <strong>${passivePerc}</strong>
          </div>
        </div>

      </div><!-- end row 1 -->

      ${attacksHTML}

      <!-- PAGE 2 content -->
      <div style="page-break-before:auto;margin-top:10px">
        <div class="grid-2">
          <div>${featuresHTML}</div>
          <div>
            ${equipHTML}
            ${profHTML}
          </div>
        </div>
        ${(d._traits||d._ideals||d._bonds||d._flaws)?`<hr class="divider">${persoHTML}`:''}
        ${backstoryHTML}
      </div>

      ${spellsHTML}

    </div></body></html>`;
  },

  // ---- EXPORT / IMPORT / RESET ----
  exportJSON() {
    const data=this.gatherData();
    const name=(data.char_name||data._className||'personnage').replace(/\s+/g,'_');
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=name+'.json'; a.click(); URL.revokeObjectURL(url);
    this.showToast('Fiche exportée !');
  },
  exportPortable() {
    const tmpl = window.__PORTABLE_TEMPLATE__;
    if (!tmpl) {
      alert('Template portable non disponible.\n\nLance d\'abord depuis le dossier dnd5e-sheets :\n  node scripts/build_portable.js\n\nEnsuite recharge la page.');
      return;
    }
    this.showToast('Export portable...');
    const data = this.gatherData();
    const name = (data.char_name || data._className || 'personnage').replace(/\s+/g,'_');
    const html = tmpl.replace('/*__CHAR_DATA__*/', JSON.stringify(data));
    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name+'_portable.html';
    a.click();
    URL.revokeObjectURL(a.href);
    this.showToast('Fiche portable exportée !');
  },

  exportHTML() {
    if (!window.__PORTABLE_LIGHT__) {
      alert('Template portable léger non disponible.\n\nLance une fois depuis le dossier dnd5e-sheets/ :\n  node scripts/build_light.js\n\nEnsuite recharge la page.');
      return;
    }
    const data = this.gatherData();
    const slug = (data.char_name || 'personnage').replace(/[\s/\\:*?"<>|]+/g, '_').toLowerCase();
    // Escape </script> and use function replacement to avoid $& / $' / $` substitution
    const safeJson = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
    const html = window.__PORTABLE_LIGHT__.replace(
      `window.__PORTABLE_DATA__ = /*__CHAR_DATA__*/null;`,
      () => `window.__PORTABLE_DATA__ = ${safeJson};`
    );
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + '_fiche.html';
    a.click();
    URL.revokeObjectURL(a.href);
    this.showToast('📄 ' + (data.char_name || 'Personnage') + ' exporté !');
  },

  shareLink() {
    const data = this.gatherData();
    const json = JSON.stringify(data);
    const b64  = btoa(unescape(encodeURIComponent(json)));
    const url  = 'https://gaetanfallot.github.io/dnd_app/dnd5e-sheets/view.html#' + b64;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => this.showToast('🔗 Lien copié !'))
        .catch(() => prompt('Copie ce lien :', url));
    } else {
      prompt('Copie ce lien :', url);
    }
  },

  openImportLinkModal() {
    const m = document.getElementById('import-link-modal');
    if (!m) return;
    m.style.display = 'flex';
    const inp = document.getElementById('import-link-input');
    if (inp) { inp.value = ''; inp.focus(); }
  },

  async importFromLink() {
    let raw = (document.getElementById('import-link-input')?.value || '').trim();
    if (!raw) { alert('Colle un lien de partage valide.'); return; }
    // Lien court (sans #) → tenter de résoudre la redirection
    if (raw.startsWith('http') && !raw.includes('#')) {
      try {
        this.showToast('⏳ Résolution du lien…');
        const r = await fetch(raw, { redirect: 'follow' });
        if (r.url && r.url.includes('#')) raw = r.url;
      } catch(e) { /* CORS ou réseau — on continue avec la valeur brute */ }
    }
    const hash = raw.includes('#') ? raw.split('#').pop() : raw;
    if (!hash) { alert('Colle un lien de partage valide.'); return; }
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(hash))));
      this._meta = data; this.applyData(data); this.recalcAll(); this.save();
      document.getElementById('import-link-modal').style.display = 'none';
      this.showToast('✓ Fiche importée depuis le lien !');
    } catch(e) {
      alert('Lien invalide ou corrompu.\n\nAstuce : collez le lien complet (celui avec #… dans la barre d\'adresse), pas un lien court.');
    }
  },

  importJSON() {
    const input=document.createElement('input'); input.type='file'; input.accept='.json';
    input.onchange=(e)=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=(ev)=>{
        try {
          const data=JSON.parse(ev.target.result);
          this._meta=data; this.applyData(data); this.recalcAll(); this.save();
          this.showToast('Fiche importée !');
        } catch(err){ alert('Erreur: fichier JSON invalide'); }
      };
      reader.readAsText(file);
    };
    input.click();
  },
  resetSheet() {
    if(confirm('⚠️ Effacer toutes les données ?')) {
      localStorage.removeItem(this.storageKey);
      window.location.href='index.html';
    }
  },

  showToast(msg) {
    const ex=document.querySelector('.toast'); if(ex) ex.remove();
    const div=document.createElement('div'); div.className='toast'; div.textContent=msg;
    document.body.appendChild(div); setTimeout(()=>div.remove(),2500);
  }
};

// ---- MONSTER SHEET ENGINE ----
const MONSTER = {
  storageKey: null,

  init(monsterId) {
    this.storageKey = `dnd5e_monster_${monsterId || 'default'}`;
    this.bindAll();
    this.load();
    this.recalcAll();
  },

  mod(score) { return DND.mod(score); },
  modStr(score) { return DND.modStr(score); },

  save() { localStorage.setItem(this.storageKey, JSON.stringify(this.gatherData())); },
  autoSave() { clearTimeout(this._saveTimer); this._saveTimer = setTimeout(() => this.save(), 500); },

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) { try { this.applyData(JSON.parse(raw)); } catch (e) { console.warn(e); } }
  },

  gatherData() {
    const data = {};
    document.querySelectorAll('[data-field]').forEach(el => {
      data[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
    });
    data._actions = this.gatherActions('actions-list');
    data._reactions = this.gatherActions('reactions-list');
    data._legendary = this.gatherActions('legendary-list');
    data._traits = this.gatherActions('traits-list');
    data._notes = document.getElementById('monster-notes')?.value || '';
    return data;
  },

  applyData(data) {
    document.querySelectorAll('[data-field]').forEach(el => {
      if (data[el.dataset.field] !== undefined) {
        if (el.type === 'checkbox') el.checked = data[el.dataset.field];
        else el.value = data[el.dataset.field];
      }
    });
    if (data._actions) this.restoreActions('actions-list', data._actions);
    if (data._reactions) this.restoreActions('reactions-list', data._reactions);
    if (data._legendary) this.restoreActions('legendary-list', data._legendary);
    if (data._traits) this.restoreActions('traits-list', data._traits);
    const notes = document.getElementById('monster-notes');
    if (notes && data._notes) notes.value = data._notes;
  },

  gatherActions(containerId) {
    const list = [];
    document.querySelectorAll(`#${containerId} .monster-action`).forEach(el => {
      list.push({ name: el.querySelector('.action-name-input')?.value || '', desc: el.querySelector('.action-desc-input')?.value || '' });
    });
    return list;
  },

  restoreActions(containerId, actions) {
    const container = document.getElementById(containerId); if (!container) return;
    container.innerHTML = '';
    actions.forEach(a => this.addAction(containerId, a));
  },

  addAction(containerId, data = {}) {
    const container = document.getElementById(containerId); if (!container) return;
    const div = document.createElement('div'); div.className = 'monster-action';
    div.innerHTML = `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem"><input type="text" class="action-name-input field-input" style="flex:1;font-family:'Cinzel',serif;font-weight:700;color:var(--blood-light)" placeholder="Nom de l'action" value="${data.name || ''}"><button class="equipment-delete" style="display:flex" onclick="this.closest('.monster-action').remove();MONSTER.autoSave()">×</button></div><textarea class="action-desc-input field-textarea" placeholder="Description..." style="min-height:50px">${data.desc || ''}</textarea>`;
    div.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', () => this.autoSave()));
    container.appendChild(div);
    this.autoSave();
  },

  recalcAll() {
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ab => {
      const input = document.querySelector(`[data-field="ability_${ab}"]`);
      const modEl = document.getElementById(`mod_${ab}`);
      if (modEl && input) modEl.textContent = `(${this.modStr(input.value)})`;
    });
    this.autoSave();
  },

  bindAll() {
    document.querySelectorAll('[data-field^="ability_"]').forEach(el => { el.addEventListener('input', () => this.recalcAll()); });
    document.querySelectorAll('[data-field]').forEach(el => { el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => this.autoSave()); });
    const notes = document.getElementById('monster-notes');
    if (notes) notes.addEventListener('input', () => this.autoSave());
  },

  exportJSON() {
    const data = this.gatherData(); const name = data.monster_name || 'monstre';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `monstre_${name.replace(/\s+/g, '_')}.json`; a.click(); URL.revokeObjectURL(url);
    DND.showToast('Monstre exporté !');
  },

  importJSON() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { try { this.applyData(JSON.parse(ev.target.result)); this.recalcAll(); this.save(); DND.showToast('Monstre importé !'); } catch (err) { alert('Fichier JSON invalide'); } };
      reader.readAsText(file);
    };
    input.click();
  },

  resetSheet() {
    if (confirm('⚠️ Effacer toutes les données de ce monstre ?')) { localStorage.removeItem(this.storageKey); location.reload(); }
  }
};
