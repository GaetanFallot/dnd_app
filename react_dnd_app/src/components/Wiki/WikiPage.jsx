import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCollection, fsAdd, fsSet, fsDelete } from '../../hooks/useFirestore'
import styles from '../../styles/wiki.module.css'
import { compressImage } from '../../utils/compressImage'

// ── Constants ──────────────────────────────────────────────────
const TYPE_ICONS = { note: '📝', npc: '👤', lieu: '📍', session: '🗓️' }
const TYPE_LABELS = { note: 'Note', npc: 'PNJ', lieu: 'Lieu', session: 'Session' }
const ALL_TYPES = ['tous', 'note', 'npc', 'lieu', 'session']

// ── Markdown renderer ──────────────────────────────────────────
function renderMarkdown(text, notes, onOpenNote) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let key = 0

  function renderInline(line) {
    // Split on [[wikilinks]], **bold**, *italic*
    const parts = []
    let remaining = line
    const wikiRe = /\[\[([^\]]+)\]\]/g
    const boldRe = /\*\*([^*]+)\*\*/g
    const italicRe = /\*([^*]+)\*/g

    // Process wikilinks first
    let chunks = []
    let lastIdx = 0
    let m
    wikiRe.lastIndex = 0
    while ((m = wikiRe.exec(remaining)) !== null) {
      if (m.index > lastIdx) chunks.push({ type: 'text', val: remaining.slice(lastIdx, m.index) })
      const title = m[1]
      const exists = notes.some(n => n.title.toLowerCase() === title.toLowerCase())
      chunks.push({ type: 'wiki', val: title, exists })
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < remaining.length) chunks.push({ type: 'text', val: remaining.slice(lastIdx) })

    // Now process bold/italic within text chunks
    return chunks.map((chunk, ci) => {
      if (chunk.type === 'wiki') {
        const note = notes.find(n => n.title.toLowerCase() === chunk.val.toLowerCase())
        return (
          <span
            key={ci}
            className={chunk.exists ? styles.wikilink : styles.wikilinkBroken}
            onClick={() => note && onOpenNote(note.id)}
            title={chunk.exists ? `Ouvrir: ${chunk.val}` : `Note introuvable: ${chunk.val}`}
          >
            {chunk.val}
          </span>
        )
      }
      // Process bold then italic in text
      const inlineParts = []
      let txt = chunk.val
      let tIdx = 0
      const inlineRe = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g
      let tm
      inlineRe.lastIndex = 0
      while ((tm = inlineRe.exec(txt)) !== null) {
        if (tm.index > tIdx) inlineParts.push(<span key={tIdx}>{txt.slice(tIdx, tm.index)}</span>)
        if (tm[0].startsWith('**')) {
          inlineParts.push(<strong key={tm.index}>{tm[2]}</strong>)
        } else {
          inlineParts.push(<em key={tm.index}>{tm[3]}</em>)
        }
        tIdx = tm.index + tm[0].length
      }
      if (tIdx < txt.length) inlineParts.push(<span key={tIdx}>{txt.slice(tIdx)}</span>)
      return <span key={ci}>{inlineParts.length > 0 ? inlineParts : chunk.val}</span>
    })
  }

  let inList = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const h1 = line.match(/^# (.+)/)
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)
    const li = line.match(/^[-*] (.+)/)

    if (!li && inList) {
      inList = false
    }

    if (h1) {
      elements.push(<h1 key={key++}>{renderInline(h1[1])}</h1>)
    } else if (h2) {
      elements.push(<h2 key={key++}>{renderInline(h2[1])}</h2>)
    } else if (h3) {
      elements.push(<h3 key={key++}>{renderInline(h3[1])}</h3>)
    } else if (li) {
      if (!inList) {
        inList = true
        // collect all consecutive list items
        const listItems = []
        while (i < lines.length) {
          const lm = lines[i].match(/^[-*] (.+)/)
          if (!lm) { i--; break }
          listItems.push(<li key={i}>{renderInline(lm[1])}</li>)
          i++
        }
        elements.push(<ul key={key++}>{listItems}</ul>)
        inList = false
      }
    } else if (line.trim() === '') {
      elements.push(<br key={key++} />)
    } else {
      elements.push(<p key={key++}>{renderInline(line)}</p>)
    }
  }
  return elements
}

