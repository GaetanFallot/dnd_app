#!/usr/bin/env node
// ============================================================
//  build_light.js — génère portable_light.js + view.html
//
//  portable_light.js  → template JS utilisé par exportHTML()
//  view.html          → page GitHub Pages, lit les données
//                       depuis le hash URL (#base64json)
//
//  Usage : node scripts/build_light.js  (depuis dnd5e-sheets/)
// ============================================================
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.warn('⚠  Manquant :', p); return ''; }
  return fs.readFileSync(p, 'utf8');
}

// ── Sources ──────────────────────────────────────────────────
let   html  = read('sheet.html');
const css   = read('shared/style.css');
const appJs = read('shared/app.js');

// ── Supprimer les scripts lourds ─────────────────────────────
html = html.replace(/<script src="\.\.\/dnd_db\/[^"]+\.js"[^>]*><\/script>\n?/g, '');
html = html.replace(/<script src="portable_template\.js"[^>]*><\/script>\n?/g, '');
html = html.replace(/<script src="portable_light\.js"[^>]*><\/script>\n?/g, '');
html = html.replace(/<script src="shared\/spell_browser\.js"><\/script>\n?/g, '');

// ── Supprimer les éléments UI inutiles hors app ───────────────
html = stripElementById(html, 'spell-browser-modal');
html = html.replace(/<!--\s*═+\s*SPELL BROWSER MODAL\s*═+\s*-->\s*/g, '');
html = html.replace(/<button[^>]*onclick="SpellBrowser\.open\(\)"[^>]*>[\s\S]*?<\/button>/g, '');
html = html.replace(/<a\s[^>]*href="(?:\.\.\/)?index\.html"[^>]*>[\s\S]*?<\/a>/g, '');
html = html.replace(/<button[^>]*onclick="window\.location\.href='index\.html'"[^>]*>[\s\S]*?<\/button>/g, '');
html = html.replace(/<button[^>]*onclick="DND\.resetSheet\(\)"[^>]*>[\s\S]*?<\/button>/g, '');
html = html.replace(/<button[^>]*onclick="DND\.exportPortable\(\)"[^>]*>[\s\S]*?<\/button>/g, '');
html = html.replace(/<button[^>]*onclick="DND\.exportHTML\(\)"[^>]*>[\s\S]*?<\/button>/g, '');
html = html.replace(/<button[^>]*onclick="DND\.shareLink\(\)"[^>]*>[\s\S]*?<\/button>/g, '');

// ── Inline CSS ───────────────────────────────────────────────
// Fonction pour éviter l'interprétation des $& / $' / $` par String.replace
html = html.replace(
  '<link rel="stylesheet" href="shared/style.css">',
  () => `<style>\n${css}\n</style>`
);

// ── Inline app.js ────────────────────────────────────────────
// Escape </script> pour ne pas casser le bloc <script>.
// Fonction pour éviter l'interprétation des $1/$& présents dans app.js.
const safeAppJs = appJs.replace(/<\/script>/gi, '<\\/script>');
html = html.replace(
  '<script src="shared/app.js"></script>',
  () => `<script>\n${safeAppJs}\n</script>`
);

// ── htmlBase : base commune avant bootstrap ───────────────────
// Sert de point de départ pour les deux sorties.
const htmlBase = html;

// ════════════════════════════════════════════════════════════════
//  SORTIE 1 : portable_light.js
//  Template utilisé par exportHTML() — données injectées via
//  window.__PORTABLE_DATA__ (placeholder remplacé à l'export)
// ════════════════════════════════════════════════════════════════
let portableHtml = htmlBase;
portableHtml = portableHtml.replace(
  '<script>DND.init();</script>',
  () => `<script id="__portable_bootstrap__">
window.__PORTABLE_DATA__ = /*__CHAR_DATA__*/null;
(function(){
  var data   = window.__PORTABLE_DATA__;
  var body   = document.getElementById('sheet-body');
  var notice = document.getElementById('no-char-notice');
  if (!data) { if (notice) notice.style.display = 'flex'; return; }
  DND.storageKey = 'dnd5e_char___portable__';
  DND._meta = data;
  DND.applyData(data);
  try { localStorage.setItem(DND.storageKey, JSON.stringify(data)); } catch(e) {}
  if (notice) notice.style.display = 'none';
  if (body)   body.style.display   = '';
  DND.bindAll(); DND.recalcAll(); DND.initSortablePanels();
  var savedTab = (function(){ try { return localStorage.getItem('_mtab_' + DND.storageKey); } catch(e) { return null; } })() || 'tab-combat';
  DND.showMobileTab(savedTab);
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      document.querySelectorAll('.panel[data-tab]').forEach(function(el){ el.style.display = ''; });
      var sp = document.getElementById('spell-panel');
      if (sp && !DND._isSpellcaster) sp.style.display = 'none';
    } else DND.showMobileTab(DND._mobileTab);
  }, { passive: true });
  window.__saveSelf__ = function() {
    var d    = DND.gatherData();
    var safe = JSON.stringify(d).replace(/<\\/script>/gi, '<\\\\/script>');
    var el   = document.getElementById('__portable_bootstrap__');
    var orig = el.textContent;
    var next = orig.replace(
      /^window\\.__PORTABLE_DATA__ = .+;$/m,
      function() { return 'window.__PORTABLE_DATA__ = ' + safe + ';'; }
    );
    el.textContent = next;
    var fullHtml = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    el.textContent = orig;
    var slug = (d.char_name || 'personnage').replace(/[\\s\\/\\\\:*?"<>|]+/g, '_').toLowerCase();
    var blob = new Blob([fullHtml], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + '_fiche.html';
    a.click();
    URL.revokeObjectURL(a.href);
    if (DND.showToast) DND.showToast('Fiche sauvegardee !');
  };
  if (!document.getElementById('__save_btn__')) {
    var btn = document.createElement('button');
    btn.id = '__save_btn__';
    btn.title = 'Sauvegarder la fiche';
    btn.innerHTML = '&#128190;';
    btn.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;width:3.2rem;height:3.2rem;border-radius:50%;border:2px solid #c9a84c;background:#3a2a1c;color:#c9a84c;font-size:1.4rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
    btn.onclick = function() { window.__saveSelf__(); };
    document.body.appendChild(btn);
  }
})();
</script>`
);

