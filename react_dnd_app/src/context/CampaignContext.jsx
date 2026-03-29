import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ── IndexedDB helpers to persist the directory handle across reloads ──
async function saveHandleToIDB(handle) {
  return new Promise((res, rej) => {
    const req = indexedDB.open('dnd-campaign', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles')
    req.onsuccess = e => {
      const db = e.target.result
      const tx = db.transaction('handles', 'readwrite')
      tx.objectStore('handles').put(handle, 'root')
      tx.oncomplete = () => res()
      tx.onerror = () => rej()
    }
    req.onerror = () => rej()
  })
}

async function loadHandleFromIDB() {
  return new Promise(res => {
    const req = indexedDB.open('dnd-campaign', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles')
    req.onsuccess = e => {
      const db = e.target.result
      const tx = db.transaction('handles', 'readonly')
      const get = tx.objectStore('handles').get('root')
      get.onsuccess = () => res(get.result || null)
      get.onerror = () => res(null)
    }
    req.onerror = () => res(null)
  })
}

// ── localStorage fallback (mobile / Firefox) ──
function lsKey(folder, id) { return `dnd:${folder}:${id}` }

function lsGetAll(folder) {
  const results = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`dnd:${folder}:`)) {
      try { results.push(JSON.parse(localStorage.getItem(key))) } catch {}
    }
  }
  return results.sort((a, b) => (b._updatedAt || 0) - (a._updatedAt || 0))
}

const HAS_FS = typeof window !== 'undefined' && 'showDirectoryPicker' in window

// ── Context ──
export const CampaignContext = createContext(null)

export function CampaignProvider({ children }) {
  const [rootHandle, setRootHandle] = useState(null)
  const [ready, setReady] = useState(!HAS_FS) // ready immediately on mobile/Firefox
  const [folderName, setFolderName] = useState(localStorage.getItem('dnd:folderName') || null)

  // Try to restore handle from IDB on mount
  useEffect(() => {
    if (!HAS_FS) return
    loadHandleFromIDB().then(async handle => {
      if (!handle) return
      try {
        const perm = await handle.requestPermission({ mode: 'readwrite' })
        if (perm === 'granted') {
          setRootHandle(handle)
          setFolderName(handle.name)
          setReady(true)
        }
      } catch {}
    })
  }, [])

  // Expose to window so non-hook code (fsAdd etc.) can use it
  useEffect(() => {
    window.__campaign = {
      ready, readAll, writeFile, deleteFile, readFile,
      importJSON, exportFile, exportAll,
    }
  })

  const openFolder = useCallback(async () => {
    if (!HAS_FS) { setReady(true); return }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      setRootHandle(handle)
      setFolderName(handle.name)
      setReady(true)
      localStorage.setItem('dnd:folderName', handle.name)
      await saveHandleToIDB(handle)
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e)
    }
  }, [])

  async function getDir(folder) {
    if (!rootHandle) return null
    return rootHandle.getDirectoryHandle(folder, { create: true })
  }

  // ── CRUD ──

  async function readAll(folder) {
    if (!HAS_FS || !rootHandle) return lsGetAll(folder)
    const dir = await getDir(folder)
    if (!dir) return []
    const results = []
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        try {
          const file = await handle.getFile()
          results.push(JSON.parse(await file.text()))
        } catch {}
      }
    }
    return results.sort((a, b) => (b._updatedAt || 0) - (a._updatedAt || 0))
  }

  async function writeFile(folder, id, data) {
    const record = { ...data, id, _updatedAt: Date.now() }
    if (!HAS_FS || !rootHandle) {
      localStorage.setItem(lsKey(folder, id), JSON.stringify(record))
      return record
    }
    const dir = await getDir(folder)
    if (!dir) return null
    const fh = await dir.getFileHandle(`${id}.json`, { create: true })
    const writable = await fh.createWritable()
    await writable.write(JSON.stringify(record, null, 2))
    await writable.close()
    return record
  }

  async function deleteFile(folder, id) {
    if (!HAS_FS || !rootHandle) { localStorage.removeItem(lsKey(folder, id)); return }
    const dir = await getDir(folder)
    if (!dir) return
    try { await dir.removeEntry(`${id}.json`) } catch {}
  }

  async function readFile(folder, id) {
    if (!HAS_FS || !rootHandle) {
      const raw = localStorage.getItem(lsKey(folder, id))
      return raw ? JSON.parse(raw) : null
    }
    const dir = await getDir(folder)
    if (!dir) return null
    try {
      const fh = await dir.getFileHandle(`${id}.json`)
      const file = await fh.getFile()
      return JSON.parse(await file.text())
    } catch { return null }
  }

  // ── Import / Export ──

  function detectFolder(data) {
    if (data.char_name !== undefined || data._classId !== undefined) return 'characters'
    if (data.category !== undefined && data.visibility !== undefined) return 'grimoire'
    if (data.cr !== undefined || data.challenge_rating !== undefined) return 'monsters'
    if (data.initiative !== undefined) return 'sessions'
    return 'characters'
  }

  async function importJSON(file, folderOverride) {
    const text = await file.text()
    const data = JSON.parse(text)
    // Bundle format: { folder, items: [...] }
    if (data.folder && Array.isArray(data.items)) {
      const f = folderOverride || data.folder
      for (const item of data.items) {
        await writeFile(f, item.id || crypto.randomUUID(), item)
      }
      return data.items.length
    }
    // Single entity
    const folder = folderOverride || detectFolder(data)
    const id = data.id || crypto.randomUUID()
    await writeFile(folder, id, { ...data, id })
    return 1
  }

  async function exportFile(folder, id) {
    const data = await readFile(folder, id)
    if (!data) return
    const name = data.char_name || data.title || id
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportAll(folder) {
    const items = await readAll(folder)
    const blob = new Blob([JSON.stringify({ folder, items, exportedAt: Date.now() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${folder}-export.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <CampaignContext.Provider value={{
      ready, folderName, hasFS: HAS_FS, openFolder,
      readAll, writeFile, deleteFile, readFile,
      importJSON, exportFile, exportAll,
    }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign must be inside CampaignProvider')
  return ctx
}
