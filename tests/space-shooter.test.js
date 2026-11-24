/**
 * Space Shooter campaign tests (zero dependencies for the engine tests; the real-browser
 * section at the bottom uses Playwright if it is installed and prints SKIP otherwise).
 *
 * These test behaviour, not wording: the economy rules, the save system, frame-rate
 * independence, pause freezing, enemies, bosses, missions, rewards, persistence and UI.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fake = require('./helpers/fake-dom');
fake.installGlobals();

const ROOT = path.join(__dirname, '..');
const { SpaceShooterGame } = require('../js/games/space-shooter.js');
const D = SpaceShooterGame.DATA;
const SAVE = SpaceShooterGame.SAVE;

let passed = 0, total = 0;
function test(name, fn) {
  total++;
  try { fn(); console.log(`  [PASS] ${name}`); passed++; }
  catch (err) { console.error(`  [FAIL] ${name}`); console.error(err); process.exitCode = 1; }
}

// ---- helpers -------------------------------------------------------------
let rngSeed = 1;
function seedRandom(n) { rngSeed = n >>> 0 || 1; Math.random = () => { rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0; return rngSeed / 4294967296; }; }
function freshStorage(initial) {
  const s = Object.assign({}, initial || {});
  global.localStorage = { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; }, _s: s };
  return s;
}
function newGame(storage) {
  if (storage !== null) freshStorage(storage);
  fake.resetWindowListeners();                 // each test game is the only one listening to the window
  seedRandom(12345);
  const g = new SpaceShooterGame(fake.createContainer(), null);
  g.init();
  return g;
}
function step(g, seconds, fps) {
  const dt = 1 / (fps || 60), n = Math.round(seconds * (fps || 60));
  for (let i = 0; i < n; i++) g.update(dt);
}
function godMode(g) { g.player.invuln = 1e9; g.player.shield = g.player.maxShield = 99; }
function unlockAll(g) {
  D.MISSIONS.forEach(m => { g.save.missions.progress[m.id] = { done: true, bonus: false, best: 1, plays: 1 }; });
}
function noSpawns(g) { g.run.spawnTimer = 1e9; g.run.hazardTimer = 1e9; g.run.bossAt = 1e9; }
function snapshot(g) {
  return JSON.stringify({
    time: g.time, rt: g.run.time, score: g.score, shield: g.player.shield, px: g.player.x, py: g.player.y,
    rapid: g.player.rapid, cd: g.player.cooldown, acd: g.player.abilityCd, inv: g.player.invuln, shake: g.shake,
    en: g.enemies.map(e => [e.x, e.y, e.hp, e.age]), eb: g.ebullets.map(b => [b.x, b.y]), la: g.lasers.map(b => [b.x, b.y]),
    parts: g.particles.map(q => [q.x, q.y, q.life]), stars: g.stars.map(s => s.y), banners: g.banners.map(b => b.t),
    boss: g.boss ? [g.boss.x, g.boss.y, g.boss.hp, g.boss.t] : null, pick: g.pickups.map(k => [k.x, k.y, k.age])
  });
}
function winMission(g, id) {
  g.selectMission(id); g.start(); noSpawns(g);
  const m = D.MISSIONS.find(x => x.id === id);
  if (m.boss) { g.run.bossKills = 1; } else if (m.stat === 'survive') { g.run.time = m.target + 1; }
  else if (m.stat === 'kills') { g.run.kills = m.target; } else if (m.stat === 'coins') { g.run.coins = m.target; }
  else if (m.stat === 'elites') { g.run.elites = m.target; } else if (m.stat.indexOf('kills') === 0) { g.run.killsBy[m.stat.slice(5).toLowerCase()] = m.target; }
  g.score = 1000; godMode(g); step(g, 3);
  return g.lastResult;
}

console.log('--- Space Shooter campaign tests ---');

/* ====================================================================== data */
test('Hangar: five ships with the required names and prices', () => {
  assert.deepStrictEqual(D.SHIPS.map(s => [s.name, s.cost]), [['Vanguard', 0], ['Striker', 500], ['Bulwark', 1500], ['Nova', 3500], ['Phantom', 7000]]);
});
test('Hangar: every ship has distinct stats, ability, weapon and colours', () => {
  const sig = (s) => [s.shield, s.speed, s.fireRate, s.damage].join('/');
  assert.strictEqual(new Set(D.SHIPS.map(sig)).size, 5);
  assert.strictEqual(new Set(D.SHIPS.map(s => s.ability.id)).size, 5);
  assert.strictEqual(new Set(D.SHIPS.map(s => s.weapon)).size, 5);
  assert.strictEqual(new Set(D.SHIPS.map(s => s.colors.hull)).size, 5);
  D.SHIPS.forEach(s => assert.ok(s.blurb.length > 20 && s.role && s.ability.desc && s.ability.cooldown > 0, s.id));
});
test('Hangar: Vanguard keeps the original 3-point shield', () => {
  assert.strictEqual(D.SHIPS[0].shield, 3);
  assert.ok(/maxShield: 3/.test(fs.readFileSync(path.join(ROOT, 'js/games/space-shooter.js'), 'utf8')));
});
test('Upgrades: damage, fire rate, shield, speed and ability with 5 rising price levels', () => {
  assert.deepStrictEqual(D.UPGRADES.map(u => u.id), ['damage', 'fireRate', 'shield', 'speed', 'ability']);
  D.UPGRADES.forEach(u => {
    assert.strictEqual(u.max, 5); assert.strictEqual(u.costs.length, 5);
    for (let i = 1; i < 5; i++) assert.ok(u.costs[i] > u.costs[i - 1], u.id);
  });
});
test('Campaign: six sectors with three missions each, the last being a boss', () => {
  assert.strictEqual(D.SECTORS.length, 6);
  D.SECTORS.forEach(s => {
    const ms = D.MISSIONS.filter(m => m.sector === s.id);
    assert.strictEqual(ms.length, 3, `sector ${s.id}`);
    assert.deepStrictEqual(ms.map(m => m.boss), [false, false, true]);
    assert.ok(ms.every(m => m.reward > 0 && m.bonus && m.bonus.reward > 0 && m.target > 0));
    assert.ok(D.BOSSES[s.boss], 'boss exists');
  });
  assert.strictEqual(new Set(D.SECTORS.map(s => s.boss)).size, 6, 'six different bosses');
});
test('Campaign: difficulty and rewards rise sector by sector', () => {
  for (let i = 1; i < 6; i++) {
    assert.ok(D.SECTORS[i].hp > D.SECTORS[i - 1].hp, 'enemy health');
    assert.ok(D.SECTORS[i].fire >= D.SECTORS[i - 1].fire, 'fire rate');
    assert.ok(D.SECTORS[i].spawn < D.SECTORS[i - 1].spawn, 'spawn pace');
    assert.ok(D.BOSSES[D.SECTORS[i].boss].hp > D.BOSSES[D.SECTORS[i - 1].boss].hp, 'boss health');
    const reward = (s) => D.MISSIONS.filter(m => m.sector === s).reduce((a, m) => a + m.reward, 0);
    assert.ok(reward(i + 1) > reward(i), 'mission rewards');
  }
});
test('Campaign: sectors feel different (palette, hazard and enemy mix)', () => {
  assert.strictEqual(new Set(D.SECTORS.map(s => s.hazardKey)).size, 6);
  assert.strictEqual(new Set(D.SECTORS.map(s => s.bg.join())).size, 6);
  assert.strictEqual(new Set(D.SECTORS.map(s => Object.keys(s.pool).sort().join())).size >= 5, true);
});
test('Combat: seven enemy classes, six bosses and the four required power-ups exist', () => {
  assert.ok(Object.keys(D.ENEMIES).length >= 7);
  assert.ok(Object.values(D.ENEMIES).every(e => e.hp > 0 && e.score > 0 && e.behaviour.length > 10));
  assert.strictEqual(Object.keys(D.BOSSES).length, 6);
  ['rapid', 'spread', 'shield', 'health'].forEach(k => assert.ok(D.POWERUPS[k], k));
  assert.ok(D.ACHIEVEMENTS.length >= 12 && new Set(D.ACHIEVEMENTS.map(a => a.id)).size === D.ACHIEVEMENTS.length);
});

