/**
 * Arcade Portal Architecture & Game Registry
 * Routing, discovery, search/filtering, favorites, recents, featured carousel
 * and modular game lifecycles.
 */

// Vector illustrations for every game (inline SVG so they can be animated with CSS)
const GAME_ART = {
  "fruit-slice": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><path d='M10 54h100a50 50 0 0 1-100 0z' fill='#0f9d62'/><path d='M17 54h86a43 43 0 0 1-86 0z' fill='#f4f7e8'/><path d='M24 54h72a36 36 0 0 1-72 0z' fill='#ff3550'/><g fill='#2a0d14'><ellipse cx='42' cy='72' rx='3' ry='5' transform='rotate(-20 42 72)'/><ellipse cx='60' cy='80' rx='3' ry='5'/><ellipse cx='78' cy='72' rx='3' ry='5' transform='rotate(20 78 72)'/><ellipse cx='52' cy='62' rx='2.5' ry='4'/><ellipse cx='70' cy='62' rx='2.5' ry='4'/></g><path class='slash' d='M14 104L108 14' stroke='#fff' stroke-width='5' stroke-linecap='round'/><circle cx='100' cy='30' r='4' fill='#ff3550'/><circle cx='20' cy='34' r='3' fill='#ff3550'/></svg>",
  "snake": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><path d='M22 92H78a15 15 0 0 0 0-30H42a15 15 0 0 1 0-30H88' fill='none' stroke='#04382d' stroke-width='19' stroke-linecap='round'/><path d='M22 92H78a15 15 0 0 0 0-30H42a15 15 0 0 1 0-30H88' fill='none' stroke='#3df2b0' stroke-width='12' stroke-linecap='round'/><circle cx='93' cy='32' r='12' fill='#3df2b0'/><circle cx='96' cy='28' r='3.5' fill='#fff'/><circle cx='97' cy='28' r='1.6' fill='#04382d'/><circle cx='102' cy='94' r='9' fill='#ff3b4e'/><path d='M102 85q6-6 11-3' stroke='#fff' stroke-width='3' fill='none' stroke-linecap='round'/></svg>",
  "brick-breaker": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><g><rect x='8' y='14' width='24' height='13' rx='3' fill='#fff'/><rect x='35' y='14' width='24' height='13' rx='3' fill='#ffe14d'/><rect x='62' y='14' width='24' height='13' rx='3' fill='#fff'/><rect x='89' y='14' width='24' height='13' rx='3' fill='#ffe14d'/><rect x='8' y='31' width='24' height='13' rx='3' fill='#ffe14d'/><rect x='35' y='31' width='24' height='13' rx='3' fill='#fff'/><rect x='62' y='31' width='24' height='13' rx='3' fill='#ffe14d'/><rect x='35' y='48' width='24' height='13' rx='3' fill='#fff'/><rect x='62' y='48' width='24' height='13' rx='3' fill='#fff' opacity='.5'/></g><circle cx='72' cy='84' r='8' fill='#fff'/><path d='M66 92L44 108' stroke='#fff' stroke-width='3' stroke-linecap='round' opacity='.5'/><rect x='30' y='104' width='52' height='9' rx='4.5' fill='#15161a'/></svg>",
  "space-shooter": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><circle cx='20' cy='24' r='2.5' fill='#fff'/><circle cx='100' cy='38' r='2' fill='#fff'/><circle cx='92' cy='98' r='2.5' fill='#fff'/><circle cx='26' cy='88' r='2' fill='#fff'/><path class='flame' d='M54 78Q60 114 66 78Z' fill='#ffb020'/><path d='M44 70L20 92L50 82Z M76 70L100 92L70 82Z' fill='#ff4d6d'/><path d='M60 8L78 70L60 62L42 70Z' fill='#f4f7ff'/><path d='M60 8L69 40H51Z' fill='#ff4d6d'/><circle cx='60' cy='46' r='6' fill='#2fb5e8'/></svg>",
  "puzzle-2048": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><g font-family='Arial Black,Arial,sans-serif' font-weight='900' font-size='26' text-anchor='middle' fill='#fff'><rect x='8' y='8' width='50' height='50' rx='11' fill='#ffd23f'/><text x='33' y='42' fill='#15161a'>2</text><rect x='62' y='8' width='50' height='50' rx='11' fill='#ff8a3d'/><text x='87' y='42'>4</text><rect x='8' y='62' width='50' height='50' rx='11' fill='#ff5a5f'/><text x='33' y='96'>8</text><rect x='62' y='62' width='50' height='50' rx='11' fill='#15161a'/><text x='87' y='96' fill='#ffd23f' font-size='22'>16</text></g></svg>",
  "tic-tac-toe": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><g stroke='#fff' stroke-width='6' stroke-linecap='round' fill='none'><path d='M44 14V106M76 14V106M14 44H106M14 76H106' opacity='.55'/><path d='M20 20L36 36M36 20L20 36' stroke='#ffe14d'/><circle cx='60' cy='60' r='10'/><path d='M84 84L100 100M100 84L84 100' stroke='#ffe14d'/><circle cx='92' cy='28' r='10'/></g></svg>",
  "memory-match": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><g transform='rotate(-10 40 60)'><rect x='12' y='22' width='50' height='72' rx='9' fill='#0b5c46'/><rect x='19' y='29' width='36' height='58' rx='5' fill='none' stroke='#7be0b0' stroke-width='2.5'/><circle cx='37' cy='58' r='8' fill='#7be0b0'/></g><g transform='rotate(10 80 60)'><rect x='56' y='20' width='50' height='72' rx='9' fill='#fff'/><path d='M81 38l5.5 11.5 12.5 1.7-9.2 8.7 2.4 12.4L81 66l-11.2 6.3 2.4-12.4-9.2-8.7 12.5-1.7z' fill='#ffc61a'/></g></svg>",
  "endless-runner": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><path d='M8 106H112' stroke='#fff' stroke-width='4' stroke-linecap='round' opacity='.5'/><path d='M82 106l9-22 9 22zM98 106l8-16 8 16z' fill='#ff3b4e'/><circle cx='50' cy='26' r='10' fill='#fff'/><g stroke='#fff' stroke-width='9' stroke-linecap='round' stroke-linejoin='round' fill='none'><path d='M48 40L42 68'/><path d='M46 48L66 56M46 48L28 54'/><path d='M42 68L62 82L56 102M42 68L26 84L14 78'/></g><path d='M10 40h16M4 54h14M12 68h10' stroke='#fff' stroke-width='3' stroke-linecap='round' opacity='.5'/></svg>",
  "block-puzzle": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><g><rect x='36' y='12' width='24' height='24' rx='5' fill='#b57bff'/><rect x='60' y='12' width='24' height='24' rx='5' fill='#b57bff'/><rect x='84' y='12' width='24' height='24' rx='5' fill='#b57bff'/><rect x='60' y='36' width='24' height='24' rx='5' fill='#b57bff'/><rect x='12' y='60' width='24' height='24' rx='5' fill='#2fe0ee'/><rect x='12' y='84' width='24' height='24' rx='5' fill='#2fe0ee'/><rect x='36' y='84' width='24' height='24' rx='5' fill='#2fe0ee'/><rect x='60' y='84' width='24' height='24' rx='5' fill='#2fe0ee'/><rect x='84' y='84' width='24' height='24' rx='5' fill='#ffd23f'/><rect x='84' y='60' width='24' height='24' rx='5' fill='#ffd23f'/></g></svg>",
  "whack-a-mole": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><ellipse cx='60' cy='98' rx='46' ry='14' fill='#3a2418'/><path d='M28 98a32 40 0 0 1 64 0z' fill='#9a6340'/><ellipse cx='60' cy='98' rx='32' ry='8' fill='#3a2418' opacity='.0'/><circle cx='48' cy='72' r='4.5' fill='#15161a'/><circle cx='72' cy='72' r='4.5' fill='#15161a'/><ellipse cx='60' cy='84' rx='8' ry='6' fill='#ff8fa3'/><rect x='56' y='90' width='8' height='8' rx='1.5' fill='#fff'/><path d='M96 22L74 56' stroke='#e0a96b' stroke-width='8' stroke-linecap='round'/><rect x='80' y='10' width='34' height='20' rx='6' fill='#c3c8d4' transform='rotate(32 97 20)'/><path d='M30 40l-6-8M42 30l-2-10M20 54l-10-2' stroke='#fff' stroke-width='3.5' stroke-linecap='round'/></svg>"
};

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  heart: '<path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z"/>',
  heartFill: '<path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z" fill="currentColor"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gamepad: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/>'
};
function ico(name, size) {
  const s = size || 18;
  return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}
