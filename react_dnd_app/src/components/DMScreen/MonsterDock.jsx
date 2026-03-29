import React, { useState, useRef } from 'react'
import { fsAdd } from '../../hooks/useFirestore'

function crStr(v) {
  if (v === 0.125) return '1/8'
  if (v === 0.25) return '1/4'
  if (v === 0.5) return '1/2'
  return String(v ?? 0)
}

function parseMaxHp(hpStr) {
  if (!hpStr) return null
  const m = String(hpStr).match(/^(\d+)/)
  return m ? parseInt(m[1]) : null
}

export default function MonsterDock({ encounterMonsters, setEncounterMonsters, onOpenBrowser, onAddToInitiative, styles }) {
  const [dockOpen, setDockOpen] = useState(false)
  const [expandedEid, setExpandedEid] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMonster, setEditingMonster] = useState(null)
  const [hpMap, setHpMap] = useState({})
  const importInputRef = useRef(null)

  const monsters = encounterMonsters || []

  function saveToStorage(next) {
    setEncounterMonsters(next)
    localStorage.setItem('dnd:encounter', JSON.stringify(next))
  }

  function getCurrentHp(m) {
    if (hpMap[m._eid] !== undefined) return hpMap[m._eid]
    const max = parseMaxHp(m.hp)
    return max !== null ? max : null
  }

  function adjustHp(eid, delta) {
    const m = monsters.find(x => x._eid === eid)
    if (!m) return
    const max = parseMaxHp(m.hp)
    const cur = getCurrentHp(m) ?? max ?? 0
    setHpMap(prev => ({ ...prev, [eid]: Math.max(0, cur + delta) }))
  }

  function setHp(eid, val) {
    setHpMap(prev => ({ ...prev, [eid]: Math.max(0, parseInt(val) || 0) }))
  }

  function resetHp(eid) {
    setHpMap(prev => { const next = { ...prev }; delete next[eid]; return next })
  }

  function removeFromEncounter(eid) {
    saveToStorage(monsters.filter(x => x._eid !== eid))
    if (expandedEid === eid) setExpandedEid(null)
    resetHp(eid)
  }

  function duplicateMonster(m) {
    const rawName = m.name || 'Monstre'
    const baseName = rawName.replace(/\s+\d+$/, '')
    const nums = monsters
      .map(x => x.name || '')
      .filter(n => n.startsWith(baseName + ' '))
      .map(n => parseInt(n.slice(baseName.length + 1)))
      .filter(n => !isNaN(n) && n > 0)
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 2
    const copy = { ...m, name: baseName + ' ' + nextNum, _eid: Date.now() + Math.random() }
    saveToStorage([...monsters, copy])
  }

  function clearEncounter() {
    saveToStorage([])
    setHpMap({})
    setExpandedEid(null)
  }

  function newMonster() {
    setEditingMonster({
      name: '', type: '', cr: '0', xp: '0', prof: '+2', speed: '9m',
      ac: '10', hp: '10',
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      saves: '', skills: '', dmg_immune: '', dmg_resist: '', dmg_vuln: '',
      cond_immune: '', senses: '', languages: '',
      traits: [{ name: '', desc: '' }],
      actions: [{ name: '', desc: '' }],
      legendary_actions: [],
      notes: '',
    })
    setModalOpen(true)
    if (!dockOpen) setDockOpen(true)
  }

  function saveMonster(data) {
    if (data._eid) {
      // Edit existing encounter instance
      saveToStorage(monsters.map(x => x._eid === data._eid ? data : x))
    } else {
      // New monster added directly to encounter
      const instance = { ...data, _eid: Date.now() + Math.random() }
      saveToStorage([...monsters, instance])
    }
    setModalOpen(false)
    setEditingMonster(null)
  }

  async function saveToMyMonsters(data) {
    const copy = { ...data }
    delete copy._eid
    await fsAdd('local/data/monsters', copy)
  }

  function editMonster(m) {
    setEditingMonster({ ...m })
    setModalOpen(true)
  }

  return (
    <div className={styles.monsterDockBottom}>
      {/* Fixed header bar */}
      <div className={styles.dockHeader} onClick={() => setDockOpen(!dockOpen)}>
        <span className={styles.dockTitle}>
          ⚔ Rencontre
          <span className={styles.dockCount}>{monsters.length || ''}</span>
        </span>
        <div className={styles.dockActions} onClick={e => e.stopPropagation()}>
          <button className={styles.dockBtn} style={{ background: 'rgba(91,141,217,.15)', borderColor: '#5b8dd9', color: '#5b8dd9' }} onClick={onOpenBrowser}>
            📖 Bibliothèque
          </button>
          <button className={styles.dockBtn} onClick={newMonster}>＋ Nouveau</button>
          <button className={styles.dockBtn} onClick={() => importInputRef.current?.click()}>📥 Importer</button>
          {monsters.length > 0 && (
            <button className={styles.dockBtn} style={{ color: '#c44a1a', borderColor: '#c44a1a' }} onClick={clearEncounter}>🗑 Vider</button>
          )}
        </div>
        <span className={styles.dockToggle} style={{ transform: dockOpen ? 'rotate(180deg)' : 'none' }}>▲</span>
      </div>

      {/* Expandable body (opens upward via CSS) */}
      {dockOpen && (
        <div className={styles.dockBodyBottom}>
          <div className={styles.monsterList}>
            {monsters.map(m => {
              const maxHp = parseMaxHp(m.hp)
              const curHp = getCurrentHp(m)
              const hpPct = maxHp > 0 && curHp !== null ? curHp / maxHp : 1
              const hpCls = curHp <= 0 ? styles.hpDead : hpPct <= 0.25 ? styles.hpCritical : hpPct <= 0.5 ? styles.hpWounded : ''

              return (
                <div key={m._eid} className={styles.monsterChip}>
                  <div className={styles.chipHead} onClick={() => setExpandedEid(expandedEid === m._eid ? null : m._eid)}>
                    <span className={styles.chipName}>{m.name || 'Sans nom'}</span>
                    <span className={styles.chipCr}>FP {crStr(parseFloat(m.cr ?? m.challenge_rating) || 0)}</span>

                    {/* HP controls */}
                    {maxHp !== null && (
                      <div className={styles.chipHpRow} onClick={e => e.stopPropagation()}>
                        <button className={styles.chipHpBtn} onClick={() => adjustHp(m._eid, -10)}>−10</button>
                        <button className={styles.chipHpBtn} onClick={() => adjustHp(m._eid, -5)}>−5</button>
                        <button className={styles.chipHpBtn} onClick={() => adjustHp(m._eid, -1)}>−</button>
                        <input
                          className={`${styles.chipHpInput} ${hpCls}`}
                          type="number"
                          value={curHp ?? maxHp}
                          min="0"
                          onChange={e => setHp(m._eid, e.target.value)}
                          onClick={e => e.target.select()}
                        />
                        <span className={`${styles.chipHpMax} ${hpCls}`}>/{maxHp}</span>
                        <button className={styles.chipHpBtn} onClick={() => adjustHp(m._eid, 1)}>＋</button>
                        <button className={styles.chipHpBtn} onClick={() => adjustHp(m._eid, 5)}>＋5</button>
                        <button className={styles.chipHpBtn} onClick={() => adjustHp(m._eid, 10)}>＋10</button>
                        <button className={styles.chipHpBtn} onClick={() => resetHp(m._eid)} title="Reset PV">↺</button>
                      </div>
                    )}

                    <div className={styles.chipActions}>
                      <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); onAddToInitiative?.(m.name, 0) }} title="Ajouter à l'initiative" style={{ color: '#5b8dd9' }}>⚔</button>
                      <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); editMonster(m) }} title="Modifier">✎</button>
                      <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); duplicateMonster(m) }} title="Dupliquer">📋</button>
                      <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); saveToMyMonsters(m) }} title="Sauvegarder dans Mes Monstres" style={{ color: '#d4a843' }}>💾</button>
                      <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); removeFromEncounter(m._eid) }} title="Retirer de la rencontre" style={{ color: '#c44a1a' }}>✕</button>
                    </div>
                  </div>

                  {expandedEid === m._eid && (
                    <div className={`${styles.chipBody} ${styles.open}`}>
                      {m.image && (
                        <img
                          src={`https://www.dnd5eapi.co${m.image}`}
                          alt={m.name}
                          onError={e => { e.target.style.display = 'none' }}
                          style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 4, marginBottom: '0.5rem', background: 'rgba(0,0,0,0.3)' }}
                        />
                      )}
                      {m.type && <div style={{ fontSize: '0.75rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.4rem' }}>{m.type}</div>}
                      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        {m.ac && <span style={{ fontSize: '0.75rem' }}>CA : <strong>{m.ac}</strong></span>}
                        {m.speed && <span style={{ fontSize: '0.75rem' }}>Vit : <strong>{m.speed}</strong></span>}
                        {m.senses && <span style={{ fontSize: '0.72rem', color: '#7a6a55' }}>{m.senses}</span>}
                      </div>
                      <div className={styles.monsterStats}>
                        {['str','dex','con','int','wis','cha'].map(k => {
                          const score = parseInt(m[k] || m[`ability_${k}`]) || 10
                          const mv = Math.floor((score - 10) / 2)
                          return (
                            <div key={k} className={styles.monsterStatBox}>
                              <div className={styles.monsterStatLabel}>{k.toUpperCase()}</div>
                              <div className={styles.monsterStatVal}>{score}</div>
                              <div className={styles.monsterStatMod}>{mv >= 0 ? '+' + mv : '' + mv}</div>
                            </div>
                          )
                        })}
                      </div>
                      {(m.saves || m.skills) && (
                        <div style={{ fontSize: '0.72rem', color: '#a09070', margin: '0.3rem 0' }}>
                          {m.saves && <div>Jets de sauvegarde : {m.saves}</div>}
                          {m.skills && <div>Compétences : {m.skills}</div>}
                        </div>
                      )}
                      {(m.dmg_immune || m.dmg_resist || m.dmg_vuln || m.cond_immune) && (
                        <div style={{ fontSize: '0.72rem', color: '#a09070', margin: '0.3rem 0' }}>
                          {m.dmg_immune && <div>Immunités : {m.dmg_immune}</div>}
                          {m.dmg_resist && <div>Résistances : {m.dmg_resist}</div>}
                          {m.dmg_vuln && <div>Vulnérabilités : {m.dmg_vuln}</div>}
                          {m.cond_immune && <div>Immunités conditions : {m.cond_immune}</div>}
                        </div>
                      )}
                      {(m.traits || []).length > 0 && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
                          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: '#d4a843', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Traits</div>
                          {(m.traits || []).map((t, i) => (
                            <div key={i} style={{ marginBottom: '0.35rem' }}>
                              <strong style={{ color: '#d8c8a8' }}>{t.name}</strong>
                              {t.desc ? <span style={{ color: '#a09070' }}>. {t.desc}</span> : ''}
                            </div>
                          ))}
                        </div>
                      )}
                      {(m.actions || []).length > 0 && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
                          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: '#d4a843', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Actions</div>
                          {(m.actions || []).map((a, i) => (
                            <div key={i} style={{ marginBottom: '0.35rem' }}>
                              <em style={{ fontWeight: 700, color: '#d8c8a8', fontStyle: 'normal' }}>{a.name}</em>
                              {a.desc ? <span style={{ color: '#a09070' }}>. {a.desc}</span> : ''}
                            </div>
                          ))}
                        </div>
                      )}
                      {(m.legendary_actions || []).length > 0 && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
                          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: '#d4a843', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Actions légendaires</div>
                          {(m.legendary_actions || []).map((a, i) => (
                            <div key={i} style={{ marginBottom: '0.35rem' }}>
                              <em style={{ fontWeight: 700, color: '#d8c8a8', fontStyle: 'normal' }}>{a.name}</em>
                              {a.desc ? <span style={{ color: '#a09070' }}>. {a.desc}</span> : ''}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.notes && <div style={{ fontSize: '0.75rem', color: '#7a6a55', marginTop: '0.4rem', fontStyle: 'italic', borderTop: '1px solid #2a2010', paddingTop: '0.3rem' }}>{m.notes}</div>}
                    </div>
                  )}
                </div>
              )
            })}
            {monsters.length === 0 && (
              <div style={{ color: '#7a6a55', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.8rem', textAlign: 'center' }}>
                Aucun monstre dans la rencontre. Ajoutez depuis la bibliothèque ou Mes Monstres.
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && editingMonster && (
        <MonsterModal
          monster={editingMonster}
          onSave={saveMonster}
          onClose={() => { setModalOpen(false); setEditingMonster(null) }}
          styles={styles}
        />
      )}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          const files = [...e.target.files]
          files.forEach(file => {
            const reader = new FileReader()
            reader.onload = ev => {
              try {
                const data = JSON.parse(ev.target.result)
                const instance = { ...data, _eid: Date.now() + Math.random() }
                setEncounterMonsters(prev => {
                  const next = [...prev, instance]
                  localStorage.setItem('dnd:encounter', JSON.stringify(next))
                  return next
                })
              } catch {}
            }
            reader.readAsText(file)
          })
          e.target.value = ''
        }}
      />
    </div>
  )
}