/* ====================================================================== save system */
test('Save: sanitizer turns any garbage into a complete, valid profile', () => {
  [null, undefined, 'text', 42, [], true, () => 1].forEach(x => {
    const s = SAVE.sanitize(x);
    assert.strictEqual(s.version, SAVE.VERSION); assert.strictEqual(s.coins, 0);
    assert.deepStrictEqual(s.ships.owned, ['vanguard']); assert.strictEqual(s.ships.selected, 'vanguard');
  });
});
test('Save: sanitizer clamps numbers and drops unknown ids', () => {
  const s = SAVE.sanitize({
    coins: -50, ships: { owned: ['nova', 'ghost', 5], selected: 'phantom' },
    upgrades: { damage: 99, fireRate: -3, shield: '2', speed: 'x', bogus: 5 },
    missions: { current: 'zzz', progress: { s1m1: { done: 1, best: -9 }, nope: { done: true } } },
    achievements: { first_blood: 1, fake: 1 }, stats: { kills: 'abc', bosses: ['rockjaw', 'rockjaw', 'x'] }
  });
  assert.strictEqual(s.coins, 0);
  assert.deepStrictEqual(s.ships.owned.sort(), ['nova', 'vanguard']);
  assert.strictEqual(s.ships.selected, 'vanguard', 'cannot select a ship that is not owned');
  assert.deepStrictEqual(s.upgrades, { damage: 5, fireRate: 0, shield: 2, speed: 0, ability: 0 });
  assert.ok(!('bogus' in s.upgrades) && !s.missions.progress.nope && s.missions.progress.s1m1.best === 0);
  assert.strictEqual(s.missions.current, 's1m1');
  assert.deepStrictEqual(Object.keys(s.achievements), ['first_blood']);
  assert.strictEqual(s.stats.kills, 0); assert.deepStrictEqual(s.stats.bosses, ['rockjaw']);
  assert.ok(SAVE.sanitize({ coins: 1e300 }).coins <= 99999999);
});
test('Save: a locked mission can never be the current mission', () => {
  assert.strictEqual(SAVE.sanitize({ missions: { current: 's4m2' } }).missions.current, 's1m1');
});
test('Save: JSON prototype-pollution payloads are ignored', () => {
  const s = SAVE.sanitize(JSON.parse('{"__proto__":{"polluted":1},"coins":5,"constructor":{"x":1}}'));
  assert.strictEqual(s.coins, 5); assert.strictEqual({}.polluted, undefined);
});
test('Save: missing, valid, corrupted, newer-format and unavailable storage are all handled', () => {
  freshStorage(); assert.strictEqual(SAVE.load().status, 'new');
  freshStorage({ arcade_space_save_v1: JSON.stringify(Object.assign(SAVE.defaults(), { coins: 77 })) });
  let r = SAVE.load(); assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.save.coins, 77);
  freshStorage({ arcade_space_save_v1: '{not json' }); assert.strictEqual(SAVE.load().status, 'corrupt');
  freshStorage({ arcade_space_save_v1: '"a string"' }); assert.strictEqual(SAVE.load().status, 'corrupt');
  freshStorage({ arcade_space_save_v1: JSON.stringify({ version: 99, coins: 12 }) });
  r = SAVE.load(); assert.strictEqual(r.status, 'migrated'); assert.strictEqual(r.save.coins, 12);
  global.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.strictEqual(SAVE.load().status, 'unavailable');
  const g = new SpaceShooterGame(fake.createContainer(), null); g.init();     // the game must still start
  assert.strictEqual(g.storageOk, false);
  g.save.coins = 600; assert.strictEqual(g.buyShip('striker').ok, true, 'purchases still work in memory');
  assert.strictEqual(g.persist(), false);
  g.start(); step(g, 1); assert.strictEqual(g.state, 'PLAYING');
  assert.ok(/blocking storage/.test(g.homeHtml()), 'the player is told progress cannot be saved');
});
test('Save: a corrupted save never crashes the game and starts a fresh profile', () => {
  const g = newGame({ arcade_space_save_v1: '\u0000garbage{{', arcade_space_highscore: '4321' });
  assert.strictEqual(g.saveStatus, 'corrupt'); assert.strictEqual(g.save.coins, 0);
  assert.strictEqual(g.highScore, 4321, 'the high score survives');
  assert.ok(/could not be read/.test(g.homeHtml()));
});
test('Save: existing arcade_space_highscore is preserved and a veteran bonus is capped at 400 coins', () => {
  let g = newGame({ arcade_space_highscore: '4000' });
  assert.strictEqual(g.highScore, 4000); assert.strictEqual(g.save.coins, 400);
  g = newGame({ arcade_space_highscore: '80' }); assert.strictEqual(g.save.coins, 10);
  g = newGame({ arcade_space_highscore: '4000', arcade_space_save_v1: JSON.stringify(Object.assign(SAVE.defaults(), { coins: 5 })) });
  assert.strictEqual(g.save.coins, 5, 'an existing save is never topped up');
  g = newGame({}); assert.strictEqual(g.save.coins, 0);
});
test('Save: the legacy high score key keeps working (never lowered, raised on a new best)', () => {
  const store = freshStorage({ arcade_space_highscore: '5000' });
  const g = newGame(null); g.start(); noSpawns(g); g.score = 120; g.endRun('lose');
  assert.strictEqual(store.arcade_space_highscore, '5000');
  g.start(); noSpawns(g); g.score = 9000; g.endRun('lose');
  assert.strictEqual(store.arcade_space_highscore, '9000');
  assert.strictEqual(newGame(null).highScore, 9000);
});
test('Save: written data is versioned JSON under arcade_space_save_v1', () => {
  const store = freshStorage();
  const g = newGame(null); g.save.coins = 700; g.buyShip('striker');
  const raw = JSON.parse(store.arcade_space_save_v1);
  assert.strictEqual(raw.version, 1); assert.strictEqual(raw.coins, 200);
  assert.deepStrictEqual(raw.ships.owned, ['vanguard', 'striker']); assert.strictEqual(raw.ships.selected, 'striker');
});

/* ====================================================================== hangar + upgrades */
test('Hangar: a locked ship cannot be selected, bought without coins, or equipped through the UI', () => {
  const g = newGame();
  assert.strictEqual(g.selectShip('phantom').reason, 'locked');
  assert.strictEqual(g.save.ships.selected, 'vanguard');
  g.save.coins = 499; const r = g.buyShip('striker');
  assert.deepStrictEqual([r.ok, r.reason, r.need], [false, 'coins', 1]);
  assert.strictEqual(g.save.coins, 499); assert.ok(!g.owns('striker'));
  g.hangarView = 'bulwark'; const html = g.hangarHtml();
  assert.ok(!/data-act="equip" data-id="bulwark"/.test(html), 'no equip action for a locked ship');
  assert.ok(/class="ss-btn locked" disabled/.test(html), 'the locked ship shows a disabled button');
  assert.ok(/need 1,001 more/.test(html), 'shows the exact shortfall (1,500 - 499)');
  g.handleAction('equip', 'bulwark'); assert.strictEqual(g.save.ships.selected, 'vanguard', 'forged action is refused too');
});
test('Hangar: buying deducts coins, unlocks and equips; rebuying is refused; equip switches ships', () => {
  const g = newGame(); g.save.coins = 2100;
  assert.strictEqual(g.buyShip('bulwark').ok, true);
  assert.strictEqual(g.save.coins, 600); assert.ok(g.owns('bulwark')); assert.strictEqual(g.save.ships.selected, 'bulwark');
  assert.strictEqual(g.buyShip('bulwark').reason, 'owned'); assert.strictEqual(g.save.coins, 600);
  assert.strictEqual(g.selectShip('vanguard').ok, true); assert.strictEqual(g.save.ships.selected, 'vanguard');
  assert.strictEqual(g.buyShip('nope').ok, false);
});
test('Hangar: shows every ship with its price, stats, ability and a clear locked / equipped / owned state', () => {
  const g = newGame(); g.save.coins = 600; g.buyShip('striker'); g.selectShip('vanguard');
  const html = g.hangarHtml();
  D.SHIPS.forEach(s => assert.ok(html.indexOf(s.name) >= 0, s.name));
  ['EQUIPPED', 'OWNED', '1,500', '3,500', '7,000', 'Armor', 'Speed', 'Firepower', 'Fire rate', 'Pulse Wave'].forEach(t => assert.ok(html.indexOf(t) >= 0, t));
  assert.ok(/id="space-preview"/.test(html), 'a preview canvas is present');
});
test('Upgrades: buy to max with exact prices, then the max state blocks further purchases', () => {
  const g = newGame(); g.save.coins = 100000; D.ACHIEVEMENTS.forEach(a => { g.save.achievements[a.id] = 1; });   // medal payouts would blur the arithmetic
  D.UPGRADES.forEach(u => {
    const before = g.save.coins;
    for (let l = 0; l < 5; l++) assert.strictEqual(g.buyUpgrade(u.id).ok, true);
    assert.strictEqual(before - g.save.coins, u.costs.reduce((a, b) => a + b, 0), u.id);
    assert.strictEqual(g.upgradeCost(u.id), null);
    assert.strictEqual(g.buyUpgrade(u.id).reason, 'max');
  });
  const html = g.upgradesHtml();
  assert.strictEqual((html.match(/MAX LEVEL/g) || []).length, 5);
  assert.strictEqual((html.match(/Level 5 \/ 5/g) || []).length, 5);
});
test('Upgrades: insufficient coins show the price, the shortfall and a disabled button', () => {
  const g = newGame(); g.save.coins = 50;
  assert.strictEqual(g.buyUpgrade('damage').reason, 'coins'); assert.strictEqual(g.upgradeLevel('damage'), 0);
  const html = g.upgradesHtml();
  assert.ok(/120 · need 70 more/.test(html)); assert.ok(/Level 0 \/ 5/.test(html)); assert.ok(!/data-act="buy-up"/.test(html));
  g.save.coins = 120; assert.ok(/data-act="buy-up" data-id="damage"/.test(g.upgradesHtml()));
});
test('Upgrades: each track really changes the numbers the engine uses', () => {
  const g = newGame(); const base = g.getStats();
  g.save.upgrades = { damage: 5, fireRate: 5, shield: 5, speed: 5, ability: 5 };
  const up = g.getStats();
  assert.ok(Math.abs(up.damage / base.damage - 1.6) < 1e-9);
  assert.ok(Math.abs(up.fireRate / base.fireRate - 1.4) < 1e-9);
  assert.strictEqual(up.maxShield, base.maxShield + 3);
  assert.ok(Math.abs(up.speed / base.speed - 1.3) < 1e-9);
  assert.ok(Math.abs(up.abilityCd / base.abilityCd - 0.65) < 1e-9 && up.abilityPower > base.abilityPower);
  assert.ok(up.regen === 8 && base.regen === 0, 'shield auto-repair unlocks with upgrades');
});
test('Upgrades: they matter in play (shots fired, speed, shield, time to kill)', () => {
  const run = (ups) => {
    const g = newGame(); Object.assign(g.save.upgrades, ups); g.start(); noSpawns(g); godMode(g);
    g.player.maxShield = g.stats.maxShield; g.player.shield = g.stats.maxShield;
    g.keys[' '] = true; g.keys.ArrowRight = true; g.player.x = 100; step(g, 1);
    return { shots: g.run.shots, x: g.player.x, shield: g.stats.maxShield, abilityCd: g.stats.abilityCd };
  };
  const a = run({}), b = run({ fireRate: 5, speed: 5, shield: 5, ability: 5 });
  assert.ok(b.shots > a.shots, 'more shots per second'); assert.ok(b.x > a.x, 'moves further');
  assert.ok(b.shield > a.shield); assert.ok(b.abilityCd < a.abilityCd);
  const hitsToKill = (lvl) => {
    const g = newGame(); g.save.upgrades.damage = lvl; g.start(); noSpawns(g);
    const e = g.spawnEnemy('gunship', { x: 240, y: 150, elite: false }); let n = 0;
    while (!e.dead && n < 50) { g.player.cooldown = 0; g.shoot(); g.lasers.forEach(l => { l.x = e.x; l.y = e.y; }); g.update(1 / 60); n++; }
    return n;
  };
  assert.ok(hitsToKill(5) < hitsToKill(0), 'damage upgrade kills faster');
});
test('Ships: every ship fires a different weapon pattern', () => {
  const pat = {};
  D.SHIPS.forEach(s => {
    const g = newGame(); g.save.ships.owned = D.SHIPS.map(x => x.id); g.save.ships.selected = s.id; g.start(); noSpawns(g);
    g.shoot();
    pat[s.id] = g.lasers.map(l => l.kind + ':' + (l.pierce ? 'p' : '') + (l.splash ? 's' : '') + (l.crit ? 'c' : '')).join(',');
  });
  assert.strictEqual(new Set(Object.values(pat)).size, 5, JSON.stringify(pat));
  assert.strictEqual(pat.vanguard, 'bolt:,bolt:');
  assert.ok(/slug:s/.test(pat.bulwark) && /lance:p/.test(pat.nova) && /needle:c/.test(pat.phantom));
});
test('Ships: Nova adds homing missiles every third volley; Striker alternates its guns', () => {
  let g = newGame(); g.save.ships.owned = D.SHIPS.map(x => x.id); g.save.ships.selected = 'nova'; g.start(); noSpawns(g);
  for (let i = 0; i < 3; i++) { g.player.cooldown = 0; g.shoot(); }
  assert.strictEqual(g.lasers.filter(l => l.kind === 'missile' && l.homing > 0).length, 2);
  g = newGame(); g.save.ships.owned = D.SHIPS.map(x => x.id); g.save.ships.selected = 'striker'; g.start(); noSpawns(g);
  g.shoot(); g.player.cooldown = 0; g.shoot();
  assert.ok((g.lasers[0].x - g.player.x) * (g.lasers[1].x - g.player.x) < 0, 'consecutive shots come from opposite guns');
});
test('Ships: stats differ in play (Bulwark is tankier but slower than Striker)', () => {
  const g = newGame(); const a = g.getStats('striker'), b = g.getStats('bulwark');
  assert.ok(b.maxShield > a.maxShield && b.speed < a.speed && a.fireRate > b.fireRate && b.damage > a.damage);
  g.save.ships.owned = D.SHIPS.map(x => x.id); g.save.ships.selected = 'bulwark'; g.start();
  assert.strictEqual(g.player.maxShield, 5);
});

