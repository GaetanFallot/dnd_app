/**
 * Compatibility shim — replaces Firebase Firestore with local File System storage.
 * Components using useCollection / fsAdd / fsSet / fsDelete work without changes.
 */
import { useState, useEffect, useCallback, useContext } from 'react'
import { CampaignContext } from '../context/CampaignContext'

// "users/uid/characters" → "characters"
function folderOf(path) {
  if (!path) return null
  return path.split('/').pop()
}

export function useCollection(path) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const campaign = useContext(CampaignContext)

  const load = useCallback(async () => {
    const folder = folderOf(path)
    if (!folder || !campaign) return
    const items = await campaign.readAll(folder)
    setDocs(items)
    setLoading(false)
  }, [path, campaign?.ready])

  useEffect(() => {
    if (!path || !campaign?.ready) return
    load()
  }, [load])

  return { docs, loading, refresh: load }
}

export async function fsAdd(path, data) {
  const folder = folderOf(path)
  const id = crypto.randomUUID()
  if (window.__campaign) {
    return window.__campaign.writeFile(folder, id, { ...data, id })
  }
  const record = { ...data, id, _updatedAt: Date.now() }
  localStorage.setItem(`dnd:${folder}:${id}`, JSON.stringify(record))
  return { id }
}

export async function fsSet(path, id, data) {
  const folder = folderOf(path)
  if (window.__campaign) {
    const existing = await window.__campaign.readFile(folder, id) || {}
    return window.__campaign.writeFile(folder, id, { ...existing, ...data, id })
  }
  const key = `dnd:${folder}:${id}`
  const prev = JSON.parse(localStorage.getItem(key) || '{}')
  localStorage.setItem(key, JSON.stringify({ ...prev, ...data, id, _updatedAt: Date.now() }))
}

export async function fsDelete(path, id) {
  const folder = folderOf(path)
  if (window.__campaign) return window.__campaign.deleteFile(folder, id)
  localStorage.removeItem(`dnd:${folder}:${id}`)
}
