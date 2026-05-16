Browser-Based Incremental Mining & Automation Game
1. Game Overview
Working Title
Underground Mining Empire

Genre:

Incremental / Idle
Automation
Resource Management
Roguelike progression

Platform:

Browser (desktop + mobile)
Future Steam/mobile possible

Session Style:

Short sessions (2–10 min)
Long-term progression

Core Fantasy:

Start with a weak hand drill →
build mining machines →
automate underground empire →
discover ancient alien technology →
dig beyond Earth’s core
2. Vision Statement

Create a highly replayable mining automation game with:

satisfying progression
huge scaling numbers
procedural underground discovery
automation addiction
prestige loops
strong visual feedback

The game should feel:

relaxing + rewarding + endlessly growing
3. Target Audience
Primary

Players who enjoy:

idle games
optimization
automation
progression systems

Inspired by:

Cookie Clicker
Factorio
Deep Rock Galactic
AdVenture Capitalist
4. Core Gameplay Loop
Mine resources →
Sell resources →
Upgrade tools →
Unlock automation →
Dig deeper →
Find rare minerals →
Expand mining empire →
Prestige →
Repeat stronger
5. Core Pillars
1. Constant Progress

Player should always:

unlock
upgrade
optimize
2. Satisfying Automation

Progression evolves from:

manual mining →
machines →
AI mining network
3. Discovery

Underground layers contain:

hidden biomes
rare ores
alien ruins
dangerous zones
4. Infinite Scaling

Numbers should scale:

100 →
1K →
1M →
1B →
1T →
1Qa
6. Gameplay Systems
A. Mining System
Manual Mining

Player clicks/taps to mine blocks.

Block stats:

HP
rarity
value
hardness

Example ores:

Ore	Value
Coal	Low
Iron	Medium
Gold	High
Diamond	Rare
Uranium	Epic
Alien Crystal	Legendary
B. Depth System

World divided into layers:

Layer	Theme
Surface	Dirt & Coal
Caverns	Gems
Magma Zone	Lava
Crystal Depths	Rare minerals
Ancient Ruins	Alien tech
Core Zone	Reality anomalies

Each layer:

new visuals
harder blocks
new enemies/events
C. Automation System
Machines
Tier 1
basic drill
Tier 2
conveyor system
Tier 3
mining drones
Tier 4
AI excavators
Tier 5
quantum extractors

Machines generate:

resources/sec

Core engagement mechanic.

D. Upgrade System

Player upgrades:

mining speed
drill power
inventory
machine efficiency
crit mining chance

Upgrade tree should branch.

Example:

Speed Build
vs
Rare Loot Build
E. Rare Drop System

Rare events:

treasure vault
crystal cave
ancient machine
meteor ore

Rarity:

Common
Rare
Epic
Legendary
Mythic

These create excitement spikes.

F. Prestige System

Core long-term retention system.

Reset Mechanic

Player resets mine.

Keeps:

prestige currency
permanent bonuses
special unlocks

Unlocks:

faster progression
new layers
advanced automation

Prestige name:

Core Ascension
G. Offline Progress

Player earns resources while offline.

Formula:

offline earnings capped at 8 hours

Critical feature for retention.

7. Meta Progression

Permanent systems:

account level
research tree
artifact collection
unlockable machines
cosmetics
8. Procedural Generation

Each run generates:

cave layouts
ore distribution
random events
biome modifiers

Examples:

Rich Ore Zone
Toxic Gas Cave
Low Gravity Depth
9. Visual Design
Art Direction

Style:

Stylized neon mining sci-fi

Mix:

glowing ores
dark caves
animated particles
smooth UI
10. UI Layout
Top Bar
currency
depth
energy
Left Panel
upgrades
inventory
Center
mining area
Right Panel
automation stats
Bottom
quick actions
11. Juice / Feel Features

Must include:

screen shake
ore explosion particles
glowing drops
floating numbers
satisfying sounds
mining sparks

These are extremely important.

12. Audio Design
Ambient
cave rumble
machinery hum
lava sounds
Feedback
ore crack
loot drop sparkle
machine activation
13. Technical Architecture
Frontend

Use:

Phaser.js

Reason:

ideal for browser games
particle support
mobile compatible
Backend

None.

Game runs fully client-side.
No server, no auth, no cloud sync.

Hosting

GitHub Pages (static).

Storage

Browser localStorage.

Single JSON save object under one namespaced key
(e.g. `mining-empire:save:v1`).

Autosave every few seconds.

Save object includes a `version` field
so future updates can migrate old saves.

Stores:

resources
upgrades
depth progress
prestige state
inventory

Export / Import (the real backup)

localStorage can be wiped by the user, incognito mode,
or "clear browsing data" — so manual export is the
authoritative backup, not a nice-to-have.

Export:
button serializes save → downloads
`mining-empire-save-YYYY-MM-DD.json`

Import:
file picker → validates JSON + version →
overwrites localStorage → reload state

Periodically nudge the user to export.

Analytics

No remote analytics in MVP (no backend).
Track metrics locally for in-game display only.
14. Folder Structure
src/
│
├── scenes/
├── ui/
├── systems/
├── entities/
├── assets/
├── data/
└── saves/
15. Core Economy Design
Resources
Primary
coins
ore
gems
Secondary
energy
prestige crystals
artifacts
Inflation Curve

Use exponential scaling carefully.

Formula example:
cost=base×multiplier
level

Example:

Upgrade 1 = 10
Upgrade 2 = 15
Upgrade 3 = 22
Upgrade 20 = 5000
16. Retention Systems
Daily Rewards

Examples:

rare ore chest
temporary boosts
prestige tokens
Quests
Daily
mine 500 blocks
Weekly
reach depth 3000
Achievements

Examples:

first legendary ore
1M resources/sec
deepest miner
17. Monetization (Optional)

Safe monetization:

skins
animations
premium themes
battle pass

Avoid pay-to-win.

18. MVP Scope (First Playable)
Must Have
Mining
click mining
Automation
auto drill
Progression
upgrades
Depth
layered world
Prestige
reset loop
Save System
local save
19. Future Expansion Ideas
Multiplayer
shared mines
guild excavation
PvE
cave monsters
boss excavation
Trading
ore market
Events
meteor showers
world bosses
20. Development Roadmap
Week 1
mining grid
block destruction
resource system
Week 2
upgrades
automation
save/load
Week 3
depth layers
procedural generation
particles
Week 4
prestige
balancing
polish
21. Success Metrics

Track:

session length
prestige frequency
retention D1/D7
upgrades purchased
average depth
22. Recommended MVP Goal

Goal:

fun mining feel within 5 minutes

If mining itself feels satisfying:
the game has strong potential.

23. Core Psychological Hooks

This game relies on:

visible growth
automation satisfaction
discovery
rarity
optimization
exponential scaling

Those systems are what make idle/automation games highly engaging.