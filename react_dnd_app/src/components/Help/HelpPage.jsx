import React, { useState } from 'react'

const COLORS = {
  bg: '#0d0b07',
  panel: '#1a1410',
  panelAlt: '#12100c',
  gold: '#d4a843',
  goldDim: 'rgba(212,168,67,0.15)',
  goldBorder: 'rgba(212,168,67,0.3)',
  text: '#d8c8a8',
  textDim: '#7a6a55',
  border: '#4a3420',
  borderLight: '#5a4430',
  accent: '#c0392b',
}

const s = {
  page: {
    background: COLORS.bg,
    minHeight: '100vh',
    padding: '2rem 1rem',
    fontFamily: "'EB Garamond', Georgia, serif",
    color: COLORS.text,
  },
  inner: {
    maxWidth: '860px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  headerTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: '2rem',
    color: COLORS.gold,
    margin: 0,
    letterSpacing: '0.1em',
    textShadow: '0 0 30px rgba(212,168,67,0.3)',
  },
  headerSub: {
    color: COLORS.textDim,
    fontSize: '0.95rem',
    marginTop: '0.5rem',
    fontStyle: 'italic',
  },
  divider: {
    border: 'none',
    borderTop: `1px solid ${COLORS.border}`,
    margin: '0.5rem 0 2rem',
  },
  section: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    marginBottom: '1rem',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.9rem 1.2rem',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.15s',
    fontFamily: "'Cinzel', serif",
    fontSize: '0.9rem',
    letterSpacing: '0.08em',
    color: COLORS.gold,
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  },
  sectionHeaderOpen: {
    background: COLORS.goldDim,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  chevron: {
    fontSize: '0.7rem',
    color: COLORS.textDim,
    transition: 'transform 0.2s',
  },
  sectionBody: {
    padding: '1.2rem 1.4rem',
    borderTop: `1px solid ${COLORS.border}`,
  },
  intro: {
    color: COLORS.text,
    fontSize: '0.95rem',
    marginBottom: '1rem',
    lineHeight: '1.6',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 0.5rem 0',
  },
  listItem: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    padding: '0.35rem 0',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    color: COLORS.text,
    borderBottom: `1px solid rgba(74,52,32,0.4)`,
  },
  listItemLast: {
    borderBottom: 'none',
  },
  icon: {
    flexShrink: 0,
    width: '1.4rem',
    textAlign: 'center',
    fontSize: '1rem',
  },
  label: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.75rem',
    color: COLORS.gold,
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '0.1rem',
  },
  tip: {
    color: COLORS.textDim,
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  subHeading: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.78rem',
    color: COLORS.textDim,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: '1.2rem',
    marginBottom: '0.5rem',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '0.3rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    marginTop: '1rem',
  },
  th: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: COLORS.gold,
    padding: '0.5rem 0.8rem',
    textAlign: 'left',
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.panelAlt,
  },
  td: {
    padding: '0.5rem 0.8rem',
    borderBottom: `1px solid rgba(74,52,32,0.5)`,
    verticalAlign: 'top',
  },
  tdKey: {
    fontFamily: 'monospace',
    fontSize: '0.82rem',
    color: COLORS.gold,
    whiteSpace: 'nowrap',
    background: 'rgba(212,168,67,0.07)',
    borderRadius: '3px',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '0.82rem',
    background: 'rgba(0,0,0,0.4)',
    color: '#a8d8a8',
    padding: '0.1em 0.4em',
    borderRadius: '3px',
    border: `1px solid rgba(74,52,32,0.6)`,
  },
  noteBox: {
    background: 'rgba(212,168,67,0.07)',
    border: `1px solid ${COLORS.goldBorder}`,
    borderRadius: '4px',
    padding: '0.6rem 0.9rem',
    fontSize: '0.88rem',
    color: COLORS.textDim,
    marginTop: '1rem',
    lineHeight: '1.55',
  },
  footer: {
    textAlign: 'center',
    marginTop: '3rem',
    color: COLORS.textDim,
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
}

