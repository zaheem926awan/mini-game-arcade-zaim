/**
 * Real-browser regression tests (Chromium via Playwright).
 *
 *  C1  every /game/<slug> URL loads the right game, directly and after a refresh;
 *      the old hash routes (/#/game/<id>) still work.
 *  C3  Resume really resumes, pause keys behave the same everywhere, and Tic-Tac-Toe
 *      never highlights a "winning" line before somebody has won.
 *
 * Playwright is NOT a dependency of this project. If it (or a browser) is not installed,
 * this file prints SKIP and exits 0, so `npm test` keeps working everywhere.
 * To run it:   npm i -D playwright && npx playwright install chromium && npm test
 */
const assert = require('assert');
const path = require('path');
const { start } = require('./helpers/static-server');

let playwright = null;
for (const name of [process.env.PLAYWRIGHT_MODULE, 'playwright'].filter(Boolean)) {
  try { playwright = require(name); break; } catch (e) { /* try next */ }
}
if (!playwright) {
  console.log('--- Browser regression tests ---\n  [SKIP] Playwright is not installed (see the header of tests/browser-regression.test.js)');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
// id -> [slug, selector that only exists once THAT game has mounted]
const GAMES = {
  'fruit-slice': ['fruit-slice', '#gameCanvas'],
  'snake': ['neon-snake', '#snake-btn-play'],
  'brick-breaker': ['brick-breaker', '#bricks-btn-play'],
  'space-shooter': ['space-shooter', '#space-btn-play'],
  'puzzle-2048': ['2048-puzzle', '#p2048-btn-undo'],
  'tic-tac-toe': ['tic-tac-toe', '#ttt-board'],
  'memory-match': ['memory-match', '#mem-btn-restart'],
  'endless-runner': ['endless-runner', '#run-btn-play'],
  'block-puzzle': ['block-puzzle', '#block-btn-play'],
  'whack-a-mole': ['whack-a-mole', '#mole-btn-play']
};
const ALL_SELECTORS = Object.values(GAMES).map(g => g[1]);
// pausable games: id -> [overlay play button, HUD pause button]
const PAUSABLE = {
  'snake': ['#snake-btn-play', '#snake-btn-pause'],
  'brick-breaker': ['#bricks-btn-play', '#bricks-btn-pause'],
  'space-shooter': ['#space-btn-play', '#space-btn-pause'],
  'endless-runner': ['#run-btn-play', '#run-btn-pause'],
  'block-puzzle': ['#block-btn-play', '#block-btn-pause'],
  'whack-a-mole': ['#mole-btn-play', '#mole-btn-pause']
};

let passed = 0, total = 0;
async function test(name, fn) {
  total++;
  try { await fn(); console.log(`  [PASS] ${name}`); passed++; }
  catch (e) { console.log(`  [FAIL] ${name}\n         ${e.message}`); process.exitCode = 1; }
}

(async () => {
  console.log('--- Browser regression tests (real Chromium) ---');
  const { srv, url } = await start(ROOT);
  let browser;
  try { browser = await playwright.chromium.launch(); }
  catch (e) {
    console.log('  [SKIP] No Chromium browser available (run: npx playwright install chromium)');
    srv.close(); process.exit(0);
  }
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // tests never need the network
  const page = await ctx.newPage();
  let errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });

  const gid = () => page.evaluate(() => window.ArcadePortal && window.ArcadePortal.currentGameId);
  const mountedSelectors = () => page.evaluate((sels) => sels.filter(s => document.querySelector('#game-viewport ' + s) || document.querySelector(s)), ALL_SELECTORS);
  const inst = (fn, arg) => page.evaluate(fn, arg);

  // ======================= C1: direct URLs =======================
  for (const [id, [slug, sel]] of Object.entries(GAMES)) {
    await test(`C1: /game/${slug} loads ${id} directly, after a refresh, and without errors`, async () => {
      errors = [];
      const res = await page.goto(`${url}/game/${slug}`);
      assert.strictEqual(res.status(), 200, 'HTTP status');
      await page.waitForSelector(sel, { timeout: 4000 });
      assert.strictEqual(await gid(), id);
      assert.deepStrictEqual(await mountedSelectors(), [sel], 'only this game may be mounted');
      assert.strictEqual(await page.evaluate(() => location.hash), '', 'URL must not gain a hash');
      for (const phase of ['refresh']) {
        await page.reload();
        await page.waitForSelector(sel, { timeout: 4000 });
        assert.strictEqual(await gid(), id, `after ${phase}`);
        assert.deepStrictEqual(await mountedSelectors(), [sel], `after ${phase}: only this game may be mounted`);
      }
      const meta = await page.evaluate(() => ({ t: document.title, c: document.querySelector('link[rel=canonical]').href, h1: [...document.querySelectorAll('h1')].length, d: document.querySelector('meta[name=description]').content }));
      assert(meta.t.includes('Play') && meta.c.endsWith(`/game/${slug}`) && meta.h1 === 1 && meta.d.length > 50, JSON.stringify(meta));
      assert.deepStrictEqual(errors, [], 'console/page errors: ' + errors.join(' | '));
    });
  }

  await test('C1: the game page toolbar works (favorite toggles, restart keeps the game mounted, sound toggles)', async () => {
    await page.goto(`${url}/game/neon-snake`);
    await page.waitForSelector('#snake-btn-play');
    const favBefore = await page.evaluate(() => window.ArcadePortal.favorites.includes('snake'));
    await page.click('#gv-btn-fav');
    assert.strictEqual(await page.evaluate(() => window.ArcadePortal.favorites.includes('snake')), !favBefore);
    await page.click('#gv-btn-fav');
    await page.click('#snake-btn-play');
    assert.strictEqual(await inst(() => window.ArcadePortal.activeGameInstance.state), 'PLAYING');
    await page.click('#gv-btn-restart');
    assert.strictEqual(await inst(() => window.ArcadePortal.activeGameInstance.score), 0);
    const snd = await page.evaluate(() => window.ArcadePortal.sound.enabled);
    await page.click('#gv-btn-sound');
    assert.strictEqual(await page.evaluate(() => window.ArcadePortal.sound.enabled), !snd);
    await page.click('#gv-btn-sound');
  });

  await test('C1: a missing game page is a real 404, not a silently wrong game', async () => {
    const res = await page.goto(`${url}/game/not-a-game`);
    assert.strictEqual(res.status(), 404);
  });

  // ======================= C1: hash routes preserved =======================
  for (const [id, [slug, sel]] of Object.entries(GAMES)) {
    await test(`C1: old hash route /#/game/${id} still opens ${id}`, async () => {
      errors = [];
      await page.goto(`${url}/#/game/${id}`);
      await page.reload();
      await page.waitForSelector(sel, { timeout: 4000 });
      assert.strictEqual(await gid(), id);
      assert.strictEqual(await page.evaluate(() => location.hash), `#/game/${id}`);
      assert.deepStrictEqual(errors, [], errors.join(' | '));
    });
  }

  await test('C1: hash category and favorites routes and the homepage content still work', async () => {
    await page.goto(`${url}/#/category/puzzle`);
    await page.reload();
    await page.waitForSelector('.game-card');
    const titles = await page.evaluate(() => [...document.querySelectorAll('.game-card .card-title')].map(e => e.textContent.trim()).sort());
    assert.deepStrictEqual(titles, ['2048 Puzzle', 'Block Puzzle']);
    await page.goto(`${url}/#/favorites`);
    await page.reload();
    await page.waitForSelector('#games-grid');
    assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.home-info').length), 1, 'homepage SEO section shown exactly once');
    assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.home-info a[href^="/game/"]').length), 10);
  });

  await test('C1: portal "Open on its own page" link leads to the matching direct page', async () => {
    await page.goto(`${url}/#/game/block-puzzle`);
    await page.reload();
    await page.waitForSelector('#block-btn-play');
    const href = await page.getAttribute('.game-details-box a[href^="/game/"]', 'href');
    assert.strictEqual(href, '/game/block-puzzle');
  });

  // ======================= C3: Resume must resume =======================
  for (const [id, [playSel, pauseSel]] of Object.entries(PAUSABLE)) {
    await test(`C3: ${id}: the RESUME button continues the run (no restart)`, async () => {
      await page.goto(`${url}/game/${GAMES[id][0]}`);
      await page.waitForSelector(playSel);
      await page.click(playSel);
      await page.waitForTimeout(250);
      await page.click(pauseSel);
      assert.strictEqual(await inst(() => window.ArcadePortal.activeGameInstance.state), 'PAUSED');
      assert((await page.textContent(playSel)).includes('RESUME'), 'overlay button should read RESUME');
      // While paused, plant a marker in state that only start() resets, and spy on start()
      await inst(() => {
        const g = window.ArcadePortal.activeGameInstance;
        g.score = 4242; g.distance = g.distance === undefined ? undefined : 4242;
        window.__starts = 0; const s = g.start.bind(g); g.start = () => { window.__starts++; s(); };
      });
      await page.click(playSel);
      await page.waitForTimeout(100);
      const r = await inst(() => ({ starts: window.__starts, state: window.ArcadePortal.activeGameInstance.state, score: window.ArcadePortal.activeGameInstance.score }));
      assert.strictEqual(r.starts, 0, 'RESUME must not call start()');
      assert.strictEqual(r.state, 'PLAYING');
      assert(r.score >= 1 || id === 'endless-runner', `run was reset (score ${r.score})`);
      if (id !== 'endless-runner') assert.strictEqual(r.score >= 4242, true, `score ${r.score} lost after resume`);
    });
  }

  await test('C3: fruit-slice pauses with P and resumes through its 3-2-1 countdown', async () => {
    await page.goto(`${url}/game/fruit-slice`);
    await page.waitForSelector('#btn-play');
    await page.click('#btn-play');
    await page.waitForFunction(() => window.ArcadePortal.activeGameInstance.state === 'PLAYING', null, { timeout: 8000 });
    await page.keyboard.press('p');
    assert.strictEqual(await inst(() => window.ArcadePortal.activeGameInstance.state), 'PAUSED');
    await page.click('#btn-resume');
    await page.waitForFunction(() => window.ArcadePortal.activeGameInstance.state === 'PLAYING', null, { timeout: 4000 });
    await page.keyboard.down('p');                                     // real key press: pauses
    for (let i = 0; i < 3; i++) await page.keyboard.down('p');         // held key (auto-repeat): must be ignored (4 downs in total, an even number, so a toggling bug is visible)
    await page.keyboard.up('p');
    assert.strictEqual(await inst(() => window.ArcadePortal.activeGameInstance.state), 'PAUSED', 'held P must not flicker');
  });

  // ======================= C3: pause keys are consistent =======================
  for (const [id, [playSel]] of Object.entries(PAUSABLE)) {
    await test(`C3: ${id}: P and Esc pause and resume; holding the key does not flicker`, async () => {
      await page.goto(`${url}/game/${GAMES[id][0]}`);
      await page.waitForSelector(playSel);
      await page.click(playSel);
      await page.waitForTimeout(150);
      const st = () => inst(() => window.ArcadePortal.activeGameInstance.state);
      for (const key of ['p', 'P', 'Escape']) {
        await page.keyboard.press(key);
        assert.strictEqual(await st(), 'PAUSED', `${key} should pause`);
        await page.keyboard.press(key);
        assert.strictEqual(await st(), 'PLAYING', `${key} should resume`);
      }
      await page.keyboard.down('p');                                     // real key press
      for (let i = 0; i < 3; i++) await page.keyboard.down('p');         // auto-repeat events (4 downs in total: an even count exposes a toggling bug)
      await page.keyboard.up('p');
      assert.strictEqual(await st(), 'PAUSED', 'only the first keydown may toggle pause');
    });
  }

  await test('C3: pause keys do nothing on games that have no pause (2048, Tic-Tac-Toe, Memory Match)', async () => {
    for (const id of ['puzzle-2048', 'tic-tac-toe', 'memory-match']) {
      await page.goto(`${url}/game/${GAMES[id][0]}`);
      await page.waitForSelector(GAMES[id][1]);
      await page.keyboard.press('p'); await page.keyboard.press('Escape');
      assert.deepStrictEqual(await mountedSelectors(), [GAMES[id][1]]);
    }
  });

  // ======================= C3: Tic-Tac-Toe glow =======================
  await test('C3: Tic-Tac-Toe vs Invincible never shows a winning highlight before the game ends', async () => {
    await page.goto(`${url}/game/tic-tac-toe`);
    await page.waitForSelector('.ttt-cell');
    for (let round = 0; round < 3; round++) {
      await page.click('#ttt-btn-reset');
      for (let move = 0; move < 5; move++) {
        const over = await inst(() => window.ArcadePortal.activeGameInstance.gameOver);
        if (over) break;
        const empty = await page.evaluate(() => [...document.querySelectorAll('.ttt-cell')].map((c, i) => (c.textContent ? -1 : i)).filter(i => i >= 0));
        await page.click(`.ttt-cell[data-index="${empty[0]}"]`);
        await page.waitForTimeout(450);
        const s = await inst(() => ({ over: window.ArcadePortal.activeGameInstance.gameOver, glow: document.querySelectorAll('.ttt-cell.winner').length, board: window.ArcadePortal.activeGameInstance.board.map(c => c || '-').join('') }));
        if (!s.over) assert.strictEqual(s.glow, 0, `false glow on an unfinished game, board ${s.board}`);
      }
    }
  });

  await test('C3: Tic-Tac-Toe still highlights exactly the three winning cells on a real win', async () => {
    await page.goto(`${url}/game/tic-tac-toe`);
    await page.waitForSelector('.ttt-cell');
    await page.click('#ttt-mode-2p');
    for (const i of [0, 3, 1, 4, 2]) await page.click(`.ttt-cell[data-index="${i}"]`);
    const glow = await page.evaluate(() => [...document.querySelectorAll('.ttt-cell.winner')].map(c => +c.dataset.index));
    assert.deepStrictEqual(glow, [0, 1, 2]);
    assert(/X WINS/.test(await page.textContent('#ttt-status-text')));
  });

  // ======================= C3 follow-up: reset while the computer is thinking =======================
  const tttBoard = () => inst(() => window.ArcadePortal.activeGameInstance.board.map(c => c || '-').join(''));

  await test('C3: Tic-Tac-Toe: resetting while the computer is thinking leaves an empty board and a normal next round', async () => {
    await page.goto(`${url}/game/tic-tac-toe`);
    await page.waitForSelector('.ttt-cell');
    await page.click('.ttt-cell[data-index="0"]');            // computer starts "thinking" (320 ms delay)
    assert.strictEqual((await page.textContent('#ttt-status-text')).trim(), 'COMPUTER THINKING...');
    await page.click('#ttt-btn-reset');                       // reset straight away
    await page.waitForTimeout(900);                           // far longer than the computer's delay
    assert.strictEqual(await tttBoard(), '---------', 'the old round must not play into the new board');
    assert.strictEqual((await page.textContent('#ttt-status-text')).trim(), "PLAYER X'S TURN");
    await page.click('.ttt-cell[data-index="4"]');            // the new round plays normally
    await page.waitForTimeout(900);
    const b = await tttBoard();
    assert.strictEqual(b[4], 'X');
    assert.strictEqual(b.replace(/-/g, '').length, 2, `expected X + one computer O, got ${b}`);
    assert.strictEqual(b.split('O').length - 1, 1, `expected exactly one O, got ${b}`);
  });

  await test('C3: Tic-Tac-Toe: switching mode or difficulty while the computer is thinking also cancels its move', async () => {
    await page.goto(`${url}/game/tic-tac-toe`);
    await page.waitForSelector('.ttt-cell');
    await page.click('.ttt-cell[data-index="0"]');
    await page.click('#ttt-mode-2p');
    await page.waitForTimeout(900);
    assert.strictEqual(await tttBoard(), '---------', 'switching to 2 players must not receive an old computer move');
    await page.click('#ttt-mode-ai');
    await page.click('.ttt-cell[data-index="0"]');
    await page.selectOption('#ttt-difficulty', 'easy');
    await page.waitForTimeout(900);
    assert.strictEqual(await tttBoard(), '---------', 'changing difficulty must not receive an old computer move');
  });

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  await browser.close(); srv.close();
  if (passed !== total) process.exitCode = 1;
})().catch(e => { console.error('Browser test run crashed:', e); process.exit(1); });
