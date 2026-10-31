# ⚡ Neo Arcade Vault — 10 Playable Arcade Mini-Games

A complete, high-energy arcade gaming website featuring **10 genuinely playable mini-games** built with pure vanilla **HTML5**, **CSS3**, **JavaScript (ES6+)**, and the **Web Audio API**.

Zero frameworks, zero external image assets, zero build step overheads. Instant 60 FPS gameplay on desktop and mobile.

---

## 🕹️ The 10 Playable Games

| # | Game | Category | Core Mechanics | Controls |
|---|---|---|---|---|
| 1 | **🍉 Fruit Slice** | Action / Arcade | 60-second fruit slicing frenzy, split halves with physics, combo bonuses, and hazard bombs. | Mouse drag / Touch swipe |
| 2 | **🐍 Neon Snake** | Arcade / Retro | Cyber snake, growing segments, golden stars (+50 pts bonus), speed scaling. | Arrow Keys / WASD / D-Pad / Swipe |
| 3 | **🧱 Brick Breaker** | Arcade / Action | Angle deflection paddle, colored brick tiers, power-ups (Multi-Ball, Expand, Slow, Laser), 3 stages. | Mouse / Touch drag / Left & Right arrows |
| 4 | **🚀 Space Shooter** | Action / Retro | Parallax starfield, player starfighter, alien drones, laser cruisers, asteroids, shields, smart bomb. | Arrow Keys / Mouse / Drag + Space to fire |
| 5 | **🔢 2048 Puzzle** | Puzzle / Strategy | 4x4 sliding number puzzle, tile merges, animated neon palette, Undo move, victory at 2048. | Arrow Keys / WASD / Swipe / D-Pad |
| 6 | **✕◯ Tic-Tac-Toe** | Strategy / Classic | Unbeatable Minimax AI, 3 difficulty levels (Easy, Medium, Hard), 2-Player local pass-and-play. | Click / Tap grid cells |
| 7 | **🃏 Memory Match** | Casual / Puzzle | 4x4 card grid, 8 distinct arcade relic pairs, 3D card flip animations, timer, move counter, 3-star rating. | Click / Tap cards |
| 8 | **🏃 Endless Runner** | Action / Platformer | Cyberpunk skyline runner, jump, double-jump, slide/duck under lasers, collect energy crystals. | Space / W to Jump, S to Slide |
| 9 | **🟦 Block Puzzle** | Puzzle / Classic | 10x20 falling tetrominoes, ghost landing projection, next piece preview, hold piece slot, hard drop. | Arrow Keys, Space (Hard Drop), C (Hold) |
| 10 | **🔨 Whack-a-Mole** | Casual / Reflex | 3x3 cyber vault holes, normal & golden moles, skull bomb hazards, combo multipliers, 30s timer. | Click / Tap moles before they submerge |

---

## ✨ Arcade Portal Features

- **Cyber Dark & Neon Design System**: Deep dark glassmorphism surfaces, glowing neon accents, and responsive typography.
- **Dynamic Hash Routing**: Single Page Application (SPA) routing (`#/`, `#/game/<id>`, `#/category/<cat>`, `#/favorites`) with full browser history support.
- **Hero Featured Showcase**: High-impact banner featuring the game of the day with quick launch and stats.
- **Instant Search & Category Filters**: Real-time filtering across titles, descriptions, categories (Action, Arcade, Puzzle, Strategy, Casual), and tags.
- **Favorites & Recently Played**: Persisted in `localStorage` across visits.
- **Unified Game Viewport**: Dedicated game view with breadcrumb navigation (`← Back to Arcade`), fullscreen mode, sound toggle, and instructions guide.
- **Mobile-First Touch Controls**: Built-in responsive virtual D-pads, jump/slide buttons, touch paddle bars, and swipe gestures.
- **Web Audio API Synthesizer**: 100% procedurally synthesized audio effects for every game with zero external sound files.

---

## 🚀 Quick Start: Running Locally

Because this project is built entirely with vanilla static web technologies, no build step or package installations are required.

### Method 1: Using Python (Built-in)