/* ====================================================================== frame rate + pause */
test('Engine: fire rate does not depend on frame rate (30 / 60 / 144 fps)', () => {
  const shots = (fps) => { const g = newGame(); g.start(); noSpawns(g); godMode(g); g.keys[' '] = true; g.player.cooldown = 0; step(g, 4, fps); return g.run.shots / 2; };
  const expected = 4.2 * 4;
  [30, 60, 144].forEach(fps => assert.ok(Math.abs(shots(fps) - expected) <= 1.5, `${fps} fps: ${shots(fps)} volleys, expected ~${expected}`));
});
test('Engine: movement and enemy speed do not depend on frame rate', () => {
  const dist = (fps) => { const g = newGame(); g.start(); noSpawns(g); g.player.x = 60; g.keys.ArrowRight = true; step(g, 0.5, fps); return g.player.x; };
  assert.ok(Math.abs(dist(30) - dist(144)) < 8, `${dist(30)} vs ${dist(144)}`);
  const fall = (fps) => { const g = newGame(); g.start(); noSpawns(g); godMode(g); const e = g.spawnEnemy('drone', { x: 240, y: 0, elite: false }); step(g, 2, fps); return e.y; };
  assert.ok(Math.abs(fall(30) - fall(144)) < 3);
});
test('Pause: freezes the game clock, enemies, bullets, particles, power-ups, boss and animations', () => {
  const g = newGame(); unlockAll(g); g.selectMission('s6m3'); g.start(); godMode(g);
  g.keys[' '] = true; g.run.time = 33; g.run.bossAt = 34; step(g, 3);
  g.applyPowerup('rapid'); g.spawnEnemy('gunship'); g.explode(200, 200, '#fff', 2); g.addShake(0.5); step(g, 1);
  assert.ok(g.boss, 'a boss is on screen'); assert.ok(g.enemies.length && g.particles.length);
  g.pause(); assert.strictEqual(g.state, 'PAUSED');
  const frozen = snapshot(g);
  step(g, 10); g.update(5); g.loop();
  assert.strictEqual(snapshot(g), frozen, 'nothing may advance while paused');
});
test('Pause: resume continues the same run with every value preserved', () => {
  const g = newGame(); g.start(); godMode(g); g.player.shield = 2; g.keys[' '] = true; step(g, 2);
  g.score = 777; g.applyPowerup('spread'); const enemies = g.enemies.slice(), time = g.time, spreadLeft = g.player.spread;
  g.pause(); g.resume();
  assert.strictEqual(g.state, 'PLAYING'); assert.strictEqual(g.score, 777); assert.strictEqual(g.player.shield, 2);
  assert.strictEqual(g.time, time); assert.strictEqual(g.player.spread, spreadLeft);
  assert.deepStrictEqual(g.enemies, enemies); assert.ok(g.run.time > 1.9);
  step(g, 0.5); assert.ok(g.time > time && g.score >= 777);
});
test('Pause: held keys and held fire are released so the ship does not run away on resume', () => {
  const g = newGame(); g.start(); g.keys.ArrowLeft = true; g.touchFire = true; g.pointer.firing = true;
  g.pause(); assert.deepStrictEqual(g.keys, {}); assert.strictEqual(g.touchFire, false); assert.strictEqual(g.pointer.firing, false);
});
test('Pause: a mouse that was hovering before the pause does not drag the ship away on resume', () => {
  const g = newGame(); g.start(); noSpawns(g); godMode(g); const rect = g.canvas.getBoundingClientRect();
  g.onPointerMove({ pointerType: 'mouse', clientX: rect.left + 20, clientY: rect.top + 300 }); assert.strictEqual(g.pointer.active, true);
  g.pause(); assert.strictEqual(g.pointer.active, false);
  g.resume(); g.player.x = 400; step(g, 1); assert.ok(Math.abs(g.player.x - 400) < 1, 'ship stays where it was: ' + g.player.x);
});
test('Pause: the pause menu shows the run and its resume button says RESUME', () => {
  const g = newGame(); g.start(); step(g, 1); g.pause();
  assert.strictEqual(g.btnPlay.textContent, 'RESUME');
  assert.ok(/PAUSED/.test(g.screenEl.innerHTML) && /RESTART MISSION/.test(g.screenEl.innerHTML) && /ABORT TO MENU/.test(g.screenEl.innerHTML));
});
test('Pause: aborting keeps the coins already collected', () => {
  const store = freshStorage(); const g = newGame(null); g.start(); g.run.coins = 37; g.pause(); g.abortRun();
  assert.strictEqual(g.state, 'MENU'); assert.strictEqual(JSON.parse(store.arcade_space_save_v1).coins, 37);
});
test('Pause: collected coins are saved the moment the game pauses (a refresh cannot lose them)', () => {
  const store = freshStorage(); const g = newGame(null); g.start(); g.run.coins = 21; g.pause();
  assert.strictEqual(JSON.parse(store.arcade_space_save_v1).coins, 21);
  g.destroy(); assert.strictEqual(JSON.parse(store.arcade_space_save_v1).coins, 21, 'no double banking');
});

