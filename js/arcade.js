/**
 * Arcade Portal Architecture & Game Registry
 * Coordinates routing, game discovery, search/filtering, favorites,
 * recents, and modular game lifecycles.
 */

const ARCADE_GAMES = [
  {
    id: 'fruit-slice',
    title: 'Fruit Slice',
    category: 'action',
    badge: 'REFLEX',
    icon: '🍉',
    gradient: 'linear-gradient(135deg, #ff4757 0%, #ffa502 100%)',
    description: 'Swift blade slashing arcade! Slice juicy watermelons, oranges, and pineapples in 60 seconds while avoiding hazard skull bombs.',
    featured: true,
    tags: ['blade', 'fruits', 'slicing', 'reflex'],
    controls: 'Mouse Drag or Touch Swipe across flying fruits.',
    scoreKey: 'fruit_arcade_high_score',
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'snake',
    title: 'Neon Snake',
    category: 'arcade',
    badge: 'CLASSIC',
    icon: '🐍',
    gradient: 'linear-gradient(135deg, #00d2d3 0%, #10ac84 100%)',
    description: 'Cybernetic slither game! Eat glowing apples, track down golden stars for 50-point bonuses, and conquer the cyber grid.',
    featured: true,
    tags: ['retro', 'grid', 'cyber', 'classic'],
    controls: 'Arrow Keys / WASD, Swipe, or Virtual D-Pad.',
    scoreKey: 'arcade_snake_highscore',
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'brick-breaker',
    title: 'Brick Breaker',
    category: 'arcade',
    badge: 'BREAKOUT',
    icon: '🧱',
    gradient: 'linear-gradient(135deg, #ffa502 0%, #ff4757 100%)',
    description: 'High-octane breakout action with angle deflections, multi-ball capsules, paddle expanders, and 3 progressive stages.',
    featured: false,
    tags: ['breakout', 'paddle', 'ball', 'powerups'],
    controls: 'Mouse Drag, Left/Right Arrows, or Touch Screen.',
    scoreKey: 'arcade_bricks_highscore',
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'space-shooter',
    title: 'Space Shooter',
    category: 'action',
    badge: 'SHOOTER',
    icon: '🚀',
    gradient: 'linear-gradient(135deg, #5f27cd 0%, #00d2d3 100%)',
    description: 'Vertical parallax space combat! Blast alien drones, dodge laser cruisers, crack tumbling asteroids, and trigger smart bombs.',
    featured: true,
    tags: ['space', 'aliens', 'lasers', 'shooter'],
    controls: 'Arrow Keys / Mouse / Drag to fly + Spacebar or Fire button.',
    scoreKey: 'arcade_space_highscore',
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'puzzle-2048',
    title: '2048 Puzzle',
    category: 'puzzle',
    badge: 'BRAIN',
    icon: '🔢',
    gradient: 'linear-gradient(135deg, #ff9f43 0%, #ee5253 100%)',
    description: 'Smooth 4x4 tile-sliding puzzle. Merge matching powers of 2, plan with Undo, and engineer the mythical 2048 core!',
    featured: false,
    tags: ['numbers', 'merge', 'logic', 'strategy'],
    controls: 'Arrow Keys / WASD, Swipe, or Touch D-Pad.',
    scoreKey: 'arcade_2048_highscore',
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic-Tac-Toe',
    category: 'strategy',
    badge: 'VERSUS',
    icon: '✕◯',
    gradient: 'linear-gradient(135deg, #0abde3 0%, #ee5253 100%)',
    description: 'Cyber neon battle of wits! Challenge the unbeatable Minimax AI or pass-and-play locally with a friend on the same device.',
    featured: false,
    tags: ['minimax', 'ai', 'pvp', 'turn-based'],
    controls: 'Click or Tap cells to place X and O.',
    scoreKey: null,
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    category: 'casual',
    badge: 'NEW',
    icon: '🃏',
    gradient: 'linear-gradient(135deg, #10ac84 0%, #1dd1a1 100%)',
    description: 'Interactive 3D card-flipping brain teaser with 8 pairs of arcade relics, match streaks, timer, and 3-star ratings.',
    featured: false,
    tags: ['cards', 'flip', 'pairs', 'memory'],
    controls: 'Click or Tap cards to reveal matching pairs.',
    scoreKey: 'arcade_memory_best',
    scoreLabel: 'Fewest moves',
    scoreUnit: ' moves',
    scoreLowerIsBetter: true
  },
  {
    id: 'endless-runner',
    title: 'Endless Runner',
    category: 'action',
    badge: 'RUNNER',
    icon: '🏃',
    gradient: 'linear-gradient(135deg, #2e86de 0%, #ff9f43 100%)',
    description: 'Sprint across neon rooftops! Leap spikes with double-jump and duck under laser drones with fluid slide maneuvers.',
    featured: false,
    tags: ['ninja', 'parkour', 'jump', 'slide'],
    controls: 'Space / Up Arrow to Jump, Down Arrow to Slide.',
    scoreKey: 'arcade_runner_highscore',
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'block-puzzle',
    title: 'Block Puzzle',
    category: 'puzzle',
    badge: 'RETRO',
    icon: '🟦',
    gradient: 'linear-gradient(135deg, #341f97 0%, #00d2d3 100%)',
    description: 'Timeless falling polyominoes arcade with 7 tetrominoes, ghost landing projection, next preview queue, hold piece, and hard drop.',
    featured: true,
    tags: ['tetris', 'blocks', 'lines', 'retro'],
    controls: 'Left/Right, Up to Rotate, Space for Hard Drop, C to Hold.',
    scoreKey: 'arcade_blocks_highscore',
    scoreLabel: 'Best score',
    scoreUnit: ''
  },
  {
    id: 'whack-a-mole',
    title: 'Whack-a-Mole',
    category: 'casual',
    badge: 'NEW',
    icon: '🔨',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    description: 'Rapid-fire cyber reflex test! Whack pop-up moles, rack up combo multipliers, bag golden stars, and dodge ticking hazard bombs.',
    featured: false,
    tags: ['reflex', 'hammer', 'whack', 'combo'],
    controls: 'Click or Tap moles as fast as they appear.',
    scoreKey: 'arcade_mole_highscore',
    scoreLabel: 'Best score',
    scoreUnit: ''
  }
];