function artFor(id) { return GAME_ART[id] || ''; }

const ARCADE_GAMES = [
  { id: 'fruit-slice', title: 'Fruit Slice', category: 'action', badge: 'REFLEX', icon: '🍉', gradient: 'linear-gradient(135deg, #ff3d54 0%, #ff9a3c 100%)', description: 'Swift blade slashing arcade! Slice juicy watermelons, oranges, and pineapples in 60 seconds while avoiding hazard skull bombs.', featured: true, tags: ['blade', 'fruits', 'slicing', 'reflex'], controls: 'Mouse Drag or Touch Swipe across flying fruits.', scoreKey: 'fruit_arcade_high_score', scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'snake', title: 'Neon Snake', category: 'arcade', badge: 'CLASSIC', icon: '🐍', gradient: 'linear-gradient(135deg, #0a8f7c 0%, #35d9a0 100%)', description: 'Cybernetic slither game! Eat glowing apples, track down golden stars for 50-point bonuses, and conquer the cyber grid.', featured: true, tags: ['retro', 'grid', 'cyber', 'classic'], controls: 'Arrow Keys / WASD, Swipe, or Virtual D-Pad.', scoreKey: 'arcade_snake_highscore', scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'brick-breaker', title: 'Brick Breaker', category: 'arcade', badge: 'BREAKOUT', icon: '🧱', gradient: 'linear-gradient(135deg, #e5483a 0%, #f7a23b 100%)', description: 'High-octane breakout action with angle deflections, multi-ball capsules, paddle expanders, and 3 progressive stages.', featured: false, tags: ['breakout', 'paddle', 'ball', 'powerups'], controls: 'Mouse Drag, Left/Right Arrows, or Touch Screen.', scoreKey: 'arcade_bricks_highscore', scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'space-shooter', title: 'Space Shooter', category: 'action', badge: 'SHOOTER', icon: '🚀', gradient: 'linear-gradient(135deg, #2a1c8c 0%, #2e8fe0 100%)', description: 'Vertical parallax space combat! Blast alien drones, dodge laser cruisers, crack tumbling asteroids, and trigger smart bombs.', featured: true, tags: ['space', 'aliens', 'lasers', 'shooter'], controls: 'Arrow Keys / Mouse / Drag to fly + Spacebar or Fire button.', scoreKey: 'arcade_space_highscore', scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'puzzle-2048', title: '2048 Puzzle', category: 'puzzle', badge: 'BRAIN', icon: '🔢', gradient: 'linear-gradient(135deg, #5b3df5 0%, #a76bff 100%)', description: 'Smooth 4x4 tile-sliding puzzle. Merge matching powers of 2, plan with Undo, and engineer the mythical 2048 core!', featured: false, tags: ['numbers', 'merge', 'logic', 'strategy'], controls: 'Arrow Keys / WASD, Swipe, or Touch D-Pad.', scoreKey: 'arcade_2048_highscore', scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'tic-tac-toe', title: 'Tic-Tac-Toe', category: 'strategy', badge: 'VERSUS', icon: '✕◯', gradient: 'linear-gradient(135deg, #0e7cc4 0%, #e8537a 100%)', description: 'Cyber neon battle of wits! Challenge the unbeatable Minimax AI or pass-and-play locally with a friend on the same device.', featured: false, tags: ['minimax', 'ai', 'pvp', 'turn-based'], controls: 'Click or Tap cells to place X and O.', scoreKey: null, scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'memory-match', title: 'Memory Match', category: 'casual', badge: 'NEW', icon: '🃏', gradient: 'linear-gradient(135deg, #14a06f 0%, #6fdcae 100%)', description: 'Interactive 3D card-flipping brain teaser with 8 pairs of arcade relics, match streaks, timer, and 3-star ratings.', featured: false, tags: ['cards', 'flip', 'pairs', 'memory'], controls: 'Click or Tap cards to reveal matching pairs.', scoreKey: 'arcade_memory_best', scoreLabel: 'Fewest moves', scoreUnit: ' moves', scoreLowerIsBetter: true },
  { id: 'endless-runner', title: 'Endless Runner', category: 'action', badge: 'RUNNER', icon: '🏃', gradient: 'linear-gradient(135deg, #1f6fe0 0%, #ffa94d 100%)', description: 'Sprint across neon rooftops! Leap spikes with double-jump and duck under laser drones with fluid slide maneuvers.', featured: false, tags: ['ninja', 'parkour', 'jump', 'slide'], controls: 'Space / Up Arrow to Jump, Down Arrow to Slide.', scoreKey: 'arcade_runner_highscore', scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'block-puzzle', title: 'Block Puzzle', category: 'puzzle', badge: 'RETRO', icon: '🟦', gradient: 'linear-gradient(135deg, #2c1f94 0%, #17b8c9 100%)', description: 'Timeless falling polyominoes arcade with 7 tetrominoes, ghost landing projection, next preview queue, hold piece, and hard drop.', featured: true, tags: ['tetris', 'blocks', 'lines', 'retro'], controls: 'Left/Right, Up to Rotate, Space for Hard Drop, C to Hold.', scoreKey: 'arcade_blocks_highscore', scoreLabel: 'Best score', scoreUnit: '' },
  { id: 'whack-a-mole', title: 'Whack-a-Mole', category: 'casual', badge: 'NEW', icon: '🔨', gradient: 'linear-gradient(135deg, #f0554d 0%, #ffc247 100%)', description: 'Rapid-fire cyber reflex test! Whack pop-up moles, rack up combo multipliers, bag golden stars, and dodge ticking hazard bombs.', featured: false, tags: ['reflex', 'hammer', 'whack', 'combo'], controls: 'Click or Tap moles as fast as they appear.', scoreKey: 'arcade_mole_highscore', scoreLabel: 'Best score', scoreUnit: '' }
];

