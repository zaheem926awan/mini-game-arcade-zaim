/**
 * Render test using mock 2D context to verify all procedural canvas drawing routines.
 */

const assert = require('assert');
const { FRUIT_TYPES, Fruit, FruitHalf, JuiceParticle, BombSparkParticle, FloatingScoreText, BladeTrail } = require('../js/fruit.js');

// Mock Canvas 2D Context
function createMockContext() {
  const noop = () => {};
  return {
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    beginPath: noop,
    closePath: noop,
    clip: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    ellipse: noop,
    rect: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    strokeText: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'top'
  };
}

console.log('--- Testing Procedural Canvas Rendering ---');

const mockCtx = createMockContext();

// Test rendering for every fruit type (whole)
Object.keys(FRUIT_TYPES).forEach(typeKey => {
  const fruit = new Fruit(typeKey, 150, 150, 2, -5);
  fruit.render(mockCtx);
  console.log(`  [PASS] Rendered whole ${typeKey}`);
});

// Test rendering for both halves of every fruit type
Object.keys(FRUIT_TYPES).forEach(typeKey => {
  if (typeKey === 'BOMB') return; // bombs explode rather than split
  const fruit = new Fruit(typeKey, 150, 150, 2, -5);
  const half1 = new FruitHalf(fruit, -1, 0.4);
  const half2 = new FruitHalf(fruit, 1, 0.4);
  half1.render(mockCtx);
  half2.render(mockCtx);
  console.log(`  [PASS] Rendered split halves for ${typeKey}`);
});

// Test particles and text rendering
const juice = new JuiceParticle(100, 100, '#ff4757');
juice.render(mockCtx);
console.log('  [PASS] Rendered JuiceParticle');

const bombSpark = new BombSparkParticle(100, 100, true);
bombSpark.render(mockCtx);
console.log('  [PASS] Rendered BombSparkParticle');

const text = new FloatingScoreText('+5 COMBO', 100, 100, '#ffa502', true);
text.render(mockCtx);
console.log('  [PASS] Rendered FloatingScoreText');

const trail = new BladeTrail('#00d2d3');
trail.addPoint(10, 10);
trail.addPoint(50, 60);
trail.render(mockCtx);
console.log('  [PASS] Rendered BladeTrail');

console.log('\nAll rendering calls executed flawlessly without errors!');
