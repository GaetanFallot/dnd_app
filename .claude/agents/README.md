# Subagents — Role'n'Rolls

Scoped collaborators for this project. Each lives as a Markdown file with YAML frontmatter.

| Agent                  | When to summon                                                                 |
|------------------------|--------------------------------------------------------------------------------|
| `po`                   | Scoping, prioritisation, arbitrating conflicting asks. Doesn't code.            |
| `senior-dev`           | Default for any React / TS / Supabase / Tailwind work.                         |
| `supabase-migrations`  | Schema changes, RLS, RPCs, typed-client sync.                                  |
| `dnd-content`          | Authoring / translating entries in `public/dnd_db/bundle_*_(en|fr).js`.        |
| `qa-postmessage`       | Bugs in the second-screen popup, audio unlock, canvas FX, turn-order bar.      |
| `design-porter`        | Turning a Claude Design handoff (or any static HTML/CSS mockup) into React.    |
| `cleanup-scout`        | Pre-release dead-code + stale-key sweep. Read-only.                            |

## Ground rule for all of them

Only `role_n_rolls/` is canonical. The legacy root of this repo (`index.html`, `dnd5e-sheets/`, `js/`, `electron-dnd-app/`, …) is scheduled for deletion — never read, write, or reference it.
