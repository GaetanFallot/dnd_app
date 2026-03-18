/**
 * D&D 5e Character Sheet Engine
 * Handles: save/load (localStorage + JSON export/import), calculations, dynamic lists
 */

const DND = {
  // ---- ABILITY SCORE HELPERS ----
  mod(score) {
    const s = parseInt(score) || 10;
    return Math.floor((s - 10) / 2);
  },

  modStr(score) {
    const m = this.mod(score);
    return m >= 0 ? `+${m}` : `${m}`;
  },

  profBonus(level) {
    const l = parseInt(level) || 1;
    return Math.ceil(l / 4) + 1;
  },

  // ---- SKILL DEFINITIONS ----
  skills: [
    { name: 'Acrobaties', ability: 'dex' },
    { name: 'Arcanes', ability: 'int' },
    { name: 'Athlétisme', ability: 'for' },
    { name: 'Discrétion', ability: 'dex' },
    { name: 'Dressage', ability: 'sag' },
    { name: 'Escamotage', ability: 'dex' },
    { name: 'Histoire', ability: 'int' },
    { name: 'Intimidation', ability: 'cha' },
    { name: 'Investigation', ability: 'int' },
    { name: 'Médecine', ability: 'sag' },
    { name: 'Nature', ability: 'int' },
    { name: 'Perception', ability: 'sag' },
    { name: 'Perspicacité', ability: 'sag' },
    { name: 'Persuasion', ability: 'cha' },
    { name: 'Religion', ability: 'int' },
    { name: 'Représentation', ability: 'cha' },
    { name: 'Survie', ability: 'sag' },
    { name: 'Tromperie', ability: 'cha' },
  ],

  abilityMap: { for: 'str', dex: 'dex', con: 'con', int: 'int', sag: 'wis', cha: 'cha' },
  abilityLabels: { for: 'FOR', dex: 'DEX', con: 'CON', int: 'INT', sag: 'SAG', cha: 'CHA' },

  // ---- STORAGE ----
  storageKey: null,

  init(classId) {
    this.storageKey = `dnd5e_${classId}`;
    this.bindAll();
    this.load();
    this.recalcAll();
    this.showToast('Fiche chargée');
  },

  save() {
    const data = this.gatherData();
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    // Also save to the data.json conceptually (export button)
  },

  autoSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.save(), 500);
  },

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.applyData(data);
      } catch (e) {
        console.warn('Failed to load save:', e);
      }
    }
  },

  gatherData() {
    const data = {};
    // All inputs with data-field
    document.querySelectorAll('[data-field]').forEach(el => {
      const key = el.dataset.field;
      if (el.type === 'checkbox') {
        data[key] = el.checked;
      } else {
        data[key] = el.value;
      }
    });
    // Dynamic lists
    data._attacks = this.gatherAttacks();
    data._spells = this.gatherSpells();
    data._equipment = this.gatherList('equipment-list');
    data._features = this.gatherList('features-list');
    data._profLanguages = this.gatherTags('prof-lang-tags');
    data._traits = document.getElementById('traits')?.value || '';
    data._ideals = document.getElementById('ideals')?.value || '';
    data._bonds = document.getElementById('bonds')?.value || '';
    data._flaws = document.getElementById('flaws')?.value || '';
    data._notes = document.getElementById('notes')?.value || '';
    data._backstory = document.getElementById('backstory')?.value || '';

    // Spell slot usage
    document.querySelectorAll('.spell-slot-dot').forEach(dot => {
      const key = `_slot_${dot.dataset.level}_${dot.dataset.index}`;
      data[key] = dot.classList.contains('used');
    });

    // Death saves
    document.querySelectorAll('[data-death]').forEach(cb => {
      data[`_death_${cb.dataset.death}`] = cb.checked;
    });

    // Resource dots
    document.querySelectorAll('.resource-dot').forEach(dot => {
      const key = `_res_${dot.dataset.resource}_${dot.dataset.index}`;
      data[key] = dot.classList.contains('active');
    });

    return data;
  },

  applyData(data) {
    document.querySelectorAll('[data-field]').forEach(el => {
      const key = el.dataset.field;
      if (data[key] !== undefined) {
        if (el.type === 'checkbox') {
          el.checked = data[key];
        } else {
          el.value = data[key];
        }
      }
    });

    // Dynamic lists
    if (data._attacks) this.restoreAttacks(data._attacks);
    if (data._spells) this.restoreSpells(data._spells);
    if (data._equipment) this.restoreList('equipment-list', data._equipment);
    if (data._features) this.restoreList('features-list', data._features);
    if (data._profLanguages) this.restoreTags('prof-lang-tags', data._profLanguages);

    ['traits', 'ideals', 'bonds', 'flaws', 'notes', 'backstory'].forEach(id => {
      const el = document.getElementById(id);
      if (el && data[`_${id}`]) el.value = data[`_${id}`];
    });

    // Spell slots
    document.querySelectorAll('.spell-slot-dot').forEach(dot => {
      const key = `_slot_${dot.dataset.level}_${dot.dataset.index}`;
      if (data[key]) dot.classList.add('used');
    });

    // Death saves
    document.querySelectorAll('[data-death]').forEach(cb => {
      const key = `_death_${cb.dataset.death}`;
      if (data[key]) cb.checked = data[key];
    });

    // Resource dots
    document.querySelectorAll('.resource-dot').forEach(dot => {
      const key = `_res_${dot.dataset.resource}_${dot.dataset.index}`;
      if (data[key]) dot.classList.add('active');
    });
  },

  // ---- ATTACKS ----
  gatherAttacks() {
    const attacks = [];
    document.querySelectorAll('#attacks-body tr').forEach(tr => {
      const inputs = tr.querySelectorAll('input');
      if (inputs.length >= 3) {
        attacks.push({
          name: inputs[0].value,
          bonus: inputs[1].value,
          damage: inputs[2].value,
          type: inputs[3]?.value || ''
        });
      }
    });
    return attacks;
  },

  restoreAttacks(attacks) {
    const body = document.getElementById('attacks-body');
    if (!body) return;
    body.innerHTML = '';
    attacks.forEach(a => this.addAttackRow(a));
  },

  addAttackRow(data = {}) {
    const body = document.getElementById('attacks-body');
    if (!body) return;
    const tr = document.createElement('tr');
    tr.className = 'attack-row';
    tr.innerHTML = `
      <td><input type="text" placeholder="Nom" value="${data.name || ''}"></td>
      <td><input type="text" placeholder="+0" value="${data.bonus || ''}" style="width:50px;text-align:center"></td>
      <td><input type="text" placeholder="1d8+3" value="${data.damage || ''}"></td>
      <td><input type="text" placeholder="Tranchant" value="${data.type || ''}"></td>
      <td style="width:24px;position:relative"><button class="attack-delete" onclick="this.closest('tr').remove();DND.autoSave()">×</button></td>
    `;
    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => this.autoSave()));
    body.appendChild(tr);
    this.autoSave();
  },

  // ---- SPELLS ----
  gatherSpells() {
    const spells = {};
    document.querySelectorAll('.spell-level-section').forEach(sec => {
      const level = sec.dataset.spellLevel;
      spells[level] = [];
      sec.querySelectorAll('.spell-item').forEach(item => {
        const cb = item.querySelector('input[type="checkbox"]');
        const nameInput = item.querySelector('.spell-name-input');
        if (nameInput) {
          spells[level].push({
            prepared: cb?.checked || false,
            name: nameInput.value
          });
        }
      });
    });
    return spells;
  },

  restoreSpells(spells) {
    Object.entries(spells).forEach(([level, list]) => {
      const sec = document.querySelector(`.spell-level-section[data-spell-level="${level}"]`);
      if (!sec) return;
      const container = sec.querySelector('.spell-list');
      if (!container) return;
      container.innerHTML = '';
      list.forEach(s => this.addSpellItem(container, level, s));
    });
  },

  addSpellToLevel(level) {
    const sec = document.querySelector(`.spell-level-section[data-spell-level="${level}"]`);
    if (!sec) return;
    const container = sec.querySelector('.spell-list');
    this.addSpellItem(container, level, {});
    this.autoSave();
  },

  addSpellItem(container, level, data = {}) {
    const div = document.createElement('div');
    div.className = 'spell-item';
    div.innerHTML = `
      <input type="checkbox" ${data.prepared ? 'checked' : ''} title="Préparé">
      <input type="text" class="spell-name-input" placeholder="Nom du sort..." value="${data.name || ''}">
      <button class="spell-delete" onclick="this.parentElement.remove();DND.autoSave()">×</button>
    `;
    div.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => this.autoSave()));
    container.appendChild(div);
  },

  // ---- GENERIC LISTS ----
  gatherList(containerId) {
    const items = [];
    document.querySelectorAll(`#${containerId} .equipment-item input`).forEach(inp => {
      if (inp.value.trim()) items.push(inp.value);
    });
    return items;
  },

  restoreList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    items.forEach(val => this.addListItem(containerId, val));
  },

  addListItem(containerId, value = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'equipment-item';
    div.innerHTML = `
      <input type="text" placeholder="..." value="${value}">
      <button class="equipment-delete" onclick="this.parentElement.remove();DND.autoSave()">×</button>
    `;
    div.querySelector('input').addEventListener('input', () => this.autoSave());
    container.appendChild(div);
    this.autoSave();
  },

  // ---- TAGS (proficiencies/languages) ----
  gatherTags(containerId) {
    const tags = [];
    document.querySelectorAll(`#${containerId} .tag`).forEach(tag => {
      const text = tag.childNodes[0]?.textContent?.trim();
      if (text) tags.push(text);
    });
    return tags;
  },

  restoreTags(containerId, tags) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    tags.forEach(t => this.addTag(containerId, t));
  },

  addTag(containerId, value) {
    if (!value || !value.trim()) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    const span = document.createElement('span');
    span.className = 'tag';
    span.innerHTML = `${value}<span class="tag-delete" onclick="this.parentElement.remove();DND.autoSave()">×</span>`;
    container.appendChild(span);
    this.autoSave();
  },

  addTagFromInput(containerId, inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;
    this.addTag(containerId, input.value.trim());
    input.value = '';
  },

  // ---- CALCULATIONS ----
  recalcAll() {
    const abilities = {};
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ab => {
      const input = document.querySelector(`[data-field="ability_${ab}"]`);
      abilities[ab] = parseInt(input?.value) || 10;
    });

    const levelInput = document.querySelector('[data-field="level"]');
    const level = parseInt(levelInput?.value) || 1;
    const prof = this.profBonus(level);

    // Update prof bonus display
    const profDisplay = document.getElementById('prof-bonus');
    if (profDisplay) profDisplay.textContent = `+${prof}`;

    // Ability modifiers
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ab => {
      const modEl = document.getElementById(`mod_${ab}`);
      if (modEl) modEl.textContent = this.modStr(abilities[ab]);
    });

    // Saving throws
    const saveProficiencies = window.CLASS_SAVE_PROF || [];
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ab => {
      const cb = document.querySelector(`[data-field="save_prof_${ab}"]`);
      const valEl = document.getElementById(`save_${ab}`);
      if (!valEl) return;
      const isProficient = cb?.checked || false;
      const total = this.mod(abilities[ab]) + (isProficient ? prof : 0);
      valEl.textContent = total >= 0 ? `+${total}` : total;
    });

    // Skills
    const abilityKeyMap = { for: 'str', dex: 'dex', con: 'con', int: 'int', sag: 'wis', cha: 'cha' };
    this.skills.forEach((skill, i) => {
      const cb = document.querySelector(`[data-field="skill_prof_${i}"]`);
      const expertCb = document.querySelector(`[data-field="skill_expert_${i}"]`);
      const valEl = document.getElementById(`skill_mod_${i}`);
      if (!valEl) return;
      const abKey = abilityKeyMap[skill.ability];
      const isProficient = cb?.checked || false;
      const isExpert = expertCb?.checked || false;
      let total = this.mod(abilities[abKey]);
      if (isExpert) total += prof * 2;
      else if (isProficient) total += prof;
      valEl.textContent = total >= 0 ? `+${total}` : total;
    });

    // Passive Perception
    const percIdx = this.skills.findIndex(s => s.name === 'Perception');
    const percMod = document.getElementById(`skill_mod_${percIdx}`);
    const passivePerc = document.getElementById('passive-perception');
    if (passivePerc && percMod) {
      passivePerc.textContent = 10 + parseInt(percMod.textContent);
    }

    // Initiative (DEX mod)
    const initEl = document.getElementById('initiative');
    if (initEl) initEl.textContent = this.modStr(abilities.dex);

    // HP bar
    this.updateHPBar();

    // Spell DC & Attack
    if (window.CLASS_SPELL_ABILITY) {
      const spellAb = abilities[window.CLASS_SPELL_ABILITY];
      const dcEl = document.getElementById('spell-dc');
      const atkEl = document.getElementById('spell-attack');
      if (dcEl) dcEl.textContent = 8 + prof + this.mod(spellAb);
      if (atkEl) atkEl.textContent = `+${prof + this.mod(spellAb)}`;
    }

    this.autoSave();
  },

  updateHPBar() {
    const cur = parseInt(document.querySelector('[data-field="hp_current"]')?.value) || 0;
    const max = parseInt(document.querySelector('[data-field="hp_max"]')?.value) || 1;
    const temp = parseInt(document.querySelector('[data-field="hp_temp"]')?.value) || 0;
    const bar = document.getElementById('hp-bar-fill');
    const text = document.getElementById('hp-bar-text');
    if (bar) {
      const pct = Math.max(0, Math.min(100, (cur / Math.max(max, 1)) * 100));
      bar.style.width = pct + '%';
      if (pct < 25) bar.style.background = 'linear-gradient(90deg, #4a0000, #8b1a1a)';
      else if (pct < 50) bar.style.background = 'linear-gradient(90deg, #8b1a1a, #b22222)';
      else bar.style.background = 'linear-gradient(90deg, #8b1a1a, #b22222, #cc3333)';
    }
    if (text) text.textContent = `${cur}/${max}${temp ? ` (+${temp})` : ''}`;
  },

  // ---- SPELL SLOTS ----
  toggleSlot(el) {
    el.classList.toggle('used');
    this.autoSave();
  },

  // ---- RESOURCE DOTS ----
  toggleResource(el) {
    el.classList.toggle('active');
    this.autoSave();
  },

  // ---- BINDING ----
  bindAll() {
    // Auto-recalc on ability score / level / proficiency changes
    document.querySelectorAll('[data-field^="ability_"], [data-field="level"]').forEach(el => {
      el.addEventListener('input', () => this.recalcAll());
    });

    // Auto-recalc on save/skill proficiency changes
    document.querySelectorAll('[data-field^="save_prof_"], [data-field^="skill_prof_"], [data-field^="skill_expert_"]').forEach(el => {
      el.addEventListener('change', () => this.recalcAll());
    });

    // HP changes
    document.querySelectorAll('[data-field^="hp_"]').forEach(el => {
      el.addEventListener('input', () => { this.updateHPBar(); this.autoSave(); });
    });

    // Auto-save on any other input
    document.querySelectorAll('[data-field]').forEach(el => {
      const event = el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(event, () => this.autoSave());
    });

    // Textareas
    ['traits', 'ideals', 'bonds', 'flaws', 'notes', 'backstory'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.autoSave());
    });

    // Spell slot dots
    document.querySelectorAll('.spell-slot-dot').forEach(dot => {
      dot.addEventListener('click', () => this.toggleSlot(dot));
    });

    // Resource dots
    document.querySelectorAll('.resource-dot').forEach(dot => {
      dot.addEventListener('click', () => this.toggleResource(dot));
    });
  },

  // ---- EXPORT/IMPORT JSON ----
  exportJSON() {
    const data = this.gatherData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.storageKey}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Fiche exportée !');
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.applyData(data);
          this.recalcAll();
          this.save();
          this.showToast('Fiche importée !');
        } catch (err) {
          alert('Erreur: fichier JSON invalide');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  // ---- RESET ----
  resetSheet() {
    if (confirm('⚠️ Effacer toutes les données de cette fiche ? Cette action est irréversible.')) {
      localStorage.removeItem(this.storageKey);
      location.reload();
    }
  },

  // ---- TOAST ----
  showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
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

  save() {
    const data = this.gatherData();
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  },

  autoSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.save(), 500);
  },

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.applyData(data);
      } catch (e) { console.warn(e); }
    }
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
      list.push({
        name: el.querySelector('.action-name-input')?.value || '',
        desc: el.querySelector('.action-desc-input')?.value || ''
      });
    });
    return list;
  },

  restoreActions(containerId, actions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    actions.forEach(a => this.addAction(containerId, a));
  },

  addAction(containerId, data = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'monster-action';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem">
        <input type="text" class="action-name-input field-input" style="flex:1;font-family:'Cinzel',serif;font-weight:700;color:var(--blood-light)" placeholder="Nom de l'action" value="${data.name || ''}">
        <button class="equipment-delete" style="display:flex" onclick="this.closest('.monster-action').remove();MONSTER.autoSave()">×</button>
      </div>
      <textarea class="action-desc-input field-textarea" placeholder="Description..." style="min-height:50px">${data.desc || ''}</textarea>
    `;
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
    document.querySelectorAll('[data-field^="ability_"]').forEach(el => {
      el.addEventListener('input', () => this.recalcAll());
    });
    document.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => this.autoSave());
    });
    const notes = document.getElementById('monster-notes');
    if (notes) notes.addEventListener('input', () => this.autoSave());
  },

  exportJSON() {
    const data = this.gatherData();
    const name = data.monster_name || 'monstre';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monstre_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    DND.showToast('Monstre exporté !');
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.applyData(data);
          this.recalcAll();
          this.save();
          DND.showToast('Monstre importé !');
        } catch (err) { alert('Erreur: fichier JSON invalide'); }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  resetSheet() {
    if (confirm('⚠️ Effacer toutes les données de ce monstre ?')) {
      localStorage.removeItem(this.storageKey);
      location.reload();
    }
  }
};
