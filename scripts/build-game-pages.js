/**
 * Builds the 10 direct game pages: game/<slug>.html  ->  https://<domain>/game/<slug>
 *
 * Each page is plain static HTML (own title, description, canonical, structured data and
 * written content) plus the script tags needed to run that one game. js/arcade.js sees
 * <body data-game-page="..."> and mounts the game, so a refresh or a direct visit always
 * loads the right game. The older hash routes (/#/game/<id>) keep working unchanged.
 *
 * Usage:  npm run build-game-pages
 * Edit the GAMES table below, run the script, commit the generated game/*.html files.
 * The domain is read from index.html's canonical URL, so it never has to be typed here.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'game');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ORIGIN = (index.match(/<link rel="canonical" href="(https:\/\/[^"/]+)\/?"/) || [])[1];
if (!ORIGIN) throw new Error('Could not read the site origin from index.html canonical');

const { ARCADE_GAMES } = require('../js/arcade.js');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Which scripts each game needs. Fruit Slice is the only game with its own markup template.
const SCRIPTS = {
  'fruit-slice': ['audio.js', 'fruit.js', 'game.js'],
  'snake': ['audio.js', 'games/snake.js'],
  'brick-breaker': ['audio.js', 'games/brick-breaker.js'],
  'space-shooter': ['audio.js', 'games/space-shooter.js'],
  'puzzle-2048': ['audio.js', 'games/puzzle-2048.js'],
  'tic-tac-toe': ['audio.js', 'games/tic-tac-toe.js'],
  'memory-match': ['audio.js', 'games/memory-match.js'],
  'endless-runner': ['audio.js', 'games/endless-runner.js'],
  'block-puzzle': ['audio.js', 'games/block-puzzle.js'],
  'whack-a-mole': ['audio.js', 'games/whack-a-mole.js']
};

// Written content per game. Every fact here is taken from the matching /play guide page,
// which tests/site-structure.test.js already checks against the game engine source.
const GAMES = {
  'fruit-slice': {
    metaDesc: 'Play Fruit Slice free in your browser: slice flying fruit for 60 seconds, chain combos and dodge the bombs. Mouse or touch. No download, no sign-up.',
    intro: [
      'Fruit Slice runs on a 60-second clock. Fruit is thrown up from the bottom of the screen, every slice scores, and slicing several pieces in one stroke earns combo bonuses.',
      'Bombs are the only way to lose one of your three lives, so half the skill is knowing when not to swipe. The start screen lets you switch bombs off for a calmer round and choose a blade colour.'
    ],
    facts: [['Category', 'Action'], ['Round length', '60 seconds'], ['Lives', '3, lost only to bombs'], ['Best score', 'Saved in this browser']],
    controls: [['Mouse', 'Press and drag across fruit to slice it.'], ['Touch', 'Swipe a finger across fruit.'], ['P or Esc', 'Pause and resume.'], ['M', 'Mute or unmute the sound.']],
    tips: ['Combos count fruits per swipe, so one long stroke through a cluster beats several short ones.', 'A missed fruit costs nothing, while a bomb costs points, time and a life. Do not lunge for everything.', 'Golden apples are rare and give +5 points and 2 extra seconds, so they deserve a deliberate swipe.']
  },
  'snake': {
    metaDesc: 'Play Neon Snake free online: steer a glowing snake around a 22 x 22 grid, eat apples, grab golden stars and avoid walls. Keyboard, swipe or D-pad.',
    intro: [
      'Neon Snake moves one cell per step on a 22 x 22 board with solid walls. Every apple makes the snake longer and the game faster, and one crash ends the run.',
      'After every fifth apple a golden star appears for six seconds, worth as much as five apples. There is no wrap-around and no difficulty menu, just you, the grid and a growing tail.'
    ],
    facts: [['Category', 'Arcade'], ['Board', '22 x 22 cells'], ['Starting length', '3 cells'], ['Best score', 'Saved in this browser']],
    controls: [['Arrow keys or W A S D', 'Steer the snake.'], ['P or Esc', 'Pause and resume.'], ['Swipe', 'Swipe on the board to turn (about 25 pixels or more).'], ['On-screen D-pad', 'Four arrow buttons below the board, for touch or mouse.']],
    tips: ['The first apples are the slowest part of a run. Settle into a steady rhythm before the speed rises.', 'Tap a direction once and wait for the snake to move. Only one pending turn is stored per step.', 'As the snake grows, keep an open lane to turn into. Long snakes end runs far more often than walls do.']
  },
  'brick-breaker': {
    metaDesc: 'Play Brick Breaker free online: bounce the ball, clear three stages of bricks and catch power-up capsules. Mouse, keyboard or touch. No download.',
    intro: [
      'Brick Breaker gives you three lives and three stages of bricks. Move the paddle with the mouse, the keyboard or a finger and keep the ball in play while it chips away at the rows above.',
      'Bricks that need several hits show a number. Falling capsules can add extra balls, widen the paddle, give bonus points or slow the ball down.'
    ],
    facts: [['Category', 'Arcade'], ['Stages', '3'], ['Lives', '3'], ['Best score', 'Saved in this browser']],
    controls: [['Mouse', 'Move the pointer over the board. The paddle follows it.'], ['Left / Right arrows or A / D', 'Move the paddle.'], ['P or Esc', 'Pause and resume.'], ['Touch', 'Drag a finger across the board, or hold the on-screen move buttons.']],
    tips: ['Hit the ball with the paddle edge to send it sideways and reach bricks in the corners.', 'With multi-ball you only lose a life when the last ball falls, so it is the safest capsule to chase.', 'Check the numbers on bricks. A 3-hit gold brick takes three hits, so do not leave it behind.']
  },
  'space-shooter': {
    metaDesc: 'Play Space Shooter free online: pilot a starfighter, blast drones, cruisers and asteroids and grab power-ups. Keyboard, mouse or touch. No download.',
    intro: [
      'Space Shooter puts you in a starfighter with three shield points. Drones, heavy cruisers and asteroids come down the screen in busier and busier waves, and only the cruisers shoot back.',
      'Rare power-ups add a triple shot, a shield point or a bomb that clears the screen the moment you touch it.'
    ],
    facts: [['Category', 'Action'], ['Shield', '3 points'], ['Enemy types', '3'], ['Best score', 'Saved in this browser']],
    controls: [['Arrow keys or W A S D', 'Fly in any direction.'], ['Space or Enter', 'Fire. Hold for continuous fire.'], ['P or Esc', 'Pause and resume.'], ['Touch', 'Drag to fly. The ship fires automatically while you drag.']],
    tips: ['Shoot cruisers first. They are the only enemies that fire back, and they take three hits.', 'Do not ram enemies. A collision costs a shield point and scores nothing.', 'Letting an enemy slip off the bottom is free, so never risk your shield for a drone you cannot reach.']
  },
  'puzzle-2048': {
    metaDesc: 'Play 2048 Puzzle free online: slide and merge tiles on a 4 x 4 board to build a 2048 tile, with one-step undo. Keyboard or swipe. No download.',
    intro: [
      '2048 Puzzle is played on a 4 x 4 board. Each move slides every tile one way and merges equal neighbours into a tile of double the value, and a new tile appears after every move that works.',
      'Reach 2048 to win, or keep going for a higher score. If a move goes wrong, the one-step undo can take it back.'
    ],
    facts: [['Category', 'Puzzle'], ['Board', '4 x 4'], ['Goal', 'Build a 2048 tile'], ['Undo', 'One step']],
    controls: [['Arrow keys or W A S D', 'Slide all tiles up, down, left or right.'], ['Z or Backspace', 'Undo your last move.'], ['Swipe', 'Swipe on the board in the direction you want the tiles to slide.'], ['On-screen D-pad', 'Four arrow buttons below the board.']],
    tips: ['Undo right after a move you regret. It only goes back one move and cannot be used twice in a row.', 'Before each move, look for rows and columns with pairs that will merge, because each merge scores the new tile value.', 'A new tile appears after every move that works, so avoid filling the board with tiles that do not match.']
  },
  'tic-tac-toe': {
    metaDesc: 'Play Tic-Tac-Toe free online against the computer on Easy, Medium or Invincible, or with a friend on one device. No download or sign-up.',
    intro: [
      'Tic-Tac-Toe here has two modes: a computer opponent set to Easy, Medium or Invincible, or two players sharing one device. In the computer mode you play X and move first.',
      'A win tally is kept while the page stays open, and a completed line is highlighted so you can see exactly how the round ended.'
    ],
    facts: [['Category', 'Strategy'], ['Modes', 'Vs Computer or 2 Players'], ['Difficulty', 'Easy, Medium, Invincible'], ['Score', 'Win tally, not saved']],
    controls: [['Mouse or touch', 'Click or tap an empty cell to place your mark.'], ['VS COMPUTER / 2 PLAYERS', 'Switch mode. This starts a fresh board.'], ['Difficulty menu', 'Choose Invincible, Medium or Easy in the computer mode.'], ['New round button', 'Clear the board and start again with X to move.']],
    tips: ['You move first as X, so you can claim the centre or a corner on your first turn.', 'Every turn, check whether your opponent has two in a line with an empty third cell, and block it.', 'Against Invincible, aim not to lose. A draw is the best possible result.']
  },
  'memory-match': {
    metaDesc: 'Play Memory Match free online: flip cards to find all eight pairs on a 4 x 4 grid and earn one to three stars. Mouse or touch. No download.',
    intro: [
      'Memory Match lays out 16 face-down cards: eight pairs of arcade symbols. Flip two at a time, remember where each symbol is hiding and clear the board.',
      'There is no time limit. Your result is rated from one to three stars by the number of moves you needed, and your fewest moves is saved on this device.'
    ],
    facts: [['Category', 'Casual'], ['Cards', '16 (8 pairs)'], ['Rating', '1 to 3 stars'], ['Best score', 'Fewest moves, saved in this browser']],
    controls: [['Mouse or touch', 'Click or tap a face-down card to flip it.'], ['Restart button', 'Reshuffle the cards and start a new game.'], ['PLAY AGAIN', 'Appears on the completion screen and starts a new game.']],
    tips: ['Early flips are for gathering information. Every card you see makes a later match easier.', 'Use rows and columns to remember positions, for example "top row, second card".', 'Stars depend on moves and not on time, so there is no reason to rush.']
  },
  'endless-runner': {
    metaDesc: 'Play Endless Runner free online: jump, double jump and slide across neon rooftops, dodge spikes and laser drones. Keyboard or touch. No download.',
    intro: [
      'In Endless Runner your character runs forward on its own and you decide when to jump, double jump or slide. Spikes need a jump, laser drones need a slide, and energy crystals add to your score.',
      'You have a single life, so one collision ends the run. The challenge is simply how far you can get.'
    ],
    facts: [['Category', 'Action'], ['Lives', '1 (a hit ends the run)'], ['Jumps', '2 before landing'], ['Best score', 'Saved in this browser']],
    controls: [['Space, Up arrow or W', 'Jump. Press again in the air for a double jump.'], ['Down arrow or S (hold)', 'Slide. Release to stand up again.'], ['P or Esc', 'Pause and resume.'], ['Touch', 'Tap the game area to jump, or use the JUMP and SLIDE buttons.']],
    tips: ['Start your slide just before a drone reaches you and hold it until it has passed.', 'Use the double jump on a tight spike so you do not land on the next obstacle.', 'Crystals are worth a small detour, but never a collision.']
  },
  'block-puzzle': {
    metaDesc: 'Play Block Puzzle free online: rotate and drop seven falling shapes on a 10 x 20 board to clear rows, with ghost piece and hold. No download.',
    intro: [
      'Block Puzzle drops seven shapes onto a 10 x 20 board, one at a time. Move and rotate each piece so that it completes a full row, which then clears.',
      'A ghost outline shows where the piece will land, one piece can be held for later and a hard drop locks it instantly. The pace quickens every ten lines, and the run ends when a new piece no longer fits.'
    ],
    facts: [['Category', 'Puzzle'], ['Board', '10 x 20'], ['Shapes', '7 (I, O, T, S, Z, J, L)'], ['Hold slot', '1 piece']],
    controls: [['Left / Right arrows or A / D', 'Move the piece one cell sideways.'], ['Up arrow or W', 'Rotate clockwise.'], ['Space', 'Hard drop: send the piece to its landing spot.'], ['C or Shift', 'Hold or swap the held piece.'], ['P or Esc', 'Pause and resume.']],
    tips: ['Use the ghost outline to check the landing spot before you drop.', 'You can hold only once per turn, so keep the hold for a piece you really cannot place.', 'Keep the stack low and flat. The game is over as soon as a new piece cannot fit at the top.']
  },
  'whack-a-mole': {
    metaDesc: 'Play Whack-a-Mole free online: whack moles and golden stars in 30 seconds, build combos and avoid the bombs. Mouse or touch. No download.',
    intro: [
      'Whack-a-Mole is a 30-second reflex round on a 3 x 3 board. Moles and golden stars pop out of the holes for a moment and score when you hit them, and a combo multiplies the points.',
      'Bombs reset your combo, so a quick eye matters as much as a quick hand. A mouse or a finger is all you need.'
    ],
    facts: [['Category', 'Casual'], ['Round length', '30 seconds'], ['Holes', '9 (3 x 3)'], ['Best score', 'Saved in this browser']],
    controls: [['Mouse', 'Click a mole, star or bomb to whack it.'], ['Touch', 'Tap a mole, star or bomb.'], ['P or Esc', 'Pause and resume.']],
    tips: ['Missed moles are free, so skip a hole if hitting it would mean clicking a bomb.', 'Hit golden stars first. They disappear soonest and are worth the most.', 'Once your combo reaches 4, every hit is worth double, so protect that streak.']
  }
};

// One-line blurbs for the "More games" cards (same wording as the guide pages).
const BLURB = {
  'fruit-slice': 'A 60-second blade game with combos and bombs.',
  'snake': 'Steer a growing snake around a 22 x 22 board.',
  'brick-breaker': 'Clear three stages of bricks with a paddle and a ball.',
  'space-shooter': 'A vertical shooter with three enemy types and power-ups.',
  'puzzle-2048': 'Slide and merge tiles on a 4 x 4 board.',
  'tic-tac-toe': 'Play the computer or a friend on a 3 x 3 grid.',
  'memory-match': 'Match eight pairs of cards in as few moves as you can.',
  'endless-runner': 'Jump, double jump and slide through a neon skyline.',
  'block-puzzle': 'Clear lines on a 10 x 20 board with hold and ghost outline.',
  'whack-a-mole': 'A 30-second reflex game on a 3 x 3 board.'
};

const GA_ID = 'G-LJY94260LN';
const GA_SNIPPET = `  <!-- Google tag (gtag.js) - GA4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>
`;

const urlOf = (g) => `${ORIGIN}/game/${g.slug}`;

function related(game) {
  const others = ARCADE_GAMES.filter(g => g.id !== game.id);
  const same = others.filter(g => g.category === game.category);
  const rest = others.filter(g => g.category !== game.category);
  return same.concat(rest).slice(0, 3);
}

// Fruit Slice keeps its markup in a <template> in index.html; the game page needs the same markup.
function fruitTemplate() {
  const m = index.match(/<template id="fruit-slice-template">[\s\S]*?<\/template>/);
  if (!m) throw new Error('fruit-slice-template not found in index.html');
  // The page already has its own <h1>; the template's start-screen title becomes an <h2> here
  // (it is styled by its class, so it looks identical). index.html's template is not touched.
  return m[0].replace('<h1 class="game-title">FRUIT SLICE</h1>', '<h2 class="game-title">FRUIT SLICE</h2>');
}

function page(game) {
  const c = GAMES[game.id];
  const url = urlOf(game);
  const title = `Play ${game.title} Online Free | Neo Arcade Vault`;
  const h1 = `Play ${game.title} Online`;
  const cat = game.category.charAt(0).toUpperCase() + game.category.slice(1);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'VideoGame', '@id': `${url}#game`, name: game.title, description: c.metaDesc, url,
        genre: [cat], gamePlatform: 'Web browser', applicationCategory: 'Game', playMode: ['SinglePlayer'].concat(game.id === 'tic-tac-toe' ? ['MultiPlayer'] : []),
        inLanguage: 'en', isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: 'Neo Arcade Vault', url: `${ORIGIN}/` },
        potentialAction: { '@type': 'PlayAction', target: url }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Games', item: `${ORIGIN}/games` },
          { '@type': 'ListItem', position: 3, name: `Play ${game.title}`, item: url }
        ]
      }
    ]
  };

  const scripts = ['site-shell.js'].concat(SCRIPTS[game.id], ['arcade.js']).map(s => `  <script src="/js/${s}"></script>`).join('\n');
  const tpl = game.id === 'fruit-slice' ? `\n  <!-- Markup for the Fruit Slice engine (same template the arcade portal uses) -->\n  ${fruitTemplate()}\n` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090d16">
${GA_SNIPPET}  <title>${esc(title)}</title>
  <meta name="description" content="${esc(c.metaDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Neo Arcade Vault">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(c.metaDesc)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(c.metaDesc)}">

  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/arcade.css">
  <link rel="stylesheet" href="/css/pages.css">
</head>
<body data-game-page="${game.id}">
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <div class="arcade-background" aria-hidden="true">
    <div class="arcade-grid"></div>
    <div class="ambient-flare flare-1"></div>
    <div class="ambient-flare flare-2"></div>
  </div>

  <div id="portal-app">
    <header>
      <nav class="arcade-navbar" aria-label="Main navigation">
        <a class="nav-brand" href="/" aria-label="Neo Arcade Vault - home">
          <span class="brand-bolt">⚡</span>
          <span class="brand-text">NEO ARCADE</span>
          <span class="brand-badge">VAULT</span>
        </a>
        <div class="nav-links">
        <a href="/">Home</a>
        <a href="/games">Games</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        </div>
      </nav>
    </header>

    <div id="game-portal-view" class="game-page-view">
      <main id="main-content" class="game-main">
        <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/games">Games</a> &rsaquo; <span>${esc(game.title)}</span></nav>

        <div class="game-view-header">
          <div class="gv-left">
            <a class="btn-back-arcade" href="/games">&lsaquo; All games</a>
            <div class="gv-title-meta">
              <h1 class="gv-title">${esc(h1)}</h1>
              <span class="gv-cat-badge">${esc(cat)}</span>
            </div>
          </div>
          <div class="gv-actions" id="game-actions"></div>
        </div>

        <div id="game-viewport" class="game-viewport">
          <p class="game-noscript">${esc(game.title)} needs JavaScript to run. Please enable it in your browser, or read the <a href="/play/${game.slug}">${esc(game.title)} guide</a> for the rules.</p>
        </div>

        <div class="game-details-box">
          <div class="gd-col">
            <h2>How to play</h2>
            <p>${esc(game.controls)}</p>
            <p style="margin-top: 8px; color: var(--text-muted); font-size: 0.88rem;">${esc(game.description)}</p>
            <p style="margin-top: 8px; font-size: 0.88rem;"><a href="/play/${game.slug}">Read the full ${esc(game.title)} guide: rules, scoring and tips</a></p>
          </div>
          <div class="gd-col stats-box">
            <h2>Your records</h2>
            <div class="gd-stat-row"><span>Category</span><span style="color: var(--accent-2);">${esc(cat)}</span></div>
            <div class="gd-stat-row"><span>${esc(game.scoreLabel)}</span><span id="gd-best-score" style="color: var(--yellow);">${game.scoreKey ? 'No score yet' : 'Not tracked'}</span></div>
            <div class="gd-stat-row"><span>Saved</span><span>This device only</span></div>
          </div>
        </div>

        <div class="game-page-info">
          <section class="content-card prose" aria-labelledby="about-game">
            <h2 id="about-game">About ${esc(game.title)}</h2>
${c.intro.map(p => `            <p>${esc(p)}</p>`).join('\n')}
            <p>It is free, runs in your browser and needs no download or account. Your best score stays on your own device.</p>
          </section>

          <section aria-labelledby="game-facts">
            <h2 id="game-facts" class="sr-only">${esc(game.title)} at a glance</h2>
            <div class="card-grid">
${c.facts.map(([k, v]) => `              <div class="info-card">\n                <h3>${esc(k)}</h3>\n                <p>${esc(v)}</p>\n              </div>`).join('\n')}
            </div>
          </section>

          <section class="content-card prose" aria-labelledby="game-controls">
            <h2 id="game-controls">${esc(game.title)} controls</h2>
            <div class="table-scroll">
              <table>
                <thead><tr><th scope="col">Input</th><th scope="col">What it does</th></tr></thead>
                <tbody>
${c.controls.map(([k, v]) => `                  <tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('\n')}
                </tbody>
              </table>
            </div>
          </section>

          <section class="content-card prose" aria-labelledby="game-tips">
            <h2 id="game-tips">Quick tips for ${esc(game.title)}</h2>
            <ul>
${c.tips.map(t => `              <li>${esc(t)}</li>`).join('\n')}
            </ul>
            <p>Want the full rules, scoring table and answers to common questions? Read the <a href="/play/${game.slug}">${esc(game.title)} guide</a>.</p>
          </section>

          <section class="content-card prose" aria-labelledby="more-games">
            <h2 id="more-games">More games to play</h2>
            <div class="card-grid">
${related(game).map(o => `              <article class="info-card">\n                <h3><a href="/game/${o.slug}">Play ${esc(o.title)}</a></h3>\n                <p>${esc(BLURB[o.id])}</p>\n              </article>`).join('\n')}
            </div>
            <div class="btn-row">
              <a class="btn-link secondary" href="/play/${game.slug}">${esc(game.title)} guide</a>
              <a class="btn-link secondary" href="/games">Browse all games</a>
            </div>
          </section>
        </div>
      </main>
    </div>

    <footer class="arcade-footer site-footer">
      <div class="footer-brand"><span class="brand-bolt">⚡</span> NEO ARCADE</div>
      <p>A free collection of 10 browser mini-games. No downloads, no sign-up.</p>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a>
        <a href="/games">Games</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms &amp; Conditions</a>
      </nav>
      <p class="footer-copy">&copy; <span data-year>2026</span> Neo Arcade Vault. All rights reserved.</p>
    </footer>
  </div>
${tpl}
${scripts}
</body>
</html>
`;
}

function build() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const game of ARCADE_GAMES) {
    if (!GAMES[game.id]) throw new Error(`No page content for ${game.id}`);
    fs.writeFileSync(path.join(OUT_DIR, `${game.slug}.html`), page(game));
    console.log(`wrote game/${game.slug}.html`);
  }
}

if (require.main === module) build();
module.exports = { build, page, GAMES, urlOf };