/* ====================================================================== combat */
test('Enemies: every class spawns with health and a different behaviour', () => {
  const g = newGame(); g.start(); noSpawns(g); godMode(g);
  Object.keys(D.ENEMIES).forEach(t => { const e = g.spawnEnemy(t, { elite: false }); assert.ok(e.hp > 0 && e.r > 0, t); });
  assert.strictEqual(new Set(g.enemies.map(e => e.type)).size, Object.keys(D.ENEMIES).length);
  const start = new Map(g.enemies.map(e => [e.type, [e.x, e.y]]));
  step(g, 1.5);
  const moved = {}; g.enemies.forEach(e => { const s = start.get(e.type); moved[e.type] = [Math.round(e.x - s[0]), Math.round(e.y - s[1])].join(','); });
  assert.ok(new Set(Object.values(moved)).size >= 5, 'classes move differently: ' + JSON.stringify(moved));
});
test('Enemies: kamikaze homes in, weaver and gunship shoot, sniper telegraphs then fires, carrier launches drones', () => {
  let g = newGame(); g.start(); noSpawns(g); godMode(g); g.player.x = 400; g.player.y = 560;
  let k = g.spawnEnemy('kamikaze', { x: 60, y: 40, elite: false }); step(g, 1.4); assert.ok(k.x > 60, 'steers toward the player');
  g = newGame(); g.start(); noSpawns(g); godMode(g);
  const peak = (secs) => { let m = 0; for (let i = 0; i < secs * 60; i++) { g.update(1 / 60); m = Math.max(m, g.ebullets.length); } return m; };
  g.spawnEnemy('weaver', { y: 60, elite: false }); assert.ok(peak(3.2) >= 1, 'weaver fires');
  g = newGame(); g.start(); noSpawns(g); godMode(g);
  g.spawnEnemy('gunship', { y: 120, elite: false }); assert.ok(peak(3) >= 3, 'gunship fires a three-shot spread');
  g = newGame(); g.start(); noSpawns(g); godMode(g);
  const s = g.spawnEnemy('sniper', { x: 240, y: 90, elite: false }); let warned = false, fired = false;
  for (let i = 0; i < 60 * 5; i++) { g.update(1 / 60); if (s.state === 1) warned = true; if (g.ebullets.length) { fired = true; break; } }
  assert.ok(warned && fired, 'sniper shows a warning before its shot');
  g = newGame(); g.start(); noSpawns(g); godMode(g);
  g.spawnEnemy('carrier', { y: 100, elite: false }); step(g, 6); assert.ok(g.enemies.filter(e => e.type === 'drone').length >= 2, 'carrier spawns drones');
});
test('Enemies: large asteroids split into fragments', () => {
  const g = newGame(); g.start(); noSpawns(g);
  const a = g.spawnEnemy('asteroid', { radius: 26, x: 240, y: 100 }); g.killEnemy(a); g.update(1 / 60);
  assert.ok(g.enemies.filter(e => e.type === 'asteroid' && e.r === 14).length === 2);
});
test('Elites: tougher, bigger, worth more, richer and always drop a power-up', () => {
  const g = newGame(); g.start(); noSpawns(g); godMode(g);
  const n = g.spawnEnemy('gunship', { elite: false }), e = g.spawnEnemy('gunship', { elite: true });
  assert.ok(e.elite && e.hp > n.hp * 2.3 && e.r > n.r);
  const s0 = g.score; g.killEnemy(n); const normalPts = g.score - s0;
  const s1 = g.score; g.killEnemy(e); assert.ok(g.score - s1 >= normalPts * 2.9);
  assert.ok(g.pickups.some(p => p.kind !== 'coin'), 'power-up drop');
  assert.strictEqual(g.run.elites, 1);
});
test('Elites: appear more often in later sectors', () => {
  const chance = (id) => { const g = newGame(); unlockAll(g); g.selectMission(`s${id}m1`); g.start(); g.run.time = 100; return g.eliteChance(); };
  for (let i = 2; i <= 6; i++) assert.ok(chance(i) > chance(i - 1), `sector ${i}`);
  const g = newGame(); g.start(); g.run.time = 0; assert.strictEqual(g.eliteChance(), 0, 'none right at the start');
});
test('Combo: kill chains raise the score multiplier and taking a hit resets it', () => {
  const g = newGame(); g.start(); noSpawns(g);
  let first = 0, later = 0;
  for (let i = 0; i < 14; i++) { const e = g.spawnEnemy('drone', { elite: false }); const s = g.score; g.killEnemy(e); if (i === 0) first = g.score - s; later = g.score - s; }
  assert.ok(later > first, `${later} > ${first}`); assert.strictEqual(g.run.combo, 14); assert.strictEqual(g.run.maxCombo, 14);
  g.player.invuln = 0; g.hitPlayer(1, 'test'); assert.strictEqual(g.run.combo, 0); assert.strictEqual(g.run.maxCombo, 14);
});
test('Damage: a hit costs 1 shield and grants brief invulnerability; the last point destroys the ship', () => {
  const g = newGame(); g.start(); noSpawns(g); g.player.invuln = 0;
  assert.strictEqual(g.hitPlayer(1, 't'), true); assert.strictEqual(g.player.shield, 2); assert.ok(g.player.invuln > 1);
  assert.strictEqual(g.hitPlayer(1, 't'), false, 'invulnerable'); assert.strictEqual(g.player.shield, 2);
  g.player.invuln = 0; g.hitPlayer(1, 't'); g.player.invuln = 0; g.hitPlayer(1, 't');
  assert.ok(g.player.dead && g.player.shield === 0);
  step(g, 2.5); assert.strictEqual(g.state, 'GAMEOVER'); assert.strictEqual(g.lastResult.result, 'lose');
});
test('Power-ups: rapid fire, spread, overshield, health and charge each do their job', () => {
  let g = newGame(); g.start(); noSpawns(g);
  g.shoot(); const normalCd = g.player.cooldown; g.lasers.length = 0; g.player.cooldown = 0;
  g.applyPowerup('rapid'); g.shoot(); assert.ok(g.player.cooldown < normalCd * 0.65 + 1e-9, 'rapid fire shortens the cooldown');
  g = newGame(); g.start(); noSpawns(g); g.shoot(); const n0 = g.lasers.length; g.lasers.length = 0; g.player.cooldown = 0;
  g.applyPowerup('spread'); g.shoot(); assert.strictEqual(g.lasers.length, n0 + 4, 'spread adds a fan of shots');
  g = newGame(); g.start(); noSpawns(g); g.player.invuln = 0; g.applyPowerup('shield');
  assert.strictEqual(g.hitPlayer(1, 't'), false); assert.strictEqual(g.player.shield, 3, 'overshield absorbs the hit');
  g = newGame(); g.start(); noSpawns(g); g.player.shield = 1; g.applyPowerup('health'); assert.strictEqual(g.player.shield, 3, 'repair adds 2');
  g.applyPowerup('health'); assert.strictEqual(g.player.shield, 3, 'never above the maximum');
  g.player.abilityCd = 15; g.applyPowerup('charge'); assert.strictEqual(g.player.abilityCd, 0);
  assert.strictEqual(g.run.powerups, 3, 'each collected power-up is counted for the missions');
});
test('Power-ups: the pickup flies into the ship and applies', () => {
  const g = newGame(); g.start(); noSpawns(g); g.player.shield = 1;
  g.pickups.push({ kind: 'health', x: g.player.x, y: g.player.y, vx: 0, vy: 0, v: 0, age: 0, r: 13, bob: 0 });
  g.update(1 / 60); assert.strictEqual(g.player.shield, 3); assert.strictEqual(g.pickups.length, 0); assert.strictEqual(g.run.powerups, 1);
});
test('Abilities: each ship has a working special ability with a cooldown', () => {
  const use = (id) => { const g = newGame(); g.save.ships.owned = D.SHIPS.map(x => x.id); g.save.ships.selected = id; g.start(); noSpawns(g); g.player.abilityCd = 0; return g; };
  let g = use('vanguard'); g.fireBullet(100, 100, 0, 100); g.fireBullet(300, 100, 0, 100); const e = g.spawnEnemy('gunship', { x: 240, y: 200, elite: false }); const hp = e.hp;
  assert.strictEqual(g.useAbility(), true); g.update(1 / 60);
  assert.strictEqual(g.ebullets.length, 0, 'pulse clears enemy fire'); assert.ok(e.hp < hp, 'and damages enemies');
  assert.strictEqual(g.useAbility(), false, 'cooldown'); assert.ok(g.player.abilityCd > 10);
  g = use('striker'); g.useAbility(); assert.ok(g.player.ab > 3);
  g = use('bulwark'); g.useAbility(); g.player.invuln = 0; assert.strictEqual(g.hitPlayer(1, 't'), false); assert.strictEqual(g.player.shield, 5);
  g = use('nova'); g.useAbility(); assert.strictEqual(g.lasers.filter(l => l.pierce > 50).length, 28);
  g = use('phantom'); g.useAbility(); g.player.invuln = 0; assert.strictEqual(g.hitPlayer(1, 't'), false); assert.ok(g.player.phase > 2);
});
test('Abilities: the ability upgrade shortens the cooldown and boosts power', () => {
  const g = newGame(); g.save.upgrades.ability = 5; g.save.ships.owned = D.SHIPS.map(x => x.id); g.save.ships.selected = 'bulwark'; g.start(); g.player.abilityCd = 0; g.useAbility();
  assert.ok(Math.abs(g.player.abilityCd - 20 * 0.65) < 1e-9); assert.ok(Math.abs(g.player.aegis - 4.5 * 1.5) < 1e-9);
});
test('Hazards: every sector spawns its own signature hazard', () => {
  const eff = {};
  D.SECTORS.forEach(s => {
    const g = newGame(); unlockAll(g); g.selectMission(`s${s.id}m1`); g.start(); noSpawns(g);
    g.spawnHazard();
    eff[s.hazardKey] = [g.enemies.length, g.zones.length, g.wells.length, g.zones.map(z => z.drop || 'bolt').join(''), g.enemies.map(e => e.variant).join('')].join('|');
  });
  assert.strictEqual(new Set(Object.values(eff)).size, 6, JSON.stringify(eff));
  assert.ok(/^0\|0\|1/.test(eff.void) && /icicle/.test(eff.ice) && /bolt/.test(eff.storm) && /debris/.test(eff.debris));
});
test('Hazards: lightning only hurts a ship standing in the marked column', () => {
  const g = newGame(); g.start(); noSpawns(g); g.player.invuln = 0; g.player.x = 100;
  g.addStrike(400, 60, 0.5, '#fff'); step(g, 1); assert.strictEqual(g.player.shield, 3, 'safe outside the column');
  g.addStrike(100, 60, 0.5, '#fff'); step(g, 1); assert.strictEqual(g.player.shield, 2, 'hit inside the column');
});
test('Ice sector: ships slide (slower to change direction) compared with sector 1', () => {
  const slide = (id) => { const g = newGame(); unlockAll(g); g.selectMission(`s${id}m1`); g.start(); noSpawns(g); g.player.x = 100; g.keys.ArrowRight = true; step(g, 0.5); g.keys.ArrowRight = false; const x0 = g.player.x; step(g, 0.5); return g.player.x - x0; };
  assert.ok(slide(5) > slide(1) * 1.5, `${slide(5)} vs ${slide(1)}`);
});

