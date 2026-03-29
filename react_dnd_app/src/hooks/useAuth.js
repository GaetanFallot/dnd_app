// Stub — auth supprimée, plus besoin de connexion
export function useAuth() {
  return { user: { uid: 'local', displayName: 'Local' }, loading: false }
}
