import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react'

const InitiativeTracker = forwardRef(function InitiativeTracker({ styles }, ref) {
  const [combatants, setCombatants] = useState([])
  const [currentTurnIdx, setCurrentTurnIdx] = useState(-1)
  const [roundNum, setRoundNum] = useState(1)
  const [nameInput, setNameInput] = useState('')
  const [initInput, setInitInput] = useState('')
  const dragIdx = useRef(null)
  const listRef = useRef(null)

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
      setCurrentTurnIdx(cur => {
        if (!next.length) return -1
        if (idx < cur) return cur - 1
        if (idx === cur) return Math.min(cur, next.length - 1)
        return cur
      })
      return next
    })
  }

  function sortInit() {
    setCombatants(prev => {
      const sorted = [...prev].sort((a, b) => b.init - a.init)
      setCurrentTurnIdx(sorted.length ? 0 : -1)
      setRoundNum(1)
      return sorted
    })
  }

  function nextTurn() {
    setCombatants(prev => {
      if (!prev.length) return prev
      setCurrentTurnIdx(cur => {
        const next = cur + 1
        if (next >= prev.length) { setRoundNum(r => r + 1); return 0 }
        return next
      })
      return prev
    })
  }

  function prevTurn() {
    setCombatants(prev => {
      if (!prev.length) return prev
      setCurrentTurnIdx(cur => {
        const next = cur - 1
        if (next < 0) { setRoundNum(r => Math.max(1, r - 1)); return prev.length - 1 }
        return next
      })
      return prev
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

  useImperativeHandle(ref, () => ({
    addCombatant(name, init) {
      setCombatants(prev => [...prev, { id: Date.now() + Math.random(), name, init: init ?? 0 }])
    }
  }))

  // Drag-and-drop reordering
  function onDragStart(e, idx) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function onDrop(e, dropIdx) {
    e.preventDefault()
    const fromIdx = dragIdx.current
    if (fromIdx === null || fromIdx === dropIdx) { dragIdx.current = null; return }
    setCombatants(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(dropIdx, 0, moved)
      setCurrentTurnIdx(cur => {
        if (cur === fromIdx) return dropIdx
        if (cur > fromIdx && cur <= dropIdx) return cur - 1
        if (cur < fromIdx && cur >= dropIdx) return cur + 1
        return cur
      })
      return next
    })
    dragIdx.current = null
  }

  function scrollToActive() {
    if (!listRef.current) return
    const active = listRef.current.querySelector('.' + styles.activeTurn)
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
        <button onClick={prevTurn}>◀</button>
        <button onClick={() => { nextTurn(); setTimeout(scrollToActive, 50) }}>Suiv. ▶</button>
        <button onClick={() => { setCurrentTurnIdx(combatants.length ? 0 : -1); setRoundNum(1) }} title="Retour round 1">↺ R1</button>
      </div>

      <div className={styles.turnRound}>
        Round <span>{roundNum}</span>
      </div>

      <div className={styles.turnList} ref={listRef}>
        {combatants.map((c, i) => (
          <div
            key={c.id}
            className={`${styles.turnCard}${i === currentTurnIdx ? ' ' + styles.activeTurn : ''}`}
            draggable
            onDragStart={e => onDragStart(e, i)}
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, i)}
          >
            <span className={styles.turnDrag} style={{ cursor: 'grab' }} title="Réordonner">⠿</span>
            <span className={styles.turnInit}>{c.init}</span>
            <span className={styles.turnName}>{c.name}</span>
            <button className={styles.turnDel} onClick={() => removeCombatant(c.id)} title="Retirer">✕</button>
          </div>
        ))}
      </div>

      <button className={styles.clearBtn} onClick={clearInit}>✕ Vider l'initiative</button>
    </div>
  )
})

export default InitiativeTracker
