/**
 * Space Shooter: premium campaign edition.
 *
 * Layout of this file (kept in one file on purpose, the site tests pin the script list):
 *   1. SpaceShooterData   static game data: ships, upgrades, enemies, bosses, sectors, missions, achievements
 *   2. SpaceShooterSave   versioned, validated persistence (arcade_space_save_v1 + arcade_space_highscore)
 *   3. SpaceShooterArt    canvas drawing: ship / enemy / boss sprites and cached sprite sheets
 *   4. SpaceShooterGame   engine (fixed game clock, combat, director), DOM screens, input
 *
 * Every gameplay timer runs on the game clock (seconds advanced only while PLAYING), so pausing
 * freezes cooldowns, power-ups, spawns, boss patterns, particles and screen shake together.
 */

/* ========================================================================== 1. DATA */
const SpaceShooterData = (() => {
  const SHIPS = [
    {
      id: 'vanguard', name: 'Vanguard', cost: 0, role: 'All-rounder',
      blurb: 'The standard-issue interceptor. Forgiving, balanced and reliable.',
      colors: { hull: '#5aa9ff', dark: '#1c3a78', accent: '#9be7ff', glow: '#4fc3ff' },
      shield: 3, speed: 300, fireRate: 4.2, damage: 1, weapon: 'Twin pulse cannons',
      ability: { id: 'pulse', name: 'Pulse Wave', cooldown: 18, desc: 'Releases a shockwave that wipes enemy fire and damages everything on screen.' }
    },
    {
      id: 'striker', name: 'Striker', cost: 500, role: 'Speed demon',
      blurb: 'A swept-wing sprinter with rapid tracers. Fragile, but very hard to hit.',
      colors: { hull: '#ff6a4d', dark: '#6b1d16', accent: '#ffd36b', glow: '#ff8a3d' },
      shield: 2, speed: 370, fireRate: 7.2, damage: 1.0, weapon: 'Alternating rapid tracers',
      ability: { id: 'afterburner', name: 'Afterburner', cooldown: 14, desc: 'Boosts speed and fire rate for 4 seconds and shrugs off ramming damage.' }
    },
    {
      id: 'bulwark', name: 'Bulwark', cost: 1500, role: 'Heavy tank',
      blurb: 'An armoured gunship with a heavy plasma cannon and extra shield plating.',
      colors: { hull: '#6fcf6a', dark: '#1d4a2a', accent: '#d8ff8a', glow: '#7dff7a' },
      shield: 5, speed: 235, fireRate: 3.0, damage: 1.2, weapon: 'Heavy plasma slugs with splash',
      ability: { id: 'aegis', name: 'Aegis Barrier', cooldown: 20, desc: 'Raises a barrier for 4.5 seconds that absorbs every hit and reflects bolts.' }
    },
    {
      id: 'nova', name: 'Nova', cost: 3500, role: 'Precision caster',
      blurb: 'A plasma lance that pierces armour, plus homing missiles for crowded skies.',
      colors: { hull: '#b985ff', dark: '#3a1d7a', accent: '#ffb3f5', glow: '#c779ff' },
      shield: 3, speed: 295, fireRate: 3.6, damage: 1.1, weapon: 'Piercing lance + homing missiles',
      ability: { id: 'novaburst', name: 'Nova Burst', cooldown: 16, desc: 'Fires a ring of piercing plasma in every direction.' }
    },
    {
      id: 'phantom', name: 'Phantom', cost: 7000, role: 'Stealth striker',
      blurb: 'A cloaking prototype. Needle beams, critical hits and the ability to phase out of danger.',
      colors: { hull: '#35e0d2', dark: '#0d3d49', accent: '#e8fffb', glow: '#52fff0' },
      shield: 3, speed: 345, fireRate: 4.6, damage: 1.15, weapon: 'Needle fan, 18% critical hits',
      ability: { id: 'phase', name: 'Phase Cloak', cooldown: 17, desc: 'Phases out for 3 seconds: nothing can hit you and your shots deal 60% more damage.' }
    }
  ];

  const UPGRADES = [
    { id: 'damage', name: 'Weapon Damage', icon: '✦', max: 5, costs: [120, 240, 420, 680, 1000],
      desc: (l) => `+${l * 12}% weapon damage` },
    { id: 'fireRate', name: 'Fire Rate', icon: '≫', max: 5, costs: [110, 220, 380, 600, 900],
      desc: (l) => `+${l * 8}% shots per second` },
    { id: 'shield', name: 'Shield Strength', icon: '⬡', max: 5, costs: [150, 300, 520, 820, 1200],
      desc: (l) => `+${[0, 1, 1, 2, 2, 3][l]} max shield, ${l >= 3 ? 'auto-repair ' + (l >= 5 ? 'every 8s' : 'every 12s') : 'no auto-repair yet'}` },
    { id: 'speed', name: 'Movement Speed', icon: '➤', max: 5, costs: [100, 200, 340, 540, 800],
      desc: (l) => `+${l * 6}% ship speed` },
    { id: 'ability', name: 'Special Ability', icon: '★', max: 5, costs: [160, 320, 560, 880, 1300],
      desc: (l) => `-${l * 7}% cooldown, +${l * 10}% ability power` }
  ];

  // Enemy classes. radius = collision radius, hp = base health, score/coins = rewards.
  const ENEMIES = {
    drone:    { id: 'drone', name: 'Drone', radius: 14, hp: 1, score: 10, coins: 1, speed: 120, color: '#ff5a7a', behaviour: 'Dives straight down in a gentle wave.' },
    weaver:   { id: 'weaver', name: 'Weaver', radius: 15, hp: 2, score: 25, coins: 2, speed: 100, color: '#ffb347', behaviour: 'Swoops side to side and fires aimed shots.' },
    kamikaze: { id: 'kamikaze', name: 'Kamikaze', radius: 13, hp: 1, score: 20, coins: 2, speed: 150, color: '#ff3d3d', behaviour: 'Locks on and accelerates into your ship.' },
    gunship:  { id: 'gunship', name: 'Gunship', radius: 22, hp: 5, score: 50, coins: 4, speed: 55, color: '#ff8a3d', behaviour: 'Hovers and fires three-shot spreads.' },
    sniper:   { id: 'sniper', name: 'Sniper', radius: 16, hp: 3, score: 45, coins: 4, speed: 70, color: '#c58bff', behaviour: 'Charges a telegraphed beam, then fires a fast bolt.' },
    asteroid: { id: 'asteroid', name: 'Asteroid', radius: 24, hp: 4, score: 15, coins: 1, speed: 85, color: '#a39382', behaviour: 'Tumbles down and splits into fragments.' },
    carrier:  { id: 'carrier', name: 'Carrier', radius: 30, hp: 14, score: 120, coins: 10, speed: 42, color: '#6fd0ff', behaviour: 'Launches waves of drones while it hovers.' }
  };

  // Six sectors. pool = enemy class -> [weight, unlock time in seconds]. Each sector has a signature hazard.
  const SECTORS = [
    { id: 1, name: 'Dust Belt', tag: 'The shakedown run', hazard: 'Drifting rock fields', hazardKey: 'rocks',
      desc: 'An old mining belt full of tumbling rock. Learn the ropes.',
      bg: ['#0a1020', '#151d3a', '#2a2540'], star: '#cfe3ff', accent: '#ffb86b',
      pool: { drone: [10, 0], asteroid: [7, 0], weaver: [3, 25], gunship: [1.5, 50] },
      spawn: 1.25, hp: 1.0, fire: 1.0, boss: 'rockjaw' },
    { id: 2, name: 'Ion Nebula', tag: 'Storms and static', hazard: 'Lightning strikes', hazardKey: 'storm',
      desc: 'Charged gas clouds throw lightning across the lanes. Watch the warnings.',
      bg: ['#0a0f26', '#1a2a6a', '#3a1e72'], star: '#c9d4ff', accent: '#6fd0ff',
      pool: { drone: [7, 0], weaver: [6, 0], kamikaze: [3, 15], gunship: [2.5, 30], sniper: [1.5, 45] },
      spawn: 1.1, hp: 1.15, fire: 1.1, boss: 'stormcaller' },
    { id: 3, name: 'Wreck Yard', tag: 'A graveyard of fleets', hazard: 'Drifting debris, extra salvage', hazardKey: 'debris',
      desc: 'Scrap, hulls and wrecked turrets. Salvage pays: coin drops are bigger here.',
      bg: ['#14110e', '#2c241d', '#3e2f22'], star: '#ffe0b8', accent: '#ffd36b',
      pool: { drone: [5, 0], gunship: [5, 0], asteroid: [4, 0], sniper: [3, 20], carrier: [1.2, 55], weaver: [3, 10] },
      spawn: 1.0, hp: 1.3, fire: 1.2, coinBonus: 1.35, boss: 'scrapper' },
    { id: 4, name: 'Crimson Rift', tag: 'The hive stirs', hazard: 'Swarm formations', hazardKey: 'swarm',
      desc: 'A tear in space leaking a living swarm. Everything here is faster.',
      bg: ['#1a0610', '#4a0f26', '#7a1a30'], star: '#ffd0d8', accent: '#ff5a7a',
      pool: { drone: [6, 0], kamikaze: [6, 0], weaver: [4, 10], carrier: [2, 25], gunship: [2.5, 30], sniper: [2, 40] },
      spawn: 0.9, hp: 1.45, fire: 1.3, speed: 1.12, boss: 'hivemother' },
    { id: 5, name: 'Frozen Citadel', tag: 'Cold, slick and sharp', hazard: 'Slippery controls, falling icicles', hazardKey: 'ice',
      desc: 'Your ship slides on the ice field and icicles drop in telegraphed lines.',
      bg: ['#06141e', '#0f3550', '#2a6a8a'], star: '#e6fbff', accent: '#8fe9ff',
      pool: { sniper: [5, 0], gunship: [4, 0], weaver: [4, 0], drone: [4, 0], carrier: [2.5, 25], kamikaze: [3, 15] },
      spawn: 0.88, hp: 1.55, fire: 1.35, boss: 'warden' },
    { id: 6, name: 'Void Core', tag: 'The end of the map', hazard: 'Gravity wells', hazardKey: 'void',
      desc: 'A dying star bends everything around it. Elites roam in packs.',
      bg: ['#030208', '#120a2a', '#2a0f4a'], star: '#e8d8ff', accent: '#b985ff',
      pool: { kamikaze: [5, 0], sniper: [5, 0], gunship: [5, 0], carrier: [3.5, 15], weaver: [4, 0], drone: [3, 0], asteroid: [2, 0] },
      spawn: 0.78, hp: 1.8, fire: 1.55, speed: 1.1, eliteBoost: 0.1, boss: 'eclipse' }
  ];

  // Mission objective stats are tracked per run. op '>=' completes when reached; '<=' is checked at the end.
  const M = (sector, idx, title, stat, target, reward, extra) => Object.assign({
    id: `s${sector}m${idx}`, sector, index: idx, title, stat, target, reward,
    bonus: null, boss: false
  }, extra || {});
  const MISSIONS = [
    M(1, 1, 'First Contact', 'kills', 55, 60, { bonus: { stat: 'damageTaken', op: '<=', target: 1, label: 'Take at most 1 hit', reward: 25 } }),
    M(1, 2, 'Rock Cutter', 'killsAsteroid', 35, 90, { bonus: { stat: 'powerups', op: '>=', target: 1, label: 'Collect a power-up', reward: 35 } }),
    M(1, 3, 'Boss: Rockjaw', 'boss', 1, 200, { boss: true, bonus: { stat: 'damageTaken', op: '<=', target: 3, label: 'Take at most 3 hits', reward: 80 } }),
    M(2, 1, 'Static Charge', 'kills', 65, 100, { bonus: { stat: 'maxCombo', op: '>=', target: 8, label: 'Reach a x8 combo', reward: 40 } }),
    M(2, 2, 'Storm Runner', 'survive', 90, 130, { bonus: { stat: 'damageTaken', op: '<=', target: 2, label: 'Take at most 2 hits', reward: 50 } }),
    M(2, 3, 'Boss: Stormcaller', 'boss', 1, 300, { boss: true, bonus: { stat: 'damageTaken', op: '<=', target: 4, label: 'Take at most 4 hits', reward: 110 } }),
    M(3, 1, 'Salvage Rights', 'coins', 100, 140, { bonus: { stat: 'killsGunship', op: '>=', target: 6, label: 'Destroy 6 gunships', reward: 55 } }),
    M(3, 2, 'Elite Bounty', 'elites', 4, 180, { bonus: { stat: 'damageTaken', op: '<=', target: 3, label: 'Take at most 3 hits', reward: 70 } }),
    M(3, 3, 'Boss: Scrapper', 'boss', 1, 400, { boss: true, bonus: { stat: 'killsCarrier', op: '>=', target: 1, label: 'Destroy a carrier first', reward: 120 } }),
    M(4, 1, 'Swarm Breaker', 'kills', 100, 190, { bonus: { stat: 'maxCombo', op: '>=', target: 12, label: 'Reach a x12 combo', reward: 70 } }),
    M(4, 2, 'Drone Hunter', 'killsKamikaze', 24, 240, { bonus: { stat: 'damageTaken', op: '<=', target: 3, label: 'Take at most 3 hits', reward: 90 } }),
    M(4, 3, 'Boss: Hive Mother', 'boss', 1, 550, { boss: true, bonus: { stat: 'damageTaken', op: '<=', target: 5, label: 'Take at most 5 hits', reward: 160 } }),
    M(5, 1, 'Cold Snap', 'survive', 110, 250, { bonus: { stat: 'killsSniper', op: '>=', target: 8, label: 'Destroy 8 snipers', reward: 100 } }),
    M(5, 2, 'Glacier Hunt', 'elites', 6, 320, { bonus: { stat: 'powerups', op: '>=', target: 4, label: 'Collect 4 power-ups', reward: 110 } }),
    M(5, 3, 'Boss: Cryo Warden', 'boss', 1, 700, { boss: true, bonus: { stat: 'damageTaken', op: '<=', target: 5, label: 'Take at most 5 hits', reward: 200 } }),
    M(6, 1, 'Event Horizon', 'kills', 150, 330, { bonus: { stat: 'maxCombo', op: '>=', target: 18, label: 'Reach a x18 combo', reward: 130 } }),
    M(6, 2, 'Pack Hunter', 'elites', 10, 420, { bonus: { stat: 'damageTaken', op: '<=', target: 4, label: 'Take at most 4 hits', reward: 150 } }),
    M(6, 3, 'Boss: The Eclipse', 'boss', 1, 1000, { boss: true, bonus: { stat: 'damageTaken', op: '<=', target: 6, label: 'Take at most 6 hits', reward: 300 } })
  ];
  const FREEFLIGHT = { id: 'free', sector: 0, index: 0, title: 'Free Flight', stat: 'none', target: 0, reward: 0, bonus: null, boss: false };

  const BOSSES = {
    rockjaw:     { id: 'rockjaw', name: 'Rockjaw', title: 'Asteroid Titan', hp: 150, radius: 62, color: '#b79c82', score: 1500, coins: 40,
                   patterns: 'Radial rock bursts and falling boulder rain.' },
    stormcaller: { id: 'stormcaller', name: 'Stormcaller', title: 'Ion Leviathan', hp: 230, radius: 58, color: '#7ab8ff', score: 2500, coins: 60,
                   patterns: 'Rotating spiral arms, lightning columns and homing orbs.' },
    scrapper:    { id: 'scrapper', name: 'Scrapper', title: 'Salvage Dreadnought', hp: 320, radius: 66, color: '#d9a05b', score: 3500, coins: 80,
                   patterns: 'Aimed salvos, bullet walls with gaps and drone drops.' },
    hivemother:  { id: 'hivemother', name: 'Hive Mother', title: 'Swarm Queen', hp: 420, radius: 60, color: '#ff5a7a', score: 4800, coins: 105,
                   patterns: 'Kamikaze broods, arc spreads and a bone-crushing dive.' },
    warden:      { id: 'warden', name: 'Cryo Warden', title: 'Frozen Sentinel', hp: 500, radius: 62, color: '#8fe9ff', score: 6200, coins: 135,
                   patterns: 'Shard fans, frost rings and icicle columns.' },
    eclipse:     { id: 'eclipse', name: 'The Eclipse', title: 'Void Sovereign', hp: 760, radius: 70, color: '#b985ff', score: 10000, coins: 220,
                   patterns: 'Three phases mixing beams, black holes and spirals.' }
  };

  const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', desc: 'Destroy your first enemy.', stat: 'kills', target: 1, reward: 20 },
    { id: 'pest_control', name: 'Pest Control', desc: 'Destroy 250 enemies in total.', stat: 'kills', target: 250, reward: 80 },
    { id: 'exterminator', name: 'Exterminator', desc: 'Destroy 2,000 enemies in total.', stat: 'kills', target: 2000, reward: 300 },
    { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat your first boss.', stat: 'bossKills', target: 1, reward: 100 },
    { id: 'void_conqueror', name: 'Void Conqueror', desc: 'Defeat every sector boss.', stat: 'uniqueBosses', target: 6, reward: 600 },
    { id: 'collector', name: 'Hangar Starter', desc: 'Own 3 ships.', stat: 'shipsOwned', target: 3, reward: 150 },
    { id: 'fleet_admiral', name: 'Fleet Admiral', desc: 'Own all 5 ships.', stat: 'shipsOwned', target: 5, reward: 500 },
    { id: 'tinkerer', name: 'Tinkerer', desc: 'Buy 10 upgrade levels.', stat: 'upgradeLevels', target: 10, reward: 150 },
    { id: 'maxed_out', name: 'Maxed Out', desc: 'Max out any upgrade.', stat: 'maxedUpgrades', target: 1, reward: 250 },
    { id: 'big_spender', name: 'Treasure Hunter', desc: 'Earn 5,000 coins in total.', stat: 'coinsEarned', target: 5000, reward: 200 },
    { id: 'untouchable', name: 'Untouchable', desc: 'Complete a mission without taking damage.', stat: 'flawless', target: 1, reward: 200 },
    { id: 'combo_master', name: 'Combo Master', desc: 'Reach a x20 combo.', stat: 'bestCombo', target: 20, reward: 150 },
    { id: 'elite_hunter', name: 'Elite Hunter', desc: 'Destroy 25 elite enemies.', stat: 'elites', target: 25, reward: 200 },
    { id: 'powered_up', name: 'Powered Up', desc: 'Collect 50 power-ups.', stat: 'powerups', target: 50, reward: 120 },
    { id: 'high_scorer', name: 'High Scorer', desc: 'Score 25,000 in a single run.', stat: 'bestScore', target: 25000, reward: 250 },
    { id: 'survivor', name: 'Survivor', desc: 'Survive for 5 minutes in a single run.', stat: 'bestTime', target: 300, reward: 200 }
  ];

  const POWERUPS = {
    rapid:  { id: 'rapid', label: 'Rapid Fire', color: '#ffd36b', glyph: '≫', duration: 9 },
    spread: { id: 'spread', label: 'Spread Shot', color: '#7dff9a', glyph: '⋔', duration: 10 },
    shield: { id: 'shield', label: 'Overshield', color: '#6fd0ff', glyph: '⬡', duration: 8 },
    health: { id: 'health', label: 'Repair', color: '#ff6a8a', glyph: '+', duration: 0 },
    charge: { id: 'charge', label: 'Ability Charge', color: '#d79bff', glyph: '★', duration: 0 }
  };

  return { SHIPS, UPGRADES, ENEMIES, SECTORS, MISSIONS, FREEFLIGHT, BOSSES, ACHIEVEMENTS, POWERUPS };
})();

/* ========================================================================== 2. SAVE */
const SpaceShooterSave = (() => {
  const D = SpaceShooterData;
  const VERSION = 1;
  const num = (v, min, max, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : def;
  };
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  function defaults() {
    return {
      version: VERSION, coins: 0,
      ships: { owned: ['vanguard'], selected: 'vanguard' },
      upgrades: { damage: 0, fireRate: 0, shield: 0, speed: 0, ability: 0 },
      missions: { current: 's1m1', progress: {} },
      achievements: {},
      stats: { runs: 0, kills: 0, bossKills: 0, elites: 0, powerups: 0, coinsEarned: 0, bestScore: 0, bestTime: 0, bestCombo: 0, flawless: 0, playSeconds: 0, bosses: [] }
    };
  }

  /** Turn ANY parsed value into a safe, complete save object. Never throws. */
  function sanitize(raw) {
    const s = defaults();
    if (!isObj(raw)) return s;
    s.coins = num(raw.coins, 0, 99999999, 0);
    if (isObj(raw.ships)) {
      const known = new Set(D.SHIPS.map(x => x.id));
      const owned = Array.isArray(raw.ships.owned) ? raw.ships.owned.filter(id => known.has(id)) : [];
      s.ships.owned = Array.from(new Set(['vanguard'].concat(owned)));
      s.ships.selected = s.ships.owned.includes(raw.ships.selected) ? raw.ships.selected : 'vanguard';
    }
    if (isObj(raw.upgrades)) {
      D.UPGRADES.forEach(u => { s.upgrades[u.id] = num(raw.upgrades[u.id], 0, u.max, 0); });
    }
    if (isObj(raw.missions)) {
      const ids = new Set(D.MISSIONS.map(m => m.id));
      if (isObj(raw.missions.progress)) {
        Object.keys(raw.missions.progress).forEach(id => {
          const p = raw.missions.progress[id];
          if (!ids.has(id) || !isObj(p)) return;
          s.missions.progress[id] = { done: !!p.done, bonus: !!p.bonus, best: num(p.best, 0, 99999999, 0), plays: num(p.plays, 0, 99999, 0) };
        });
      }
      s.missions.current = (ids.has(raw.missions.current) || raw.missions.current === 'free') ? raw.missions.current : 's1m1';
    }
    if (isObj(raw.achievements)) {
      D.ACHIEVEMENTS.forEach(a => { if (raw.achievements[a.id]) s.achievements[a.id] = num(raw.achievements[a.id], 1, 9e15, 1); });
    }
    if (isObj(raw.stats)) {
      Object.keys(s.stats).forEach(k => {
        if (k === 'bosses') s.stats.bosses = Array.isArray(raw.stats.bosses) ? raw.stats.bosses.filter(b => D.BOSSES[b]).filter((b, i, a) => a.indexOf(b) === i) : [];
        else s.stats[k] = num(raw.stats[k], 0, 9e12, 0);
      });
    }
    // A mission can only be current if it is unlocked
    if (s.missions.current !== 'free' && !isUnlocked(s, s.missions.current)) s.missions.current = firstOpen(s);
    return s;
  }

  function missionById(id) { return id === 'free' ? D.FREEFLIGHT : D.MISSIONS.find(m => m.id === id); }
  // Missions unlock in order: mission 1 of a sector needs the previous sector's boss mission.
  function isUnlocked(save, id) {
    const i = D.MISSIONS.findIndex(m => m.id === id);
    if (i <= 0) return i === 0;
    const prev = D.MISSIONS[i - 1];
    return !!(save.missions.progress[prev.id] && save.missions.progress[prev.id].done);
  }
  function firstOpen(save) {
    for (const m of D.MISSIONS) if (isUnlocked(save, m.id) && !(save.missions.progress[m.id] || {}).done) return m.id;
    return D.MISSIONS[D.MISSIONS.length - 1].id;
  }
  function sectorUnlocked(save, sectorId) { return isUnlocked(save, `s${sectorId}m1`); }

  /** Read storage. Returns { save, status } where status is 'new' | 'ok' | 'migrated' | 'corrupt' | 'unavailable'. */
  function load() {
    let rawText = null, hs = 0;
    try { hs = parseInt(localStorage.getItem('arcade_space_highscore') || '0', 10) || 0; } catch (e) { return { save: defaults(), status: 'unavailable' }; }
    try { rawText = localStorage.getItem('arcade_space_save_v1'); } catch (e) { return { save: defaults(), status: 'unavailable' }; }
    let save, status;
    if (rawText === null || rawText === undefined) {
      save = defaults(); status = 'new';
      // Players who already had a high score keep a head start instead of a blank slate
      if (hs > 0) { save.coins = Math.min(400, Math.floor(hs / 8)); }
    } else {
      let parsed = null;
      try { parsed = JSON.parse(rawText); } catch (e) { parsed = null; }
      if (!isObj(parsed)) { save = defaults(); status = 'corrupt'; }
      else { status = (parsed.version === VERSION) ? 'ok' : 'migrated'; save = sanitize(migrate(parsed)); }
    }
    save.stats.bestScore = Math.max(save.stats.bestScore, hs);
    return { save, status };
  }

  // Future save versions add a step here. Version 0 / missing is treated as "same shape".
  function migrate(parsed) { return parsed; }

  /** Write storage. Returns true on success. */
  function write(save) {
    try { localStorage.setItem('arcade_space_save_v1', JSON.stringify(save)); return true; }
    catch (e) { return false; }
  }
  function writeHighScore(score) {
    try { localStorage.setItem('arcade_space_highscore', String(score)); return true; } catch (e) { return false; }
  }

  return { VERSION, defaults, sanitize, load, write, writeHighScore, missionById, isUnlocked, sectorUnlocked, firstOpen };
})();

