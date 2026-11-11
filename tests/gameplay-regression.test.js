/**
 * Regression tests for the C3 gameplay bugs (zero dependencies, runs in plain Node).
 *
 *  1. The overlay button labelled RESUME restarted the run instead of resuming it.
 *  2. Pause keys were inconsistent: Whack-a-Mole ignored P/Esc, and holding a pause key
 *     (auto-repeat) flickered pause <-> resume in the other games.
 *  3. Tic-Tac-Toe highlighted "winning" cells during an unfinished game, because the
 *     minimax search leaked hypothetical winning lines into the real game state.
 *
 * Each test fails on the pre-fix code. Real-browser versions live in browser-regression.test.js.
 */
const assert = require('assert');
const fake = require('./helpers/fake-dom');
fake.installGlobals();

const { NeonSnakeGame } = require('../js/games/snake.js');
const { BrickBreakerGame } = require('../js/games/brick-breaker.js');
const { SpaceShooterGame } = require('../js/games/space-shooter.js');
const { EndlessRunnerGame } = require('../js/games/endless-runner.js');
const { BlockPuzzleGame } = require('../js/games/block-puzzle.js');
const { WhackAMoleGame } = require('../js/games/whack-a-mole.js');
const { TicTacToeGame } = require('../js/games/tic-tac-toe.js');

let passed = 0, total = 0;
function test(name, fn) {
  total++;
  try { fn(); console.log(`  [PASS] ${name}`); passed++; }
  catch (err) { console.error(`  [FAIL] ${name}`); console.error(err); process.exitCode = 1; }
}

// id, class, selector of the overlay play/resume button
const PAUSABLE = [
  ['snake', NeonSnakeGame, '#snake-btn-play'],
  ['brick-breaker', BrickBreakerGame, '#bricks-btn-play'],
  ['space-shooter', SpaceShooterGame, '#space-btn-play'],
  ['endless-runner', EndlessRunnerGame, '#run-btn-play'],
  ['block-puzzle', BlockPuzzleGame, '#block-btn-play'],
  ['whack-a-mole', WhackAMoleGame, '#mole-btn-play']
];

function launch(Cls) {
  fake.resetWindowListeners();
  const container = fake.createContainer();
  const game = new Cls(container, null);
  game.init();
  return { game, container };
}

console.log('--- Gameplay regression tests (C3) ---');

// ---- 1. Resume must resume ------------------------------------------------
PAUSABLE.forEach(([id, Cls, playSel]) => {
  test(`Resume: clicking RESUME continues the ${id} run instead of restarting it`, () => {
    const { game, container } = launch(Cls);
    game.start();
    game.score = 4321;
    let starts = 0;
    const realStart = game.start.bind(game);
    game.start = () => { starts++; realStart(); };

    game.pause();
    assert.strictEqual(game.state, 'PAUSED');
    container.querySelector(playSel).click();

    assert.strictEqual(starts, 0, 'start() (a full restart) must not run when resuming');
    assert.strictEqual(game.state, 'PLAYING', 'game should be playing again');
    assert.strictEqual(game.score, 4321, 'score must survive pause + resume');
    game.destroy();
  });

  test(`Resume: the ${id} play button still starts a fresh run from the start screen`, () => {
    const { game, container } = launch(Cls);
    assert.notStrictEqual(game.state, 'PLAYING');
    container.querySelector(playSel).click();
    assert.strictEqual(game.state, 'PLAYING');
    game.destroy();
  });

  test(`Resume: ${id} resumes with the same key that paused it, any number of times`, () => {
    const { game } = launch(Cls);
    game.start();
    for (const key of ['p', 'P', 'Escape']) {
      fake.pressKey(key);
      assert.strictEqual(game.state, 'PAUSED', `${key} should pause`);
      fake.pressKey(key);
      assert.strictEqual(game.state, 'PLAYING', `${key} should resume`);
    }
    game.destroy();
  });
});

// ---- 2. Pause keys behave the same in every game ---------------------------
test('Pause keys: Whack-a-Mole now registers a keyboard handler (it had none)', () => {
  const { game } = launch(WhackAMoleGame);
  assert.ok(fake.keydownHandlerCount() >= 1, 'Whack-a-Mole must listen for keydown');
  game.destroy();
});

test('Pause keys: Whack-a-Mole removes its keyboard handler when the game is closed', () => {
  const { game } = launch(WhackAMoleGame);
  game.destroy();
  assert.strictEqual(fake.keydownHandlerCount(), 0, 'no keydown listener may leak after destroy()');
});

PAUSABLE.forEach(([id, Cls]) => {
  test(`Pause keys: holding P / Esc (auto-repeat) does not flicker pause in ${id}`, () => {
    const { game } = launch(Cls);
    game.start();
    for (const key of ['p', 'Escape']) {
      fake.pressKey(key);                              // the real key press
      assert.strictEqual(game.state, 'PAUSED');
      for (let i = 0; i < 5; i++) fake.pressKey(key, { repeat: true });   // key held down
      assert.strictEqual(game.state, 'PAUSED', `auto-repeat of ${key} must be ignored`);
      fake.pressKey(key);                              // release + press again resumes
      assert.strictEqual(game.state, 'PLAYING');
    }
    game.destroy();
  });

  test(`Pause keys: P does nothing before ${id} has started (no accidental pause)`, () => {
    const { game } = launch(Cls);
    fake.pressKey('p');
    assert.notStrictEqual(game.state, 'PAUSED');
    assert.notStrictEqual(game.state, 'PLAYING');
    game.destroy();
  });
});