```bash
# In D:\mini-game-arcade
python -m http.server 8000
```
Open your browser at: **[http://localhost:8000](http://localhost:8000)**

---

### Method 2: Using Node.js / npx serve

```bash
# In D:\mini-game-arcade
npm start
# OR
npx serve .
```

---

### Method 3: Direct File Launch

Double-click `index.html` or run:
```powershell
Start-Process "index.html"
```

---

## 🧪 Automated Testing

The project includes three automated test suites covering physics, math, AI Minimax, rules, rendering, and DOM integrity:

```bash
npm test
```

### What `npm test` Runs:
1. `tests/game.test.js`: Original Fruit Slice test suite (collision math, entity physics, particles, combos, DOM element verification).
2. `tests/render.test.js`: Procedural canvas 2D rendering execution suite for all fruit, bomb, and blade drawing routines.
3. `tests/arcade-games.test.js`: Comprehensive test suite for all 10 arcade games:
   - Catalog integrity (10 games, metadata, unique IDs).
   - Neon Snake motion, food collision, and growth.
   - Brick Breaker level generation and brick damage.
   - Space Shooter laser firing, enemy damage, and shield depletion.
   - 2048 Puzzle tile sliding, merging, and game-over detection.
   - Tic-Tac-Toe Minimax AI winning & blocking evaluations.
   - Memory Match deck generation and pair verification.
   - Endless Runner jumping, double-jumping, and slide ducking.
   - Block Puzzle tetromino definitions, collision, and line clears.
   - Whack-a-Mole scoring, combo multipliers, and bomb penalties.
   - Arcade Portal search filtering and favorites persistence.

---

## 🌐 Deploying to Vercel & the Web

### Deploying to Vercel (Configured via `vercel.json`):

1. **Vercel CLI**:
   ```bash
   npx vercel
   ```
2. **Vercel Dashboard**:
   - Push this repository to GitHub, GitLab, or Bitbucket.
   - Import the repository in the Vercel dashboard.
   - Framework Preset: **Other** (Static Site).
   - Build Command: *(None)*.
   - Output Directory: *(Root `.`)*.
   - Click **Deploy**.

### Deploying to GitHub Pages:
1. Push repository to GitHub.
2. Go to **Repository Settings > Pages**.
3. Source: `Deploy from a branch` -> `main` / `root`.
4. Your arcade site will be live immediately.

---

## 📁 Project Architecture

```
d:\mini-game-arcade/
├── index.html                     # Main arcade hub & game viewport container
├── vercel.json                    # Vercel deployment configuration
├── package.json                   # Test script definitions (npm test)
├── README.md                      # Documentation & user guide
├── css/
│   ├── style.css                  # Base arcade styles & Fruit Slice graphics
│   └── arcade.css                 # Arcade portal, hero, catalog, and game viewports
├── js/
│   ├── audio.js                   # Universal Web Audio API sound synthesizer
│   ├── fruit.js                   # Fruit Slice procedural canvas entities
│   ├── game.js                    # Fruit Slice arcade engine
│   ├── arcade.js                  # Arcade portal: router, catalog, favorites, UI
│   └── games/
│       ├── snake.js               # Neon Snake game engine
│       ├── brick-breaker.js       # Brick Breaker game engine
│       ├── space-shooter.js       # Space Shooter game engine
│       ├── puzzle-2048.js         # 2048 Puzzle game engine
│       ├── tic-tac-toe.js         # Tic-Tac-Toe with Minimax AI
│       ├── memory-match.js        # Memory Match game engine
│       ├── endless-runner.js      # Endless Runner game engine
│       ├── block-puzzle.js        # Block Puzzle (Tetris) game engine
│       └── whack-a-mole.js        # Whack-a-Mole game engine
└── tests/
    ├── game.test.js               # Fruit Slice unit & integration tests
    ├── render.test.js             # Procedural canvas rendering tests
    └── arcade-games.test.js       # Test suite for all 10 games & portal
```

---

## 📄 License

MIT License. Designed and engineered for maximum arcade fun!