/**
 * Reads the player's real best result for a game from browser storage.
 * Returns a positive whole number, or null when nothing has been saved yet
 * (or when the game does not track a score).
 */
function getBestScoreForGame(game, storage) {
  if (!game || !game.scoreKey || !storage) return null;
  try {
    const raw = storage.getItem(game.scoreKey);
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (game.scoreLowerIsBetter && n >= 999) return null;
    return n;
  } catch (e) {
    return null;
  }
}

/** Formats a best score for display, e.g. "1,250" or "14 moves". */
function formatBestScore(game, value) {
  return value.toLocaleString('en-US') + (game.scoreUnit || '');
}

/** "action" -> "Action" */
function categoryLabel(game) {
  return game.category.charAt(0).toUpperCase() + game.category.slice(1);
}

class ArcadePortal {
  constructor() {
    this.sound = new SoundManager();
    this.games = ARCADE_GAMES;

    this.currentRoute = 'home';
    this.currentGameId = null;
    this.activeGameInstance = null;
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.featList = [];
    this.featIndex = 0;
    this.heroTimer = null;

    this.favKey = 'arcade_favorites';
    this.recentKey = 'arcade_recently_played';
    this.favorites = JSON.parse(localStorage.getItem(this.favKey) || '["fruit-slice", "snake"]');
    this.recentlyPlayed = JSON.parse(localStorage.getItem(this.recentKey) || '["fruit-slice"]');

    this.handleHashChange = this.handleHashChange.bind(this);
  }