const portableLightPath = path.join(ROOT, 'portable_light.js');
fs.writeFileSync(portableLightPath, [
  '// Auto-generated by scripts/build_light.js — NE PAS ÉDITER',
  '// Pour régénérer : node scripts/build_light.js  (depuis dnd5e-sheets/)',
  `window.__PORTABLE_LIGHT__ = ${JSON.stringify(portableHtml)};`,
  '',
].join('\n'), 'utf8');
const sizeKB1 = Math.round(fs.statSync(portableLightPath).size / 1024);
console.log(`✓  portable_light.js généré (${sizeKB1} KB)`);

// ════════════════════════════════════════════════════════════════
//  SORTIE 2 : view.html
//  Page GitHub Pages — lit les données depuis location.hash
//  URL : https://gaetanfallot.github.io/dnd_app/dnd5e-sheets/view.html#BASE64
// ════════════════════════════════════════════════════════════════
let viewHtml = htmlBase;
viewHtml = viewHtml.replace(
  '<script>DND.init();</script>',
  () => `<script>
(function(){
  // Décode le JSON du personnage depuis le hash URL (base64)
  var hash = window.location.hash.slice(1);
  var data = null;
  if (hash) {
    try { data = JSON.parse(decodeURIComponent(escape(atob(hash)))); } catch(e) { console.warn('view.html: hash invalide', e); }
  }
  var body   = document.getElementById('sheet-body');
  var notice = document.getElementById('no-char-notice');
  if (!data) { if (notice) notice.style.display = 'flex'; return; }
  DND.storageKey = 'dnd5e_char___portable__';
  DND._meta = data;
  DND.applyData(data);
  try { localStorage.setItem(DND.storageKey, JSON.stringify(data)); } catch(e) {}
  if (notice) notice.style.display = 'none';
  if (body)   body.style.display   = '';
  DND.bindAll(); DND.recalcAll(); DND.initSortablePanels();
  var savedTab = (function(){ try { return localStorage.getItem('_mtab_' + DND.storageKey); } catch(e) { return null; } })() || 'tab-combat';
  DND.showMobileTab(savedTab);
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      document.querySelectorAll('.panel[data-tab]').forEach(function(el){ el.style.display = ''; });
      var sp = document.getElementById('spell-panel');
      if (sp && !DND._isSpellcaster) sp.style.display = 'none';
    } else DND.showMobileTab(DND._mobileTab);
  }, { passive: true });
  // Bouton 💾 : télécharge une copie locale via portable_light.js (chargé en demande)
  if (!document.getElementById('__save_btn__')) {
    var btn = document.createElement('button');
    btn.id = '__save_btn__';
    btn.title = 'Télécharger une copie locale';
    btn.innerHTML = '&#128190;';
    btn.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;width:3.2rem;height:3.2rem;border-radius:50%;border:2px solid #c9a84c;background:#3a2a1c;color:#c9a84c;font-size:1.4rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
    btn.onclick = function() {
      if (window.__PORTABLE_LIGHT__) {
        DND.exportHTML();
      } else {
        var s = document.createElement('script');
        s.src = './portable_light.js';
        s.onload = function() { DND.exportHTML(); };
        s.onerror = function() { alert('portable_light.js introuvable'); };
        document.head.appendChild(s);
      }
    };
    document.body.appendChild(btn);
  }
})();
</script>`
);

const viewHtmlPath = path.join(ROOT, 'view.html');
fs.writeFileSync(viewHtmlPath, viewHtml, 'utf8');
const sizeKB2 = Math.round(fs.statSync(viewHtmlPath).size / 1024);
console.log(`✓  view.html généré (${sizeKB2} KB)`);

// ── Helper : suppression d'un élément par id ─────────────────
function stripElementById(src, id) {
  const re = new RegExp(`<div[^>]*\\s+id="${id}"[^>]*>`);
  const m  = re.exec(src);
  if (!m) { console.warn(`  ⚠ #${id} non trouvé — ignoré`); return src; }
  let pos   = m.index + m[0].length;
  let depth = 1;
  while (pos < src.length && depth > 0) {
    const o = src.indexOf('<div', pos);
    const c = src.indexOf('</div>', pos);
    if (c === -1) break;
    if (o !== -1 && o < c) { depth++; pos = o + 4; }
    else                   { depth--; pos = c + 6; }
  }
  return src.slice(0, m.index) + src.slice(pos);
}