// ── Auto-save hook ─────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// ── Map second screen ──────────────────────────────────────────
function buildMapScreenHTML(map) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${map.name || 'Carte'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
    #mapWrap { position: fixed; inset: 0; }
    #mapImg { width: 100%; height: 100%; object-fit: contain; display: block; }
    .pin {
      position: absolute;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: #d4a843;
      border: 2px solid #fff;
      transform: translate(-50%, -50%);
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.6);
      transition: transform 0.12s;
    }
    .pin:hover { transform: translate(-50%,-50%) scale(1.4); background: #f0c040; }
    .pin-label {
      position: absolute;
      top: -26px; left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      color: #d8c8a8;
      font-size: 12px;
      font-family: Georgia, serif;
      padding: 2px 8px;
      border-radius: 3px;
      white-space: nowrap;
      display: none;
      pointer-events: none;
    }
    .pin:hover .pin-label { display: block; }
    #mapName {
      position: fixed;
      top: 12px; left: 50%;
      transform: translateX(-50%);
      font-family: Georgia, serif;
      font-size: 1.2rem;
      color: #d4a843;
      background: rgba(0,0,0,0.6);
      padding: 4px 16px;
      border-radius: 4px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="mapWrap">
    <img id="mapImg" src="${map.src}" />
    ${(map.pins || []).map(p => `
      <div class="pin" style="left:${p.x}%;top:${p.y}%">
        <span class="pin-label">${p.label || ''}</span>
      </div>
    `).join('')}
    <div id="mapName">${map.name || ''}</div>
  </div>
</body>
</html>`
}

function openMapOnSecondScreen(map) {
  const html = buildMapScreenHTML(map)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, 'DnDMap', 'width=1280,height=720')
  if (!win) { alert('Autorisez les popups dans votre navigateur !'); return }
  win.onload = () => URL.revokeObjectURL(url)
}

// ── Main component ─────────────────────────────────────────────
export default function WikiPage() {
  const { docs: notes, refresh: refreshNotes } = useCollection('local/data/grimoire')
  const { docs: maps, refresh: refreshMaps } = useCollection('local/data/wiki_maps')

  // Selection state
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [activeMapId, setActiveMapId] = useState(null)
  const [viewMode, setViewMode] = useState('note') // 'note' | 'map'

  // Sidebar state
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')

  // Editor state
  const [title, setTitle] = useState('')
  const [type, setType] = useState('note')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [npcPortrait, setNpcPortrait] = useState('')
  const [npcAppearance, setNpcAppearance] = useState('')
  const [npcPersonality, setNpcPersonality] = useState('')
  const [npcSecret, setNpcSecret] = useState('')
  const [secretVisible, setSecretVisible] = useState(false)
  const [lieuDescription, setLieuDescription] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [sessionEvents, setSessionEvents] = useState('')
  const [saved, setSaved] = useState(false)

  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState({ show: false })
  const [autocompleteIndex, setAutocompleteIndex] = useState(0)
  const textareaRef = useRef(null)
  const autocompleteRef = useRef(null)

  // Map / pin state
  const [pinDialog, setPinDialog] = useState(null) // { x, y, mapId } or { pin, mapId, editing: true }
  const [pinLabel, setPinLabel] = useState('')
  const [pinNoteId, setPinNoteId] = useState('')
  const mapAreaRef = useRef(null)

  // Load note into editor
  useEffect(() => {
    if (!activeNoteId) return
    const note = notes.find(n => n.id === activeNoteId)
    if (!note) return
    setTitle(note.title || '')
    setType(note.type || 'note')
    setContent(note.content || '')
    setTags(note.tags ? note.tags.join(', ') : '')
    setNpcPortrait(note.npc_portrait || '')
    setNpcAppearance(note.npc_appearance || '')
    setNpcPersonality(note.npc_personality || '')
    setNpcSecret(note.npc_secret || '')
    setLieuDescription(note.lieu_description || '')
    setSessionDate(note.session_date || '')
    setSessionEvents(note.session_events || '')
    setSecretVisible(false)
    setSaved(false)
  }, [activeNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save
  const savePayload = useDebounce({
    title, type, content, tags,
    npcPortrait, npcAppearance, npcPersonality, npcSecret,
    lieuDescription, sessionDate, sessionEvents
  }, 400)

  useEffect(() => {
    if (!activeNoteId) return
    const note = notes.find(n => n.id === activeNoteId)
    if (!note) return

    const tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    fsSet('local/data/grimoire', activeNoteId, {
      title: savePayload.title,
      type: savePayload.type,
      content: savePayload.content,
      tags: tagsArr,
      npc_portrait: savePayload.npcPortrait,
      npc_appearance: savePayload.npcAppearance,
      npc_personality: savePayload.npcPersonality,
      npc_secret: savePayload.npcSecret,
      lieu_description: savePayload.lieuDescription,
      session_date: savePayload.sessionDate,
      session_events: savePayload.sessionEvents,
    }).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      refreshNotes()
    })
  }, [savePayload]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create new note
  async function handleNewNote() {
        const ref = await fsAdd('local/data/grimoire', {
      title: 'Nouvelle note',
      type: 'note',
      content: '',
      tags: [],
    })
    setActiveNoteId(ref.id)
    setActiveMapId(null)
    setViewMode('note')
  }

  // Delete note
  async function handleDeleteNote() {
    if (!activeNoteId) return
    if (!confirm('Supprimer cette note ?')) return
    await fsDelete('local/data/grimoire', activeNoteId)
    setActiveNoteId(null)
    setViewMode('note')
  }

  // Open note by id
  function openNote(id) {
    setActiveNoteId(id)
    setActiveMapId(null)
    setViewMode('note')
  }

  // Filtered note list
  const filteredNotes = notes.filter(n => {
    const matchSearch = n.title?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'tous' || n.type === typeFilter
    return matchSearch && matchType
  })

  // Backlinks: notes that contain [[Current Note Title]]
  const activeNote = notes.find(n => n.id === activeNoteId)
  const backlinks = activeNote
    ? notes.filter(n => n.id !== activeNoteId && n.content?.includes(`[[${activeNote.title}]]`))
    : []

  // [[wikilink]] autocomplete
  function handleContentChange(e) {
    const val = e.target.value
    setContent(val)

    const cursor = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(/\[\[([^\]]*?)$/)
    if (match) {
      const query = match[1].toLowerCase()
      const suggestions = notes.filter(n => n.title.toLowerCase().includes(query)).slice(0, 8)
      setAutocomplete({ show: true, query, suggestions, cursor, matchStart: cursor - match[1].length - 2 })
      setAutocompleteIndex(0)
    } else {
      setAutocomplete({ show: false })
    }
  }

  function insertWikiLink(noteTitle) {
    if (!textareaRef.current) return
    const val = content
    const cursor = autocomplete.cursor
    const matchStart = autocomplete.matchStart
    const before = val.slice(0, matchStart)
    const after = val.slice(cursor)
    const newVal = before + `[[${noteTitle}]]` + after
    setContent(newVal)
    setAutocomplete({ show: false })
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = matchStart + noteTitle.length + 4
        textareaRef.current.setSelectionRange(newPos, newPos)
        textareaRef.current.focus()
      }
    }, 0)
  }

  function handleTextareaKeyDown(e) {
    if (!autocomplete.show) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAutocompleteIndex(i => Math.min(i + 1, autocomplete.suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAutocompleteIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const sel = autocomplete.suggestions[autocompleteIndex]
      if (sel) insertWikiLink(sel.title)
    } else if (e.key === 'Escape') {
      setAutocomplete({ show: false })
    }
  }

  // NPC portrait drag-drop / click
  const portraitInputRef = useRef(null)

  async function handlePortraitDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const compressed = await compressImage(file, 300, 300, 0.85)
    setNpcPortrait(compressed)
  }

  async function handlePortraitFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImage(file, 300, 300, 0.85)
    setNpcPortrait(compressed)
  }

  // ── Map functions ──────────────────────────────────────────
  const activeMap = maps.find(m => m.id === activeMapId)

  async function handleMapUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImage(file, 2048, 2048, 0.85)
    const ref = await fsAdd('local/data/wiki_maps', {
      name: file.name.replace(/\.[^.]+$/, ''),
      src: compressed,
      pins: [],
    })
    setActiveMapId(ref.id)
    setActiveNoteId(null)
    setViewMode('map')
  }

  function openMap(id) {
    setActiveMapId(id)
    setActiveNoteId(null)
    setViewMode('map')
  }

  function handleMapClick(e) {
    if (!activeMap || pinDialog) return
    const rect = mapAreaRef.current.getBoundingClientRect()
    // Find where the image actually renders (object-fit: contain)
    const imgEl = mapAreaRef.current.querySelector('img')
    if (!imgEl) return
    const imgNaturalW = imgEl.naturalWidth || 1
    const imgNaturalH = imgEl.naturalHeight || 1
    const containerW = rect.width
    const containerH = rect.height
    const scale = Math.min(containerW / imgNaturalW, containerH / imgNaturalH)
    const renderedW = imgNaturalW * scale
    const renderedH = imgNaturalH * scale
    const offsetX = (containerW - renderedW) / 2
    const offsetY = (containerH - renderedH) / 2
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    // Check click is inside image
    if (clickX < offsetX || clickX > offsetX + renderedW || clickY < offsetY || clickY > offsetY + renderedH) return
    const xPct = ((clickX - offsetX) / renderedW) * 100
    const yPct = ((clickY - offsetY) / renderedH) * 100
    setPinLabel('')
    setPinNoteId('')
    setPinDialog({ x: xPct, y: yPct, mapId: activeMap.id, clientX: e.clientX, clientY: e.clientY })
  }

  function handlePinClick(e, pin) {
    e.stopPropagation()
    setPinLabel(pin.label || '')
    setPinNoteId(pin.noteId || '')
    setPinDialog({ editing: true, pin, mapId: activeMap.id, clientX: e.clientX, clientY: e.clientY })
  }

  async function savePinDialog() {
    if (!activeMap) return
    const pins = [...(activeMap.pins || [])]
    if (pinDialog.editing) {
      const idx = pins.findIndex(p => p.id === pinDialog.pin.id)
      if (idx >= 0) pins[idx] = { ...pins[idx], label: pinLabel, noteId: pinNoteId }
    } else {
      pins.push({ id: Date.now().toString(), x: pinDialog.x, y: pinDialog.y, label: pinLabel, noteId: pinNoteId })
    }
    await fsSet('local/data/wiki_maps', activeMap.id, { ...activeMap, pins })
    setPinDialog(null)
  }

  async function deletePinDialog() {
    if (!activeMap || !pinDialog.editing) return
    const pins = (activeMap.pins || []).filter(p => p.id !== pinDialog.pin.id)
    await fsSet('local/data/wiki_maps', activeMap.id, { ...activeMap, pins })
    setPinDialog(null)
  }

  const mapInputRef = useRef(null)

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className={styles.wikiLayout}>
      {/* ── LEFT SIDEBAR ── */}
      <div className={styles.wikiSidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>⚔ Wiki</div>
        </div>
        <div className={styles.sidebarScroll}>
          {/* Notes section */}
          <div className={styles.sectionLabel}>Notes</div>
          <input
            className={styles.searchInput}
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.typeFilters}>
            {ALL_TYPES.map(t => (
              <button
                key={t}
                className={`${styles.filterTab} ${typeFilter === t ? styles.filterTabActive : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'tous' ? 'Tous' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <button className={styles.newNoteBtn} style={{ flex: 1 }} onClick={handleNewNote}>＋ Nouvelle note</button>
            <button
              className={styles.newNoteBtn}
              style={{ flex: 'none', background: viewMode === 'graph' ? 'rgba(212,168,67,0.2)' : undefined, borderColor: viewMode === 'graph' ? '#d4a843' : undefined }}
              onClick={() => setViewMode(viewMode === 'graph' ? 'note' : 'graph')}
              title="Vue graphe"
            >🕸️</button>
          </div>
          <ul className={styles.noteList}>
            {filteredNotes.map(note => (
              <li
                key={note.id}
                className={`${styles.noteItem} ${activeNoteId === note.id && viewMode === 'note' ? styles.noteItemActive : ''}`}
                onClick={() => openNote(note.id)}
              >
                <span className={styles.noteTypeIcon}>{TYPE_ICONS[note.type] || '📝'}</span>
                <span className={styles.noteItemTitle}>{note.title || 'Sans titre'}</span>
                <span className={styles.noteTypeBadge}>{TYPE_LABELS[note.type] || 'Note'}</span>
              </li>
            ))}
            {filteredNotes.length === 0 && (
              <li className={styles.emptyMsg}>Aucune note</li>
            )}
          </ul>

          {/* Maps section */}
          <div className={styles.sectionLabel}>Cartes</div>
          <ul className={styles.mapList}>
            {maps.map(m => (
              <li
                key={m.id}
                className={`${styles.mapItem} ${activeMapId === m.id && viewMode === 'map' ? styles.mapItemActive : ''}`}
                onClick={() => openMap(m.id)}
              >
                🗺 {m.name || 'Carte sans nom'}
              </li>
            ))}
          </ul>
          <button className={styles.newMapBtn} onClick={() => mapInputRef.current?.click()}>
            ＋ Carte
          </button>
          <input
            ref={mapInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleMapUpload}
          />
        </div>
      </div>

      {/* ── CENTER ── */}
      <div className={styles.wikiCenter}>
        {viewMode === 'note' && activeNoteId && (
          <NoteEditor
            styles={styles}
            title={title} setTitle={setTitle}
            type={type} setType={setType}
            content={content}
            tags={tags} setTags={setTags}
            npcPortrait={npcPortrait}
            npcAppearance={npcAppearance} setNpcAppearance={setNpcAppearance}
            npcPersonality={npcPersonality} setNpcPersonality={setNpcPersonality}
            npcSecret={npcSecret} setNpcSecret={setNpcSecret}
            secretVisible={secretVisible} setSecretVisible={setSecretVisible}
            lieuDescription={lieuDescription} setLieuDescription={setLieuDescription}
            sessionDate={sessionDate} setSessionDate={setSessionDate}
            sessionEvents={sessionEvents} setSessionEvents={setSessionEvents}
            saved={saved}
            onDelete={handleDeleteNote}
            handleContentChange={handleContentChange}
            handleTextareaKeyDown={handleTextareaKeyDown}
            autocomplete={autocomplete}
            autocompleteIndex={autocompleteIndex}
            insertWikiLink={insertWikiLink}
            textareaRef={textareaRef}
            autocompleteRef={autocompleteRef}
            notes={notes}
            onOpenNote={openNote}
            portraitInputRef={portraitInputRef}
            handlePortraitDrop={handlePortraitDrop}
            handlePortraitFile={handlePortraitFile}
            activeNote={activeNote}
          />
        )}
        {viewMode === 'graph' && (
          <GraphView notes={notes} onOpenNote={openNote} />
        )}
        {viewMode === 'map' && activeMapId && activeMap && (
          <MapView
            styles={styles}
            map={activeMap}
            mapAreaRef={mapAreaRef}
            handleMapClick={handleMapClick}
            handlePinClick={handlePinClick}
            pinDialog={pinDialog}
            setPinDialog={setPinDialog}
            pinLabel={pinLabel} setPinLabel={setPinLabel}
            pinNoteId={pinNoteId} setPinNoteId={setPinNoteId}
            savePinDialog={savePinDialog}
            deletePinDialog={deletePinDialog}
            notes={notes}
            openNote={openNote}
            openMapOnSecondScreen={openMapOnSecondScreen}
          />
        )}
        {!activeNoteId && !activeMapId && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📖</div>
            <div className={styles.emptyStateText}>Sélectionnez une note ou une carte</div>
          </div>
        )}
        {viewMode === 'note' && !activeNoteId && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📖</div>
            <div className={styles.emptyStateText}>Sélectionnez ou créez une note</div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      {viewMode === 'note' && activeNoteId && (
        <div className={styles.wikiRight}>
          <div className={styles.rightHeader}>
            <div className={styles.rightTitle}>Backlinks</div>
          </div>
          <div className={styles.rightScroll}>
            {activeNoteId && backlinks.length === 0 && (
              <div className={styles.emptyMsg}>Aucun lien entrant</div>
            )}
            {backlinks.map(n => (
              <div
                key={n.id}
                className={styles.backlinkItem}
                onClick={() => openNote(n.id)}
              >
                <span>{TYPE_ICONS[n.type] || '📝'}</span>
                <span>{n.title || 'Sans titre'}</span>
              </div>
            ))}
            {activeNoteId && (
              <>
                <div className={styles.sectionLabel} style={{ marginTop: '1rem' }}>Liens sortants</div>
                {activeNote && (() => {
                  const outLinks = []
                  const re = /\[\[([^\]]+)\]\]/g
                  let m
                  while ((m = re.exec(activeNote.content || '')) !== null) {
                    const linked = notes.find(n => n.title.toLowerCase() === m[1].toLowerCase())
                    if (linked && !outLinks.find(l => l.id === linked.id)) outLinks.push(linked)
                  }
                  if (outLinks.length === 0) return <div className={styles.emptyMsg}>Aucun lien sortant</div>
                  return outLinks.map(n => (
                    <div
                      key={n.id}
                      className={styles.backlinkItem}
                      onClick={() => openNote(n.id)}
                    >
                      <span>{TYPE_ICONS[n.type] || '📝'}</span>
                      <span>{n.title || 'Sans titre'}</span>
                    </div>
                  ))
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── NoteEditor sub-component ────────────────────────────────────
function NoteEditor({
  styles, title, setTitle, type, setType, content, tags, setTags,
  npcPortrait, npcAppearance, setNpcAppearance, npcPersonality, setNpcPersonality,
  npcSecret, setNpcSecret, secretVisible, setSecretVisible,
  lieuDescription, setLieuDescription, sessionDate, setSessionDate,
  sessionEvents, setSessionEvents, saved, onDelete,
  handleContentChange, handleTextareaKeyDown,
  autocomplete, autocompleteIndex, insertWikiLink,
  textareaRef, autocompleteRef,
  notes, onOpenNote, portraitInputRef, handlePortraitDrop, handlePortraitFile,
  activeNote
}) {
  return (
    <>
      {/* Toolbar */}
      <div className={styles.editorToolbar}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titre de la note..."
        />
        <select className={styles.typeSelect} value={type} onChange={e => setType(e.target.value)}>
          <option value="note">📝 Note</option>
          <option value="npc">👤 PNJ</option>
          <option value="lieu">📍 Lieu</option>
          <option value="session">🗓️ Session</option>
        </select>
        <input
          className={styles.tagsInput}
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="Tags (virgule...)"
        />
        <button className={styles.deleteBtn} onClick={onDelete}>🗑 Supprimer</button>
      </div>

      {/* Split editor */}
      <div className={styles.editorSplit}>
        {/* Edit pane */}
        <div className={styles.editorPane}>
          <textarea
            ref={textareaRef}
            className={styles.editorTextarea}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={'Rédigez en markdown...\n\nUtilisez [[Titre]] pour créer des liens vers d\'autres notes.\n\n# Titre\n## Sous-titre\n**gras** *italique*\n- liste'}
          />
          {/* Autocomplete dropdown */}
          {autocomplete.show && autocomplete.suggestions.length > 0 && (
            <div ref={autocompleteRef} className={styles.autocompleteDropdown} style={{ bottom: '8px', left: '12px' }}>
              {autocomplete.suggestions.map((n, i) => (
                <div
                  key={n.id}
                  className={`${styles.autocompleteItem} ${i === autocompleteIndex ? styles.autocompleteItemActive : ''}`}
                  onMouseDown={e => { e.preventDefault(); insertWikiLink(n.title) }}
                >
                  <span>{TYPE_ICONS[n.type] || '📝'}</span>
                  {n.title}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview pane */}
        <div className={styles.previewPane}>
          {renderMarkdown(content, notes, onOpenNote)}
          {!content && (
            <span style={{ color: 'var(--ink-dim)', fontStyle: 'italic' }}>
              L'aperçu apparaîtra ici...
            </span>
          )}
        </div>
      </div>

      {/* Extra fields by type */}
      {type === 'npc' && (
        <div className={styles.extraFields}>
          <div className={styles.npcExtraRow}>
            {/* Portrait */}
            <div>
              <span className={styles.extraFieldLabel}>Portrait</span>
              <div
                className={styles.npcPortraitZone}
                onClick={() => portraitInputRef.current?.click()}
                onDrop={handlePortraitDrop}
                onDragOver={e => e.preventDefault()}
              >
                {npcPortrait
                  ? <img src={npcPortrait} alt="portrait" className={styles.npcPortraitImg} />
                  : <span className={styles.npcPortraitPlaceholder}>👤</span>
                }
              </div>
              <input
                ref={portraitInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePortraitFile}
              />
            </div>
            <div className={styles.npcExtraFields}>
              <div>
                <span className={styles.extraFieldLabel}>Apparence</span>
                <textarea
                  className={styles.extraFieldTextarea}
                  value={npcAppearance}
                  onChange={e => setNpcAppearance(e.target.value)}
                  placeholder="Description physique..."
                />
              </div>
              <div>
                <span className={styles.extraFieldLabel}>Personnalité</span>
                <textarea
                  className={styles.extraFieldTextarea}
                  value={npcPersonality}
                  onChange={e => setNpcPersonality(e.target.value)}
                  placeholder="Traits de caractère..."
                />
              </div>
            </div>
          </div>
          <div>
            <span className={styles.extraFieldLabel}>
              Secret
              <button className={styles.secretToggle} onClick={() => setSecretVisible(v => !v)}>
                {secretVisible ? 'Cacher' : 'Révéler'}
              </button>
            </span>
            {secretVisible && (
              <textarea
                className={`${styles.extraFieldTextarea} ${styles.npcSecret}`}
                value={npcSecret}
                onChange={e => setNpcSecret(e.target.value)}
                placeholder="Secret du PNJ..."
              />
            )}
          </div>
        </div>
      )}

      {type === 'lieu' && (
        <div className={styles.extraFields}>
          <div>
            <span className={styles.extraFieldLabel}>Description du lieu</span>
            <textarea
              className={styles.extraFieldTextarea}
              value={lieuDescription}
              onChange={e => setLieuDescription(e.target.value)}
              placeholder="Décrivez ce lieu..."
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>
      )}

      {type === 'session' && (
        <div className={styles.extraFields}>
          <div>
            <span className={styles.extraFieldLabel}>Date de session</span>
            <input
              type="date"
              className={styles.extraFieldTextarea}
              style={{ minHeight: 'auto', padding: '0.3rem 0.5rem' }}
              value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
            />
          </div>
          <div>
            <span className={styles.extraFieldLabel}>Événements clés</span>
            <textarea
              className={styles.extraFieldTextarea}
              value={sessionEvents}
              onChange={e => setSessionEvents(e.target.value)}
              placeholder="Ce qui s'est passé..."
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>
      )}
    </>
  )
}

// ── GraphView sub-component ─────────────────────────────────────
const TYPE_COLORS = { note: '#d4a843', npc: '#5b8dd9', lieu: '#5db85c', session: '#e06060' }
const NODE_RADIUS = 12

function GraphView({ notes, onOpenNote }) {
  const canvasRef = useRef(null)
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const notesRef = useRef(notes)          // ref so the loop reads latest notes without restarting
  const onOpenNoteRef = useRef(onOpenNote)
  const frameRef = useRef(null)
  const transformRef = useRef({ x: 0, y: 0, scale: 1, initialized: false })
  const dragRef = useRef(null)

  // Keep refs in sync — no loop restart
  useEffect(() => { notesRef.current = notes }, [notes])
  useEffect(() => { onOpenNoteRef.current = onOpenNote }, [onOpenNote])

  // Build edges from [[wikilinks]]
  useEffect(() => {
    const edges = []
    notes.forEach((note, i) => {
      const re = /\[\[([^\]]+)\]\]/g
      let m
      while ((m = re.exec(note.content || '')) !== null) {
        const j = notes.findIndex(n => n.title && n.title.toLowerCase() === m[1].toLowerCase())
        if (j >= 0 && j !== i && !edges.find(e => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
          edges.push({ a: i, b: j })
        }
      }
    })
    edgesRef.current = edges
  }, [notes])

  // Sync nodes array when notes change
  useEffect(() => {
    const canvas = canvasRef.current
    const W = canvas ? canvas.offsetWidth || 800 : 800
    const H = canvas ? canvas.offsetHeight || 600 : 600
    nodesRef.current = notes.map((n) => {
      const existing = nodesRef.current.find(nd => nd.id === n.id)
      if (existing) return existing
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * 180 + 60
      return { id: n.id, x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r, vx: 0, vy: 0 }
    })
  }, [notes])

  // Simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h  // only reset when size actually changes
      }
      if (!transformRef.current.initialized && w > 0) {
        transformRef.current = { x: w / 2, y: h / 2, scale: 1, initialized: true }
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function simulate() {
      const nds = nodesRef.current
      const edges = edgesRef.current
      nds.forEach(n => { n.fx = 0; n.fy = 0 })

      // Repulsion
      for (let i = 0; i < nds.length; i++) {
        for (let j = i + 1; j < nds.length; j++) {
          const dx = nds[j].x - nds[i].x || 0.1
          const dy = nds[j].y - nds[i].y || 0.1
          const dist2 = dx * dx + dy * dy
          const force = 7000 / dist2
          const dist = Math.sqrt(dist2)
          nds[i].fx -= (dx / dist) * force; nds[i].fy -= (dy / dist) * force
          nds[j].fx += (dx / dist) * force; nds[j].fy += (dy / dist) * force
        }
      }

      // Spring attraction along edges
      edges.forEach(e => {
        const a = nds[e.a], b = nds[e.b]
        if (!a || !b) return
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        const force = (dist - 160) * 0.04
        const fx = (dx / dist) * force, fy = (dy / dist) * force
        a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy
      })

      // Center gravity
      const cx = canvas.width / 2, cy = canvas.height / 2
      nds.forEach(n => { n.fx += (cx - n.x) * 0.008; n.fy += (cy - n.y) * 0.008 })

      // Integrate
      nds.forEach(n => {
        const drag = dragRef.current
        if (drag?.type === 'node' && drag.nodeIdx !== undefined && nodesRef.current[drag.nodeIdx] === n) return
        n.vx = (n.vx + n.fx) * 0.82
        n.vy = (n.vy + n.fy) * 0.82
        n.x += n.vx; n.y += n.vy
      })
    }

    function draw() {
      const nds = nodesRef.current
      const edges = edgesRef.current
      const { x: tx, y: ty, scale: ts } = transformRef.current
      const W = canvas.width, H = canvas.height

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0d0b07'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(tx, ty)
      ctx.scale(ts, ts)

      // Edges
      edges.forEach(e => {
        const a = nds[e.a], b = nds[e.b]
        if (!a || !b) return
        ctx.strokeStyle = 'rgba(212,168,67,0.25)'
        ctx.lineWidth = 1.5 / ts
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      })

      // Nodes
      nds.forEach((nd, i) => {
        const note = notesRef.current[i]
        if (!note) return
        const color = TYPE_COLORS[note.type] || '#d4a843'

        // Glow halo
        const grad = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, NODE_RADIUS * 2.5)
        grad.addColorStop(0, color + '55'); grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(nd.x, nd.y, NODE_RADIUS * 2.5, 0, Math.PI * 2); ctx.fill()

        // Circle
        ctx.fillStyle = color
        ctx.beginPath(); ctx.arc(nd.x, nd.y, NODE_RADIUS, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 1.5 / ts; ctx.stroke()

        // Label
        const label = note.title || 'Sans titre'
        const fs = Math.max(9, 12 / ts)
        ctx.fillStyle = '#d8c8a8'
        ctx.font = `${fs}px 'EB Garamond', Georgia, serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(label, nd.x, nd.y + NODE_RADIUS + 3 / ts)
      })

      ctx.restore()
    }

    function loop() { simulate(); draw(); frameRef.current = requestAnimationFrame(loop) }
    loop()

    return () => {
      cancelAnimationFrame(frameRef.current)
      ro.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function getNodeAt(clientX, clientY) {
    const canvas = canvasRef.current; if (!canvas) return -1
    const rect = canvas.getBoundingClientRect()
    const { x: tx, y: ty, scale: ts } = transformRef.current
    const cx = (clientX - rect.left - tx) / ts
    const cy = (clientY - rect.top - ty) / ts
    return nodesRef.current.findIndex(n => Math.hypot(n.x - cx, n.y - cy) <= NODE_RADIUS + 4)
  }

  function onMouseDown(e) {
    const idx = getNodeAt(e.clientX, e.clientY)
    if (idx >= 0) {
      dragRef.current = { type: 'node', nodeIdx: idx, moved: false, startX: e.clientX, startY: e.clientY }
    } else {
      dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, origX: transformRef.current.x, origY: transformRef.current.y }
    }
  }

  function onMouseMove(e) {
    const drag = dragRef.current; if (!drag) return
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    if (drag.type === 'node') {
      const nd = nodesRef.current[drag.nodeIdx]; if (!nd) return
      nd.x += e.movementX / transformRef.current.scale
      nd.y += e.movementY / transformRef.current.scale
      nd.vx = 0; nd.vy = 0
    } else {
      transformRef.current.x = drag.origX + (e.clientX - drag.startX)
      transformRef.current.y = drag.origY + (e.clientY - drag.startY)
    }
  }

  function onMouseUp(e) {
    const drag = dragRef.current
    if (drag?.type === 'node' && !drag.moved) {
      const note = notesRef.current[drag.nodeIdx]; if (note) onOpenNoteRef.current(note.id)
    }
    dragRef.current = null
  }

  function onWheel(e) {
    e.preventDefault()
    const { x: tx, y: ty, scale: ts } = transformRef.current
    const factor = e.deltaY < 0 ? 1.12 : 0.9
    const ns = Math.max(0.15, Math.min(5, ts * factor))
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    transformRef.current = { x: mx - (mx - tx) * (ns / ts), y: my - (my - ty) * (ns / ts), scale: ns, initialized: true }
  }

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#0d0b07' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      />
      {/* Legend */}
      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(13,11,7,0.85)', border: '1px solid #4a3420', borderRadius: 5, padding: '0.6rem 0.8rem', fontSize: '0.7rem', color: '#d8c8a8', userSelect: 'none' }}>
        {Object.entries(TYPE_COLORS).map(([t, c]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            <span>{TYPE_LABELS[t]}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #4a3420', marginTop: 6, paddingTop: 6, color: '#7a6a55', fontSize: '0.63rem', lineHeight: 1.7 }}>
          Scroll : zoom<br />Glisser fond : déplacer<br />Clic nœud : ouvrir
        </div>
      </div>
      {notes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a55', fontStyle: 'italic', fontFamily: 'EB Garamond, serif', fontSize: '1rem', pointerEvents: 'none' }}>
          Créez des notes pour voir le graphe
        </div>
      )}
    </div>
  )
}

// ── MapView sub-component ───────────────────────────────────────
function MapView({
  styles, map, mapAreaRef, handleMapClick, handlePinClick,
  pinDialog, setPinDialog, pinLabel, setPinLabel, pinNoteId, setPinNoteId,
  savePinDialog, deletePinDialog, notes, openNote, openMapOnSecondScreen
}) {
  return (
    <>
      <div className={styles.mapToolbar}>
        <span className={styles.mapName}>🗺 {map.name || 'Carte'}</span>
        <button className={styles.secondScreenBtn} onClick={() => openMapOnSecondScreen(map)}>
          🖥 Afficher sur l'écran
        </button>
      </div>
      <div
        className={styles.mapArea}
        ref={mapAreaRef}
        onClick={handleMapClick}
      >
        <img src={map.src} alt={map.name} className={styles.mapImage} />
        {/* Pins */}
        {(map.pins || []).map(pin => (
          <div
            key={pin.id}
            className={styles.pinDot}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={e => handlePinClick(e, pin)}
            title={pin.label || ''}
          >
            {pin.label && <span className={styles.pinLabel}>{pin.label}</span>}
          </div>
        ))}
      </div>
      {/* Pin dialog */}
      {pinDialog && (
        <div
          className={styles.pinDialog}
          style={{
            top: Math.min(pinDialog.clientY, window.innerHeight - 200),
            left: Math.min(pinDialog.clientX + 10, window.innerWidth - 250),
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.pinDialogTitle}>
            {pinDialog.editing ? 'Modifier l\'épingle' : 'Nouvelle épingle'}
          </div>
          <input
            className={styles.pinDialogInput}
            placeholder="Label..."
            value={pinLabel}
            onChange={e => setPinLabel(e.target.value)}
            autoFocus
          />
          <select
            className={styles.pinDialogSelect}
            value={pinNoteId}
            onChange={e => setPinNoteId(e.target.value)}
          >
            <option value="">— Lier à une note —</option>
            {notes.filter(n => n.type === 'lieu' || n.type === 'note').map(n => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
          {pinNoteId && (
            <button
              className={styles.pinDialogBtn}
              onClick={() => { openNote(pinNoteId); setPinDialog(null) }}
            >
              Ouvrir la note liée
            </button>
          )}
          <div className={styles.pinDialogActions}>
            <button
              className={`${styles.pinDialogBtn} ${styles.pinDialogBtnCancel}`}
              onClick={() => setPinDialog(null)}
            >
              Annuler
            </button>
            {pinDialog.editing && (
              <button
                className={`${styles.pinDialogBtn} ${styles.pinDialogBtnDelete}`}
                onClick={deletePinDialog}
              >
                Supprimer
              </button>
            )}
            <button className={styles.pinDialogBtn} onClick={savePinDialog}>
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
