import React, { useState } from 'react'

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

export default function OverlayPanel({
  activeOverlays, onToggle, onClear, onStorm, stormMode,
  masterVolume, onMasterVolume, styles,
  effectSettings, onEffectSettingChange, customSounds,
  customEffects, onToggleCustomEffect, onAddCustomEffect, onRemoveCustomEffect
}) {
  const [expandedEffect, setExpandedEffect] = useState(null)
  const [addingCustom, setAddingCustom] = useState(false)
  const [newEffectName, setNewEffectName] = useState('')
  const [newEffectIcon, setNewEffectIcon] = useState('🎵')
  const [newEffectSoundId, setNewEffectSoundId] = useState('')

  function submitCustomEffect() {
    if (!newEffectName.trim()) return
    onAddCustomEffect(newEffectName.trim(), newEffectIcon, newEffectSoundId ? Number(newEffectSoundId) : null)
    setNewEffectName('')
    setNewEffectIcon('🎵')
    setNewEffectSoundId('')
    setAddingCustom(false)
  }

  return (
    <>
      <div className={styles.sectionLabel}>Effets &amp; Overlays</div>
      <div className={styles.overlayGrid}>
        {OVERLAYS.map(ov => (
          <div key={ov.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              className={`${styles.overlayBtn}${activeOverlays.has(ov.id) ? ' ' + styles.active : ''}`}
              onClick={() => onToggle(ov.id)}
              title={ov.name}
            >
              <span className={styles.overlayIcon}>{ov.icon}</span>
              <span className={styles.overlayName}>{ov.name}</span>
            </button>
            <button
              title="Paramètres son"
              onClick={() => setExpandedEffect(expandedEffect === ov.id ? null : ov.id)}
              style={{ background: 'none', border: 'none', color: expandedEffect === ov.id ? '#d4a843' : '#4a3420', fontSize: '0.6rem', cursor: 'pointer', padding: '1px 0', textAlign: 'center' }}
            >⚙</button>
            {expandedEffect === ov.id && (
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #4a3420', borderRadius: 3, padding: '0.4rem', marginBottom: '0.2rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#7a6a55', minWidth: 28 }}>Vol</span>
                  <input
                    type="range" min="0" max="100"
                    value={effectSettings[ov.id]?.volume ?? 60}
                    onChange={e => onEffectSettingChange(ov.id, { volume: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: 24, color: '#7a6a55', fontSize: '0.65rem' }}>{effectSettings[ov.id]?.volume ?? 60}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: '#7a6a55', minWidth: 28 }}>Son</span>
                  <select
                    value={effectSettings[ov.id]?.soundId ?? ''}
                    onChange={e => onEffectSettingChange(ov.id, { soundId: e.target.value ? Number(e.target.value) : null })}
                    style={{ flex: 1, background: '#1a1410', border: '1px solid #4a3420', color: '#d8c8a8', fontSize: '0.65rem', borderRadius: 3, padding: '0.15rem' }}
                  >
                    <option value="">— Aucun son lié —</option>
                    {(customSounds || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className={`${styles.stormBtn}${stormMode ? ' ' + styles.active : ''}`} onClick={onStorm}>
        ⛈️ Mode Tempête ++
      </button>

      {/* Custom Effects */}
      {(customEffects || []).length > 0 && (
        <>
          <div style={{ fontSize: '0.6rem', fontFamily: 'Cinzel, serif', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a6a55', marginTop: '0.5rem', marginBottom: '0.3rem' }}>Ambiances</div>
          <div className={styles.overlayGrid}>
            {customEffects.map(ce => (
              <div key={ce.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
                <button
                  className={`${styles.overlayBtn}${activeOverlays.has('custom_' + ce.id) ? ' ' + styles.active : ''}`}
                  onClick={() => onToggleCustomEffect(ce.id)}
                  title={ce.name}
                >
                  <span className={styles.overlayIcon}>{ce.icon}</span>
                  <span className={styles.overlayName}>{ce.name}</span>
                </button>
                <button
                  onClick={() => onRemoveCustomEffect(ce.id)}
                  style={{ background: 'none', border: 'none', color: '#7a6a55', fontSize: '0.6rem', cursor: 'pointer', padding: '1px 0', textAlign: 'center' }}
                  title="Supprimer"
                >✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {addingCustom ? (
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #4a3420', borderRadius: 4, padding: '0.5rem', marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <input
              type="text"
              placeholder="Icône"
              value={newEffectIcon}
              onChange={e => setNewEffectIcon(e.target.value)}
              style={{ width: 36, background: '#1a1410', border: '1px solid #4a3420', color: '#d8c8a8', borderRadius: 3, padding: '0.25rem', fontSize: '0.9rem', textAlign: 'center' }}
            />
            <input
              type="text"
              placeholder="Nom de l'ambiance"
              value={newEffectName}
              onChange={e => setNewEffectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitCustomEffect() }}
              style={{ flex: 1, background: '#1a1410', border: '1px solid #4a3420', color: '#d8c8a8', borderRadius: 3, padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
            />
          </div>
          <select
            value={newEffectSoundId}
            onChange={e => setNewEffectSoundId(e.target.value)}
            style={{ background: '#1a1410', border: '1px solid #4a3420', color: '#d8c8a8', fontSize: '0.7rem', borderRadius: 3, padding: '0.2rem', width: '100%' }}
          >
            <option value="">— Son (optionnel) —</option>
            {(customSounds || []).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button onClick={submitCustomEffect} style={{ flex: 1, background: 'rgba(212,168,67,0.15)', border: '1px solid #d4a843', color: '#d4a843', borderRadius: 3, padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'Cinzel, serif' }}>✓ Créer</button>
            <button onClick={() => setAddingCustom(false)} style={{ background: 'none', border: '1px solid #4a3420', color: '#7a6a55', borderRadius: 3, padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer' }}>Annuler</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingCustom(true)}
          style={{ width: '100%', background: 'none', border: '1px dashed #4a3420', color: '#7a6a55', borderRadius: 3, padding: '0.3rem', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'Cinzel, serif', marginTop: '0.3rem' }}
        >
          ＋ Ajouter une ambiance
        </button>
      )}

      <button className={styles.clearBtn} onClick={onClear} style={{ marginTop: '0.4rem' }}>✕ Effacer tous les effets</button>

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
