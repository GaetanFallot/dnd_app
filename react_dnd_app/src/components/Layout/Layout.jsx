import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.5rem 1rem',
    background: '#1a1410',
    borderBottom: '1px solid #4a3420',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontFamily: "'Cinzel Decorative', serif",
    fontSize: '0.85rem',
    color: '#d4a843',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  navLinks: {
    display: 'flex',
    gap: '0.5rem',
    flex: 1,
  },
  navLink: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.7rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7a6a55',
    textDecoration: 'none',
    padding: '0.3rem 0.6rem',
    border: '1px solid transparent',
    borderRadius: '3px',
    transition: 'all 0.15s',
  },
  navLinkActive: {
    color: '#d4a843',
    borderColor: 'rgba(212,168,67,0.3)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginLeft: 'auto',
  },
  displayName: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.7rem',
    color: '#7a6a55',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #4a3420',
    color: '#7a6a55',
    fontFamily: "'Cinzel', serif",
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    padding: '0.25rem 0.6rem',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  content: {
    flex: 1,
  }
}

export default function Layout({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>
          ⚔ D&D
        </Link>
        <div style={styles.navLinks}>
          <Link
            to="/"
            style={{
              ...styles.navLink,
              ...(location.pathname === '/' ? styles.navLinkActive : {})
            }}
          >
            Personnages
          </Link>
          <Link
            to="/dm"
            style={{
              ...styles.navLink,
              ...(isActive('/dm') ? styles.navLinkActive : {})
            }}
          >
            DM Screen
          </Link>
        </div>
        <div style={styles.userInfo}>
          {user?.displayName && (
            <span style={styles.displayName}>{user.displayName}</span>
          )}
          <button
            style={styles.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={e => { e.target.style.borderColor = '#d4a843'; e.target.style.color = '#d4a843' }}
            onMouseLeave={e => { e.target.style.borderColor = '#4a3420'; e.target.style.color = '#7a6a55' }}
          >
            Déconnexion
          </button>
        </div>
      </nav>
      <div style={styles.content}>
        {children}
      </div>
    </div>
  )
}