/* ========================================================================== 3. ART */
const SpaceShooterArt = (() => {
  const TAU = Math.PI * 2;
  const cache = new Map();

  /** Real canvases have every method used below. Minimal test doubles do not, so wrap them in no-ops. */
  function safeCtx(raw) {
    if (!raw) return raw;
    const need = ['createRadialGradient', 'quadraticCurveTo', 'bezierCurveTo', 'drawImage', 'scale', 'setTransform', 'clip', 'rect', 'arcTo', 'measureText', 'setLineDash'];
    if (need.every(n => typeof raw[n] === 'function')) return raw;
    const noop = () => {};
    const grad = () => ({ addColorStop: noop });
    return new Proxy(raw, {
      get(t, k) {
        const v = t[k];
        if (typeof v === 'function') return v.bind(t);
        if (v !== undefined) return v;
        if (k === 'measureText') return () => ({ width: 0 });
        if (typeof k === 'string' && k.indexOf('create') === 0) return grad;
        if (need.indexOf(k) >= 0 || k === 'fillText' || k === 'strokeText') return noop;
        return v;
      }
    });
  }

  // ---- tiny drawing helpers -------------------------------------------------
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(c, amt) {
    const [r, g, b] = hex(c);
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
  function path(ctx, pts, close) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close !== false) ctx.closePath();
  }
  function lg(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    return g;
  }
  function rg(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    return g;
  }
  function glow(ctx, x, y, r, color, a) {
    ctx.fillStyle = rg(ctx, x, y, 0, r, [[0, rgba(color, a)], [1, rgba(color, 0)]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function fillStroke(ctx, fill, stroke, lw) {
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---- sprite cache ---------------------------------------------------------
  const SCALE = 2;
  function sprite(key, w, h, draw) {
    const hit = cache.get(key);
    if (hit) return hit;
    let canvas = null;
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * SCALE); c.height = Math.ceil(h * SCALE);
        const g = c.getContext && c.getContext('2d');
        if (g && typeof g.scale === 'function' && typeof g.createRadialGradient === 'function') {
          g.scale(SCALE, SCALE); g.translate(w / 2, h / 2); draw(g); canvas = c;
        }
      }
    } catch (e) { canvas = null; }
    const entry = { canvas, w, h, draw };
    cache.set(key, entry);
    return entry;
  }
  function blit(ctx, spr, x, y, rot, scale) {
    const k = scale || 1;
    if (spr.canvas) {
      if (rot) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.drawImage(spr.canvas, -spr.w * k / 2, -spr.h * k / 2, spr.w * k, spr.h * k); ctx.restore();
      } else ctx.drawImage(spr.canvas, x - spr.w * k / 2, y - spr.h * k / 2, spr.w * k, spr.h * k);
    } else {
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (k !== 1) ctx.scale(k, k); spr.draw(ctx); ctx.restore();
    }
  }

  // ==========================================================================
  // SHIPS (nominal box 100 x 100, nose at the top)
  // ==========================================================================
  function drawVanguard(ctx, c) {
    // rear engines
    [[-9, 34], [9, 34]].forEach(([x, y]) => { ctx.fillStyle = '#233a66'; ctx.fillRect(x - 5, y - 6, 10, 12); ctx.fillStyle = c.glow; ctx.fillRect(x - 3, y + 4, 6, 3); });
    // swept delta wings
    [-1, 1].forEach(s => {
      path(ctx, [[s * 8, -8], [s * 46, 30], [s * 44, 38], [s * 20, 30], [s * 8, 36]]);
      fillStroke(ctx, lg(ctx, 0, -10, s * 46, 38, [[0, c.hull], [1, c.dark]]), shade(c.hull, 0.5), 1);
      path(ctx, [[s * 20, 6], [s * 40, 31], [s * 22, 27]]); ctx.fillStyle = rgba('#000000', 0.22); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(s * 12, 4); ctx.lineTo(s * 40, 33); ctx.stroke();
      // wingtip cannon
      ctx.fillStyle = '#d6e4ff'; ctx.fillRect(s * 38 - 2.5, 16, 5, 22);
      ctx.fillStyle = c.glow; ctx.fillRect(s * 38 - 1.5, 13, 3, 5);
      // nav light
      glow(ctx, s * 44, 36, 6, s < 0 ? '#ff4d6a' : '#5dff8a', 0.9);
    });
    // fuselage
    path(ctx, [[0, -48], [8, -22], [11, 10], [10, 38], [0, 32], [-10, 38], [-11, 10], [-8, -22]]);
    fillStroke(ctx, lg(ctx, -11, 0, 11, 0, [[0, c.dark], [0.45, c.hull], [0.55, shade(c.hull, 0.35)], [1, c.dark]]), shade(c.hull, 0.6), 1.2);
    ctx.strokeStyle = rgba('#ffffff', 0.4); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(0, -18); ctx.stroke();
    // cockpit
    path(ctx, [[0, -26], [5.5, -10], [4, 4], [-4, 4], [-5.5, -10]]);
    fillStroke(ctx, lg(ctx, 0, -26, 0, 4, [[0, '#e8fbff'], [0.5, c.accent], [1, '#17508f']]), '#0c2a52', 1);
    glow(ctx, -1.5, -14, 5, '#ffffff', 0.55);
  }

  function drawStriker(ctx, c) {
    // forward canards
    [-1, 1].forEach(s => {
      path(ctx, [[s * 5, -26], [s * 20, -14], [s * 18, -9], [s * 5, -14]]);
      fillStroke(ctx, c.accent, shade(c.accent, -0.4), 0.8);
    });
    // big swept-back blades
    [-1, 1].forEach(s => {
      path(ctx, [[s * 6, -4], [s * 48, 40], [s * 40, 42], [s * 22, 32], [s * 6, 30]]);
      fillStroke(ctx, lg(ctx, 0, 0, s * 48, 40, [[0, c.hull], [1, c.dark]]), shade(c.hull, 0.45), 1);
      path(ctx, [[s * 14, 12], [s * 42, 40], [s * 30, 36], [s * 14, 24]]); ctx.fillStyle = c.accent; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
      path(ctx, [[s * 24, 22], [s * 46, 41], [s * 40, 42], [s * 22, 33]]); ctx.fillStyle = rgba('#000000', 0.3); ctx.fill();
      ctx.fillStyle = '#ffe9c2'; ctx.fillRect(s * 20 - 1.5, -2, 3, 18);   // gun barrels
      glow(ctx, s * 47, 41, 6, s < 0 ? '#ff4d6a' : '#5dff8a', 0.85);
    });
    // needle fuselage
    path(ctx, [[0, -50], [5, -26], [8, 6], [7, 36], [0, 42], [-7, 36], [-8, 6], [-5, -26]]);
    fillStroke(ctx, lg(ctx, -8, 0, 8, 0, [[0, c.dark], [0.45, c.hull], [0.6, shade(c.hull, 0.3)], [1, c.dark]]), shade(c.hull, 0.55), 1.1);
    // racing stripe
    ctx.fillStyle = c.accent; ctx.fillRect(-1.2, -40, 2.4, 64);
    // canopy
    path(ctx, [[0, -22], [4, -8], [3, 6], [-3, 6], [-4, -8]]);
    fillStroke(ctx, lg(ctx, 0, -22, 0, 6, [[0, '#fff6dd'], [1, '#7a2b12']]), '#3a0f08', 0.9);
    // intake & engine
    ctx.fillStyle = '#2a0d0a'; ctx.fillRect(-4, 36, 8, 6); ctx.fillStyle = c.glow; ctx.fillRect(-2.5, 40, 5, 3);
  }

  function drawBulwark(ctx, c) {
    // side gun pods
    [-1, 1].forEach(s => {
      ctx.fillStyle = '#2d3f2f'; ctx.fillRect(s * 38 - 5, -6, 10, 34);
      fillStroke(ctx, lg(ctx, s * 32, 0, s * 44, 0, [[0, c.dark], [0.5, c.hull], [1, c.dark]]), shade(c.hull, 0.4), 1);
      path(ctx, [[s * 33, -12], [s * 43, -12], [s * 45, 30], [s * 31, 30]]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8ffd0'; ctx.fillRect(s * 38 - 1.6, -20, 3.2, 14);
      glow(ctx, s * 38, -21, 5, c.glow, 0.8);
    });
    // armoured hull
    path(ctx, [[0, -42], [16, -30], [30, -8], [30, 32], [20, 42], [-20, 42], [-30, 32], [-30, -8], [-16, -30]]);
    fillStroke(ctx, lg(ctx, -30, 0, 30, 0, [[0, c.dark], [0.3, c.hull], [0.5, shade(c.hull, 0.3)], [0.7, c.hull], [1, c.dark]]), shade(c.hull, 0.6), 1.5);
    // shoulder plates
    [-1, 1].forEach(s => {
      path(ctx, [[s * 8, -26], [s * 26, -12], [s * 26, 6], [s * 8, 0]]);
      fillStroke(ctx, rgba('#000000', 0.18), shade(c.hull, 0.5), 0.8);
      ctx.strokeStyle = '#f2d34a'; ctx.lineWidth = 2;   // hazard stripe
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * (14 + i * 4), 24); ctx.lineTo(s * (18 + i * 4), 36); ctx.stroke(); }
    });
    // armour rivets / panel lines
    ctx.strokeStyle = rgba('#ffffff', 0.25); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-28, 8); ctx.lineTo(28, 8); ctx.moveTo(-26, 24); ctx.lineTo(26, 24); ctx.stroke();
    ctx.fillStyle = shade(c.hull, 0.7);
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 10, 16, 1.2, 0, TAU); ctx.fill(); }
    // central cannon barrel
    ctx.fillStyle = '#1c2a1e'; ctx.fillRect(-5.5, -52, 11, 32);
    fillStroke(ctx, lg(ctx, -5, 0, 5, 0, [[0, '#35503a'], [0.5, '#8bd88a'], [1, '#35503a']]), '#0f1c12', 1);
    ctx.fillRect(-5, -50, 10, 28); ctx.strokeRect(-5, -50, 10, 28);
    ctx.fillStyle = c.accent; ctx.fillRect(-6.5, -52, 13, 3.5);
    glow(ctx, 0, -53, 8, c.glow, 0.85);
    // cockpit slit
    path(ctx, [[-9, -6], [9, -6], [7, 6], [-7, 6]]);
    fillStroke(ctx, lg(ctx, 0, -6, 0, 6, [[0, '#f4ffd8'], [1, '#2c6a38']]), '#10301a', 1);
    // three engines
    [-13, 0, 13].forEach(x => { ctx.fillStyle = '#16231a'; ctx.fillRect(x - 5, 40, 10, 7); ctx.fillStyle = c.glow; ctx.fillRect(x - 3, 45, 6, 3); });
  }

  function drawNova(ctx, c) {
    // floating wing-blades
    [-1, 1].forEach(s => {
      ctx.beginPath(); ctx.moveTo(s * 10, -34);
      ctx.quadraticCurveTo(s * 52, -22, s * 46, 26); ctx.quadraticCurveTo(s * 34, 6, s * 12, 2); ctx.closePath();
      fillStroke(ctx, lg(ctx, 0, -34, s * 46, 26, [[0, c.accent], [0.5, c.hull], [1, c.dark]]), shade(c.hull, 0.6), 1.2);
      ctx.beginPath(); ctx.moveTo(s * 14, -22); ctx.quadraticCurveTo(s * 40, -12, s * 40, 16);
      ctx.strokeStyle = rgba('#ffffff', 0.5); ctx.lineWidth = 1; ctx.stroke();
      // detached blade tip crystals
      path(ctx, [[s * 44, 14], [s * 50, 30], [s * 42, 36], [s * 38, 24]]);
      fillStroke(ctx, c.accent, shade(c.accent, -0.35), 0.8);
      glow(ctx, s * 44, 28, 7, c.glow, 0.7);
    });
    // spine
    path(ctx, [[0, -48], [7, -20], [9, 12], [5, 38], [0, 44], [-5, 38], [-9, 12], [-7, -20]]);
    fillStroke(ctx, lg(ctx, -9, 0, 9, 0, [[0, c.dark], [0.5, c.hull], [1, c.dark]]), shade(c.hull, 0.6), 1.2);
    // lance emitter
    path(ctx, [[0, -56], [3, -42], [-3, -42]]); fillStroke(ctx, '#ffffff', c.glow, 0.8);
    glow(ctx, 0, -50, 8, c.glow, 0.9);
    // energy core
    glow(ctx, 0, 2, 17, c.glow, 0.8);
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 2); ctx.lineTo(0, 12); ctx.lineTo(-6, 2); ctx.closePath();
    fillStroke(ctx, lg(ctx, 0, -8, 0, 12, [[0, '#ffffff'], [0.5, c.accent], [1, c.hull]]), '#ffffff', 0.8);
    // missile racks
    [-1, 1].forEach(s => { ctx.fillStyle = '#2a1559'; ctx.fillRect(s * 14 - 2, 14, 4, 16); ctx.fillStyle = c.accent; ctx.fillRect(s * 14 - 1.5, 12, 3, 4); });
    ctx.fillStyle = '#1c0d3d'; ctx.fillRect(-4, 38, 8, 6); ctx.fillStyle = c.glow; ctx.fillRect(-2.5, 42, 5, 3);
  }

  function drawPhantom(ctx, c) {
    // stealth flying wing (faceted)
    path(ctx, [[0, -50], [14, -22], [50, 22], [44, 34], [20, 26], [8, 38], [0, 30], [-8, 38], [-20, 26], [-44, 34], [-50, 22], [-14, -22]]);
    fillStroke(ctx, lg(ctx, -50, 0, 50, 0, [[0, '#06242e'], [0.35, c.dark], [0.5, '#165b6b'], [0.65, c.dark], [1, '#06242e']]), c.hull, 1.4);
    // facets
    ctx.strokeStyle = rgba(c.hull, 0.55); ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -46); ctx.lineTo(0, 28);
    ctx.moveTo(10, -18); ctx.lineTo(40, 28); ctx.moveTo(-10, -18); ctx.lineTo(-40, 28);
    ctx.moveTo(18, 8); ctx.lineTo(8, 34); ctx.moveTo(-18, 8); ctx.lineTo(-8, 34);
    ctx.stroke();
    [-1, 1].forEach(s => {
      path(ctx, [[s * 12, -14], [s * 46, 24], [s * 30, 22], [s * 10, 0]]);
      ctx.fillStyle = rgba('#000000', 0.28); ctx.fill();
      // glowing edge lines
      ctx.strokeStyle = c.glow; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(s * 14, -22); ctx.lineTo(s * 49, 22); ctx.stroke();
      glow(ctx, s * 49, 24, 7, c.glow, 0.8);
      // slim needle guns
      ctx.fillStyle = c.accent; ctx.fillRect(s * 24 - 1, -2, 2, 18);
    });
    // visor and core
    path(ctx, [[0, -30], [6, -14], [0, -6], [-6, -14]]);
    fillStroke(ctx, lg(ctx, 0, -30, 0, -6, [[0, '#ffffff'], [1, c.glow]]), '#ffffff', 0.8);
    glow(ctx, 0, 6, 10, c.glow, 0.6);
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(0, 6, 2.6, 0, TAU); ctx.fill();
    // twin tail vents
    [-6, 6].forEach(x => { ctx.fillStyle = '#031318'; ctx.fillRect(x - 3, 30, 6, 6); ctx.fillStyle = c.glow; ctx.fillRect(x - 2, 34, 4, 2.5); });
  }

  const SHIP_DRAW = { vanguard: drawVanguard, striker: drawStriker, bulwark: drawBulwark, nova: drawNova, phantom: drawPhantom };
  function shipSprite(ship, size) {
    return sprite(`ship:${ship.id}:${size}`, size, size, (g) => {
      const k = size / 100; g.scale(k, k); SHIP_DRAW[ship.id](g, ship.colors);
    });
  }
  /** Engine flame, drawn live (flicker uses the game clock so it freezes with pause). */
  function drawFlame(ctx, x, y, len, w, color, t) {
    const l = len * (0.85 + 0.15 * Math.sin(t * 40 + x));
    ctx.fillStyle = rg(ctx, x, y, 0, l, [[0, 'rgba(255,255,255,0.95)'], [0.35, rgba(color, 0.7)], [1, rgba(color, 0)]]);
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y + l); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  }
  // Engine nozzle offsets per ship, in the 100-unit design box
  const ENGINES = {
    vanguard: [[-9, 38], [9, 38]], striker: [[0, 43]], bulwark: [[-13, 48], [0, 48], [13, 48]],
    nova: [[0, 44]], phantom: [[-6, 36], [6, 36]]
  };

  // ==========================================================================
  // ENEMIES (facing down)
  // ==========================================================================
  function drawDrone(ctx, r, col) {
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.75, 0, 0, TAU);
    fillStroke(ctx, rg(ctx, -r * 0.3, -r * 0.3, 1, r * 1.2, [[0, shade(col, 0.45)], [1, shade(col, -0.55)]]), shade(col, 0.5), 1);
    [-1, 1].forEach(s => { path(ctx, [[s * r * 0.8, -r * 0.2], [s * r * 1.5, r * 0.5], [s * r * 0.9, r * 0.5]]); fillStroke(ctx, shade(col, -0.35), shade(col, 0.3), 0.8); });
    ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.34, 0, TAU); ctx.fillStyle = '#220008'; ctx.fill();
    glow(ctx, 0, r * 0.1, r * 0.6, '#ffffff', 0.9); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.16, 0, TAU); ctx.fill();
  }
  function drawWeaver(ctx, r, col) {
    [-1, 1].forEach(s => {
      ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.8); ctx.quadraticCurveTo(s * r * 1.9, -r * 0.5, s * r * 1.3, r * 0.9); ctx.quadraticCurveTo(s * r * 0.9, r * 0.1, s * r * 0.3, r * 0.2); ctx.closePath();
      fillStroke(ctx, lg(ctx, 0, -r, s * r * 1.5, r, [[0, shade(col, 0.4)], [1, shade(col, -0.55)]]), shade(col, 0.55), 1);
    });
    path(ctx, [[0, r * 1.1], [r * 0.45, -r * 0.2], [r * 0.3, -r * 0.9], [-r * 0.3, -r * 0.9], [-r * 0.45, -r * 0.2]]);
    fillStroke(ctx, lg(ctx, -r * 0.4, 0, r * 0.4, 0, [[0, shade(col, -0.5)], [0.5, col], [1, shade(col, -0.5)]]), shade(col, 0.6), 1);
    glow(ctx, 0, -r * 0.15, r * 0.55, '#fff2c0', 0.9);
  }
  function drawKamikaze(ctx, r, col) {
    path(ctx, [[0, r * 1.4], [r * 0.6, -r * 0.2], [r * 0.9, -r], [r * 0.3, -r * 0.65], [0, -r * 1.05], [-r * 0.3, -r * 0.65], [-r * 0.9, -r], [-r * 0.6, -r * 0.2]]);
    fillStroke(ctx, lg(ctx, -r, 0, r, 0, [[0, shade(col, -0.6)], [0.5, shade(col, 0.1)], [1, shade(col, -0.6)]]), shade(col, 0.6), 1);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.2); ctx.lineTo(r * 0.5, -r * 0.2); ctx.stroke();
    glow(ctx, 0, r * 0.7, r * 0.7, '#ffe36b', 0.95);
    [-1, 1].forEach(s => { path(ctx, [[s * r * 0.6, -r * 0.1], [s * r * 1.05, r * 0.15], [s * r * 0.6, r * 0.3]]); fillStroke(ctx, '#ffd6d6', null); });
  }
  function drawGunship(ctx, r, col) {
    path(ctx, [[0, r * 1.05], [r * 0.8, r * 0.4], [r * 1.15, -r * 0.3], [r * 0.7, -r * 0.9], [-r * 0.7, -r * 0.9], [-r * 1.15, -r * 0.3], [-r * 0.8, r * 0.4]]);
    fillStroke(ctx, lg(ctx, -r, 0, r, 0, [[0, shade(col, -0.65)], [0.45, shade(col, 0.05)], [0.55, shade(col, 0.25)], [1, shade(col, -0.65)]]), shade(col, 0.55), 1.2);
    ctx.strokeStyle = rgba('#000000', 0.35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.2); ctx.lineTo(r * 0.8, -r * 0.2); ctx.moveTo(0, -r * 0.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
    [-0.6, 0, 0.6].forEach(x => { ctx.fillStyle = '#2b1810'; ctx.fillRect(r * x - 2.5, r * 0.5, 5, r * 0.75); ctx.fillStyle = '#ffd0a0'; ctx.fillRect(r * x - 1.2, r * 1.05, 2.4, r * 0.2); });
    glow(ctx, 0, -r * 0.35, r * 0.5, '#ffe9c2', 0.85);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.14, 0, TAU); ctx.fill();
  }
  function drawSniper(ctx, r, col) {
    ctx.fillStyle = shade(col, -0.55); ctx.fillRect(-r * 0.12, 0, r * 0.24, r * 1.7);       // long barrel
    ctx.fillStyle = col; ctx.fillRect(-r * 0.2, r * 1.3, r * 0.4, r * 0.4);
    path(ctx, [[0, r * 0.2], [r * 0.9, -r * 0.5], [r * 0.5, -r * 1.0], [-r * 0.5, -r * 1.0], [-r * 0.9, -r * 0.5]]);
    fillStroke(ctx, lg(ctx, -r, -r, r, r * 0.3, [[0, shade(col, 0.35)], [1, shade(col, -0.6)]]), shade(col, 0.6), 1.1);
    [-1, 1].forEach(s => { path(ctx, [[s * r * 0.8, -r * 0.7], [s * r * 1.5, -r * 1.0], [s * r * 1.0, -r * 0.3]]); fillStroke(ctx, shade(col, -0.3), shade(col, 0.4), 0.8); });
    ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.38, 0, TAU); ctx.fillStyle = '#12051f'; ctx.fill();
    glow(ctx, 0, -r * 0.4, r * 0.7, '#ff6bf0', 0.95); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.12, 0, TAU); ctx.fill();
  }
  function drawAsteroid(ctx, r, col, seed, metal) {
    const rnd = seeded(seed || 7), pts = [], n = 11;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rad = r * (0.78 + rnd() * 0.3); pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
    path(ctx, pts);
    fillStroke(ctx, rg(ctx, -r * 0.35, -r * 0.35, 1, r * 1.3, [[0, shade(col, metal ? 0.55 : 0.35)], [1, shade(col, -0.65)]]), shade(col, 0.35), 1.2);
    if (metal) {
      ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.1); ctx.lineTo(r * 0.7, r * 0.2); ctx.moveTo(-r * 0.2, -r * 0.7); ctx.lineTo(r * 0.1, r * 0.7); ctx.stroke();
      ctx.fillStyle = '#ffb347'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc((rnd() - 0.5) * r, (rnd() - 0.5) * r, 1.6, 0, TAU); ctx.fill(); }
    } else {
      for (let i = 0; i < 4; i++) {
        const cx = (rnd() - 0.5) * r * 1.0, cy = (rnd() - 0.5) * r * 1.0, cr = r * (0.12 + rnd() * 0.14);
        ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fillStyle = rgba('#000000', 0.28); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - cr * 0.2, cy - cr * 0.2, cr * 0.8, 0, TAU); ctx.strokeStyle = rgba('#ffffff', 0.18); ctx.lineWidth = 0.8; ctx.stroke();
      }
    }
  }
  function drawCarrier(ctx, r, col) {
    path(ctx, [[0, r * 1.1], [r * 0.75, r * 0.75], [r * 1.25, 0], [r * 1.1, -r * 0.8], [r * 0.5, -r], [-r * 0.5, -r], [-r * 1.1, -r * 0.8], [-r * 1.25, 0], [-r * 0.75, r * 0.75]]);
    fillStroke(ctx, lg(ctx, -r, 0, r, 0, [[0, shade(col, -0.7)], [0.4, shade(col, -0.1)], [0.55, shade(col, 0.2)], [1, shade(col, -0.7)]]), shade(col, 0.5), 1.3);
    [-1, 1].forEach(s => {
      ctx.fillStyle = '#071a26'; ctx.fillRect(s * r * 0.62 - r * 0.2, -r * 0.2, r * 0.4, r * 0.7);
      ctx.fillStyle = '#6fd0ff'; ctx.fillRect(s * r * 0.62 - r * 0.17, r * 0.4, r * 0.34, 2.2);
    });
    ctx.strokeStyle = rgba('#ffffff', 0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.8); ctx.lineTo(-r * 0.4, r * 0.8); ctx.moveTo(r * 0.4, -r * 0.8); ctx.lineTo(r * 0.4, r * 0.8); ctx.stroke();
    glow(ctx, 0, -r * 0.1, r * 0.55, '#bfeaff', 0.85);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.13, 0, TAU); ctx.fill();
  }
  const ENEMY_DRAW = { drone: drawDrone, weaver: drawWeaver, kamikaze: drawKamikaze, gunship: drawGunship, sniper: drawSniper, carrier: drawCarrier };
  function enemySprite(type, radius, variant) {
    const size = Math.ceil(radius * 3.6);
    return sprite(`enemy:${type}:${radius}:${variant || 0}`, size, size, (g) => {
      const col = SpaceShooterData.ENEMIES[type].color;
      if (type === 'asteroid') drawAsteroid(g, radius, variant === 'debris' ? '#8a96a4' : col, 11 + (variant === 'debris' ? 3 : 0) + Math.round(radius), variant === 'debris');
      else ENEMY_DRAW[type](g, radius, col);
    });
  }

  // ==========================================================================
  // BOSSES (each drawn into a 220 x 220 sprite)
  // ==========================================================================
  function bossRockjaw(ctx, r) {
    const rnd = seeded(99), pts = [], n = 16;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rad = r * (0.82 + rnd() * 0.26); pts.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.92]); }
    path(ctx, pts);
    fillStroke(ctx, rg(ctx, -r * 0.3, -r * 0.4, 4, r * 1.3, [[0, '#d2b69a'], [0.6, '#7d6652'], [1, '#2b2018']]), '#e8cfb2', 2);
    // glowing cracks
    ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    [[-0.6, -0.5, -0.1, 0.1], [0.5, -0.6, 0.2, 0.0], [0.0, 0.1, 0.35, 0.6], [-0.3, 0.2, -0.55, 0.55]].forEach(c => {
      ctx.beginPath(); ctx.moveTo(c[0] * r, c[1] * r); ctx.lineTo((c[0] + c[2]) * r * 0.55, (c[1] + c[3]) * r * 0.55); ctx.lineTo(c[2] * r, c[3] * r); ctx.stroke();
    });
    // jaw
    path(ctx, [[-r * 0.62, r * 0.38], [-r * 0.42, r * 0.95], [-r * 0.2, r * 0.55], [0, r * 1.0], [r * 0.2, r * 0.55], [r * 0.42, r * 0.95], [r * 0.62, r * 0.38]]);
    fillStroke(ctx, lg(ctx, 0, r * 0.4, 0, r, [[0, '#5b4838'], [1, '#2a1d14']]), '#c9ae92', 1.6);
    // eyes
    [-1, 1].forEach(s => { glow(ctx, s * r * 0.34, -r * 0.18, r * 0.3, '#ff6a2d', 0.95); ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(s * r * 0.34, -r * 0.18, r * 0.1, r * 0.06, 0, 0, TAU); ctx.fill(); });
    for (let i = 0; i < 5; i++) { const cx = (rnd() - 0.5) * r * 1.2, cy = (rnd() - 0.5) * r, cr = r * (0.06 + rnd() * 0.08); ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fillStyle = rgba('#000000', 0.3); ctx.fill(); }
  }
  function bossStorm(ctx, r) {
    // tentacles
    ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * r * 0.22, r * 0.2);
      ctx.bezierCurveTo(i * r * 0.4, r * 0.7, i * r * 0.1, r * 0.9, i * r * 0.32, r * 1.25);
      ctx.strokeStyle = rgba('#7ab8ff', 0.75); ctx.lineWidth = 5 - Math.abs(i) * 0.6; ctx.stroke();
      glow(ctx, i * r * 0.32, r * 1.25, 7, '#d0ecff', 0.9);
    }
    // dome
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.quadraticCurveTo(r * 0.8, r * 0.55, 0, r * 0.45); ctx.quadraticCurveTo(-r * 0.8, r * 0.55, -r, 0); ctx.closePath();
    fillStroke(ctx, rg(ctx, 0, -r * 0.2, 4, r * 1.2, [[0, 'rgba(210,235,255,0.95)'], [0.45, 'rgba(90,150,255,0.8)'], [1, 'rgba(40,40,140,0.9)']]), '#cfe6ff', 2);
    // plasma veins
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.quadraticCurveTo(i * r * 0.35, -r * 0.8, i * r * 0.7, -r * 0.35); ctx.stroke(); }
    glow(ctx, 0, -r * 0.05, r * 0.6, '#ffffff', 0.9);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.18, 0, TAU); ctx.fill();
    // emitter ring
    [-1, 1].forEach(s => { ctx.fillStyle = '#1a2a6a'; ctx.beginPath(); ctx.arc(s * r * 0.78, r * 0.12, 9, 0, TAU); ctx.fill(); glow(ctx, s * r * 0.78, r * 0.12, 12, '#6fd0ff', 0.9); });
  }
  function bossScrapper(ctx, r) {
    const w = r * 1.55, h = r * 1.05;
    path(ctx, [[0, h * 1.05], [w * 0.7, h * 0.85], [w, h * 0.3], [w, -h * 0.5], [w * 0.55, -h * 0.9], [-w * 0.55, -h * 0.9], [-w, -h * 0.5], [-w, h * 0.3], [-w * 0.7, h * 0.85]]);
    fillStroke(ctx, lg(ctx, 0, -h, 0, h, [[0, '#8b6a3f'], [0.5, '#5a4128'], [1, '#2a1d10']]), '#e0b878', 2);
    // armour plates and hazard stripes
    ctx.fillStyle = rgba('#000000', 0.25); ctx.fillRect(-w * 0.8, -h * 0.2, w * 1.6, h * 0.16);
    ctx.save(); ctx.beginPath(); ctx.rect(-w * 0.95, h * 0.45, w * 1.9, h * 0.2); ctx.clip();
    for (let i = -8; i < 10; i++) { path(ctx, [[i * 16, h * 0.45], [i * 16 + 9, h * 0.45], [i * 16 + 1, h * 0.65], [i * 16 - 8, h * 0.65]]); ctx.fillStyle = '#f2c230'; ctx.fill(); }
    ctx.restore();
    // turrets
    [[-0.62, -0.25], [0.62, -0.25], [-0.3, 0.2], [0.3, 0.2]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x * w, y * h, r * 0.17, 0, TAU); fillStroke(ctx, '#3a2a18', '#e0b878', 1.4);
      ctx.fillStyle = '#1a1008'; ctx.fillRect(x * w - 3, y * h, 6, r * 0.36); ctx.fillStyle = '#ffb35a'; ctx.fillRect(x * w - 1.5, y * h + r * 0.3, 3, 5);
    });
    // smokestacks & bridge
    [-1, 1].forEach(s => { ctx.fillStyle = '#2a1d10'; ctx.fillRect(s * w * 0.4 - 6, -h * 1.0, 12, 16); });
    path(ctx, [[-r * 0.3, -h * 0.55], [r * 0.3, -h * 0.55], [r * 0.2, -h * 0.1], [-r * 0.2, -h * 0.1]]);
    fillStroke(ctx, lg(ctx, 0, -h * 0.55, 0, -h * 0.1, [[0, '#ffe2a8'], [1, '#a05a1a']]), '#fff0cf', 1.2);
    ctx.fillStyle = rgba('#ffffff', 0.7); for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.arc(i * w * 0.2, h * 0.35, 1.8, 0, TAU); ctx.fill(); }
    glow(ctx, 0, h * 0.95, 18, '#ff8a3d', 0.7);
  }
  function bossHive(ctx, r) {
    // legs / mandibles
    ctx.lineCap = 'round';
    [-1, 1].forEach(s => {
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * r * 0.4, -r * 0.1 + i * r * 0.28); ctx.quadraticCurveTo(s * r * 1.05, i * r * 0.05, s * r * 1.1, r * 0.5 + i * r * 0.28); ctx.strokeStyle = '#7a1a30'; ctx.lineWidth = 7 - i; ctx.stroke(); }
      path(ctx, [[s * r * 0.25, -r * 0.7], [s * r * 0.75, -r * 0.45], [s * r * 0.85, r * 0.05], [s * r * 0.5, -r * 0.3]]); fillStroke(ctx, '#2a0a12', '#ff90a8', 1.5);
    });
    ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.62, r * 0.8, 0, 0, TAU);       // abdomen with egg sacs
    fillStroke(ctx, rg(ctx, 0, r * 0.2, 4, r, [[0, '#ff8aa6'], [0.6, '#b3254a'], [1, '#4a0c1f']]), '#ffc0cf', 2);
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = rgba('#000000', 0.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.62, r * (0.2 + i * 0.16), 0, 0, Math.PI); ctx.stroke(); }
    [[-0.25, 0.55], [0.25, 0.65], [0, 0.85]].forEach(p => { glow(ctx, p[0] * r, p[1] * r, 14, '#ffd36b', 0.75); });
    ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.48, r * 0.42, 0, 0, TAU);       // head
    fillStroke(ctx, rg(ctx, 0, -r * 0.4, 3, r * 0.6, [[0, '#ff9ab0'], [1, '#701230']]), '#ffd0da', 1.8);
    [[-0.22, -0.4, 0.12], [0.22, -0.4, 0.12], [0, -0.5, 0.09], [-0.1, -0.28, 0.07], [0.1, -0.28, 0.07]].forEach(e => {
      ctx.fillStyle = '#12020a'; ctx.beginPath(); ctx.arc(e[0] * r, e[1] * r, e[2] * r, 0, TAU); ctx.fill();
      glow(ctx, e[0] * r, e[1] * r, e[2] * r * 2, '#ffe36b', 0.9);
    });
  }
  function bossWarden(ctx, r) {
    // shard crown
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, l = r * (i % 2 ? 1.12 : 1.4);
      path(ctx, [[Math.cos(a - 0.14) * r * 0.55, Math.sin(a - 0.14) * r * 0.55], [Math.cos(a) * l, Math.sin(a) * l], [Math.cos(a + 0.14) * r * 0.55, Math.sin(a + 0.14) * r * 0.55]]);
      fillStroke(ctx, lg(ctx, 0, 0, Math.cos(a) * l, Math.sin(a) * l, [[0, '#2a6a8a'], [1, '#e6fbff']]), '#ffffff', 1.1);
    }
    // frosted ring
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, TAU); ctx.strokeStyle = '#bfefff'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = '#2a6a8a'; ctx.lineWidth = 2; ctx.stroke();
    // crystal body
    const pts = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + TAU / 12; pts.push([Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62]); }
    path(ctx, pts); fillStroke(ctx, lg(ctx, -r * 0.5, -r * 0.5, r * 0.5, r * 0.5, [[0, '#f4ffff'], [0.5, '#6fd0ef'], [1, '#1a5f84']]), '#ffffff', 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); pts.forEach(p => { ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); }); ctx.stroke();
    glow(ctx, 0, 0, r * 0.5, '#ffffff', 0.9);
    ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, TAU); ctx.fill();
  }
  function bossEclipse(ctx, r) {
    glow(ctx, 0, 0, r * 1.55, '#8a4dff', 0.5);
    // corona ring with segments
    ctx.lineWidth = 8; ctx.strokeStyle = '#b985ff';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#f0e0ff';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      path(ctx, [[Math.cos(a - 0.1) * r * 0.98, Math.sin(a - 0.1) * r * 0.98], [Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3], [Math.cos(a + 0.1) * r * 0.98, Math.sin(a + 0.1) * r * 0.98]]);
      fillStroke(ctx, '#3a1d7a', '#d9b8ff', 1.2);
    }
    // black core
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU);
    fillStroke(ctx, rg(ctx, -r * 0.2, -r * 0.2, 2, r * 0.9, [[0, '#2a1260'], [0.7, '#07030f'], [1, '#000000']]), '#7c3dff', 2.4);
    // eye
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.22, 0, 0, TAU); ctx.fillStyle = '#12052a'; ctx.fill(); ctx.strokeStyle = '#e0c8ff'; ctx.lineWidth = 2; ctx.stroke();
    glow(ctx, 0, 0, r * 0.4, '#d79bff', 0.95);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.1, r * 0.2, 0, 0, TAU); ctx.fill();
  }
  const BOSS_DRAW = { rockjaw: bossRockjaw, stormcaller: bossStorm, scrapper: bossScrapper, hivemother: bossHive, warden: bossWarden, eclipse: bossEclipse };
  function bossSprite(id) {
    const r = SpaceShooterData.BOSSES[id].radius;
    const size = Math.ceil(r * 3.4);
    return sprite(`boss:${id}`, size, size, (g) => BOSS_DRAW[id](g, r));
  }

  // ==========================================================================
  // PROJECTILES, PICKUPS, BACKDROPS
  // ==========================================================================
  const PROJ = {
    bolt:   (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 14, [[0, rgba(c, 0.55)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.fillStyle = lg(g, 0, -9, 0, 9, [[0, '#ffffff'], [0.5, c], [1, rgba(c, 0.4)]]); g.beginPath(); g.moveTo(0, -10); g.lineTo(2.6, 6); g.lineTo(-2.6, 6); g.closePath(); g.fill(); },
    tracer: (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 10, [[0, rgba(c, 0.5)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); g.fillStyle = lg(g, 0, -10, 0, 10, [[0, '#fff'], [0.4, c], [1, rgba(c, 0)]]); g.fillRect(-1.3, -10, 2.6, 20); },
    slug:   (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 20, [[0, rgba(c, 0.6)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill(); g.fillStyle = rg(g, -1, -2, 1, 8, [[0, '#ffffff'], [0.5, c], [1, shade(c, -0.4)]]); g.beginPath(); g.ellipse(0, 0, 6.5, 9, 0, 0, TAU); g.fill(); },
    lance:  (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 22, [[0, rgba(c, 0.55)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.fillStyle = lg(g, 0, -20, 0, 20, [[0, '#ffffff'], [0.3, c], [1, rgba(c, 0)]]); g.beginPath(); g.moveTo(0, -22); g.lineTo(4, 6); g.lineTo(0, 22); g.lineTo(-4, 6); g.closePath(); g.fill(); },
    missile:(g, c) => { g.fillStyle = rg(g, 0, 4, 0, 14, [[0, rgba(c, 0.5)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 4, 14, 0, TAU); g.fill(); g.fillStyle = '#e8e0ff'; g.fillRect(-2.5, -7, 5, 13); g.fillStyle = c; g.beginPath(); g.moveTo(0, -11); g.lineTo(3, -6); g.lineTo(-3, -6); g.closePath(); g.fill(); g.fillStyle = '#ffd9fb'; g.fillRect(-1.5, 6, 3, 4); },
    needle: (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 12, [[0, rgba(c, 0.45)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); g.fillStyle = lg(g, 0, -12, 0, 12, [[0, '#ffffff'], [0.5, c], [1, rgba(c, 0)]]); g.beginPath(); g.moveTo(0, -13); g.lineTo(1.8, 8); g.lineTo(-1.8, 8); g.closePath(); g.fill(); },
    orb:    (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 14, [[0, rgba(c, 0.75)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.fillStyle = rg(g, 0, 0, 0, 6, [[0, '#ffffff'], [0.7, c], [1, shade(c, -0.3)]]); g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); },
    ebolt:  (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 12, [[0, rgba(c, 0.6)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); g.fillStyle = lg(g, 0, -10, 0, 10, [[0, rgba(c, 0)], [0.5, c], [1, '#ffffff']]); g.beginPath(); g.moveTo(0, 10); g.lineTo(3, -7); g.lineTo(-3, -7); g.closePath(); g.fill(); },
    shard:  (g, c) => { g.fillStyle = rg(g, 0, 0, 0, 12, [[0, rgba(c, 0.5)], [1, rgba(c, 0)]]); g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); g.fillStyle = lg(g, 0, -10, 0, 10, [[0, '#ffffff'], [1, c]]); g.beginPath(); g.moveTo(0, 11); g.lineTo(4, -2); g.lineTo(0, -10); g.lineTo(-4, -2); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.stroke(); },
    rock:   (g, c) => { drawAsteroid(g, 9, c, 5, false); }
  };
  function projSprite(kind, color) {
    return sprite(`proj:${kind}:${color}`, 48, 48, (g) => PROJ[kind](g, color));
  }

  function pickupSprite(kind) {
    return sprite(`pick:${kind}`, 44, 44, (g) => {
      if (kind === 'coin') {
        glow(g, 0, 0, 20, '#ffd36b', 0.55);
        g.beginPath(); g.arc(0, 0, 10, 0, TAU); fillStroke(g, rg(g, -3, -3, 1, 11, [[0, '#fff2b0'], [0.6, '#ffc233'], [1, '#b87a0a']]), '#fff0b8', 1.4);
        g.beginPath(); g.arc(0, 0, 6.2, 0, TAU); g.strokeStyle = rgba('#7a4a00', 0.6); g.lineWidth = 1.2; g.stroke();
        g.fillStyle = '#7a4a00'; g.fillRect(-1, -4, 2, 8);
        return;
      }
      const p = SpaceShooterData.POWERUPS[kind];
      glow(g, 0, 0, 21, p.color, 0.6);
      g.beginPath(); g.arc(0, 0, 13, 0, TAU); fillStroke(g, rg(g, -3, -4, 2, 14, [[0, shade(p.color, 0.7)], [1, shade(p.color, -0.45)]]), '#ffffff', 1.8);
      g.strokeStyle = rgba('#ffffff', 0.5); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 9.5, 0, TAU); g.stroke();
      g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
      if (kind === 'rapid') {                       // double chevron
        [-3.5, 2.5].forEach(o => { g.beginPath(); g.moveTo(-4.5, o + 3); g.lineTo(0, o - 2); g.lineTo(4.5, o + 3); g.stroke(); });
      } else if (kind === 'spread') {               // three-way fan
        g.beginPath(); g.moveTo(0, 5); g.lineTo(0, -6); g.moveTo(0, 5); g.lineTo(-6, -4); g.moveTo(0, 5); g.lineTo(6, -4); g.stroke();
      } else if (kind === 'shield') {               // hexagon outline
        g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU - Math.PI / 2; g.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } g.closePath(); g.stroke();
      } else if (kind === 'health') {               // plus
        g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 6); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke();
      } else {                                      // charge: star
        g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 3 : 7; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
      }
    });
  }

  /** Seamless vertically tiling nebula + gradient backdrop for one sector. */
  function backdrop(sector, w, h) {
    return sprite(`bg:${sector.id}:${w}x${h}`, w, h, (g) => {
      g.translate(-w / 2, -h / 2);
      g.fillStyle = lg(g, 0, 0, 0, h, [[0, sector.bg[0]], [0.5, sector.bg[1]], [1, sector.bg[0]]]);
      g.fillRect(0, 0, w, h);
      const rnd = seeded(sector.id * 977);
      for (let i = 0; i < 10; i++) {
        const x = rnd() * w, y = rnd() * h, r = 90 + rnd() * 170, col = i % 3 === 0 ? sector.accent : sector.bg[2];
        [-h, 0, h].forEach(oy => {
          g.fillStyle = rg(g, x, y + oy, 0, r, [[0, rgba(col, i % 3 === 0 ? 0.22 : 0.8)], [1, rgba(col, 0)]]);
          g.fillRect(x - r, y + oy - r, r * 2, r * 2);
        });
      }
      // sector flavour bands
      g.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) {
        const y = rnd() * h, hh = 4 + rnd() * 12;
        g.fillStyle = rgba(sector.accent, 0.05 + rnd() * 0.05); g.fillRect(0, y, w, hh);
      }
      g.globalAlpha = 1;
    });
  }

  /** Large ship portrait for the hangar preview (animated by the caller). */
  function drawShipPreview(ctx, ship, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    const size = Math.min(w, h) * 0.78;
    const cx = w / 2, cy = h / 2 + Math.sin(t * 1.6) * 5;
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.6);
    g.addColorStop(0, rgba(ship.colors.glow, 0.28)); g.addColorStop(1, rgba(ship.colors.glow, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // orbit rings
    ctx.strokeStyle = rgba(ship.colors.glow, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.38, size * 0.55, size * 0.12, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.38, size * 0.42, size * 0.09, 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.scale(size / 100, size / 100);
    (ENGINES[ship.id] || []).forEach(e => drawFlame(ctx, e[0], e[1] - 2, 30, 5, ship.colors.glow, t));
    SHIP_DRAW[ship.id](ctx, ship.colors);
    ctx.restore();
  }

  return { TAU, safeCtx, hex, shade, rgba, glow, rg, lg, seeded, sprite, blit, shipSprite, drawFlame, ENGINES, enemySprite, bossSprite, projSprite, pickupSprite, backdrop, drawShipPreview, SHIP_DRAW, BOSS_DRAW, ENEMY_DRAW, drawAsteroid };
})();

/* ========================================================================== 4. GAME */
class SpaceShooterGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.width = 480;
    this.height = 640;
    this.storageKey = 'arcade_space_highscore';       // legacy high score, kept exactly as before

    const loaded = SpaceShooterSave.load();
    this.save = loaded.save;
    this.saveStatus = loaded.status;                  // 'new' | 'ok' | 'migrated' | 'corrupt' | 'unavailable'
    this.storageOk = loaded.status !== 'unavailable';
    this.highScore = this.save.stats.bestScore;

    this.state = 'MENU';                              // MENU | PLAYING | PAUSED | GAMEOVER
    this.screen = 'home';                             // home | hangar | upgrades | missions | milestones | pause | results
    this.hangarView = this.save.ships.selected;
    this.sectorView = 1;
    this.freeSectorId = 1;
    this.notice = '';
    this.lastResult = null;
    this.keys = {};
    this.pointer = { active: false, touch: false, x: 0, y: 0, startX: 0, startY: 0, shipX: 0, shipY: 0, firing: false };
    this.touchFire = false;
    this.animId = 0;
    this.previewId = 0;
    this.lastTs = 0;
    this.hudCache = {};
    this.reducedMotion = false;
    this.destroyed = false;
    this.fxFree = [];                                 // particle pool
    this.resetRun();

    this.stars = [];
    for (let i = 0; i < 70; i++) this.stars.push({ x: Math.random() * this.width, y: Math.random() * this.height, z: 0.3 + Math.random() * 0.9 });
    this.bgScroll = 0;

    this.boundLoop = () => this.loop();
    this.keydownHandler = (e) => this.handleKeyDown(e);
    this.keyupHandler = (e) => this.handleKeyUp(e);
    this.visibilityHandler = () => { if (typeof document !== 'undefined' && document.hidden && this.state === 'PLAYING') this.pause(); };
    this.pagehideHandler = () => { this.bankProgress(); };
  }

  /* ------------------------------------------------------------------ init / DOM */
  init() {
    this.container.innerHTML = `
      <div id="space-root" class="game-wrapper space-arcade ss-root ss-mode-menu">
        <div class="game-hud ss-hud">
          <div class="hud-stat"><span class="icon">🚀</span><span class="lbl">SCORE</span><span id="space-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🪙</span><span class="lbl">COINS</span><span id="space-coins" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🛡️</span><span class="lbl">SHIELD</span><span id="space-shield" class="val">3/3</span></div>
          <div class="hud-stat"><span class="icon">🌌</span><span class="lbl">SECTOR</span><span id="space-wave" class="val">1-1</span></div>
          <div class="hud-controls-bar">
            <button id="space-btn-pause" class="arcade-hud-btn" title="Pause Game (P)" aria-label="Pause game">⏸️</button>
            <button id="space-btn-restart" class="arcade-hud-btn" title="Restart mission" aria-label="Restart mission">🔄</button>
          </div>
        </div>
        <div class="canvas-container ss-stage">
          <canvas id="space-canvas" class="ss-canvas" width="${this.width}" height="${this.height}" aria-label="Space Shooter game screen" role="img"></canvas>
          <div id="space-layer" class="ss-layer">
            <div id="space-screen" class="ss-screen"></div>
            <div id="space-dock" class="ss-dock">
              <span id="space-dock-coins" class="ss-dock-coins"></span>
              <button id="space-btn-play" class="arcade-btn-primary ss-play" type="button">LAUNCH</button>
              <span id="space-dock-note" class="ss-dock-note"></span>
            </div>
          </div>
        </div>
        <div class="space-mobile-controls ss-touch" id="space-touch">
          <button class="ss-touch-btn ss-touch-fire" id="sp-btn-fire" type="button" aria-label="Fire (hold)">FIRE</button>
          <button class="ss-touch-btn ss-touch-ability" id="sp-btn-ability" type="button" aria-label="Use special ability"><span id="sp-ability-name">ABILITY</span><i id="sp-ability-fill" class="ss-ability-fill"></i></button>
        </div>
      </div>
    `;

    this.root = this.container.querySelector('#space-root');
    this.canvas = this.container.querySelector('#space-canvas');
    this.ctx = SpaceShooterArt.safeCtx(this.canvas.getContext('2d'));
    this.scoreEl = this.container.querySelector('#space-score');
    this.coinsEl = this.container.querySelector('#space-coins');
    this.shieldEl = this.container.querySelector('#space-shield');
    this.waveEl = this.container.querySelector('#space-wave');
    this.layer = this.container.querySelector('#space-layer');
    this.screenEl = this.container.querySelector('#space-screen');
    this.dockEl = this.container.querySelector('#space-dock');
    this.dockNote = this.container.querySelector('#space-dock-note');
    this.dockCoins = this.container.querySelector('#space-dock-coins');
    this.btnPlay = this.container.querySelector('#space-btn-play');
    this.btnPause = this.container.querySelector('#space-btn-pause');
    this.btnRestart = this.container.querySelector('#space-btn-restart');
    this.btnFire = this.container.querySelector('#sp-btn-fire');
    this.btnAbility = this.container.querySelector('#sp-btn-ability');
    this.abilityFill = this.container.querySelector('#sp-ability-fill');
    this.abilityName = this.container.querySelector('#sp-ability-name');

    try { this.reducedMotion = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { this.reducedMotion = false; }

    // The big button is the single primary action: launch, resume or retry depending on the screen
    this.btnPlay.addEventListener('click', () => {
      this.sfx('playClick');
      this.primaryAction();
    });
    this.btnPause.addEventListener('click', () => { if (this.state === 'PLAYING') this.pause(); });
    this.btnRestart.addEventListener('click', () => { if (this.state !== 'MENU') this.restart(); else this.start(); });

    // Every other button on the DOM screens is handled by one delegated listener
    this.screenEl.addEventListener('click', (e) => {
      const t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (t && !t.disabled) this.handleAction(t.getAttribute('data-act'), t.getAttribute('data-id'));
    });

    // pointer / touch flight controls on the canvas
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('pointerleave', (e) => { if (!this.pointer.touch) this.pointer.firing = false; });
    this.canvas.addEventListener('contextmenu', (e) => { if (e.preventDefault) e.preventDefault(); });

    // on-screen buttons for phones
    const holdOn = (e) => { if (e.preventDefault) e.preventDefault(); this.touchFire = true; };
    const holdOff = () => { this.touchFire = false; };
    this.btnFire.addEventListener('pointerdown', holdOn);
    this.btnFire.addEventListener('pointerup', holdOff);
    this.btnFire.addEventListener('pointercancel', holdOff);
    this.btnFire.addEventListener('pointerleave', holdOff);
    this.btnAbility.addEventListener('pointerdown', (e) => { if (e.preventDefault) e.preventDefault(); this.useAbility(); });

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('pagehide', this.pagehideHandler);
    if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', this.visibilityHandler);

    this.showScreen('home');
    this.render();
  }

  sfx(name, a, b) {
    try { if (this.sound && typeof this.sound[name] === 'function') this.sound[name](a, b); } catch (e) { /* audio must never break the game */ }
  }

  /* ------------------------------------------------------------------ player data & economy */
  persist() {
    const m = this.save.missions, cur = m.current;
    if (cur === 'free' && this.campaignMission) m.current = this.campaignMission;   // free flight is a temporary pointer
    this.storageOk = SpaceShooterSave.write(this.save);
    m.current = cur;
    return this.storageOk;
  }
  ship(id) { return SpaceShooterData.SHIPS.find(s => s.id === (id || this.save.ships.selected)) || SpaceShooterData.SHIPS[0]; }
  owns(id) { return this.save.ships.owned.indexOf(id) >= 0; }
  upgradeLevel(id) { return this.save.upgrades[id] || 0; }
  upgradeDef(id) { return SpaceShooterData.UPGRADES.find(u => u.id === id); }
  upgradeCost(id) { const u = this.upgradeDef(id); const l = this.upgradeLevel(id); return !u || l >= u.max ? null : u.costs[l]; }

  /** Final numbers for a ship with the player's upgrades applied. Used by the HUD, the hangar and the engine. */
  getStats(shipId) {
    const ship = this.ship(shipId);
    const u = this.save.upgrades;
    const D = SpaceShooterData;
    const volley = { vanguard: 2.0, striker: 1.0, bulwark: 2.9, nova: 2.2, phantom: 1.95 }[ship.id] || 1;
    const damage = ship.damage * (1 + 0.12 * u.damage);
    const fireRate = ship.fireRate * (1 + 0.08 * u.fireRate);
    return {
      maxShield: ship.shield + [0, 1, 1, 2, 2, 3][u.shield],
      speed: ship.speed * (1 + 0.06 * u.speed),
      fireRate, damage,
      dps: volley * damage * fireRate,
      abilityCd: ship.ability.cooldown * (1 - 0.07 * u.ability),
      abilityPower: 1 + 0.10 * u.ability,
      regen: u.shield >= 5 ? 8 : (u.shield >= 3 ? 12 : 0)
    };
  }

  buyShip(id) {
    const ship = SpaceShooterData.SHIPS.find(s => s.id === id);
    if (!ship) return { ok: false, reason: 'unknown' };
    if (this.owns(id)) return { ok: false, reason: 'owned' };
    if (this.save.coins < ship.cost) return { ok: false, reason: 'coins', need: ship.cost - this.save.coins };
    this.save.coins -= ship.cost;
    this.save.ships.owned.push(id);
    this.save.ships.selected = id;                    // a new ship is equipped straight away
    this.checkAchievements();
    this.persist();
    return { ok: true };
  }
  selectShip(id) {
    if (!SpaceShooterData.SHIPS.some(s => s.id === id)) return { ok: false, reason: 'unknown' };
    if (!this.owns(id)) return { ok: false, reason: 'locked' };   // locked ships can never be equipped
    this.save.ships.selected = id;
    this.persist();
    return { ok: true };
  }
  buyUpgrade(id) {
    const u = this.upgradeDef(id);
    if (!u) return { ok: false, reason: 'unknown' };
    const cost = this.upgradeCost(id);
    if (cost === null) return { ok: false, reason: 'max' };
    if (this.save.coins < cost) return { ok: false, reason: 'coins', need: cost - this.save.coins };
    this.save.coins -= cost;
    this.save.upgrades[id] += 1;
    this.checkAchievements();
    this.persist();
    return { ok: true, level: this.save.upgrades[id] };
  }
  missionUnlocked(id) { return id === 'free' || SpaceShooterSave.isUnlocked(this.save, id); }
  selectMission(id) {
    if (!SpaceShooterSave.missionById(id)) return { ok: false, reason: 'unknown' };
    if (!this.missionUnlocked(id)) return { ok: false, reason: 'locked' };
    this.save.missions.current = id;
    this.persist();
    return { ok: true };
  }
  highestSector() {
    let s = 1;
    for (let i = 1; i <= 6; i++) if (SpaceShooterSave.sectorUnlocked(this.save, i)) s = i;
    return s;
  }

  achStat(key) {
    const st = this.save.stats, up = this.save.upgrades;
    switch (key) {
      case 'shipsOwned': return this.save.ships.owned.length;
      case 'upgradeLevels': return Object.keys(up).reduce((a, k) => a + up[k], 0);
      case 'maxedUpgrades': return SpaceShooterData.UPGRADES.filter(u => up[u.id] >= u.max).length;
      case 'uniqueBosses': return st.bosses.length;
      default: return st[key] || 0;
    }
  }
  /** Unlocks every achievement whose target is met and pays its coin reward. Returns the newly unlocked ones. */
  checkAchievements() {
    const fresh = [];
    SpaceShooterData.ACHIEVEMENTS.forEach(a => {
      if (this.save.achievements[a.id]) return;
      if (this.achStat(a.stat) >= a.target) {
        this.save.achievements[a.id] = Date.now();
        this.save.coins += a.reward;
        fresh.push(a);
      }
    });
    return fresh;
  }

  /** Adds the not-yet-banked part of the current run to the permanent save. Safe to call repeatedly. */
  bankProgress() {
    const r = this.run;
    if (!r || !r.banked || r.over) return;
    const b = r.banked, st = this.save.stats;
    const d = { coins: r.coins - b.coins, kills: r.kills - b.kills, elites: r.elites - b.elites, powerups: r.powerups - b.powerups, bossKills: r.bossKills - b.bossKills, time: r.time - b.time };
    if (d.coins <= 0 && d.kills <= 0 && d.powerups <= 0 && d.bossKills <= 0 && d.time < 1) return;
    this.save.coins += d.coins; st.coinsEarned += d.coins;
    st.kills += d.kills; st.elites += d.elites; st.powerups += d.powerups; st.bossKills += d.bossKills;
    st.playSeconds += Math.floor(d.time);
    b.coins = r.coins; b.kills = r.kills; b.elites = r.elites; b.powerups = r.powerups; b.bossKills = r.bossKills; b.time = r.time - (d.time - Math.floor(d.time));
    st.bestCombo = Math.max(st.bestCombo, r.maxCombo);
    st.bestTime = Math.max(st.bestTime, Math.floor(r.time));
    if (this.score > st.bestScore) { st.bestScore = this.score; this.highScore = this.score; SpaceShooterSave.writeHighScore(this.score); }
    this.persist();
  }

  /* ------------------------------------------------------------------ lifecycle */
  primaryAction() {
    if (this.state === 'PAUSED') this.resume();
    else if (this.state === 'GAMEOVER') this.afterResultsPrimary();
    else this.start();
  }

  /** Starts a fresh run of the currently selected mission. */
  start() {
    cancelAnimationFrame(this.animId);
    this.stopPreview();
    this.beginRun();
    this.state = 'PLAYING';
    this.keys = {};
    this.pointer.active = false; this.pointer.firing = false;      // a mouse resting on the canvas must not steer a new run
    this.setMode('play');
    this.updateHud(true);
    this.bringIntoView();
    this.lastTs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.render();
    this.animId = requestAnimationFrame(this.boundLoop);
  }
  restart() { this.start(); }

  /** On phones the game sits below the site header: bring it fully on screen when a run starts. */
  bringIntoView() {
    try {
      if (this.root && this.root.scrollIntoView && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
        this.root.scrollIntoView({ block: 'start', behavior: this.reducedMotion ? 'auto' : 'smooth' });
      }
    } catch (e) { /* purely cosmetic */ }
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    cancelAnimationFrame(this.animId);
    this.keys = {};
    this.pointer.firing = false; this.pointer.active = false; this.touchFire = false;
    this.bankProgress();                              // progress survives a refresh while paused
    this.showScreen('pause');
    this.setMode('overlay');
  }

  /** Continues the paused run exactly where it stopped: no state is reset, only the clock reference. */
  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.setMode('play');
    this.lastTs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(this.boundLoop);
  }

  loop() {
    if (this.state !== 'PLAYING') return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let dt = (now - this.lastTs) / 1000;
    this.lastTs = now;
    if (!(dt > 0)) dt = 0;
    this.update(Math.min(dt, 0.05));                  // clamped so a lag spike never teleports anything
    if (this.state === 'PLAYING') this.render();
    if (this.state === 'PLAYING') this.animId = requestAnimationFrame(this.boundLoop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animId);
    this.stopPreview();
    if (this.state === 'PLAYING' || this.state === 'PAUSED') this.bankProgress();
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('pagehide', this.pagehideHandler);
    if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.state = 'PAUSED';
  }

  /* ------------------------------------------------------------------ input */
  handleKeyDown(e) {
    if (this.destroyed) return;
    const key = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (e.repeat) return;                           // holding the key must not toggle pause again
      if (this.state === 'PLAYING') this.pause();
      else if (this.state === 'PAUSED') this.resume();
      return;
    }
    if (this.state !== 'PLAYING') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].indexOf(key) >= 0 && e.preventDefault) e.preventDefault();
    if (key === 'Shift' || key === 'e' || key === 'q') { if (!e.repeat) this.useAbility(); return; }
    this.keys[key] = true;
    this.pointer.active = this.pointer.touch ? this.pointer.active : false;   // keyboard takes over from the mouse
  }
  handleKeyUp(e) {
    const key = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.keys[key] = false;
  }
  canvasPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.width / (rect.width || this.width), sy = this.height / (rect.height || this.height);
    return { x: ((e.clientX || 0) - rect.left) * sx, y: ((e.clientY || 0) - rect.top) * sy };
  }
  onPointerDown(e) {
    if (this.state !== 'PLAYING') return;
    const pt = this.canvasPoint(e), p = this.pointer;
    p.touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    p.active = true; p.x = pt.x; p.y = pt.y; p.startX = pt.x; p.startY = pt.y;
    p.shipX = this.player.x; p.shipY = this.player.y;
    p.firing = true;
    try { if (this.canvas.setPointerCapture && e.pointerId !== undefined) this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
    if (e.preventDefault) e.preventDefault();
  }
  onPointerMove(e) {
    if (this.state !== 'PLAYING') return;
    const pt = this.canvasPoint(e), p = this.pointer;
    if (e.pointerType === 'mouse') { p.touch = false; p.active = true; }
    if (p.active) { p.x = pt.x; p.y = pt.y; }
  }
  onPointerUp(e) {
    const p = this.pointer;
    p.firing = false;
    if (p.touch) p.active = false;
  }
  setMode(mode) {
    if (!this.root) return;
    this.root.className = `game-wrapper space-arcade ss-root ss-mode-${mode}`;
  }

  /* ------------------------------------------------------------------ run setup */
  resetRun() {
    this.time = 0;                                    // the game clock: only advances while PLAYING
    this.score = 0;
    this.lasers = [];                                 // player projectiles
    this.enemies = [];
    this.ebullets = [];                               // enemy projectiles
    this.pickups = [];
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.telegraphs = [];                             // delayed hazards with a visible warning
    this.zones = [];                                  // lightning strikes
    this.beams = [];
    this.wells = [];
    this.banners = [];
    this.boss = null;
    this.shake = 0;
    this.hurtFlash = 0;
    this.sfxClock = { laser: 0, hit: 0, coin: 0 };
    this.player = {
      x: this.width / 2, y: this.height - 90, vx: 0, vy: 0, r: 13,
      shield: 3, maxShield: 3, invuln: 0, cooldown: 0, abilityCd: 0, alt: 0, volley: 0,
      rapid: 0, spread: 0, oshield: 0, ab: 0, aegis: 0, phase: 0, regenT: 0, dead: false, tilt: 0
    };
    this.run = null;
  }

  beginRun() {
    const D = SpaceShooterData;
    this.resetRun();
    let m = SpaceShooterSave.missionById(this.save.missions.current) || D.MISSIONS[0];
    if (!this.missionUnlocked(m.id)) m = D.MISSIONS[0];
    this.mission = m;
    this.sector = m.id === 'free' ? D.SECTORS[this.freeSectorId - 1] : D.SECTORS[m.sector - 1];
    const stats = this.stats = this.getStats();
    const idx = m.id === 'free' ? 3 : m.index;
    this.diff = { hp: this.sector.hp * (1 + (idx - 1) * 0.06), fire: this.sector.fire * (1 + (idx - 1) * 0.05), speed: this.sector.speed || 1, spawn: 1 - (idx - 1) * 0.05 };
    const p = this.player;
    p.maxShield = stats.maxShield; p.shield = stats.maxShield; p.invuln = 1.6;
    p.abilityCd = stats.abilityCd * 0.4;
    this.run = {
      time: 0, kills: 0, killsBy: {}, elites: 0, powerups: 0, coins: 0, damageTaken: 0, combo: 0, comboTimer: 0, maxCombo: 0,
      bossKills: 0, spawnTimer: 1.0, hazardTimer: 7, addTimer: 5, bossAt: 34, bossSpawned: false, bossWarned: false,
      victory: false, endTimer: 0, over: false,
      banked: { coins: 0, kills: 0, elites: 0, powerups: 0, bossKills: 0, time: 0 }
    };
    this.addBanner(this.sector.name.toUpperCase(), m.id === 'free' ? 'Free flight: survive and score' : `Sector ${m.sector} · ${m.title}`, this.sector.accent, 2.6);
  }

  addBanner(text, sub, color, dur) {
    this.banners.push({ text, sub: sub || '', color: color || '#ffffff', t: 0, dur: dur || 2.2 });
    if (this.banners.length > 3) this.banners.shift();
  }

  /* ------------------------------------------------------------------ main update (dt in seconds) */
  update(dt) {
    if (this.state !== 'PLAYING') return;             // a paused game advances nothing: no timers, no spawns, no particles
    const r = this.run;
    this.time += dt;
    r.time += dt;
    this.bgScroll = (this.bgScroll + dt * 40 * (this.mission.id === 'free' ? 1 : 1)) % this.height;

    this.updatePlayer(dt);
    this.director(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateHazards(dt);
    this.updateLasers(dt);
    this.updateEnemyBullets(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.updateRun(dt);
    this.updateHud(false);
  }

  /* ------------------------------------------------------------------ player */
  updatePlayer(dt) {
    const p = this.player, st = this.stats, k = this.keys, W = this.width, H = this.height;
    p.invuln = Math.max(0, p.invuln - dt);
    p.cooldown = Math.max(-dt, p.cooldown - dt);                 // keep at most one frame of carry-over so fire rate does not depend on frame rate
    p.abilityCd = Math.max(0, p.abilityCd - dt);
    p.rapid = Math.max(0, p.rapid - dt); p.spread = Math.max(0, p.spread - dt); p.oshield = Math.max(0, p.oshield - dt);
    p.ab = Math.max(0, p.ab - dt); p.aegis = Math.max(0, p.aegis - dt); p.phase = Math.max(0, p.phase - dt);
    if (p.dead) return;

    if (st.regen && p.shield < p.maxShield) {
      p.regenT += dt;
      if (p.regenT >= st.regen) { p.regenT = 0; p.shield++; this.addText(p.x, p.y - 26, '+1 SHIELD', '#6fd0ff', 13); this.updateHud(true); }
    }

    const ice = this.sector.hazardKey === 'ice';
    const speed = st.speed * (p.ab > 0 ? 1.5 : 1);
    let ax = 0, ay = 0;
    if (k.ArrowLeft || k.a) ax -= 1;
    if (k.ArrowRight || k.d) ax += 1;
    if (k.ArrowUp || k.w) ay -= 1;
    if (k.ArrowDown || k.s) ay += 1;
    let dvx = 0, dvy = 0, steering = false;
    if (ax || ay) {
      const len = Math.hypot(ax, ay);
      dvx = ax / len * speed; dvy = ay / len * speed; steering = true;
    } else if (this.pointer.active) {
      const q = this.pointer;
      const tx = q.touch ? q.shipX + (q.x - q.startX) : q.x;
      const ty = q.touch ? q.shipY + (q.y - q.startY) : q.y - 18;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d > 1.5) {
        const want = Math.min(speed * 1.8, d * 9);
        dvx = dx / d * want; dvy = dy / d * want; steering = true;
      }
    }
    const resp = steering ? (ice ? 4.2 : 16) : (ice ? 1.3 : 12);
    const f = Math.min(1, resp * dt);
    p.vx += (dvx - p.vx) * f; p.vy += (dvy - p.vy) * f;

    // gravity wells (sector 6 and the Eclipse) bend the flight path
    for (let i = 0; i < this.wells.length; i++) {
      const w = this.wells[i], dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < w.pull) { const s = (1 - d / w.pull) * 330; p.vx += dx / d * s * dt; p.vy += dy / d * s * dt; }
      if (d < 20 && p.invuln <= 0) this.hitPlayer(1, 'well');
    }

    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = Math.max(p.r + 4, Math.min(W - p.r - 4, p.x));
    p.y = Math.max(H * 0.3, Math.min(H - p.r - 10, p.y));
    p.tilt += ((p.vx / (speed || 1)) - p.tilt) * Math.min(1, 10 * dt);

    const firing = k[' '] || k.Enter || this.pointer.firing || this.touchFire || (this.pointer.touch && this.pointer.active);
    if (firing && p.cooldown <= 0) this.shoot();

    // engine trail (cheap: at most one particle per frame per engine)
    if (!this.reducedMotion && this.particles.length < 260) {
      const col = this.ship().colors.glow;
      this.addFx(p.x + (Math.random() - 0.5) * 6, p.y + p.r + 6, (Math.random() - 0.5) * 12, 90 + Math.random() * 60, 0.28, 2.2, col);
    }
  }

  /** Fires one volley according to the active ship. Returns false while the weapon is still cooling down. */
  shoot() {
    const p = this.player, st = this.stats || this.getStats();
    if (p.cooldown > 0 || p.dead) return false;
    const ship = this.ship(), col = ship.colors.glow;
    const rate = st.fireRate * (p.rapid > 0 ? 1.65 : 1) * (p.ab > 0 ? 1.5 : 1);
    p.cooldown += 1 / rate;
    const dm = st.damage * (p.phase > 0 ? 1.6 : 1);
    const x = p.x, y = p.y - p.r;
    switch (ship.id) {
      case 'striker':
        p.alt = p.alt ? 0 : 1;
        this.addShot(x + (p.alt ? 9 : -9), y + 8, 0, 880, { dmg: 1.0 * dm, kind: 'tracer', color: col, r: 4 });
        break;
      case 'bulwark':
        this.addShot(x, y - 4, 0, 560, { dmg: 2.0 * dm, kind: 'slug', color: col, r: 9, splash: 40 });
        this.addShot(x - 24, y + 12, -0.05, 700, { dmg: 0.5 * dm, kind: 'bolt', color: '#d8ff8a', r: 4 });
        this.addShot(x + 24, y + 12, 0.05, 700, { dmg: 0.5 * dm, kind: 'bolt', color: '#d8ff8a', r: 4 });
        break;
      case 'nova':
        this.addShot(x, y - 8, 0, 780, { dmg: 1.5 * dm, kind: 'lance', color: col, r: 6, pierce: 2 });
        p.volley++;
        if (p.volley % 3 === 0) {
          this.addShot(x - 16, y + 10, -0.35, 380, { dmg: 1.0 * dm, kind: 'missile', color: '#ff9bf0', r: 6, homing: 4.8, splash: 26, life: 2.6 });
          this.addShot(x + 16, y + 10, 0.35, 380, { dmg: 1.0 * dm, kind: 'missile', color: '#ff9bf0', r: 6, homing: 4.8, splash: 26, life: 2.6 });
        }
        break;
      case 'phantom':
        [-0.11, 0, 0.11].forEach(a => this.addShot(x + a * 60, y + 2, a, 900, { dmg: 0.65 * dm, kind: 'needle', color: col, r: 4, crit: 0.18 }));
        break;
      default:
        this.addShot(x - 10, y + 4, 0, 760, { dmg: 1.0 * dm, kind: 'bolt', color: col, r: 5 });
        this.addShot(x + 10, y + 4, 0, 760, { dmg: 1.0 * dm, kind: 'bolt', color: col, r: 5 });
    }
    if (p.spread > 0) {                               // spread power-up adds a fan on every ship
      [-0.42, -0.21, 0.21, 0.42].forEach(a => this.addShot(x + a * 40, y + 8, a, 720, { dmg: 0.55 * dm, kind: 'bolt', color: '#7dff9a', r: 4 }));
    }
    if (this.time - this.sfxClock.laser > 0.09) { this.sfxClock.laser = this.time; this.sfx('playLaser'); }
    if (!this.reducedMotion) this.addFx(x, y, 0, -40, 0.12, 5, col);
    return true;
  }

  addShot(x, y, angle, speed, o) {
    if (this.lasers.length >= 140) return null;
    const b = {
      x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, dmg: o.dmg, r: o.r || 5, kind: o.kind, color: o.color,
      pierce: o.pierce || 0, hit: null, homing: o.homing || 0, splash: o.splash || 0, crit: o.crit || 0, life: o.life || 2.4
    };
    this.lasers.push(b);
    if (this.run) this.run.shots = (this.run.shots || 0) + 1;
    return b;
  }

  useAbility() {
    const p = this.player, st = this.stats;
    if (this.state !== 'PLAYING' || p.dead || p.abilityCd > 0) return false;
    const ship = this.ship(), pow = st.abilityPower, col = ship.colors.glow;
    switch (ship.ability.id) {
      case 'pulse': {
        this.addRing(p.x, p.y, 360, col, 0.7, 6);
        this.addRing(p.x, p.y, 240, '#ffffff', 0.5, 3);
        const n = this.ebullets.length;
        for (let i = 0; i < n; i++) { const b = this.ebullets[i]; this.addFx(b.x, b.y, 0, 0, 0.3, 4, '#ffffff'); b.life = 0; }
        this.enemies.forEach(e => { if (!e.dead) this.damageEnemy(e, 5 * pow * st.damage, false); });
        if (this.boss && this.boss.state === 'fight') this.damageBoss(14 * pow * st.damage, false);
        this.addShake(0.7); this.sfx('playBombExplosion');
        break;
      }
      case 'afterburner': p.ab = 4 * pow; this.addRing(p.x, p.y, 120, col, 0.4, 4); this.sfx('playPowerup'); break;
      case 'aegis': p.aegis = 4.5 * pow; this.addRing(p.x, p.y, 90, col, 0.4, 4); this.sfx('playPowerup'); break;
      case 'novaburst': {
        const count = 28;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          this.addShot(p.x, p.y, a, 620, { dmg: 3.2 * pow * st.damage, kind: 'lance', color: col, r: 7, pierce: 99, life: 1.5 });
        }
        this.addRing(p.x, p.y, 200, col, 0.6, 5); this.addShake(0.45); this.sfx('playBombExplosion');
        break;
      }
      case 'phase': p.phase = 3 * pow; this.addRing(p.x, p.y, 110, col, 0.4, 3); this.sfx('playPowerup'); break;
    }
    p.abilityCd = st.abilityCd;
    this.addText(p.x, p.y - 34, ship.ability.name.toUpperCase(), col, 14);
    this.updateHud(true);
    return true;
  }

  /* ------------------------------------------------------------------ director (spawning) */
  pickEnemyType() {
    const pool = this.sector.pool, t = this.run ? this.run.time : 0;
    let total = 0;
    const names = Object.keys(pool);
    for (let i = 0; i < names.length; i++) if (pool[names[i]][1] <= t) total += pool[names[i]][0];
    let roll = Math.random() * total;
    for (let i = 0; i < names.length; i++) {
      const w = pool[names[i]];
      if (w[1] > t) continue;
      roll -= w[0];
      if (roll <= 0) return names[i];
    }
    return 'drone';
  }

  eliteChance() {
    const r = this.run; if (!r) return 0;
    const s = this.sector;
    const ramp = Math.min(1, r.time / 45);
    return ramp * (0.035 + 0.022 * (s.id - 1) + (s.eliteBoost || 0));
  }

  director(dt) {
    const r = this.run, m = this.mission, p = this.player;
    if (r.victory || p.dead) return;
    if (m.boss && !r.bossWarned && r.time >= r.bossAt - 3.5) {
      r.bossWarned = true;
      this.addBanner('WARNING', 'Massive signature approaching', '#ff5a5a', 3);
      this.dropPowerup(this.width / 2, -16, 'health');                       // supply drop before every boss
      this.sfx('playLose');
    }
    if (m.boss && !r.bossSpawned && r.time >= r.bossAt) this.spawnBoss();
    if (this.boss) {                                  // light reinforcements during the boss fight
      if (this.boss.state === 'fight') {
        r.addTimer -= dt;
        if (r.addTimer <= 0) { r.addTimer = 6.5; if (this.enemies.length < 6) this.spawnEnemy(Math.random() < 0.5 ? 'drone' : 'weaver', { elite: false }); }
      }
      return;
    }
    if (m.boss && r.time > r.bossAt - 4) return;      // calm before the boss
    r.spawnTimer -= dt;
    if (r.spawnTimer <= 0) {
      this.spawnEnemy();
      const ramp = Math.max(m.id === 'free' ? 0.35 : 0.55, 1 - r.time / (m.id === 'free' ? 240 : 320));
      r.spawnTimer = this.sector.spawn * this.diff.spawn * ramp * (0.7 + Math.random() * 0.6);
    }
    // each sector has its own signature hazard on a timer
    r.hazardTimer -= dt;
    if (r.hazardTimer <= 0) { r.hazardTimer = this.spawnHazard(); }
  }

  /** Spawns the sector hazard and returns the delay until the next one. */
  spawnHazard() {
    const W = this.width, key = this.sector.hazardKey, r = this.run;
    switch (key) {
      case 'rocks': {                                 // a short line of rocks
        const x0 = 60 + Math.random() * (W - 240);
        for (let i = 0; i < 4; i++) this.spawnEnemy('asteroid', { x: x0 + i * 60, y: -30 - i * 24, elite: false });
        return 13;
      }
      case 'storm': {
        const n = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) this.addStrike(40 + Math.random() * (W - 80), 62, 1.1, '#9fd4ff');
        return 8;
      }
      case 'debris': {
        const fromLeft = Math.random() < 0.5;
        for (let i = 0; i < 3; i++) this.spawnEnemy('asteroid', { x: fromLeft ? -20 : W + 20, y: 40 + i * 70, vx: (fromLeft ? 1 : -1) * (70 + Math.random() * 40), debris: true, elite: false });
        return 12;
      }
      case 'swarm': {                                 // a V formation of drones
        const cx = 120 + Math.random() * (W - 240);
        for (let i = -3; i <= 3; i++) this.spawnEnemy('drone', { x: cx + i * 38, y: -20 - Math.abs(i) * 30, elite: false });
        return 12;
      }
      case 'ice': {
        for (let i = 0; i < 3; i++) this.addStrike(30 + Math.random() * (W - 60), 28, 1.2, '#bfefff', true);
        return 8;
      }
      case 'void': {
        if (this.wells.length < 1) this.wells.push({ x: 90 + Math.random() * (W - 180), y: 150 + Math.random() * 200, r: 22, pull: 200, t: 0, dur: 8 });
        return 14;
      }
    }
    return 15;
  }

  spawnEnemy(type, opts) {
    opts = opts || {};
    const D = SpaceShooterData, W = this.width;
    const def = type ? D.ENEMIES[type] : D.ENEMIES[this.pickEnemyType()];
    if (this.enemies.length >= 30) return null;
    const run = this.run;
    const diff = this.diff || { hp: 1, fire: 1, speed: 1 };
    const isAst = def.id === 'asteroid';
    const elite = opts.elite !== undefined ? opts.elite : (!isAst && Math.random() < this.eliteChance());
    let radius = def.radius * (elite ? 1.2 : 1);
    if (isAst) radius = opts.radius || (18 + Math.round(Math.random() * 3) * 4);
    const hpMul = diff.hp * (1 + (run ? run.time / (this.mission && this.mission.id === 'free' ? 200 : 700) : 0));
    const baseHp = isAst ? Math.max(1, Math.round(radius / 7)) * (opts.debris ? 1.7 : 1) : def.hp;
    const hp = Math.max(1, Math.round(baseHp * hpMul * (elite ? 2.4 : 1) * 10) / 10);
    const x = opts.x !== undefined ? opts.x : radius + 12 + Math.random() * (W - 2 * radius - 24);
    const e = {
      type: def.id, def, x, y: opts.y !== undefined ? opts.y : -radius - 8, baseX: x, vx: opts.vx || 0, vy: 0, r: radius,
      hp, maxHp: hp, age: 0, elite, flash: 0, phase: Math.random() * 6.28, rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 2,
      fireT: 0.8 + Math.random() * 1.4, state: 0, stateT: 0, holdY: 90 + Math.random() * 70, heading: Math.PI / 2, spd: diff.speed,
      variant: opts.debris ? 'debris' : 0, dead: false, spawned: 0
    };
    if (isAst) { e.vx = opts.vx !== undefined ? opts.vx : (Math.random() - 0.5) * 50; e.vy = def.speed * (0.8 + Math.random() * 0.5) * diff.speed; }
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const D = SpaceShooterData, id = this.sector.boss, def = D.BOSSES[id], r = this.run;
    r.bossSpawned = true;
    const hp = def.hp;
    this.boss = {
      id, def, x: this.width / 2, y: -def.radius - 40, ty: 120 + def.radius * 0.3, r: def.radius, hp, maxHp: hp, state: 'enter', t: 0, phase: 1,
      flash: 0, stun: 0, tA: 2.2, tB: 4.0, tC: 6.0, spin: 0, burst: 0, mode: 0, modeT: 0, hitFlash: 0, dive: null, dx: 0, dead: false
    };
    this.addBanner(def.name.toUpperCase(), def.title, def.color, 3);
    this.sfx('playLose');
  }

  /* ------------------------------------------------------------------ helpers */
  aim(x, y) { return Math.atan2(this.player.y - y, this.player.x - x); }
  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  fireBullet(x, y, angle, speed, o) {
    if (this.ebullets.length >= 320) return null;
    o = o || {};
    const bs = 1 + ((this.diff ? this.diff.fire : 1) - 1) * 0.45;       // later sectors shoot faster bolts
    const b = {
      x, y, vx: Math.cos(angle) * speed * bs, vy: Math.sin(angle) * speed * bs, r: o.r || 5, kind: o.kind || 'orb',
      color: o.color || '#ff5a7a', dmg: o.dmg || 1, life: o.life || 7, homing: o.homing || 0, rot: 0
    };
    this.ebullets.push(b);
    return b;
  }
  radial(x, y, n, speed, offset, o) { for (let i = 0; i < n; i++) this.fireBullet(x, y, offset + (i / n) * Math.PI * 2, speed, o); }
  clearEnemyBullets() {
    for (let i = 0; i < this.ebullets.length; i++) { const b = this.ebullets[i]; this.addFx(b.x, b.y, 0, 0, 0.25, 3, '#ffffff'); b.life = 0; }
  }
  compact(list, alive) {
    let w = 0;
    for (let i = 0; i < list.length; i++) if (alive(list[i])) list[w++] = list[i];
    list.length = w;
  }

  /* ------------------------------------------------------------------ enemies */
  updateEnemies(dt) {
    this.compact(this.enemies, (e) => !e.dead);
    const W = this.width, H = this.height, fm = this.diff.fire;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i], def = e.def, spd = e.spd;
      e.age += dt; e.flash = Math.max(0, e.flash - dt);
      switch (e.type) {
        case 'drone':
          e.y += def.speed * spd * dt;
          e.x = e.baseX + Math.sin(e.age * 2.2 + e.phase) * 28;
          break;
        case 'weaver':
          e.y += 70 * spd * dt;
          e.x = this.clamp(e.baseX + Math.sin(e.age * 1.7 + e.phase) * 95, e.r, W - e.r);
          e.fireT -= dt;
          if (e.fireT <= 0 && e.y > 20 && e.y < H * 0.62 && !this.player.dead) {
            e.fireT = (2.6 / fm) * (e.elite ? 0.7 : 1);
            this.fireBullet(e.x, e.y + e.r, this.aim(e.x, e.y), 230, { kind: 'ebolt', color: def.color });
          }
          break;
        case 'kamikaze':
          if (e.age < 0.8) e.y += 45 * dt;            // locks on after a short, visible warning
          else {
            const want = this.aim(e.x, e.y);
            let d = want - e.heading;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            e.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, d));
            const sp = Math.min(340, 150 + (e.age - 0.8) * 90) * spd;
            e.x += Math.cos(e.heading) * sp * dt; e.y += Math.sin(e.heading) * sp * dt;
          }
          break;
        case 'gunship':
          if (e.age >= 12) e.y += 90 * dt; else if (e.y < e.holdY) e.y += 60 * spd * dt;
          e.x = this.clamp(e.baseX + Math.sin(e.age * 0.8 + e.phase) * 55, e.r, W - e.r);
          e.fireT -= dt;
          if (e.fireT <= 0 && e.y > 30 && e.y < H * 0.6 && e.age < 12 && !this.player.dead) {
            e.fireT = (2.3 / fm) * (e.elite ? 0.7 : 1);
            const a = this.aim(e.x, e.y);
            [-0.24, 0, 0.24].forEach(o => this.fireBullet(e.x, e.y + e.r * 0.8, a + o, 205, { kind: 'ebolt', color: def.color }));
          }
          break;
        case 'sniper':
          if (e.age >= 14) e.y += 90 * dt; else if (e.y < 70) e.y += 80 * dt;
          e.x = this.clamp(e.baseX + Math.sin(e.age * 0.7 + e.phase) * 110, e.r, W - e.r);
          if (e.age < 14 && e.y >= 60 && !this.player.dead) {
            e.stateT += dt;
            if (e.state === 0 && e.stateT >= (1.5 / fm) * (e.elite ? 0.75 : 1)) { e.state = 1; e.stateT = 0; e.aimAng = this.aim(e.x, e.y); }
            else if (e.state === 1) {
              if (e.stateT < 0.7) e.aimAng = this.aim(e.x, e.y);                 // tracks, then locks for the last moment
              if (e.stateT >= 0.95) {
                this.fireBullet(e.x, e.y + e.r, e.aimAng, 430, { kind: 'ebolt', color: '#ff6bf0', r: 5 });
                if (e.elite) this.fireBullet(e.x, e.y + e.r, e.aimAng + 0.12, 430, { kind: 'ebolt', color: '#ff6bf0', r: 5 });
                e.state = 0; e.stateT = 0;
              }
            }
          }
          break;
        case 'asteroid':
          e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.rotV * dt;
          break;
        case 'carrier':
          if (e.age >= 20) e.y += 70 * dt; else if (e.y < e.holdY) e.y += 40 * dt;
          e.x = this.clamp(e.baseX + Math.sin(e.age * 0.5 + e.phase) * 50, e.r, W - e.r);
          e.fireT -= dt;
          if (e.fireT <= 0 && e.age < 20 && e.y > 40) {
            e.fireT = e.elite ? 3.4 : 4.6;
            [-1, 1].forEach(s => this.spawnEnemy('drone', { x: e.x + s * e.r * 0.7, y: e.y + e.r * 0.5, elite: false }));
            this.addRing(e.x, e.y, 46, '#6fd0ff', 0.35, 3);
          }
          break;
      }
      if (e.y > H + 70 || e.x < -100 || e.x > W + 100 || e.y < -260) e.dead = true;
    }
  }

  damageEnemy(e, dmg, crit) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 0.09;
    if (this.run) this.run.hits = (this.run.hits || 0) + 1;
    if (!this.reducedMotion) for (let i = 0; i < 3; i++) this.addFx(e.x, e.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0.25, 2.2, crit ? '#ffffff' : e.def.color);
    if (crit) this.addText(e.x, e.y - e.r, 'CRIT', '#ffffff', 12);
    if (this.time - this.sfxClock.hit > 0.06) { this.sfxClock.hit = this.time; this.sfx('playHit', 500 + Math.random() * 200); }
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const def = e.def, r = this.run;
    if (!r) return;
    const mult = 1 + Math.min(3, Math.floor(r.combo / 6) * 0.5);
    const pts = Math.round(def.score * (e.elite ? 3 : 1) * mult);
    this.score += pts;
    r.kills++;
    r.killsBy[e.type] = (r.killsBy[e.type] || 0) + 1;
    if (e.elite) r.elites++;
    r.combo++; r.comboTimer = 2.6; r.maxCombo = Math.max(r.maxCombo, r.combo);
    this.explode(e.x, e.y, def.color, (e.r / 14) * (e.elite ? 1.4 : 1));
    if (pts >= 40 || e.elite) this.addText(e.x, e.y - 8, '+' + pts, e.elite ? '#ffd36b' : '#ffffff', e.elite ? 15 : 12);
    let coins = def.coins * (e.elite ? 4 : 1) * (this.sector.coinBonus || 1);
    coins = Math.floor(coins) + (Math.random() < coins - Math.floor(coins) ? 1 : 0);
    if (coins > 0) this.dropCoins(e.x, e.y, coins);
    const dropChance = e.elite ? 1 : (e.type === 'asteroid' ? 0.02 : 0.06);
    if (Math.random() < dropChance) this.dropPowerup(e.x, e.y);
    if (e.type === 'asteroid' && e.r >= 22) {
      [-1, 1].forEach(s => this.spawnEnemy('asteroid', { x: e.x + s * 12, y: e.y, radius: 14, vx: s * (50 + Math.random() * 40), elite: false }));
    }
    if (this.time - this.sfxClock.hit > 0.03) this.sfx('playHit', 160 + Math.random() * 80);
  }

  /* ------------------------------------------------------------------ boss */
  damageBoss(dmg, crit) {
    const b = this.boss;
    if (!b || b.state !== 'fight') return;
    b.hp -= dmg; b.hitFlash = 0.08;
    this.score += Math.max(1, Math.round(dmg * 2));
    if (this.run) this.run.hits = (this.run.hits || 0) + 1;
    if (crit) this.addText(b.x + (Math.random() - 0.5) * 40, b.y + b.r * 0.4, 'CRIT', '#ffffff', 12);
    if (this.time - this.sfxClock.hit > 0.07) { this.sfxClock.hit = this.time; this.sfx('playHit', 300); }
    if (b.hp <= 0) {
      b.hp = 0; b.state = 'dying'; b.dieT = 0;
      this.clearEnemyBullets();
      this.enemies.forEach(e => { if (!e.dead) this.killEnemy(e); });
      this.zones.length = 0; this.beams.length = 0; this.telegraphs.length = 0;
      this.addBanner(b.def.name.toUpperCase(), 'DESTROYED', '#ffd36b', 2.4);
      this.sfx('playBombExplosion');
    }
  }

  updateBoss(dt) {
    const b = this.boss;
    if (!b) return;
    const W = this.width, p = this.player;
    b.t += dt; b.hitFlash = Math.max(0, b.hitFlash - dt);
    if (b.state === 'enter') {
      b.y += 85 * dt;
      if (b.y >= b.ty) { b.y = b.ty; b.state = 'fight'; this.addRing(b.x, b.y, 260, b.def.color, 0.7, 5); this.addShake(0.5); }
      return;
    }
    if (b.state === 'dying') {
      b.dieT += dt;
      if (Math.random() < dt * 16) this.explode(b.x + (Math.random() - 0.5) * b.r * 1.6, b.y + (Math.random() - 0.5) * b.r * 1.4, b.def.color, 1.2);
      this.addShake(0.12);
      if (b.dieT >= 2.4) this.finishBoss();
      return;
    }
    const frac = b.hp / b.maxHp, ph = frac > 0.66 ? 1 : (frac > 0.33 ? 2 : 3);
    if (ph !== b.phase) {
      b.phase = ph; b.stun = 1.4; b.tA = 1.8; b.tB = 3; b.tC = 4.5; b.mode = 0; b.modeT = 0;
      this.clearEnemyBullets();
      this.addRing(b.x, b.y, 320, b.def.color, 0.8, 6);
      this.addBanner('PHASE ' + ph, b.def.name, b.def.color, 1.6);
      this.dropPowerup(W / 2, -16, ph === 2 ? 'charge' : 'health');          // supply drop between phases
      this.addShake(0.6);
      if (b.id === 'eclipse' && ph === 3) this.wells.push({ x: W / 2, y: this.height * 0.5, r: 24, pull: 240, t: 0, dur: 14 });
    }
    b.spin += dt;
    if (b.stun > 0) { b.stun -= dt; }
    else {
      b.tA -= dt; b.tB -= dt; b.tC -= dt;
      switch (b.id) {
        case 'rockjaw': this.patRockjaw(b, dt, ph); break;
        case 'stormcaller': this.patStorm(b, dt, ph); break;
        case 'scrapper': this.patScrapper(b, dt, ph); break;
        case 'hivemother': this.patHive(b, dt, ph); break;
        case 'warden': this.patWarden(b, dt, ph); break;
        case 'eclipse': this.patEclipse(b, dt, ph); break;
      }
    }
    if (!p.dead && Math.hypot(b.x - p.x, b.y - p.y) < b.r * 0.78 + p.r) this.hitPlayer(1, 'boss');
  }

  spiral(b, dt, arms, speed, interval, rate, color) {
    b.fireAcc = (b.fireAcc || 0) + dt;
    if (b.fireAcc < interval) return;
    b.fireAcc -= interval;
    for (let a = 0; a < arms; a++) this.fireBullet(b.x, b.y + b.r * 0.25, b.spin * rate + a * Math.PI * 2 / arms, speed, { kind: 'orb', color, r: 5 });
  }

  patRockjaw(b, dt, ph) {
    b.x = this.width / 2 + Math.sin(b.t * 0.5) * (110 + ph * 20);
    if (b.tA <= 0) { b.tA = 2.5 - ph * 0.3; this.radial(b.x, b.y + b.r * 0.4, 8 + ph * 3, 140, b.spin * 0.7, { kind: 'rock', r: 9, color: '#b79c82' }); this.addShake(0.15); }
    if (b.tB <= 0) {
      b.tB = 4.6 - ph * 0.5;
      const n = 3 + ph;
      for (let i = 0; i < n; i++) this.addStrike(i === 0 ? this.player.x : 40 + Math.random() * (this.width - 80), 40, 0.9, '#ffb36b', 'rock');
    }
    if (ph >= 3 && b.tC <= 0) { b.tC = 2.3; const a = this.aim(b.x, b.y); [-0.2, 0, 0.2].forEach(o => this.fireBullet(b.x, b.y + b.r * 0.5, a + o, 260, { kind: 'ebolt', color: '#ff8a3d' })); }
  }

  patStorm(b, dt, ph) {
    b.x = this.width / 2 + Math.sin(b.t * 0.7) * 140;
    b.modeT -= dt;
    if (b.modeT <= 0) { b.mode = b.mode ? 0 : 1; b.modeT = b.mode ? 3 : 1.7; }
    if (b.mode) this.spiral(b, dt, ph + 1, 150, 0.14, 2.3, '#8fd0ff');
    if (b.tB <= 0) {
      b.tB = 6.2 - ph * 0.7;
      for (let i = 0; i < 2 + ph; i++) this.addStrike(i === 0 ? this.player.x : 40 + Math.random() * (this.width - 80), 58, 1.0, '#9fd4ff');
    }
    if (ph >= 2 && b.tC <= 0) {
      b.tC = 3.8;
      [-1, 1].forEach(s => this.fireBullet(b.x + s * b.r * 0.7, b.y + b.r * 0.2, Math.PI / 2 + s * 0.35, 120, { kind: 'orb', color: '#ff7ab8', r: 8, homing: 1.7, life: 6 }));
    }
  }

  patScrapper(b, dt, ph) {
    b.x = this.width / 2 + Math.sin(b.t * 0.35) * 150;
    if (b.tA <= 0) {
      b.tA = 2.6 - ph * 0.25;
      const a = this.aim(b.x, b.y);
      [260, 310, 360].forEach(sp => this.fireBullet(b.x, b.y + b.r * 0.6, a, sp, { kind: 'ebolt', color: '#ffb35a' }));
    }
    if (b.tB <= 0) {
      b.tB = 4.4 - ph * 0.35;
      const rows = ph >= 3 ? 2 : 1;
      for (let row = 0; row < rows; row++) {
        const gap = 70 + Math.random() * (this.width - 140), half = 54 + (4 - ph) * 10;
        for (let x = 22; x < this.width - 10; x += 34) if (Math.abs(x - gap) > half) this.fireBullet(x, b.y + b.r * 0.7 - row * 70, Math.PI / 2, 130, { kind: 'orb', color: '#ffcf70', r: 6 });
      }
    }
    if (ph >= 2 && b.tC <= 0) {
      b.tC = 7;
      [-1, 1].forEach(s => this.spawnEnemy('drone', { x: b.x + s * b.r * 0.8, y: b.y + 10, elite: false }));
    }
  }

  patHive(b, dt, ph) {
    if (b.dive) {
      const d = b.dive; d.t += dt;
      if (d.stage === 'warn') { b.x += (Math.random() - 0.5) * 4; if (d.t >= 0.9) { d.stage = 'go'; d.t = 0; } }
      else if (d.stage === 'go') {
        const dx = d.tx - b.x, dy = 400 - b.y, dist = Math.hypot(dx, dy) || 1, step = Math.min(dist, 600 * dt);
        b.x += dx / dist * step; b.y += dy / dist * step;
        if (dist < 8 || d.t > 1.4) { d.stage = 'back'; d.t = 0; this.addShake(0.5); this.radial(b.x, b.y, 14, 170, 0, { kind: 'orb', color: '#ff7ab8' }); }
      } else {
        b.y -= Math.min(b.y - b.ty, 260 * dt);
        if (b.y <= b.ty + 1) { b.y = b.ty; b.dive = null; }
      }
      return;
    }
    b.x = this.width / 2 + Math.sin(b.t * 0.9) * 130 + Math.sin(b.t * 2.1) * 30;
    b.y = b.ty + Math.sin(b.t * 1.3) * 14;
    if (b.tA <= 0) {
      b.tA = 5 - ph * 0.5;
      for (let i = 0; i < 1 + ph; i++) this.spawnEnemy('kamikaze', { x: b.x + (i - ph / 2) * 34, y: b.y + b.r * 0.6, elite: false });
    }
    if (b.tB <= 0) {
      b.tB = 2.5 - ph * 0.2;
      const n = 5 + ph * 2, a = this.aim(b.x, b.y);
      for (let i = 0; i < n; i++) this.fireBullet(b.x, b.y + b.r * 0.5, a + (i - (n - 1) / 2) * 0.16, 190, { kind: 'orb', color: '#ff7ab8', r: 6 });
    }
    if (ph >= 2 && b.tC <= 0) { b.tC = 9 - (ph - 2) * 2; b.dive = { stage: 'warn', t: 0, tx: this.player.x }; this.addText(b.x, b.y - b.r, '!', '#ff5a5a', 26); }
  }

  patWarden(b, dt, ph) {
    b.x = this.width / 2 + Math.sin(b.t * 0.5) * 120;
    if (b.tA <= 0) {
      b.tA = 2.1 - ph * 0.2;
      const n = 3 + ph * 2, a = this.aim(b.x, b.y);
      for (let i = 0; i < n; i++) this.fireBullet(b.x, b.y + b.r * 0.5, a + (i - (n - 1) / 2) * 0.17, 300, { kind: 'shard', color: '#bfefff', r: 6 });
    }
    if (b.tB <= 0) { b.tB = 4.6 - ph * 0.4; this.radial(b.x, b.y, 14 + ph * 4, 120, Math.random() * 6, { kind: 'orb', color: '#8fe9ff', r: 6 }); }
    if (b.tC <= 0) {
      b.tC = 5.6 - ph * 0.5;
      for (let i = 0; i < 3 + ph; i++) this.addStrike(i === 0 ? this.player.x : 30 + Math.random() * (this.width - 60), 34, 1.0, '#bfefff', 'icicle');
    }
  }

  patEclipse(b, dt, ph) {
    b.x = this.width / 2 + Math.sin(b.t * 0.6) * (100 + ph * 20);
    b.y = b.ty + Math.sin(b.t * 0.9) * 12;
    b.modeT -= dt;
    if (b.modeT <= 0) { b.mode = b.mode ? 0 : 1; b.modeT = b.mode ? 3.2 : 1.5; }
    if (b.mode) this.spiral(b, dt, ph === 1 ? 2 : (ph === 2 ? 3 : 4), 150, ph === 3 ? 0.13 : 0.16, 2.4, '#c58bff');
    if (b.tB <= 0) {
      if (ph === 3) { b.tB = 3.2; this.radial(b.x, b.y, 22, 130, Math.random() * 6, { kind: 'orb', color: '#e0c8ff', r: 6 }); }
      else { b.tB = 3.0 - ph * 0.2; const a = this.aim(b.x, b.y); for (let i = -2; i <= 2; i++) this.fireBullet(b.x, b.y + b.r * 0.4, a + i * 0.15, 250, { kind: 'shard', color: '#d9b8ff', r: 6 }); }
    }
    if (ph >= 2 && b.tC <= 0) {
      b.tC = ph === 3 ? 5.5 : 7;
      const a = this.aim(b.x, b.y);
      this.beams.push({ ang: a, spin: (Math.random() < 0.5 ? -1 : 1) * 0.6, w: 34, t: 0, warn: 1.1, dur: 1.7, boss: true, ox: 0, oy: 0 });
      if (ph === 3) this.beams.push({ ang: a + Math.PI, spin: 0.6, w: 34, t: 0, warn: 1.1, dur: 1.7, boss: true, ox: 0, oy: 0 });
    }
  }

  finishBoss() {
    const b = this.boss, r = this.run, def = b.def;
    this.explode(b.x, b.y, def.color, 3.2);
    this.addRing(b.x, b.y, 380, '#ffffff', 0.9, 7);
    this.addShake(0.9);
    this.score += def.score;
    r.bossKills++;
    r.kills++;
    this.dropCoins(b.x, b.y, def.coins);
    for (let i = 0; i < 2; i++) this.dropPowerup(b.x + (i ? 30 : -30), b.y);
    if (this.save.stats.bosses.indexOf(def.id) < 0) this.save.stats.bosses.push(def.id);
    this.boss = null;
    this.triggerVictory();
  }

  /* ------------------------------------------------------------------ hazards, projectiles */
  /** A vertical hazard column with a visible warning. drop: 'rock' | 'icicle' | falsy (lightning strike). */
  addStrike(x, w, warn, color, drop) {
    this.zones.push({ x, w, t: 0, warn, dur: 0.35, color, drop: drop === true ? 'icicle' : (drop || null), hit: false, fired: false });
  }

  updateHazards(dt) {
    const p = this.player;
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      z.t += dt;
      if (z.t >= z.warn && !z.fired) {
        z.fired = true;
        if (z.drop === 'rock') this.fireBullet(z.x, -14, Math.PI / 2, 300, { kind: 'rock', r: 15, color: '#b79c82', life: 4 });
        else if (z.drop === 'icicle') this.fireBullet(z.x, -14, Math.PI / 2, 560, { kind: 'shard', r: 8, color: '#bfefff', life: 3 });
        else {
          this.addShake(0.25);
          if (!p.dead && Math.abs(p.x - z.x) < z.w / 2 + p.r * 0.5) this.hitPlayer(1, 'lightning');
        }
      }
    }
    this.compact(this.zones, (z) => z.t < z.warn + z.dur);

    for (let i = 0; i < this.beams.length; i++) {
      const bm = this.beams[i];
      bm.t += dt;
      if (this.boss) { bm.ox = this.boss.x; bm.oy = this.boss.y; }
      if (bm.t >= bm.warn) bm.ang += bm.spin * dt;
      if (bm.t >= bm.warn && bm.t < bm.warn + bm.dur && !p.dead) {
        const dx = p.x - bm.ox, dy = p.y - bm.oy;
        const along = dx * Math.cos(bm.ang) + dy * Math.sin(bm.ang);
        const off = Math.abs(dx * Math.sin(bm.ang) - dy * Math.cos(bm.ang));
        if (along > 0 && off < bm.w / 2 + p.r * 0.6) this.hitPlayer(1, 'beam');
      }
    }
    this.compact(this.beams, (bm) => bm.t < bm.warn + bm.dur && (bm.boss ? !!this.boss : true));

    for (let i = 0; i < this.wells.length; i++) this.wells[i].t += dt;
    this.compact(this.wells, (w) => w.t < w.dur);
  }

  nearestTarget(x, y) {
    let best = null, bd = 1e12;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]; if (e.dead || e.y < 0) continue;
      const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    if (this.boss && this.boss.state === 'fight') { const d = (this.boss.x - x) * (this.boss.x - x) + (this.boss.y - y) * (this.boss.y - y); if (d < bd) best = this.boss; }
    return best;
  }

  updateLasers(dt) {
    const W = this.width, H = this.height, list = this.lasers, boss = this.boss;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.life <= 0) continue;
      if (b.homing) {
        const t = this.nearestTarget(b.x, b.y);
        let sp = Math.hypot(b.vx, b.vy);
        if (t) {
          const want = Math.atan2(t.y - b.y, t.x - b.x);
          let cur = Math.atan2(b.vy, b.vx), d = want - cur;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          cur += Math.max(-b.homing * dt, Math.min(b.homing * dt, d));
          sp = Math.min(640, sp + 320 * dt);
          b.vx = Math.cos(cur) * sp; b.vy = Math.sin(cur) * sp;
        }
        if (!this.reducedMotion && this.particles.length < 280) this.addFx(b.x, b.y + 4, 0, 30, 0.22, 2, '#ffb3f5');
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.y < -50 || b.y > H + 50 || b.x < -50 || b.x > W + 50) { b.life = 0; continue; }
      let spent = false;
      for (let j = 0; j < this.enemies.length && !spent; j++) {
        const e = this.enemies[j];
        if (e.dead || e.y < -e.r * 0.4) continue;
        const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
        if (dx * dx + dy * dy > rr * rr) continue;
        if (b.hit && b.hit.indexOf(e) >= 0) continue;
        this.laserHit(b, e);
        if (b.pierce > 0) { b.pierce--; (b.hit = b.hit || []).push(e); } else spent = true;
      }
      if (!spent && boss && (boss.state === 'fight' || boss.state === 'enter')) {
        const dx = boss.x - b.x, dy = boss.y - b.y, rr = boss.r * 0.85 + b.r;
        if (dx * dx + dy * dy < rr * rr && !(b.hit && b.hit.indexOf(boss) >= 0)) {
          if (boss.state === 'fight') {
            let dmg = b.dmg, crit = false;
            if (b.crit && Math.random() < b.crit) { dmg *= 2; crit = true; }
            this.damageBoss(dmg, crit);
            if (b.splash) this.addRing(b.x, b.y, b.splash, b.color, 0.25, 3);
          } else this.addFx(b.x, b.y, 0, 0, 0.2, 3, '#ffffff');
          if (b.pierce > 0) { b.pierce--; (b.hit = b.hit || []).push(boss); } else spent = true;
        }
      }
      if (spent) b.life = 0;
    }
    this.compact(list, (b) => b.life > 0);
  }

  laserHit(b, e) {
    let dmg = b.dmg, crit = false;
    if (b.crit && Math.random() < b.crit) { dmg *= 2; crit = true; }
    this.damageEnemy(e, dmg, crit);
    if (b.splash) {
      this.addRing(b.x, b.y, b.splash, b.color, 0.25, 3);
      for (let k = 0; k < this.enemies.length; k++) {
        const o = this.enemies[k];
        if (o === e || o.dead) continue;
        if (Math.hypot(o.x - b.x, o.y - b.y) < b.splash + o.r) this.damageEnemy(o, dmg * 0.5, false);
      }
    }
  }

  updateEnemyBullets(dt) {
    const p = this.player, list = this.ebullets, W = this.width, H = this.height;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.life <= 0) continue;
      if (b.homing && !p.dead) {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const want = Math.atan2(p.y - b.y, p.x - b.x);
        let cur = Math.atan2(b.vy, b.vx), d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        cur += Math.max(-b.homing * dt, Math.min(b.homing * dt, d));
        b.vx = Math.cos(cur) * sp; b.vy = Math.sin(cur) * sp;
      }
      for (let w = 0; w < this.wells.length; w++) {            // gravity wells curve enemy fire too
        const g = this.wells[w], dx = g.x - b.x, dy = g.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (d < g.pull) { const s = (1 - d / g.pull) * 150; b.vx += dx / d * s * dt; b.vy += dy / d * s * dt; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.rot += dt * 3;
      if (b.x < -40 || b.x > W + 40 || b.y < -60 || b.y > H + 40) { b.life = 0; continue; }
      if (!p.dead) {
        const dx = p.x - b.x, dy = p.y - b.y, rr = b.r + p.r * 0.7 + (p.aegis > 0 ? 14 : 0);
        if (dx * dx + dy * dy < rr * rr) {
          if (p.aegis > 0) {                                    // Bulwark: the barrier throws bolts back
            this.addShot(b.x, b.y, 0, 520, { dmg: 1.5 * this.stats.damage, kind: 'bolt', color: this.ship().colors.glow, r: 6 });
            this.addFx(b.x, b.y, 0, 0, 0.2, 4, '#d8ff8a');
            b.life = 0;
          } else if (p.phase > 0) { /* intangible: bolt passes through */ }
          else { b.life = 0; this.hitPlayer(b.dmg, 'bullet'); }
        }
      }
    }
    this.compact(list, (b) => b.life > 0);

    // ramming
    for (let i = 0; i < this.enemies.length && !p.dead; i++) {
      const e = this.enemies[i];
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r * 0.85) {
        if (p.phase > 0) continue;
        if (p.ab > 0 || p.aegis > 0) { this.damageEnemy(e, 4, false); continue; }
        if (p.invuln <= 0 && p.oshield <= 0) { this.damageEnemy(e, e.type === 'kamikaze' ? 99 : 3, false); this.hitPlayer(1, 'ram'); }
        else if (p.invuln <= 0) { this.hitPlayer(1, 'ram'); this.damageEnemy(e, 3, false); }
      }
    }
  }

  /* ------------------------------------------------------------------ damage to the player */
  hitPlayer(dmg, src) {
    const p = this.player, r = this.run;
    if (p.dead || p.invuln > 0 || p.phase > 0 || !r) return false;
    const col = this.ship().colors.glow;
    if (p.aegis > 0) { this.addRing(p.x, p.y, 54, col, 0.25, 3); p.invuln = 0.2; return false; }
    if (p.oshield > 0) { p.oshield = Math.max(0, p.oshield - 1.5); p.invuln = 0.3; this.addRing(p.x, p.y, 48, '#6fd0ff', 0.3, 4); this.sfx('playHit', 700); return false; }
    p.shield -= dmg;
    p.invuln = 1.25; p.regenT = 0;
    r.damageTaken++;
    r.combo = 0;
    this.addShake(0.45);
    this.hurtFlash = 0.35;
    this.explode(p.x, p.y, '#ff7a5a', 0.7);
    this.sfx('playHit', 130);
    if (p.shield <= 0) { p.shield = 0; this.playerDestroyed(); }
    this.updateHud(true);
    return true;
  }

  playerDestroyed() {
    const p = this.player, r = this.run;
    p.dead = true;
    this.explode(p.x, p.y, this.ship().colors.glow, 2.4);
    this.addRing(p.x, p.y, 220, '#ffffff', 0.7, 6);
    this.addShake(0.9);
    r.endTimer = 1.7;
    this.sfx('playBombExplosion');
  }

  /* ------------------------------------------------------------------ pickups */
  dropCoins(x, y, value) {
    const r = this.run;
    if (this.pickups.length > 110) { if (r) r.coins += value; return; }
    const n = Math.min(6, Math.ceil(value / 3));
    let left = value;
    for (let i = 0; i < n; i++) {
      const v = i === n - 1 ? left : Math.max(1, Math.floor(value / n));
      left -= v;
      if (v <= 0) continue;
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 80;
      this.pickups.push({ kind: 'coin', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, v, age: 0, r: 9 });
    }
  }

  /** Drops a power-up. Pass `force` for a specific kind (boss supply drops); otherwise the kind is weighted by what you need. */
  dropPowerup(x, y, force) {
    const p = this.player;
    let kind = force;
    if (!kind) {
      const hurt = p.shield < p.maxShield;
      const w = { rapid: 3, spread: 3, shield: 2, health: hurt ? 4 : 0.4, charge: p.abilityCd > 2 ? 3 : 0.5 };
      let total = 0; Object.keys(w).forEach(k => { total += w[k]; });
      let roll = Math.random() * total; kind = 'rapid';
      for (const k of Object.keys(w)) { roll -= w[k]; if (roll <= 0) { kind = k; break; } }
    }
    this.pickups.push({ kind, x, y, vx: 0, vy: 70, v: 0, age: 0, r: 13, bob: Math.random() * 6 });
  }

  updatePickups(dt) {
    const p = this.player, H = this.height, W = this.width, r = this.run;
    for (let i = 0; i < this.pickups.length; i++) {
      const k = this.pickups[i];
      k.age += dt;
      if (k.kind === 'coin') {
        k.vx *= Math.max(0, 1 - 2.2 * dt); k.vy += (60 - k.vy) * Math.min(1, 1.5 * dt);
        const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
        if (!p.dead && k.age > 0.25 && d < 130) { const pull = 520 * (1 - d / 160); k.vx += dx / d * pull * dt * 4; k.vy += dy / d * pull * dt * 4; }
        k.x += k.vx * dt; k.y += k.vy * dt;
      } else {
        k.x += Math.sin(k.age * 2 + k.bob) * 18 * dt; k.y += k.vy * dt;
      }
      if (!p.dead && Math.hypot(p.x - k.x, p.y - k.y) < p.r + k.r + 8) {
        k.dead = true;
        if (k.kind === 'coin') {
          r.coins += k.v;
          if (this.time - this.sfxClock.coin > 0.05) { this.sfxClock.coin = this.time; this.sfx('playMatch'); }
          this.addFx(k.x, k.y, 0, -40, 0.25, 3, '#ffd36b');
        } else this.applyPowerup(k.kind);
      }
      if (k.y > H + 30 || k.age > 14 || k.x < -30 || k.x > W + 30) k.dead = true;
    }
    this.compact(this.pickups, (k) => !k.dead);
  }

  applyPowerup(kind) {
    const p = this.player, D = SpaceShooterData.POWERUPS[kind], r = this.run;
    r.powerups++;
    switch (kind) {
      case 'rapid': p.rapid = D.duration; break;
      case 'spread': p.spread = D.duration; break;
      case 'shield': p.oshield = D.duration; break;
      case 'health': p.shield = Math.min(p.maxShield, p.shield + 2); this.updateHud(true); break;
      case 'charge': p.abilityCd = 0; this.updateHud(true); break;
    }
    this.addText(p.x, p.y - 30, D.label.toUpperCase(), D.color, 13);
    this.addRing(p.x, p.y, 70, D.color, 0.4, 4);
    this.sfx('playPowerup');
  }

  /* ------------------------------------------------------------------ effects */
  addFx(x, y, vx, vy, life, size, color) {
    if (this.particles.length >= 360) return;
    const q = this.fxFree.pop() || {};
    q.x = x; q.y = y; q.vx = vx; q.vy = vy; q.life = life; q.max = life; q.size = size; q.color = color;
    this.particles.push(q);
  }
  addRing(x, y, maxR, color, life, w) { if (this.rings.length < 24) this.rings.push({ x, y, maxR, color, life, max: life, w: w || 3 }); }
  addText(x, y, txt, color, size) { if (this.texts.length < 18) this.texts.push({ x, y, txt, color, size: size || 12, life: 0.9, max: 0.9 }); }
  addShake(a) { this.shake = Math.min(1, this.shake + (this.reducedMotion ? a * 0.25 : a)); }
  explode(x, y, color, scale) {
    const n = this.reducedMotion ? 5 : Math.min(26, Math.round(10 * scale) + 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (60 + Math.random() * 180) * Math.min(1.8, 0.6 + scale * 0.5);
      this.addFx(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.35 + Math.random() * 0.45, 2 + Math.random() * 3 * Math.min(2, scale), Math.random() < 0.3 ? '#ffffff' : color);
    }
    this.addRing(x, y, 28 * Math.min(3, scale + 0.4), color, 0.35, 3);
    this.addShake(0.08 * scale);
  }

  updateFx(dt) {
    const ps = this.particles;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { this.fxFree.push(q); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - 1.6 * dt; q.vy *= 1 - 1.6 * dt;
      ps[w++] = q;
    }
    ps.length = w;
    for (let i = 0; i < this.rings.length; i++) this.rings[i].life -= dt;
    this.compact(this.rings, (r) => r.life > 0);
    for (let i = 0; i < this.texts.length; i++) { const t = this.texts[i]; t.life -= dt; t.y -= 34 * dt; }
    this.compact(this.texts, (t) => t.life > 0);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const sp = 40 * (this.mission.id === 'free' ? 1 : 1);
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += sp * s.z * dt * 2.2;
      if (s.y > this.height) { s.y -= this.height; s.x = Math.random() * this.width; }
    }
  }

  /* ------------------------------------------------------------------ objectives and end of run */
  runStat(stat) {
    const r = this.run;
    switch (stat) {
      case 'kills': return r.kills;
      case 'elites': return r.elites;
      case 'powerups': return r.powerups;
      case 'coins': return r.coins;
      case 'survive': return Math.floor(r.time);
      case 'boss': return r.bossKills;
      case 'damageTaken': return r.damageTaken;
      case 'maxCombo': return r.maxCombo;
    }
    const m = /^kills([A-Za-z]+)$/.exec(stat);
    return m ? (r.killsBy[m[1].charAt(0).toLowerCase() + m[1].slice(1)] || 0) : 0;
  }
  objectiveProgress() {
    const m = this.mission;
    if (!m || m.stat === 'none') return { value: this.score, target: 0, done: false };
    const v = Math.min(m.target, this.runStat(m.stat));
    return { value: v, target: m.target, done: v >= m.target };
  }
  bonusMet() {
    const b = this.mission && this.mission.bonus;
    if (!b || !this.run) return false;
    const v = this.runStat(b.stat);
    return b.op === '<=' ? v <= b.target : v >= b.target;
  }

  updateRun(dt) {
    const r = this.run, p = this.player;
    if (r.comboTimer > 0) { r.comboTimer -= dt; if (r.comboTimer <= 0) r.combo = 0; }
    for (let i = 0; i < this.banners.length; i++) this.banners[i].t += dt;
    this.compact(this.banners, (b) => b.t < b.dur);
    if (!r.victory && !p.dead && this.mission.stat !== 'none' && this.objectiveProgress().done) this.triggerVictory();
    if (r.victory) { this.clearEnemyBullets(); p.invuln = Math.max(p.invuln, 5); }
    if (r.victory || p.dead) {
      r.endTimer -= dt;
      if (r.endTimer <= 0) this.endRun(r.victory ? 'win' : 'lose');
    }
  }

  triggerVictory() {
    const r = this.run;
    if (r.victory) return;
    r.victory = true; r.endTimer = 2.3;
    this.addBanner('MISSION COMPLETE', this.mission.title, '#7dff9a', 2.3);
    this.sfx('playWin');
  }

  /** Finishes the run: pays rewards, records progress, shows the results screen. */
  endRun(result) {
    const r = this.run, m = this.mission, D = SpaceShooterData, st = this.save.stats;
    if (!r || r.over) return;
    const prevBest = st.bestScore;
    if (m.id === 'free' && this.campaignMission) { this.save.missions.current = this.campaignMission; this.campaignMission = null; }
    this.bankProgress();                                       // pickups, kills and time of this run
    let missionReward = 0, bonusReward = 0, firstClear = false, bonusDone = false;
    if (m.id !== 'free') {
      const prog = this.save.missions.progress[m.id] || { done: false, bonus: false, best: 0, plays: 0 };
      if (result === 'win') {
        firstClear = !prog.done;
        missionReward = firstClear ? m.reward : Math.max(10, Math.round(m.reward * 0.3));
        if (m.bonus && this.bonusMet()) { bonusDone = true; bonusReward = prog.bonus ? Math.round(m.bonus.reward * 0.3) : m.bonus.reward; prog.bonus = true; }
        prog.done = true;
        const idx = D.MISSIONS.findIndex(x => x.id === m.id);
        if (idx >= 0 && idx < D.MISSIONS.length - 1 && this.save.missions.current === m.id) this.save.missions.current = D.MISSIONS[idx + 1].id;
        if (m.boss && this.save.stats.bosses.indexOf(this.sector.boss) < 0) this.save.stats.bosses.push(this.sector.boss);
        if (r.damageTaken === 0) st.flawless++;
      }
      prog.best = Math.max(prog.best, this.score); prog.plays++;
      this.save.missions.progress[m.id] = prog;
    }
    const scoreBonus = Math.floor(this.score / 400);
    const award = missionReward + bonusReward + scoreBonus;
    this.save.coins += award; st.coinsEarned += award;
    st.runs++;
    st.bestScore = Math.max(st.bestScore, this.score);
    this.highScore = st.bestScore;
    if (this.score > prevBest) SpaceShooterSave.writeHighScore(this.score);
    r.over = true;
    const fresh = this.checkAchievements();
    const saved = this.persist();
    const shots = r.shots || 0;
    this.lastResult = {
      result, mission: m, sector: this.sector, score: this.score, newBest: this.score > prevBest && this.score > 0,
      kills: r.kills, elites: r.elites, time: Math.floor(r.time), maxCombo: r.maxCombo, damageTaken: r.damageTaken,
      accuracy: shots ? Math.min(100, Math.round(((r.hits || 0) / shots) * 100)) : 0,
      pickupCoins: r.coins, missionReward, bonusReward, bonusDone, scoreBonus, firstClear, totalCoins: r.coins + award,
      bonusLabel: m.bonus ? m.bonus.label : '', fresh, saved, nextId: this.save.missions.current
    };
    cancelAnimationFrame(this.animId);
    this.state = 'GAMEOVER';
    this.sfx(result === 'win' ? 'playWin' : 'playGameOver');
    if (this.lastResult.newBest) this.sfx('playRecordFanfare');
    this.showScreen('results');
    this.setMode('overlay');
    this.updateHud(true);
  }

  /** Leave the current run from the pause menu. Coins and kills collected so far are kept. */
  abortRun() {
    if (this.state !== 'PAUSED' && this.state !== 'PLAYING') return;
    this.bankProgress();
    if (this.run) this.run.over = true;
    if (this.mission && this.mission.id === 'free' && this.campaignMission) { this.save.missions.current = this.campaignMission; this.campaignMission = null; this.persist(); }
    cancelAnimationFrame(this.animId);
    this.state = 'MENU';
    this.showScreen('home');
    this.setMode('menu');
  }

  afterResultsPrimary() {
    this.start();                                              // next mission after a win, retry after a loss
  }

  /* ------------------------------------------------------------------ HUD (DOM) */
  setText(key, el, value) {
    if (this.hudCache[key] === value) return;
    this.hudCache[key] = value;
    if (el) el.textContent = value;
  }
  updateHud(force) {
    const p = this.player, r = this.run, m = this.mission;
    if (force) this.hudCache = {};
    this.setText('score', this.scoreEl, String(this.score));
    this.setText('coins', this.coinsEl, String(r ? r.coins : 0));
    this.setText('shield', this.shieldEl, `${p.shield}/${p.maxShield}${p.oshield > 0 ? '+' : ''}`);
    this.setText('sector', this.waveEl, m ? (m.id === 'free' ? 'FREE' : `${m.sector}-${m.index}`) : '1-1');
    if (this.stats && this.abilityFill) {
      const pct = Math.round((1 - p.abilityCd / this.stats.abilityCd) * 20) * 5;
      if (this.hudCache.ab !== pct) {
        this.hudCache.ab = pct;
        this.abilityFill.style.height = pct + '%';
        if (this.btnAbility && this.btnAbility.classList) { if (pct >= 100) this.btnAbility.classList.add('ready'); else this.btnAbility.classList.remove('ready'); }
      }
      this.setText('abname', this.abilityName, this.ship().ability.name.toUpperCase());
    }
  }

  /* ------------------------------------------------------------------ rendering (canvas) */
  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const A = SpaceShooterArt, W = this.width, H = this.height, sector = this.sector || SpaceShooterData.SECTORS[0];
    const p = this.player, t = this.time;
    ctx.save();
    if (this.shake > 0.001 && !this.reducedMotion) {
      const m = this.shake * 12;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // --- backdrop + stars
    const bg = A.backdrop(sector, W, H), off = this.bgScroll || 0;
    A.blit(ctx, bg, W / 2, H / 2 + off, 0, 1);
    A.blit(ctx, bg, W / 2, H / 2 + off - H, 0, 1);
    ctx.fillStyle = sector.star;
    const snow = sector.hazardKey === 'ice';
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      ctx.globalAlpha = 0.25 + s.z * 0.5;
      const sz = snow ? 1.5 + s.z * 1.5 : s.z > 0.9 ? 2 : 1.2;
      ctx.fillRect(s.x + (snow ? Math.sin(t * 0.8 + i) * 6 : 0), s.y, sz, snow ? sz : sz * (1 + s.z * 2));
    }
    ctx.globalAlpha = 1;
    if (sector.hazardKey === 'swarm') { ctx.fillStyle = A.rgba(sector.accent, 0.04 + 0.03 * Math.sin(t * 2.2)); ctx.fillRect(0, 0, W, H); }

    this.drawHazards(ctx);

    // --- pickups
    for (let i = 0; i < this.pickups.length; i++) {
      const k = this.pickups[i];
      if (k.age > 10.5 && Math.floor(k.age * 8) % 2) continue;       // blink before expiring
      const s = k.kind === 'coin' ? 1 : 1 + Math.sin(k.age * 6) * 0.08;
      A.blit(ctx, A.pickupSprite(k.kind), k.x, k.y, 0, s);
    }

    // --- enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead) continue;
      const spr = A.enemySprite(e.type, e.type === 'asteroid' ? e.r : e.def.radius, e.variant);
      const k = e.type === 'asteroid' ? 1 : (e.elite ? 1.2 : 1);
      const rot = e.type === 'asteroid' ? e.rot : (e.type === 'kamikaze' ? e.heading - Math.PI / 2 : 0);
      if (e.type === 'kamikaze' && e.age < 0.8 && Math.floor(e.age * 14) % 2) { ctx.globalAlpha = 0.45; }
      A.blit(ctx, spr, e.x, e.y, rot, k);
      ctx.globalAlpha = 1;
      if (e.flash > 0) { ctx.globalAlpha = 0.75; ctx.globalCompositeOperation = 'lighter'; A.blit(ctx, spr, e.x, e.y, rot, k); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      if (e.elite) {
        ctx.strokeStyle = `rgba(255,211,107,${0.55 + 0.3 * Math.sin(t * 6 + e.phase)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, A.TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,211,107,0.25)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 9, 0, A.TAU); ctx.stroke();
      }
      if ((e.elite || e.maxHp >= 4) && e.hp < e.maxHp) {
        const w = Math.max(24, e.r * 1.6), x = e.x - w / 2, y = e.y - e.r - 12;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, 4);
        ctx.fillStyle = e.elite ? '#ffd36b' : '#ff7a5a'; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
      }
      if (e.type === 'sniper' && e.state === 1) {                    // telegraphed beam: the bolt follows this exact line
        const a = e.aimAng, f = Math.min(1, e.stateT / 0.95);
        ctx.strokeStyle = `rgba(255,107,240,${0.2 + 0.6 * f})`; ctx.lineWidth = 1 + f * 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y + e.r); ctx.lineTo(e.x + Math.cos(a) * 900, e.y + Math.sin(a) * 900); ctx.stroke();
      }
    }

    this.drawBoss(ctx);

    // --- projectiles
    for (let i = 0; i < this.lasers.length; i++) {
      const b = this.lasers[i];
      const rot = Math.atan2(b.vx, -b.vy);
      A.blit(ctx, A.projSprite(b.kind, b.color), b.x, b.y, rot, b.kind === 'slug' ? 1.25 : 1);
    }
    for (let i = 0; i < this.ebullets.length; i++) {
      const b = this.ebullets[i];
      if (b.kind === 'orb') A.blit(ctx, A.projSprite('orb', b.color), b.x, b.y, 0, b.r / 6);
      else if (b.kind === 'rock') A.blit(ctx, A.projSprite('rock', b.color), b.x, b.y, b.rot, b.r / 9);
      else A.blit(ctx, A.projSprite(b.kind, b.color), b.x, b.y, Math.atan2(b.vy, b.vx) - Math.PI / 2, 1);
    }

    this.drawPlayer(ctx);

    // --- particles, rings, floating text
    for (let i = 0; i < this.particles.length; i++) {
      const q = this.particles[i], f = q.life / q.max;
      ctx.globalAlpha = Math.min(1, f * 1.4);
      ctx.fillStyle = q.color;
      const s = q.size * (0.4 + f * 0.6);
      ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < this.rings.length; i++) {
      const g = this.rings[i], f = 1 - g.life / g.max;
      ctx.globalAlpha = (1 - f) * 0.9; ctx.strokeStyle = g.color; ctx.lineWidth = g.w * (1 - f * 0.5);
      ctx.beginPath(); ctx.arc(g.x, g.y, Math.max(1, g.maxR * Math.sqrt(f)), 0, A.TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < this.texts.length; i++) {
      const q = this.texts[i];
      ctx.globalAlpha = Math.min(1, q.life / q.max * 1.6);
      ctx.font = `800 ${q.size}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(q.txt, q.x + 1, q.y + 1);
      ctx.fillStyle = q.color; ctx.fillText(q.txt, q.x, q.y);
    }
    ctx.globalAlpha = 1;

    // --- screen tints
    if (this.hurtFlash > 0) { ctx.fillStyle = `rgba(255,40,40,${this.hurtFlash * 0.45})`; ctx.fillRect(0, 0, W, H); }
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      if (!z.drop && z.fired) { ctx.fillStyle = `rgba(200,225,255,${0.22 * (1 - (z.t - z.warn) / z.dur)})`; ctx.fillRect(0, 0, W, H); break; }
    }
    ctx.restore();

    this.drawBanners(ctx);
    this.drawHud(ctx);
  }

  drawHazards(ctx) {
    const A = SpaceShooterArt, H = this.height, t = this.time;
    for (let i = 0; i < this.wells.length; i++) {
      const w = this.wells[i], life = Math.min(1, w.t / 0.8, (w.dur - w.t) / 0.8);
      ctx.globalAlpha = Math.max(0, life);
      ctx.fillStyle = A.rg(ctx, w.x, w.y, 0, w.pull, [[0, 'rgba(0,0,0,0.95)'], [0.12, 'rgba(10,0,30,0.9)'], [0.4, 'rgba(120,60,255,0.18)'], [1, 'rgba(120,60,255,0)']]);
      ctx.beginPath(); ctx.arc(w.x, w.y, w.pull, 0, A.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(190,150,255,0.7)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const a0 = t * 2 + k * 2.1; ctx.beginPath(); ctx.arc(w.x, w.y, 30 + k * 18, a0, a0 + 1.6); ctx.stroke(); }
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, A.TAU); ctx.fill();
      ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i], x0 = z.x - z.w / 2;
      if (z.t < z.warn) {                                              // warning column: pulses faster as the strike nears
        const f = z.t / z.warn, pulse = 0.5 + 0.5 * Math.sin(z.t * (8 + f * 18));
        ctx.fillStyle = A.rgba(z.color, 0.06 + 0.1 * pulse * (0.4 + f)); ctx.fillRect(x0, 0, z.w, H);
        ctx.strokeStyle = A.rgba(z.color, 0.35 + 0.4 * f); ctx.lineWidth = 1.5; ctx.strokeRect(x0, 0, z.w, H);
        ctx.fillStyle = A.rgba(z.color, 0.9);
        ctx.beginPath(); ctx.moveTo(z.x, 22); ctx.lineTo(z.x - 9, 6); ctx.lineTo(z.x + 9, 6); ctx.closePath(); ctx.fill();
      } else if (!z.drop) {                                            // lightning
        const f = (z.t - z.warn) / z.dur;
        ctx.fillStyle = `rgba(210,235,255,${0.55 * (1 - f)})`; ctx.fillRect(x0, 0, z.w, H);
        ctx.strokeStyle = `rgba(255,255,255,${1 - f})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(z.x, 0);
        for (let y = 0; y < H; y += 40) ctx.lineTo(z.x + Math.sin(y * 0.37 + z.x) * 14, y + 40);
        ctx.stroke();
      }
    }
    for (let i = 0; i < this.beams.length; i++) {
      const bm = this.beams[i], len = 1000, x2 = bm.ox + Math.cos(bm.ang) * len, y2 = bm.oy + Math.sin(bm.ang) * len;
      if (bm.t < bm.warn) {
        const f = bm.t / bm.warn;
        ctx.strokeStyle = `rgba(217,184,255,${0.2 + 0.5 * f})`; ctx.lineWidth = 1 + f * 3;
        ctx.beginPath(); ctx.moveTo(bm.ox, bm.oy); ctx.lineTo(x2, y2); ctx.stroke();
      } else {
        const f = (bm.t - bm.warn) / bm.dur, a = Math.min(1, (1 - f) * 3);
        ctx.strokeStyle = `rgba(150,90,255,${0.45 * a})`; ctx.lineWidth = bm.w + 14; ctx.beginPath(); ctx.moveTo(bm.ox, bm.oy); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = `rgba(220,190,255,${0.9 * a})`; ctx.lineWidth = bm.w * 0.6; ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = bm.w * 0.22; ctx.stroke();
      }
    }
  }

  drawBoss(ctx) {
    const b = this.boss;
    if (!b) return;
    const A = SpaceShooterArt, t = this.time, spr = A.bossSprite(b.id);
    let x = b.x, y = b.y, k = 1;
    if (b.state === 'dying') { x += (Math.random() - 0.5) * 6; y += (Math.random() - 0.5) * 6; }
    if (b.id === 'stormcaller') k = 1 + Math.sin(t * 2.4) * 0.03;
    if (b.id === 'hivemother' && b.dive && b.dive.stage === 'warn') { x += (Math.random() - 0.5) * 8; }
    if (b.id === 'rockjaw') {                                          // orbiting boulders
      const rock = A.enemySprite('asteroid', 18, 0);
      for (let i = 0; i < 3; i++) { const a = t * 0.9 + i * 2.09; A.blit(ctx, rock, x + Math.cos(a) * b.r * 1.3, y + Math.sin(a) * b.r * 0.55, a * 2, 1); }
    }
    if (b.state === 'enter') ctx.globalAlpha = 0.75;
    A.blit(ctx, spr, x, y, 0, k);
    ctx.globalAlpha = 1;
    if (b.id === 'eclipse') {                                          // rotating outer ring
      ctx.strokeStyle = 'rgba(217,184,255,0.8)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const a0 = t * 0.9 + i * Math.PI / 2; ctx.beginPath(); ctx.arc(x, y, b.r * 1.32, a0, a0 + 0.9); ctx.stroke(); }
    }
    if (b.id === 'hivemother' && b.dive && b.dive.stage === 'warn') {
      ctx.strokeStyle = `rgba(255,90,90,${0.4 + 0.4 * Math.sin(t * 30)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(b.dive.tx, 0); ctx.lineTo(b.dive.tx, this.height); ctx.stroke(); ctx.setLineDash([]);
    }
    if (b.hitFlash > 0) { ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = 'lighter'; A.blit(ctx, spr, x, y, 0, k); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (b.state === 'enter') { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, b.r * 1.05, 0, A.TAU); ctx.stroke(); }
  }

  drawPlayer(ctx) {
    const p = this.player, A = SpaceShooterArt;
    if (p.dead) return;
    const ship = this.ship(), t = this.time, K = 0.74;
    let alpha = 1;
    if (p.invuln > 0 && p.aegis <= 0 && Math.floor(t * 18) % 2) alpha = 0.35;
    if (p.phase > 0) alpha = 0.42;
    ctx.globalAlpha = alpha;
    const flame = p.ab > 0 ? 44 : 26;
    (A.ENGINES[ship.id] || []).forEach(e => A.drawFlame(ctx, p.x + e[0] * K, p.y + e[1] * K - 2, flame * (1 + Math.min(0.6, Math.abs(p.vy) / 500)), 4.5, ship.colors.glow, t));
    A.blit(ctx, A.shipSprite(ship, 100), p.x, p.y, p.tilt * 0.22, K);
    ctx.globalAlpha = 1;
    if (p.oshield > 0) {
      const f = p.oshield < 2 ? (Math.floor(t * 10) % 2 ? 0.4 : 1) : 1;
      ctx.fillStyle = A.rg(ctx, p.x, p.y, 8, 36, [[0, 'rgba(111,208,255,0)'], [1, `rgba(111,208,255,${0.35 * f})`]]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 36, 0, A.TAU); ctx.fill();
      ctx.strokeStyle = `rgba(190,235,255,${0.85 * f})`; ctx.lineWidth = 2; ctx.stroke();
    }
    if (p.aegis > 0) {
      const f = p.aegis < 1.2 ? (Math.floor(t * 12) % 2 ? 0.4 : 1) : 1, c = ship.colors.glow;
      ctx.strokeStyle = A.rgba(c, 0.9 * f); ctx.lineWidth = 3;
      ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = t * 1.5 + i * Math.PI / 3.5 * 1; const x = p.x + Math.cos(a) * 44, y = p.y + Math.sin(a) * 44; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke();
      ctx.fillStyle = A.rgba(c, 0.12 * f); ctx.fill();
    }
    if (p.phase > 0) { ctx.strokeStyle = A.rgba(ship.colors.glow, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 30 + Math.sin(t * 10) * 2, 0, A.TAU); ctx.stroke(); }
  }

  drawBanners(ctx) {
    const W = this.width, H = this.height;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < this.banners.length; i++) {
      const b = this.banners[i];
      const a = Math.max(0, Math.min(1, b.t / 0.35, (b.dur - b.t) / 0.5));
      const y = H * 0.3 + i * 58 - (1 - a) * 8;
      ctx.globalAlpha = a;
      ctx.font = '800 32px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(b.text, W / 2 + 2, y + 2);
      ctx.fillStyle = b.color; ctx.fillText(b.text, W / 2, y);
      if (b.sub) { ctx.font = '600 14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(b.sub, W / 2, y + 26); }
    }
    ctx.globalAlpha = 1;
  }

  objectiveText() {
    const m = this.mission;
    if (!m) return '';
    if (m.id === 'free') return `FREE FLIGHT  ${this.formatTime(this.run ? this.run.time : 0)}`;
    const names = { kills: 'Destroy enemies', killsAsteroid: 'Destroy asteroids', killsGunship: 'Destroy gunships', killsKamikaze: 'Destroy kamikazes', killsSniper: 'Destroy snipers', killsCarrier: 'Destroy carriers', elites: 'Defeat elites', powerups: 'Collect power-ups', coins: 'Collect coins', survive: 'Survive', boss: 'Defeat the boss' };
    const pr = this.objectiveProgress();
    if (m.stat === 'survive') return `Survive  ${pr.value}s / ${pr.target}s`;
    if (m.stat === 'boss') return this.boss ? `Defeat ${this.boss.def.name}` : 'Reach the boss';
    return `${names[m.stat] || m.stat}  ${pr.value} / ${pr.target}`;
  }
  formatTime(s) { s = Math.floor(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  drawHud(ctx) {
    const A = SpaceShooterArt, W = this.width, H = this.height, p = this.player, r = this.run, m = this.mission, t = this.time;
    if (!r) return;
    ctx.textBaseline = 'middle';
    let y = 12;
    const b = this.boss;
    if (b && b.state !== 'dying') {                                    // boss health bar
      const x = 14, w = W - 28, hp = Math.max(0, b.hp / b.maxHp);
      ctx.fillStyle = 'rgba(8,10,20,0.75)'; ctx.fillRect(x - 2, y - 2, w + 4, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, w, 18);
      ctx.fillStyle = A.lg(ctx, x, 0, x + w, 0, [[0, A.shade(b.def.color, -0.2)], [1, b.def.color]]); ctx.fillRect(x, y, w * hp, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; [0.33, 0.66].forEach(f => ctx.fillRect(x + w * f - 1, y, 2, 18));
      ctx.textAlign = 'left'; ctx.font = '800 11px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(`${b.def.name.toUpperCase()} · ${b.def.title}`, x + 8, y + 10);
      ctx.textAlign = 'right'; ctx.fillText(`PHASE ${b.phase}/3`, x + w - 8, y + 10);
      y += 30;
    }
    // objective chip
    ctx.textAlign = 'left';
    ctx.font = '700 12px system-ui, sans-serif';
    const label = this.objectiveText(), tw = ctx.measureText ? ctx.measureText(label).width : 150;
    const cw = Math.max(150, Math.min(W - 24, tw + 24));
    ctx.fillStyle = 'rgba(8,10,20,0.62)'; ctx.fillRect(12, y, cw, 26);
    ctx.fillStyle = this.sector.accent; ctx.fillRect(12, y, 3, 26);
    ctx.fillStyle = '#fff'; ctx.fillText(label, 22, y + 13);
    if (m.stat !== 'none' && m.stat !== 'boss') {
      const pr = this.objectiveProgress();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(12, y + 26, cw, 3);
      ctx.fillStyle = pr.done ? '#7dff9a' : this.sector.accent; ctx.fillRect(12, y + 26, cw * (pr.value / pr.target), 3);
    }
    // combo
    if (r.combo >= 3) {
      const mult = 1 + Math.min(3, Math.floor(r.combo / 6) * 0.5);
      ctx.textAlign = 'right'; ctx.globalAlpha = Math.min(1, r.comboTimer / 0.8);
      ctx.font = '800 22px system-ui, sans-serif'; ctx.fillStyle = '#ffd36b'; ctx.fillText(`x${r.combo}`, W - 14, y + 12);
      ctx.font = '700 11px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(`SCORE x${mult.toFixed(1)}`, W - 14, y + 30);
      ctx.fillStyle = '#ffd36b'; ctx.globalAlpha = 0.9 * Math.min(1, r.comboTimer / 0.8); ctx.fillRect(W - 78, y + 38, 64 * Math.max(0, r.comboTimer / 2.6), 3);
      ctx.globalAlpha = 1;
    }
    // shield pips (bottom-left)
    const n = Math.min(12, p.maxShield), py = H - 22;
    for (let i = 0; i < n; i++) {
      const cx = 22 + i * 20, on = i < p.shield;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = (k / 6) * A.TAU - Math.PI / 2; ctx.lineTo(cx + Math.cos(a) * 8, py + Math.sin(a) * 8); }
      ctx.closePath();
      ctx.fillStyle = on ? (p.shield <= 1 ? '#ff5a5a' : '#6fd0ff') : 'rgba(255,255,255,0.1)'; ctx.fill();
      ctx.strokeStyle = on ? '#ffffff' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    // power-up timers
    let ty = H - 50;
    [['rapid', p.rapid], ['spread', p.spread], ['shield', p.oshield], ['ability', p.ab || p.aegis || p.phase]].forEach(([k, v]) => {
      if (!(v > 0)) return;
      const D = SpaceShooterData.POWERUPS[k], color = D ? D.color : this.ship().colors.glow;
      const total = D ? D.duration : (this.stats.abilityPower * (k === 'ability' ? 4.5 : 3));
      ctx.fillStyle = 'rgba(8,10,20,0.6)'; ctx.fillRect(12, ty - 8, 92, 16);
      ctx.fillStyle = color; ctx.fillRect(12, ty - 8, 3, 16);
      ctx.fillStyle = A.rgba(color, 0.55); ctx.fillRect(18, ty + 3, 82 * Math.min(1, v / total), 3);
      ctx.textAlign = 'left'; ctx.font = '700 10px system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(k === 'ability' ? this.ship().ability.name.toUpperCase() : D.label.toUpperCase(), 20, ty - 1);
      ty -= 20;
    });
    // ability ring (bottom-right)
    const cx = W - 36, cy = H - 36, ready = p.abilityCd <= 0, frac = this.stats ? 1 - p.abilityCd / this.stats.abilityCd : 1;
    ctx.fillStyle = 'rgba(8,10,20,0.65)'; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, A.TAU); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, A.TAU); ctx.stroke();
    ctx.strokeStyle = ready ? this.ship().colors.glow : '#8aa0c0'; ctx.beginPath(); ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + A.TAU * frac); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = '800 11px system-ui, sans-serif'; ctx.fillStyle = ready ? '#fff' : '#8aa0c0';
    ctx.fillText(ready ? 'READY' : Math.ceil(p.abilityCd) + 's', cx, cy + 1);
    if (ready) { ctx.strokeStyle = A.rgba(this.ship().colors.glow, 0.4 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 25, 0, A.TAU); ctx.stroke(); }
  }

  /* ------------------------------------------------------------------ DOM screens */
  fmt(n) { return Number(n).toLocaleString('en-US'); }
  missionCode(m) { return m.id === 'free' ? 'FREE' : `${m.sector}-${m.index}`; }
  currentMission() {
    const D = SpaceShooterData;
    return SpaceShooterSave.missionById(this.save.missions.current) || D.MISSIONS[0];
  }
  missionObjective(m) {
    const D = SpaceShooterData, n = m.target;
    const map = {
      kills: `Destroy ${n} enemies`, killsAsteroid: `Destroy ${n} asteroids`, killsGunship: `Destroy ${n} gunships`,
      killsKamikaze: `Destroy ${n} kamikaze drones`, killsSniper: `Destroy ${n} snipers`, elites: `Defeat ${n} elite enemies`,
      powerups: `Collect ${n} power-ups`, coins: `Collect ${n} coins in one run`, survive: `Survive for ${n} seconds`,
      boss: `Defeat ${m.sector ? D.BOSSES[D.SECTORS[m.sector - 1].boss].name : 'the boss'}`, none: 'Survive as long as you can and set a high score'
    };
    return map[m.stat] || m.title;
  }
  icon(name) {
    const P = {
      home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      ship: '<path d="M12 2l3 8 6 5-1 3-5-2-1 4h-4l-1-4-5 2-1-3 6-5z"/>',
      upgrade: '<path d="M12 4l7 8h-4v8H9v-8H5z"/>',
      mission: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
      trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      check: '<path d="M5 12l5 5 9-10"/>',
      damage: '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
      fireRate: '<path d="M5 6l6 6-6 6M13 6l6 6-6 6"/>',
      shield: '<path d="M12 3l8 4v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V7z"/>',
      speed: '<path d="M3 12h14M12 6l6 6-6 6"/>',
      ability: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
      coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4"/>'
    };
    return `<svg class="ss-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
  }
  thumb(ship) {
    this.thumbs = this.thumbs || {};
    if (this.thumbs[ship.id] !== undefined) return this.thumbs[ship.id];
    let url = '';
    try { const s = SpaceShooterArt.shipSprite(ship, 100); if (s.canvas && s.canvas.toDataURL) url = s.canvas.toDataURL('image/png'); } catch (e) { url = ''; }
    this.thumbs[ship.id] = url;
    return url;
  }

  tabsHtml(active) {
    const items = [['home', 'Home', 'home'], ['hangar', 'Hangar', 'ship'], ['upgrades', 'Upgrades', 'upgrade'], ['missions', 'Missions', 'mission'], ['milestones', 'Medals', 'trophy']];
    return `<nav class="ss-tabs" aria-label="Space Shooter menu">${items.map(i =>
      `<button type="button" class="ss-tab${active === i[0] ? ' active' : ''}" data-act="nav" data-id="${i[0]}"${active === i[0] ? ' aria-current="page"' : ''}>${this.icon(i[2])}<span>${i[1]}</span></button>`).join('')}
      <div class="ss-wallet" title="Your coins">${this.icon('coin')}<b>${this.fmt(this.save.coins)}</b></div></nav>`;
  }
  noticeHtml() {
    let h = '';
    if (this.notice) { h += `<div class="ss-notice ${this.notice.kind || ''}" role="status">${this.notice.msg}</div>`; this.notice = null; }
    if (!this.storageOk) h += '<div class="ss-notice warn" role="alert">Your browser is blocking storage, so progress cannot be saved on this device.</div>';
    else if (this.saveStatus === 'corrupt') h += '<div class="ss-notice warn" role="status">Your saved progress could not be read, so a fresh profile was started. Your high score was kept.</div>';
    return h;
  }

  showScreen(name) {
    this.screen = name;
    this.stopPreview();
    let html = '';
    switch (name) {
      case 'hangar': html = this.hangarHtml(); break;
      case 'upgrades': html = this.upgradesHtml(); break;
      case 'missions': html = this.missionsHtml(); break;
      case 'milestones': html = this.milestonesHtml(); break;
      case 'pause': html = this.pauseHtml(); break;
      case 'results': html = this.resultsHtml(); break;
      default: this.screen = 'home'; html = this.homeHtml();
    }
    if (this.screenEl) this.screenEl.innerHTML = html;
    this.updateDock(this.screen);
    if (this.screen === 'home') this.startPreview(this.save.ships.selected);
    if (this.screen === 'hangar') this.startPreview(this.hangarView);
  }
  /** Navigate to a menu screen from anywhere (results, pause or another menu screen). */
  menuNav(name) {
    if (this.state === 'GAMEOVER') { this.state = 'MENU'; }
    if (this.state === 'MENU') this.setMode('menu');
    this.showScreen(name);
    if (this.root && this.root.scrollIntoView && this.screen !== 'home') { /* keep the page where it is; the menu is in flow */ }
  }

  updateDock(name) {
    let label, note = '';
    if (name === 'pause') { label = 'RESUME'; note = 'Press P or Esc'; }
    else if (name === 'results' && this.lastResult) {
      const r = this.lastResult;
      label = r.result === 'win' ? (r.mission.id !== 'free' && r.nextId !== r.mission.id ? 'NEXT MISSION' : 'FLY AGAIN') : 'RETRY MISSION';
      note = `${this.fmt(this.save.coins)} coins banked`;
    } else {
      const m = this.currentMission();
      label = m.id === 'free' ? 'LAUNCH FREE FLIGHT' : `LAUNCH ${this.missionCode(m)}`;
      note = m.id === 'free' ? `Sector ${this.freeSectorId}` : m.title;
    }
    if (this.btnPlay) this.btnPlay.textContent = label;
    if (this.dockNote) this.dockNote.textContent = note;
    if (this.dockCoins) this.dockCoins.innerHTML = `${this.icon('coin')}<b>${this.fmt(this.save.coins)}</b>`;
  }

  /* ---------- preview canvas (hangar + home) ---------- */
  startPreview(shipId) {
    this.stopPreview();
    const c = this.container.querySelector('#space-preview');
    if (!c || !c.getContext) return;
    const ctx = SpaceShooterArt.safeCtx(c.getContext('2d'));
    if (!ctx) return;
    const ship = this.ship(shipId), w = c.width, h = c.height;
    this.previewT = 0;
    if (this.reducedMotion) { SpaceShooterArt.drawShipPreview(ctx, ship, w, h, 0); return; }
    let last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const step = () => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      this.previewT += Math.min(0.05, (now - last) / 1000); last = now;
      SpaceShooterArt.drawShipPreview(ctx, ship, w, h, this.previewT);
      this.previewId = requestAnimationFrame(step);
    };
    this.previewId = requestAnimationFrame(step);
  }
  stopPreview() { if (this.previewId) { cancelAnimationFrame(this.previewId); this.previewId = 0; } }

  /* ---------- home ---------- */
  homeHtml() {
    const D = SpaceShooterData, s = this.save, m = this.currentMission(), ship = this.ship();
    const cleared = D.SECTORS.filter(sec => (s.missions.progress[`s${sec.id}m3`] || {}).done).length;
    const upLevels = Object.keys(s.upgrades).reduce((a, k) => a + s.upgrades[k], 0);
    const affordable = D.UPGRADES.filter(u => this.upgradeCost(u.id) !== null && this.upgradeCost(u.id) <= s.coins).length;
    const nextShip = D.SHIPS.find(x => !this.owns(x.id));
    return `${this.tabsHtml('home')}${this.noticeHtml()}
      <div class="ss-home">
        <section class="ss-hero" style="--glow:${ship.colors.glow}">
          <div class="ss-logo"><span class="ss-eyebrow">NEO ARCADE VAULT</span><h2>SPACE <b>SHOOTER</b></h2><p>Campaign edition: 6 sectors, 5 ships, 6 bosses</p></div>
          <canvas id="space-preview" class="ss-preview" width="320" height="230" aria-label="${ship.name} ship preview" role="img"></canvas>
          <div class="ss-hero-ship"><b>${ship.name}</b><span>${ship.role}</span></div>
        </section>
        <section class="ss-statline">
          <div><b>${this.fmt(s.stats.bestScore)}</b><span>Best score</span></div>
          <div><b>${cleared}/6</b><span>Sectors cleared</span></div>
          <div><b>${s.ships.owned.length}/5</b><span>Ships owned</span></div>
          <div><b>${Object.keys(s.achievements).length}/${D.ACHIEVEMENTS.length}</b><span>Medals</span></div>
        </section>
        <section class="ss-mission-now">
          <span class="ss-eyebrow">${m.id === 'free' ? 'FREE FLIGHT' : `SECTOR ${m.sector} · MISSION ${m.index}`}</span>
          <h3>${m.title}</h3>
          <p>${this.missionObjective(m)}</p>
          ${m.id === 'free' ? '' : `<div class="ss-reward">${this.icon('coin')}<b>${this.fmt(m.reward)}</b> first-clear reward${m.boss ? ' · BOSS' : ''}</div>`}
        </section>
        <section class="ss-menu-grid">
          <button type="button" class="ss-tile" data-act="nav" data-id="hangar">${this.icon('ship')}<b>Hangar</b><span>${nextShip ? `Next: ${nextShip.name} (${this.fmt(nextShip.cost)})` : 'Fleet complete'}</span></button>
          <button type="button" class="ss-tile" data-act="nav" data-id="upgrades">${this.icon('upgrade')}<b>Upgrades</b><span>${affordable ? `${affordable} affordable now` : `${upLevels} levels bought`}</span></button>
          <button type="button" class="ss-tile" data-act="nav" data-id="missions">${this.icon('mission')}<b>Mission board</b><span>${cleared === 6 ? 'All sectors cleared' : `Sector ${this.highestSector()} open`}</span></button>
          <button type="button" class="ss-tile" data-act="nav" data-id="milestones">${this.icon('trophy')}<b>Milestones</b><span>${Object.keys(s.achievements).length} of ${D.ACHIEVEMENTS.length} earned</span></button>
        </section>
        <p class="ss-controls">Move: arrows / WASD or drag · Fire: Space or hold · Ability: Shift / E · Pause: P</p>
      </div>`;
  }

  /* ---------- hangar ---------- */
  statRow(label, iconName, value, pct, text) {
    return `<div class="ss-stat"><span class="ss-stat-l">${this.icon(iconName)}${label}</span><span class="ss-bar"><i style="width:${Math.max(4, Math.min(100, Math.round(pct * 100)))}%"></i></span><b>${text}</b></div>`;
  }
  hangarHtml() {
    const D = SpaceShooterData, s = this.save;
    if (!this.hangarView || !D.SHIPS.some(x => x.id === this.hangarView)) this.hangarView = s.ships.selected;
    const ship = this.ship(this.hangarView), st = this.getStats(ship.id), owned = this.owns(ship.id), equipped = s.ships.selected === ship.id;
    let btn;
    if (equipped) btn = '<button type="button" class="ss-btn done" disabled>EQUIPPED</button>';
    else if (owned) btn = `<button type="button" class="ss-btn primary" data-act="equip" data-id="${ship.id}">EQUIP ${ship.name.toUpperCase()}</button>`;
    else if (s.coins >= ship.cost) btn = `<button type="button" class="ss-btn primary" data-act="buy-ship" data-id="${ship.id}">${this.icon('coin')} UNLOCK · ${this.fmt(ship.cost)}</button>`;
    else btn = `<button type="button" class="ss-btn locked" disabled>${this.icon('lock')} ${this.fmt(ship.cost)} · need ${this.fmt(ship.cost - s.coins)} more</button>`;
    const cards = D.SHIPS.map(x => {
      const own = this.owns(x.id), t = this.thumb(x);
      return `<button type="button" class="ss-shipcard${x.id === ship.id ? ' active' : ''}${own ? '' : ' locked'}" data-act="view-ship" data-id="${x.id}" aria-pressed="${x.id === ship.id}" aria-label="${x.name}, ${own ? (s.ships.selected === x.id ? 'equipped' : 'owned') : 'locked, ' + x.cost + ' coins'}">
        ${t ? `<img src="${t}" alt="" width="56" height="56">` : `<span class="ss-fallback">${x.name.charAt(0)}</span>`}
        <b>${x.name}</b><span class="ss-tag">${s.ships.selected === x.id ? 'EQUIPPED' : (own ? 'OWNED' : this.fmt(x.cost))}</span></button>`;
    }).join('');
    return `${this.tabsHtml('hangar')}${this.noticeHtml()}
      <div class="ss-hangar" style="--glow:${ship.colors.glow}">
        <section class="ss-showcase${owned ? '' : ' is-locked'}">
          <canvas id="space-preview" class="ss-preview" width="360" height="260" aria-label="${ship.name} preview" role="img"></canvas>
          <span class="ss-badge ${equipped ? 'on' : (owned ? 'own' : 'lock')}">${equipped ? 'EQUIPPED' : (owned ? 'OWNED' : 'LOCKED')}</span>
          ${owned ? '' : `<div class="ss-lockveil">${this.icon('lock')}<span>${this.fmt(ship.cost)} coins</span></div>`}
        </section>
        <section class="ss-shipinfo">
          <div class="ss-shiphead"><h3>${ship.name}</h3><span class="ss-role">${ship.role}</span></div>
          <p class="ss-blurb">${ship.blurb}</p>
          <div class="ss-actions">${btn}</div>
          <div class="ss-stats">
            ${this.statRow('Armor', 'shield', st.maxShield, st.maxShield / 9, `${st.maxShield} shield`)}
            ${this.statRow('Speed', 'speed', st.speed, st.speed / 460, `${Math.round(st.speed)}`)}
            ${this.statRow('Firepower', 'damage', st.dps, st.dps / 18, `${st.dps.toFixed(1)} dps`)}
            ${this.statRow('Fire rate', 'fireRate', st.fireRate, st.fireRate / 11, `${st.fireRate.toFixed(1)}/s`)}
          </div>
          <div class="ss-kv"><span>Weapon</span><b>${ship.weapon}</b></div>
          <div class="ss-ability"><div><b>${ship.ability.name}</b><i>${st.abilityCd.toFixed(1)}s cooldown</i></div><p>${ship.ability.desc}</p></div>
          <p class="ss-fine">Stats include your upgrades, which apply to every ship.</p>
        </section>
        <section class="ss-shiplist" aria-label="Choose a ship">${cards}</section>
      </div>`;
  }

  /* ---------- upgrades ---------- */
  upgradesHtml() {
    const D = SpaceShooterData, s = this.save, ship = this.ship(), st = this.getStats();
    const cards = D.UPGRADES.map(u => {
      const lvl = this.upgradeLevel(u.id), cost = this.upgradeCost(u.id), maxed = cost === null;
      let btn;
      if (maxed) btn = '<button type="button" class="ss-btn done" disabled>MAX LEVEL</button>';
      else if (s.coins >= cost) btn = `<button type="button" class="ss-btn primary" data-act="buy-up" data-id="${u.id}">${this.icon('coin')} UPGRADE · ${this.fmt(cost)}</button>`;
      else btn = `<button type="button" class="ss-btn locked" disabled>${this.icon('coin')} ${this.fmt(cost)} · need ${this.fmt(cost - s.coins)} more</button>`;
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      const now = lvl ? u.desc(lvl) : 'No bonus yet';
      const nextTxt = maxed ? '' : `<span class="ss-next">Next: ${u.desc(lvl + 1)}</span>`;
      const extra = u.id === 'ability' ? ` (${ship.ability.name})` : '';
      return `<article class="ss-up${maxed ? ' maxed' : ''}">
        <div class="ss-up-head"><span class="ss-up-ico">${this.icon(u.id)}</span><div><h3>${u.name}${extra}</h3><span class="ss-lv">Level ${lvl} / ${u.max}</span></div></div>
        <div class="ss-pips" role="img" aria-label="Level ${lvl} of ${u.max}">${pips}</div>
        <p class="ss-now">${now}</p>${nextTxt}${btn}</article>`;
    }).join('');
    return `${this.tabsHtml('upgrades')}${this.noticeHtml()}
      <div class="ss-upgrades">
        <section class="ss-summary"><b>${ship.name}</b><span>Armor <em>${st.maxShield}</em></span><span>Speed <em>${Math.round(st.speed)}</em></span><span>DPS <em>${st.dps.toFixed(1)}</em></span><span>Ability <em>${st.abilityCd.toFixed(1)}s</em></span></section>
        <div class="ss-up-grid">${cards}</div>
        <p class="ss-fine">Upgrades are permanent and apply to every ship you own.</p>
      </div>`;
  }

  /* ---------- mission board ---------- */
  missionsHtml() {
    const D = SpaceShooterData, s = this.save;
    if (!SpaceShooterSave.sectorUnlocked(s, this.sectorView)) this.sectorView = this.highestSector();
    const sec = D.SECTORS[this.sectorView - 1], boss = D.BOSSES[sec.boss], cur = s.missions.current;
    const chips = D.SECTORS.map(x => {
      const unlocked = SpaceShooterSave.sectorUnlocked(s, x.id), done = (s.missions.progress[`s${x.id}m3`] || {}).done;
      return `<button type="button" class="ss-chip${x.id === sec.id ? ' active' : ''}${unlocked ? '' : ' locked'}" data-act="sector" data-id="${x.id}" ${unlocked ? '' : 'disabled'} aria-label="Sector ${x.id} ${x.name}${unlocked ? '' : ', locked'}"><b>${unlocked ? x.id : this.icon('lock')}</b><span>${done ? '✓' : ''}</span></button>`;
    }).join('');
    const missions = D.MISSIONS.filter(m => m.sector === sec.id).map((m, i, arr) => {
      const prog = s.missions.progress[m.id] || {}, unlocked = this.missionUnlocked(m.id);
      const reason = m.index === 1 ? `Defeat the boss of sector ${sec.id - 1} to unlock` : 'Clear the previous mission to unlock';
      const status = prog.done ? '<span class="ss-state done">CLEARED</span>' : (unlocked ? '<span class="ss-state new">AVAILABLE</span>' : '<span class="ss-state lock">LOCKED</span>');
      return `<article class="ss-mission${m.boss ? ' boss' : ''}${unlocked ? '' : ' is-locked'}${cur === m.id ? ' current' : ''}">
        <div class="ss-mission-top"><span class="ss-num">${m.index}</span><div><h3>${m.title}</h3>${status}</div>${m.boss ? '<span class="ss-bossflag">BOSS</span>' : ''}</div>
        <p class="ss-obj">${this.icon('mission')}${this.missionObjective(m)}</p>
        <p class="ss-bonus${prog.bonus ? ' got' : ''}">${prog.bonus ? this.icon('check') : this.icon('ability')}Bonus: ${m.bonus.label} <b>+${m.bonus.reward}</b></p>
        <div class="ss-mission-foot"><span class="ss-reward">${this.icon('coin')}<b>${this.fmt(m.reward)}</b>${prog.done ? ' (30% on repeats)' : ''}</span>${prog.best ? `<span class="ss-best">Best ${this.fmt(prog.best)}</span>` : ''}</div>
        ${unlocked ? `<button type="button" class="ss-btn primary" data-act="deploy" data-id="${m.id}">${prog.done ? 'REPLAY' : 'DEPLOY'}</button>` : `<button type="button" class="ss-btn locked" disabled>${this.icon('lock')} ${reason}</button>`}
      </article>`;
    }).join('');
    const pool = Object.keys(sec.pool).map(k => `<span class="ss-pill">${D.ENEMIES[k].name}</span>`).join('');
    return `${this.tabsHtml('missions')}${this.noticeHtml()}
      <div class="ss-missions">
        <div class="ss-chips" role="group" aria-label="Sectors">${chips}</div>
        <section class="ss-sector" style="--c1:${sec.bg[1]};--c2:${sec.bg[2]};--acc:${sec.accent}">
          <span class="ss-eyebrow">SECTOR ${sec.id} · ${sec.tag.toUpperCase()}</span>
          <h3>${sec.name}</h3><p>${sec.desc}</p>
          <div class="ss-sector-meta"><span><em>Hazard</em>${sec.hazard}</span><span><em>Boss</em>${boss.name}, ${boss.title}</span></div>
          <div class="ss-pills">${pool}</div>
        </section>
        <div class="ss-mission-list">${missions}</div>
        <section class="ss-free"><div><h3>Free flight</h3><p>Endless survival in sector ${sec.id}. No objective: chase a high score, collect coins and power-ups.</p></div>
          <button type="button" class="ss-btn ghost" data-act="deploy-free" data-id="${sec.id}">LAUNCH</button></section>
      </div>`;
  }

  /* ---------- milestones ---------- */
  milestonesHtml() {
    const D = SpaceShooterData, s = this.save, st = s.stats;
    const rows = D.ACHIEVEMENTS.map(a => {
      const done = !!s.achievements[a.id], v = Math.min(a.target, this.achStat(a.stat));
      const show = a.stat === 'bestTime' ? `${v}s / ${a.target}s` : `${this.fmt(v)} / ${this.fmt(a.target)}`;
      return `<article class="ss-ach${done ? ' done' : ''}"><span class="ss-ach-ico">${this.icon(done ? 'trophy' : 'lock')}</span>
        <div><h3>${a.name}</h3><p>${a.desc}</p>${done ? '' : `<span class="ss-bar"><i style="width:${Math.max(2, Math.round(v / a.target * 100))}%"></i></span><small>${show}</small>`}</div>
        <span class="ss-ach-reward">${done ? this.icon('check') : '+'}${done ? '' : this.fmt(a.reward)}</span></article>`;
    }).join('');
    const mins = Math.floor(st.playSeconds / 60);
    return `${this.tabsHtml('milestones')}${this.noticeHtml()}
      <div class="ss-milestones">
        <section class="ss-statline">
          <div><b>${this.fmt(st.kills)}</b><span>Enemies destroyed</span></div><div><b>${st.bosses.length}/6</b><span>Bosses beaten</span></div>
          <div><b>${this.fmt(st.coinsEarned)}</b><span>Coins earned</span></div><div><b>${mins}m</b><span>Time flown</span></div>
        </section>
        <p class="ss-fine">${Object.keys(s.achievements).length} of ${D.ACHIEVEMENTS.length} medals earned. Each one pays coins the moment it unlocks.</p>
        <div class="ss-ach-list">${rows}</div>
      </div>`;
  }

  /* ---------- pause ---------- */
  pauseHtml() {
    const r = this.run, m = this.mission, pr = this.objectiveProgress(), ship = this.ship();
    const pct = pr.target ? Math.round(pr.value / pr.target * 100) : 0;
    return `<div class="ss-modal" role="dialog" aria-modal="true" aria-label="Game paused">
      <span class="ss-eyebrow">${m.id === 'free' ? 'FREE FLIGHT' : `SECTOR ${m.sector} · ${m.title.toUpperCase()}`}</span>
      <h2>PAUSED</h2>
      ${pr.target ? `<div class="ss-obj-card"><span>${this.objectiveText()}</span><span class="ss-bar"><i style="width:${pct}%"></i></span></div>` : ''}
      <div class="ss-mini-stats">
        <div><b>${this.fmt(this.score)}</b><span>Score</span></div><div><b>${r ? r.kills : 0}</b><span>Kills</span></div>
        <div><b>${r ? r.coins : 0}</b><span>Coins</span></div><div><b>${this.formatTime(r ? r.time : 0)}</b><span>Time</span></div>
      </div>
      <p class="ss-fine">${ship.name}: ${ship.ability.name}. Shift or E to use it. Coins you have picked up are already saved.</p>
      <div class="ss-actions row">
        <button type="button" class="ss-btn ghost" data-act="restart">RESTART MISSION</button>
        <button type="button" class="ss-btn ghost" data-act="abort">ABORT TO MENU</button>
      </div></div>`;
  }

  /* ---------- results ---------- */
  resultsHtml() {
    const r = this.lastResult;
    if (!r) return '<div class="ss-modal"><h2>No results yet</h2></div>';
    const win = r.result === 'win', free = r.mission.id === 'free';
    const title = free ? 'FLIGHT OVER' : (win ? 'MISSION COMPLETE' : 'MISSION FAILED');
    const rows = [];
    rows.push(['Coins picked up', r.pickupCoins]);
    if (!free) rows.push([win ? (r.firstClear ? 'Mission reward' : 'Replay reward (30%)') : 'Mission reward', win ? r.missionReward : 0, !win]);
    if (!free && r.bonusLabel) rows.push([`Bonus: ${r.bonusLabel}`, r.bonusDone ? r.bonusReward : 0, !r.bonusDone]);
    rows.push(['Score bonus', r.scoreBonus]);
    const ach = r.fresh && r.fresh.length ? `<div class="ss-newach"><h4>${this.icon('trophy')} Medals unlocked</h4>${r.fresh.map(a => `<p><b>${a.name}</b> <span>+${a.reward} coins</span></p>`).join('')}</div>` : '';
    return `<div class="ss-modal ss-results ${win ? 'win' : 'lose'}" role="dialog" aria-modal="true" aria-label="${title}">
      <span class="ss-eyebrow">${free ? `FREE FLIGHT · SECTOR ${r.sector.id}` : `SECTOR ${r.mission.sector} · ${r.mission.title.toUpperCase()}`}</span>
      <h2>${title}</h2>
      <div class="ss-score"><b>${this.fmt(r.score)}</b>${r.newBest ? '<span class="ss-newbest">NEW BEST</span>' : `<span class="ss-bestline">Best ${this.fmt(this.save.stats.bestScore)}</span>`}</div>
      <div class="ss-mini-stats">
        <div><b>${r.kills}</b><span>Kills</span></div><div><b>${r.elites}</b><span>Elites</span></div>
        <div><b>${this.formatTime(r.time)}</b><span>Time</span></div><div><b>${r.accuracy}%</b><span>Accuracy</span></div>
        <div><b>x${r.maxCombo}</b><span>Best combo</span></div><div><b>${r.damageTaken}</b><span>Hits taken</span></div>
      </div>
      <div class="ss-ledger">${rows.map(x => `<div class="${x[2] ? 'miss' : ''}"><span>${x[0]}</span><b>${x[1] ? '+' : ''}${this.fmt(x[1])}</b></div>`).join('')}
        <div class="total"><span>Total earned</span><b>${this.icon('coin')}${this.fmt(r.totalCoins)}</b></div></div>
      ${r.saved ? '' : '<p class="ss-fine warn">Progress could not be saved: storage is unavailable.</p>'}
      <div class="ss-actions row">
        <button type="button" class="ss-btn ghost" data-act="nav" data-id="hangar">HANGAR</button>
        <button type="button" class="ss-btn ghost" data-act="nav" data-id="upgrades">UPGRADES</button>
        <button type="button" class="ss-btn ghost" data-act="nav" data-id="missions">MISSIONS</button>
        <button type="button" class="ss-btn ghost" data-act="nav" data-id="home">MENU</button>
      </div>
      ${ach}</div>`;
  }

  /* ---------- actions from the DOM screens ---------- */
  say(msg, kind) { this.notice = { msg, kind }; }
  handleAction(act, id) {
    if (this.destroyed) return;
    switch (act) {
      case 'nav': this.menuNav(id); break;
      case 'view-ship': this.hangarView = id; this.showScreen('hangar'); break;
      case 'equip': {
        const res = this.selectShip(id);
        this.say(res.ok ? `${this.ship(id).name} equipped.` : 'You need to unlock that ship first.', res.ok ? 'good' : 'warn');
        this.sfx('playClick'); this.showScreen('hangar'); break;
      }
      case 'buy-ship': {
        const res = this.buyShip(id);
        if (res.ok) { this.say(`${this.ship(id).name} unlocked and equipped.`, 'good'); this.sfx('playPowerup'); }
        else this.say(res.reason === 'coins' ? `You need ${this.fmt(res.need)} more coins.` : 'That ship cannot be bought.', 'warn');
        this.showScreen('hangar'); break;
      }
      case 'buy-up': {
        const res = this.buyUpgrade(id);
        if (res.ok) { this.say(`${this.upgradeDef(id).name} is now level ${res.level}.`, 'good'); this.sfx('playPowerup'); }
        else this.say(res.reason === 'max' ? 'Already at max level.' : (res.reason === 'coins' ? `You need ${this.fmt(res.need)} more coins.` : 'Upgrade unavailable.'), 'warn');
        this.showScreen('upgrades'); break;
      }
      case 'sector': {
        const n = Number(id);
        if (SpaceShooterSave.sectorUnlocked(this.save, n)) { this.sectorView = n; this.sfx('playClick'); this.showScreen('missions'); }
        break;
      }
      case 'deploy': {
        const res = this.selectMission(id);
        if (res.ok) this.start(); else { this.say('Clear the earlier mission first.', 'warn'); this.showScreen('missions'); }
        break;
      }
      case 'deploy-free': {
        const n = Number(id);
        if (SpaceShooterSave.sectorUnlocked(this.save, n)) { this.freeSectorId = n; this.campaignMission = this.save.missions.current === 'free' ? this.campaignMission : this.save.missions.current; this.save.missions.current = 'free'; this.start(); }
        break;
      }
      case 'restart': this.start(); break;
      case 'abort': this.abortRun(); break;
    }
  }
}

SpaceShooterGame.DATA = SpaceShooterData;
SpaceShooterGame.SAVE = SpaceShooterSave;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpaceShooterGame };
}
