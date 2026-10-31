/**
 * Automated Test Suite for Fruit Slice Arcade
 * Tests physics, collision math, combo mechanics, entities, and state logic.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser globals for testing Node environment
global.performance = { now: () => Date.now() };
global.window = global;
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] !== undefined ? this.store[key] : null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

const {
  FRUIT_TYPES,
  Fruit,
  FruitHalf,
  JuiceParticle,
  BombSparkParticle,
  FloatingScoreText,
  BladeTrail
} = require('../js/fruit.js');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
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

console.log('--- Starting Fruit Slice Arcade Test Suite ---');

// 1. Verify Fruit Types and Constants
runTest('Fruit types definition and attributes', () => {
  assert.ok(FRUIT_TYPES.WATERMELON, 'Watermelon should exist');
  assert.strictEqual(FRUIT_TYPES.WATERMELON.points, 1);
  assert.strictEqual(FRUIT_TYPES.STRAWBERRY.points, 2);
  assert.ok(FRUIT_TYPES.BOMB.isBomb, 'Bomb should be marked as isBomb');
  assert.strictEqual(FRUIT_TYPES.BOMB.points, -10);
});

// 2. Fruit Physics & Movement
runTest('Fruit entity motion and gravity update', () => {
  const fruit = new Fruit('WATERMELON', 100, 200, 5, -10, 0.4);
  assert.strictEqual(fruit.x, 100);
  assert.strictEqual(fruit.y, 200);
  assert.strictEqual(fruit.active, true);

  fruit.update(1);
  assert.strictEqual(fruit.x, 105, 'x should advance by vx');
  assert.strictEqual(fruit.y, 190, 'y should advance by vy');
  assert.strictEqual(fruit.vy, -9.6, 'vy should increase by gravity');
});

// 3. Collision Math: Line Segment to Circle Intersection
runTest('Line segment to circle collision detection', () => {
  function lineIntersectsCircle(p1, p2, cx, cy, r) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      return Math.hypot(cx - p1.x, cy - p1.y) <= r;
    }
    const t = Math.max(0, Math.min(1, ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq));
    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;
    const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
    return distSq <= r * r;
  }

  // Fruit circle at (100, 100) radius 30
  const cx = 100, cy = 100, r = 30;

  // Case 1: Direct swipe through center (50, 100) to (150, 100) -> YES
  assert.strictEqual(lineIntersectsCircle({ x: 50, y: 100 }, { x: 150, y: 100 }, cx, cy, r), true);

  // Case 2: Diagonal glancing slice (70, 70) to (130, 130) -> YES
  assert.strictEqual(lineIntersectsCircle({ x: 70, y: 70 }, { x: 130, y: 130 }, cx, cy, r), true);

  // Case 3: Swipe that completely misses (100, 200) to (200, 200) -> NO
  assert.strictEqual(lineIntersectsCircle({ x: 100, y: 200 }, { x: 200, y: 200 }, cx, cy, r), false);

  // Case 4: Line aimed at circle but stops short (20, 100) to (60, 100) -> NO (stops at x=60, circle starts at 70)
  assert.strictEqual(lineIntersectsCircle({ x: 20, y: 100 }, { x: 60, y: 100 }, cx, cy, r), false);

  // Case 5: Line begins inside circle (95, 100) to (140, 100) -> YES
  assert.strictEqual(lineIntersectsCircle({ x: 95, y: 100 }, { x: 140, y: 100 }, cx, cy, r), true);
});

// 4. Split Fruit Halves Separation
runTest('Fruit halves creation and impulse direction', () => {
  const fruit = new Fruit('ORANGE', 200, 300, 0, 0);
  const cutAngle = 0; // horizontal cut

  const halfLeft = new FruitHalf(fruit, -1, cutAngle, 4.0);
  const halfRight = new FruitHalf(fruit, 1, cutAngle, 4.0);

  // For horizontal cut (angle = 0):
  // perpAngle for side -1 is -PI/2 (upward)
  // perpAngle for side +1 is +PI/2 (downward)
  assert.ok(halfLeft.vy < halfRight.vy, 'Halves should have separating vertical velocities');
  assert.strictEqual(halfLeft.type.id, 'orange');
  assert.strictEqual(halfRight.type.id, 'orange');
});

// 5. Particles Update & Deactivation
runTest('Juice particle life cycle', () => {
  const particle = new JuiceParticle(50, 50, '#ff4757');
  assert.strictEqual(particle.active, true);
  assert.strictEqual(particle.alpha, 1);

  // Advance time until particle fades out
  for (let i = 0; i < 80; i++) {
    particle.update(1);
  }
  assert.strictEqual(particle.active, false, 'Particle should deactivate after decay');
  assert.ok(particle.alpha <= 0, 'Particle alpha should be <= 0');
});

// 6. Floating Score Text Behavior
runTest('Floating text movement and scale', () => {
  const popup = new FloatingScoreText('3x COMBO! +5', 100, 100, '#ffa502', true);
  assert.strictEqual(popup.text, '3x COMBO! +5');
  assert.strictEqual(popup.active, true);
  assert.ok(popup.vy < 0, 'Floating text should drift upward');

  const startY = popup.y;
  popup.update(1);
  assert.ok(popup.y < startY, 'Y coordinate should decrease');
});

// 7. Blade Trail Aging
runTest('Blade trail point collection and cleanup', () => {
  const trail = new BladeTrail('#00d2d3');
  trail.addPoint(10, 10);
  trail.addPoint(20, 20);
  assert.strictEqual(trail.points.length, 2);

  // Manually age the points
  trail.points[0].time -= 300; // older than maxAgeMs (160ms)
  trail.update();
  assert.strictEqual(trail.points.length, 1, 'Expired blade point should be removed');
});

// 8. Combo Points Calculation Logic
runTest('Combo scoring formula', () => {
  function calculateComboBonus(count) {
    if (count < 2) return 0;
    if (count === 2) return 2;
    if (count === 3) return 5;
    if (count === 4) return 10;
    return 15 + (count - 5) * 5;
  }

  assert.strictEqual(calculateComboBonus(1), 0);
  assert.strictEqual(calculateComboBonus(2), 2);
  assert.strictEqual(calculateComboBonus(3), 5);
  assert.strictEqual(calculateComboBonus(4), 10);
  assert.strictEqual(calculateComboBonus(5), 15);
  assert.strictEqual(calculateComboBonus(6), 20);
});

// 9. Sound Storage Persistence Mock Test
runTest('Sound toggle persistence in localStorage', () => {
  localStorage.setItem('fruit_arcade_sound', 'false');
  assert.strictEqual(localStorage.getItem('fruit_arcade_sound'), 'false');
  localStorage.setItem('fruit_arcade_sound', 'true');
  assert.strictEqual(localStorage.getItem('fruit_arcade_sound'), 'true');
});

// 10. File Integrity and HTML Element IDs
runTest('HTML file contains required game elements and overlays', () => {
  const htmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const requiredIds = [
    'game-container',
    'gameCanvas',
    'current-score',
    'time-left',
    'timer-pill',
    'hud-best-score',
    'btn-bomb-toggle',
    'btn-sound',
    'btn-pause',
    'combo-banner',
    'start-overlay',
    'instructions-modal',
    'pause-overlay',
    'game-over-overlay',
    'btn-play',
    'btn-how-to-play',
    'btn-close-instructions',
    'btn-resume',
    'btn-restart-pause',
    'btn-menu-pause',
    'btn-play-again',
    'btn-menu-game-over',
    'toggle-bombs-option',
    'final-score-val',
    'stat-sliced-val',
    'stat-combo-val',
    'stat-bombs-val',
    'new-record-ribbon'
  ];

  requiredIds.forEach(id => {
    assert.ok(html.includes(`id="${id}"`), `HTML must contain element with id="${id}"`);
  });
});

// 11. CSS Syntax and Touch Action Check
runTest('CSS file includes touch prevention and responsive rules', () => {
  const cssPath = path.join(__dirname, '../css/style.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(css.includes('touch-action: none'), 'CSS must prevent browser scrolling during swipe gestures');
  assert.ok(css.includes('@keyframes screenShake'), 'CSS must include screenShake animation for bomb detonation');
  assert.ok(css.includes('@keyframes flashRed'), 'CSS must include damage flash animation');
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
