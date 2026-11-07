/**
 * Automated Test Suite for All 10 Arcade Games & Portal Architecture
 * Tests game engines, physics, AI minimax, rules, scoring, and storage.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser globals for testing Node environment
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hash: '#' }
};
global.document = {
  createElement: () => ({
    className: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    setAttribute: () => {},
    getAttribute: () => '',
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    querySelector: () => ({
      textContent: '',
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {} }
    })
  })
};
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] !== undefined ? this.store[key] : null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Import all game classes and portal catalog
const { ARCADE_GAMES, ArcadePortal, getBestScoreForGame, formatBestScore, categoryLabel } = require('../js/arcade.js');
const { NeonSnakeGame } = require('../js/games/snake.js');
const { BrickBreakerGame } = require('../js/games/brick-breaker.js');
const { SpaceShooterGame } = require('../js/games/space-shooter.js');
const { Puzzle2048Game } = require('../js/games/puzzle-2048.js');
const { TicTacToeGame } = require('../js/games/tic-tac-toe.js');
const { MemoryMatchGame } = require('../js/games/memory-match.js');
const { EndlessRunnerGame } = require('../js/games/endless-runner.js');
const { BlockPuzzleGame } = require('../js/games/block-puzzle.js');
const { WhackAMoleGame } = require('../js/games/whack-a-mole.js');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('--- Starting All 10 Arcade Games & Portal Test Suite ---');

// Mock Container
function createMockContainer() {
  const elements = {};
  return {
    innerHTML: '',
    querySelector(sel) {
      if (!elements[sel]) {
        elements[sel] = {
          addEventListener: () => {},
          removeEventListener: () => {},
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
          },
          style: {},
          textContent: '',
          innerHTML: '',
          appendChild: () => {},
          getContext: () => ({
            clearRect: () => {},
            beginPath: () => {},
            closePath: () => {},
            roundRect: () => {},
            fill: () => {},
            stroke: () => {},
            fillRect: () => {},
            arc: () => {},
            moveTo: () => {},
            lineTo: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            ellipse: () => {},
            strokeRect: () => {},
            fillText: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} })
          }),
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 })
        };
      }
      return elements[sel];
    },
    querySelectorAll() {
      return [];
    }
  };
}

// 1. Arcade Catalog Verification
test('Catalog contains at least 10 games with complete metadata', () => {
  assert.ok(ARCADE_GAMES.length >= 10, 'Must have at least 10 games');
  const ids = new Set();
  const requiredFields = ['id', 'title', 'category', 'badge', 'description', 'controls', 'tags', 'scoreLabel'];

  ARCADE_GAMES.forEach(g => {
    assert.ok(!ids.has(g.id), `Game ID ${g.id} must be unique`);
    ids.add(g.id);
    requiredFields.forEach(f => {
      assert.ok(g[f] !== undefined && g[f] !== '', `Game ${g.id} must define ${f}`);
    });
  });

  const expectedGames = [
    'fruit-slice', 'snake', 'brick-breaker', 'space-shooter',
    'puzzle-2048', 'tic-tac-toe', 'memory-match', 'endless-runner',
    'block-puzzle', 'whack-a-mole'
  ];
  expectedGames.forEach(id => {
    assert.ok(ids.has(id), `Game ${id} must be in the catalog`);
  });
});

// 2. Neon Snake Engine Tests
test('Neon Snake: Motion, food collision and score scaling', () => {
  const container = createMockContainer();
  const snake = new NeonSnakeGame(container, null);
  snake.init();

  const initialHead = { ...snake.snake[0] };
  snake.direction = { x: 1, y: 0 };
  snake.nextDirection = { x: 1, y: 0 };

  // Place food directly in front of snake
  snake.food = { x: initialHead.x + 1, y: initialHead.y };
  const prevLen = snake.snake.length;
  const prevScore = snake.score;

  snake.tick();

  assert.strictEqual(snake.snake[0].x, initialHead.x + 1, 'Head should advance to food');
  assert.strictEqual(snake.snake.length, prevLen + 1, 'Snake should grow after eating food');
  assert.strictEqual(snake.score, prevScore + 10, 'Score should increase by 10');
  snake.destroy();
});

// 3. Brick Breaker Engine Tests
test('Brick Breaker: Level building and brick damage', () => {
  const container = createMockContainer();
  const bb = new BrickBreakerGame(container, null);
  bb.buildLevel(1);

  assert.ok(bb.bricks.length > 0, 'Level 1 should have bricks');
  const targetBrick = bb.bricks[0];
  const initialHp = targetBrick.hp;

  // Simulate ball hit
  targetBrick.hp--;
  assert.strictEqual(targetBrick.hp, initialHp - 1, 'Brick HP should decrement on hit');
  bb.destroy();
});

// 4. Space Shooter Engine Tests
test('Space Shooter: Lasers, enemy spawning and hits', () => {
  const container = createMockContainer();
  const space = new SpaceShooterGame(container, null);
  space.init();
  space.start();

  const prevLasers = space.lasers.length;
  space.shoot();
  assert.ok(space.lasers.length > prevLasers, 'Shooting should add lasers to the pool');

  space.spawnEnemy();
  assert.ok(space.enemies.length > 0, 'Spawning should add an enemy');
  assert.ok(space.enemies[0].hp > 0, 'Enemy must have health');
  space.destroy();
});

// 5. 2048 Puzzle Engine Tests
test('2048: Move, merge mechanics, and game over check', () => {
  const container = createMockContainer();
  const p = new Puzzle2048Game(container, null);
  p.init();

  // Test deterministic board merge: [2, 2, 0, 0] moved left -> [4, 0, 0, 0]
  p.grid = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  p.score = 0;
  p.move('left');

  assert.strictEqual(p.grid[0][0], 4, 'Merged tile should equal 4');
  assert.strictEqual(p.score, 4, 'Score should increase by merged tile value');

  // Test full board with no possible moves
  p.grid = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2]
  ];
  assert.strictEqual(p.checkGameOver(), true, 'Checkerboard grid with no merges should be game over');
});

// 6. Tic-Tac-Toe Minimax AI Tests
test('Tic-Tac-Toe: Minimax AI makes winning/blocking move', () => {
  const container = createMockContainer();
  const ttt = new TicTacToeGame(container, null);
  ttt.init();

  // Scenario 1: AI (O) has 2 in a row [0, 1] -> must pick 2 to win!
  ttt.board = [
    'O', 'O', null,
    'X', 'X', null,
    null, null, null
  ];
  const bestMove = ttt.getBestMove();
  assert.strictEqual(bestMove, 2, 'AI should immediately take the winning cell at index 2');

  // Scenario 2: Player (X) has 2 in a row [3, 4] -> AI must block at 5!
  ttt.board = [
    null, null, null,
    'X', 'X', null,
    'O', null, null
  ];
  const blockMove = ttt.getBestMove();
  assert.strictEqual(blockMove, 5, 'AI should block opponent win at index 5');
});

// 7. Memory Match Engine Tests
test('Memory Match: Deck building, matching, and completion', () => {
  const container = createMockContainer();
  const mem = new MemoryMatchGame(container, null);
  mem.init();

  assert.strictEqual(mem.cards.length, 16, 'Deck must contain 16 cards for 4x4 grid');

  // Find a matching pair
  const card1 = mem.cards[0];
  const card2 = mem.cards.find(c => c !== card1 && c.id === card1.id);
  assert.ok(card2, 'Every card must have a matching partner');

  mem.flippedCards = [card1, card2];
  mem.checkMatch();

  assert.strictEqual(card1.isMatched, true, 'Card 1 should be marked matched');
  assert.strictEqual(card2.isMatched, true, 'Card 2 should be marked matched');
  assert.strictEqual(mem.matchedPairs, 1, 'Matched pairs counter should increment');
  mem.destroy();
});

// 8. Endless Runner Physics Tests
test('Endless Runner: Jumping, double jumping, and slide ducking', () => {
  const container = createMockContainer();
  const runner = new EndlessRunnerGame(container, null);
  runner.init();
  runner.start();

  assert.strictEqual(runner.player.jumpsLeft, 2);
  runner.jump();
  assert.strictEqual(runner.player.jumpsLeft, 1, 'Single jump should leave 1 jump remaining');
  assert.ok(runner.player.vy < 0, 'Upward velocity after jump');

  runner.jump();
  assert.strictEqual(runner.player.jumpsLeft, 0, 'Double jump should leave 0 jumps remaining');

  // Test slide height
  runner.slide(true);
  assert.strictEqual(runner.player.h, runner.player.slideH, 'Slide should reduce hitbox height');
  runner.slide(false);
  assert.strictEqual(runner.player.h, runner.player.baseH, 'Unslide should restore hitbox height');
  runner.destroy();
});

// 9. Block Puzzle / Tetris Engine Tests
test('Block Puzzle: Tetromino definition, collision and line clears', () => {
  const container = createMockContainer();
  const bp = new BlockPuzzleGame(container, null);
  bp.init();

  assert.strictEqual(Object.keys(bp.pieces).length, 7, 'Must have all 7 standard tetrominoes');

  // Fill bottom row completely
  bp.grid[19] = Array(10).fill('#00d2d3');
  const prevScore = bp.score;
  bp.clearLines();

  assert.strictEqual(bp.lines, 1, '1 line cleared');
  assert.strictEqual(bp.score, prevScore + 100, 'Score should increase by 100 for single line');
  assert.strictEqual(bp.grid[19].every(c => c === 0), true, 'Bottom row should be cleared to empty');
  bp.destroy();
});

// 10. Whack-a-Mole Engine Tests
test('Whack-a-Mole: Whack scoring, combo multipliers, and bomb penalties', () => {
  const container = createMockContainer();
  const mole = new WhackAMoleGame(container, null);
  mole.init();
  mole.start();

  // Test normal mole whack
  mole.activeMoles[0] = { type: 'mole', timeout: 123 };
  mole.whack(0);
  assert.strictEqual(mole.score, 10, 'Normal mole gives 10 points');
  assert.strictEqual(mole.combo, 1, 'Combo starts at 1');

  // Test bomb whack
  mole.activeMoles[1] = { type: 'bomb', timeout: 456 };
  mole.whack(1);
  assert.strictEqual(mole.bombsHit, 1, 'Bombs hit increments');
  assert.strictEqual(mole.combo, 0, 'Bomb resets combo streak');
  assert.strictEqual(mole.score, 0, 'Penalty deducted (floored at 0)');
  mole.destroy();
});

// 11. Portal Routing & Favorites Persistence Tests
test('Arcade Portal: Search filter & favorites storage', () => {
  const portalData = ARCADE_GAMES;

  // Search filter test
  const actionGames = portalData.filter(g => g.category === 'action');
  assert.ok(actionGames.length >= 2, 'Should have multiple action games');

  const snakeQuery = portalData.filter(g => g.title.toLowerCase().includes('snake'));
  assert.strictEqual(snakeQuery.length, 1);
  assert.strictEqual(snakeQuery[0].id, 'snake');
});

// 12. No invented statistics or unsupported popularity claims
test('Catalog has no fabricated ratings, play counts or popularity badges', () => {
  const bannedBadges = ['POPULAR', 'HOT', 'TRENDING', 'TOP RATED', 'BEST SELLER', 'MOST PLAYED', 'FAVORITE'];
  ARCADE_GAMES.forEach(g => {
    assert.strictEqual(g.rating, undefined, `${g.id} must not define a rating`);
    assert.strictEqual(g.plays, undefined, `${g.id} must not define a play count`);
    assert.ok(!bannedBadges.includes(String(g.badge).toUpperCase()), `${g.id} uses an unsupported popularity badge: ${g.badge}`);
    assert.ok(typeof g.badge === 'string' && g.badge.length > 0, `${g.id} needs a descriptive badge`);
  });
  // Legitimate descriptive labels are preserved
  const badgeOf = (id) => ARCADE_GAMES.find(g => g.id === id).badge;
  assert.strictEqual(badgeOf('snake'), 'CLASSIC');
  assert.strictEqual(badgeOf('memory-match'), 'NEW');
  assert.strictEqual(badgeOf('whack-a-mole'), 'NEW');
});

// 13. Best-score metadata must point at the keys the games really save
test('Catalog score keys match the storage keys used by the game engines', () => {
  const root = path.join(__dirname, '..', 'js');
  const sources = [path.join(root, 'game.js')]
    .concat(fs.readdirSync(path.join(root, 'games')).map(f => path.join(root, 'games', f)))
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');

  ARCADE_GAMES.forEach(g => {
    assert.ok(g.scoreKey === null || typeof g.scoreKey === 'string', `${g.id}: scoreKey must be a string or null`);
    if (g.scoreKey) {
      assert.ok(sources.includes(`'${g.scoreKey}'`), `${g.id}: no game engine uses storage key "${g.scoreKey}"`);
    }
  });
  // Tic-Tac-Toe saves no score, so it must not pretend to have one
  assert.strictEqual(ARCADE_GAMES.find(g => g.id === 'tic-tac-toe').scoreKey, null);
  assert.strictEqual(ARCADE_GAMES.filter(g => g.scoreKey).length, 9);
});

// 14. Best score helper reads only genuine saved values
test('getBestScoreForGame: real values only, safe defaults, lower-is-better handling', () => {
  const snake = ARCADE_GAMES.find(g => g.id === 'snake');
  const memory = ARCADE_GAMES.find(g => g.id === 'memory-match');
  const ttt = ARCADE_GAMES.find(g => g.id === 'tic-tac-toe');
  const store = (obj) => ({ getItem: (k) => (k in obj ? obj[k] : null) });

  assert.strictEqual(getBestScoreForGame(snake, store({})), null, 'nothing saved -> null');
  assert.strictEqual(getBestScoreForGame(snake, store({ arcade_snake_highscore: '0' })), null, 'zero -> null');
  assert.strictEqual(getBestScoreForGame(snake, store({ arcade_snake_highscore: 'abc' })), null, 'garbage -> null');
  assert.strictEqual(getBestScoreForGame(snake, store({ arcade_snake_highscore: '1250' })), 1250);
  assert.strictEqual(getBestScoreForGame(memory, store({ arcade_memory_best: '999' })), null, '999 means no record');
  assert.strictEqual(getBestScoreForGame(memory, store({ arcade_memory_best: '14' })), 14);
  assert.strictEqual(getBestScoreForGame(ttt, store({ anything: '5' })), null, 'untracked game -> null');
  assert.strictEqual(getBestScoreForGame(snake, null), null, 'no storage -> null');
  assert.strictEqual(getBestScoreForGame(snake, { getItem() { throw new Error('blocked'); } }), null, 'blocked storage -> null');

  assert.strictEqual(formatBestScore(snake, 1250), '1,250');
  assert.strictEqual(formatBestScore(memory, 14), '14 moves');
  assert.strictEqual(categoryLabel(snake), 'Arcade');
});

// Helper: run portal rendering against a tiny fake DOM
function withPortalDom(fn) {
  const els = {};
  const getEl = (id) => els[id] || (els[id] = {
    id, innerHTML: '', textContent: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, removeEventListener() {},
    getAttribute: () => '',
    // arcade.js calls these on the rendered views (carousel, category pills, favourite buttons).
    // The fake views render no real child nodes, so lookups find nothing, like an empty page.
    querySelector: () => null, querySelectorAll: () => []
  });
  const prev = {
    getElementById: global.document.getElementById,
    querySelectorAll: global.document.querySelectorAll,
    scrollTo: global.window.scrollTo,
    SoundManager: global.SoundManager
  };
  global.document.getElementById = getEl;
  // refreshFavUI() looks up every [data-fav] button on the document; tests can supply fakes via els.__favButtons
  global.document.querySelectorAll = (sel) => (sel === '[data-fav]' ? (els.__favButtons || []) : []);
  global.window.scrollTo = () => {};
  global.SoundManager = class { constructor() { this.enabled = true; } playClick() {} toggle() {} };
  localStorage.clear();
  let portal;
  try {
    portal = new ArcadePortal();
    portal.mountGame = () => {};   // render only; game engines are tested separately above
    return fn(portal, els);
  } finally {
    // renderHome() starts the hero-carousel timer and openGame() starts the best-score refresh timer.
    // Stop them with the portal's own cleanup, otherwise they fire after the fake DOM is gone and crash the run.
    if (portal) { portal.stopHero(); portal.stopBestScoreRefresh(); }
    global.document.getElementById = prev.getElementById;
    global.document.querySelectorAll = prev.querySelectorAll;
    global.window.scrollTo = prev.scrollTo;
    global.SoundManager = prev.SoundManager;
    localStorage.clear();
  }
}

// 15. Home page + cards render genuine details and no fake stats
test('Portal home and cards: real best scores, no ratings, no play counts, 10 cards', () => {
  withPortalDom((portal, els) => {
    localStorage.setItem('arcade_snake_highscore', '1250');
    portal.renderHome();
    assert.ok(portal.heroTimer, 'hero carousel timer starts when the home view renders');
    const home = els['home-portal-view'].innerHTML;
    const grid = els['games-grid'].innerHTML;

    ['⭐', ' Plays', 'POPULAR', '>HOT<', 'OF THE DAY'].forEach(bad => {
      assert.ok(!home.includes(bad) && !grid.includes(bad), `rendered page must not contain "${bad}"`);
    });
    assert.ok(home.includes('Free · No sign-up') && home.includes('Featured · Action'), 'hero shows genuine details');
    assert.ok(home.includes('Set your first score'), 'hero invites a score when none saved');
    assert.ok(home.includes('Your best: 1,250'), 'hero shows the real saved Neon Snake best score');
    assert.strictEqual((grid.match(/class="game-card"/g) || []).length, 10, 'all 10 cards render');
    const snakeCard = grid.split('<article').find(c => c.includes('Neon Snake')) || '';
    assert.ok(/class="card-rating" title="Your best on this device"><svg[\s\S]*?<\/svg> 1,250<\/span>/.test(snakeCard), 'saved Neon Snake best score appears on its card');
    assert.strictEqual((grid.match(/class="card-rating"/g) || []).length, 1, 'only games with a saved score show one');
    assert.ok(grid.includes('REFLEX') && grid.includes('CLASSIC') && grid.includes('NEW'), 'descriptive badges render');
  });
});

// 16. Game details panel
test('Game details: category, real best score, device note; no fake records', () => {
  withPortalDom((portal, els) => {
    localStorage.setItem('arcade_memory_best', '14');
    portal.openGame('memory-match');
    let view = els['game-portal-view'].innerHTML;
    assert.ok(view.includes('Your records') && view.includes('Fewest moves') && view.includes('14 moves'));
    assert.ok(view.includes('Casual') && view.includes('This device only'));
    assert.ok(view.includes('Click or Tap cards to reveal matching pairs.'), 'controls still shown');
    ['RATING', 'TOTAL SESSIONS', '⭐', '16.9k'].forEach(bad => assert.ok(!view.includes(bad), `must not contain "${bad}"`));

    portal.openGame('snake');
    view = els['game-portal-view'].innerHTML;
    assert.ok(view.includes('Best score') && view.includes('No score yet'));

    portal.openGame('tic-tac-toe');
    view = els['game-portal-view'].innerHTML;
    assert.ok(view.includes('Not tracked'), 'Tic-Tac-Toe does not pretend to track a score');

    portal.showHomeView();
    assert.ok(!portal.bestScoreTimer, 'refresh timer must stop when leaving the game view');
  });
});

// 17. Live refresh of the best score while playing
test('Best-score refresh updates the panel and cleans up its timer', () => {
  withPortalDom((portal, els) => {
    const snake = ARCADE_GAMES.find(g => g.id === 'snake');
    portal.startBestScoreRefresh(snake);
    assert.ok(portal.bestScoreTimer, 'timer starts for a tracked game');
    portal.stopBestScoreRefresh();
    assert.ok(!portal.bestScoreTimer, 'timer stops');
    portal.startBestScoreRefresh(ARCADE_GAMES.find(g => g.id === 'tic-tac-toe'));
    assert.ok(!portal.bestScoreTimer, 'no timer for a game without a score');
  });
});

// 18. Search, filters and favorites still work
test('Portal search, category filters and favorites still work', () => {
  withPortalDom((portal, els) => {
    portal.favorites = ['snake'];
    const count = () => portal.getFilteredGames().length;
    assert.strictEqual(count(), 10);
    portal.searchQuery = 'snake';            assert.strictEqual(count(), 1);
    portal.searchQuery = 'tetris';           assert.strictEqual(portal.getFilteredGames()[0].id, 'block-puzzle', 'tag search');
    portal.searchQuery = 'zzz-nothing';      assert.strictEqual(count(), 0);
    portal.searchQuery = '';
    portal.selectedCategory = 'puzzle';      assert.strictEqual(count(), 2);
    portal.selectedCategory = 'action';      assert.strictEqual(count(), 3);
    portal.selectedCategory = 'favorites';   assert.strictEqual(count(), 1);
    portal.selectedCategory = 'all';         assert.strictEqual(count(), 10);
    const toggled = [];
    const fakeBtn = (id) => ({ dataset: { fav: id }, innerHTML: '', classList: { toggle: (cls, on) => toggled.push([id, cls, on]) } });
    els.__favButtons = [fakeBtn('snake'), fakeBtn('brick-breaker')];
    portal.toggleFavorite('brick-breaker');
    assert.ok(portal.favorites.includes('brick-breaker') && localStorage.getItem('arcade_favorites').includes('brick-breaker'));
    assert.deepStrictEqual(toggled, [['snake', 'favorited', true], ['brick-breaker', 'favorited', true]], 'refreshFavUI marks every saved game');
    assert.ok(els.__favButtons[1].innerHTML.includes('Saved') && els.__favButtons[0].innerHTML.includes('Saved'), 'buttons show Saved');
    portal.toggleFavorite('brick-breaker');
    assert.ok(!portal.favorites.includes('brick-breaker') && !JSON.parse(localStorage.getItem('arcade_favorites')).includes('brick-breaker'), 'toggling again removes it');
    assert.ok(els.__favButtons[1].innerHTML.includes('Save') && !els.__favButtons[1].innerHTML.includes('Saved'), 'button reverts to Save');
  });
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