/* ====================================================================== bosses */
test('Bosses: each sector boss enters, becomes vulnerable, and has health that scales with the sector', () => {
  const hps = [];
  D.SECTORS.forEach(s => {
    const g = newGame(); unlockAll(g); g.selectMission(`s${s.id}m3`); g.start(); godMode(g); g.run.time = 33.9; step(g, 0.5);
    assert.ok(g.boss && g.boss.id === s.boss, s.boss); assert.strictEqual(g.boss.state, 'enter');
    step(g, 4); assert.strictEqual(g.boss.state, 'fight'); hps.push(g.boss.maxHp);
  });
  for (let i = 1; i < 6; i++) assert.ok(hps[i] > hps[i - 1]);
});
test('Bosses: every boss has its own attack pattern (different bullet fingerprints)', () => {
  const prints = {};
  D.SECTORS.forEach(s => {
    const g = newGame(); unlockAll(g); g.selectMission(`s${s.id}m3`); g.start(); godMode(g); g.run.time = 33.9;
    const kinds = {}; let zones = 0, beams = 0, adds = 0, maxB = 0;
    for (let i = 0; i < 60 * 24; i++) {
      g.update(1 / 60); g.player.x = 240; g.player.y = 560;
      g.ebullets.forEach(b => { kinds[b.kind + b.color] = 1; });
      zones += g.zones.length ? 1 : 0; beams += g.beams.length ? 1 : 0; adds += g.enemies.length; maxB = Math.max(maxB, g.ebullets.length);
    }
    prints[s.boss] = [Object.keys(kinds).sort().join('+'), zones > 0, beams > 0, adds > 0, g.boss && g.boss.dive ? 1 : 0].join('/');
    assert.ok(maxB > 5, s.boss + ' attacks');
  });
  assert.strictEqual(new Set(Object.values(prints)).size, 6, JSON.stringify(prints));
});
test('Bosses: health bar phases, phase change clears bullets and a repair drops, then the boss can be killed', () => {
  const g = newGame(); unlockAll(g); g.selectMission('s6m3'); g.start(); godMode(g); g.run.time = 33.9; step(g, 5);
  const b = g.boss; assert.strictEqual(b.phase, 1);
  g.fireBullet(100, 100, 0, 10); const w = g.pickups.length;
  g.damageBoss(b.maxHp * 0.4, false); step(g, 0.1); assert.strictEqual(b.phase, 2); assert.ok(g.ebullets.every(x => x.life <= 0 || x.y > -999)); assert.ok(g.pickups.length > w, 'supply drop');
  g.damageBoss(b.maxHp * 0.4, false); step(g, 0.1); assert.strictEqual(b.phase, 3);
  g.damageBoss(1e9, false); assert.strictEqual(b.state, 'dying');
  step(g, 3); assert.strictEqual(g.run.bossKills, 1); assert.ok(g.run.victory || g.state === 'GAMEOVER');
  step(g, 3); assert.strictEqual(g.state, 'GAMEOVER'); assert.strictEqual(g.lastResult.result, 'win');
  assert.ok(g.save.stats.bosses.indexOf('eclipse') >= 0);
});
test('Bosses: the Eclipse has three distinct phases (spiral, beams, gravity well)', () => {
  const g = newGame(); unlockAll(g); g.selectMission('s6m3'); g.start(); godMode(g); g.run.time = 33.9; step(g, 5);
  const b = g.boss; g.damageBoss(b.maxHp * 0.4, false); step(g, 9); assert.ok(b.phase === 2 && g.beams.length >= 0);
  let sawBeam = false; for (let i = 0; i < 60 * 12; i++) { g.update(1 / 60); if (g.beams.length) sawBeam = true; } assert.ok(sawBeam, 'beam in phase 2');
  g.damageBoss(b.hp - b.maxHp * 0.3, false); step(g, 0.2); assert.strictEqual(b.phase, 3); assert.ok(g.wells.length >= 1, 'gravity well in phase 3');
});
test('Bosses: the player can be hit by boss attacks and the boss cannot be hurt while it is still entering', () => {
  const g = newGame(); unlockAll(g); g.selectMission('s1m3'); g.start(); noSpawns(g); g.run.bossAt = 0; g.player.invuln = 0; step(g, 0.1);
  const b = g.boss; assert.strictEqual(b.state, 'enter'); const hp = b.hp;
  g.addShot(b.x, b.y, 0, 0, { dmg: 50, kind: 'bolt', color: '#fff' }); g.update(1 / 60); assert.strictEqual(b.hp, hp);
});

