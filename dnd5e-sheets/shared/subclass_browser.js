// ════════════════════════════════════════════════════════════════
//  Subclass Browser — fiche de personnage D&D 5e
//  Dépend de : window.DND_SUBCLASSES_EN et/ou window.DND_SUBCLASSES_FR
// ════════════════════════════════════════════════════════════════

const SubclassBrowser = (() => {

  const CLASS_FR = {
    'barbarian':  'Barbare',
    'bard':       'Barde',
    'cleric':     'Clerc',
    'druid':      'Druide',
    'fighter':    'Guerrier',
    'monk':       'Moine',
    'paladin':    'Paladin',
    'ranger':     'Rôdeur',
    'rogue':      'Roublard',
    'sorcerer':   'Ensorceleur',
    'warlock':    'Occultiste',
    'wizard':     'Magicien',
    'artificer':  'Artificier',
  };

  let _lang     = 'fr';
  let _selected = null;

  function getData() {
    if (_lang === 'fr' && window.DND_SUBCLASSES_FR?.length) return window.DND_SUBCLASSES_FR;
    return window.DND_SUBCLASSES_EN || [];
  }

  function classLabel(cls) {
    return CLASS_FR[cls?.toLowerCase()] || cls || '—';
  }

  function getFilters() {
    return {
      query: document.getElementById('scb-search')?.value.trim().toLowerCase() || '',
      cls:   document.getElementById('scb-filter-class')?.value || '',
    };
  }

  function matchesFilters(sc, f) {
    const name = (sc.name || '').toLowerCase();
    if (f.query && !name.includes(f.query)) return false;
    if (f.cls && (sc.class || '') !== f.cls) return false;
    return true;
  }

  function renderList() {
    const data = getData();
    const f    = getFilters();
    const filtered = data.filter(sc => matchesFilters(sc, f));

    const lbl = document.getElementById('scb-count-label');
    if (lbl) lbl.textContent = `${filtered.length} sous-classe${filtered.length !== 1 ? 's' : ''}`;

    const el = document.getElementById('scb-list');
    if (!el) return;

    if (!filtered.length) {
      el.innerHTML = '<div style="color:var(--ink-faded,#7a6a55);text-align:center;padding:2rem;font-style:italic">Aucun résultat.</div>';
      return;
    }

    let lastClass = null;
    const html = [];
    for (const sc of filtered) {
      const cls = sc.class || '';
      if (cls !== lastClass) {
        html.push(`<div style="padding:0.3rem 0.8rem 0.1rem;font-size:0.65rem;font-family:'Cinzel',serif;color:var(--gold,#c8a84b);letter-spacing:.06em;border-top:1px solid var(--border-ornate,#4a3420);margin-top:0.3rem">${classLabel(cls).toUpperCase()}</div>`);
        lastClass = cls;
      }
      const active = _selected?.index === sc.index ? 'background:#2a1f12;' : '';
      html.push(
        `<div class="scb-row" data-idx="${sc.index}" onclick="SubclassBrowser.select('${sc.index}')"
          style="padding:0.35rem 0.8rem;cursor:pointer;border-radius:3px;${active}">
          <span style="color:var(--ink-light,#d8c8a8);font-size:0.82rem">${sc.name || sc.index}</span>
          ${sc.source ? `<span style="float:right;font-size:0.65rem;color:var(--ink-faded,#7a6a55)">${sc.source}</span>` : ''}
        </div>`
      );
    }
    el.innerHTML = html.join('');
  }

  function select(idx) {
    const data = getData();
    _selected = data.find(sc => sc.index === idx) || null;
    renderList();
    renderPreview();
  }

  // Add a single feature to the character sheet's Capacités & Traits
  function addFeatureAt(i) {
    if (!_selected) return;
    const feat = (_selected.features || [])[i];
    if (!feat) return;
    if (typeof DND !== 'undefined' && DND.addFeatureItem) {
      DND.addFeatureItem({ name: feat.name || '', desc: feat.desc || '' });
      DND.autoSave();
      _showToast(`✓ "${feat.name}" ajouté aux capacités`);
    }
  }

  // Add all features of the selected subclass
  function addAllFeatures() {
    if (!_selected) return;
    const features = _selected.features || [];
    if (!features.length) return;
    if (typeof DND !== 'undefined' && DND.addFeatureItem) {
      features.forEach(f => DND.addFeatureItem({ name: f.name || '', desc: f.desc || '' }));
      DND.autoSave();
      _showToast(`✓ ${features.length} capacités ajoutées`);
    }
  }

  function _showToast(msg) {
    if (typeof DND !== 'undefined' && DND.showToast) { DND.showToast(msg); return; }
    // fallback
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#2a1f12;color:#d8c8a8;border:1px solid #c8a84b;padding:.45rem 1rem;border-radius:4px;font-size:.82rem;z-index:9999;pointer-events:none';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function renderPreview() {
    const el = document.getElementById('scb-preview');
    if (!el) return;
    if (!_selected) {
      el.innerHTML = '<div style="color:var(--ink-faded,#7a6a55);font-style:italic;font-size:0.8rem;text-align:center;padding-top:3rem">Cliquez sur une sous-classe pour voir les détails.</div>';
      return;
    }
    const sc = _selected;

    const featuresHtml = (sc.features || []).map((feat, i) => `
      <div style="margin-bottom:0.8rem;padding:0.5rem 0.6rem;background:#0e0b08;border-radius:4px;border:1px solid #2a2010">
        <div style="display:flex;align-items:baseline;gap:0.4rem;margin-bottom:0.25rem">
          <div style="flex:1;font-weight:600;color:var(--gold,#c8a84b);font-size:0.82rem">
            ${feat.name || ''}
            ${feat.level ? `<span style="font-size:0.7rem;color:var(--ink-faded,#7a6a55);font-weight:normal"> — Niv. ${feat.level}</span>` : ''}
          </div>
          <button onclick="SubclassBrowser.addFeatureAt(${i})"
            title="Ajouter à Capacités &amp; Traits"
            style="flex-shrink:0;padding:0.1rem 0.45rem;font-size:0.7rem;background:#1a2a1a;color:#7fbf7f;border:1px solid #4a7a4a;border-radius:3px;cursor:pointer;line-height:1.4">＋</button>
        </div>
        <div style="white-space:pre-wrap;font-size:0.78rem;color:var(--ink-light,#d8c8a8);line-height:1.5">${feat.desc || ''}</div>
      </div>
    `).join('');

    el.innerHTML = `
      <div style="font-family:'Cinzel',serif;font-size:0.95rem;color:var(--gold,#c8a84b);margin-bottom:0.3rem">${sc.name || ''}</div>
      <div style="font-size:0.7rem;color:var(--ink-faded,#7a6a55);margin-bottom:0.6rem">${classLabel(sc.class)} — ${sc.source || ''}</div>
      ${sc.subclass_flavor ? `<div style="font-style:italic;font-size:0.78rem;color:var(--ink-mid,#a8987a);margin-bottom:0.9rem;padding:0.5rem 0.6rem;border-left:2px solid var(--gold,#c8a84b);background:#100d09">${sc.subclass_flavor}</div>` : ''}
      ${sc.desc ? `<div style="font-size:0.78rem;color:var(--ink-light,#d8c8a8);margin-bottom:0.9rem;white-space:pre-wrap;line-height:1.5">${sc.desc}</div>` : ''}
      ${featuresHtml}
      <div style="display:flex;gap:0.5rem;margin-top:0.7rem;flex-wrap:wrap">
        <button onclick="SubclassBrowser.applyToSheet()"
          style="flex:1;padding:0.35rem 0.7rem;background:var(--arcane-bg,#2a1a4e);color:var(--arcane-glow,#b89fff);border:1px solid var(--arcane-glow,#b89fff);border-radius:4px;cursor:pointer;font-size:0.78rem">
          Utiliser cette sous-classe
        </button>
        ${(sc.features||[]).length ? `
        <button onclick="SubclassBrowser.addAllFeatures()"
          style="flex:1;padding:0.35rem 0.7rem;background:#1a2a1a;color:#7fbf7f;border:1px solid #4a7a4a;border-radius:4px;cursor:pointer;font-size:0.78rem">
          ＋ Toutes les capacités
        </button>` : ''}
      </div>
    `;
  }

  function applyToSheet() {
    if (!_selected) return;
    const inp = document.querySelector('[data-field="subclass"]');
    if (inp) {
      inp.value = _selected.name;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    close();
  }

  function setLang(l) {
    _lang = l;
    document.getElementById('scb-lang-fr')?.classList.toggle('active', l === 'fr');
    document.getElementById('scb-lang-en')?.classList.toggle('active', l === 'en');
    _selected = null;
    renderList();
    renderPreview();
  }

  function open() {
    const modal = document.getElementById('subclass-browser-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    _selected = null;
    populateClassFilter();
    renderList();
    renderPreview();
    document.getElementById('scb-search')?.focus();
  }

  function close() {
    const modal = document.getElementById('subclass-browser-modal');
    if (modal) modal.style.display = 'none';
  }

  function populateClassFilter() {
    const sel = document.getElementById('scb-filter-class');
    if (!sel || sel.dataset.populated) return;
    const data = getData();
    const classes = [...new Set(data.map(sc => sc.class).filter(Boolean))].sort();
    classes.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = classLabel(cls);
      sel.appendChild(opt);
    });
    sel.dataset.populated = '1';
  }

  // Close on backdrop click
  document.addEventListener('click', e => {
    const modal = document.getElementById('subclass-browser-modal');
    if (modal && e.target === modal) close();
  });

  return { open, close, select, renderList, renderPreview, setLang, applyToSheet, addFeatureAt, addAllFeatures };
})();
