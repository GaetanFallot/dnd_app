import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { auth } from '../../firebase'
import styles from '../../styles/auth.module.css'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const email = pseudo ? `${pseudo.toLowerCase().replace(/\s+/g, '_')}@dnd.local` : ''

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pseudo.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: pseudo.trim() })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      navigate('/')
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Ce pseudo est déjà utilisé.',
        'auth/user-not-found': 'Pseudo introuvable.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/weak-password': 'Mot de passe trop faible (min 6 caractères).',
        'auth/invalid-credential': 'Pseudo ou mot de passe incorrect.',
      }
      setError(msgs[err.code] || `Erreur : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <div className={styles.logo}>⚔️</div>
        <h1 className={styles.title}>D&D DM Screen</h1>
        <p className={styles.subtitle}>Outils de Table</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Connexion
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            Inscription
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Pseudo</label>
            <input
              className={styles.input}
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              placeholder="Votre pseudo de MJ..."
              autoFocus
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Mot de passe</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>
      </div>
    </div>
  )
}