  init() {
    window.ArcadePortal = this;
    window.addEventListener('hashchange', this.handleHashChange);
    this.handleHashChange();
  }

  /** Shared site navigation strip (links to Games / About / Contact). */
  shellSubnav(current) {
    return (typeof SiteShell !== 'undefined') ? SiteShell.subnavHTML(current) : '';
  }

  /** Shared footer with links to every site page. */
  shellFooter() {
    return (typeof SiteShell !== 'undefined') ? SiteShell.footerHTML() : '';
  }

  setPageTitle(title) {
    if (typeof document !== 'undefined') document.title = title;
  }

  getBestScore(game) {
    return getBestScoreForGame(game, typeof localStorage !== 'undefined' ? localStorage : null);
  }

  bestScoreText(game) {
    if (!game.scoreKey) return 'Not tracked';
    const best = this.getBestScore(game);
    return best === null ? 'No score yet' : formatBestScore(game, best);
  }

  startBestScoreRefresh(game) {
    this.stopBestScoreRefresh();
    if (!game.scoreKey || typeof document === 'undefined') return;
    this.bestScoreTimer = setInterval(() => {
      const el = document.getElementById('gd-best-score');
      if (el) el.textContent = this.bestScoreText(game);
    }, 1500);
    if (this.bestScoreTimer && typeof this.bestScoreTimer.unref === 'function') {
      this.bestScoreTimer.unref();
    }
  }

  stopBestScoreRefresh() {
    if (this.bestScoreTimer) {
      clearInterval(this.bestScoreTimer);
      this.bestScoreTimer = null;
    }
  }

  // ---- Featured carousel ----
  startHero() {
    clearTimeout(this.heroTimer);
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.heroTimer = setTimeout(() => this.goSlide(this.featIndex + 1), 6000);
  }

  stopHero() {
    clearTimeout(this.heroTimer);
    this.heroTimer = null;
  }

  goSlide(i) {
    const root = document.querySelector('.fx');
    if (!root || !this.featList.length) return;
    const n = this.featList.length;
    this.featIndex = (i + n) % n;
    root.querySelectorAll('.fx-slide').forEach((s, k) => {
      const on = k === this.featIndex;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', String(!on));
    });
    root.querySelectorAll('.fx-dot').forEach((d, k) => {
      d.classList.remove('is-active');
      if (k === this.featIndex) { void d.offsetWidth; d.classList.add('is-active'); }
    });
    this.startHero();
  }

  handleHashChange() {
    const hash = window.location.hash || '#';

    if (hash.startsWith('#/game/')) {
      this.openGame(hash.replace('#/game/', '').trim());
    } else if (hash.startsWith('#/category/')) {
      this.selectedCategory = hash.replace('#/category/', '').trim();
      this.showHomeView();
    } else if (hash === '#/favorites') {
      this.selectedCategory = 'favorites';
      this.showHomeView();
    } else {
      this.showHomeView();
    }
  }

