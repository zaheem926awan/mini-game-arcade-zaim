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
- **Hero Featured Showcase**: High-impact banner featuring a highlighted game with quick launch and your own best score.
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

4. `tests/site-structure.test.js`: Pages exist, unique titles/descriptions, one `<h1>` per page, canonical + Open Graph tags, shared nav/footer, working internal links and anchors, contact form fields and Formspree endpoint, privacy-policy storage-key audit, legal-page consistency (no leftover placeholders, no premature advertising or consent claims, no open-source licence claims), and sitemap/robots. It also validates the 10 `/play/` guide pages: unique metadata, canonical/Open Graph URLs, exact Play Now hash routes, JSON-LD consistency, no ads/ratings/play-count claims, no embedded games, `games.html` guide links, sitemap entries, and key facts checked against the engine source.

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
├── games.html                     # Crawlable list of all 10 games (Play + Guide & Rules links)
├── about.html                     # About Us
├── contact.html                   # Contact form (static-hosting friendly)
├── privacy-policy.html            # Privacy Policy
├── terms.html                     # Terms & Conditions
├── 404.html                       # Custom not-found page
├── robots.txt                     # Crawler rules + sitemap location
├── sitemap.xml                    # Sitemap of the 16 indexable pages (6 site pages + 10 game guides)
├── vercel.json                    # Clean URLs + security headers
├── package.json                   # npm test / npm start / npm run set-domain
├── README.md
├── play/                          # 10 SEO game guide pages (static HTML, one per game)
│   ├── fruit-slice.html           # /play/fruit-slice
│   ├── neon-snake.html            # /play/neon-snake
│   ├── brick-breaker.html         # /play/brick-breaker
│   ├── space-shooter.html         # /play/space-shooter
│   ├── 2048-puzzle.html           # /play/2048-puzzle
│   ├── tic-tac-toe.html           # /play/tic-tac-toe
│   ├── memory-match.html          # /play/memory-match
│   ├── endless-runner.html        # /play/endless-runner
│   ├── block-puzzle.html          # /play/block-puzzle
│   └── whack-a-mole.html          # /play/whack-a-mole
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
│   └── set-domain.js              # Sets or changes the site domain everywhere (--from, --dry-run)
└── tests/
    ├── game.test.js               # Fruit Slice unit & integration tests
    ├── render.test.js             # Procedural canvas rendering tests
    ├── arcade-games.test.js       # Test suite for all 10 games & portal
    └── site-structure.test.js     # Pages, SEO tags, links, nav/footer, storage-key audit
```

---

## 📖 Game Guide Pages (`/play/`)

Each of the 10 games has a static, crawlable **Guide & Rules** page. The pages explain the rules, controls, scoring, special features, beginner tips and FAQs, using the real behaviour of the game engines. They do **not** contain the game itself: the **Play … now** button opens the existing arcade route, so all game engines and the hash-based routes keep working exactly as before.

| Guide page | Play Now route (existing, unchanged) |
|---|---|
| `/play/fruit-slice` | `/#/game/fruit-slice` |
| `/play/neon-snake` | `/#/game/snake` |
| `/play/brick-breaker` | `/#/game/brick-breaker` |
| `/play/space-shooter` | `/#/game/space-shooter` |
| `/play/2048-puzzle` | `/#/game/puzzle-2048` |
| `/play/tic-tac-toe` | `/#/game/tic-tac-toe` |
| `/play/memory-match` | `/#/game/memory-match` |
| `/play/endless-runner` | `/#/game/endless-runner` |
| `/play/block-puzzle` | `/#/game/block-puzzle` |
| `/play/whack-a-mole` | `/#/game/whack-a-mole` |

