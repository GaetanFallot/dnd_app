import { useCollection, fsAdd, fsSet, fsDelete } from './useFirestore'
import { useAuth } from './useAuth'

export function useCharacters() {
  const { user } = useAuth()
  const path = user ? `users/${user.uid}/characters` : null
  const { docs: characters, loading } = useCollection(path)

  const addCharacter = async (data) => {
    if (!user) return
    return fsAdd(`users/${user.uid}/characters`, data)
  }

  const updateCharacter = async (id, data) => {
    if (!user) return
    return fsSet(`users/${user.uid}/characters`, id, data)
  }

  const deleteCharacter = async (id) => {
    if (!user) return
    return fsDelete(`users/${user.uid}/characters`, id)
  }

  return { characters, loading, addCharacter, updateCharacter, deleteCharacter }
}