  navigate(route) {
    window.location.hash = route;
  }

  toggleFavorite(gameId) {
    if (this.favorites.includes(gameId)) {
      this.favorites = this.favorites.filter(id => id !== gameId);
    } else {
      this.favorites.push(gameId);
    }
    localStorage.setItem(this.favKey, JSON.stringify(this.favorites));
    this.sound?.playClick();

    if (this.currentRoute === 'home') {
      this.refreshFavUI();
      this.renderCatalog();
    } else {
      this.updateGameViewFavBtn();
    }
  }

  refreshFavUI() {
    document.querySelectorAll('[data-fav]').forEach(b => {
      const on = this.favorites.includes(b.dataset.fav);
      b.classList.toggle('favorited', on);
      b.innerHTML = ico(on ? 'heartFill' : 'heart') + (on ? 'Saved' : 'Save');
    });
    const a = document.getElementById('fav-count');
    const b = document.getElementById('pill-fav-count');
    if (a) a.textContent = this.favorites.length;
    if (b) b.textContent = this.favorites.length;
  }

  recordPlay(gameId) {
    this.recentlyPlayed = [gameId, ...this.recentlyPlayed.filter(id => id !== gameId)].slice(0, 6);
    localStorage.setItem(this.recentKey, JSON.stringify(this.recentlyPlayed));
  }