test('Pause: Whack-a-Mole keeps a single spawn chain across a quick pause + resume', () => {
  const { game } = launch(WhackAMoleGame);
  game.start();
  const timers = [];
  const realSet = global.setTimeout, realClear = global.clearTimeout;
  const live = new Set();
  global.setTimeout = (fn, ms) => { const id = realSet(() => { live.delete(id); fn(); }, 60000); live.add(id); timers.push(id); return id; };
  global.clearTimeout = id => { live.delete(id); realClear(id); };
  try {
    game.scheduleNextSpawn();
    game.pause();
    game.resume();
    game.pause();
    game.resume();
    assert.strictEqual(live.size, 1, `exactly one spawn timer may be pending, found ${live.size}`);
  } finally {
    live.forEach(id => realClear(id));
    global.setTimeout = realSet; global.clearTimeout = realClear;
    game.destroy();
  }
});

// ---- 3. Tic-Tac-Toe glow -----------------------------------------------------
function newTTT(mode) {
  const { game } = launch(TicTacToeGame);
  if (mode) game.mode = mode;
  return game;
}
const winnerCells = game => game.boardEl.children.map((c, i) => (c.classList.contains('winner') ? i : -1)).filter(i => i >= 0);

test('Tic-Tac-Toe: checkWinner() is a pure function (does not touch game state)', () => {
  const game = newTTT();
  game.winningCombo = null;
  const board = ['X', 'X', 'X', null, null, null, null, null, null];
  assert.strictEqual(game.checkWinner(board), 'X');
  assert.strictEqual(game.winningCombo, null, 'looking at a hypothetical board must not set winningCombo');
});

test('Tic-Tac-Toe: the computer thinking never highlights cells (minimax leak)', () => {
  const game = newTTT('ai');
  game.board = ['X', 'O', null, null, null, null, null, null, null];
  game.currentPlayer = 'O';
  game.getBestMove();                       // runs minimax over thousands of hypothetical boards
  assert.strictEqual(game.winningCombo, null);
  game.render();
  assert.deepStrictEqual(winnerCells(game), [], 'no cell may glow while the game is still running');
});

test('Tic-Tac-Toe: a full game vs the Invincible AI shows no false glow before the end', () => {
  const game = newTTT('ai');
  game.difficulty = 'hard';
  const realSet = global.setTimeout;
  global.setTimeout = fn => { fn(); return 0; };       // run the AI reply immediately
  try {
    for (let guard = 0; guard < 9 && !game.gameOver; guard++) {
      const empty = game.board.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0);
      game.makeMove(empty[0]);
      if (!game.gameOver) assert.deepStrictEqual(winnerCells(game), [], `false glow at board ${game.board.join(',')}`);
    }
  } finally { global.setTimeout = realSet; }
});

test('Tic-Tac-Toe: a real win still highlights exactly the winning line', () => {
  const game = newTTT('2p');
  [0, 3, 1, 4, 2].forEach(i => game.makeMove(i));       // X plays 0,1,2
  assert.strictEqual(game.gameOver, true);
  assert.deepStrictEqual(game.winningCombo, [0, 1, 2]);
  assert.deepStrictEqual(winnerCells(game), [0, 1, 2]);
});

test('Tic-Tac-Toe: a draw highlights nothing, and a new round clears an old win', () => {
  const game = newTTT('2p');
  [0, 1, 2, 4, 3, 5, 7, 6, 8].forEach(i => game.makeMove(i));   // classic draw
  assert.strictEqual(game.gameOver, true);
  assert.deepStrictEqual(winnerCells(game), []);
  const g2 = newTTT('2p');
  [0, 3, 1, 4, 2].forEach(i => g2.makeMove(i));
  g2.start();
  assert.deepStrictEqual(winnerCells(g2), []);
});

// ---- 4. Tic-Tac-Toe: a pending computer move must not survive a reset ----------
// The computer replies after a short delay (setTimeout). If the player resets while it is
// "thinking", that old reply used to fire on the NEW board and place an X, then an O.
function withManualTimers(fn) {
  const realSet = global.setTimeout, realClear = global.clearTimeout;
  const all = [];                       // every timer ever created (including cleared ones)
  global.setTimeout = (cb, ms) => { const t = { id: all.length + 1, cb, ms, cleared: false, fired: false }; all.push(t); return t.id; };
  global.clearTimeout = id => { const t = all.find(x => x.id === id); if (t) t.cleared = true; };
  const api = {
    all,
    pending: () => all.filter(t => !t.cleared && !t.fired),
    /** Run every timer that is still pending, like waiting long enough in a browser. */
    flush() { api.pending().forEach(t => { t.fired = true; t.cb(); }); },
    /** Force-run one specific callback even if it was cancelled: proves the callback itself is harmless. */
    forceRun(t) { t.cb(); }
  };
  try { fn(api); } finally { global.setTimeout = realSet; global.clearTimeout = realClear; }
}
const marks = game => game.board.filter(Boolean).length;
const boardStr = game => game.board.map(c => c || '-').join('');