function FeatureItem({ icon, label, children, last }) {
  return (
    <li style={{ ...s.listItem, ...(last ? s.listItemLast : {}) }}>
      <span style={s.icon}>{icon}</span>
      <div>
        {label && <span style={s.label}>{label}</span>}
        {children}
      </div>
    </li>
  )
}

function Section({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false)
  return (
    <div style={s.section}>
      <button
        style={{
          ...s.sectionHeader,
          ...(open ? s.sectionHeaderOpen : {}),
        }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(212,168,67,0.07)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <span>{title}</span>
        <span style={{ ...s.chevron, transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      </button>
      {open && (
        <div style={s.sectionBody}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* Header */}
        <div style={s.header}>
          <h1 style={s.headerTitle}>📖 Documentation</h1>
          <p style={s.headerSub}>
            Guide du Maître du Donjon — D&D Master Screen
          </p>
          <hr style={s.divider} />
        </div>

        {/* ── Fiches Personnages ── */}
        <Section title="🧙 Fiches Personnages" defaultOpen={true}>
          <p style={s.intro}>
            Gérez l'ensemble de votre groupe depuis un seul endroit. Chaque fiche est stockée dans Firestore et accessible depuis n'importe quel appareil.
          </p>
          <ul style={s.list}>
            <FeatureItem icon="➕" label="Création">
              Créez un personnage en choisissant sa classe. Les modificateurs, le bonus de maîtrise et la perception passive sont calculés automatiquement.
            </FeatureItem>
            <FeatureItem icon="⠿" label="Panneaux glisser-déposer">
              Saisissez la poignée ⠿ dans l'en-tête d'un panneau pour le déplacer entre les 3 colonnes. La disposition est sauvegardée par personnage. Bouton ⊞ pour réinitialiser.
            </FeatureItem>
            <FeatureItem icon="📚" label="Sorts">
              Navigueur de sorts (FR/EN), réorganisation par glisser-déposer, tri par niveau ou école. La syntaxe <span style={s.code}>[[sort]]</span> lie un sort aux données de l'API D&D 5e. Champ "description courte" pour référence rapide.
            </FeatureItem>
            <FeatureItem icon="🔵" label="Emplacements de sorts">
              Cliquez sur les points pour marquer l'utilisation des emplacements. Restaurés au repos long.
            </FeatureItem>
            <FeatureItem icon="❤️" label="Points de vie">
              Barre de PV avec code couleur visuel. Boutons Repos Long / Repos Court pour restaurer les ressources.
            </FeatureItem>
            <FeatureItem icon="🖼️" label="Portrait">
              Cliquez sur le portrait ou glissez-déposez une image pour la changer.
            </FeatureItem>
            <FeatureItem icon="📤" label="Export / Import" last>
              Exportez et importez des fiches au format JSON pour la sauvegarde ou le partage.
            </FeatureItem>
          </ul>
        </Section>

        {/* ── DM Screen ── */}
        <Section title="🖥️ DM Screen">
          <p style={s.intro}>
            Contrôlez l'atmosphère de votre table. Envoyez des scènes, des effets et des sons sur un second écran face aux joueurs.
          </p>

          <p style={s.subHeading}>Scènes & Effets Visuels</p>
          <ul style={s.list}>
            <FeatureItem icon="🪟" label="Écran secondaire">
              Ouvrez une fenêtre joueur séparée. Faites-la glisser sur un projecteur ou un second moniteur, puis appuyez sur <strong>F11</strong> pour le plein écran.
            </FeatureItem>
            <FeatureItem icon="🌄" label="Scènes">
              Grille de scènes prédéfinies et personnalisées (images / vidéos). Cliquez pour envoyer immédiatement sur le second écran.
            </FeatureItem>
            <FeatureItem icon="🌧️" label="Overlays & Effets">
              Pluie, neige, tonnerre, feu, magie, vignette, brume, obscurité. Bouton ⚙ pour le volume. Liez un son pour qu'il se lance automatiquement avec l'effet.
            </FeatureItem>
            <FeatureItem icon="⛈️" label="Mode Tempête ++" last>
              Active pluie + tonnerre + obscurité en un clic.
            </FeatureItem>
          </ul>

          <p style={s.subHeading}>Sons</p>
          <ul style={s.list}>
            <FeatureItem icon="🔊" label="Soundboard">
              Sons synthétisés instantanés : ⚡ Tonnerre (synchronisé avec les éclairs visuels), 🔥 Boule de feu, ⚔️ Épée, 🗡️ Dégainage.
            </FeatureItem>
            <FeatureItem icon="🎵" label="Sons personnalisés">
              Importez vos propres fichiers audio, renommez-les, lisez-les avec ▶. Liez-les à des effets d'overlay pour des boucles ambiantes.
            </FeatureItem>
            <FeatureItem icon="🎭" label="Ambiances" last>
              Créez des presets ambiants personnalisés (ex. Taverne 🍺) liés à vos sons importés.
            </FeatureItem>
          </ul>

          <p style={s.subHeading}>Combat</p>
          <ul style={s.list}>
            <FeatureItem icon="⚔️" label="Ordre d'initiative">
              Tracker complet : glisser-déposer pour réordonner, bouton ↺ R1 pour réinitialiser, navigation tour précédent / suivant, compteur de rounds automatique.
            </FeatureItem>
            <FeatureItem icon="🐉" label="Monstres (barre du bas)" last>
              Barre fixe en bas avec le Monster Dock. Parcourez la bibliothèque D&D 5e (FR/EN), créez des monstres personnalisés, ajoutez-les au combat avec suivi des PV (−10/−5/−/+/+5/+10), barres de santé colorées et duplication automatique.
            </FeatureItem>
          </ul>
        </Section>

        {/* ── Wiki & Notes ── */}
        <Section title="📖 Wiki & Notes">
          <p style={s.intro}>
            Un système de notes à la Obsidian pour construire votre monde. Reliez vos lieux, PNJ et sessions par des liens wiki.
          </p>

          <p style={s.subHeading}>Types de Notes</p>
          <ul style={s.list}>
            <FeatureItem icon="📝" label="Note">Texte libre — idéal pour les faits du monde, les rumeurs, les factions.</FeatureItem>
            <FeatureItem icon="👤" label="PNJ">Portrait, apparence, personnalité et un champ secret caché (invisible en Vue Graphe).</FeatureItem>
            <FeatureItem icon="📍" label="Lieu">Description de lieu. Peut être associé à une épingle sur une carte.</FeatureItem>
            <FeatureItem icon="🗓️" label="Session" last>Journal de session avec date et événements clés.</FeatureItem>
          </ul>

          <p style={s.subHeading}>Éditeur</p>
          <ul style={s.list}>
            <FeatureItem icon="✍️" label="Vue divisée">
              Zone de texte (gauche) + aperçu markdown en direct (droite). Markdown : <span style={s.code}># titres</span>, <span style={s.code}>**gras**</span>, <span style={s.code}>*italique*</span>, <span style={s.code}>- listes</span>.
            </FeatureItem>
            <FeatureItem icon="🔗" label="Liens wiki">
              Tapez <span style={s.code}>[[Titre d'une note]]</span> pour créer un lien. Un menu de complétion automatique apparaît pendant la saisie.
            </FeatureItem>
            <FeatureItem icon="↩️" label="Rétroliens" last>
              Panneau droit affichant quelles notes pointent vers la note courante, plus les liens sortants.
            </FeatureItem>
          </ul>

          <p style={s.subHeading}>Vue Graphe 🕸️</p>
          <ul style={s.list}>
            <FeatureItem icon="🕸️" label="Graphe de force">
              Toutes les notes comme nœuds reliés par leurs liens wiki. Couleurs : or=Note, bleu=PNJ, vert=Lieu, rouge=Session.
            </FeatureItem>
            <FeatureItem icon="🖱️" label="Navigation" last>
              Molette pour zoomer, glisser le fond pour se déplacer, glisser un nœud pour le repositionner, cliquer pour ouvrir la note.
            </FeatureItem>
          </ul>

          <p style={s.subHeading}>Cartes</p>
          <ul style={s.list}>
            <FeatureItem icon="🗺️" label="Import de carte">
              Importez une image de carte. Cliquez pour placer des épingles et liez chacune à une note Lieu.
            </FeatureItem>
            <FeatureItem icon="🖥" label="Afficher sur l'écran" last>
              Ouvre la carte en plein écran sur la fenêtre joueur avec les épingles superposées.
            </FeatureItem>
          </ul>
        </Section>

        {/* ── Configuration ── */}
        <Section title="⚙️ Configuration & Déploiement">
          <p style={s.intro}>
            Mise en place du projet et configuration Firebase.
          </p>
          <ul style={s.list}>
            <FeatureItem icon="📦" label="Installation">
              <span style={s.code}>npm install</span> puis <span style={s.code}>npm run dev</span> pour lancer le serveur de développement.
            </FeatureItem>
            <FeatureItem icon="🔑" label="Variables d'environnement">
              Créez un fichier <span style={s.code}>.env</span> à la racine avec vos clés Firebase (<span style={s.code}>VITE_FIREBASE_API_KEY</span>, etc.).
            </FeatureItem>
            <FeatureItem icon="🔒" label="Règles Firestore">
              Appliquez les règles de sécurité dans la console Firebase pour que chaque compte DM n'ait accès qu'à ses propres données.
            </FeatureItem>
            <FeatureItem icon="🏗️" label="Build de production">
              <span style={s.code}>npm run build</span> génère les fichiers statiques dans <span style={s.code}>dist/</span>. Déployez sur Firebase Hosting, Vercel ou tout hébergeur statique.
            </FeatureItem>
            <FeatureItem icon="⚠️" label="Bloqueurs de publicités" last>
              Les bloqueurs de pubs peuvent interférer avec Firebase sur <span style={s.code}>localhost</span>. Désactivez-les pour <span style={s.code}>localhost</span> en cas de problème de connexion.
            </FeatureItem>
          </ul>

          <div style={s.noteBox}>
            💡 Les données D&D 5e (sorts, monstres) sont chargées depuis des bundles JS précompilés dans <span style={s.code}>public/dnd_db/</span> — aucune requête API externe n'est nécessaire pendant le jeu.
          </div>
        </Section>

        {/* ── Raccourcis & Astuces ── */}
        <div style={{ ...s.section, marginTop: '2rem' }}>
          <div style={{ ...s.sectionHeader, cursor: 'default', pointerEvents: 'none' }}>
            ✨ Raccourcis & Astuces
          </div>
          <div style={s.sectionBody}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Action</th>
                  <th style={s.th}>Comment</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Plein écran second écran', 'Ouvrir la fenêtre joueur → F11'],
                  ['Lier un sort au wiki', 'Saisir [[nom du sort]] dans la description'],
                  ['Réinitialiser la disposition des panneaux', 'Bouton ⊞ en haut de la fiche'],
                  ['Boucle ambiante automatique', 'Sons personnalisés → lier à un overlay'],
                  ['Dupliquer un monstre', 'Bouton duplique dans la barre du bas — numérotation auto'],
                  ['Navigation dans le graphe', 'Molette = zoom · glisser fond = pan · clic nœud = ouvrir'],
                  ['Épingles de carte sur second écran', "\uD83D\uDDA5 Afficher sur l\u2019\u00E9cran depuis l\u2019\u00E9diteur de carte"],
                  ['Sauvegarde de fiche', 'Export JSON depuis le menu de la fiche personnage'],
                ].map(([action, how], i, arr) => (
                  <tr key={i}>
                    <td style={{ ...s.td, ...s.tdKey, ...(i === arr.length - 1 ? { borderBottom: 'none' } : {}) }}>{action}</td>
                    <td style={{ ...s.td, ...(i === arr.length - 1 ? { borderBottom: 'none' } : {}) }}>{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <p>⚔ D&D Master Screen — Que vos jets soient favorables.</p>
        </div>

      </div>
    </div>
  )
}
