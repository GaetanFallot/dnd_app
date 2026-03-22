import { useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot,
  addDoc, setDoc, deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

export function useCollection(path) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!path) return
    const unsub = onSnapshot(collection(db, path), snap => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [path])

  return { docs, loading }
}

export async function fsAdd(path, data) {
  return addDoc(collection(db, path), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function fsSet(path, id, data) {
  return setDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function fsDelete(path, id) {
  return deleteDoc(doc(db, path, id))
}
