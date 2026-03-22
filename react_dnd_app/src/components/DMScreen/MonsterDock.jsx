import React, { useState } from 'react'
import { fsAdd, fsSet, fsDelete } from '../../hooks/useFirestore'
import { mod, modStr } from '../../data/dnd5e'

function crStr(v) {
  if (v === 0.125) return '1/8'
  if (v === 0.25) return '1/4'
  if (v === 0.5) return '1/2'
  return String(v ?? 0)
}

export default function MonsterDock({ firestoreMonsters, user, onOpenBrowser, styles }) {
  const [dockOpen, setDockOpen] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMonster, setEditingMonster] = useState(null)

  const monsters = firestoreMonsters || []

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
  }

  async function saveMonster(data) {
    if (!user) return
    if (data.firestoreId) {
      await fsSet(`users/${user.uid}/monsters`, data.firestoreId, data)
    } else {
      await fsAdd(`users/${user.uid}/monsters`, data)
    }
    setModalOpen(false)
    setEditingMonster(null)
  }

  async function deleteMonster(id) {
    if (!user) return
    await fsDelete(`users/${user.uid}/monsters`, id)
    if (expandedId === id) setExpandedId(null)
  }

  function editMonster(m) {
    setEditingMonster({ ...m, firestoreId: m.id })
    setModalOpen(true)
  }

  function importJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.multiple = true
    input.onchange = e => {
      const files = [...e.target.files]
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = async ev => {
          try {
            const data = JSON.parse(ev.target.result)
            if (user) await fsAdd(`users/${user.uid}/monsters`, data)
          } catch {}
        }
        reader.readAsText(file)
      })
    }
    input.click()
  }

  function exportMonster(m) {
    const blob = new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = (m.name || 'monstre').toLowerCase().replace(/\s+/g, '-') + '.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className={styles.monsterDock}>
      <div className={styles.dockHeader} onClick={() => setDockOpen(!dockOpen)}>
        <span className={styles.dockTitle}>
          🐉 Fiches Monstres
          <span className={styles.dockCount}>{monsters.length || ''}</span>
        </span>
        <div className={styles.dockActions} onClick={e => e.stopPropagation()}>
          <button className={styles.dockBtn} style={{ background: 'rgba(91,141,217,.15)', borderColor: '#5b8dd9', color: '#5b8dd9' }} onClick={onOpenBrowser}>
            📖 Bibliothèque
          </button>
          <button className={styles.dockBtn} onClick={newMonster}>＋ Nouveau</button>
          <button className={styles.dockBtn} onClick={importJSON}>📥 Importer</button>
        </div>
        <span className={styles.dockToggle} style={{ transform: dockOpen ? 'none' : 'rotate(180deg)' }}>▲</span>
      </div>

      {dockOpen && (
        <div className={styles.dockBody}>
          <div className={styles.monsterList}>
            {monsters.map(m => (
              <MonsterChip
                key={m.id}
                monster={m}
                isExpanded={expandedId === m.id}
                onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                onEdit={() => editMonster(m)}
                onDelete={() => deleteMonster(m.id)}
                onExport={() => exportMonster(m)}
                styles={styles}
              />
            ))}
            {monsters.length === 0 && (
              <div style={{ color: '#7a6a55', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem', textAlign: 'center' }}>
                Aucun monstre. Ajoutez depuis la bibliothèque ou créez-en un.
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
    </div>
  )
}

function MonsterChip({ monster, isExpanded, onToggle, onEdit, onDelete, onExport, styles }) {
  const abilities = ['str','dex','con','int','wis','cha']
  return (
    <div className={styles.monsterChip}>
      <div className={styles.chipHead} onClick={onToggle}>
        <span className={styles.chipName}>{monster.name || 'Sans nom'}</span>
        <span className={styles.chipCr}>FP {crStr(parseFloat(monster.cr ?? monster.challenge_rating) || 0)}</span>
        <div className={styles.chipActions}>
          <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); onEdit() }} title="Modifier">✎</button>
          <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); onExport() }} title="Exporter">📤</button>
          <button className={styles.chipBtn} onClick={e => { e.stopPropagation(); onDelete() }} title="Supprimer" style={{ color: '#c44a1a' }}>✕</button>
        </div>
      </div>
      {isExpanded && (
        <div className={`${styles.chipBody} ${styles.open}`}>
          {monster.type && <div style={{ fontSize: '0.75rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.4rem' }}>{monster.type}</div>}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            {monster.ac && <span style={{ fontSize: '0.75rem' }}>CA : <strong>{monster.ac}</strong></span>}
            {monster.hp && <span style={{ fontSize: '0.75rem' }}>PV : <strong>{monster.hp}</strong></span>}
            {monster.speed && <span style={{ fontSize: '0.75rem' }}>Vit : <strong>{monster.speed}</strong></span>}
          </div>
          <div className={styles.monsterStats}>
            {abilities.map(k => {
              const score = parseInt(monster[k] || monster[`ability_${k}`]) || 10
              const m = Math.floor((score - 10) / 2)
              return (
                <div key={k} className={styles.monsterStatBox}>
                  <div className={styles.monsterStatLabel}>{k.toUpperCase()}</div>
                  <div className={styles.monsterStatVal}>{score}</div>
                  <div className={styles.monsterStatMod}>{m >= 0 ? '+' + m : '' + m}</div>
                </div>
              )
            })}
          </div>
          {(monster.actions || monster.traits) && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
              {(monster.traits || []).slice(0, 3).map((t, i) => (
                <div key={i} style={{ marginBottom: '0.3rem' }}>
                  <strong>{t.name}</strong>{t.desc ? ': ' + t.desc.slice(0, 80) + (t.desc.length > 80 ? '…' : '') : ''}
                </div>
              ))}
              {(monster.actions || []).slice(0, 3).map((a, i) => (
                <div key={i} style={{ marginBottom: '0.3rem' }}>
                  <em style={{ fontWeight: 700 }}>{a.name}</em>{a.desc ? ': ' + a.desc.slice(0, 80) + (a.desc.length > 80 ? '…' : '') : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
          <span className={styles.mmTitle}>{data.firestoreId ? 'Modifier' : 'Nouveau'} Monstre</span>
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
              <label>Type & taille</label>
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

          {/* Traits */}
          <ActionSection label="Traits" field="traits" data={data} onAdd={addAction} onUpdate={updateAction} onRemove={removeAction} styles={styles} />
          {/* Actions */}
          <ActionSection label="Actions" field="actions" data={data} onAdd={addAction} onUpdate={updateAction} onRemove={removeAction} styles={styles} />
          {/* Legendary */}
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