  showHomeView() {
    this.currentRoute = 'home';
    this.stopBestScoreRefresh();

    if (this.activeGameInstance) {
      if (typeof this.activeGameInstance.destroy === 'function') this.activeGameInstance.destroy();
      this.activeGameInstance = null;
    }
    this.currentGameId = null;
    this.setPageTitle('Neo Arcade Vault | 10 Free Online Mini-Games');

    if (window.location.hash !== '#' && !window.location.hash.startsWith('#/category/') && window.location.hash !== '#/favorites') {
      window.location.hash = '#';
    }

    const gamePortalView = document.getElementById('game-portal-view');
    const homePortalView = document.getElementById('home-portal-view');
    if (gamePortalView) gamePortalView.classList.add('hidden');
    if (homePortalView) homePortalView.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'instant' });
    this.renderHome();
  }

  renderHome() {
    const homeView = document.getElementById('home-portal-view');
    if (!homeView) return;
    this.stopHero();

    this.featList = this.games.filter(g => g.featured);
    if (!this.featList.length) this.featList = [this.games[0]];
    this.featIndex = 0;

    const cats = [['all', 'All games'], ['action', 'Action'], ['arcade', 'Arcade'], ['puzzle', 'Puzzle'], ['strategy', 'Strategy'], ['casual', 'Casual']];

    const slides = this.featList.map((g, i) => {
      const fav = this.favorites.includes(g.id);
      const best = this.getBestScore(g);
      return `
        <article class="fx-slide ${i === 0 ? 'is-active' : ''}" style="--g: ${g.gradient}" aria-hidden="${i !== 0}">
          <div class="fx-copy">
            <span class="fx-kicker">${ico('gamepad', 16)} Featured · ${categoryLabel(g)}</span>
            <h2 class="fx-title">${g.title}</h2>
            <p class="fx-desc">${g.description}</p>
            <div class="fx-meta">
              <span class="fx-chip">${ico('trophy', 15)} ${best === null ? 'Set your first score' : 'Your best: ' + formatBestScore(g, best)}</span>
              <span class="fx-chip">Free · No sign-up</span>
            </div>
            <div class="fx-actions">
              <button class="fx-play" data-play="${g.id}">${ico('play', 18)} Play now</button>
              <button class="fx-save ${fav ? 'favorited' : ''}" data-fav="${g.id}">${ico(fav ? 'heartFill' : 'heart')}${fav ? 'Saved' : 'Save'}</button>
            </div>
          </div>
          <div class="fx-art" aria-hidden="true">${artFor(g.id)}</div>
        </article>`;
    }).join('');

    homeView.innerHTML = `
      <nav class="arcade-navbar">
        <div class="nav-brand" onclick="window.location.hash = '#'">
          <span class="brand-bolt">⚡</span>
          <span class="brand-text">NEO ARCADE</span>
          <span class="brand-badge">VAULT</span>
        </div>

        <div class="nav-search-bar">
          <span class="search-icon">${ico('search', 18)}</span>
          <input type="text" id="arcade-search-input" placeholder="Search games, genres, tags" aria-label="Search games" value="${this.searchQuery}">
          ${this.searchQuery ? '<button id="arcade-search-clear" class="search-clear-btn" aria-label="Clear search">✕</button>' : ''}
        </div>

        <div class="nav-actions">
          <button id="nav-btn-random" class="nav-icon-btn" title="Play a random game">${ico('shuffle')}<span class="lbl">Random</span></button>
          <button id="nav-btn-favs" class="nav-icon-btn ${this.selectedCategory === 'favorites' ? 'active' : ''}" title="View favorites">${ico('heart')}<span class="lbl">Favorites</span> <span id="fav-count">${this.favorites.length}</span></button>
          <button id="nav-btn-sound" class="nav-icon-btn" title="Toggle sound" aria-label="Toggle sound">${ico(this.sound.enabled ? 'volume' : 'mute')}</button>
        </div>
      </nav>

      ${this.shellSubnav('/')}

      <main id="main-content">
      <h1 class="sr-only">Neo Arcade Vault: free online mini-games</h1>
      <section class="fx" aria-roledescription="carousel" aria-label="Featured games">
        ${slides}
        <div class="fx-dots">
          ${this.featList.map((g, i) => `<button class="fx-dot ${i === 0 ? 'is-active' : ''}" data-slide="${i}" aria-label="Show ${g.title}"></button>`).join('')}
        </div>
      </section>

      <section class="catalog-header-section">
        <div class="section-title-wrap">
          <h2 class="section-title">Game vault</h2>
          <span class="section-counter" id="catalog-game-count">${this.games.length} games</span>
        </div>
        <div class="category-pills-bar">
          ${cats.map(([k, label]) => `<button class="cat-pill ${this.selectedCategory === k ? 'active' : ''}" data-cat="${k}">${label}</button>`).join('')}
          <button class="cat-pill ${this.selectedCategory === 'favorites' ? 'active' : ''}" data-cat="favorites">Favorites (<span id="pill-fav-count">${this.favorites.length}</span>)</button>
        </div>
      </section>

      ${this.renderRecentGamesSection()}

      <section class="catalog-grid-section">
        <div id="games-grid" class="games-grid"></div>
      </section>
      </main>

      ${this.shellFooter()}
    `;

    // Carousel
    homeView.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => this.openGame(b.dataset.play)));
    homeView.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', () => this.toggleFavorite(b.dataset.fav)));
    homeView.querySelectorAll('.fx-dot').forEach(d => d.addEventListener('click', () => this.goSlide(parseInt(d.dataset.slide, 10))));
    const fx = homeView.querySelector('.fx');
    fx?.addEventListener('mouseenter', () => { fx.classList.add('is-paused'); this.stopHero(); });
    fx?.addEventListener('mouseleave', () => { fx.classList.remove('is-paused'); this.goSlide(this.featIndex); });
    this.startHero();

    // Search + filters
    const searchInput = document.getElementById('arcade-search-input');
    const searchClear = document.getElementById('arcade-search-clear');

    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderCatalog();
    });
    searchClear?.addEventListener('click', () => {
      this.searchQuery = '';
      if (searchInput) searchInput.value = '';
      this.renderCatalog();
    });

    document.getElementById('nav-btn-random')?.addEventListener('click', () => {
      this.sound?.playClick();
      const randomGame = this.games[Math.floor(Math.random() * this.games.length)];
      this.navigate(`#/game/${randomGame.id}`);
    });
    document.getElementById('nav-btn-favs')?.addEventListener('click', () => {
      this.sound?.playClick();
      this.selectedCategory = 'favorites';
      this.renderHome();
    });
    document.getElementById('nav-btn-sound')?.addEventListener('click', (e) => {
      this.sound.toggle();
      e.currentTarget.innerHTML = ico(this.sound.enabled ? 'volume' : 'mute');
    });

    homeView.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.sound?.playClick();
        this.selectedCategory = pill.getAttribute('data-cat');
        homeView.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderCatalog();
      });
    });

    this.renderCatalog();
  }

  renderRecentGamesSection() {
    const recentGames = this.recentlyPlayed.map(id => this.games.find(g => g.id === id)).filter(Boolean);
    if (recentGames.length === 0) return '';
    return `
      <section class="recent-bar-section">
        <div class="recent-bar-header"><span class="recent-label">CONTINUE PLAYING</span></div>
        <div class="recent-chips-row">
          ${recentGames.map(g => `
            <div class="recent-chip" onclick="window.ArcadePortal.openGame('${g.id}')">
              <span class="chip-icon" style="background: ${g.gradient}">${artFor(g.id)}</span>
              <span class="chip-title">${g.title}</span>
            </div>`).join('')}
        </div>
      </section>`;
  }

  getFilteredGames() {
    return this.games.filter(game => {
      if (this.selectedCategory === 'favorites') {
        if (!this.favorites.includes(game.id)) return false;
      } else if (this.selectedCategory !== 'all') {
        if (game.category !== this.selectedCategory) return false;
      }
      if (this.searchQuery) {
        const q = this.searchQuery;
        const hit = game.title.toLowerCase().includes(q) || game.description.toLowerCase().includes(q) ||
          game.category.toLowerCase().includes(q) || game.tags.some(t => t.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }

  renderCatalog() {
    const grid = document.getElementById('games-grid');
    const countEl = document.getElementById('catalog-game-count');
    if (!grid) return;

    const filtered = this.getFilteredGames();
    if (countEl) countEl.textContent = `${filtered.length} game${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-catalog-box">
          <span class="empty-icon">${ico('search', 40)}</span>
          <h3>No games found</h3>
          <p>Nothing matched your search or filter. Try a different word or reset the filters.</p>
          <button class="arcade-btn-primary" style="max-width:240px;margin-top:16px" onclick="window.ArcadePortal.resetFilters()">Reset filters</button>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(game => {
      const isFav = this.favorites.includes(game.id);
      const best = this.getBestScore(game);
      return `
        <article class="game-card" data-id="${game.id}" onclick="window.ArcadePortal.openGame('${game.id}')">
          <div class="card-art" style="background: ${game.gradient};">
            <div class="card-art-icon">${artFor(game.id)}</div>
            <span class="card-badge">${game.badge}</span>
            <button class="card-fav-btn ${isFav ? 'active' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
                    onclick="event.stopPropagation(); window.ArcadePortal.toggleFavorite('${game.id}')">${ico(isFav ? 'heartFill' : 'heart', 16)}</button>
            <span class="card-play" aria-hidden="true">${ico('play', 20)}</span>
          </div>
          <div class="card-info">
            <div class="card-header-row"><h3 class="card-title">${game.title}</h3></div>
            <div class="card-footer-row">
              <span class="card-cat-tag">${categoryLabel(game)}</span>
              ${best === null ? '' : `<span class="card-rating" title="Your best on this device">${ico('trophy', 14)} ${formatBestScore(game, best)}</span>`}
            </div>
          </div>
        </article>`;
    }).join('');
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.renderHome();
  }

  openGame(gameId) {
    const game = this.games.find(g => g.id === gameId);
    if (!game) { this.navigate('#'); return; }

    if (window.location.hash !== `#/game/${gameId}`) window.location.hash = `#/game/${gameId}`;

    this.currentRoute = 'game';
    this.stopHero();
    this.stopBestScoreRefresh();
    this.currentGameId = gameId;
    this.setPageTitle(`Play ${game.title} Free Online | Neo Arcade Vault`);
    this.recordPlay(gameId);

    if (this.activeGameInstance) {
      if (typeof this.activeGameInstance.destroy === 'function') this.activeGameInstance.destroy();
      this.activeGameInstance = null;
    }

    const homePortalView = document.getElementById('home-portal-view');
    const gamePortalView = document.getElementById('game-portal-view');
    if (homePortalView) homePortalView.classList.add('hidden');
    if (gamePortalView) gamePortalView.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'instant' });
    this.renderGameView(game);
  }

  renderGameView(game) {
    const gameView = document.getElementById('game-portal-view');
    if (!gameView) return;
    const isFav = this.favorites.includes(game.id);

    gameView.innerHTML = `
      ${this.shellSubnav(null)}

      <main class="game-main">
      <div class="game-view-header">
        <div class="gv-left">
          <button class="btn-back-arcade" onclick="window.ArcadePortal.showHomeView()">${ico('back', 16)} Back to arcade</button>
          <div class="gv-title-meta">
            <h2 class="gv-title"><span class="gv-icon">${artFor(game.id)}</span>${game.title}</h2>
            <span class="gv-cat-badge">${categoryLabel(game)}</span>
          </div>
        </div>
        <div class="gv-actions">
          <button id="gv-btn-fav" class="gv-btn ${isFav ? 'active' : ''}" title="Favorite" aria-label="Favorite">${ico(isFav ? 'heartFill' : 'heart')}</button>
          <button id="gv-btn-restart" class="gv-btn" title="Restart" aria-label="Restart">${ico('refresh')}</button>
          <button id="gv-btn-sound" class="gv-btn" title="Toggle sound" aria-label="Toggle sound">${ico(this.sound.enabled ? 'volume' : 'mute')}</button>
          <button id="gv-btn-fullscreen" class="gv-btn" title="Fullscreen" aria-label="Fullscreen">${ico('expand')}</button>
          <button id="gv-btn-help" class="gv-btn" title="Instructions" aria-label="Instructions">${ico('help')}</button>
        </div>
      </div>

      <div id="game-viewport" class="game-viewport"></div>

      <div class="game-details-box">
        <div class="gd-col">
          <h3>${ico('gamepad', 20)} How to play</h3>
          <p>${game.controls}</p>
          <p style="margin-top: 8px; color: var(--text-muted); font-size: 0.88rem;">${game.description}</p>
        </div>
        <div class="gd-col stats-box">
          <h3>${ico('trophy', 20)} Your records</h3>
          <div class="gd-stat-row"><span>Category</span><span style="color: var(--accent-2);">${categoryLabel(game)}</span></div>
          <div class="gd-stat-row"><span>${game.scoreLabel}</span><span id="gd-best-score" style="color: var(--yellow);">${this.bestScoreText(game)}</span></div>
          <div class="gd-stat-row"><span>Saved</span><span>This device only</span></div>
        </div>
      </div>

      <div class="gv-suggested-section">
        <h3 class="gv-suggested-title">More games</h3>
        <div class="gv-suggested-grid">
          ${this.games.filter(g => g.id !== game.id).slice(0, 4).map(other => `
            <div class="suggested-card" onclick="window.ArcadePortal.openGame('${other.id}')">
              <span class="sc-icon" style="--g: ${other.gradient}">${artFor(other.id)}</span>
              <div class="sc-info">
                <span class="sc-title">${other.title}</span>
                <span class="sc-cat">${categoryLabel(other)}</span>
              </div>
              <button class="sc-btn">Play ${ico('play', 12)}</button>
            </div>`).join('')}
        </div>
      </div>
      </main>

      ${this.shellFooter()}
    `;

    document.getElementById('gv-btn-fav')?.addEventListener('click', () => this.toggleFavorite(game.id));

    document.getElementById('gv-btn-restart')?.addEventListener('click', () => {
      this.sound?.playClick();
      if (this.activeGameInstance?.restart) this.activeGameInstance.restart();
      else if (this.activeGameInstance?.start) this.activeGameInstance.start();
      else this.mountGame(game.id, document.getElementById('game-viewport'));
    });

    document.getElementById('gv-btn-sound')?.addEventListener('click', (e) => {
      this.sound.toggle();
      e.currentTarget.innerHTML = ico(this.sound.enabled ? 'volume' : 'mute');
    });

    document.getElementById('gv-btn-fullscreen')?.addEventListener('click', () => {
      const vp = document.getElementById('game-viewport');
      if (!document.fullscreenElement) vp?.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
    });

    document.getElementById('gv-btn-help')?.addEventListener('click', () => {
      alert(`Instructions for ${game.title}:\n\n${game.description}\n\nControls:\n${game.controls}`);
    });

    const viewport = document.getElementById('game-viewport');
    this.mountGame(game.id, viewport);
    this.startBestScoreRefresh(game);
  }

  updateGameViewFavBtn() {
    const btn = document.getElementById('gv-btn-fav');
    if (btn && this.currentGameId) {
      const isFav = this.favorites.includes(this.currentGameId);
      btn.innerHTML = ico(isFav ? 'heartFill' : 'heart');
      btn.classList.toggle('active', isFav);
    }
  }

  mountGame(gameId, viewport) {
    if (!viewport) return;

    if (gameId === 'fruit-slice') {
      // Fruit Slice markup lives in the <template id="fruit-slice-template"> in index.html
      const tpl = document.getElementById('fruit-slice-template');
      if (!tpl) return;
      viewport.innerHTML = tpl.innerHTML;
      document.getElementById('btn-bomb-toggle')?.classList.add('active');
      const snd = document.getElementById('btn-sound');
      if (snd) snd.textContent = this.sound.enabled ? '🔊' : '🔇';

      this.activeGameInstance = new FruitArcadeGame();
      setTimeout(() => {
        if (this.activeGameInstance?.resizeCanvas) this.activeGameInstance.resizeCanvas();
      }, 50);
    } else if (gameId === 'snake') {
      this.activeGameInstance = new NeonSnakeGame(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'brick-breaker') {
      this.activeGameInstance = new BrickBreakerGame(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'space-shooter') {
      this.activeGameInstance = new SpaceShooterGame(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'puzzle-2048') {
      this.activeGameInstance = new Puzzle2048Game(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'tic-tac-toe') {
      this.activeGameInstance = new TicTacToeGame(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'memory-match') {
      this.activeGameInstance = new MemoryMatchGame(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'endless-runner') {
      this.activeGameInstance = new EndlessRunnerGame(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'block-puzzle') {
      this.activeGameInstance = new BlockPuzzleGame(viewport, this.sound);
      this.activeGameInstance.init();
    } else if (gameId === 'whack-a-mole') {
      this.activeGameInstance = new WhackAMoleGame(viewport, this.sound);
      this.activeGameInstance.init();
    }
  }
}

// Bootstrap Arcade Portal
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('DOMContentLoaded', () => {
    const portal = new ArcadePortal();
    portal.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ARCADE_GAMES, ArcadePortal, getBestScoreForGame, formatBestScore, categoryLabel };
}
