import React, { useState, useMemo } from 'react'
import { fsAdd } from '../../hooks/useFirestore'

function crStr(v) {
  if (v === 0.125) return '1/8'
  if (v === 0.25) return '1/4'
  if (v === 0.5) return '1/2'
  return String(v ?? 0)
}

function modStr(score) {
  const m = Math.floor(((parseInt(score) || 10) - 10) / 2)
  return (m >= 0 ? '+' : '') + m
}

function speedStr(speed) {
  if (!speed || typeof speed !== 'object') return speed || '—'
  return Object.entries(speed)
    .filter(([, v]) => v)
    .map(([k, v]) => k === 'walk' ? v : `${k} ${v}`)
    .join(', ') || '—'
}

export default function MonsterBrowser({ user, onClose, styles }) {
  const [lang, setLang] = useState('fr')
  const [tab, setTab] = useState('library') // library | custom
  const [search, setSearch] = useState('')
  const [crMin, setCrMin] = useState(0)
  const [crMax, setCrMax] = useState(30)
  const [filterType, setFilterType] = useState('')
  const [filterSize, setFilterSize] = useState('')
  const [selected, setSelected] = useState(null)

  const library = useMemo(() => {
    try {
      if (lang === 'fr' && window.DND_MONSTERS_FR?.length) return window.DND_MONSTERS_FR
      return window.DND_MONSTERS_EN || []
    } catch { return [] }
  }, [lang])

  const types = useMemo(() => [...new Set(library.map(m => m.type).filter(Boolean))].sort(), [library])
  const sizes = useMemo(() => [...new Set(library.map(m => m.size).filter(Boolean))].sort(), [library])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return library.filter(m => {
      if (q && !(m.name || '').toLowerCase().includes(q) && !(m.name_en || '').toLowerCase().includes(q)) return false
      const cr = m.challenge_rating ?? 0
      if (cr < crMin || cr > crMax) return false
      if (filterType && !(m.type || '').toLowerCase().includes(filterType.toLowerCase())) return false
      if (filterSize && m.size !== filterSize) return false
      return true
    }).slice(0, 500)
  }, [library, search, crMin, crMax, filterType, filterSize])

  async function addToDoc() {
    if (!selected || !user) return
    // Convert library monster to custom doc format
    const data = {
      name: selected.name || '',
      type: [selected.size, selected.type, selected.alignment].filter(Boolean).join(', '),
      cr: crStr(selected.challenge_rating ?? 0),
      xp: String(selected.xp || 0),
      prof: selected.proficiency_bonus ? `+${selected.proficiency_bonus}` : '+2',
      speed: speedStr(selected.speed),
      ac: Array.isArray(selected.armor_class) ? selected.armor_class.map(a => a.value || a).join(', ') : String(selected.armor_class || 10),
      hp: `${selected.hit_points || 0}${selected.hit_points_roll ? ` (${selected.hit_points_roll})` : ''}`,
      str: selected.strength || 10,
      dex: selected.dexterity || 10,
      con: selected.constitution || 10,
      int: selected.intelligence || 10,
      wis: selected.wisdom || 10,
      cha: selected.charisma || 10,
      saves: (selected.saving_throws || []).map(sv => `${sv.name || sv.ability_score?.name} ${sv.value >= 0 ? '+' : ''}${sv.value}`).join(', '),
      skills: (selected.proficiencies || []).filter(p => p.proficiency?.index?.startsWith('skill-')).map(p => `${p.proficiency.name?.replace('Skill: ', '')} ${p.value >= 0 ? '+' : ''}${p.value}`).join(', '),
      senses: Object.entries(selected.senses || {}).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', '),
      languages: selected.languages || '',
      dmg_immune: (selected.damage_immunities || []).join(', '),
      dmg_resist: (selected.damage_resistances || []).join(', '),
      dmg_vuln: (selected.damage_vulnerabilities || []).join(', '),
      cond_immune: (selected.condition_immunities || []).map(c => c.name || c).join(', '),
      traits: (selected.special_abilities || []).map(a => ({ name: a.name || '', desc: a.desc || '' })),
      actions: (selected.actions || []).map(a => ({ name: a.name || '', desc: a.desc || '' })),
      legendary_actions: (selected.legendary_actions || []).map(a => ({ name: a.name || '', desc: a.desc || '' })),
      notes: '',
      source: 'library',
      source_index: selected.index,
    }
    await fsAdd(`users/${user.uid}/monsters`, data)
    onClose()
  }

  return (
    <div className={styles.browserModal}>
      <div className={styles.browserInner}>

        {/* Header */}
        <div className={styles.browserHead}>
          <span className={styles.browserTitle}>📖 Bibliothèque de Monstres</span>
          <span className={styles.browserCount}>{filtered.length} monstres</span>
          <div className={styles.langToggle}>
            {['fr', 'en'].map(l => (
              <button key={l} className={`${styles.langBtn}${lang === l ? ' ' + styles.active : ''}`} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button className={styles.browserClose} onClick={onClose}>✕</button>
        </div>

        {/* Filters */}
        <div className={styles.browserFilters}>
          <input
            type="text"
            placeholder="🔍 Rechercher un monstre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input type="number" placeholder="CR min" value={crMin} onChange={e => setCrMin(parseFloat(e.target.value) || 0)} style={{ width: 70 }} />
          <input type="number" placeholder="CR max" value={crMax} onChange={e => setCrMax(parseFloat(e.target.value) || 30)} style={{ width: 70 }} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterSize} onChange={e => setFilterSize(e.target.value)}>
            <option value="">Toutes tailles</option>
            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Body */}
        <div className={styles.browserBody}>
          {/* List */}
          <div className={styles.browserList}>
            {library.length === 0 ? (
              <div style={{ color: '#7a6a55', padding: '2rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                Bundles de monstres non chargés.<br />
                Assurez-vous que <code>dnd_db/bundle_monsters_*.js</code> sont chargés.
              </div>
            ) : filtered.map((m, i) => (
              <div
                key={m.index || i}
                className={`${styles.browserListItem}${selected === m ? ' ' + styles.selected : ''}`}
                onClick={() => setSelected(m)}
              >
                <span className={styles.browserListName}>{m.name}</span>
                <span className={styles.browserListCr}>FP {crStr(m.challenge_rating ?? 0)}</span>
                <span className={styles.browserListType}>{m.type || '—'}</span>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className={styles.browserPreview}>
            {!selected ? (
              <div className={styles.browserPreviewEmpty}>Cliquez sur un monstre pour voir sa fiche.</div>
            ) : (
              <MonsterPreview monster={selected} styles={styles} onAdd={user ? addToDoc : null} />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function MonsterPreview({ monster: m, styles, onAdd }) {
  const abilities = [
    { k: 'strength', l: 'FOR' }, { k: 'dexterity', l: 'DEX' }, { k: 'constitution', l: 'CON' },
    { k: 'intelligence', l: 'INT' }, { k: 'wisdom', l: 'SAG' }, { k: 'charisma', l: 'CHA' },
  ]
  const ac = Array.isArray(m.armor_class) ? m.armor_class.map(a => `${a.value}${a.type ? ` (${a.type})` : ''}`).join(', ') : m.armor_class
  const speed = speedStr(m.speed)

  return (
    <div>
      <div className={styles.monsterSheetName}>{m.name}</div>
      <div className={styles.monsterSheetType}>
        {[m.size, m.type, m.alignment].filter(Boolean).join(', ')}
      </div>
      <hr className={styles.monsterSheetDivider} />
      {[
        ["Classe d'armure", ac],
        ['Points de vie', m.hit_points + (m.hit_points_roll ? ` (${m.hit_points_roll})` : '')],
        ['Vitesse', speed],
      ].map(([label, val]) => val && (
        <div key={label} className={styles.monsterSheetRow}>
          <span className={styles.monsterSheetLabel}>{label}</span>
          <span className={styles.monsterSheetVal}>{val}</span>
        </div>
      ))}
      <hr className={styles.monsterSheetDivider} />
      <div className={styles.monsterAbilityGrid}>
        {abilities.map(({ k, l }) => {
          const score = m[k] || 10
          return (
            <div key={k} className={styles.monsterAbilityBox}>
              <div className={styles.monsterAbilityLabel}>{l}</div>
              <div className={styles.monsterAbilityScore}>{score}</div>
              <div className={styles.monsterAbilityMod}>{modStr(score)}</div>
            </div>
          )
        })}
      </div>
      <hr className={styles.monsterSheetDivider} />
      {[
        ['FP', crStr(m.challenge_rating ?? 0) + (m.xp ? ` (${m.xp} XP)` : '')],
        ['Sens', m.senses ? Object.entries(m.senses).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ') : null],
        ['Langues', m.languages],
        ['Immunités', (m.damage_immunities || []).join(', ')],
        ['Résistances', (m.damage_resistances || []).join(', ')],
      ].filter(([, v]) => v).map(([label, val]) => (
        <div key={label} className={styles.monsterSheetRow}>
          <span className={styles.monsterSheetLabel}>{label}</span>
          <span className={styles.monsterSheetVal}>{val}</span>
        </div>
      ))}

      {m.special_abilities?.length > 0 && (
        <>
          <div className={styles.monsterSectionHead}>Capacités spéciales</div>
          {m.special_abilities.map((a, i) => (
            <div key={i} className={styles.monsterActionItem}>
              <span className={styles.monsterActionName}>{a.name}. </span>
              {a.desc}
            </div>
          ))}
        </>
      )}

      {m.actions?.length > 0 && (
        <>
          <div className={styles.monsterSectionHead}>Actions</div>
          {m.actions.map((a, i) => (
            <div key={i} className={styles.monsterActionItem}>
              <span className={styles.monsterActionName}>{a.name}. </span>
              {a.desc}
            </div>
          ))}
        </>
      )}

      {m.legendary_actions?.length > 0 && (
        <>
          <div className={styles.monsterSectionHead}>Actions légendaires</div>
          {m.legendary_actions.map((a, i) => (
            <div key={i} className={styles.monsterActionItem}>
              <span className={styles.monsterActionName}>{a.name}. </span>
              {a.desc}
            </div>
          ))}
        </>
      )}

      {onAdd && (
        <button
          className={styles.browserAddBtn}
          onClick={onAdd}
        >
          + Ajouter à mes monstres
        </button>
      )}
    </div>
  )
}
