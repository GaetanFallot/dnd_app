import React, { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { useCollection, fsSet } from '../../hooks/useFirestore'

const SECTIONS = [
  { id: 'Sorts',       label: 'Sorts',      icon: '🔮', col: 'spell_overrides'      },
  { id: 'Monstres',    label: 'Monstres',   icon: '🐉', col: 'monster_overrides'    },
  { id: 'Classes',     label: 'Classes',    icon: '⚔️', col: 'class_overrides'      },
  { id: 'Races',       label: 'Races',      icon: '🧝', col: 'race_overrides'       },
  { id: 'Dons',        label: 'Dons',       icon: '⭐', col: 'feat_overrides'       },
  { id: 'Origines',    label: 'Origines',   icon: '📜', col: 'background_overrides' },
  { id: 'Multiclasse', label: 'Multiclasse',icon: '🔀', col: null                   },
]

function getBaseData(section, lang) {
  try {
    switch (section) {
      case 'Sorts':    return (lang === 'fr' && window.DND_SPELLS_FR?.length)      ? window.DND_SPELLS_FR      : (window.DND_SPELLS_EN    || [])
      case 'Monstres': return (lang === 'fr' && window.DND_MONSTERS_FR?.length)    ? window.DND_MONSTERS_FR    : (window.DND_MONSTERS_EN  || [])
      case 'Classes':  return (lang === 'fr' && window.DND_CLASSES_FR?.length)     ? window.DND_CLASSES_FR     : (window.DND_CLASSES_EN   || [])
      case 'Races':    return (lang === 'fr' && window.DND_RACES_FR?.length)       ? window.DND_RACES_FR       : (window.DND_RACES_EN     || [])
      case 'Dons':     return (lang === 'fr' && window.DND_FEATS_FR?.length)       ? window.DND_FEATS_FR       : (window.DND_FEATS_EN     || [])
      case 'Origines': return (lang === 'fr' && window.DND_BACKGROUNDS_FR?.length) ? window.DND_BACKGROUNDS_FR : (window.DND_BACKGROUNDS_EN || [])
      default: return []
    }
  } catch { return [] }
}

export default function CompendiumPage() {
  const { user } = useAuth()
  const { role } = useRole()
  const isMJ = role === 'mj' || role === 'admin'
  const isAdmin = role === 'admin'

  const [section, setSection] = useState('Sorts')
  const [lang, setLang] = useState('fr')
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterCR, setFilterCR] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selected, setSelected] = useState(null)
  const [overrides, setOverrides] = useState({})

  const sectionCfg = SECTIONS.find(s => s.id === section)

  const { docs: overrideDocs, refresh: refreshOverrides } = useCollection(sectionCfg.col ? `local/data/${sectionCfg.col}` : null)
  useEffect(() => {
    if (!sectionCfg.col) return
    const map = {}
    overrideDocs.forEach(d => { map[d.id] = d })
    setOverrides(map)
  }, [overrideDocs, section])

  const baseData = useMemo(() => getBaseData(section, lang), [section, lang])

  function merged(entry) {
    const key = entry.index || entry.slug || (entry.name || '').toLowerCase().replace(/\s+/g, '-')
    return { ...entry, ...(overrides[key] || {}), _overrideKey: key }
  }

  const filtered = useMemo(() => {
    let list = baseData
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(e => (e.name || '').toLowerCase().includes(q))
    if (section === 'Sorts') {
      if (filterLevel !== '') list = list.filter(e => String(e.level) === filterLevel)
      if (filterType) list = list.filter(e => (e.school || '').toLowerCase().includes(filterType.toLowerCase()))
    } else if (section === 'Monstres') {
      if (filterCR !== '') list = list.filter(e => String(e.challenge_rating ?? e.cr) === filterCR)
      if (filterType) list = list.filter(e => (e.type || '').toLowerCase().includes(filterType.toLowerCase()))
    }
    return list.slice(0, 250)
  }, [baseData, search, section, filterLevel, filterCR, filterType])

  const filterOptions = useMemo(() => {
    const set = new Set(baseData.map(e => section === 'Sorts' ? e.school : section === 'Monstres' ? e.type : null).filter(Boolean))
    return [...set].sort().slice(0, 40)
  }, [baseData, section])

  function changeSection(s) {
    setSection(s); setSelected(null); setSearch('')
    setFilterLevel(''); setFilterCR(''); setFilterType('')
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 45px)', overflow: 'hidden', background: '#0d0b07', fontFamily: 'EB Garamond, Georgia, serif', color: '#d8c8a8' }}>

      {/* LEFT SIDEBAR */}
      <div style={{ width: 220, borderRight: '1px solid #4a3420', display: 'flex', flexDirection: 'column', background: '#1a1410', flexShrink: 0 }}>
        {/* Section tabs — 2 rows */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #4a3420' }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => changeSection(s.id)}
              style={{ padding: '0.55rem 0.2rem', background: section === s.id ? 'rgba(212,168,67,0.1)' : 'none', border: 'none', borderBottom: section === s.id ? '2px solid #d4a843' : '2px solid transparent', color: section === s.id ? '#d4a843' : '#7a6a55', fontFamily: 'Cinzel, serif', fontSize: '0.58rem', letterSpacing: '0.08em', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: '1rem' }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Lang toggle */}
        <div style={{ display: 'flex', gap: 4, padding: '0.5rem', borderBottom: '1px solid #4a3420' }}>
          {['fr', 'en'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ flex: 1, padding: '0.25rem', background: lang === l ? '#2d2520' : 'none', border: `1px solid ${lang === l ? '#d4a843' : '#4a3420'}`, color: lang === l ? '#d4a843' : '#7a6a55', borderRadius: 3, fontFamily: 'Cinzel, serif', fontSize: '0.65rem', cursor: 'pointer' }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: '0.5rem' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{ width: '100%', background: '#231d15', border: '1px solid #4a3420', color: '#d8c8a8', borderRadius: 3, padding: '0.35rem 0.5rem', fontSize: '0.8rem', fontFamily: 'EB Garamond, serif', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filters (Sorts/Monstres only) */}
        {(section === 'Sorts' || section === 'Monstres') && (
          <div style={{ padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {section === 'Sorts' && (
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                style={{ background: '#231d15', border: '1px solid #4a3420', color: filterLevel ? '#d8c8a8' : '#7a6a55', borderRadius: 3, padding: '0.3rem', fontSize: '0.72rem' }}>
                <option value="">Tous niveaux</option>
                <option value="0">Tour de magie</option>
                {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Niveau {l}</option>)}
              </select>
            )}
            {section === 'Monstres' && (
              <select value={filterCR} onChange={e => setFilterCR(e.target.value)}
                style={{ background: '#231d15', border: '1px solid #4a3420', color: filterCR ? '#d8c8a8' : '#7a6a55', borderRadius: 3, padding: '0.3rem', fontSize: '0.72rem' }}>
                <option value="">Tous CR</option>
                {['0','1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'].map(cr => <option key={cr} value={cr}>CR {cr}</option>)}
              </select>
            )}
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ background: '#231d15', border: '1px solid #4a3420', color: filterType ? '#d8c8a8' : '#7a6a55', borderRadius: 3, padding: '0.3rem', fontSize: '0.72rem' }}>
              <option value="">{section === 'Sorts' ? 'Toutes écoles' : 'Tous types'}</option>
              {filterOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}

        {/* Count */}
        <div style={{ padding: '0 0.8rem 0.5rem', fontSize: '0.68rem', color: '#7a6a55' }}>
          {filtered.length} {filtered.length < baseData.length ? `/ ${baseData.length}` : ''} entrées
          {baseData.length === 0 && <span style={{ color: '#e06060' }}> — bundle non chargé</span>}
        </div>
      </div>

      {/* CENTER LIST */}
      <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #4a3420', display: section === 'Multiclasse' ? 'none' : undefined }}>
        {filtered.map((entry, i) => {
          const m = merged(entry)
          const key = m._overrideKey
          const hasOverride = !!overrides[key]
          const isSelected = selected?._overrideKey === key
          return (
            <div key={i} onClick={() => setSelected(m)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', borderBottom: '1px solid rgba(74,52,32,0.2)', cursor: 'pointer', background: isSelected ? 'rgba(212,168,67,0.1)' : 'transparent', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(212,168,67,0.05)' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ flex: 1, fontSize: '0.88rem' }}>{m.name || '—'}</span>
              {hasOverride && <span title="Annoté" style={{ color: '#d4a843', fontSize: '0.65rem' }}>✎</span>}
              <ListBadge entry={m} section={section} />
            </div>
          )
        })}
      </div>

      {/* RIGHT DETAIL PANEL */}
      <div style={{ width: 360, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.15)', flexShrink: 0 }}>
        {section === 'Multiclasse' ? (
          <MulticlassCalculator />
        ) : !selected ? (
          <div style={{ color: '#7a6a55', fontStyle: 'italic', textAlign: 'center', paddingTop: '4rem', fontSize: '0.88rem' }}>
            Sélectionnez une entrée
          </div>
        ) : (
          <EntryDetail
            entry={selected}
            section={section}
            isMJ={isMJ}
            isAdmin={isAdmin}
            overrides={overrides}
            onSave={async (key, data) => {
              await fsSet(`local/data/${sectionCfg.col}`, key, data)
              setTimeout(refreshOverrides, 100)
            }}
          />
        )}
      </div>
    </div>
  )
}

function ListBadge({ entry, section }) {
  const s = { fontFamily: 'Cinzel, serif', fontSize: '0.58rem', borderRadius: 3, padding: '0.1rem 0.3rem', whiteSpace: 'nowrap' }
  if (section === 'Sorts')
    return <><span style={{ ...s, color: '#d4a843', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)' }}>{entry.level === 0 ? 'Tour' : `Niv.${entry.level}`}</span>
      <span style={{ fontSize: '0.65rem', color: '#7a6a55', minWidth: 60, textAlign: 'right' }}>{entry.school || '—'}</span></>
  if (section === 'Monstres')
    return <><span style={{ ...s, color: '#e0a050', background: 'rgba(224,160,80,0.1)', border: '1px solid rgba(224,160,80,0.3)' }}>CR {entry.challenge_rating ?? entry.cr ?? '?'}</span>
      <span style={{ fontSize: '0.65rem', color: '#7a6a55', minWidth: 60, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.type || '—'}</span></>
  if (section === 'Classes')
    return <span style={{ ...s, color: '#5b8dd9', background: 'rgba(91,141,217,0.1)', border: '1px solid rgba(91,141,217,0.3)' }}>d{entry.hit_die}</span>
  if (section === 'Races')
    return <span style={{ fontSize: '0.65rem', color: '#7a6a55' }}>{entry.speed ? `Vit. ${entry.speed}` : ''}</span>
  return null
}

function EntryDetail({ entry, section, isMJ, isAdmin, overrides, onSave }) {
  const key = entry._overrideKey
  const override = overrides[key] || {}
  const [mjNotes, setMjNotes] = useState(override.mj_notes || '')
  const [mjSecret, setMjSecret] = useState(override.mj_secret || '')
  const [showJson, setShowJson] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMjNotes(override.mj_notes || '')
    setMjSecret(override.mj_secret || '')
    setShowJson(false)
  }, [key, override.mj_notes, override.mj_secret])

  async function handleSave() {
    setSaving(true)
    try { await onSave(key, { mj_notes: mjNotes, mj_secret: mjSecret }) }
    finally { setSaving(false) }
  }

  async function handleJsonSave() {
    try {
      const parsed = JSON.parse(jsonText)
      setSaving(true)
      try { await onSave(key, parsed) } finally { setSaving(false) }
    } catch { alert('JSON invalide') }
  }

  function row(label, val) {
    if (val === null || val === undefined || val === '') return null
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.82rem', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a6a55', flexShrink: 0 }}>{label}</span>
        <span style={{ fontWeight: 600, textAlign: 'right' }}>{String(val)}</span>
      </div>
    )
  }
  function hr() { return <hr style={{ border: 'none', borderTop: '1px solid #4a3420', margin: '0.6rem 0' }} /> }
  function title(t) { return <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#d4a843', marginBottom: '0.4rem', marginTop: '0.5rem' }}>{t}</p> }
  function descBlocks(desc) {
    const arr = Array.isArray(desc) ? desc : (desc ? [desc] : [])
    return arr.map((p, i) => <p key={i} style={{ marginBottom: '0.4rem', lineHeight: 1.6, fontSize: '0.82rem' }}>{p}</p>)
  }
  function speedStr(s) {
    if (!s) return null
    if (typeof s === 'string') return s
    if (typeof s === 'object') return Object.entries(s).map(([k, v]) => `${k} ${v}`).join(', ')
    return String(s)
  }
  function nameList(arr) {
    if (!arr?.length) return null
    return arr.map(x => x?.name || x).filter(Boolean).join(', ')
  }

  return (
    <div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.05rem', color: '#d4a843', fontWeight: 700, marginBottom: '0.2rem' }}>{entry.name}</div>

      {section === 'Sorts' && <SpellDetail entry={entry} row={row} hr={hr} descBlocks={descBlocks} />}
      {section === 'Monstres' && <MonsterDetail entry={entry} row={row} hr={hr} title={title} speedStr={speedStr} />}
      {section === 'Classes' && <ClassDetail entry={entry} row={row} hr={hr} title={title} nameList={nameList} />}
      {section === 'Races' && <RaceDetail entry={entry} row={row} hr={hr} title={title} descBlocks={descBlocks} nameList={nameList} />}
      {section === 'Dons' && <FeatDetail entry={entry} row={row} hr={hr} descBlocks={descBlocks} />}
      {section === 'Origines' && <BackgroundDetail entry={entry} row={row} hr={hr} title={title} descBlocks={descBlocks} />}

      {isMJ && (
        <>
          {hr()}
          {title('Notes MJ')}
          <textarea value={mjNotes} onChange={e => setMjNotes(e.target.value)} placeholder="Notes pour le MJ..."
            style={{ width: '100%', minHeight: 60, background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 3, color: '#d8c8a8', padding: '0.4rem', fontSize: '0.82rem', fontFamily: 'EB Garamond, serif', boxSizing: 'border-box', resize: 'vertical' }} />
          <textarea value={mjSecret} onChange={e => setMjSecret(e.target.value)} placeholder="Secret — ne pas montrer aux joueurs..."
            style={{ width: '100%', minHeight: 50, background: 'rgba(224,60,60,0.07)', border: '1px solid rgba(224,60,60,0.3)', borderRadius: 3, color: '#d8c8a8', padding: '0.4rem', fontSize: '0.82rem', fontFamily: 'EB Garamond, serif', marginTop: '0.4rem', boxSizing: 'border-box', resize: 'vertical' }} />
          <button onClick={handleSave} disabled={saving}
            style={{ marginTop: '0.5rem', width: '100%', padding: '0.4rem', background: saving ? 'rgba(212,168,67,0.05)' : 'rgba(212,168,67,0.12)', border: '1px solid #d4a843', borderRadius: 3, color: '#d4a843', fontFamily: 'Cinzel, serif', fontSize: '0.68rem', cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Enregistré ✓' : 'Sauvegarder les notes'}
          </button>
        </>
      )}

      {isAdmin && (
        <>
          {hr()}
          <button onClick={() => { const next = !showJson; setShowJson(next); if (next) { const { _overrideKey, ...rest } = entry; setJsonText(JSON.stringify(rest, null, 2)) } }}
            style={{ width: '100%', padding: '0.35rem', background: 'none', border: '1px solid #4a3420', borderRadius: 3, color: '#7a6a55', fontFamily: 'Cinzel, serif', fontSize: '0.65rem', cursor: 'pointer', marginBottom: showJson ? '0.5rem' : 0 }}>
            {showJson ? 'Masquer JSON' : 'Editer JSON brut'}
          </button>
          {showJson && <>
            <textarea value={jsonText} onChange={e => setJsonText(e.target.value)}
              style={{ width: '100%', minHeight: 200, background: '#0d0b07', border: '1px solid #4a3420', borderRadius: 3, color: '#a0c8a0', padding: '0.5rem', fontSize: '0.72rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' }}
              spellCheck={false} />
            <button onClick={handleJsonSave} disabled={saving}
              style={{ marginTop: '0.4rem', width: '100%', padding: '0.4rem', background: 'rgba(224,60,60,0.1)', border: '1px solid #e06060', borderRadius: 3, color: '#e06060', fontFamily: 'Cinzel, serif', fontSize: '0.68rem', cursor: 'pointer' }}>
              Sauvegarder override JSON
            </button>
          </>}
        </>
      )}
    </div>
  )
}

function SpellDetail({ entry, row, hr, descBlocks }) {
  return <>
    <div style={{ fontSize: '0.75rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.5rem' }}>
      {entry.level === 0 ? 'Tour de magie' : `Sort de niveau ${entry.level}`}
      {entry.school ? ` — ${entry.school}` : ''}
      {entry.ritual ? ' · Rituel' : ''}{entry.concentration ? ' · Concentration' : ''}
    </div>
    {hr()}
    {row("Temps d'incantation", entry.casting_time)}
    {row('Portée', entry.range)}
    {row('Composantes', [entry.components?.verbal && 'V', entry.components?.somatic && 'S', entry.components?.material && 'M'].filter(Boolean).join(', '))}
    {row('Durée', entry.duration)}
    {row('Classes', (entry.classes || []).map(c => c.name || c).join(', '))}
    {hr()}
    {descBlocks(entry.desc)}
    {(Array.isArray(entry.higher_level) ? entry.higher_level.length > 0 : !!entry.higher_level) && <>
      <p style={{ fontWeight: 700, fontStyle: 'italic', color: '#d4a843', fontSize: '0.82rem', marginTop: '0.5rem' }}>Niveaux supérieurs</p>
      {descBlocks(entry.higher_level)}
    </>}
  </>
}

function MonsterDetail({ entry, row, hr, title, speedStr }) {
  function sensesStr(s) {
    if (!s) return null
    if (typeof s === 'string') return s
    if (typeof s === 'object') return Object.entries(s).map(([k, v]) => `${k} ${v}`).join(', ')
    return String(s)
  }
  return <>
    <div style={{ fontSize: '0.75rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.5rem' }}>
      {[entry.size, entry.type, entry.alignment].filter(Boolean).join(' · ')}
    </div>
    {hr()}
    {row('CA', entry.armor_class ?? entry.ac)}
    {row('PV', entry.hit_points ? `${entry.hit_points}${entry.hit_dice ? ` (${entry.hit_dice})` : ''}` : null)}
    {row('Vitesse', speedStr(entry.speed))}
    {row('CR', entry.challenge_rating ?? entry.cr)}
    {row('XP', entry.xp)}
    {hr()}
    {(entry.strength || entry.str || entry.dexterity || entry.dex) && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4, marginBottom: '0.5rem', textAlign: 'center' }}>
        {[['FOR', entry.strength || entry.str], ['DEX', entry.dexterity || entry.dex], ['CON', entry.constitution || entry.con],
          ['INT', entry.intelligence || entry.int], ['SAG', entry.wisdom || entry.wis], ['CHA', entry.charisma || entry.cha]
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 3, padding: '0.3rem 0.1rem' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: '#7a6a55' }}>{lbl}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{val || '—'}</div>
            <div style={{ fontSize: '0.65rem', color: '#d4a843' }}>{val ? ((Math.floor((parseInt(val) - 10) / 2) >= 0 ? '+' : '') + Math.floor((parseInt(val) - 10) / 2)) : ''}</div>
          </div>
        ))}
      </div>
    )}
    {row('Jets de sauvegarde', typeof entry.saving_throws === 'object' && !Array.isArray(entry.saving_throws) ? Object.entries(entry.saving_throws || {}).map(([k, v]) => `${k} +${v}`).join(', ') : entry.saving_throws)}
    {row('Compétences', typeof entry.skills === 'object' && !Array.isArray(entry.skills) ? Object.entries(entry.skills || {}).map(([k, v]) => `${k} +${v}`).join(', ') : entry.skills)}
    {row('Résistances', Array.isArray(entry.damage_resistances) ? entry.damage_resistances.join(', ') : entry.damage_resistances)}
    {row('Immunités', Array.isArray(entry.damage_immunities) ? entry.damage_immunities.join(', ') : entry.damage_immunities)}
    {row('Sens', sensesStr(entry.senses))}
    {row('Langues', entry.languages)}
    {(entry.special_abilities || []).length > 0 && <>{hr()}{title('Capacités spéciales')}
      {entry.special_abilities.map((a, i) => <div key={i} style={{ marginBottom: '0.4rem', fontSize: '0.8rem' }}><strong>{a.name}: </strong>{Array.isArray(a.desc) ? a.desc.join(' ') : a.desc}</div>)}</>}
    {(entry.actions || []).length > 0 && <>{hr()}{title('Actions')}
      {entry.actions.map((a, i) => <div key={i} style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}><strong>{a.name}: </strong>{Array.isArray(a.desc) ? a.desc.join(' ') : a.desc}</div>)}</>}
    {(entry.legendary_actions || []).length > 0 && <>{hr()}{title('Actions légendaires')}
      {entry.legendary_actions.map((a, i) => <div key={i} style={{ marginBottom: '0.4rem', fontSize: '0.8rem' }}><strong>{a.name}: </strong>{Array.isArray(a.desc) ? a.desc.join(' ') : a.desc}</div>)}</>}
  </>
}

