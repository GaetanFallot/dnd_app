import React from 'react'

const OVERLAYS = [
  { id: 'rain',     icon: '🌧️', name: 'Pluie',     canvas: true  },
  { id: 'snow',     icon: '❄️', name: 'Neige',     canvas: true  },
  { id: 'thunder',  icon: '⚡', name: 'Tonnerre', canvas: true  },
  { id: 'fire',     icon: '🔥', name: 'Feu',       canvas: true  },
  { id: 'magic',    icon: '✨', name: 'Magie',     canvas: true  },
  { id: 'vignette', icon: '🌑', name: 'Vignette',  canvas: false },
  { id: 'fog',      icon: '🌫️', name: 'Brume',     canvas: false },
  { id: 'darkness', icon: '🌚', name: 'Ténèbres', canvas: false },
]

export default function OverlayPanel({ activeOverlays, onToggle, onClear, masterVolume, onMasterVolume, styles }) {
  return (
    <>
      <div className={styles.sectionLabel}>Effets &amp; Overlays</div>
      <div className={styles.overlayGrid}>
        {OVERLAYS.map(ov => (
          <button
            key={ov.id}
            className={`${styles.overlayBtn}${activeOverlays.has(ov.id) ? ' ' + styles.active : ''}`}
            onClick={() => onToggle(ov.id)}
            title={ov.name}
          >
            <span className={styles.overlayIcon}>{ov.icon}</span>
            <span className={styles.overlayName}>{ov.name}</span>
          </button>
        ))}
      </div>

      <button className={styles.clearBtn} onClick={onClear}>✕ Effacer tous les effets</button>

      <div className={styles.masterVol}>
        <label>🔊 Master</label>
        <input
          type="range"
          min="0" max="100"
          value={masterVolume}
          onChange={e => onMasterVolume(Number(e.target.value))}
        />
        <span style={{ minWidth: 32, fontSize: '0.72rem', color: '#7a6a55' }}>{masterVolume}%</span>
      </div>
    </>
  )
}
