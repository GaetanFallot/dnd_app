import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { fsSet } from '../../hooks/useFirestore'
import { mod, modStr, profBonus, getSlots, SKILLS, SPELL_SCHOOLS, DEFAULT_CHARACTER } from '../../data/dnd5e'
import styles from '../../styles/sheet.module.css'

// Toast system
function useToast() {
  const [toasts, setToasts] = useState([])
  const show = useCallback((msg) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }, [])
  return { toasts, show }
}

export default function CharacterSheet() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toasts, show: showToast } = useToast()

  const [char, setChar] = useState(null)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef(null)
  const [mobileTab, setMobileTab] = useState('tab-combat')
  const [spellBrowserOpen, setSpellBrowserOpen] = useState(false)

  // Load character from Firestore
  useEffect(() => {
    if (!user || !id) return
    const ref = doc(db, `users/${user.uid}/characters/${id}`)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = { ...DEFAULT_CHARACTER, ...snap.data() }
        setChar(data)
        setLoading(false)
      } else {
        setLoading(false)
      }
    })
    return unsub
  }, [user, id])

  // Debounced auto-save
  const autoSave = useCallback((updatedChar) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!user || !id) return
      try {
        await fsSet(`users/${user.uid}/characters`, id, updatedChar)
      } catch (e) {
        console.error('Save error', e)
      }
    }, 400)
  }, [user, id])

  const update = useCallback((partial) => {
    setChar(prev => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      autoSave(next)
      return next
    })
  }, [autoSave])

  const field = useCallback((fieldName) => ({
    value: char?.[fieldName] ?? '',
    onChange: e => update({ [fieldName]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }), [char, update])

  const numField = useCallback((fieldName, defaultVal = 0) => ({
    value: char?.[fieldName] ?? defaultVal,
    onChange: e => update({ [fieldName]: e.target.value === '' ? '' : Number(e.target.value) })
  }), [char, update])

  // Computed values
  const level = parseInt(char?.level) || 1
  const prof = profBonus(level)
  const abilities = { str: char?.ability_str ?? 10, dex: char?.ability_dex ?? 10, con: char?.ability_con ?? 10, int: char?.ability_int ?? 10, wis: char?.ability_wis ?? 10, cha: char?.ability_cha ?? 10 }

  const skillMods = SKILLS.map((sk, i) => {
    const base = mod(abilities[sk.ability])
    const isProf = !!(char?._skillProf?.[i])
    const isExpert = !!(char?._skillExpert?.[i])
    if (isExpert) return base + prof * 2
    if (isProf) return base + prof
    return base
  })

  const percIdx = SKILLS.findIndex(s => s.name === 'Perception')
  const passivePerc = 10 + (skillMods[percIdx] || 0)

  const hpCur = parseInt(char?.hp_current) || 0
  const hpMax = parseInt(char?.hp_max) || 1
  const hpTemp = parseInt(char?.hp_temp) || 0
  const hpPct = Math.max(0, Math.min(100, hpCur / Math.max(hpMax, 1) * 100))
  const hpBarBg = hpPct < 25 ? 'linear-gradient(90deg,#4a0000,#8b1a1a)' : hpPct < 50 ? 'linear-gradient(90deg,#8b1a1a,#b22222)' : 'linear-gradient(90deg,#8b1a1a,#cc3333)'
  const hpLabel = `${hpCur}/${hpMax}${hpTemp ? ` (+${hpTemp})` : ''}`

  const spellSlots = char?._spellType ? getSlots(char._spellType, level) : {}
  const slotUsed = char?._slotUsed || {}

  function toggleSlot(lvl, idx) {
    const key = `${lvl}_${idx}`
    update({ _slotUsed: { ...slotUsed, [key]: !slotUsed[key] } })
  }

  function toggleSkillProf(i) {
    const prof = { ...(char?._skillProf || {}) }
    prof[i] = !prof[i]
    update({ _skillProf: prof })
  }

  function toggleSkillExpert(i) {
    const ex = { ...(char?._skillExpert || {}) }
    ex[i] = !ex[i]
    update({ _skillExpert: ex })
  }

  // Portrait upload
  function uploadPortrait() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        update({ _portrait: ev.target.result })
        showToast('Portrait mis à jour')
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  // Long rest
  function longRest() {
    if (!confirm('🌙 Effectuer un long repos ?\nPV restaurés au max, emplacements rechargés.')) return
    const resources = (char?._resources || []).map(r => ({
      ...r,
      dots: (r.dots || []).map(() => false)
    }))
    update({
      hp_current: char?.hp_max || 0,
      _slotUsed: {},
      _deathSaves: { s1: false, s2: false, s3: false, f1: false, f2: false, f3: false },
      _resources: resources,
    })
    showToast('🌙 Long repos effectué !')
  }

  // Short rest
  function shortRest() {
    if (!confirm('☀️ Effectuer un court repos ?')) return
    const resources = (char?._resources || []).map(r => ({
      ...r,
      dots: r.recharge === 'short' ? (r.dots || []).map(() => false) : r.dots
    }))
    update({ _resources: resources })
    showToast('☀️ Court repos effectué !')
  }

  // Export/Import JSON
  function exportJSON() {
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${char?.char_name || 'personnage'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function importJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result)
          update({ ...DEFAULT_CHARACTER, ...data })
          showToast('Fiche importée')
        } catch {
          showToast('Erreur : fichier JSON invalide')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function resetSheet() {
    if (!confirm('🗑️ Réinitialiser la fiche ? Cette action est irréversible.')) return
    update({ ...DEFAULT_CHARACTER })
    showToast('Fiche réinitialisée')
  }

  // Attacks
  function addAttack() {
    const attacks = [...(char?._attacks || []), { name: '', bonus: '', damage: '', type: '' }]
    update({ _attacks: attacks })
  }

  function updateAttack(i, field, val) {
    const attacks = [...(char?._attacks || [])]
    attacks[i] = { ...attacks[i], [field]: val }
    update({ _attacks: attacks })
  }

  function removeAttack(i) {
    const attacks = (char?._attacks || []).filter((_, j) => j !== i)
    update({ _attacks: attacks })
  }

  // Spells
  function addSpell() {
    const spells = [...(char?._spells || []), { prepared: false, level: 0, school: '', name: '', range: '', duration: '', v: false, s: false, m: false, summary: '', expanded: false }]
    update({ _spells: spells })
  }

  function updateSpell(i, partial) {
    const spells = [...(char?._spells || [])]
    spells[i] = { ...spells[i], ...partial }
    update({ _spells: spells })
  }

  function removeSpell(i) {
    update({ _spells: (char?._spells || []).filter((_, j) => j !== i) })
  }

  function sortSpells(by) {
    const spells = [...(char?._spells || [])]
    spells.sort((a, b) => {
      if (by === 'level') return (a.level || 0) - (b.level || 0)
      if (by === 'school') return (a.school || 'zzz').localeCompare(b.school || 'zzz', 'fr')
      return 0
    })
    update({ _spells: spells })
  }

  // Equipment
  function addEquipment() {
    update({ _equipment: [...(char?._equipment || []), ''] })
  }

  function updateEquipment(i, val) {
    const eq = [...(char?._equipment || [])]
    eq[i] = val
    update({ _equipment: eq })
  }

  function removeEquipment(i) {
    update({ _equipment: (char?._equipment || []).filter((_, j) => j !== i) })
  }

  // Features
  function addFeature() {
    update({ _features: [...(char?._features || []), { name: '', desc: '' }] })
  }

  function updateFeature(i, partial) {
    const features = [...(char?._features || [])]
    features[i] = { ...features[i], ...partial }
    update({ _features: features })
  }

  function removeFeature(i) {
    update({ _features: (char?._features || []).filter((_, j) => j !== i) })
  }

  // Resources
  function addResource() {
    update({ _resources: [...(char?._resources || []), { name: '', max: 3, recharge: 'long', dots: Array(3).fill(false) }] })
  }

  function updateResource(i, partial) {
    const res = [...(char?._resources || [])]
    res[i] = { ...res[i], ...partial }
    // Resize dots if max changed
    if (partial.max !== undefined) {
      const newMax = parseInt(partial.max) || 0
      const dots = [...(res[i].dots || [])]
      while (dots.length < newMax) dots.push(false)
      res[i].dots = dots.slice(0, newMax)
    }
    update({ _resources: res })
  }

  function toggleResourceDot(resIdx, dotIdx) {
    const res = [...(char?._resources || [])]
    const dots = [...(res[resIdx].dots || [])]
    dots[dotIdx] = !dots[dotIdx]
    res[resIdx] = { ...res[resIdx], dots }
    update({ _resources: res })
  }

  function removeResource(i) {
    update({ _resources: (char?._resources || []).filter((_, j) => j !== i) })
  }

  // Tags
  function addTag(tag) {
    if (!tag?.trim()) return
    update({ _profLanguages: [...(char?._profLanguages || []), tag.trim()] })
  }

  function removeTag(i) {
    update({ _profLanguages: (char?._profLanguages || []).filter((_, j) => j !== i) })
  }

  // Death saves
  function toggleDeathSave(key) {
    update({ _deathSaves: { ...(char?._deathSaves || {}), [key]: !(char?._deathSaves?.[key]) } })
  }

  // Mobile tab visibility
  function isTabVisible(tab) {
    if (window.innerWidth > 768) return true
    return mobileTab === tab
  }

  // Add spell from browser
  function addSpellFromBrowser(spellData) {
    addSpell()
    const spells = [...(char?._spells || []), {
      prepared: false,
      level: spellData.level || 0,
      school: spellData.school || '',
      name: spellData.name || '',
      range: spellData.range || '',
      duration: spellData.duration || '',
      v: !!(spellData.components?.verbal),
      s: !!(spellData.components?.somatic),
      m: !!(spellData.components?.material),
      summary: spellData.desc?.[0] || '',
      expanded: false,
    }]
    update({ _spells: spells })
    showToast(`Sort "${spellData.name}" ajouté`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#d4a843', fontFamily: 'Cinzel, serif' }}>
      Chargement...
    </div>
  )

  if (!char) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: '#d8c8a8' }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <div>Personnage introuvable</div>
      <button onClick={() => navigate('/')} style={{ padding: '0.4rem 1rem', background: 'none', border: '1px solid #d4a843', color: '#d4a843', borderRadius: '3px', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.75rem' }}>
        ← Retour
      </button>
    </div>
  )

  const saves = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => {
    const isProf = !!(char?.[`save_prof_${k}`])
    const total = mod(abilities[k]) + (isProf ? prof : 0)
    return { k, total, isProf }
  })

  return (
    <div>
      {/* HEADER */}
      <header className={styles.sheetHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.portraitThumb} onClick={uploadPortrait} title="Cliquer pour changer le portrait">
            {char._portrait
              ? <img src={char._portrait} alt="Portrait" />
              : <span style={{ fontSize: '1.3rem' }}>👤</span>
            }
          </div>
          <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{char._classIcon || '⚔️'}</div>
          <div style={{ minWidth: 0 }}>
            <div className={styles.charName}>{char.char_name || '—'}</div>
            <div className={styles.headerClassName}>{char._className || 'Personnage'}</div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.btn} onClick={() => navigate('/')}>↩ Roster</button>
          <button className={`${styles.btn} ${styles.btnShortRest}`} onClick={shortRest}>☀️ Court</button>
          <button className={`${styles.btn} ${styles.btnLongRest}`} onClick={longRest}>🌙 Long</button>
          <button className={styles.btn} onClick={exportJSON} title="Exporter JSON">📤</button>
          <button className={styles.btn} onClick={importJSON} title="Importer JSON">📥</button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={resetSheet} title="Réinitialiser">🗑️</button>
        </div>
      </header>

      {/* BODY */}
      <div className={styles.sheetBody}>

        {/* INFO BAR */}
        <div className={styles.infoPanel}>
          <div className={styles.fieldRow}>
            <div className={`${styles.fieldGroup} ${styles.flex2}`}>
              <label className={styles.fieldLabel}>Nom du personnage</label>
              <input className={styles.fieldInput} type="text" placeholder="Entrez le nom..." {...field('char_name')} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Niveau</label>
              <input className={styles.fieldInput} type="number" min="1" max="20" style={{ textAlign: 'center' }} {...numField('level', 1)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Sous-classe</label>
              <input className={styles.fieldInput} type="text" placeholder="Archétype..." {...field('subclass')} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>DV ({char._hd ? `d${char._hd}` : '—'})</label>
              <input className={styles.fieldInput} type="number" min="0" max="20" style={{ textAlign: 'center' }} {...numField('hd_current', 1)} />
            </div>
          </div>

          {/* Mobile HP Widget */}
          <div className={styles.mobileHpWidget}>
            <div className={styles.hpBarContainer} style={{ height: 22, margin: '0.5rem 0 0.4rem' }}>
              <div className={styles.hpBarFill} style={{ width: `${hpPct}%`, background: hpBarBg }} />
              <div className={styles.hpBarText}>{hpLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              {[
                { label: 'PV actuels', field: 'hp_current' },
                { label: 'PV max', field: 'hp_max' },
                { label: 'Temp', field: 'hp_temp' },
              ].map(({ label, field: f }) => (
                <div key={f} style={{ flex: 1, textAlign: 'center' }}>
                  <label className={styles.fieldLabel} style={{ display: 'block', textAlign: 'center' }}>{label}</label>
                  <input
                    type="number"
                    className={styles.fieldInput}
                    style={{ textAlign: 'center', fontFamily: 'Cinzel, serif', fontSize: '1.2rem', fontWeight: 700 }}
                    {...numField(f)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow} style={{ marginTop: '0.5rem' }}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Race</label>
              <input className={styles.fieldInput} type="text" placeholder="Humain, Elfe..." {...field('race')} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Historique</label>
              <input className={styles.fieldInput} type="text" placeholder="Sage, Soldat..." {...field('background')} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Alignement</label>
              <select className={styles.fieldSelect} {...field('alignment')}>
                <option value="">— Choisir —</option>
                {['Loyal Bon','Neutre Bon','Chaotique Bon','Loyal Neutre','Neutre','Chaotique Neutre','Loyal Mauvais','Neutre Mauvais','Chaotique Mauvais'].map(a => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Expérience</label>
              <input className={styles.fieldInput} type="number" min="0" style={{ textAlign: 'center' }} {...numField('xp', 0)} />
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className={styles.sheetGrid}>

          {/* LEFT COLUMN */}
          <div className="col-left">

            {/* ABILITIES */}
            <div className={styles.panel} data-tab="tab-stats" style={mobileTab !== 'tab-stats' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Caractéristiques</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: '#7a6a55' }}>
                  Maîtrise: <strong style={{ color: '#d4a843' }}>+{prof}</strong>
                </span>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.abilityScores}>
                  {[
                    { k: 'str', label: 'FOR' }, { k: 'dex', label: 'DEX' }, { k: 'con', label: 'CON' },
                    { k: 'int', label: 'INT' }, { k: 'wis', label: 'SAG' }, { k: 'cha', label: 'CHA' }
                  ].map(({ k, label }) => {
                    const saveData = saves.find(s => s.k === k)
                    const abilField = `ability_${k}`
                    return (
                      <div key={k} className={styles.abilityBlock}>
                        <div className={styles.abilityName}>{label}</div>
                        <input
                          type="number" min="1" max="30"
                          className={styles.abilityScoreInput}
                          {...numField(abilField, 10)}
                        />
                        <div className={styles.abilityMod}>{modStr(char?.[abilField] ?? 10)}</div>
                        <div className={styles.abilitySave}>
                          <input
                            type="checkbox"
                            checked={!!(char?.[`save_prof_${k}`])}
                            onChange={() => update({ [`save_prof_${k}`]: !(char?.[`save_prof_${k}`]) })}
                          />
                          <label>JdS</label>
                          <span className={styles.abilitySaveVal}>{saveData?.total >= 0 ? '+' + saveData?.total : '' + saveData?.total}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* SKILLS */}
            <div className={styles.panel} data-tab="tab-stats" style={mobileTab !== 'tab-stats' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Compétences</span>
              </div>
              <div className={styles.panelBody}>
                <div style={{ fontSize: '0.65rem', color: '#7a6a55', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                  ☑ Maîtrise ▪ Expertise
                </div>
                {SKILLS.map((sk, i) => {
                  const isProf = !!(char?._skillProf?.[i])
                  const isExpert = !!(char?._skillExpert?.[i])
                  const m = skillMods[i]
                  return (
                    <div key={i} className={styles.skillItem}>
                      <input type="checkbox" checked={isProf} onChange={() => toggleSkillProf(i)} title="Maîtrise" style={{ accentColor: '#d4a843' }} />
                      <input type="checkbox" checked={isExpert} onChange={() => toggleSkillExpert(i)} title="Expertise" style={{ width: 12, height: 12, borderRadius: 2, accentColor: '#d4a843' }} />
                      <span className={styles.skillMod} style={{ color: isProf || isExpert ? '#d4a843' : '#d8c8a8' }}>{m >= 0 ? `+${m}` : `${m}`}</span>
                      <span className={styles.skillName}>{sk.name}</span>
                      <span className={styles.skillAbilityTag}>{sk.ability.toUpperCase()}</span>
                    </div>
                  )
                })}
                <div style={{ marginTop: '0.7rem', paddingTop: '0.5rem', borderTop: '1px solid #4a3420' }}>
                  <div className={styles.skillItem}>
                    <span className={styles.skillName} style={{ color: '#d4a843' }}>Perception passive</span>
                    <span className={styles.passivePerception}>{passivePerc}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* CENTER COLUMN */}
          <div className="col-center">

            {/* COMBAT */}
            <div className={styles.panel} data-tab="tab-combat" style={mobileTab !== 'tab-combat' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>⚔️ Combat</span>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.combatGrid}>
                  {[
                    { label: "Classe d'armure", field: 'ac', defaultVal: 10 },
                    { label: 'Initiative', field: 'initiative', defaultVal: 0 },
                    { label: 'Vitesse', field: 'speed', defaultVal: '9m', text: true },
                  ].map(({ label, field: f, defaultVal, text }) => (
                    <div key={f} className={styles.combatStat}>
                      <div className={styles.combatStatLabel}>{label}</div>
                      <div className={styles.combatStatValue}>
                        <input
                          type={text ? 'text' : 'number'}
                          value={char?.[f] ?? defaultVal}
                          onChange={e => update({ [f]: text ? e.target.value : Number(e.target.value) })}
                          style={{ fontSize: text ? '1rem' : '1.3rem' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* HP */}
                <div className={styles.hpSection}>
                  <div className={styles.hpBarContainer}>
                    <div className={styles.hpBarFill} style={{ width: `${hpPct}%`, background: hpBarBg }} />
                    <div className={styles.hpBarText}>{hpLabel}</div>
                  </div>
                  <div className={styles.hpInputs}>
                    {[
                      { label: 'PV actuels', f: 'hp_current' },
                      { label: 'PV max', f: 'hp_max' },
                      { label: 'PV temp', f: 'hp_temp' },
                    ].map(({ label, f }) => (
                      <div key={f} className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{label}</label>
                        <input className={styles.fieldInput} type="number" style={{ textAlign: 'center' }} {...numField(f)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Death saves */}
                <div style={{ marginTop: '0.6rem' }}>
                  <label className={styles.fieldLabel} style={{ textAlign: 'center', display: 'block' }}>
                    Jets de sauvegarde contre la mort
                  </label>
                  <div className={styles.deathSaves}>
                    <div className={`${styles.deathSaveGroup} ${styles.deathSaveSuccess}`}>
                      <label>Réussites</label>
                      <div className={styles.deathSaveChecks}>
                        {['s1','s2','s3'].map(k => (
                          <input key={k} type="checkbox" checked={!!(char?._deathSaves?.[k])} onChange={() => toggleDeathSave(k)} />
                        ))}
                      </div>
                    </div>
                    <div className={`${styles.deathSaveGroup} ${styles.deathSaveFailure}`}>
                      <label>Échecs</label>
                      <div className={styles.deathSaveChecks}>
                        {['f1','f2','f3'].map(k => (
                          <input key={k} type="checkbox" checked={!!(char?._deathSaves?.[k])} onChange={() => toggleDeathSave(k)} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hit dice */}
                <div className={styles.fieldRow} style={{ marginTop: '0.5rem' }}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>DV restants</label>
                    <input className={styles.fieldInput} type="text" placeholder="ex: 5d10" style={{ textAlign: 'center' }} {...field('hit_dice_remaining')} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Total DV</label>
                    <input className={styles.fieldInput} type="text" placeholder="ex: 5d10" style={{ textAlign: 'center' }} {...field('hit_dice_total')} />
                  </div>
                </div>
              </div>
            </div>

            {/* ATTACKS */}
            <div className={styles.panel} data-tab="tab-combat" style={mobileTab !== 'tab-combat' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>⚔️ Attaques</span>
                <button className={styles.panelAddBtn} onClick={addAttack} title="Ajouter attaque">+</button>
              </div>
              <div className={styles.panelBody}>
                <table className={styles.attacksTable}>
                  <thead>
                    <tr>
                      <th>Nom</th><th>Bonus</th><th>Dégâts</th><th>Type</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(char?._attacks || []).map((atk, i) => (
                      <tr key={i}>
                        <td><input type="text" placeholder="Nom" value={atk.name || ''} onChange={e => updateAttack(i, 'name', e.target.value)} /></td>
                        <td><input type="text" placeholder="+0" value={atk.bonus || ''} onChange={e => updateAttack(i, 'bonus', e.target.value)} style={{ width: 48, textAlign: 'center' }} /></td>
                        <td><input type="text" placeholder="1d8+3" value={atk.damage || ''} onChange={e => updateAttack(i, 'damage', e.target.value)} /></td>
                        <td><input type="text" placeholder="Tranchant" value={atk.type || ''} onChange={e => updateAttack(i, 'type', e.target.value)} /></td>
                        <td><button className={styles.attackDelete} onClick={() => removeAttack(i)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SPELLS */}
            {char?._spellType && (
              <div className={styles.panel} data-tab="tab-spells" style={mobileTab !== 'tab-spells' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelTitle}>🔮 Sorts</span>
                </div>
                <div className={styles.panelBody}>
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.8rem' }}>
                    {[
                      { label: 'DD des sorts', f: 'spell_dc' },
                      { label: "Bonus d'attaque", f: 'spell_attack' },
                    ].map(({ label, f }) => (
                      <div key={f} className={styles.combatStat}>
                        <div className={styles.combatStatLabel}>{label}</div>
                        <div className={styles.combatStatValue}>
                          <input type="number" {...numField(f, 10)} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className={styles.fieldLabel}>Emplacements de sorts</label>
                  <div className={styles.spellSlotsGrid}>
                    {Object.entries(spellSlots).map(([lvl, maxSlots]) => (
                      <div key={lvl} className={styles.spellSlotItem}>
                        <div className={styles.spellSlotLevel}>Niv.{lvl}</div>
                        <div className={styles.spellSlotDots}>
                          {Array.from({ length: maxSlots }, (_, i) => {
                            const key = `${lvl}_${i}`
                            return (
                              <div
                                key={i}
                                className={`${styles.spellSlotDot}${slotUsed[key] ? ' ' + styles.used : ''}`}
                                onClick={() => toggleSlot(lvl, i)}
                                title={slotUsed[key] ? 'Utilisé' : 'Disponible'}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.panelHeader} style={{ marginBottom: '0.4rem', padding: '0.3rem 0' }}>
                    <span className={styles.panelTitle} style={{ fontSize: '0.72rem' }}>Liste de sorts</span>
                    <div className={styles.spellSortBtns}>
                      <button className={styles.btnSmall} onClick={() => sortSpells('level')}>↕ Niv.</button>
                      <button className={styles.btnSmall} onClick={() => sortSpells('school')}>↕ École</button>
                      <button className={`${styles.btnSmall} ${styles.btnArcane}`} onClick={() => setSpellBrowserOpen(true)}>📚 Bibliothèque</button>
                      <button className={styles.panelAddBtn} onClick={addSpell}>+</button>
                    </div>
                  </div>

                  <div className={styles.spellList}>
                    {(char?._spells || []).map((sp, i) => (
                      <SpellItem
                        key={i}
                        spell={sp}
                        onChange={partial => updateSpell(i, partial)}
                        onRemove={() => removeSpell(i)}
                        styles={styles}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PERSONALITY */}
            <div className={styles.panel} data-tab="tab-perso" style={mobileTab !== 'tab-perso' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>📜 Personnalité</span>
              </div>
              <div className={styles.panelBody}>
                {[
                  { label: 'Traits de personnalité', f: '_traits', placeholder: 'Décrivez vos traits...' },
                  { label: 'Idéaux', f: '_ideals', placeholder: 'Ce en quoi vous croyez...' },
                  { label: 'Liens', f: '_bonds', placeholder: 'Vos connexions...' },
                  { label: 'Défauts', f: '_flaws', placeholder: 'Vos faiblesses...' },
                ].map(({ label, f, placeholder }) => (
                  <div key={f} className={styles.fieldGroup} style={{ marginBottom: '0.6rem' }}>
                    <label className={styles.fieldLabel}>{label}</label>
                    <textarea
                      className={styles.notesArea}
                      style={{ minHeight: 46 }}
                      placeholder={placeholder}
                      value={char?.[f] || ''}
                      onChange={e => update({ [f]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="col-right">

            {/* RESOURCES */}
            <div className={styles.panel} data-tab="tab-traits" style={mobileTab !== 'tab-traits' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>⚡ Ressources</span>
                <button className={styles.panelAddBtn} onClick={addResource}>+</button>
              </div>
              <div className={styles.panelBody} style={{ padding: '0.6rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#7a6a55', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                  Cliquer sur un point pour l'utiliser.
                </div>
                {(char?._resources || []).map((res, i) => (
                  <div key={i} className={styles.resourceItem}>
                    <div className={styles.resourceHeaderRow}>
                      <input
                        type="text"
                        className={styles.resourceName}
                        placeholder="Rage, Ki..."
                        value={res.name || ''}
                        onChange={e => updateResource(i, { name: e.target.value })}
                      />
                      <select
                        className={styles.resourceRecharge}
                        value={res.recharge || 'long'}
                        onChange={e => updateResource(i, { recharge: e.target.value })}
                      >
                        <option value="long">⟳ Long</option>
                        <option value="short">⟳ Court</option>
                        <option value="manual">Manuel</option>
                      </select>
                      <label className={styles.resourceMaxLabel}>
                        Max
                        <input
                          type="number" min="0" max="30"
                          className={styles.resourceMaxInput}
                          value={res.max || 0}
                          onChange={e => updateResource(i, { max: parseInt(e.target.value) || 0 })}
                        />
                      </label>
                      <button className={styles.equipmentDelete} onClick={() => removeResource(i)}>×</button>
                    </div>
                    <div className={styles.resourceDotsRow}>
                      {(res.dots || []).map((spent, j) => (
                        <div
                          key={j}
                          className={`${styles.resourceDot}${spent ? ' ' + styles.spent : ''}`}
                          onClick={() => toggleResourceDot(i, j)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FEATURES */}
            <div className={styles.panel} data-tab="tab-traits" style={mobileTab !== 'tab-traits' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>📋 Capacités & Traits</span>
                <button className={styles.panelAddBtn} onClick={addFeature}>+</button>
              </div>
              <div className={styles.panelBody}>
                {(char?._features || []).map((feat, i) => (
                  <div key={i} className={styles.featureEdit}>
                    <div className={styles.featureFields}>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        placeholder="Nom du trait"
                        value={feat.name || ''}
                        onChange={e => updateFeature(i, { name: e.target.value })}
                      />
                      <textarea
                        className={styles.notesArea}
                        placeholder="Description…"
                        style={{ minHeight: 38, fontSize: '0.85rem' }}
                        value={feat.desc || ''}
                        onChange={e => updateFeature(i, { desc: e.target.value })}
                      />
                    </div>
                    <button className={styles.equipmentDelete} onClick={() => removeFeature(i)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* EQUIPMENT */}
            <div className={styles.panel} data-tab="tab-gear" style={mobileTab !== 'tab-gear' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>🎒 Équipement</span>
                <button className={styles.panelAddBtn} onClick={addEquipment}>+</button>
              </div>
              <div className={styles.panelBody}>
                {(char?._equipment || []).map((item, i) => (
                  <div key={i} className={styles.equipmentItem}>
                    <input
                      type="text"
                      placeholder="…"
                      value={item}
                      onChange={e => updateEquipment(i, e.target.value)}
                    />
                    <button className={styles.equipmentDelete} onClick={() => removeEquipment(i)}>×</button>
                  </div>
                ))}
                <div style={{ marginTop: '0.8rem' }}>
                  <label className={styles.fieldLabel}>Monnaie</label>
                  <div className={styles.currencyGrid}>
                    {[
                      { label: 'PC', f: 'cp' },
                      { label: 'PA', f: 'sp' },
                      { label: 'PE', f: 'ep' },
                      { label: 'PO', f: 'gp' },
                      { label: 'PP', f: 'pp' },
                    ].map(({ label, f }) => (
                      <div key={f} className={styles.currencyItem}>
                        <div className={styles.currencyLabel}>{label}</div>
                        <input type="number" className={styles.currencyInput} min="0" {...numField(f)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PROFICIENCIES & LANGUAGES */}
            <div className={styles.panel} data-tab="tab-gear" style={mobileTab !== 'tab-gear' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>🗣️ Maîtrises & Langues</span>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.tagList}>
                  {(char?._profLanguages || []).map((tag, i) => (
                    <span key={i} className={styles.tag}>
                      {tag}
                      <button className={styles.tagDelete} onClick={() => removeTag(i)}>×</button>
                    </span>
                  ))}
                </div>
                <TagInput onAdd={addTag} styles={styles} />
              </div>
            </div>

            {/* BACKSTORY & NOTES */}
            <div className={styles.panel} data-tab="tab-perso" style={mobileTab !== 'tab-perso' && typeof window !== 'undefined' && window.innerWidth <= 768 ? { display: 'none' } : {}}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>📖 Histoire & Notes</span>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.fieldGroup} style={{ marginBottom: '0.6rem' }}>
                  <label className={styles.fieldLabel}>Histoire du personnage</label>
                  <textarea className={styles.notesArea} style={{ minHeight: 80 }} placeholder="L'histoire de votre personnage..."
                    value={char?._backstory || ''} onChange={e => update({ _backstory: e.target.value })} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Notes de jeu</label>
                  <textarea className={styles.notesArea} style={{ minHeight: 80 }} placeholder="Notes diverses..."
                    value={char?._notes || ''} onChange={e => update({ _notes: e.target.value })} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MOBILE TAB BAR */}
      <nav className={styles.mobileTabBar}>
        {[
          { id: 'tab-combat', icon: '⚔️', label: 'Combat' },
          { id: 'tab-stats', icon: '📊', label: 'Stats' },
          { id: 'tab-spells', icon: '🔮', label: 'Sorts' },
          { id: 'tab-traits', icon: '⚡', label: 'Traits' },
          { id: 'tab-gear', icon: '🎒', label: 'Sac' },
          { id: 'tab-perso', icon: '📜', label: 'Perso' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`${styles.mobileTabBtn}${mobileTab === tab.id ? ' ' + styles.active : ''}`}
            onClick={() => setMobileTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* SPELL BROWSER */}
      {spellBrowserOpen && (
        <SpellBrowserModal
          onClose={() => setSpellBrowserOpen(false)}
          onAdd={addSpellFromBrowser}
        />
      )}

      {/* TOASTS */}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
      </div>
    </div>
  )
}

function SpellItem({ spell, onChange, onRemove, styles }) {
  const [expanded, setExpanded] = useState(spell.expanded || false)

  return (
    <div className={`${styles.spellItem}${expanded ? ' ' + styles.expanded : ''}`}>
      <div className={styles.spellItemActions}>
        <button className={styles.spellExpandBtn} onClick={() => setExpanded(!expanded)} title="Résumé">▾</button>
        <button className={styles.spellDelete} onClick={onRemove}>×</button>
      </div>
      <div className={styles.spellItemRow}>
        <input type="checkbox" className={styles.spellPreparedCb} title="Préparé" checked={!!spell.prepared} onChange={e => onChange({ prepared: e.target.checked })} />
        <select
          className={styles.spellLevelSelect}
          value={spell.level ?? 0}
          onChange={e => onChange({ level: parseInt(e.target.value) || 0 })}
          title="Niveau"
        >
          <option value="0">Tour</option>
          {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          className={styles.spellSchoolSelect}
          value={spell.school || ''}
          onChange={e => onChange({ school: e.target.value })}
          title="École"
        >
          <option value="">—</option>
          {SPELL_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="text" className={styles.spellNameInput} placeholder="Nom du sort" value={spell.name || ''} onChange={e => onChange({ name: e.target.value })} />
        <input type="text" className={styles.spellRangeInput} placeholder="Portée" value={spell.range || ''} onChange={e => onChange({ range: e.target.value })} />
        <input type="text" className={styles.spellDurationInput} placeholder="Durée" value={spell.duration || ''} onChange={e => onChange({ duration: e.target.value })} />
        {['v','s','m'].map(comp => (
          <label key={comp} className={styles.spellComponent}>
            <input type="checkbox" checked={!!spell[comp]} onChange={e => onChange({ [comp]: e.target.checked })} />
            {comp.toUpperCase()}
          </label>
        ))}
      </div>
      {expanded && (
        <textarea
          className={styles.spellSummary}
          placeholder="Résumé du sort, effets, conditions…"
          value={spell.summary || ''}
          onChange={e => onChange({ summary: e.target.value })}
          style={{ display: 'block', maxHeight: 'none', padding: '0.4rem', minHeight: 50 }}
        />
      )}
    </div>
  )
}

function TagInput({ onAdd, styles }) {
  const [value, setValue] = useState('')

  function handleAdd() {
    if (!value.trim()) return
    onAdd(value.trim())
    setValue('')
  }

  return (
    <div className={styles.tagInputWrap}>
      <input
        type="text"
        className={styles.tagInput}
        placeholder="Ajouter..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
      />
      <button
        onClick={handleAdd}
        style={{ padding: '0.3rem 0.6rem', background: 'none', border: '1px solid #4a3420', borderRadius: '3px', color: '#d4a843', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.75rem' }}
      >
        +
      </button>
    </div>
  )
}

// Spell Browser Modal
function SpellBrowserModal({ onClose, onAdd }) {
  const [lang, setLang] = useState('fr')
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterSchool, setFilterSchool] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [selected, setSelected] = useState(null)

  // Try to load spell bundles
  const allSpells = React.useMemo(() => {
    try {
      if (lang === 'fr' && window.DND_SPELLS_FR?.length) return window.DND_SPELLS_FR
      if (window.DND_SPELLS_EN?.length) return window.DND_SPELLS_EN
    } catch {}
    return []
  }, [lang])

  const filtered = React.useMemo(() => {
    let list = allSpells
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(sp => (sp.name || '').toLowerCase().includes(q) || (sp.name_en || '').toLowerCase().includes(q))
    if (filterLevel !== '') list = list.filter(sp => (sp.level ?? '') === parseInt(filterLevel))
    if (filterSchool) list = list.filter(sp => (sp.school || '').toLowerCase().includes(filterSchool.toLowerCase()))
    if (filterClass) list = list.filter(sp => (sp.classes || []).some(c => (c.name || c).toLowerCase().includes(filterClass.toLowerCase())))
    return list.slice(0, 300)
  }, [allSpells, search, filterLevel, filterSchool, filterClass])

  const schools = React.useMemo(() => [...new Set(allSpells.map(sp => sp.school).filter(Boolean))].sort(), [allSpells])
  const classes = React.useMemo(() => {
    const set = new Set()
    allSpells.forEach(sp => (sp.classes || []).forEach(c => set.add(c.name || c)))
    return [...set].sort()
  }, [allSpells])

  function modStr(score) {
    const m = Math.floor(((parseInt(score)||10)-10)/2)
    return (m >= 0 ? '+' : '') + m
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#1a1410', border: '1px solid #d4a843', borderRadius: 6, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 1100, maxHeight: '100%', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', borderBottom: '1px solid #4a3420', background: 'rgba(0,0,0,0.2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 600, color: '#d4a843' }}>📚 Bibliothèque de Sorts</span>
          <span style={{ fontSize: '0.7rem', color: '#7a6a55', flex: 1 }}>{filtered.length} sorts</span>
          <div style={{ display: 'flex', gap: '0.2rem', background: '#0d0b07', borderRadius: 4, padding: 2 }}>
            {['fr','en'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ background: lang === l ? '#2d2520' : 'none', border: 'none', color: lang === l ? '#d4a843' : '#7a6a55', fontFamily: 'Cinzel, serif', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 3, cursor: 'pointer' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7a6a55', fontSize: '1.3rem', cursor: 'pointer', padding: '0 0.3rem' }}>✕</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.5rem 0.8rem', borderBottom: '1px solid #4a3420', background: 'rgba(0,0,0,0.1)' }}>
          <input
            type="text"
            placeholder="🔍 Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 140, background: '#231d15', border: '1px solid #4a3420', color: '#d8c8a8', padding: '0.3rem 0.5rem', borderRadius: 3, fontSize: '0.8rem', fontFamily: 'EB Garamond, serif' }}
          />
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={{ background: '#231d15', border: '1px solid #4a3420', color: '#d8c8a8', padding: '0.3rem', borderRadius: 3, fontSize: '0.75rem' }}>
            <option value="">Tous niveaux</option>
            <option value="0">Tour de magie</option>
            {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Niveau {l}</option>)}
          </select>
          <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} style={{ background: '#231d15', border: '1px solid #4a3420', color: '#d8c8a8', padding: '0.3rem', borderRadius: 3, fontSize: '0.75rem' }}>
            <option value="">Toutes écoles</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ background: '#231d15', border: '1px solid #4a3420', color: '#d8c8a8', padding: '0.3rem', borderRadius: 3, fontSize: '0.75rem' }}>
            <option value="">Toutes classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.3rem 0' }}>
            {allSpells.length === 0 ? (
              <div style={{ color: '#7a6a55', padding: '2rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                Bundles de sorts non chargés.<br />
                Assurez-vous que les fichiers <code>dnd_db/bundle_spells_*.js</code> sont chargés.
              </div>
            ) : filtered.map((sp, i) => (
              <div
                key={sp.index || i}
                onClick={() => setSelected(sp)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.35rem 0.8rem', cursor: 'pointer', transition: 'background 0.1s',
                  borderBottom: '1px solid rgba(74,52,32,0.2)',
                  background: selected === sp ? 'rgba(212,168,67,0.12)' : 'transparent',
                }}
                onMouseEnter={e => { if (selected !== sp) e.currentTarget.style.background = 'rgba(212,168,67,0.06)' }}
                onMouseLeave={e => { if (selected !== sp) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ flex: 1, fontSize: '0.88rem' }}>{sp.name}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: '#d4a843', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 3, padding: '0.1rem 0.3rem' }}>
                  {sp.level === 0 ? 'Tour' : `Niv.${sp.level}`}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#7a6a55', minWidth: 80, textAlign: 'right' }}>{sp.school || '—'}</span>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div style={{ width: 340, borderLeft: '1px solid #4a3420', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)', fontSize: '0.82rem', color: '#d8c8a8', flexShrink: 0 }}>
            {!selected ? (
              <div style={{ color: '#7a6a55', fontStyle: 'italic', textAlign: 'center', paddingTop: '3rem' }}>
                Cliquez sur un sort pour voir les détails.
              </div>
            ) : (
              <SpellPreview spell={selected} onAdd={() => onAdd(selected)} />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function SpellPreview({ spell, onAdd }) {
  function esc(s) { return String(s || '') }
  return (
    <div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#d4a843', fontWeight: 700, marginBottom: '0.2rem' }}>{spell.name}</div>
      <div style={{ fontSize: '0.78rem', color: '#7a6a55', fontStyle: 'italic', marginBottom: '0.5rem' }}>
        {spell.level === 0 ? 'Tour de magie' : `Sort de niveau ${spell.level}`}
        {spell.school ? ` — ${spell.school}` : ''}
        {spell.ritual ? ' (Rituel)' : ''}
        {spell.concentration ? ' ⟳ Concentration' : ''}
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid #4a3420', margin: '0.5rem 0' }} />
      {[
        ['Temps d\'incantation', spell.casting_time],
        ['Portée', spell.range],
        ['Composantes', [spell.components?.verbal && 'V', spell.components?.somatic && 'S', spell.components?.material && 'M'].filter(Boolean).join(', ')],
        ['Durée', spell.duration],
        ['Classes', (spell.classes || []).map(c => c.name || c).join(', ')],
      ].filter(([, v]) => v).map(([label, val]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.82rem' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a6a55' }}>{label}</span>
          <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{esc(val)}</span>
        </div>
      ))}
      <hr style={{ border: 'none', borderTop: '1px solid #4a3420', margin: '0.6rem 0' }} />
      {(spell.desc || []).map((p, i) => (
        <p key={i} style={{ marginBottom: '0.5rem', lineHeight: 1.6 }}>{p}</p>
      ))}
      {spell.higher_level?.length > 0 && (
        <>
          <p style={{ fontWeight: 700, fontStyle: 'italic', marginTop: '0.5rem', color: '#d4a843' }}>Aux niveaux supérieurs</p>
          {spell.higher_level.map((p, i) => <p key={i} style={{ marginBottom: '0.3rem' }}>{p}</p>)}
        </>
      )}
      <button onClick={onAdd}
        style={{ width: '100%', padding: '0.5rem', background: 'rgba(212,168,67,0.1)', border: '1px solid #d4a843', borderRadius: 3, color: '#d4a843', fontFamily: 'Cinzel, serif', fontSize: '0.72rem', cursor: 'pointer', marginTop: '0.8rem', transition: 'all 0.15s' }}
        onMouseEnter={e => e.target.style.background = 'rgba(212,168,67,0.2)'}
        onMouseLeave={e => e.target.style.background = 'rgba(212,168,67,0.1)'}
      >
        + Ajouter à la fiche
      </button>
    </div>
  )
}
