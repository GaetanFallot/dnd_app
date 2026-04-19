# Role'n'Rolls

D&D companion app — React 18 + Vite + TypeScript, Supabase (Postgres + Auth + Realtime + Storage), Tailwind + shadcn/ui.

This directory is the canonical replacement for the vanilla HTML/JS app at the repo root (`../index.html`, `../dnd-display-manager.html`, `../dnd5e-sheets/`, `../js/`). The old app keeps working until migration is complete.

## Layout

```
role_n_rolls/
├── client/                  React + Vite + TS app
│   ├── public/dnd_db/       Copied bundles (classes, spells, monsters, ...)
│   └── src/
│       ├── pages/           MJScreen, CharacterCreation, LoreBuilder, Maps, Session, Auth
│       ├── components/      ui (shadcn), mj, lore, shared
│       ├── stores/          Zustand
│       ├── hooks/           React Query hooks (useDndData, ...)
│       ├── lib/             supabase client + helpers
│       └── types/           Character, Lore, Supabase schema
├── server/                  Express (secrets-only endpoints)
└── supabase/
    └── migrations/          SQL schema + RLS + public share RPCs
```

## Dev

```bash
cd role_n_rolls
npm install               # installs both workspaces
npm run dev               # runs client + server in parallel
```

Set up `.env` files from the `.env.example` templates. The client works offline against localStorage as long as Supabase env vars are missing.

## Migration phases

- **A — Scaffold** (current): project skeleton, D&D data pipeline, Supabase types
- **B — Supabase**: apply migrations, wire auth
- **C — MJ screen**: port scenes, canvas effects, soundboard, initiative, monsters, second window
- **D — Character sheets**: roster + editor + share view + portable export
- **E — Lore Builder**: entity graph, relations, events, per-player access
- **F — Maps**: Leaflet image-mode, annotations linked to lore entities
- **G — Sessions**: campaign dashboard, invite codes, public /lore/:token pages, realtime sync

## Data preservation

- `db/characters/*.json` files from the legacy app load unchanged via `DnDCharacter` type.
- `dnd_db/bundle_*.js` bundles are copied into `client/public/dnd_db/` and consumed by `loadDndBundle()`.
- Monster customizations (`db/monster_overrides/`) will be layered on top when Phase C lands.