const CASTER_LABELS = { full: 'Lanceur complet', half: 'Demi-lanceur', third: 'Tiers-lanceur', warlock: 'Magie de pacte', null: 'Non-lanceur' }

function ClassDetail({ entry, row, hr, title, nameList }) {
  const [openLevel, setOpenLevel] = useState(null)
  const [openSubclass, setOpenSubclass] = useState(null)

  useEffect(() => {
    setOpenLevel(null)
    setOpenSubclass(null)
  }, [entry.index])

  const levelsWithFeatures = (entry.levels || []).filter(l => l.features?.length > 0 || l.ability_score_bonuses > 0)

  return <>
    <div style={{ fontSize: '0.75rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.5rem' }}>
      Dé de vie : d{entry.hit_die}
      {entry.caster_type && <span style={{ marginLeft: '0.8rem', color: '#b89fff' }}>{CASTER_LABELS[entry.caster_type]}</span>}
    </div>
    {hr()}
    {row('Maîtrises', nameList(entry.proficiencies))}
    {row('Jets de sauvegarde', nameList(entry.saving_throws))}
    {entry.spellcasting && row('Caractéristique de sort', entry.spellcasting.ability)}
    {(entry.proficiency_choices || []).length > 0 && <>
      <div style={{ fontSize: '0.72rem', color: '#7a6a55', marginBottom: '0.15rem', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>CHOIX DE MAÎTRISES</div>
      {entry.proficiency_choices.map((c, i) => <div key={i} style={{ fontSize: '0.78rem', marginBottom: '0.2rem', color: '#a09070' }}>
        Choisir {c.choose} : {(c.from || []).join(', ')}
      </div>)}
    </>}

    {/* Multiclassing prerequisites */}
    {(entry.multiclassing?.prerequisites || []).length > 0 && <>
      {hr()}
      {title('Multiclasse — Prérequis')}
      {entry.multiclassing.prerequisites.map((p, i) => (
        <div key={i} style={{ fontSize: '0.82rem', color: '#d8c8a8' }}>• {p.ability} {p.minimum} minimum</div>
      ))}
      {(entry.multiclassing.proficiencies_gained || []).length > 0 && (
        <div style={{ fontSize: '0.78rem', color: '#a09070', marginTop: '0.2rem' }}>
          Maîtrises gagnées : {entry.multiclassing.proficiencies_gained.join(', ')}
        </div>
      )}
    </>}

    {/* Levels */}
    {hr()}
    {title(`Niveaux & Capacités (${levelsWithFeatures.length} niveaux avec capacités)`)}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {levelsWithFeatures.map(l => {
        const isOpen = openLevel === l.level
        const hasFeatures = l.features?.length > 0
        const hasSlots = l.spellcasting && Object.values(l.spellcasting).some(v => v > 0)
        return (
          <div key={l.level} style={{ border: '1px solid #2a2010', borderRadius: 3, overflow: 'hidden' }}>
            <div
              onClick={() => hasFeatures && setOpenLevel(isOpen ? null : l.level)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', background: isOpen ? 'rgba(212,168,67,0.08)' : 'transparent', cursor: hasFeatures ? 'pointer' : 'default' }}
            >
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: '#d4a843', minWidth: 28 }}>N{l.level}</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.58rem', color: '#7a6a55', minWidth: 22 }}>+{l.prof_bonus}</span>
              {l.ability_score_bonuses > 0 && <span style={{ fontSize: '0.65rem', color: '#5db85c', marginRight: 4 }}>ASI</span>}
              <span style={{ flex: 1, fontSize: '0.75rem', color: '#c0b090' }}>
                {hasFeatures ? l.features.map(f => f.name).join(', ') : <span style={{ color: '#4a3420' }}>—</span>}
              </span>
              {hasSlots && <span style={{ fontSize: '0.6rem', color: '#b89fff' }}>✦</span>}
              {hasFeatures && <span style={{ fontSize: '0.6rem', color: '#7a6a55' }}>{isOpen ? '▴' : '▾'}</span>}
            </div>
            {isOpen && (
              <div style={{ padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid #2a2010' }}>
                {l.features.map((f, i) => (
                  <div key={i} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: '#d4a843', marginBottom: '0.2rem' }}>{f.name}</div>
                    {(f.desc || []).map((p, j) => <p key={j} style={{ fontSize: '0.78rem', color: '#a09070', lineHeight: 1.5, marginBottom: '0.2rem' }}>{p}</p>)}
                  </div>
                ))}
                {hasSlots && (
                  <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[1,2,3,4,5,6,7,8,9].map(sl => l.spellcasting[`spell_slots_level_${sl}`] > 0 && (
                      <span key={sl} style={{ fontSize: '0.65rem', background: 'rgba(184,159,255,0.12)', border: '1px solid rgba(184,159,255,0.4)', borderRadius: 3, padding: '0.1rem 0.4rem', color: '#b89fff' }}>
                        Niv.{sl} ×{l.spellcasting[`spell_slots_level_${sl}`]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>

    {/* Subclasses */}
    {(entry.subclasses || []).length > 0 && <>
      {hr()}
      {title('Sous-classes')}
      {entry.subclasses.map((sc, i) => {
        const isOpen = openSubclass === sc.index
        return (
          <div key={i} style={{ border: '1px solid #2a2010', borderRadius: 3, marginBottom: 4, overflow: 'hidden' }}>
            <div onClick={() => setOpenSubclass(isOpen ? null : sc.index)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', cursor: 'pointer', background: isOpen ? 'rgba(212,168,67,0.08)' : 'transparent' }}>
              <span style={{ flex: 1, fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#d4a843' }}>{sc.name}</span>
              {sc.name_en && sc.name_en !== sc.name && <span style={{ fontSize: '0.65rem', color: '#7a6a55' }}>{sc.name_en}</span>}
              <span style={{ fontSize: '0.6rem', color: '#7a6a55' }}>{isOpen ? '▴' : '▾'}</span>
            </div>
            {isOpen && (
              <div style={{ padding: '0.5rem 0.6rem', borderTop: '1px solid #2a2010', background: 'rgba(0,0,0,0.2)' }}>
                {sc.subclass_flavor && <div style={{ fontSize: '0.72rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.3rem' }}>{sc.subclass_flavor}</div>}
                {(sc.desc || []).map((p, j) => <p key={j} style={{ fontSize: '0.78rem', color: '#a09070', lineHeight: 1.5, marginBottom: '0.2rem' }}>{p}</p>)}
                {(sc.levels || []).filter(l => l.features?.length > 0).map(l => (
                  <div key={l.level} style={{ marginTop: '0.4rem', paddingTop: '0.3rem', borderTop: '1px solid #2a2010' }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: '#d4a843', marginBottom: '0.2rem' }}>NIVEAU {l.level}</div>
                    {l.features.map((f, j) => (
                      <div key={j} style={{ marginBottom: '0.4rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d8c8a8', marginBottom: '0.15rem' }}>{f.name}</div>
                        {(f.desc || []).map((p, k) => <p key={k} style={{ fontSize: '0.75rem', color: '#a09070', lineHeight: 1.5 }}>{p}</p>)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>}
  </>
}

function RaceDetail({ entry, row, hr, title, descBlocks, nameList }) {
  return <>
    <div style={{ fontSize: '0.75rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.5rem' }}>
      {entry.size} · Vitesse {entry.speed}m
    </div>
    {hr()}
    {(entry.ability_bonuses || []).length > 0 && row('Bonus de caractéristiques',
      entry.ability_bonuses.map(b => `${b.ability_score?.name || b.ability_score} +${b.bonus}`).join(', '))}
    {row('Alignement', entry.alignment)}
    {row('Âge', entry.age)}
    {row('Taille', entry.size_description)}
    {row('Langues', nameList(entry.languages))}
    {(entry.traits || []).length > 0 && <>{hr()}{title('Traits raciaux')}
      {entry.traits.map((t, i) => <div key={i} style={{ fontSize: '0.82rem', marginBottom: '0.3rem' }}>• {t.name || t}</div>)}</>}
    {(entry.subraces || []).length > 0 && <>{hr()}{title('Sous-races')}
      {entry.subraces.map((s, i) => (
        <div key={i} style={{ marginBottom: '0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '0.4rem' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#d4a843', marginBottom: '0.2rem' }}>{s.name}</div>
          {(s.ability_bonuses || []).length > 0 && <div style={{ fontSize: '0.78rem', color: '#a09070' }}>
            Bonus : {s.ability_bonuses.map(b => `${b.ability_score?.name || b.ability_score} +${b.bonus}`).join(', ')}
          </div>}
          {(s.racial_traits || []).length > 0 && <div style={{ fontSize: '0.75rem', color: '#7a6a55', marginTop: '0.15rem' }}>
            Traits : {s.racial_traits.map(t => t.name || t).join(', ')}
          </div>}
        </div>
      ))}</>}
  </>
}

function FeatDetail({ entry, row, hr, descBlocks }) {
  return <>
    {(entry.prerequisites || []).length > 0 && <>
      {row('Prérequis', entry.prerequisites.map(p => `${p.ability_score?.name || p.type} ${p.minimum_score || ''}`).join(', '))}
      {hr()}
    </>}
    {descBlocks(entry.desc)}
  </>
}

// ── Multiclasse Calculator ────────────────────────────────────────────────────

const CASTER_WEIGHT = { full: 1, half: 0.5, third: 1/3, warlock: 0, null: 0 }
const MULTICLASS_SLOTS = [
  [2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1],
]
// Warlock slots per level (1-20): {slots, slot_level}
const WARLOCK_SLOTS = [
  {slots:1,level:1},{slots:2,level:1},{slots:2,level:2},{slots:2,level:2},
  {slots:2,level:3},{slots:2,level:3},{slots:2,level:4},{slots:2,level:4},
  {slots:2,level:5},{slots:2,level:5},{slots:3,level:5},{slots:3,level:5},
  {slots:3,level:5},{slots:3,level:5},{slots:3,level:5},{slots:3,level:5},
  {slots:4,level:5},{slots:4,level:5},{slots:4,level:5},{slots:4,level:5},
]

function MulticlassCalculator() {
  const allClasses = useMemo(() => window.DND_CLASSES_FR || window.DND_CLASSES_EN || [], [])
  const [picks, setPicks] = useState([{ classIndex: '', level: 1 }])

  function addPick() { setPicks(p => [...p, { classIndex: '', level: 1 }]) }
  function removePick(i) { setPicks(p => p.filter((_, j) => j !== i)) }
  function updatePick(i, field, val) {
    setPicks(p => p.map((pk, j) => j === i ? { ...pk, [field]: val } : pk))
  }

  const totalLevel = picks.reduce((s, p) => s + (parseInt(p.level) || 0), 0)

  // Compute combined spell slots
  const result = useMemo(() => {
    let casterLevel = 0
    let warlockPick = null
    const classFeatures = []

    for (const pick of picks) {
      const cls = allClasses.find(c => c.index === pick.classIndex)
      if (!cls) continue
      const lvl = Math.max(1, Math.min(20, parseInt(pick.level) || 1))
      const ct = cls.caster_type
      if (ct === 'warlock') {
        warlockPick = { cls, lvl }
      } else {
        casterLevel += Math.floor(lvl * (CASTER_WEIGHT[ct] || 0))
      }
      // Collect features for this class up to this level
      const levelFeatures = (cls.levels || [])
        .filter(l => l.level <= lvl && l.features?.length)
        .map(l => ({ level: l.level, features: l.features.map(f => f.name) }))
      classFeatures.push({ cls, lvl, levelFeatures })
    }

    // Combined slots from non-warlock casters
    const slots = casterLevel >= 1 ? [...MULTICLASS_SLOTS[Math.min(casterLevel, 20) - 1]] : [0,0,0,0,0,0,0,0,0]

    // Warlock adds its own Pact Magic slots separately
    const warlockSlots = warlockPick ? WARLOCK_SLOTS[warlockPick.lvl - 1] : null

    return { slots, warlockSlots, casterLevel, classFeatures }
  }, [picks, allClasses])

  const hr = () => <hr style={{ border: 'none', borderTop: '1px solid #4a3420', margin: '0.8rem 0' }} />

  return (
    <div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#d4a843', fontWeight: 700, marginBottom: '0.2rem' }}>🔀 Calculateur Multiclasse</div>
      <div style={{ fontSize: '0.75rem', color: '#7a6a55', marginBottom: '1rem' }}>Niveau total : {totalLevel}/20</div>

      {/* Class picks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem' }}>
        {picks.map((pick, i) => {
          const cls = allClasses.find(c => c.index === pick.classIndex)
          return (
            <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <select
                value={pick.classIndex}
                onChange={e => updatePick(i, 'classIndex', e.target.value)}
                style={{ flex: 1, background: '#1a1410', border: '1px solid #4a3420', color: pick.classIndex ? '#d8c8a8' : '#7a6a55', borderRadius: 3, padding: '0.35rem', fontSize: '0.8rem', fontFamily: 'EB Garamond, serif' }}
              >
                <option value="">— Classe —</option>
                {allClasses.map(c => <option key={c.index} value={c.index}>{c.name}</option>)}
              </select>
              <input
                type="number" min="1" max="20"
                value={pick.level}
                onChange={e => updatePick(i, 'level', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                style={{ width: 48, background: '#1a1410', border: '1px solid #4a3420', color: '#d4a843', borderRadius: 3, padding: '0.35rem', fontSize: '0.85rem', textAlign: 'center' }}
              />
              {cls && <span style={{ fontSize: '0.65rem', color: '#b89fff', minWidth: 14 }}>{cls.caster_type === 'full' ? '★' : cls.caster_type === 'half' ? '½' : cls.caster_type === 'third' ? '⅓' : cls.caster_type === 'warlock' ? 'P' : '—'}</span>}
              {picks.length > 1 && (
                <button onClick={() => removePick(i)} style={{ background: 'none', border: 'none', color: '#7a6a55', cursor: 'pointer', fontSize: '0.9rem', padding: '0 0.2rem' }}>✕</button>
              )}
            </div>
          )
        })}
      </div>
      {totalLevel < 20 && (
        <button onClick={addPick} style={{ width: '100%', background: 'none', border: '1px dashed #4a3420', color: '#7a6a55', borderRadius: 3, padding: '0.3rem', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Cinzel, serif', marginBottom: '0.8rem' }}>
          ＋ Ajouter une classe
        </button>
      )}

      {hr()}

      {/* Spell slots result */}
      {result.casterLevel > 0 && <>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: '#d4a843', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>
          EMPLACEMENTS DE SORT — Niveau de lanceur {result.casterLevel}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
          {result.slots.map((count, i) => count > 0 && (
            <div key={i} style={{ background: 'rgba(184,159,255,0.1)', border: '1px solid rgba(184,159,255,0.4)', borderRadius: 4, padding: '0.3rem 0.5rem', textAlign: 'center', minWidth: 44 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.58rem', color: '#7a6a55' }}>Niv.{i + 1}</div>
              <div style={{ fontSize: '1rem', color: '#b89fff', fontWeight: 700 }}>{count}</div>
            </div>
          ))}
        </div>
      </>}

      {result.warlockSlots && <>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: '#e0a050', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>
          MAGIE DE PACTE (Occultiste séparé)
        </div>
        <div style={{ background: 'rgba(224,160,80,0.08)', border: '1px solid rgba(224,160,80,0.3)', borderRadius: 4, padding: '0.4rem 0.6rem', marginBottom: '0.6rem', fontSize: '0.82rem', color: '#e0a050' }}>
          {result.warlockSlots.slots} emplacement{result.warlockSlots.slots > 1 ? 's' : ''} de niveau {result.warlockSlots.level}
        </div>
      </>}

      {result.casterLevel === 0 && result.picks?.length > 0 && (
        <div style={{ color: '#7a6a55', fontSize: '0.8rem', fontStyle: 'italic' }}>Aucun emplacement de sort (classes non-lanceurs)</div>
      )}

      {/* Features summary per class */}
      {result.classFeatures.length > 0 && <>
        {hr()}
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: '#d4a843', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>CAPACITÉS PAR CLASSE</div>
        {result.classFeatures.map(({ cls, lvl, levelFeatures }, i) => (
          <div key={i} style={{ marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', color: '#d8c8a8' }}>{cls.name}</span>
              <span style={{ fontSize: '0.7rem', color: '#7a6a55' }}>niv. {lvl}</span>
            </div>
            {levelFeatures.map((lf, j) => (
              <div key={j} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: '#d4a843', minWidth: 22 }}>N{lf.level}</span>
                <span style={{ color: '#a09070' }}>{lf.features.join(', ')}</span>
              </div>
            ))}
          </div>
        ))}
      </>}

      {hr()}
      <div style={{ fontSize: '0.68rem', color: '#4a3420', lineHeight: 1.5 }}>
        ★ Lanceur complet (Barde, Clerc, Druide, Ensorceleur, Magicien)<br/>
        ½ Demi-lanceur (Paladin, Rôdeur)<br/>
        ⅓ Tiers-lanceur (Chevalier Occulte, Filou Arcanique)<br/>
        P Magie de Pacte Occultiste (emplacements séparés)
      </div>
    </div>
  )
}

function BackgroundDetail({ entry, row, hr, title, descBlocks }) {
  return <>
    {hr()}
    {row('Maîtrises de compétences', (entry.skill_proficiencies || []).map(s => s.name || s).join(', '))}
    {row('Maîtrises d\'outils', (entry.tool_proficiencies || []).map(s => s.name || s).join(', '))}
    {row('Langues', entry.languages_desc || '')}
    {entry.feature && <>{hr()}{title(entry.feature.name || 'Aptitude')}
      {descBlocks(entry.feature.desc)}</>}
    {(entry.starting_equipment || []).length > 0 && <>{hr()}{title('Équipement de départ')}
      {entry.starting_equipment.map((e, i) => <div key={i} style={{ fontSize: '0.82rem', marginBottom: '0.2rem' }}>• {e.equipment?.name || e.equipment} {e.quantity > 1 ? `×${e.quantity}` : ''}</div>)}</>}
    {(entry.personality_traits || []).length > 0 && <>{hr()}{title('Traits de personnalité')}
      {entry.personality_traits.map((t, i) => <div key={i} style={{ fontSize: '0.8rem', color: '#a09070', marginBottom: '0.2rem' }}>• {t}</div>)}</>}
  </>
}
