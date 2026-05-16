# Adding sound effects

The game looks for these files in `public/sounds/`:

| File              | Plays when…                                                 |
|-------------------|-------------------------------------------------------------|
| `hit.mp3`         | You click a block (normal hit, no crit, no break)           |
| `crit.mp3`        | A click rolls a critical hit (×5 damage)                    |
| `break.mp3`       | A block runs out of HP and breaks                           |
| `coin.mp3`        | Big ore (value ≥ 50) breaks — layered on top of `break.mp3` |
| `upgrade.mp3`     | You buy an upgrade in the side panel                        |
| `click.mp3`       | Reserved for UI button clicks (not wired up yet)            |

**Files are optional.** If a file is missing, the game logs a notice once
and plays silently for that key — nothing breaks.

## Where to get them (free / CC0)

- [Kenney.nl audio packs](https://kenney.nl/assets?q=audio) — search "Interface Sounds", "Casino Audio", "Sci-Fi Sounds". All CC0.
- [freesound.org](https://freesound.org) — huge library; filter by CC0 license.
- [opengameart.org](https://opengameart.org) — many CC0 sets.

Suggested mapping from Kenney's *Interface Sounds* pack:
- `hit.mp3`     ← `tap.mp3`
- `crit.mp3`    ← `confirmation_002.mp3` or any high-pitched beep
- `break.mp3`   ← `glass_004.mp3` or any short break/glass sfx
- `coin.mp3`    ← Kenney *Casino Audio* `chips_collide5.mp3` or any coin chime
- `upgrade.mp3` ← `bong_001.mp3` or any positive UI chime

## Format

- Use `.mp3` (broadest browser support). `.ogg` and `.wav` also work — just keep the filename without the extension matching what BootScene loads.
- Keep each file under ~50 KB. Short SFX, not music.
- Trim silence at the start; the game plays many sounds rapid-fire.

## Mute

The 🔊 button in the header toggles mute. The setting is saved per-device
in localStorage (`mining-empire:audio:v1`). Default master volume is 0.55.

## How to test

Drop your files, run `npm run dev`, and click any block. If you don't hear
anything, open DevTools console — Phaser logs an `info` line per missing key
so you'll see which filenames are wrong.
