import { useCollection, fsAdd, fsSet, fsDelete } from './useFirestore'

export function useCharacters() {
  const { docs: characters, loading, refresh } = useCollection('local/data/characters')

  const addCharacter = async (data) => {
    const result = await fsAdd('local/data/characters', data)
    setTimeout(refresh, 100)
    return result
  }

  const updateCharacter = async (id, data) => {
    await fsSet('local/data/characters', id, data)
    setTimeout(refresh, 100)
  }

  const deleteCharacter = async (id) => {
    await fsDelete('local/data/characters', id)
    setTimeout(refresh, 100)
  }

  return { characters, loading, addCharacter, updateCharacter, deleteCharacter }
}
