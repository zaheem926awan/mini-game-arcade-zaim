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

> **Note:** the site uses clean URLs (`/about`, `/contact`, ...) and root-relative asset paths. Use **Method 2 (`npm start` / `npx serve`)** or `npx vercel dev` for local testing so these resolve correctly. A plain `python -m http.server` or opening `index.html` directly will not resolve `/about` etc.

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

The project includes four automated test suites covering physics, math, AI Minimax, rules, rendering, and DOM integrity:

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

4. `tests/site-structure.test.js`: Pages exist, unique titles/descriptions, one `<h1>` per page, canonical + Open Graph tags, shared nav/footer, working internal links and anchors, contact form fields, privacy-policy storage-key audit, sitemap/robots, and a list of placeholders still to fill in.

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
mini-game-arcade/
├── index.html                     # Arcade hub (JS-rendered) + SEO tags + no-JS fallback
├── games.html                     # Crawlable list of all 10 games
├── about.html                     # About Us
├── contact.html                   # Contact form (static-hosting friendly)
├── privacy-policy.html            # Privacy Policy (contains placeholders)
├── terms.html                     # Terms & Conditions (contains placeholders)
├── 404.html                       # Custom not-found page
├── robots.txt                     # Crawler rules + sitemap location
├── sitemap.xml                    # Sitemap of the 6 indexable pages
├── vercel.json                    # Clean URLs + security headers
├── package.json                   # npm test / npm start / npm run set-domain
├── README.md
├── css/
│   ├── style.css                  # Base arcade styles & Fruit Slice graphics
│   ├── arcade.css                 # Arcade portal, hero, catalog, game viewports
│   └── pages.css                  # Content pages, shared nav/footer, forms, responsive rules
├── js/
│   ├── site-shell.js              # Shared nav + footer markup used by the portal
│   ├── contact.js                 # Contact form submit handler (fetch to form service)
│   ├── audio.js                   # Web Audio API sound synthesizer
│   ├── fruit.js                   # Fruit Slice procedural canvas entities
│   ├── game.js                    # Fruit Slice arcade engine
│   ├── arcade.js                  # Arcade portal: router, catalog, favorites, UI
│   └── games/                     # The other 9 game engines (unchanged)
├── scripts/
│   └── set-domain.js              # Replaces YOUR-DOMAIN.example with your real domain
└── tests/
    ├── game.test.js               # Fruit Slice unit & integration tests
    ├── render.test.js             # Procedural canvas rendering tests
    ├── arcade-games.test.js       # Test suite for all 10 games & portal
    └── site-structure.test.js     # Pages, SEO tags, links, nav/footer, storage-key audit
```

---

## 🧾 Site Pages, Placeholders & AdSense Checklist

The legal and contact pages deliberately contain **highlighted placeholders** (`[PLACEHOLDER: ...]`) wherever real information is required. Nothing about the operator, address, email or data practices has been invented. Before going live:

1. **Domain** - `npm run set-domain -- https://your-site.vercel.app` (updates canonical, Open Graph, sitemap, robots).
2. **Contact form** - create a free form at [formspree.io](https://formspree.io) (or a compatible service), then replace `YOUR_FORM_ID` in the `action` attribute of `contact.html`. Until then the form shows a "not connected" notice and never pretends to send.
3. **Placeholders** - search all `.html` files for `PLACEHOLDER:` and replace each with true information (operator name, contact email, jurisdiction, retention period, children's policy, etc.).
4. **Privacy statements** - the policy states that the site sets no cookies, has no analytics and only requests Google Fonts. Re-verify this whenever you add analytics, ads or other third-party scripts. `npm test` fails if the code starts using `document.cookie` or new `localStorage` keys that the policy does not list.
5. **Advertising** - if you enable AdSense, keep and complete the advertising block in the Privacy Policy, update About/Terms wording, and add a consent banner (CMP) for visitors in the EEA/UK/Switzerland.
6. Have the Privacy Policy and Terms reviewed by a qualified professional for your jurisdiction.

`npm test` prints a "[TODO]" list of everything still unfilled.

---

---

## 📄 License

MIT License. Designed and engineered for maximum arcade fun!
