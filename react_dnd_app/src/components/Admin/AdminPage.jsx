import React from 'react'
import { useCollection, fsSet } from '../../hooks/useFirestore'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { Link } from 'react-router-dom'

const ROLE_COLORS = { admin: '#e06060', mj: '#5b8dd9', joueur: '#5db85c' }
const ROLE_LABELS = { admin: 'Admin', mj: 'MJ', joueur: 'Joueur' }

export default function AdminPage() {
  const { role } = useRole()
  const { docs: users } = useCollection('users')

  if (role !== 'admin') {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#7a6a55', fontFamily: 'Cinzel, serif' }}>Accès refusé</div>
  }

  async function changeRole(uid, newRole) {
    await fsSet('user_roles', uid, { role: newRole }, true) // merge
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem', fontFamily: 'EB Garamond, Georgia, serif' }}>
      <h1 style={{ fontFamily: 'Cinzel Decorative, serif', color: '#d4a843', fontSize: '1.4rem', marginBottom: '0.3rem' }}>
        Gestion des utilisateurs
      </h1>
      <p style={{ color: '#7a6a55', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Gérez les rôles des utilisateurs enregistrés.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {users.map(u => (
          <div key={u.id} style={{ background: '#1a1410', border: '1px solid #4a3420', borderRadius: 5, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#d8c8a8', fontWeight: 600 }}>{u.pseudo || u.displayName || u.id}</div>
              <div style={{ color: '#7a6a55', fontSize: '0.75rem', fontFamily: 'monospace' }}>{u.id}</div>
            </div>
            <span style={{ background: ROLE_COLORS[u.role] + '22', border: `1px solid ${ROLE_COLORS[u.role]}`, color: ROLE_COLORS[u.role], borderRadius: 20, padding: '0.15rem 0.7rem', fontSize: '0.72rem', fontFamily: 'Cinzel, serif' }}>
              {ROLE_LABELS[u.role] || u.role}
            </span>
            <select
              value={u.role || 'joueur'}
              onChange={e => changeRole(u.id, e.target.value)}
              style={{ background: '#231d15', border: '1px solid #4a3420', color: '#d8c8a8', borderRadius: 3, padding: '0.3rem 0.5rem', fontSize: '0.8rem', fontFamily: 'EB Garamond, serif' }}
            >
              <option value="admin">Admin</option>
              <option value="mj">MJ</option>
              <option value="joueur">Joueur</option>
            </select>
          </div>
        ))}
        {users.length === 0 && (
          <div style={{ color: '#7a6a55', fontStyle: 'italic', padding: '1rem' }}>Aucun utilisateur enregistré</div>
        )}
      </div>

      <div style={{ marginTop: '2rem', background: '#1a1410', border: '1px solid #4a3420', borderRadius: 5, padding: '1rem' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#d4a843', marginBottom: '0.5rem' }}>Comment ajouter un utilisateur</div>
        <ol style={{ color: '#7a6a55', fontSize: '0.85rem', paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>L'utilisateur s'inscrit via la page de connexion</li>
          <li>Il apparaît ici avec le rôle "Joueur" par défaut</li>
          <li>Changez son rôle selon ses responsabilités</li>
        </ol>
      </div>
    </div>
  )
}
