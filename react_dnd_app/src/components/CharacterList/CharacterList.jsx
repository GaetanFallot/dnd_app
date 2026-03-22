import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacters } from '../../hooks/useCharacters'
import { CLASSES, DEFAULT_CHARACTER } from '../../data/dnd5e'

export default function CharacterList() {
  const { characters, loading, addCharacter, deleteCharacter } = useCharacters()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [selectedClass, setSelectedClass] = useState('')

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    const cls = CLASSES.find(c => c.id === selectedClass)
    const data = {
      ...DEFAULT_CHARACTER,
      _classId: cls?.id || '',
      _className: cls?.name || '',
      _classIcon: cls?.icon || '⚔️',
      _spellType: cls?.spellType || null,
      _spellAbility: cls?.spellAbility || null,
      _hd: cls?.hd || 8,
      char_name: 'Nouveau personnage',
    }
    const ref = await addCharacter(data)
    setCreating(false)
    if (ref?.id) navigate(`/sheet/${ref.id}`)
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Supprimer ce personnage ?')) return
    await deleteCharacter(id)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#d4a843', fontFamily: 'Cinzel, serif' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 20px rgba(212,168,67,.4))' }}>⚔️</div>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#d4a843', marginBottom: '0.3rem' }}>
          Personnages
        </h1>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#7a6a55' }}>
          Votre Roster de Héros
        </p>
      </div>

      {/* Create new character */}
      <div style={{
        background: '#1a1410',
        border: '1px solid #4a3420',
        borderRadius: '6px',
        padding: '1.2rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.8rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a6a55' }}>
          Nouvelle fiche :
        </div>
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          style={{
            flex: 1,
            minWidth: 150,
            background: '#231d15',
            border: '1px solid #4a3420',
            borderRadius: '3px',
            color: '#d8c8a8',
            padding: '0.4rem 0.6rem',
            fontFamily: 'EB Garamond, serif',
            fontSize: '0.9rem',
          }}
        >
          <option value="">— Choisir une classe —</option>
          {CLASSES.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.icon} {cls.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: '0.45rem 1.2rem',
            background: 'rgba(212,168,67,0.1)',
            border: '1px solid #d4a843',
            borderRadius: '3px',
            color: '#d4a843',
            fontFamily: 'Cinzel, serif',
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(212,168,67,0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(212,168,67,0.1)'}
        >
          {creating ? '...' : '+ Créer'}
        </button>
      </div>

      {/* Character cards */}
      {characters.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#7a6a55', fontStyle: 'italic', padding: '3rem 0', fontFamily: 'EB Garamond, serif' }}>
          Aucun personnage. Créez votre premier héros !
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          {characters.map(char => (
            <CharCard
              key={char.id}
              char={char}
              onClick={() => navigate(`/sheet/${char.id}`)}
              onDelete={e => handleDelete(e, char.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CharCard({ char, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#1a1410',
        border: '1px solid #4a3420',
        borderRadius: '5px',
        padding: '1.2rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#d4a843'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#4a3420'
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        {char._portrait ? (
          <img
            src={char._portrait}
            alt=""
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #4a3420', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2d2520', border: '2px solid #4a3420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
            {char._classIcon || '⚔️'}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.9rem', fontWeight: 700, color: '#d4a843', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {char.char_name || 'Sans nom'}
          </div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#7a6a55' }}>
            {char._className || '—'} {char.level ? `— Niv. ${char.level}` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {char.race && <Tag>{char.race}</Tag>}
        {char.background && <Tag>{char.background}</Tag>}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
        {[
          { label: 'PV', value: `${char.hp_current || 0}/${char.hp_max || 0}` },
          { label: 'CA', value: char.ac || 10 },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a6a55' }}>{s.label}</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 700, color: '#d8c8a8' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onDelete}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          background: 'none',
          border: 'none',
          color: '#7a6a55',
          fontSize: '0.9rem',
          cursor: 'pointer',
          padding: '0.2rem 0.4rem',
          borderRadius: '3px',
          transition: 'all 0.15s',
          opacity: 0,
        }}
        onMouseEnter={e => { e.target.style.color = '#c44a1a'; e.target.style.opacity = '1' }}
        onMouseLeave={e => { e.target.style.color = '#7a6a55'; e.target.style.opacity = '0' }}
        id={`del-${char.id}`}
        title="Supprimer"
      >
        🗑️
      </button>
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{
      background: '#2d2520',
      border: '1px solid #4a3420',
      borderRadius: '20px',
      padding: '0.1rem 0.5rem',
      fontSize: '0.7rem',
      color: '#7a6a55',
    }}>
      {children}
    </span>
  )
}
