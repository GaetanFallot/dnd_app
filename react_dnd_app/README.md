# ⚔️ D&D Master Screen

> *"A Dungeon Master's power lies not in the roll of dice, but in the tools at hand."*

A full-stack Dungeon Master toolkit built with **React 18 + Vite + Firebase**. Run your sessions with authority — manage character sheets, set the atmosphere on a second screen, and keep your world lore organized like a true archmage.

---

## 🗺️ App Overview

Three kingdoms accessible from the top navigation:

| Section | Purpose |
|---|---|
| **Personnages** | Character sheets for the whole party |
| **DM Screen** | Ambient scene management & soundboard |
| **Wiki** | Obsidian-like linked notes for world-building |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Auth & Database | Firebase Auth (email/password) + Firestore |
| Styles | CSS Modules |
| Sound | Web Audio API (synthesized — no external files needed) |
| Visual Effects | HTML5 Canvas (particle effects, graph view) |
| PWA | vite-plugin-pwa |

---

## ⚗️ Setup & Installation

### Prerequisites

- Node.js 18+
- A Firebase project with **Authentication** (email/password) and **Firestore** enabled

### Steps

```bash
git clone ...
cd react_dnd_app
npm install
```

### 🔑 Environment Variables

Create a `.env` file at the project root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 🔒 Firestore Security Rules

Apply these rules in your Firebase Console (Firestore → Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each DM's data is fully isolated — no cross-contamination between campaigns.

### 🏃 Running the App

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

### 🗄️ Firestore Collections

All data is stored per-user under `users/{uid}/`. Collections are created automatically on first use:

| Collection | Contents |
|---|---|
| `characters` | Character sheets |
| `scenes` | Custom DM scenes |
| `monsters` | Custom monsters |
| `wiki_notes` | Wiki notes |
| `wiki_maps` | Wiki maps |

---

## 🧙 Feature: Fiches Personnages

Full character sheet management for your adventuring party.

- **Create characters** by choosing a class — modifiers, proficiency bonus, and passive perception are calculated automatically
- **Drag-and-drop panels** — grab the ⠿ handle on any panel header to rearrange sections across 3 columns; layout persists per character. Reset anytime with the ⊞ button
- **Sorts (Spells):**
  - Full spell list with drag-and-drop reordering
  - Sort by level or school
  - Spell browser (📚) with FR/EN bundles
  - `[[link]]` syntax links spells to D&D 5e API data
  - Per-spell "description courte" field for quick reference at the table
- **Spell slots** with dot-click usage tracking
- **Combat:** Attaques table, HP bar with visual color coding
- **Class resources:** Rage/Ki dots
- **Capacités & Traits, Équipement, Monnaie** panels
- **Long/Short rest** buttons to restore resources
- **Portrait:** click to upload or drag-drop an image file
- **JSON export/import** for backup or sharing

---

## 🖥️ Feature: DM Screen

Atmosphere control for the master of the dungeon.

### Second Screen
- **Écran secondaire** — opens a second browser window for the player-facing display. Drag it to a projector or second monitor and press **F11** for fullscreen.

### Scenes & Visuals
- **Scènes** — grid of preset and custom scenes (images/videos). Click any scene to push it to the second screen instantly.
- **Overlays & Effets** — toggle rain, snow, thunder, fire, magic, vignette, fog, and darkness effects:
  - ⚙ button opens a per-effect volume slider
  - **Sound link:** attach one of your imported sounds to auto-play when the effect activates
- **Mode Tempête ++** — activates rain + thunder + darkness in one click

### Sound
- **Soundboard** — instant synthesized sounds:
  - ⚡ Tonnerre (thunder syncs with visual lightning bolts)
  - 🔥 Boule de feu
  - ⚔️ Épée
  - 🗡️ Dégainage
- **Sons personnalisés** — import your own audio files, rename them, play with ▶. Link them to overlay effects for ambient loops.
- **Ambiances** — create custom ambient presets (e.g. Taverne 🍺) linked to imported sounds.

### Combat
- **Ordre d'initiative** — full initiative tracker with:
  - Drag-to-reorder combatants
  - ↺ R1 reset button
  - Prev/Next turn navigation
  - Auto round counter
- **Monstres (barre du bas)** — fixed bottom bar with Monster Dock:
  - Browse the full D&D 5e monster library (FR/EN)
  - "Mes Monstres" tab to create/edit custom monsters
  - Add monsters to combat with HP tracking (−10/−5/−/+/+5/+10)
  - Color-coded health bars
  - Duplicate monsters with auto-numbering

---

## 📖 Feature: Wiki & Notes

An Obsidian-like note system for world-building lore.

### Note Types

| Icon | Type | Contents |
|---|---|---|
| 📝 | Note | Free-form text |
| 👤 | PNJ | NPC with portrait, appearance, personality, and a hidden secret field |
| 📍 | Lieu | Location with description |
| 🗓️ | Session | Session log with date and key events |

### Editor
- **Split view:** edit textarea (left) + live markdown preview (right)
- Markdown support: `# headers`, `**bold**`, `*italic*`, `- lists`
- `[[Titre d'une note]]` creates wiki links — an autocomplete dropdown appears while typing `[[`
- **Backlinks panel** (right side): shows which notes link to the current note, plus outgoing links

### Vue Graphe 🕸️
- Force-directed graph showing all notes as nodes connected by their `[[wikilinks]]`
- Node colors by type: gold=Note, blue=PNJ, green=Lieu, red=Session
- Scroll to zoom, drag background to pan, drag a node to reposition, click a node to open it

### Cartes
- Import map images
- Click on the map to place pins, link pins to Lieu notes
- 🖥 **Afficher sur l'écran** — opens the map fullscreen on the second window with pins overlaid

---

## ⚙️ Notes Techniques

- **Sound effects** use Web Audio API synthesis. No external audio files are required for the built-in sounds.
- **D&D 5e data** is loaded from pre-built JS bundles in `public/dnd_db/`, included globally via `index.html` script tags.
- **All user data** is stored per-UID in Firestore — fully isolated between different DM accounts.
- **Ad blockers** may interfere with Firebase connections on `localhost`. Disable your ad blocker for `localhost` if you encounter auth or database issues.

---

## 📜 License

For personal use at the table. May your rolls be ever in your favor.