/* ====================================================================== missions, coins, progression */
test('Missions: sectors unlock in order (a locked mission cannot be started)', () => {
  const g = newGame();
  assert.strictEqual(g.selectMission('s1m2').reason, 'locked'); assert.strictEqual(g.selectMission('s2m1').reason, 'locked');
  assert.strictEqual(g.selectMission('s1m1').ok, true); assert.ok(!SAVE.sectorUnlocked(g.save, 2));
  g.handleAction('deploy', 's3m1'); assert.strictEqual(g.save.missions.current, 's1m1'); assert.notStrictEqual(g.state, 'PLAYING');
  winMission(g, 's1m1'); assert.strictEqual(g.selectMission('s1m2').ok, true);
  winMission(g, 's1m2'); winMission(g, 's1m3'); assert.ok(SAVE.sectorUnlocked(g.save, 2)); assert.strictEqual(g.selectMission('s2m1').ok, true);
});
test('Missions: objectives complete the mission, pay the reward once, then 30% on replays', () => {
  const g = newGame(); freshStorage();
  let r = winMission(g, 's1m1');
  assert.strictEqual(r.result, 'win'); assert.strictEqual(r.missionReward, 60); assert.ok(r.firstClear);
  const coinsAfterFirst = g.save.coins; assert.ok(coinsAfterFirst >= 60);
  r = winMission(g, 's1m1'); assert.strictEqual(r.missionReward, Math.max(10, Math.round(60 * 0.3))); assert.ok(!r.firstClear);
});
test('Missions: the bonus objective pays in full once, and only when met', () => {
  const g = newGame();
  let r = winMission(g, 's1m1'); assert.ok(r.bonusDone && r.bonusReward === 25, 'no damage taken so the bonus is met');
  g.selectMission('s1m1'); g.start(); noSpawns(g); g.run.kills = 55; g.run.damageTaken = 5; godMode(g); step(g, 3);
  assert.ok(!g.lastResult.bonusDone && g.lastResult.bonusReward === 0, 'too many hits: no bonus');
  g.selectMission('s1m1'); g.start(); noSpawns(g); g.run.kills = 55; godMode(g); step(g, 3); assert.strictEqual(g.lastResult.bonusReward, Math.round(25 * 0.3));
});
test('Missions: every objective type can actually be completed', () => {
  const types = {};
  D.MISSIONS.forEach(m => { types[m.stat] = m; });
  Object.keys(types).forEach(stat => {
    const g = newGame(); unlockAll(g); g.save.missions.progress[types[stat].id].done = false; const r = winMission(g, types[stat].id);
    assert.strictEqual(r.result, 'win', stat);
  });
});
test('Missions: a failed mission earns no reward, is not cleared, but keeps the coins picked up', () => {
  const g = newGame(); D.ACHIEVEMENTS.forEach(a => { g.save.achievements[a.id] = 1; }); g.start(); noSpawns(g); g.run.coins = 33; g.run.kills = 5; g.player.invuln = 0; g.player.shield = 1; g.hitPlayer(1, 't'); step(g, 3);
  assert.strictEqual(g.lastResult.result, 'lose'); assert.strictEqual(g.lastResult.missionReward, 0);
  assert.ok(!(g.save.missions.progress.s1m1 || {}).done); assert.strictEqual(g.save.coins, 33 + g.lastResult.scoreBonus);
  assert.strictEqual(g.save.missions.progress.s1m1.plays, 1);
});
test('Coins: earned by actually playing (kills drop coins that are collected and banked)', () => {
  const g = newGame(); g.start(); noSpawns(g); godMode(g);
  g.player.x = 240; g.player.y = 500; const e = g.spawnEnemy('carrier', { x: 240, y: 300, elite: false }); g.killEnemy(e);
  assert.ok(g.pickups.filter(p => p.kind === 'coin').length > 0, 'coins drop');
  g.pickups.forEach(p => { p.x = g.player.x; p.y = g.player.y; p.age = 1; }); g.update(1 / 60);
  assert.ok(g.run.coins >= 10, 'carrier pays at least 10: ' + g.run.coins);
  const before = g.save.coins; g.run.victory = false; g.endRun('lose');
  assert.ok(g.save.coins >= before + 10, 'coins are banked at the end of the run');
  assert.strictEqual(g.save.stats.coinsEarned, g.lastResult.totalCoins);
});
test('Coins: coins magnetise toward a nearby ship, and sector 3 pays more', () => {
  const g = newGame(); g.start(); noSpawns(g); godMode(g); g.player.x = 240; g.player.y = 500;
  g.pickups.push({ kind: 'coin', x: 300, y: 500, vx: 0, vy: 0, v: 1, age: 1, r: 9 }); const d0 = Math.abs(g.pickups[0].x - 240);
  g.update(1 / 60); assert.ok(g.pickups.length === 0 || Math.abs(g.pickups[0].x - 240) < d0);
  const pay = (id) => { const h = newGame(); unlockAll(h); h.selectMission(`s${id}m1`); h.start(); noSpawns(h); let t = 0; for (let i = 0; i < 300; i++) { const e = h.spawnEnemy('gunship', { elite: false }); h.killEnemy(e); h.pickups.forEach(p => { t += p.v; }); h.pickups.length = 0; h.enemies.length = 0; } return t; };
  assert.ok(pay(3) > pay(2) * 1.2, `${pay(3)} vs ${pay(2)}`);
});
test('Coins: the full economy is reachable (rewards vs prices)', () => {
  const firstClear = D.MISSIONS.reduce((a, m) => a + m.reward + m.bonus.reward, 0);
  const sink = D.SHIPS.reduce((a, s) => a + s.cost, 0) + D.UPGRADES.reduce((a, u) => a + u.costs.reduce((x, y) => x + y, 0), 0);
  assert.ok(firstClear > 3000 && sink > firstClear, 'a campaign pass does not buy everything, so replays and free flight matter');
  assert.ok(D.ACHIEVEMENTS.reduce((a, x) => a + x.reward, 0) > 1500);
});
test('Achievements: unlock once, pay coins once, and survive reloads', () => {
  const store = freshStorage(); const g = newGame(null);
  g.start(); noSpawns(g); const e = g.spawnEnemy('drone', { elite: false }); g.killEnemy(e); g.endRun('lose');
  assert.ok(g.save.achievements.first_blood, 'first blood'); assert.ok(g.lastResult.fresh.some(a => a.id === 'first_blood'));
  const coins = g.save.coins; assert.strictEqual(g.checkAchievements().length, 0); assert.strictEqual(g.save.coins, coins, 'no double payout');
  assert.ok(newGame(null).save.achievements.first_blood);
  g.save.coins = 3500; g.buyShip('striker'); g.save.coins = 3500; g.buyShip('bulwark');
  assert.ok(g.save.achievements.collector, 'owning 3 ships');
  assert.ok(/Medals unlocked|First Blood/.test(g.milestonesHtml()));
});
test('Persistence: coins, ships, selection, upgrades, missions and medals all survive a reload', () => {
  freshStorage(); let g = newGame(null);
  g.save.coins = 5000; g.buyShip('striker'); g.buyShip('bulwark'); g.selectShip('striker'); g.buyUpgrade('damage'); g.buyUpgrade('damage'); g.buyUpgrade('shield');
  winMission(g, 's1m1'); winMission(g, 's1m2'); const snap = JSON.stringify(g.save); g.destroy();
  const h = newGame(null);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(h.save)), JSON.parse(snap));
  assert.strictEqual(h.save.ships.selected, 'striker'); assert.ok(h.owns('bulwark') && !h.owns('nova'));
  assert.deepStrictEqual([h.upgradeLevel('damage'), h.upgradeLevel('shield')], [2, 1]);
  assert.ok(h.save.missions.progress.s1m1.done && h.save.missions.progress.s1m2.done); assert.strictEqual(h.save.missions.current, 's1m3');
  assert.strictEqual(h.getStats().maxShield, 2 + 1, 'the Striker keeps its base shield plus the upgrade');
});
test('Persistence: Free Flight never overwrites the campaign pointer in storage', () => {
  const store = freshStorage(); const g = newGame(null); unlockAll(g); g.save.missions.current = 's2m1';
  g.handleAction('deploy-free', '2'); assert.strictEqual(g.state, 'PLAYING'); assert.strictEqual(g.mission.id, 'free');
  g.run.coins = 5; g.pause(); assert.strictEqual(JSON.parse(store.arcade_space_save_v1).missions.current, 's2m1');
  g.resume(); noSpawns(g); g.player.invuln = 0; g.player.shield = 1; g.hitPlayer(1, 't'); step(g, 3);
  assert.strictEqual(g.save.missions.current, 's2m1'); assert.strictEqual(g.lastResult.mission.id, 'free'); assert.strictEqual(g.lastResult.missionReward, 0);
});
test('Difficulty: later sectors have tougher enemies, faster waves and more elites', () => {
  const stat = (id) => { const g = newGame(); unlockAll(g); g.selectMission(`s${id}m2`); g.start(); const hp = g.spawnEnemy('gunship', { elite: false }).hp; return { hp, spawn: g.sector.spawn * g.diff.spawn, fire: g.diff.fire }; };
  for (let i = 2; i <= 6; i++) { const a = stat(i - 1), b = stat(i); assert.ok(b.hp > a.hp, 'hp'); assert.ok(b.spawn < a.spawn, 'spawn'); assert.ok(b.fire >= a.fire, 'fire'); }
  const g = newGame(); g.start(); const early = g.diff.hp; g.selectMission('s1m1'); assert.ok(early > 0);
});
test('Difficulty: waves speed up and enemies toughen as a single run goes on', () => {
  const g = newGame(); g.start(); const hp0 = g.spawnEnemy('gunship', { elite: false }).hp; g.run.time = 300; const hp1 = g.spawnEnemy('gunship', { elite: false }).hp;
  assert.ok(hp1 >= hp0);
  const gap = (t) => { const h = newGame(); h.start(); h.run.time = t; h.run.spawnTimer = 0; h.director(0.001); return h.run.spawnTimer; };
  seedRandom(5); const early = gap(0); seedRandom(5); const late = gap(250); assert.ok(late < early);
});

/* ====================================================================== controls */
test('Controls: keyboard moves and fires, Shift/E use the ability, arrows do not scroll the page', () => {
  const g = newGame(); g.start(); noSpawns(g); godMode(g); g.player.abilityCd = 0; g.player.x = 240;
  let prevented = 0;
  fake.pressKey('ArrowLeft'); fake.pressKey(' ');
  g.handleKeyDown({ key: 'ArrowLeft', repeat: false, preventDefault() { prevented++; } });
  step(g, 0.3); assert.ok(g.player.x < 240); assert.ok(g.run.shots > 0); assert.ok(prevented >= 1);
  g.handleKeyUp({ key: 'ArrowLeft' }); g.handleKeyUp({ key: ' ' });
  g.handleKeyDown({ key: 'Shift', repeat: false, preventDefault() {} }); assert.ok(g.player.abilityCd > 0, 'Shift triggers the ability');
  const cd = g.player.abilityCd; g.handleKeyDown({ key: 'Shift', repeat: true, preventDefault() {} }); assert.strictEqual(g.player.abilityCd, cd);
});
test('Controls: touch drag moves the ship relative to the finger and fires automatically', () => {
  const g = newGame(); g.start(); noSpawns(g); godMode(g); g.player.x = 240; g.player.y = 500;
  const rect = g.canvas.getBoundingClientRect();
  const at = (x, y) => ({ pointerType: 'touch', pointerId: 1, clientX: rect.left + x * (rect.width / 480), clientY: rect.top + y * (rect.height / 640), preventDefault() {} });
  g.onPointerDown(at(100, 300)); g.onPointerMove(at(160, 250));      // finger moves right and up by 60 / 50
  step(g, 1);
  assert.ok(g.player.x > 270 && g.player.x < 310, 'ship follows the finger movement, not its position: ' + g.player.x);
  assert.ok(g.player.y < 500); assert.ok(g.run.shots > 0, 'auto-fire while touching');
  g.onPointerUp({}); const shots = g.run.shots; step(g, 1); assert.strictEqual(g.run.shots, shots, 'stops when the finger lifts');
});
test('Controls: on-screen Ability button works, mouse hover flies and click fires', () => {
  let g = newGame(); g.start(); noSpawns(g); godMode(g); g.player.abilityCd = 0;
  g.btnAbility.dispatch('pointerdown', { preventDefault() {} }); assert.ok(g.player.abilityCd > 10, 'the on-screen Ability button fires the ability');
  g.touchFire = false; g.btnFire.dispatch('pointerdown', { preventDefault() {} }); assert.strictEqual(g.touchFire, true, 'FIRE is held while pressed');
  g.btnFire.dispatch('pointerup', {}); assert.strictEqual(g.touchFire, false);
  g = newGame(); g.start(); noSpawns(g); godMode(g); const rect = g.canvas.getBoundingClientRect();
  g.onPointerMove({ pointerType: 'mouse', clientX: rect.left + 100 * rect.width / 480, clientY: rect.top + 500 * rect.height / 640 });
  step(g, 1); assert.ok(Math.abs(g.player.x - 100) < 10); g.onPointerDown({ pointerType: 'mouse', pointerId: 1, clientX: rect.left, clientY: rect.top, preventDefault() {} });
  step(g, 0.5); assert.ok(g.run.shots > 0);
});
test('Controls: pause keys only act during a run, and Resume does not restart', () => {
  const g = newGame(); fake.pressKey('p'); assert.strictEqual(g.state, 'MENU');
  g.start(); g.score = 55; fake.pressKey('p'); assert.strictEqual(g.state, 'PAUSED'); fake.pressKey('Escape'); assert.strictEqual(g.state, 'PLAYING'); assert.strictEqual(g.score, 55);
  g.handleKeyDown({ key: 'p', repeat: true }); assert.strictEqual(g.state, 'PLAYING', 'a held key does not toggle');
});

