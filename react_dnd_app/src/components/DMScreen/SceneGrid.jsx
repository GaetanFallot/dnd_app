import React from 'react'

export default function SceneGrid({ scenes, customScenes, currentScene, onSelect, onDeleteCustom, styles }) {
  return (
    <>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a6a55', padding: '0.4rem 0', borderBottom: '1px solid #4a3420', marginBottom: '0.6rem' }}>
        Scènes DnD
      </div>
      <div className={styles.sceneGrid}>
        {scenes.map(scene => (
          <SceneCard
            key={scene.id}
            scene={scene}
            isActive={currentScene?.id === scene.id}
            onSelect={() => onSelect(scene)}
            styles={styles}
          />
        ))}
      </div>

      {customScenes?.length > 0 && (
        <>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a6a55', padding: '0.4rem 0', borderBottom: '1px solid #4a3420', margin: '1rem 0 0.6rem' }}>
            Mes imports
          </div>
          <div className={styles.sceneGrid}>
            {customScenes.map(scene => (
              <SceneCard
                key={scene.id}
                scene={scene}
                isActive={currentScene?.id === scene.id}
                onSelect={() => onSelect(scene)}
                onDelete={() => onDeleteCustom(scene.id)}
                styles={styles}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function SceneCard({ scene, isActive, onSelect, onDelete, styles }) {
  return (
    <div
      className={`${styles.sceneCard}${isActive ? ' ' + styles.active : ''}`}
      onClick={onSelect}
    >
      <div
        className={styles.sceneBg}
        style={scene.src
          ? { backgroundImage: `url(${scene.src})`, backgroundSize: 'cover' }
          : { background: scene.bg }
        }
      />
      {scene.overlay && (
        <div style={{ position: 'absolute', inset: 0, background: scene.overlay }} />
      )}
      <div className={styles.sceneEmoji}>{scene.emoji || '🖼️'}</div>
      <div className={styles.sceneGrad} />
      <div className={styles.sceneInfo}>
        <div className={styles.sceneName}>{scene.name}</div>
        <div className={styles.sceneTag}>{scene.tag || ''}</div>
      </div>
      <div className={styles.checkMark}>✓</div>
      {onDelete && (
        <button
          className={styles.deleteBtn}
          onClick={e => { e.stopPropagation(); onDelete() }}
          title="Supprimer"
        >
          ✕
        </button>
      )}
    </div>
  )
}
