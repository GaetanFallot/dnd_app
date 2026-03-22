import React, { useState } from 'react'

export default function InitiativeTracker({ styles }) {
  const [combatants, setCombatants] = useState([])
  const [currentTurnIdx, setCurrentTurnIdx] = useState(-1)
  const [roundNum, setRoundNum] = useState(1)
  const [nameInput, setNameInput] = useState('')
  const [initInput, setInitInput] = useState('')

  function addCombatant() {
    if (!nameInput.trim()) return
    const init = parseInt(initInput) || 0
    setCombatants(prev => [...prev, { id: Date.now() + Math.random(), name: nameInput.trim(), init }])
    setNameInput('')
    setInitInput('')
  }

  function removeCombatant(id) {
    setCombatants(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx < 0) return prev
      const next = prev.filter(c => c.id !== id)
      if (idx < currentTurnIdx) setCurrentTurnIdx(i => i - 1)
      else if (idx === currentTurnIdx) setCurrentTurnIdx(Math.max(0, next.length - 1 < currentTurnIdx ? next.length - 1 : currentTurnIdx))
      if (!next.length) setCurrentTurnIdx(-1)
      return next
    })
  }

  function sortInit() {
    setCombatants(prev => [...prev].sort((a, b) => b.init - a.init))
    setCurrentTurnIdx(combatants.length ? 0 : -1)
    setRoundNum(1)
  }

  function nextTurn() {
    if (!combatants.length) return
    setCurrentTurnIdx(prev => {
      const next = prev + 1
      if (next >= combatants.length) { setRoundNum(r => r + 1); return 0 }
      return next
    })
  }

  function prevTurn() {
    if (!combatants.length) return
    setCurrentTurnIdx(prev => {
      const next = prev - 1
      if (next < 0) { setRoundNum(r => Math.max(1, r - 1)); return combatants.length - 1 }
      return next
    })
  }

  function clearInit() {
    setCombatants([])
    setCurrentTurnIdx(-1)
    setRoundNum(1)
  }

  function handleKey(e) {
    if (e.key === 'Enter') addCombatant()
  }

  return (
    <div className={styles.tracker}>
      <div className={styles.sectionLabel}>⚔ Ordre d'initiative</div>
      <div className={styles.addRow}>
        <input
          type="text"
          placeholder="Nom"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <input
          type="number"
          placeholder="Init"
          value={initInput}
          onChange={e => setInitInput(e.target.value)}
          onKeyDown={handleKey}
          style={{ width: 55 }}
        />
        <button className={styles.addBtn} onClick={addCombatant}>＋</button>
      </div>

      <div className={styles.trackerControls}>
        <button className={styles.sortBtn} onClick={sortInit}>⇅ Trier</button>
        <button onClick={prevTurn}>◀ Préc.</button>
        <button onClick={nextTurn}>Suiv. ▶</button>
      </div>

      <div className={styles.turnRound}>
        Round <span>{roundNum}</span>
      </div>

      <div className={styles.turnList}>
        {combatants.map((c, i) => (
          <div
            key={c.id}
            className={`${styles.turnCard}${i === currentTurnIdx ? ' ' + styles.activeTurn : ''}`}
          >
            <span className={styles.turnDrag}>⠿</span>
            <span className={styles.turnInit}>{c.init}</span>
            <span className={styles.turnName}>{c.name}</span>
            <button className={styles.turnDel} onClick={() => removeCombatant(c.id)} title="Retirer">✕</button>
          </div>
        ))}
      </div>

      <button className={styles.clearBtn} onClick={clearInit}>✕ Vider l'initiative</button>
    </div>
  )
}
