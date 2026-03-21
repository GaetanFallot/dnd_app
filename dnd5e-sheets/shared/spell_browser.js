// ════════════════════════════════════════════════════════════════
//  Spell Browser — fiche de personnage D&D 5e
//  Dépend de : window.DND_SPELLS_EN et/ou window.DND_SPELLS_FR
//  (générés par scripts/fetch_all.js + scripts/translate_fr.js)
// ════════════════════════════════════════════════════════════════

const SpellBrowser = (() => {

  // ── Mapping école EN → FR (pour _SCHOOLS de app.js) ─────────────
  const SCHOOL_FR = {
    'Abjuration':   'Abjuration',
    'Conjuration':  'Invocation',
    'Divination':   'Divination',
    'Enchantment':  'Enchantement',
    'Evocation':    'Évocation',
    'Illusion':     'Illusion',
    'Necromancy':   'Nécromancie',
    'Transmutation':'Transmutation',
  };

  const SCHOOLS_FR = ['Abjuration','Invocation','Divination','Enchantement','Évocation','Illusion','Nécromancie','Transmutation'];

  const CLASSES = [
    'Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard',
    'Artificer','Fighter','Rogue',
  ];

  let _lang    = 'fr';
  let _spells  = [];
  let _filtered = [];
  let _selected = null; // spell being previewed

  // ── Helpers ──────────────────────────────────────────────────────

  function getSpells() {
    if (_lang === 'fr' && window.DND_SPELLS_FR?.length) return window.DND_SPELLS_FR;
    return window.DND_SPELLS_EN || [];
  }

  function schoolDisplay(s) {
    // s may already be in French (FR bundle) or in English (EN bundle)
    return SCHOOL_FR[s] || s || '—';
  }

  function levelLabel(n) {
    return n === 0 ? 'Tour de magie' : `Niveau ${n}`;
  }

  function crStr(v) {
    if (v === 0.125) return '1/8';
    if (v === 0.25)  return '1/4';
    if (v === 0.5)   return '1/2';
    return String(v);
  }

  // ── Filter helpers ────────────────────────────────────────────────

  function getFilters() {
    return {
      query:   document.getElementById('sb-search')?.value.trim().toLowerCase() || '',
      level:   document.getElementById('sb-filter-level')?.value || '',
      school:  document.getElementById('sb-filter-school')?.value || '',
      cls:     document.getElementById('sb-filter-class')?.value || '',
      conc:    document.getElementById('sb-filter-conc')?.value || '',
      ritual:  document.getElementById('sb-filter-ritual')?.value || '',
    };
  }

  function matchesFilters(spell, f) {
    const nameFr = spell.name || '';
    const nameEn = spell.name_en || '';
    if (f.query && !nameFr.toLowerCase().includes(f.query) && !nameEn.toLowerCase().includes(f.query)) return false;
    if (f.level  !== '' && spell.level !== parseInt(f.level))   return false;
    if (f.school !== '') {
      const schoolFr = schoolDisplay(spell.school);
      if (schoolFr !== f.school) return false;
    }
    if (f.cls    !== '' && !(spell.classes||[]).some(c => c.toLowerCase().includes(f.cls.toLowerCase()))) return false;
    if (f.conc   !== '' && String(!!spell.concentration) !== f.conc) return false;
    if (f.ritual !== '' && String(!!spell.ritual)        !== f.ritual) return false;
    return true;
  }

  // ── Render spell list ─────────────────────────────────────────────

  function renderList() {
    _spells  = getSpells();
    const f  = getFilters();
    _filtered = _spells.filter(s => matchesFilters(s, f));

    const listEl = document.getElementById('sb-list');
    if (!listEl) return;

    // Update count label
    const countLbl = document.getElementById('sb-count-label');
    if (countLbl) countLbl.textContent = _spells.length ? `${_filtered.length} / ${_spells.length} sorts` : '';

    if (!_spells.length) {
      listEl.innerHTML = `<div class="sb-empty">
        Aucune donnée. Lancez d'abord :<br>
        <code>node scripts/fetch_all.js</code>
        ${_lang==='fr' ? '<br>puis <code>node scripts/translate_fr.js</code>' : ''}
      </div>`;
      return;
    }

    if (!_filtered.length) {
      listEl.innerHTML = '<div class="sb-empty">Aucun sort trouvé pour ces filtres.</div>';
      return;
    }

    // Group by level
    const byLevel = {};
    for (const s of _filtered) {
      const lv = s.level ?? 0;
      if (!byLevel[lv]) byLevel[lv] = [];
      byLevel[lv].push(s);
    }

    let html = '';
    const levels = Object.keys(byLevel).map(Number).sort((a,b) => a-b);
    for (const lv of levels) {
      html += `<div class="sb-level-header">${levelLabel(lv)} <span class="sb-count">${byLevel[lv].length}</span></div>`;
      for (const spell of byLevel[lv]) {
        const sch = schoolDisplay(spell.school);
        const tags = [
          spell.concentration ? '⟳ Conc.' : '',
          spell.ritual        ? '℟ Rituel' : '',
        ].filter(Boolean).join(' ');
        html += `<div class="sb-row" data-index="${spell.index}" onclick="SpellBrowser.preview('${spell.index}')">
          <span class="sb-row-name">${spell.name}</span>
          <span class="sb-row-school">${sch}</span>
          ${tags ? `<span class="sb-row-tags">${tags}</span>` : ''}
          <button class="sb-add-btn" onclick="event.stopPropagation();SpellBrowser.addToCaster('${spell.index}')" title="Ajouter à la fiche">＋</button>
        </div>`;
      }
    }
    listEl.innerHTML = html;
  }

  // ── Preview panel ─────────────────────────────────────────────────

  function preview(index) {
    const spell = _spells.find(s => s.index === index);
    if (!spell) return;
    _selected = spell;

    // Highlight selected row
    document.querySelectorAll('.sb-row').forEach(r => r.classList.remove('active'));
    document.querySelector(`.sb-row[data-index="${index}"]`)?.classList.add('active');

    const panel = document.getElementById('sb-preview');
    if (!panel) return;

    const sch        = schoolDisplay(spell.school);
    const comps      = (spell.components || []).join(', ') + (spell.material ? ` (${spell.material})` : '');
    const tags       = [
      spell.concentration ? '<span class="sb-tag">Concentration</span>' : '',
      spell.ritual        ? '<span class="sb-tag">Rituel</span>'        : '',
    ].filter(Boolean).join('');

    const desc = (spell.desc || '').replace(/\n/g, '<br>');
    const hl   = spell.higher_level ? `<div class="sb-hl"><strong>Aux niveaux supérieurs :</strong> ${(spell.higher_level||'').replace(/\n/g,'<br>')}</div>` : '';

    const classesStr = (spell.classes || []).join(', ') || '—';

    panel.innerHTML = `
      <div class="sb-preview-header">
        <div class="sb-preview-title">${spell.name}</div>
        ${spell.name_en && spell.name_en !== spell.name ? `<div class="sb-preview-en">${spell.name_en}</div>` : ''}
        <div class="sb-preview-subtitle">${levelLabel(spell.level)} — ${sch}</div>
        <div class="sb-preview-tags">${tags}</div>
      </div>
      <table class="sb-stat-table">
        <tr><td>Temps d'incantation</td><td>${spell.casting_time || '—'}</td></tr>
        <tr><td>Portée</td><td>${spell.range || '—'}</td></tr>
        <tr><td>Composantes</td><td>${comps || '—'}</td></tr>
        <tr><td>Durée</td><td>${spell.duration || '—'}</td></tr>
        <tr><td>Classes</td><td>${classesStr}</td></tr>
      </table>
      <div class="sb-preview-desc">${desc}</div>
      ${hl}
      <button class="sb-import-btn" onclick="SpellBrowser.addToCaster('${spell.index}')">
        ✚ Ajouter à ma liste de sorts
      </button>`;
  }

  // ── Add spell to character sheet ──────────────────────────────────

  function addToCaster(index) {
    const spell = _spells.find(s => s.index === index);
    if (!spell || typeof DND === 'undefined') return;

    const schoolFr = SCHOOL_FR[spell.school] || spell.school || '';

    DND.addSpellItem({
      name:     spell.name,
      level:    spell.level ?? 0,
      school:   schoolFr,
      range:    spell.range || '',
      duration: spell.duration || '',
      v:        (spell.components || []).includes('V'),
      s:        (spell.components || []).includes('S'),
      m:        (spell.components || []).includes('M'),
      summary:  spell.desc ? spell.desc.slice(0, 400) : '',
      prepared: false,
    });
    DND.autoSave();

    // Flash feedback on the button
    const row = document.querySelector(`.sb-row[data-index="${index}"] .sb-add-btn`);
    if (row) {
      const old = row.textContent;
      row.textContent = '✓';
      row.style.color = 'var(--arcane-glow, #8f5)';
      setTimeout(() => { row.textContent = old; row.style.color = ''; }, 1200);
    }
    const btn = document.querySelector('.sb-import-btn');
    if (btn) {
      btn.textContent = '✓ Ajouté !';
      setTimeout(() => { btn.textContent = '✚ Ajouter à ma liste de sorts'; }, 1500);
    }
  }

  // ── Open / Close ──────────────────────────────────────────────────

  function open() {
    const modal = document.getElementById('spell-browser-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    buildFilters();
    renderList();
  }

  function close() {
    const modal = document.getElementById('spell-browser-modal');
    if (modal) modal.style.display = 'none';
  }

  function setLang(l) {
    _lang = l;
    document.getElementById('sb-lang-en')?.classList.toggle('active', l === 'en');
    document.getElementById('sb-lang-fr')?.classList.toggle('active', l === 'fr');
    buildFilters();
    renderList();
    const preview = document.getElementById('sb-preview');
    if (preview && _selected) SpellBrowser.preview(_selected.index);
  }

  function buildFilters() {
    // Populate school filter based on available schools in dataset
    const schoolSel = document.getElementById('sb-filter-school');
    if (!schoolSel) return;
    const schools = [...new Set(getSpells().map(s => schoolDisplay(s.school)).filter(Boolean))].sort();
    schoolSel.innerHTML = '<option value="">Toutes les écoles</option>'
      + schools.map(s => `<option value="${s}">${s}</option>`).join('');

    const classSel = document.getElementById('sb-filter-class');
    if (!classSel) return;
    const classes = [...new Set(getSpells().flatMap(s => s.classes || []))].sort();
    classSel.innerHTML = '<option value="">Toutes les classes</option>'
      + classes.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // ── Public API ────────────────────────────────────────────────────

  return { open, close, setLang, renderList, preview, addToCaster };

})();