**How they work**
- Files live in `play/<slug>.html` and are served at `/play/<slug>` through the existing `cleanUrls` setting in `vercel.json` (no rewrite rule is needed).
- They reuse the shared header, footer and the classes already in `css/pages.css` (`page-hero`, `toc`, `table-scroll`, `card-grid`, `info-card`, `faq-item`). Asset paths are absolute (`/css/...`) because the pages sit one folder deep.
- Each page has a unique title, meta description, canonical URL, Open Graph and Twitter tags, and JSON-LD (`VideoGame`, `BreadcrumbList`, `FAQPage`). There are no ratings, review counts, play counts or advertising scripts.
- `games.html` keeps its instant **Play** buttons and adds a **Guide & Rules** link to each card. `sitemap.xml` lists all 10 pages.

**Keeping the guides accurate.** The guide text was written from the game source code. If you change a control, a scoring rule, a timer or a lives count in `js/game.js` or `js/games/*.js`, update the matching guide in `play/`. `npm test` checks the main numbers (board sizes, timers, lives, shield, AI chance) against the engine source and will fail if they drift.

**Known notes on the guides.** Six guides tell players to resume a paused game with `P` / `Esc` because the on-screen **Resume** button currently restarts the round, and the Tic-Tac-Toe guide mentions a cosmetic win-line glow. If those engine behaviours are fixed in future, remove those "Good to know" notes.

**Changing the domain.** `npm run set-domain` only rewrites files in the project root, so it does not update `play/*.html`. After changing the domain, also replace the old origin in `play/*.html` (canonical, `og:url` and JSON-LD). `npm test` fails if the guide pages and the rest of the site use different domains.

---

## 🧾 Site Pages & AdSense Checklist

The About, Contact, Privacy Policy and Terms pages are complete and contain no placeholders. `npm test` fails if a `PLACEHOLDER:` marker, the placeholder domain or the placeholder form ID ever reappears.

**Current status (keep these statements true):**
- No advertising is running and no consent-management tool is installed. The Privacy Policy, Terms and About page say this explicitly.
- No analytics are used. Contact form messages are processed by Formspree, hosting is on Vercel, and fonts load from Google Fonts. All of this is disclosed in the Privacy Policy.

**Before enabling Google AdSense, you must:**
1. Set up a consent solution (for example Google's Privacy & messaging) for visitors in the EEA, UK and Switzerland, and test it.
2. Update `privacy-policy.html` §3, §5, §6 and §8, `terms.html` §6 and `about.html` ("Funding and advertising") so they describe what is really running, including how visitors can change their choices. Do **not** mention a consent link until it exists.
3. Update the "Last updated" date on the Privacy Policy and Terms.
4. Add the AdSense code to the pages where ads are allowed, and add the `ads.txt` file Google provides.
5. Re-run `npm test` and review the "Code sets no cookies" and storage-key tests, which describe the site's own code and will need a conscious update once third-party scripts are added.

**Domain:** `npm run set-domain -- https://new-domain --from https://old-domain` updates canonical links, Open Graph URLs, JSON-LD, the sitemap, robots.txt and the host named in the Privacy Policy.

**Contact form:** it posts to the Formspree endpoint in the `action` attribute of `contact.html`. Send a real test message after any change and confirm it arrives.

Have the Privacy Policy and Terms reviewed by a qualified professional for your jurisdiction. Nothing in this repository is legal advice or a guarantee of AdSense approval.

---

## 📄 License & Ownership

**All Rights Reserved.** No open-source licence is granted for this project. You may not copy, redistribute or reuse the code, design or content without permission, except where the law allows it.

- Parts of this project, including some code and content, were created with the assistance of AI tools. No claim is made to material that cannot be protected under applicable law.
- Third-party components remain under their own licences and are not owned by Neo Arcade Vault:
  - **Outfit** font - SIL Open Font License 1.1, (c) 2021 The Outfit Project Authors (loaded from Google Fonts).
  - **Luckiest Guy** font - Apache License 2.0, (c) 2010 Brian J. Bonislawsky DBA Astigmatic (loaded from Google Fonts).
- No third-party JavaScript libraries are used.
