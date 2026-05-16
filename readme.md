# Mining Empire

A browser-based incremental mining game. Click rocks, automate the digging, upgrade your gear, climb a public leaderboard. Built with [Phaser 3](https://phaser.io), [Vite](https://vitejs.dev), and an optional [Supabase](https://supabase.com) backend for cloud save + Hall of Fame.

**Play it:** https://anmol1377.github.io/mining-empire/

## Features

- **Tactile mining loop** — 6×4 grid of ores (Coal → Iron → Gold → Diamond → Alien Crystal), each with HP, weighted spawn rates, particle bursts on break, floating numbers, screen shake
- **Five upgrades** — Drill Power, Crit Chance, Auto-Drill, Auto-Drill Power, Coin Multiplier; exponential cost curves; capped where it makes sense
- **Idle automation** — Auto-Drills tick every second on a random alive block
- **Offline progress** — capped at 8h, computed from expected ore distribution
- **Cloud sync (optional)** — manual ☁ Save to cloud button; state stored under a client-generated UUID, no login
- **Hall of Fame** — public leaderboard at `/#fame` with avatars (via DiceBear), one external link per entry, contribution-based ranking
- **Export / Import** — JSON save file is the source of truth; copy between devices, back up anywhere
- **No backend required** — runs fully on GitHub Pages; cloud sync only activates if Supabase env vars are set

## Tech stack

| Layer | Choice |
|---|---|
| Game engine | Phaser 3 |
| Build tool | Vite |
| Storage (local) | `localStorage` with versioned JSON shape + autosave |
| Storage (cloud, optional) | Supabase Postgres (RPCs only — no Auth, no direct table access) |
| Identity | Client-generated UUID stored in the save file (the file is the credential) |
| Hosting | GitHub Pages (static) |
| CI | GitHub Actions |

## Quick start

```bash
npm install
npm run dev
```

The game runs at `http://localhost:5173`. Cloud sync and Hall of Fame are disabled without Supabase credentials — everything else works.

### Enabling cloud sync + Hall of Fame

1. Create a free Supabase project
2. Run [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL Editor
3. Create `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
4. Restart `npm run dev`

Full instructions: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Identity model

There is **no login**. Each save has an embedded `cloudId` (UUIDv4) generated on first launch. That ID is the credential:

- Same `cloudId` → same cloud row
- Export the save file → ID travels with it → Import on another device → same cloud row
- Reset → new `cloudId` → old cloud row is orphaned forever
- Lose the file + clear localStorage → cloud row exists but is unreachable

Security: RLS on the database denies direct access; reads/writes go through SECURITY DEFINER RPCs that take `cloud_id` as a parameter. The UUID is 122 bits of entropy — guessing is infeasible. Treat your save file like a password.

## Project structure

```
src/
├── main.js                 # Entry: bootstrap + Phaser config
├── scenes/                 # Phaser scenes (Boot, Mine)
├── entities/               # Block class
├── systems/                # Save, CloudSync, OfflineProgress, UpgradeSystem, FameSystem
├── ui/                     # HTML overlays (upgrade panel, save buttons, fame, offline banner, cloud status)
├── data/                   # Initial state, upgrade catalog, ore catalog
├── lib/                    # supabase client
└── utils/                  # formatters
.github/workflows/
├── deploy.yml              # Build + deploy to GitHub Pages on push to main
└── keepalive.yml           # Daily Supabase ping so the free project never auto-pauses
```

## Deployment

Push to `main` → GitHub Actions builds with Vite (base path `/mining-empire/`) → publishes to GitHub Pages.

Required repo secrets (Settings → Secrets and variables → Actions):

- `VITE_SUPABASE_URL` — same value as your local `.env.local`
- `VITE_SUPABASE_ANON_KEY` — same value as your local `.env.local`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — same values, for the keepalive workflow

Repo Settings → Pages → Source: **GitHub Actions**.

## Design doc

The original game design vision lives in [DESIGN.md](./DESIGN.md) — gameplay loops, art direction, intended future systems (depth layers, prestige, etc.).

## Roadmap

Implemented:
- Mining grid + ore variety
- Five upgrades with cost curves
- Auto-Drill automation tier
- Offline progress (8h cap)
- Cloud sync (manual)
- Hall of Fame leaderboard
- Save export/import

Planned (see [DESIGN.md](./DESIGN.md)):
- Prestige system (Core Ascension)
- Depth layers (Caverns → Magma → Crystal Depths → Ancient Ruins → Core Zone)
- Consumable boosts (Drill Frenzy, Auto-Surge)
- Risk zones / time-attack rooms
- Achievements + daily quests
- Sound & richer juice

## License

MIT (or unset — add a `LICENSE` file when ready).
