import React, { useState, useMemo, useRef } from 'react'
import { fsAdd, fsSet, fsDelete } from '../../hooks/useFirestore'

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

function parseMaxHp(hpStr) {
  if (!hpStr) return null
  const m = String(hpStr).match(/^(\d+)/)
  return m ? parseInt(m[1]) : null
}

export default function MonsterBrowser({ firestoreMonsters, onAddToEncounter, onClose, styles }) {
  const [tab, setTab] = useState('library')
  const [lang, setLang] = useState('fr')
  const [search, setSearch] = useState('')
  const [crMin, setCrMin] = useState(0)
  const [crMax, setCrMax] = useState(30)
  const [filterType, setFilterType] = useState('')
  const [filterSize, setFilterSize] = useState('')
  const [selected, setSelected] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMonster, setEditingMonster] = useState(null)
  const importRef = useRef(null)

  const library = useMemo(() => {
    try {
      if (lang === 'fr' && window.DND_MONSTERS_FR?.length) return window.DND_MONSTERS_FR
      return window.DND_MONSTERS_EN || []
    } catch { return [] }
  }, [lang])

  const myMonsters = firestoreMonsters || []

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

  const filteredMy = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return myMonsters
    return myMonsters.filter(m => (m.name || '').toLowerCase().includes(q))
  }, [myMonsters, search])

  function buildMonsterData(m) {
    return {
      name: m.name || '',
      type: [m.size, m.type, m.alignment].filter(Boolean).join(', '),
      cr: crStr(m.challenge_rating ?? 0),
      xp: String(m.xp || 0),
      prof: m.proficiency_bonus ? `+${m.proficiency_bonus}` : '+2',
      speed: speedStr(m.speed),
      ac: Array.isArray(m.armor_class) ? m.armor_class.map(a => a.value || a).join(', ') : String(m.armor_class || 10),
      hp: `${m.hit_points || 0}${m.hit_points_roll ? ` (${m.hit_points_roll})` : ''}`,
      str: m.strength || 10, dex: m.dexterity || 10, con: m.constitution || 10,
      int: m.intelligence || 10, wis: m.wisdom || 10, cha: m.charisma || 10,
      saves: (m.saving_throws || []).map(sv => `${sv.name || sv.ability_score?.name} ${sv.value >= 0 ? '+' : ''}${sv.value}`).join(', '),
      skills: (m.proficiencies || []).filter(p => p.proficiency?.index?.startsWith('skill-')).map(p => `${p.proficiency.name?.replace('Skill: ', '')} ${p.value >= 0 ? '+' : ''}${p.value}`).join(', '),
      senses: Object.entries(m.senses || {}).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', '),
      languages: m.languages || '',
      dmg_immune: (m.damage_immunities || []).join(', '),
      dmg_resist: (m.damage_resistances || []).join(', '),
      dmg_vuln: (m.damage_vulnerabilities || []).join(', '),
      cond_immune: (m.condition_immunities || []).map(c => c.name || c).join(', '),
      traits: (m.special_abilities || []).map(a => ({ name: a.name || '', desc: a.desc || '' })),
      actions: (m.actions || []).map(a => ({ name: a.name || '', desc: a.desc || '' })),
      legendary_actions: (m.legendary_actions || []).map(a => ({ name: a.name || '', desc: a.desc || '' })),
      notes: '',
      source: 'library',
      source_index: m.index,
    }
  }

  async function addToMyMonsters() {
    if (!selected) return
    const data = buildMonsterData(selected)
    await fsAdd('local/data/monsters', data)
    if (window.__campaign) window.__campaign.readAll('monsters')
  }

  function addLibraryToEncounter() {
    if (!selected || !onAddToEncounter) return
    onAddToEncounter(buildMonsterData(selected))
  }

  function addMyMonsterToEncounter(m) {
    if (!onAddToEncounter) return
    onAddToEncounter(m)
  }

  function newMonster() {
    setEditingMonster({
      name: '', type: '', cr: '0', xp: '0', prof: '+2', speed: '9m',
      ac: '10', hp: '10',
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      saves: '', skills: '', dmg_immune: '', dmg_resist: '', dmg_vuln: '',
      cond_immune: '', senses: '', languages: '',
      traits: [], actions: [], legendary_actions: [], notes: '',
    })
    setModalOpen(true)
  }

  function editMonster(m) {
    setEditingMonster({ ...m, firestoreId: m.id })
    setModalOpen(true)
  }

  async function saveMonster(data) {
    if (data.firestoreId) {
      await fsSet('local/data/monsters', data.firestoreId, data)
    } else {
      await fsAdd('local/data/monsters', data)
    }
    setModalOpen(false)
    setEditingMonster(null)
  }

  async function deleteMonster(id) {
    if (!confirm('Supprimer ce monstre ?')) return
    await fsDelete('local/data/monsters', id)
    if (selected?.id === id) setSelected(null)
  }

  function handleImport(e) {
    const files = [...e.target.files]
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = async ev => {
        try {
          const data = JSON.parse(ev.target.result)
          await fsAdd('local/data/monsters', data)
        } catch {}
      }
      reader.readAsText(file)
    })
    e.target.value = ''
  }

  return (
    <div className={styles.browserModal}>
      <div className={styles.browserInner}>

        {/* Header */}
        <div className={styles.browserHead}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.2rem', background: '#0d0b07', borderRadius: 4, padding: 2 }}>
            <button
              style={{ background: tab === 'library' ? '#2d2520' : 'none', border: 'none', color: tab === 'library' ? '#d4a843' : '#7a6a55', fontFamily: 'Cinzel, serif', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 3, cursor: 'pointer' }}
              onClick={() => { setTab('library'); setSelected(null) }}
            >📖 Bibliothèque</button>
            <button
              style={{ background: tab === 'custom' ? '#2d2520' : 'none', border: 'none', color: tab === 'custom' ? '#d4a843' : '#7a6a55', fontFamily: 'Cinzel, serif', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 3, cursor: 'pointer' }}
              onClick={() => { setTab('custom'); setSelected(null) }}
            >🐉 Mes Monstres <span style={{ fontSize: '0.6rem', color: '#7a6a55' }}>{myMonsters.length || ''}</span></button>
          </div>

          <span style={{ fontSize: '0.7rem', color: '#7a6a55', flex: 1 }}>
            {tab === 'library' ? `${filtered.length} monstres` : `${filteredMy.length} monstres`}
          </span>

          {tab === 'library' && (
            <div className={styles.langToggle}>
              {['fr', 'en'].map(l => (
                <button key={l} className={`${styles.langBtn}${lang === l ? ' ' + styles.active : ''}`} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {tab === 'custom' && (
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button onClick={newMonster} style={{ padding: '0.2rem 0.5rem', background: 'rgba(212,168,67,0.1)', border: '1px solid #d4a843', color: '#d4a843', borderRadius: 3, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.65rem' }}>+ Nouveau</button>
              <button onClick={() => importRef.current?.click()} style={{ padding: '0.2rem 0.5rem', background: 'none', border: '1px solid #4a3420', color: '#7a6a55', borderRadius: 3, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.65rem' }}>📥 Importer</button>
              <input ref={importRef} type="file" accept=".json" multiple style={{ display: 'none' }} onChange={handleImport} />
            </div>
          )}
          <button className={styles.browserClose} onClick={onClose}>✕</button>
        </div>

        {/* Filters */}
        <div className={styles.browserFilters}>
          <input
            type="text"
            placeholder="🔍 Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {tab === 'library' && (
            <>
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
            </>
          )}
        </div>

        {/* Body */}
        <div className={styles.browserBody}>
          <div className={styles.browserList}>
            {tab === 'library' ? (
              library.length === 0 ? (
                <div style={{ color: '#7a6a55', padding: '2rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Bundles non chargés.<br />Assurez-vous que <code>dnd_db/bundle_monsters_*.js</code> sont présents.
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
              ))
            ) : (
              filteredMy.length === 0 ? (
                <div style={{ color: '#7a6a55', padding: '2rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Aucun monstre. Cliquez "+ Nouveau" pour créer.
                </div>
              ) : filteredMy.map(m => (
                <div
                  key={m.id}
                  className={`${styles.browserListItem}${selected?.id === m.id ? ' ' + styles.selected : ''}`}
                  onClick={() => setSelected(m)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span className={styles.browserListName} style={{ flex: 1 }}>{m.name || 'Sans nom'}</span>
                  <span className={styles.browserListCr}>FP {crStr(parseFloat(m.cr ?? m.challenge_rating) || 0)}</span>
                  {onAddToEncounter && <button onClick={e => { e.stopPropagation(); addMyMonsterToEncounter(m) }} style={{ background: 'none', border: 'none', color: '#5b8dd9', cursor: 'pointer', fontSize: '0.75rem', padding: '0 0.2rem' }} title="Ajouter à la rencontre">⚔</button>}
                  <button onClick={e => { e.stopPropagation(); editMonster(m) }} style={{ background: 'none', border: 'none', color: '#7a6a55', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }} title="Modifier">✎</button>
                  <button onClick={e => { e.stopPropagation(); deleteMonster(m.id) }} style={{ background: 'none', border: 'none', color: '#c44a1a', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }} title="Supprimer">✕</button>
                </div>
              ))
            )}
          </div>

          <div className={styles.browserPreview}>
            {!selected ? (
              <div className={styles.browserPreviewEmpty}>Cliquez sur un monstre pour voir sa fiche.</div>
            ) : tab === 'library' ? (
              <MonsterPreview monster={selected} styles={styles} onAddToMyMonsters={addToMyMonsters} onAddToEncounter={onAddToEncounter ? addLibraryToEncounter : null} />
            ) : (
              <MyMonsterPreview monster={selected} styles={styles} onEdit={() => editMonster(selected)} onAddToEncounter={onAddToEncounter ? () => addMyMonsterToEncounter(selected) : null} />
            )}
          </div>
        </div>

      </div>

      {modalOpen && editingMonster && (
        <MonsterModal
          monster={editingMonster}
          onSave={saveMonster}
          onClose={() => { setModalOpen(false); setEditingMonster(null) }}
          styles={styles}
        />
      )}
    </div>
  )
}

function MyMonsterPreview({ monster: m, styles, onEdit, onAddToEncounter }) {
  return (
    <div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#d4a843', fontWeight: 700, marginBottom: '0.2rem' }}>{m.name || '—'}</div>
      <div style={{ fontSize: '0.78rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.5rem' }}>{m.type || '—'}</div>
      <hr style={{ border: 'none', borderTop: '1px solid #4a3420', margin: '0.5rem 0' }} />
      {[["CA", m.ac], ["PV", m.hp], ["Vitesse", m.speed], ["FP", m.cr]].filter(([, v]) => v).map(([l, v]) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.82rem' }}>
          <span style={{ color: '#7a6a55', fontSize: '0.65rem', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>{l}</span>
          <span style={{ fontWeight: 600 }}>{v}</span>
        </div>
      ))}
      <hr style={{ border: 'none', borderTop: '1px solid #4a3420', margin: '0.5rem 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '0.3rem', textAlign: 'center', marginBottom: '0.5rem' }}>
        {['str','dex','con','int','wis','cha'].map(k => {
          const score = parseInt(m[k]) || 10
          const mv = Math.floor((score - 10) / 2)
          return (
            <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '0.2rem' }}>
              <div style={{ fontSize: '0.5rem', color: '#7a6a55', fontFamily: 'Cinzel, serif' }}>{k.toUpperCase()}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{score}</div>
              <div style={{ fontSize: '0.6rem', color: '#7a6a55' }}>{mv >= 0 ? '+' : ''}{mv}</div>
            </div>
          )
        })}
      </div>
      {m.notes && <p style={{ fontSize: '0.8rem', color: '#d8c8a8', marginTop: '0.5rem' }}>{m.notes}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
        {onAddToEncounter && (
          <button onClick={onAddToEncounter} style={{ width: '100%', padding: '0.5rem', background: 'rgba(91,141,217,0.1)', border: '1px solid #5b8dd9', borderRadius: 3, color: '#5b8dd9', fontFamily: 'Cinzel, serif', fontSize: '0.72rem', cursor: 'pointer' }}>
            ⚔ Ajouter à la rencontre
          </button>
        )}
        <button onClick={onEdit} style={{ width: '100%', padding: '0.5rem', background: 'rgba(212,168,67,0.1)', border: '1px solid #d4a843', borderRadius: 3, color: '#d4a843', fontFamily: 'Cinzel, serif', fontSize: '0.72rem', cursor: 'pointer' }}>
          ✎ Modifier
        </button>
      </div>
    </div>
  )
}

function MonsterPreview({ monster: m, styles, onAddToMyMonsters, onAddToEncounter }) {
  const abilities = [
    { k: 'strength', l: 'FOR' }, { k: 'dexterity', l: 'DEX' }, { k: 'constitution', l: 'CON' },
    { k: 'intelligence', l: 'INT' }, { k: 'wisdom', l: 'SAG' }, { k: 'charisma', l: 'CHA' },
  ]
  const ac = Array.isArray(m.armor_class) ? m.armor_class.map(a => `${a.value}${a.type ? ` (${a.type})` : ''}`).join(', ') : m.armor_class
  const speed = speedStr(m.speed)

  return (
    <div>
      <div className={styles.monsterSheetName}>{m.name}</div>
      <div className={styles.monsterSheetType}>{[m.size, m.type, m.alignment].filter(Boolean).join(', ')}</div>
      <hr className={styles.monsterSheetDivider} />
      {[["Classe d'armure", ac], ['Points de vie', m.hit_points + (m.hit_points_roll ? ` (${m.hit_points_roll})` : '')], ['Vitesse', speed]].map(([label, val]) => val && (
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
      {(m.special_abilities || []).slice(0, 3).map((t, i) => (
        <div key={i} style={{ marginBottom: '0.4rem', fontSize: '0.78rem' }}>
          <strong style={{ color: '#d4a843' }}>{t.name}.</strong> {(t.desc || '').slice(0, 120)}{t.desc?.length > 120 ? '…' : ''}
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
        {onAddToEncounter && (
          <button onClick={onAddToEncounter} style={{ width: '100%', padding: '0.5rem', background: 'rgba(91,141,217,0.1)', border: '1px solid #5b8dd9', borderRadius: 3, color: '#5b8dd9', fontFamily: 'Cinzel, serif', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s' }}>
            ⚔ Ajouter à la rencontre
          </button>
        )}
        {onAddToMyMonsters && (
          <button onClick={onAddToMyMonsters} style={{ width: '100%', padding: '0.5rem', background: 'rgba(212,168,67,0.1)', border: '1px solid #d4a843', borderRadius: 3, color: '#d4a843', fontFamily: 'Cinzel, serif', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s' }}>
            💾 Sauvegarder dans Mes Monstres
          </button>
        )}
      </div>
    </div>
  )
}

function MonsterModal({ monster, onSave, onClose, styles }) {
  const [data, setData] = useState(monster)
  const upd = partial => setData(prev => ({ ...prev, ...partial }))

  function addAction(field) { upd({ [field]: [...(data[field] || []), { name: '', desc: '' }] }) }
  function updateAction(field, i, partial) {
    const arr = [...(data[field] || [])]
    arr[i] = { ...arr[i], ...partial }
    upd({ [field]: arr })
  }
  function removeAction(field, i) { upd({ [field]: (data[field] || []).filter((_, j) => j !== i) }) }
  function calcMod(score) { const m = Math.floor(((parseInt(score) || 10) - 10) / 2); return `(${m >= 0 ? '+' : ''}${m})` }

  return (
    <div className={styles.monsterModal}>
      <div className={styles.mmInner}>
        <div className={styles.mmHead}>
          <span className={styles.mmTitle}>{data.firestoreId ? 'Modifier' : 'Nouveau'} Monstre</span>
          <div className={styles.mmHeadBtns}>
            <button className={styles.mmSave} onClick={() => onSave(data)}>💾 Sauvegarder</button>
            <button className={styles.mmClose} onClick={onClose}>✕</button>
          </div>
        </div>
        <div className={styles.mmBody}>
          <div className={`${styles.mmRow} ${styles.c2}`}>
            <div className={styles.mmField} style={{ gridColumn: '1/-1' }}><label>Nom</label><input type="text" placeholder="Gobelin" value={data.name || ''} onChange={e => upd({ name: e.target.value })} /></div>
            <div className={styles.mmField} style={{ gridColumn: '1/-1' }}><label>Type &amp; taille</label><input type="text" placeholder="Petite créature humanoïde" value={data.type || ''} onChange={e => upd({ type: e.target.value })} /></div>
          </div>
          <div className={`${styles.mmRow} ${styles.c4}`}>
            {[['FP','cr','1/4'],['XP','xp','50'],['Bonus maîtrise','prof','+2'],['Vitesse','speed','9m']].map(([label,f,ph]) => (
              <div key={f} className={styles.mmField}><label>{label}</label><input type="text" placeholder={ph} value={data[f]||''} onChange={e=>upd({[f]:e.target.value})}/></div>
            ))}
          </div>
          <div className={`${styles.mmRow} ${styles.c3}`}>
            {[["CA",'ac','10'],['PV','hp','7 (2d6)']].map(([label,f,ph]) => (
              <div key={f} className={styles.mmField}><label>{label}</label><input type="text" placeholder={ph} value={data[f]||''} onChange={e=>upd({[f]:e.target.value})}/></div>
            ))}
            <div />
          </div>
          <hr className={styles.mmDivider} />
          <div className={`${styles.mmRow} ${styles.c6}`}>
            {['str','dex','con','int','wis','cha'].map(k => (
              <div key={k} className={styles.mmAbility}>
                <label>{k.toUpperCase()}</label>
                <input type="number" value={data[k]||10} min="1" max="30" onChange={e=>upd({[k]:parseInt(e.target.value)||10})}/>
                <div className={styles.amod}>{calcMod(data[k])}</div>
              </div>
            ))}
          </div>
          <hr className={styles.mmDivider} />
          <div className={`${styles.mmRow} ${styles.c2}`}>
            {[['Jets de sauvegarde','saves'],['Compétences','skills'],['Immunités dégâts','dmg_immune'],['Résistances','dmg_resist'],['Vulnérabilités','dmg_vuln'],['Immunités conditions','cond_immune'],['Sens','senses'],['Langues','languages']].map(([label,f]) => (
              <div key={f} className={styles.mmField}><label>{label}</label><input type="text" value={data[f]||''} onChange={e=>upd({[f]:e.target.value})}/></div>
            ))}
          </div>
          {['traits','actions','legendary_actions'].map(field => (
            <div key={field} className={styles.mmActionsArea}>
              <div className={styles.mmActionsHead}>
                <span>{{traits:'Traits',actions:'Actions',legendary_actions:'Actions légendaires'}[field]}</span>
                <button className={styles.mmActionsAdd} onClick={() => addAction(field)}>+ Ajouter</button>
              </div>
              {(data[field]||[]).map((item,i) => (
                <div key={i} className={styles.mmActionRow}>
                  <input type="text" placeholder="Nom" value={item.name||''} onChange={e=>updateAction(field,i,{name:e.target.value})}/>
                  <textarea placeholder="Description..." value={item.desc||''} onChange={e=>updateAction(field,i,{desc:e.target.value})}/>
                  <button className={styles.mmActionDel} onClick={()=>removeAction(field,i)}>×</button>
                </div>
              ))}
            </div>
          ))}
          <div className={styles.mmField} style={{ marginTop: '0.6rem' }}>
            <label>Notes</label>
            <textarea value={data.notes||''} onChange={e=>upd({notes:e.target.value})} placeholder="Notes diverses..."/>
          </div>
        </div>
      </div>
    </div>
  )
}