function startedVsComputer() {
  const { game, container } = launch(TicTacToeGame);
  game.mode = 'ai';
  game.difficulty = 'hard';
  game.start();
  return { game, container };
}

test('Tic-Tac-Toe: resetting while the computer is thinking leaves a clean, empty new round', () => {
  withManualTimers(t => {
    const { game, container } = startedVsComputer();
    game.makeMove(0);                                        // player moves, computer starts thinking
    assert.strictEqual(game.statusText.textContent, 'COMPUTER THINKING...');
    assert.strictEqual(t.pending().length, 1, 'one computer move should be pending');

    container.querySelector('#ttt-btn-reset').click();       // Reset / New Round while it is thinking
    t.flush();                                               // wait long enough for any old timer to fire

    assert.strictEqual(boardStr(game), '---------', 'the old round must not place marks on the new board');
    assert.strictEqual(game.currentPlayer, 'X');
    assert.strictEqual(game.gameOver, false);
    assert.strictEqual(game.statusText.textContent, "PLAYER X'S TURN");
    assert.strictEqual(t.pending().length, 0, 'no computer move may stay scheduled after reset');
  });
});

test('Tic-Tac-Toe: after such a reset the new round plays normally (one X, then exactly one computer O)', () => {
  withManualTimers(t => {
    const { game, container } = startedVsComputer();
    game.makeMove(0);
    container.querySelector('#ttt-btn-reset').click();
    t.flush();
    game.makeMove(4);                                        // new round: player takes the centre
    assert.strictEqual(t.pending().length, 1, 'the new round schedules its own computer move');
    t.flush();
    assert.strictEqual(marks(game), 2, `expected X + one O, got ${boardStr(game)}`);
    assert.strictEqual(game.board[4], 'X', 'the player\'s X must stay where the player put it');
    assert.strictEqual(game.board.filter(c => c === 'O').length, 1);
    assert.strictEqual(game.currentPlayer, 'X', 'it must be the player\'s turn again');
  });
});

test('Tic-Tac-Toe: an old computer callback that still runs cannot touch the new round', () => {
  withManualTimers(t => {
    const { game, container } = startedVsComputer();
    game.makeMove(0);
    const oldTimer = t.all[t.all.length - 1];
    container.querySelector('#ttt-btn-reset').click();
    game.makeMove(4);                                        // player already moved in the new round
    const before = boardStr(game);
    t.forceRun(oldTimer);                                    // the stale callback runs anyway (worst case)
    assert.strictEqual(boardStr(game), before, 'stale callback changed the new round');
    assert.strictEqual(game.currentPlayer, 'O', 'still waiting for the new round\'s own computer move');
    t.flush();
    assert.strictEqual(marks(game), 2, `got ${boardStr(game)}`);
  });
});

[
  ['switching to 2 PLAYERS', c => c.querySelector('#ttt-mode-2p').click()],
  ['switching back to VS COMPUTER', c => c.querySelector('#ttt-mode-ai').click()],
  ['changing the difficulty', c => { const sel = c.querySelector('#ttt-difficulty'); sel.dispatch('change', { target: { value: 'easy' } }); }]
].forEach(([label, action]) => {
  test(`Tic-Tac-Toe: ${label} while the computer is thinking also cancels its move`, () => {
    withManualTimers(t => {
      const { game, container } = startedVsComputer();
      game.makeMove(0);
      action(container);                                     // every control that starts a new round
      t.flush();
      assert.strictEqual(boardStr(game), '---------', `board must be empty, got ${boardStr(game)}`);
      assert.strictEqual(game.currentPlayer, 'X');
    });
  });
});

test('Tic-Tac-Toe: leaving the game (destroy) cancels a pending computer move', () => {
  withManualTimers(t => {
    const { game } = startedVsComputer();
    game.makeMove(0);
    game.destroy();
    t.flush();
    assert.strictEqual(boardStr(game), 'X--------', 'a destroyed game must not keep playing');
  });
});

test('Tic-Tac-Toe: without a reset the computer still replies exactly once (no regression)', () => {
  withManualTimers(t => {
    const { game } = startedVsComputer();
    game.makeMove(0);
    t.flush();
    assert.strictEqual(marks(game), 2);
    assert.strictEqual(game.board.filter(c => c === 'O').length, 1);
    assert.strictEqual(game.currentPlayer, 'X');
    assert.strictEqual(game.statusText.textContent, "PLAYER X'S TURN");
  });
});

console.log(`\nResults: ${passed}/${total} tests passed.`);
if (passed !== total) process.exitCode = 1;