function MonsterModal({ monster, onSave, onClose, styles }) {
  const [data, setData] = useState(monster)
  const upd = (partial) => setData(prev => ({ ...prev, ...partial }))

  function addAction(field) {
    upd({ [field]: [...(data[field] || []), { name: '', desc: '' }] })
  }
  function updateAction(field, i, partial) {
    const arr = [...(data[field] || [])]
    arr[i] = { ...arr[i], ...partial }
    upd({ [field]: arr })
  }
  function removeAction(field, i) {
    upd({ [field]: (data[field] || []).filter((_, j) => j !== i) })
  }

  function calcMod(score) {
    const m = Math.floor(((parseInt(score) || 10) - 10) / 2)
    return `(${m >= 0 ? '+' : ''}${m})`
  }

  return (
    <div className={styles.monsterModal}>
      <div className={styles.mmInner}>
        <div className={styles.mmHead}>
          <span className={styles.mmTitle}>{data._eid ? 'Modifier' : 'Nouveau'} Monstre (Rencontre)</span>
          <div className={styles.mmHeadBtns}>
            <button className={styles.mmSave} onClick={() => onSave(data)}>💾 Sauvegarder</button>
            <button className={styles.mmClose} onClick={onClose}>✕</button>
          </div>
        </div>
        <div className={styles.mmBody}>
          <div className={`${styles.mmRow} ${styles.c2}`}>
            <div className={styles.mmField} style={{ gridColumn: '1/-1' }}>
              <label>Nom</label>
              <input type="text" placeholder="Gobelin" value={data.name || ''} onChange={e => upd({ name: e.target.value })} />
            </div>
            <div className={styles.mmField} style={{ gridColumn: '1/-1' }}>
              <label>Type &amp; taille</label>
              <input type="text" placeholder="Petite créature humanoïde, neutre mauvais" value={data.type || ''} onChange={e => upd({ type: e.target.value })} />
            </div>
          </div>
          <div className={`${styles.mmRow} ${styles.c4}`}>
            {[['Facteur de puissance', 'cr', '1/4'], ['XP', 'xp', '50'], ['Bonus maîtrise', 'prof', '+2'], ['Vitesse', 'speed', '9m']].map(([label, f, ph]) => (
              <div key={f} className={styles.mmField}>
                <label>{label}</label>
                <input type="text" placeholder={ph} value={data[f] || ''} onChange={e => upd({ [f]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className={`${styles.mmRow} ${styles.c3}`}>
            {[["Classe d'armure", 'ac', '10 (armure)'], ['Points de vie', 'hp', '7 (2d6)']].map(([label, f, ph]) => (
              <div key={f} className={styles.mmField}>
                <label>{label}</label>
                <input type="text" placeholder={ph} value={data[f] || ''} onChange={e => upd({ [f]: e.target.value })} />
              </div>
            ))}
            <div />
          </div>
          <hr className={styles.mmDivider} />
          <div className={`${styles.mmRow} ${styles.c6}`}>
            {['str','dex','con','int','wis','cha'].map(k => (
              <div key={k} className={styles.mmAbility}>
                <label>{k.toUpperCase()}</label>
                <input type="number" value={data[k] || 10} min="1" max="30"
                  onChange={e => upd({ [k]: parseInt(e.target.value) || 10 })} />
                <div className={styles.amod}>{calcMod(data[k])}</div>
              </div>
            ))}
          </div>
          <hr className={styles.mmDivider} />
          <div className={`${styles.mmRow} ${styles.c2}`}>
            {[
              ['Jets de sauvegarde', 'saves', 'Dex +4, Con +2'],
              ['Compétences', 'skills', 'Discrétion +6'],
              ['Immunités dégâts', 'dmg_immune', 'feu, poison'],
              ['Résistances dégâts', 'dmg_resist', 'contondant'],
              ['Vulnérabilités', 'dmg_vuln', 'feu'],
              ['Immunités conditions', 'cond_immune', 'charmé'],
              ['Sens', 'senses', 'vision dans le noir 18m'],
              ['Langues', 'languages', 'commun, gobelin'],
            ].map(([label, f, ph]) => (
              <div key={f} className={styles.mmField}>
                <label>{label}</label>
                <input type="text" placeholder={ph} value={data[f] || ''} onChange={e => upd({ [f]: e.target.value })} />
              </div>
            ))}
          </div>

          <ActionSection label="Traits" field="traits" data={data} onAdd={addAction} onUpdate={updateAction} onRemove={removeAction} styles={styles} />
          <ActionSection label="Actions" field="actions" data={data} onAdd={addAction} onUpdate={updateAction} onRemove={removeAction} styles={styles} />
          <ActionSection label="Actions légendaires" field="legendary_actions" data={data} onAdd={addAction} onUpdate={updateAction} onRemove={removeAction} styles={styles} />

          <div className={styles.mmField} style={{ marginTop: '0.6rem' }}>
            <label>Notes</label>
            <textarea value={data.notes || ''} onChange={e => upd({ notes: e.target.value })} placeholder="Notes diverses..." />
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionSection({ label, field, data, onAdd, onUpdate, onRemove, styles }) {
  return (
    <div className={styles.mmActionsArea}>
      <div className={styles.mmActionsHead}>
        <span>{label}</span>
        <button className={styles.mmActionsAdd} onClick={() => onAdd(field)}>+ Ajouter</button>
      </div>
      {(data[field] || []).map((item, i) => (
        <div key={i} className={styles.mmActionRow}>
          <input type="text" placeholder="Nom" value={item.name || ''} onChange={e => onUpdate(field, i, { name: e.target.value })} />
          <textarea placeholder="Description..." value={item.desc || ''} onChange={e => onUpdate(field, i, { desc: e.target.value })} />
          <button className={styles.mmActionDel} onClick={() => onRemove(field, i)}>×</button>
        </div>
      ))}
    </div>
  )
}