/* ====================================================================== UI + rendering */
test('UI: every screen renders clean HTML (no undefined / NaN) and navigation works', () => {
  const g = newGame(); unlockAll(g); g.save.coins = 123456;
  ['home', 'hangar', 'upgrades', 'missions', 'milestones'].forEach(name => {
    g.menuNav(name); const html = g.screenEl.innerHTML;
    assert.ok(html.length > 400, name); assert.ok(!/undefined|NaN|\[object/.test(html), name + ' has bad text');
    assert.strictEqual(g.screen, name); assert.ok(/ss-tabs/.test(html));
  });
  D.SHIPS.forEach(s => { g.hangarView = s.id; assert.ok(!/undefined|NaN/.test(g.hangarHtml()), s.id); });
  D.SECTORS.forEach(s => { g.sectorView = s.id; const html = g.missionsHtml(); assert.ok(html.indexOf(s.name) >= 0 && !/undefined|NaN/.test(html)); });
});
test('UI: the mission board shows objectives, rewards, bonus, locked and cleared states', () => {
  const g = newGame(); g.sectorView = 1; let html = g.missionsHtml();
  assert.ok(/DEPLOY/.test(html) && /LOCKED/.test(html) && /AVAILABLE/.test(html) && /Defeat the previous|Clear the previous/.test(html) && /Bonus:/.test(html) && /Free flight/.test(html));
  assert.ok(/ss-chip locked" data-act="sector" data-id="2" disabled/.test(html), 'sector 2 is locked');
  winMission(g, 's1m1'); g.menuNav('missions'); html = g.screenEl.innerHTML; assert.ok(/CLEARED/.test(html) && /REPLAY/.test(html));
});
test('UI: results screen itemises the coin breakdown and the dock offers the right next step', () => {
  const g = newGame(); winMission(g, 's1m1');
  assert.strictEqual(g.state, 'GAMEOVER'); const html = g.screenEl.innerHTML;
  ['MISSION COMPLETE', 'Coins picked up', 'Mission reward', 'Score bonus', 'Total earned', 'Accuracy', 'Best combo'].forEach(t => assert.ok(html.indexOf(t) >= 0, t));
  assert.strictEqual(g.btnPlay.textContent, 'NEXT MISSION');
  g.primaryAction(); assert.strictEqual(g.state, 'PLAYING'); assert.strictEqual(g.mission.id, 's1m2');
  g.run.coins = 0; g.player.invuln = 0; g.player.shield = 1; noSpawns(g); g.hitPlayer(1, 't'); step(g, 3);
  assert.ok(/MISSION FAILED/.test(g.screenEl.innerHTML)); assert.strictEqual(g.btnPlay.textContent, 'RETRY MISSION');
  g.primaryAction(); assert.strictEqual(g.mission.id, 's1m2', 'retry replays the same mission');
});
test('UI: the dock launches the mission shown, and menus never leave a run running', () => {
  const g = newGame(); assert.ok(/LAUNCH 1-1/.test(g.btnPlay.textContent)); g.menuNav('hangar'); assert.strictEqual(g.state, 'MENU');
  g.primaryAction(); assert.strictEqual(g.state, 'PLAYING'); assert.ok(/ss-mode-play/.test(g.root.className));
  g.pause(); assert.ok(/ss-mode-overlay/.test(g.root.className)); g.abortRun(); assert.ok(/ss-mode-menu/.test(g.root.className));
});
test('Rendering: every state draws without errors (boss phases, hazards, beams, wells, effects)', () => {
  const g = newGame(); unlockAll(g);
  D.SECTORS.forEach(s => {
    g.selectMission(`s${s.id}m3`); g.start(); godMode(g); g.run.time = 33.9; g.keys[' '] = true;
    for (let i = 0; i < 60 * 14; i++) { g.update(1 / 60); if (i % 20 === 0) g.render(); }
    g.spawnHazard(); g.explode(200, 200, '#fff', 3); g.addStrike(100, 40, 0.3, '#fff'); g.wells.push({ x: 200, y: 200, r: 20, pull: 150, t: 0, dur: 5 });
    g.beams.push({ ang: 1, spin: 0.5, w: 30, t: 2, warn: 1, dur: 3, boss: false, ox: 240, oy: 100 });
    g.render(); g.damageBoss(g.boss.maxHp, false); step(g, 1); g.render();
  });
  g.selectMission('free'); g.start(); g.player.dead = true; g.render(); g.pause(); g.render();
});
test('Rendering: art exists for every ship, enemy class and boss', () => {
  const A = fs.readFileSync(path.join(ROOT, 'js/games/space-shooter.js'), 'utf8');
  D.SHIPS.forEach(s => assert.ok(new RegExp(`${s.id}: draw`).test(A), s.id));
  assert.ok(/SHIP_DRAW = \{ vanguard: drawVanguard, striker: drawStriker, bulwark: drawBulwark, nova: drawNova, phantom: drawPhantom \}/.test(A));
  Object.keys(D.BOSSES).forEach(b => assert.ok(new RegExp(`${b}: boss`).test(A), b));
});

/* ====================================================================== memory / lifecycle */
test('Memory: a long Free Flight keeps every pool bounded and leaks no listeners', () => {
  const g = newGame(); unlockAll(g); g.save.ships.selected = 'phantom'; g.save.ships.owned = D.SHIPS.map(s => s.id); g.save.missions.current = 'free'; g.freeSectorId = 6;
  g.start(); godMode(g); g.keys[' '] = true; let max = { p: 0, e: 0, b: 0, l: 0, k: 0, t: 0 };
  for (let i = 0; i < 60 * 60 * 4; i++) {
    g.player.x = 240 + Math.sin(i / 40) * 200; g.update(1 / 60);
    if (g.player.abilityCd <= 0) g.useAbility();
    max.p = Math.max(max.p, g.particles.length); max.e = Math.max(max.e, g.enemies.length); max.b = Math.max(max.b, g.ebullets.length);
    max.l = Math.max(max.l, g.lasers.length); max.k = Math.max(max.k, g.pickups.length); max.t = Math.max(max.t, g.texts.length);
  }
  assert.ok(max.p <= 360 && max.e <= 40 && max.b <= 320 && max.l <= 140 && max.k <= 125 && max.t <= 18, JSON.stringify(max));
  assert.ok(g.fxFree.length < 400, 'particle pool is recycled: ' + g.fxFree.length);
  assert.ok(g.rings.length <= 24);
  g.destroy(); assert.strictEqual(fake.keydownHandlerCount(), 0, 'listeners removed');
  g.update(1); g.handleKeyDown({ key: 'p' }); assert.strictEqual(g.state, 'PAUSED', 'a destroyed game ignores input');
});
test('Memory: restarting many times does not grow state', () => {
  const g = newGame(); for (let i = 0; i < 40; i++) { g.start(); step(g, 0.5); }
  assert.ok(g.enemies.length < 12 && g.lasers.length < 60 && g.banners.length <= 3);
  g.destroy();
});

/* ====================================================================== site integration */
test('Site: privacy policy documents the new storage key and the legacy one', () => {
  const html = fs.readFileSync(path.join(ROOT, 'privacy-policy.html'), 'utf8');
  assert.ok(html.indexOf('arcade_space_save_v1') >= 0 && html.indexOf('arcade_space_highscore') >= 0);
});
test('Site: the guide states the same ship prices, mission rewards and boss names as the game', () => {
  const html = fs.readFileSync(path.join(ROOT, 'play/space-shooter.html'), 'utf8').replace(/&amp;/g, '&');
  const n = (v) => Number(v).toLocaleString('en-US');
  D.SHIPS.filter(s => s.cost).forEach(s => assert.ok(html.indexOf(`${n(s.cost)} coins`) >= 0, s.name));
  D.SHIPS.forEach(s => assert.ok(html.indexOf(s.ability.name) >= 0, s.ability.name));
  D.MISSIONS.forEach(m => { assert.ok(html.indexOf(m.title) >= 0, m.title); assert.ok(new RegExp(`<td>${n(m.reward)}</td>`).test(html), m.title + ' reward'); });
  Object.values(D.BOSSES).forEach(b => assert.ok(html.indexOf(b.name) >= 0, b.name));
  D.UPGRADES.forEach(u => assert.ok(html.indexOf(u.costs.map(n).join(' / ')) >= 0, u.id));
  D.ACHIEVEMENTS.forEach(a => assert.ok(html.indexOf(a.name) >= 0, a.name));
  assert.ok(/shield of 3 points/i.test(html));
});
test('Site: game and guide URLs, catalog entry and the other nine games are intact', () => {
  const arcade = fs.readFileSync(path.join(ROOT, 'js/arcade.js'), 'utf8');
  assert.ok(/id: 'space-shooter'/.test(arcade) && /scoreKey: 'arcade_space_highscore'/.test(arcade) && /new SpaceShooterGame\(/.test(arcade));
  assert.ok(fs.existsSync(path.join(ROOT, 'game/space-shooter.html')) && fs.existsSync(path.join(ROOT, 'play/space-shooter.html')));
  const count = (arcade.match(/\{ id: '[a-z0-9-]+', slug: '[a-z0-9-]+', title:/g) || []).length;
  assert.strictEqual(count, 10, `catalog lists ${count} games (Space Shooter plus the other nine)`);
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.indexOf('/game/space-shooter') >= 0 && sitemap.indexOf('/play/space-shooter') >= 0);
});

/* ====================================================================== real browser (optional) */
let playwright = null;
for (const name of [process.env.PLAYWRIGHT_MODULE, 'playwright'].filter(Boolean)) { try { playwright = require(name); break; } catch (e) { /* next */ } }

async function browserTests() {
  if (!playwright) { console.log('  [SKIP] real-browser Space Shooter tests (Playwright is not installed)'); return; }
  const { start } = require('./helpers/static-server');
  const { srv, url } = await start(ROOT);
  let browser;
  try { browser = await playwright.chromium.launch(); } catch (e) { console.log('  [SKIP] real-browser Space Shooter tests (no browser available)'); srv.close(); return; }
  async function page(opts, init) {
    const ctx = await browser.newContext(opts || { viewport: { width: 1100, height: 900 } });
    if (init) await ctx.addInitScript(init.fn, init.arg);
    const p = await ctx.newPage(); const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '/game/space-shooter'); await p.waitForSelector('#space-btn-play');
    return { p, ctx, errors };
  }
  async function btest(name, fn) {
    total++;
    try { await fn(); console.log(`  [PASS] ${name}`); passed++; }
    catch (err) { console.error(`  [FAIL] ${name}`); console.error(err); process.exitCode = 1; }
  }
  const seed = (extra) => ({ fn: (s) => { if (!localStorage.getItem('__seeded')) { Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); localStorage.setItem('__seeded', '1'); } }, arg: extra });
  const save = (o) => JSON.stringify(Object.assign({ version: 1, coins: 0, ships: { owned: ['vanguard'], selected: 'vanguard' }, upgrades: { damage: 0, fireRate: 0, shield: 0, speed: 0, ability: 0 }, missions: { current: 's1m1', progress: {} }, achievements: {}, stats: {} }, o));

  await btest('Browser: locked ships cannot be equipped, buying works, and everything survives a reload', async () => {
    const { p, ctx, errors } = await page(null, seed({ arcade_space_save_v1: save({ coins: 2100 }) }));
    await p.click('.ss-tab[data-id="hangar"]');
    await p.click('.ss-shipcard[data-id="nova"]');
    assert.strictEqual(await p.locator('.ss-actions .ss-btn.locked').count(), 1, 'nova is locked: disabled button');
    assert.strictEqual(await p.locator('.ss-actions [data-act="equip"]').count(), 0);
    assert.strictEqual(await p.evaluate(() => window.ArcadePortal.activeGameInstance.save.ships.selected), 'vanguard');
    await p.click('.ss-shipcard[data-id="bulwark"]'); await p.click('[data-act="buy-ship"]');
    assert.ok(/EQUIPPED/.test(await p.locator('.ss-actions').innerText()));
    assert.strictEqual(JSON.parse(await p.evaluate(() => localStorage.getItem('arcade_space_save_v1'))).coins, 600);
    await p.click('.ss-tab[data-id="upgrades"]'); await p.click('[data-act="buy-up"][data-id="shield"]');
    await p.reload(); await p.waitForSelector('#space-btn-play');
    const s = await p.evaluate(() => JSON.parse(localStorage.getItem('arcade_space_save_v1')));
    assert.deepStrictEqual([s.ships.selected, s.ships.owned.length, s.upgrades.shield, s.coins], ['bulwark', 2, 1, 450]);
    assert.strictEqual(await p.evaluate(() => window.ArcadePortal.activeGameInstance.player.maxShield === undefined ? 0 : window.ArcadePortal.activeGameInstance.getStats().maxShield), 6);
    assert.deepStrictEqual(errors, []); await ctx.close();
  });
  await btest('Browser: pause really freezes the game in real time and resume continues it', async () => {
    const { p, ctx, errors } = await page();
    await p.click('#space-btn-play'); await p.keyboard.down(' '); await p.waitForTimeout(900);
    await p.click('#space-btn-pause');
    const snap = () => p.evaluate(() => { const g = window.ArcadePortal.activeGameInstance; return JSON.stringify([g.time, g.score, g.enemies.map(e => [e.x, e.y]), g.lasers.map(l => [l.x, l.y]), g.particles.length, g.stars.map(s => s.y).slice(0, 5), g.shake]); });
    const a = await snap(); await p.waitForTimeout(1600); const b = await snap();
    assert.strictEqual(a, b, 'all gameplay is frozen while paused');
    assert.strictEqual(await p.evaluate(() => window.ArcadePortal.activeGameInstance.state), 'PAUSED');
    await p.click('#space-btn-play'); await p.waitForTimeout(400);
    assert.strictEqual(await p.evaluate(() => window.ArcadePortal.activeGameInstance.state), 'PLAYING');
    assert.ok(JSON.parse(await snap())[0] > JSON.parse(a)[0], 'time advances again after resume');
    await p.keyboard.up(' '); assert.deepStrictEqual(errors, []); await ctx.close();
  });
  await btest('Browser: a corrupted save shows a notice, keeps the high score and the game still runs', async () => {
    const { p, ctx, errors } = await page(null, seed({ arcade_space_save_v1: '{broken', arcade_space_highscore: '8800' }));
    assert.ok(/could not be read/.test(await p.locator('.ss-notice').first().innerText()));
    assert.strictEqual(await p.evaluate(() => localStorage.getItem('arcade_space_highscore')), '8800');
    await p.click('#space-btn-play'); await p.waitForTimeout(500);
    assert.strictEqual(await p.evaluate(() => window.ArcadePortal.activeGameInstance.state), 'PLAYING'); assert.deepStrictEqual(errors, []); await ctx.close();
  });
  await btest('Browser: every ship preview actually draws on its canvas', async () => {
    const { p, ctx } = await page(); await p.click('.ss-tab[data-id="hangar"]');
    for (const id of ['vanguard', 'striker', 'bulwark', 'nova', 'phantom']) {
      await p.click(`.ss-shipcard[data-id="${id}"]`); await p.waitForTimeout(120);
      const drawn = await p.evaluate(() => { const c = document.querySelector('#space-preview'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; });
      assert.ok(drawn > 4000, `${id} preview drew ${drawn} pixels`);
    }
    await ctx.close();
  });
  await btest('Browser: phone layout has no sideways scroll, big touch targets, and on-screen controls during play', async () => {
    const { p, ctx, errors } = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    for (const tab of ['home', 'hangar', 'upgrades', 'missions', 'milestones']) {
      await p.tap(`.ss-tab[data-id="${tab}"]`); await p.waitForTimeout(100);
      const m = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, inner: document.querySelector('.ss-screen').scrollWidth - document.querySelector('.ss-screen').clientWidth }));
      assert.ok(m.over <= 1 && m.inner <= 1, `${tab} overflows sideways: ${JSON.stringify(m)}`);
    }
    const sizes = await p.evaluate(() => [...document.querySelectorAll('.ss-tab, #space-btn-play')].map(e => Math.round(e.getBoundingClientRect().height)));
    assert.ok(sizes.every(h => h >= 44), 'touch targets: ' + sizes);
    await p.tap('.ss-tab[data-id="home"]'); await p.tap('#space-btn-play'); await p.waitForTimeout(500);
    const vis = await p.evaluate(() => ['#sp-btn-fire', '#sp-btn-ability'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), getComputedStyle(document.querySelector(s)).display]; }));
    assert.ok(vis.every(v => v[0] >= 100 && v[1] >= 56 && v[2] !== 'none'), JSON.stringify(vis));
    const box = await p.locator('#space-canvas').boundingBox(); assert.ok(box.width <= 390 && box.height > 300);
    await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(300);
    assert.deepStrictEqual(errors, []); await ctx.close();
  });
  await btest('Browser: Space Shooter leaves the other games and the legacy high score key alone', async () => {
    const { p, ctx } = await page(null, seed({ arcade_space_highscore: '1234', arcade_snake_highscore: '55' }));
    await p.click('#space-btn-play'); await p.waitForTimeout(300); await p.reload(); await p.waitForSelector('#space-btn-play');
    const v = await p.evaluate(() => [localStorage.getItem('arcade_space_highscore'), localStorage.getItem('arcade_snake_highscore')]);
    assert.deepStrictEqual(v, ['1234', '55']);
    for (const slug of ['neon-snake', 'brick-breaker', 'fruit-slice', 'endless-runner']) {
      const r = await p.goto(url + '/game/' + slug); assert.ok(r.ok(), slug);
    }
    await ctx.close();
  });
  await browser.close(); srv.close();
}

browserTests().then(() => {
  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed !== total) process.exitCode = 1;
}).catch(err => { console.error(err); process.exit(1); });