/**
 * Reads the player's real best result for a game from browser storage.
 * Returns a positive whole number, or null when nothing has been saved yet
 * (or when the game does not track a score). Nothing is invented: the value
 * comes only from the score the game itself saved on this device.
 */
function getBestScoreForGame(game, storage) {
  if (!game || !game.scoreKey || !storage) return null;
  try {
    const raw = storage.getItem(game.scoreKey);
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    // Memory Match uses 999 as its "no record yet" value (fewer moves is better)
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

    // State
    this.currentRoute = 'home';
    this.currentGameId = null;
    this.activeGameInstance = null;
    this.searchQuery = '';
    this.selectedCategory = 'all';

    // LocalStorage
    this.favKey = 'arcade_favorites';
    this.recentKey = 'arcade_recently_played';
    this.favorites = JSON.parse(localStorage.getItem(this.favKey) || '["fruit-slice", "snake"]');
    this.recentlyPlayed = JSON.parse(localStorage.getItem(this.recentKey) || '["fruit-slice"]');

    // Bindings
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  init() {
    window.ArcadePortal = this;

    // Listen for hash route navigation
    window.addEventListener('hashchange', this.handleHashChange);

    // Initial route check
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

  /** Keeps the browser tab title meaningful as hash routes change. */
  setPageTitle(title) {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  }

  /** The player's real best result for a game (number) or null. */
  getBestScore(game) {
    return getBestScoreForGame(game, typeof localStorage !== 'undefined' ? localStorage : null);
  }

  /** Text for the "your best" display in the game details panel. */
  bestScoreText(game) {
    if (!game.scoreKey) return 'Not tracked';
    const best = this.getBestScore(game);
    return best === null ? 'No score yet' : formatBestScore(game, best);
  }

  /** Keeps the game-details best score current while a game is being played. */
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

  handleHashChange() {
    const hash = window.location.hash || '#';

    if (hash.startsWith('#/game/')) {
      const gameId = hash.replace('#/game/', '').trim();
      this.openGame(gameId);
    } else if (hash.startsWith('#/category/')) {
      const cat = hash.replace('#/category/', '').trim();
      this.selectedCategory = cat;
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

    // Re-render favorites if on home or update game view button
    if (this.currentRoute === 'home') {
      this.renderCatalog();
    } else {
      this.updateGameViewFavBtn();
    }
  }

  recordPlay(gameId) {
    this.recentlyPlayed = [gameId, ...this.recentlyPlayed.filter(id => id !== gameId)].slice(0, 6);
    localStorage.setItem(this.recentKey, JSON.stringify(this.recentlyPlayed));
  }

  showHomeView() {
    this.currentRoute = 'home';
    this.stopBestScoreRefresh();

    // Clean up any active running game
    if (this.activeGameInstance) {
      if (typeof this.activeGameInstance.destroy === 'function') {
        this.activeGameInstance.destroy();
      }
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

    const featuredGame = this.games.find(g => g.id === 'fruit-slice') || this.games[0];
    const isFeatFav = this.favorites.includes(featuredGame.id);
    const featuredBest = this.getBestScore(featuredGame);

    homeView.innerHTML = `
      <!-- Arcade Navigation Header -->
      <nav class="arcade-navbar">
        <div class="nav-brand" onclick="window.location.hash = '#'">
          <span class="brand-bolt">⚡</span>
          <span class="brand-text">NEO ARCADE</span>
          <span class="brand-badge">VAULT</span>
        </div>

        <div class="nav-search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="arcade-search-input" placeholder="Search 10 games, genres, tags..." value="${this.searchQuery}">
          ${this.searchQuery ? '<button id="arcade-search-clear" class="search-clear-btn">✕</button>' : ''}
        </div>

        <div class="nav-actions">
          <button id="nav-btn-random" class="nav-icon-btn" title="Surprise Me! Launch Random Game">🎲 Random</button>
          <button id="nav-btn-favs" class="nav-icon-btn ${this.selectedCategory === 'favorites' ? 'active' : ''}" title="View Favorites">❤️ Favs (${this.favorites.length})</button>
          <button id="nav-btn-sound" class="nav-icon-btn" title="Toggle Sound">${this.sound.enabled ? '🔊' : '🔇'}</button>
        </div>
      </nav>

      <!-- Site navigation (shared with About / Contact / legal pages) -->
      ${this.shellSubnav('/')}

      <!-- Hero Section with Featured Showcase -->
      <section class="arcade-hero">
        <div class="hero-content">
          <div class="hero-tag">🌟 FEATURED GAME</div>
          <h1 class="hero-title">${featuredGame.title.toUpperCase()}</h1>
          <p class="hero-description">${featuredGame.description}</p>
          <div class="hero-meta">
            <span class="meta-item">🕹️ ${categoryLabel(featuredGame)}</span>
            <span class="meta-item">🏆 ${featuredBest === null ? 'Play to set a score' : 'Your best: ' + formatBestScore(featuredGame, featuredBest)}</span>
            <span class="meta-item">🆓 Free to play</span>
          </div>
          <div class="hero-actions">
            <button class="hero-play-btn" onclick="window.ArcadePortal.openGame('${featuredGame.id}')">
              <span>⚔️</span> PLAY NOW
            </button>
            <button class="hero-fav-btn ${isFeatFav ? 'favorited' : ''}" onclick="window.ArcadePortal.toggleFavorite('${featuredGame.id}')">
              ${isFeatFav ? '❤️ Favorited' : '🤍 Add to Favorites'}
            </button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-badge-card" style="background: ${featuredGame.gradient}">
            <span class="hero-large-icon">${featuredGame.icon}</span>
            <div class="hero-visual-ribbon">ARCADE BLITZ</div>
          </div>
        </div>
      </section>

      <!-- Platform Features Strip -->
      <section class="platform-features-strip">
        <div class="feat-badge"><span class="feat-icon">⚡</span> <span>10 Playable Arcade Mini-Games</span></div>
        <div class="feat-badge"><span class="feat-icon">🔊</span> <span>Web Audio Synth • Zero Downloads</span></div>
        <div class="feat-badge"><span class="feat-icon">📱</span> <span>Desktop & Mobile Touch Controls</span></div>
        <div class="feat-badge"><span class="feat-icon">🏆</span> <span>High Scores & Favorites Saved</span></div>
      </section>

      <!-- Category Filter Tabs -->
      <section class="catalog-header-section">
        <div class="section-title-wrap">
          <h2 class="section-title">GAME VAULT</h2>
          <span class="section-counter" id="catalog-game-count">10 Games Ready</span>
        </div>

        <div class="category-pills-bar">
          <button class="cat-pill ${this.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">🎮 All Games (10)</button>
          <button class="cat-pill ${this.selectedCategory === 'action' ? 'active' : ''}" data-cat="action">⚔️ Action</button>
          <button class="cat-pill ${this.selectedCategory === 'arcade' ? 'active' : ''}" data-cat="arcade">🕹️ Arcade</button>
          <button class="cat-pill ${this.selectedCategory === 'puzzle' ? 'active' : ''}" data-cat="puzzle">🧩 Puzzle</button>
          <button class="cat-pill ${this.selectedCategory === 'strategy' ? 'active' : ''}" data-cat="strategy">♟️ Strategy</button>
          <button class="cat-pill ${this.selectedCategory === 'casual' ? 'active' : ''}" data-cat="casual">🎯 Casual</button>
          <button class="cat-pill ${this.selectedCategory === 'favorites' ? 'active' : ''}" data-cat="favorites">❤️ Favorites (${this.favorites.length})</button>
        </div>
      </section>

      <!-- Recently Played Bar if exists -->
      ${this.renderRecentGamesSection()}

      <!-- Main Game Cards Catalog Grid -->
      <section class="catalog-grid-section">
        <div id="games-grid" class="games-grid"></div>
      </section>

      <!-- Footer (shared with every page) -->
      ${this.shellFooter()}
    `;

    // Bind search and filter events
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
      e.target.textContent = this.sound.enabled ? '🔊' : '🔇';
    });

    // Category pills click
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
    if (this.recentlyPlayed.length === 0) return '';
    const recentGames = this.recentlyPlayed
      .map(id => this.games.find(g => g.id === id))
      .filter(Boolean);

    if (recentGames.length === 0) return '';

    return `
      <section class="recent-bar-section">
        <div class="recent-bar-header">
          <span class="recent-label">⏱️ RECENTLY PLAYED</span>
        </div>
        <div class="recent-chips-row">
          ${recentGames.map(g => `
            <div class="recent-chip" onclick="window.ArcadePortal.openGame('${g.id}')">
              <span class="chip-icon">${g.icon}</span>
              <span class="chip-title">${g.title}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  getFilteredGames() {
    return this.games.filter(game => {
      // Category filter
      if (this.selectedCategory === 'favorites') {
        if (!this.favorites.includes(game.id)) return false;
      } else if (this.selectedCategory !== 'all') {
        if (game.category !== this.selectedCategory) return false;
      }

      // Search query filter
      if (this.searchQuery) {
        const matchesTitle = game.title.toLowerCase().includes(this.searchQuery);
        const matchesDesc = game.description.toLowerCase().includes(this.searchQuery);
        const matchesCategory = game.category.toLowerCase().includes(this.searchQuery);
        const matchesTags = game.tags.some(t => t.toLowerCase().includes(this.searchQuery));
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesTags) return false;
      }

      return true;
    });
  }

  renderCatalog() {
    const grid = document.getElementById('games-grid');
    const countEl = document.getElementById('catalog-game-count');
    if (!grid) return;

    const filtered = this.getFilteredGames();
    if (countEl) {
      countEl.textContent = `${filtered.length} Game${filtered.length === 1 ? '' : 's'} Found`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-catalog-box">
          <span class="empty-icon">🔍</span>
          <h3>No Games Found</h3>
          <p>No games matched your search "${this.searchQuery}" or category filter.</p>
          <button class="arcade-btn-primary" onclick="window.ArcadePortal.resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(game => {
      const isFav = this.favorites.includes(game.id);
      const best = this.getBestScore(game);
      return `
        <div class="game-card" data-id="${game.id}" onclick="window.ArcadePortal.openGame('${game.id}')">
          <div class="card-art" style="background: ${game.gradient};">
            <span class="card-art-icon">${game.icon}</span>
            <span class="card-badge">${game.badge}</span>
            <button class="card-fav-btn ${isFav ? 'active' : ''}" 
                    title="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
                    onclick="event.stopPropagation(); window.ArcadePortal.toggleFavorite('${game.id}')">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
          <div class="card-info">
            <div class="card-header-row">
              <h3 class="card-title">${game.title}</h3>
              ${best === null ? '' : `<span class="card-rating" title="Your best on this device">🏆 ${formatBestScore(game, best)}</span>`}
            </div>
            <p class="card-desc">${game.description}</p>
            <div class="card-footer-row">
              <span class="card-cat-tag">${game.category.toUpperCase()}</span>
              <button class="card-play-btn" onclick="event.stopPropagation(); window.ArcadePortal.openGame('${game.id}')">
                <span>▶️</span> PLAY NOW
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.renderHome();
  }

  openGame(gameId) {
    const game = this.games.find(g => g.id === gameId);
    if (!game) {
      this.navigate('#');
      return;
    }

    if (window.location.hash !== `#/game/${gameId}`) {
      window.location.hash = `#/game/${gameId}`;
    }

    this.currentRoute = 'game';
    this.stopBestScoreRefresh();
    this.currentGameId = gameId;
    this.setPageTitle(`Play ${game.title} Free Online | Neo Arcade Vault`);
    this.recordPlay(gameId);

    // Stop previous game if active
    if (this.activeGameInstance) {
      if (typeof this.activeGameInstance.destroy === 'function') {
        this.activeGameInstance.destroy();
      }
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

      <!-- Game Top Bar / Breadcrumbs -->
      <div class="game-view-header">
        <div class="gv-left">
          <button class="btn-back-arcade" onclick="window.ArcadePortal.showHomeView()">
            <span>←</span> BACK TO ARCADE
          </button>
          <div class="gv-title-meta">
            <h2 class="gv-title">${game.icon} ${game.title}</h2>
            <span class="gv-cat-badge">${game.category.toUpperCase()}</span>
          </div>
        </div>

        <div class="gv-actions">
          <button id="gv-btn-fav" class="gv-btn ${isFav ? 'active' : ''}" title="Favorite Game">
            ${isFav ? '❤️' : '🤍'}
          </button>
          <button id="gv-btn-restart" class="gv-btn" title="Restart Game">
            🔄
          </button>
          <button id="gv-btn-sound" class="gv-btn" title="Toggle Sound">
            ${this.sound.enabled ? '🔊' : '🔇'}
          </button>
          <button id="gv-btn-fullscreen" class="gv-btn" title="Toggle Fullscreen">
            ⛶
          </button>
          <button id="gv-btn-help" class="gv-btn" title="Instructions">
            ❓
          </button>
        </div>
      </div>

      <!-- Active Game Viewport Container -->
      <div id="game-viewport" class="game-viewport">
        <!-- Game mounts here -->
      </div>

      <!-- Below Game Details & Controls Guide -->
      <div class="game-details-box">
        <div class="gd-col">
          <h3>🎮 HOW TO PLAY & CONTROLS</h3>
          <p>${game.controls}</p>
          <p style="margin-top: 8px; color: var(--text-muted); font-size: 0.88rem;">
            ${game.description}
          </p>
        </div>
        <div class="gd-col stats-box">
          <h3>🏆 YOUR RECORDS</h3>
          <div class="gd-stat-row">
            <span>CATEGORY</span>
            <span style="color: #fffa65;">${categoryLabel(game)}</span>
          </div>
          <div class="gd-stat-row">
            <span>${game.scoreLabel.toUpperCase()}</span>
            <span id="gd-best-score" style="color: #00d2d3;">${this.bestScoreText(game)}</span>
          </div>
          <div class="gd-stat-row">
            <span>SAVED</span>
            <span>This device only</span>
          </div>
        </div>
      </div>

      <!-- Suggested Other Games Carousel -->
      <div class="gv-suggested-section">
        <h3 class="gv-suggested-title">🕹️ EXPLORE MORE GAMES</h3>
        <div class="gv-suggested-grid">
          ${this.games.filter(g => g.id !== game.id).slice(0, 4).map(other => `
            <div class="suggested-card" onclick="window.ArcadePortal.openGame('${other.id}')">
              <span class="sc-icon">${other.icon}</span>
              <div class="sc-info">
                <span class="sc-title">${other.title}</span>
                <span class="sc-cat">${other.category.toUpperCase()}</span>
              </div>
              <button class="sc-btn">PLAY ▶</button>
            </div>
          `).join('')}
        </div>
      </div>

      ${this.shellFooter()}
    `;

    // Bind Top Bar controls
    document.getElementById('gv-btn-fav')?.addEventListener('click', () => {
      this.toggleFavorite(game.id);
    });

    document.getElementById('gv-btn-restart')?.addEventListener('click', () => {
      this.sound?.playClick();
      if (this.activeGameInstance?.restart) {
        this.activeGameInstance.restart();
      } else if (this.activeGameInstance?.start) {
        this.activeGameInstance.start();
      } else {
        this.mountGame(game.id, document.getElementById('game-viewport'));
      }
    });

    document.getElementById('gv-btn-sound')?.addEventListener('click', (e) => {
      this.sound.toggle();
      e.target.textContent = this.sound.enabled ? '🔊' : '🔇';
    });

    document.getElementById('gv-btn-fullscreen')?.addEventListener('click', () => {
      const vp = document.getElementById('game-viewport');
      if (!document.fullscreenElement) {
        vp?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    document.getElementById('gv-btn-help')?.addEventListener('click', () => {
      alert(`Instructions for ${game.title}:\n\n${game.description}\n\nControls:\n${game.controls}`);
    });

    // Mount Game Instance
    const viewport = document.getElementById('game-viewport');
    this.mountGame(game.id, viewport);
    this.startBestScoreRefresh(game);
  }

  updateGameViewFavBtn() {
    const btn = document.getElementById('gv-btn-fav');
    if (btn && this.currentGameId) {
      const isFav = this.favorites.includes(this.currentGameId);
      btn.textContent = isFav ? '❤️' : '🤍';
      if (isFav) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }

  mountGame(gameId, viewport) {
    if (!viewport) return;

    if (gameId === 'fruit-slice') {
      // Render Fruit Slice structure preserving original DOM elements required by tests
      viewport.innerHTML = `
        <div id="game-container">
          <header id="hud">
            <div class="hud-left">
              <div class="hud-pill score-pill" title="Current Score">
                <span class="hud-icon">🍉</span>
                <span id="current-score" class="score-counter">0</span>
              </div>
              <div class="hud-pill best-score-pill" title="Personal Best Score">
                <span>BEST</span>
                <span id="hud-best-score" class="best-val">0</span>
              </div>
            </div>

            <div class="hud-center">
              <div id="timer-pill" class="hud-pill timer-pill" title="Time Remaining">
                <span class="hud-icon">⏱️</span>
                <span id="time-left" class="timer-counter">60s</span>
              </div>
            </div>

            <div class="hud-right">
              <button id="btn-bomb-toggle" class="icon-btn active" aria-label="Toggle Bombs" title="Toggle Hazard Bombs">
                💣
              </button>
              <button id="btn-sound" class="icon-btn" aria-label="Toggle Sound" title="Sound Mute/Unmute">
                ${this.sound.enabled ? '🔊' : '🔇'}
              </button>
              <button id="btn-pause" class="icon-btn" aria-label="Pause Game" title="Pause Game (Esc/P)">
                ⏸️
              </button>
            </div>
          </header>

          <div id="canvas-wrapper">
            <canvas id="gameCanvas"></canvas>
            <div id="combo-banner">3x TRIPLE! +5</div>
          </div>

          <section id="start-overlay" class="overlay">
            <div class="overlay-content">
              <h1 class="game-title">FRUIT SLICE</h1>
              <p class="game-subtitle">Arcade 60-Second Blitz</p>
              <div class="fruit-preview-row">
                <span>🍉</span><span>🍊</span><span>🍓</span><span>🍌</span><span>🍍</span>
              </div>
              <div class="hud-pill best-score-pill">
                <span>ALL-TIME RECORD:</span>
                <span id="start-high-score-val" class="best-val" style="font-size: 1.4rem;">0</span>
              </div>
              <div class="mode-selectors">
                <div id="toggle-bombs-option" class="toggle-option checked" role="checkbox" aria-checked="true" tabindex="0">
                  <div class="toggle-label">
                    <span style="font-size: 1.3rem;">💣</span>
                    <div>
                      <div>Hazard Bombs</div>
                      <small style="color: var(--text-muted); font-size: 0.78rem;">Avoid bombs (-10 pts, -5s)</small>
                    </div>
                  </div>
                  <div class="toggle-switch"></div>
                </div>
                <div class="blade-picker">
                  <span style="font-size: 0.88rem; font-weight: 600;">Blade Glow:</span>
                  <div class="blade-dots">
                    <div class="blade-dot blade-cyan selected" data-color="#00d2d3" title="Electric Cyan"></div>
                    <div class="blade-dot blade-flame" data-color="#ff4757" title="Flame Red"></div>
                    <div class="blade-dot blade-gold" data-color="#ffa502" title="Golden Sun"></div>
                    <div class="blade-dot blade-neon" data-color="#a55eea" title="Neon Purple"></div>
                  </div>
                </div>
              </div>
              <button id="btn-play" class="btn-primary"><span>⚔️</span> PLAY NOW</button>
              <button id="btn-how-to-play" class="btn-secondary"><span>📖</span> How to Play</button>
            </div>
          </section>

          <section id="instructions-modal" class="overlay hidden">
            <div class="overlay-content">
              <h2 class="game-title" style="font-size: 2.2rem;">HOW TO PLAY</h2>
              <div class="instructions-list">
                <div class="instruction-item"><div class="inst-icon">👆</div><div class="inst-text"><h4>Swipe to Slice</h4><p>Drag mouse or swipe finger across fruits.</p></div></div>
                <div class="instruction-item"><div class="inst-icon">⚡</div><div class="inst-text"><h4>Slice Combos</h4><p>Slice 2+ fruits in one swipe for bonus multipliers!</p></div></div>
                <div class="instruction-item"><div class="inst-icon">💣</div><div class="inst-text"><h4>Dodge Bombs</h4><p>Do NOT slice skull bombs! Deducts 10 pts & 5s.</p></div></div>
                <div class="instruction-item"><div class="inst-icon">⏱️</div><div class="inst-text"><h4>Beat the 60s Clock</h4><p>Score as many points as possible before time expires.</p></div></div>
              </div>
              <button id="btn-close-instructions" class="btn-primary" style="font-size: 1.2rem; padding: 12px 20px;">GOT IT, LET'S SLICE!</button>
            </div>
          </section>

          <section id="pause-overlay" class="overlay hidden">
            <div class="overlay-content">
              <h2 class="game-title" style="font-size: 2.4rem;">PAUSED</h2>
              <p style="color: var(--text-muted); font-size: 0.95rem;">Take a breath, blade master.</p>
              <button id="btn-resume" class="btn-primary"><span>▶️</span> RESUME</button>
              <div class="btn-group">
                <button id="btn-restart-pause" class="btn-secondary"><span>🔄</span> Restart</button>
                <button id="btn-menu-pause" class="btn-secondary"><span>🏠</span> Menu</button>
              </div>
            </div>
          </section>

          <section id="game-over-overlay" class="overlay hidden">
            <div class="overlay-content">
              <div id="new-record-ribbon" class="new-record-ribbon">🏆 NEW HIGH SCORE!</div>
              <h2 class="game-title" style="font-size: 2.8rem;">TIME'S UP!</h2>
              <div style="margin-top: -6px;">
                <div style="font-size: 0.85rem; color: var(--text-muted); letter-spacing: 1.5px; text-transform: uppercase;">Final Score</div>
                <div id="final-score-val" class="score-counter" style="font-size: 3.4rem; color: #ffca28; margin: 4px 0;">0</div>
              </div>
              <div class="stats-grid">
                <div class="stat-card"><span class="stat-label">Fruits Sliced</span><span id="stat-sliced-val" class="stat-value">0</span></div>
                <div class="stat-card highlight"><span class="stat-label">Max Combo</span><span id="stat-combo-val" class="stat-value">None</span></div>
                <div class="stat-card"><span class="stat-label">Bombs Hit</span><span id="stat-bombs-val" class="stat-value">0</span></div>
                <div class="stat-card"><span class="stat-label">Game Time</span><span class="stat-value">60s</span></div>
              </div>
              <button id="btn-play-again" class="btn-primary"><span>🔄</span> PLAY AGAIN</button>
              <button id="btn-menu-game-over" class="btn-secondary"><span>🏠</span> Main Menu</button>
            </div>
          </section>
        </div>
      `;

      this.activeGameInstance = new FruitArcadeGame();
      setTimeout(() => {
        if (this.activeGameInstance?.resizeCanvas) {
          this.activeGameInstance.resizeCanvas();
        }
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
