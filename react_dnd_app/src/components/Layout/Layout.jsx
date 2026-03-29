import React, { useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCampaign } from '../../context/CampaignContext'

const s = {
  nav: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '0.5rem 1rem', background: '#1a1410',
    borderBottom: '1px solid #4a3420', position: 'sticky', top: 0, zIndex: 100,
  },
  logo: {
    fontFamily: "'Cinzel Decorative', serif", fontSize: '0.85rem',
    color: '#d4a843', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  navLinks: { display: 'flex', gap: '0.5rem', flex: 1 },
  link: {
    fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', color: '#7a6a55', textDecoration: 'none',
    padding: '0.3rem 0.6rem', border: '1px solid transparent', borderRadius: '3px', transition: 'all 0.15s',
  },
  linkActive: { color: '#d4a843', borderColor: 'rgba(212,168,67,0.3)' },
  actions: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' },
  btn: {
    background: 'none', border: '1px solid #4a3420', color: '#7a6a55',
    fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.1em',
    padding: '0.25rem 0.6rem', borderRadius: '3px', cursor: 'pointer', transition: 'all 0.15s',
  },
  banner: {
    background: '#1a1208', borderBottom: '1px solid #4a3420',
    padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
    fontSize: '0.8rem', fontFamily: 'Cinzel, serif', color: '#7a6a55',
  },
}

const NAV_LINKS = [
  { to: '/', label: 'Personnages', exact: true },
  { to: '/dm', label: 'DM Screen' },
  { to: '/wiki', label: 'Grimoire' },
  { to: '/compendium', label: 'Compendium' },
  { to: '/help', label: 'Aide' },
]

export default function Layout({ children }) {
  const { ready, folderName, hasFS, openFolder, importJSON, exportAll } = useCampaign()
  const location = useLocation()
  const importRef = useRef(null)
  const [msg, setMsg] = useState(null)

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + '/')

  async function handleImport(e) {
    const files = [...e.target.files]
    if (!files.length) return
    let total = 0
    for (const file of files) {
      try { total += await importJSON(file) } catch (err) { console.error(err) }
    }
    setMsg(`✓ ${total} importé(s)`)
    setTimeout(() => setMsg(null), 3000)
    e.target.value = ''
    window.location.reload()
  }

  const hoverOn = e => { e.currentTarget.style.borderColor = '#d4a843'; e.currentTarget.style.color = '#d4a843' }
  const hoverOff = e => { e.currentTarget.style.borderColor = '#4a3420'; e.currentTarget.style.color = '#7a6a55' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>⚔️ D&D</Link>

        <div style={s.navLinks}>
          {NAV_LINKS.map(({ to, label, exact }) => (
            <Link key={to} to={to} style={{ ...s.link, ...(isActive(to, exact) ? s.linkActive : {}) }}>
              {label}
            </Link>
          ))}
        </div>

        <div style={s.actions}>
          {msg && <span style={{ fontSize: '0.7rem', color: '#5db85c', fontFamily: 'Cinzel, serif' }}>{msg}</span>}

          <button style={s.btn} onClick={() => importRef.current?.click()} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
            title="Importer un JSON (personnage, grimoire, monstres...)">
            📥 Importer
          </button>
          <input ref={importRef} type="file" accept=".json" multiple style={{ display: 'none' }} onChange={handleImport} />

          <button style={s.btn} onClick={() => exportAll('characters')} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
            title="Exporter tous les personnages en JSON">
            📤 Exporter
          </button>

          {hasFS && (
            <button
              style={{ ...s.btn, ...(ready && folderName ? { borderColor: 'rgba(212,168,67,0.3)', color: '#d4a843' } : {}) }}
              onClick={openFolder}
              title={folderName ? `Dossier actif : ${folderName}` : 'Choisir le dossier de campagne'}
            >
              📁 {folderName || 'Dossier'}
            </button>
          )}
        </div>
      </nav>

      {/* First-visit banner — prompt to pick folder */}
      {!ready && hasFS && (
        <div style={s.banner}>
          <span>📁 Choisissez un dossier pour stocker vos données (personnages, grimoire, monstres...)</span>
          <button
            onClick={openFolder}
            style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid #d4a843', color: '#d4a843', borderRadius: 3, padding: '0.3rem 0.8rem', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.7rem' }}
          >
            Choisir un dossier
          </button>
        </div>
      )}

      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
