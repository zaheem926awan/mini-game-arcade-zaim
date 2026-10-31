/**
 * Fruit Slice Arcade - Fruit Entities, Procedural Canvas Graphics & Particles
 * Premium edition: new fruits, true split halves, juice splats, shock rings,
 * slice flashes, animated arcade backdrop and a glowing tapered blade trail.
 */

const FRUIT_TYPES = {
  WATERMELON: {
    id: 'watermelon',
    name: 'Watermelon',
    radius: 42,
    color: '#ff4757',
    secondaryColor: '#2ed573',
    juice: '#ff4757',
    points: 1,
    weight: 20
  },
  ORANGE: {
    id: 'orange',
    name: 'Orange',
    radius: 35,
    color: '#ffa502',
    secondaryColor: '#ff7f50',
    juice: '#ffa502',
    points: 1,
    weight: 18
  },
  STRAWBERRY: {
    id: 'strawberry',
    name: 'Strawberry',
    radius: 28,
    color: '#ff3838',
    secondaryColor: '#2ed573',
    juice: '#ff3838',
    points: 2,
    weight: 16
  },
  APPLE: {
    id: 'apple',
    name: 'Crisp Apple',
    radius: 34,
    color: '#ff4d4d',
    secondaryColor: '#7bed9f',
    juice: '#ffe9a8',
    points: 1,
    weight: 16
  },
  BANANA: {
    id: 'banana',
    name: 'Banana',
    radius: 32,
    color: '#eccc68',
    secondaryColor: '#70a1ff',
    juice: '#f6e58d',
    points: 1,
    weight: 14
  },
  PINEAPPLE: {
    id: 'pineapple',
    name: 'Pineapple',
    radius: 40,
    color: '#f9ca24',
    secondaryColor: '#6ab04c',
    juice: '#f9ca24',
    points: 2,
    weight: 12
  },
  KIWI: {
    id: 'kiwi',
    name: 'Kiwi',
    radius: 30,
    color: '#8bd450',
    secondaryColor: '#6d4c41',
    juice: '#9be15d',
    points: 2,
    weight: 12
  },
  GOLDEN: {
    id: 'golden',
    name: 'Golden Apple',
    radius: 36,
    color: '#ffd32a',
    secondaryColor: '#fff6a8',
    juice: '#ffd32a',
    points: 5,
    timeBonus: 2,
    isGolden: true,
    weight: 0 // rare, spawned separately
  },
  BOMB: {
    id: 'bomb',
    name: 'Bomb',
    radius: 34,
    color: '#718096',
    secondaryColor: '#ff4757',
    juice: '#ff9f1a',
    points: -10,
    isBomb: true,
    weight: 0 // handled separately
  }
};

function drawShine(ctx, r, alpha = 0.35) {
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.26, r * 0.13, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fill();
}

function drawStar4(ctx, x, y, size, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.15, -size * 0.15, size, 0);
  ctx.quadraticCurveTo(size * 0.15, size * 0.15, 0, size);
  ctx.quadraticCurveTo(-size * 0.15, size * 0.15, -size, 0);
  ctx.quadraticCurveTo(-size * 0.15, -size * 0.15, 0, -size);
  ctx.fill();
  ctx.restore();
}

/**
 * Active whole fruit or bomb soaring across screen
 */
class Fruit {
  constructor(typeKey, startX, startY, vx, vy, gravity = 0.38) {
    this.type = FRUIT_TYPES[typeKey] || FRUIT_TYPES.WATERMELON;
    this.x = startX;
    this.y = startY;
    this.vx = vx;
    this.vy = vy;
    this.gravity = gravity;
    this.radius = this.type.radius;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.08;
    this.isSliced = false;
    this.isBomb = !!this.type.isBomb;
    this.isGolden = !!this.type.isGolden;
    this.active = true;
    this.fuseTimer = 0;
    this.age = 0; // in frames
    this.bornAt = performance.now();
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.rotation += this.vRot * deltaTime;
    this.age += deltaTime;

    if (this.isBomb) {
      this.fuseTimer += deltaTime * 0.15;
    }
  }

  // Draw procedural fruit onto canvas context
  render(ctx) {
    if (!this.active || this.isSliced) return;

    // Pop-in scale (ease out back) so fruit "bursts" out of the bottom edge
    const t = Math.min(1, this.age / 12);
    const pop = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
    const scale = Math.max(0.4, 0.55 + 0.45 * pop);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(scale, scale);

    if (this.isBomb) {
      ctx.shadowColor = 'rgba(255, 71, 87, 0.65)';
      ctx.shadowBlur = 12 + Math.sin(this.fuseTimer * 14) * 6;
    } else if (this.isGolden) {
      ctx.shadowColor = 'rgba(255, 211, 42, 0.95)';
      ctx.shadowBlur = 20 + Math.sin(this.age * 0.2) * 8;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }

    switch (this.type.id) {
      case 'watermelon': this.drawWatermelon(ctx); break;
      case 'orange': this.drawOrange(ctx); break;
      case 'strawberry': this.drawStrawberry(ctx); break;
      case 'apple': this.drawApple(ctx, false); break;
      case 'golden': this.drawApple(ctx, true); break;
      case 'banana': this.drawBanana(ctx); break;
      case 'pineapple': this.drawPineapple(ctx); break;
      case 'kiwi': this.drawKiwi(ctx); break;
      case 'bomb': this.drawBomb(ctx); break;
      default: this.drawDefault(ctx);
    }

    ctx.restore();

    // Orbiting sparkles for the golden fruit (drawn unrotated)
    if (this.isGolden) {
      ctx.save();
      ctx.translate(this.x, this.y);
      for (let i = 0; i < 3; i++) {
        const a = this.age * 0.08 + (i * Math.PI * 2) / 3;
        const rr = this.radius * 1.25;
        const pulse = 0.5 + 0.5 * Math.sin(this.age * 0.25 + i * 2);
        drawStar4(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 5 + pulse * 5, 0.5 + pulse * 0.5);
      }
      ctx.restore();
    }
  }

  drawWatermelon(ctx) {
    const r = this.radius;

    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#3ddc84');
    grad.addColorStop(0.7, '#27ae60');
    grad.addColorStop(1, '#1b4332');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    ctx.strokeStyle = '#0d2818';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = -r + 8; i < r; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, -r);
      ctx.bezierCurveTo(i + 8, -r * 0.3, i - 8, r * 0.3, i, r);
      ctx.stroke();
    }
    ctx.restore();

    ctx.shadowColor = 'transparent';
    drawShine(ctx, r, 0.32);
  }

  drawOrange(ctx) {
    const r = this.radius;

    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffc048');
    grad.addColorStop(0.7, '#ff9f1a');
    grad.addColorStop(1, '#e8590c');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Peel dimples
    ctx.fillStyle = 'rgba(180, 70, 0, 0.18)';
    for (let i = 0; i < 16; i++) {
      const a = i * 2.399;
      const d = r * (0.2 + ((i * 37) % 10) / 14);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, -r + 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#795548';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(6, -r + 1, 9, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2ed573';
    ctx.fill();

    drawShine(ctx, r, 0.38);
  }

  drawStrawberry(ctx) {
    const r = this.radius;

    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(-r * 1.25, r * 0.3, -r * 1.15, -r * 0.7, 0, -r * 0.6);
    ctx.bezierCurveTo(r * 1.15, -r * 0.7, r * 1.25, r * 0.3, 0, r);

    const grad = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r * 1.1);
    grad.addColorStop(0, '#ff6b6b');
    grad.addColorStop(0.7, '#ff3838');
    grad.addColorStop(1, '#c23616');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#f6e58d';
    const seeds = [
      { x: 0, y: r * 0.4 }, { x: -r * 0.4, y: r * 0.2 }, { x: r * 0.4, y: r * 0.2 },
      { x: -r * 0.6, y: -r * 0.1 }, { x: 0, y: -r * 0.05 }, { x: r * 0.6, y: -r * 0.1 },
      { x: -r * 0.3, y: -r * 0.35 }, { x: r * 0.3, y: -r * 0.35 }
    ];
    seeds.forEach(s => {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 1.8, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#2ed573';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 6, -r * 0.65, 5, 8, (i * Math.PI) / 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.rect(-2, -r * 0.95, 4, 8);
    ctx.fillStyle = '#10ac84';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-r * 0.45, -r * 0.1, r * 0.14, r * 0.28, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
  }

  drawApple(ctx, golden = false) {
    const r = this.radius;

    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.bezierCurveTo(-r * 0.8, -r * 0.9, -r * 1.2, r * 0.1, -r * 0.6, r * 0.85);
    ctx.bezierCurveTo(-r * 0.2, r * 0.95, 0, r * 0.75, 0, r * 0.75);
    ctx.bezierCurveTo(0, r * 0.75, r * 0.2, r * 0.95, r * 0.6, r * 0.85);
    ctx.bezierCurveTo(r * 1.2, r * 0.1, r * 0.8, -r * 0.9, 0, -r * 0.55);

    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 5, 0, 0, r * 1.1);
    if (golden) {
      grad.addColorStop(0, '#fffbd0');
      grad.addColorStop(0.5, '#ffd32a');
      grad.addColorStop(1, '#d68910');
    } else {
      grad.addColorStop(0, '#ff6b81');
      grad.addColorStop(0.6, '#ff4757');
      grad.addColorStop(1, '#b33939');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'transparent';

    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.quadraticCurveTo(4, -r * 0.9, 6, -r * 1.05);
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(7, -r * 0.85, 8, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = golden ? '#7bed9f' : '#2ed573';
    ctx.fill();

    drawShine(ctx, r, golden ? 0.6 : 0.4);
    ctx.restore();
  }

  drawBanana(ctx) {
    const r = this.radius;

    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.7);
    ctx.bezierCurveTo(-r * 0.2, -r * 1.1, r * 0.7, -r * 0.4, r * 1.1, r * 0.7);
    ctx.bezierCurveTo(r * 0.6, r * 0.9, -r * 0.4, r * 0.4, -r * 0.9, -r * 0.7);

    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, '#6ab04c');
    grad.addColorStop(0.2, '#f6e58d');
    grad.addColorStop(0.6, '#f9ca24');
    grad.addColorStop(0.9, '#f0932b');
    grad.addColorStop(1, '#6d4c41');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.6);
    ctx.bezierCurveTo(-r * 0.1, -r * 0.8, r * 0.6, -r * 0.1, r * 0.95, r * 0.7);
    ctx.strokeStyle = 'rgba(235, 178, 40, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.65);
    ctx.bezierCurveTo(-r * 0.1, -r * 0.9, r * 0.3, -r * 0.5, r * 0.5, -r * 0.1);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  drawPineapple(ctx) {
    const r = this.radius;

    ctx.beginPath();
    ctx.ellipse(0, 5, r * 0.85, r, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.2, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#fbd34d');
    grad.addColorStop(0.7, '#e67e22');
    grad.addColorStop(1, '#a5400f');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    ctx.strokeStyle = 'rgba(110, 40, 0, 0.4)';
    ctx.lineWidth = 2;
    for (let d = -r; d <= r; d += 14) {
      ctx.beginPath();
      ctx.moveTo(-r, d);
      ctx.lineTo(r, d + r * 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r, d);
      ctx.lineTo(-r, d + r * 1.2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#26de81';
    for (let a = -2; a <= 2; a++) {
      ctx.beginPath();
      ctx.moveTo(a * 8, -r * 0.7);
      ctx.lineTo(a * 14, -r * 1.35);
      ctx.lineTo((a + 0.6) * 8, -r * 0.7);
      ctx.fill();
    }
    ctx.fillStyle = '#10ac84';
    ctx.beginPath();
    ctx.moveTo(-3, -r * 0.7);
    ctx.lineTo(0, -r * 1.5);
    ctx.lineTo(3, -r * 0.7);
    ctx.fill();
  }

  drawKiwi(ctx) {
    const r = this.radius;

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.05, r * 0.92, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#b08968');
    grad.addColorStop(0.7, '#7f5539');
    grad.addColorStop(1, '#4e342e');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(60, 35, 20, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const a = i * 2.399;
      const d = r * (0.2 + ((i * 37) % 10) / 14);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y - 2);
      ctx.stroke();
    }
    drawShine(ctx, r, 0.22);
  }

  drawBomb(ctx) {
    const r = this.radius;

    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#6b7585');
    grad.addColorStop(0.5, '#2f3542');
    grad.addColorStop(1, '#14191f');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'transparent';

    ctx.beginPath();
    ctx.rect(-8, -r - 5, 16, 6);
    ctx.fillStyle = '#747d8c';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -r - 5);
    ctx.quadraticCurveTo(12, -r - 18, 18, -r - 26);
    ctx.strokeStyle = '#d2dae2';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    const sparkPulse = Math.sin(this.fuseTimer * 20) * 2;
    const flameX = 18;
    const flameY = -r - 26;

    const flameGrad = ctx.createRadialGradient(flameX, flameY, 1, flameX, flameY, 12 + sparkPulse);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, '#ffa502');
    flameGrad.addColorStop(0.8, '#ff4757');
    flameGrad.addColorStop(1, 'rgba(255, 71, 87, 0)');

    ctx.beginPath();
    ctx.arc(flameX, flameY, 12 + sparkPulse, 0, Math.PI * 2);
    ctx.fillStyle = flameGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(flameX, flameY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Glowing warning skull
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 71, 87, ${0.75 + Math.sin(this.fuseTimer * 14) * 0.25})`;
    ctx.fillText('☠', 0, 2);

    drawShine(ctx, r, 0.18);
    ctx.restore();
  }

  drawDefault(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.type.color;
    ctx.fill();
  }
}

/**
 * Colors for the cross-section of each fruit
 */
const HALF_STYLE = {
  watermelon: { skin: '#1e8449', skinW: 3, rind: '#d5f5c2', rindW: 4, fleshIn: '#ff7b8a', fleshOut: '#e8272f' },
  orange: { skin: '#ff8c1a', skinW: 3, rind: '#fff1d6', rindW: 3, fleshIn: '#ffc04d', fleshOut: '#ff9500' },
  strawberry: { skin: '#d63031', skinW: 3, rind: null, rindW: 0, fleshIn: '#fff0f0', fleshOut: '#ff6b6b' },
  apple: { skin: '#e03a3e', skinW: 3, rind: null, rindW: 0, fleshIn: '#ffffff', fleshOut: '#fdf3c4' },
  banana: { skin: '#f4c430', skinW: 3, rind: null, rindW: 0, fleshIn: '#fffbd0', fleshOut: '#ffe680' },
  pineapple: { skin: '#d68910', skinW: 4, rind: null, rindW: 0, fleshIn: '#fff9b0', fleshOut: '#ffd54f' },
  kiwi: { skin: '#6d4c41', skinW: 2.5, rind: null, rindW: 0, fleshIn: '#e4fba8', fleshOut: '#5fb02a' },
  golden: { skin: '#e1a100', skinW: 3, rind: null, rindW: 0, fleshIn: '#fffbe0', fleshOut: '#ffe066' },
  fallback: { skin: '#888', skinW: 3, rind: null, rindW: 0, fleshIn: '#ffffff', fleshOut: '#eeeeee' }
};

/**
 * Halves of fruit tumbling apart after slice.
 * Each half is drawn as a clipped half-disc with a juicy cross-section face,
 * rotating around its own centre of mass.
 */
class FruitHalf {
  constructor(fruit, side, cutAngle, impulseSpeed = 4.5) {
    this.type = fruit.type;
    this.side = side; // -1 / +1
    this.cutAngle = cutAngle;
    this.radius = fruit.radius;

    // Push away perpendicular to cut angle
    const perpAngle = cutAngle + (side * Math.PI) / 2;

    // Start at the centroid of this half-disc
    const centroid = this.radius * 0.424;
    this.x = fruit.x + Math.cos(perpAngle) * centroid;
    this.y = fruit.y + Math.sin(perpAngle) * centroid;

    this.vx = fruit.vx * 0.6 + Math.cos(perpAngle) * impulseSpeed;
    this.vy = fruit.vy * 0.5 + Math.sin(perpAngle) * impulseSpeed - 2;

    this.gravity = 0.42;
    this.rotation = cutAngle; // local x-axis lies along the cut
    this.vRot = side * (0.05 + Math.random() * 0.1);
    this.active = true;
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.rotation += this.vRot * deltaTime;
  }

  render(ctx) {
    if (!this.active) return;
    const r = this.radius;
    const s = this.side;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.translate(0, -s * r * 0.424);

    // Clip to this half-plane (side<0 => y<0, side>0 => y>0)
    ctx.beginPath();
    ctx.rect(-r - 4, s < 0 ? -r - 4 : 0, r * 2 + 8, r + 4);
    ctx.clip();

    this.drawCrossSection(ctx);
    ctx.restore();
  }

  drawCrossSection(ctx) {
    const r = this.radius;
    const s = this.side;
    const id = this.type.id;
    const S = HALF_STYLE[id] || HALF_STYLE.fallback;

    // Skin
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = S.skin;
    ctx.fill();

    let inner = r - S.skinW;
    if (S.rind) {
      ctx.beginPath();
      ctx.arc(0, 0, inner, 0, Math.PI * 2);
      ctx.fillStyle = S.rind;
      ctx.fill();
      inner -= S.rindW;
    }

    // Juicy flesh
    const grad = ctx.createRadialGradient(0, 0, inner * 0.1, 0, 0, inner);
    grad.addColorStop(0, S.fleshIn);
    grad.addColorStop(1, S.fleshOut);
    ctx.beginPath();
    ctx.arc(0, 0, inner, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    switch (id) {
      case 'watermelon': {
        ctx.fillStyle = '#1e272e';
        [0.25, 0.65, 1.1, 1.6, 2.1, 2.6, 2.95].forEach((a, i) => {
          const d = inner * (i % 2 ? 0.45 : 0.68);
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * d, s * Math.sin(a) * d, 2, 3.6, s * a, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
      case 'orange': {
        ctx.strokeStyle = 'rgba(255, 245, 225, 0.75)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * inner * 0.95, Math.sin(a) * inner * 0.95);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff5e6';
        ctx.fill();
        break;
      }
      case 'strawberry': {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) {
          const a = (i * Math.PI) / 8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 3, s * Math.sin(a) * 3);
          ctx.lineTo(Math.cos(a) * inner * 0.8, s * Math.sin(a) * inner * 0.8);
          ctx.stroke();
        }
        break;
      }
      case 'apple':
      case 'golden': {
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = id === 'golden' ? '#ffe9a0' : '#e9ecef';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, s * 2.5, 2.2, 3.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#4a2810';
        ctx.fill();
        break;
      }
      case 'banana':
      case 'pineapple': {
        ctx.beginPath();
        ctx.arc(0, 0, inner * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = id === 'banana' ? '#fde68a' : '#fcd34d';
        ctx.fill();
        if (id === 'pineapple') {
          ctx.strokeStyle = 'rgba(200, 140, 20, 0.45)';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 9;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * inner * 0.3, s * Math.sin(a) * inner * 0.3);
            ctx.lineTo(Math.cos(a) * inner * 0.9, s * Math.sin(a) * inner * 0.9);
            ctx.stroke();
          }
        }
        break;
      }
      case 'kiwi': {
        ctx.strokeStyle = 'rgba(240, 255, 200, 0.7)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 18; i++) {
          const a = (i * Math.PI) / 9;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * inner * 0.3, s * Math.sin(a) * inner * 0.3);
          ctx.lineTo(Math.cos(a) * inner * 0.9, s * Math.sin(a) * inner * 0.9);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, inner * 0.3, inner * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f7fde0';
        ctx.fill();
        ctx.fillStyle = '#1e272e';
        for (let i = 0; i < 14; i++) {
          const a = (i * Math.PI) / 13;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * inner * 0.5, s * Math.sin(a) * inner * 0.5, 1.2, 2.2, a, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      default:
        break;
    }

    // Wet cut-edge highlight
    ctx.beginPath();
    ctx.moveTo(-inner, 0);
    ctx.lineTo(inner, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

/**
 * Juice droplet particle
 */
class JuiceParticle {
  constructor(x, y, color, power = 1) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = (2 + Math.random() * 8) * power;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1;
    this.gravity = 0.28;
    this.radius = 2.5 + Math.random() * 4.5;
    this.color = color;
    this.alpha = 1;
    this.decay = 0.02 + Math.random() * 0.025;
    this.active = true;
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.alpha -= this.decay * deltaTime;
    if (this.alpha <= 0) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;

    const speed = Math.hypot(this.vx, this.vy);
    const angle = Math.atan2(this.vy, this.vx);

    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * (1 + speed * 0.12), this.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glossy droplet highlight
    ctx.globalAlpha = Math.max(0, this.alpha) * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.radius * 0.3, -this.radius * 0.25, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Juice stain splatted on the backdrop; fades slowly
 */
class JuiceSplat {
  constructor(x, y, color, size = 1) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 0.38;
    this.decay = 0.0016 + Math.random() * 0.001;
    this.active = true;
    this.blobs = [];
    const n = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 30 * size;
      this.blobs.push({
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        r: (3 + Math.random() * 11) * size * (1 - d / (50 * size))
      });
    }
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.alpha -= this.decay * deltaTime;
    if (this.alpha <= 0) this.active = false;
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    this.blobs.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(1, b.r), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/**
 * Expanding shock ring (bomb blasts, golden fruit, combos)
 */
class ShockRing {
  constructor(x, y, color = '#ffffff', maxRadius = 120, speed = 5) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = 8;
    this.maxRadius = maxRadius;
    this.speed = speed;
    this.alpha = 0.9;
    this.active = true;
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.radius += this.speed * deltaTime;
    this.speed *= 0.97;
    this.alpha = Math.max(0, 0.9 * (1 - this.radius / this.maxRadius));
    if (this.radius >= this.maxRadius || this.alpha <= 0.01) this.active = false;
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2 + this.alpha * 6;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Bright slash flash drawn across a freshly cut fruit
 */
class SliceFlash {
  constructor(x, y, angle, length) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.length = length;
    this.alpha = 1;
    this.active = true;
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.alpha -= 0.12 * deltaTime;
    if (this.alpha <= 0) this.active = false;
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = Math.max(0, this.alpha);
    const half = this.length * (1.2 - this.alpha * 0.2);
    const g = ctx.createLinearGradient(-half, 0, half, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillRect(-half, -1.8 * this.alpha - 0.4, half * 2, 3.6 * this.alpha + 0.8);
    ctx.restore();
  }
}

/**
 * Bomb explosive spark & smoke particle
 */
class BombSparkParticle {
  constructor(x, y, isExplosion = false) {
    this.x = x;
    this.y = y;
    this.isExplosion = isExplosion;

    const angle = Math.random() * Math.PI * 2;
    const speed = isExplosion ? 3 + Math.random() * 12 : 1 + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (isExplosion ? 2 : 1);

    this.gravity = isExplosion ? 0.3 : 0.05;
    this.radius = isExplosion ? 3 + Math.random() * 7 : 2 + Math.random() * 3;

    const colors = isExplosion
      ? ['#ffffff', '#fffa65', '#ff9f1a', '#ff3838', '#718096', '#2d3436']
      : ['#fffa65', '#ff9f1a', '#ff4757'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.alpha = 1;
    this.decay = isExplosion ? 0.02 + Math.random() * 0.03 : 0.05 + Math.random() * 0.05;
    this.active = true;
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.radius = Math.max(0.5, this.radius * (this.isExplosion ? 0.98 : 0.95));
    this.alpha -= this.decay * deltaTime;
    if (this.alpha <= 0) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Floating combo/score text popup
 */
class FloatingScoreText {
  constructor(text, x, y, color = '#ffa502', isCombo = false) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.isCombo = isCombo;
    this.vy = -2.2;
    this.alpha = 1;
    this.age = 0;
    this.scale = isCombo ? 1.4 : 1.0;
    this.decay = isCombo ? 0.016 : 0.025;
    this.active = true;
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.y += this.vy * deltaTime;
    this.vy *= 0.96;
    this.age += deltaTime;
    this.alpha -= this.decay * deltaTime;
    if (this.isCombo && this.scale > 1.0) {
      this.scale -= 0.015 * deltaTime;
    }
    if (this.alpha <= 0) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    // Quick elastic pop-in
    const pop = this.age < 6 ? 0.6 + (this.age / 6) * 0.5 : 1.1 - Math.min(0.1, (this.age - 6) * 0.02);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale * pop, this.scale * pop);

    ctx.font = this.isCombo ? 'bold 26px "Luckiest Guy", Impact, sans-serif' : 'bold 20px "Luckiest Guy", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 5;
    ctx.strokeText(this.text, 0, 0);

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

/**
 * Blade swipe trail renderer - glowing, tapered
 */
class BladeTrail {
  constructor(colorTheme = '#00d2d3') {
    this.points = [];
    this.maxAgeMs = 220;
    this.colorTheme = colorTheme;
  }

  setColor(color) {
    this.colorTheme = color;
  }

  addPoint(x, y) {
    this.points.push({ x, y, time: performance.now() });
    if (this.points.length > 70) this.points.shift();
  }

  clear() {
    this.points = [];
  }

  update() {
    const now = performance.now();
    this.points = this.points.filter(p => now - p.time <= this.maxAgeMs);
  }

  render(ctx) {
    if (this.points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const now = performance.now();

    // Wide soft glow pass
    ctx.shadowColor = this.colorTheme;
    ctx.shadowBlur = 22;
    for (let i = 1; i < this.points.length; i++) {
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const ageRatio = Math.min(1, (now - p2.time) / this.maxAgeMs);
      const alpha = Math.max(0, 1 - ageRatio);
      const taper = i / this.points.length;
      const width = ((1 - ageRatio) * 9 + 1) * (0.5 + taper * 0.5);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = this.colorTheme;
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = width * 1.9;
      ctx.stroke();
    }

    // Sharp white core
    ctx.shadowBlur = 0;
    for (let i = 1; i < this.points.length; i++) {
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const ageRatio = Math.min(1, (now - p2.time) / this.maxAgeMs);
      const alpha = Math.max(0, 1 - ageRatio);
      const taper = i / this.points.length;
      const width = ((1 - ageRatio) * 9 + 1) * (0.5 + taper * 0.5);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width * 0.55;
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Animated neon-sunset arcade backdrop (baked gradient + moving rays,
 * bokeh orbs and a scrolling perspective grid floor).
 */
class ArcadeBackground {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.base = null;
    this.vignette = null;
    this.orbs = [];
    this.t = 0;
    this.flashAlpha = 0;
    this.flashColor = '255,71,87';
  }

  resize(w, h, dpr = 1) {
    this.w = w;
    this.h = h;
    if (typeof document === 'undefined' || !w || !h) return;

    const make = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(w * dpr));
      c.height = Math.max(1, Math.floor(h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      return { c, g };
    };

    // Base sky
    const b = make();
    const sky = b.g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#070b24');
    sky.addColorStop(0.45, '#1d1450');
    sky.addColorStop(0.78, '#4a1a6b');
    sky.addColorStop(1, '#b02b73');
    b.g.fillStyle = sky;
    b.g.fillRect(0, 0, w, h);

    const sun = b.g.createRadialGradient(w / 2, h * 0.82, 0, w / 2, h * 0.82, Math.max(w, h) * 0.65);
    sun.addColorStop(0, 'rgba(255, 140, 100, 0.55)');
    sun.addColorStop(0.4, 'rgba(255, 71, 120, 0.2)');
    sun.addColorStop(1, 'rgba(255, 71, 120, 0)');
    b.g.fillStyle = sun;
    b.g.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < 40; i++) {
      b.g.globalAlpha = 0.15 + Math.random() * 0.5;
      b.g.fillStyle = '#ffffff';
      b.g.beginPath();
      b.g.arc(Math.random() * w, Math.random() * h * 0.6, Math.random() * 1.3 + 0.3, 0, Math.PI * 2);
      b.g.fill();
    }
    b.g.globalAlpha = 1;
    this.base = b.c;

    // Vignette
    const v = make();
    const vg = v.g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    v.g.fillStyle = vg;
    v.g.fillRect(0, 0, w, h);
    this.vignette = v.c;

    // Bokeh orbs
    const palette = ['255,107,129', '0,210,211', '255,165,2', '165,94,234', '46,213,115'];
    this.orbs = [];
    const n = Math.max(10, Math.min(26, Math.round(w / 40)));
    for (let i = 0; i < n; i++) {
      this.orbs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 6 + Math.random() * 26,
        v: 0.1 + Math.random() * 0.35,
        a: 0.05 + Math.random() * 0.12,
        c: palette[Math.floor(Math.random() * palette.length)],
        p: Math.random() * 6
      });
    }
  }

  flash(rgb = '255,71,87') {
    this.flashColor = rgb;
    this.flashAlpha = 1;
  }

  render(ctx, dt = 1) {
    const w = this.w;
    const h = this.h;
    if (!w || !h) return;
    this.t += dt;
    const t = this.t;

    if (this.base) {
      ctx.drawImage(this.base, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#1d1450';
      ctx.fillRect(0, 0, w, h);
    }

    // Rotating light rays
    ctx.save();
    ctx.translate(w / 2, h * 0.82);
    ctx.rotate(t * 0.0012);
    const L = Math.max(w, h) * 1.3;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
      ctx.lineTo(Math.cos(a + 0.13) * L, Math.sin(a + 0.13) * L);
      ctx.closePath();
    }
    ctx.fillStyle = 'rgba(255, 190, 220, 0.045)';
    ctx.fill();
    ctx.restore();

    // Bokeh orbs
    for (const o of this.orbs) {
      o.y -= o.v * dt;
      if (o.y < -o.r) {
        o.y = h + o.r;
        o.x = Math.random() * w;
      }
      const a = o.a * (0.65 + 0.35 * Math.sin(t * 0.03 + o.p));
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${o.c}, ${a})`;
      ctx.fill();
    }

    // Perspective grid floor
    const horizon = h * 0.84;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 210, 211, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -9; i <= 9; i++) {
      ctx.moveTo(w / 2 + i * w * 0.018, horizon);
      ctx.lineTo(w / 2 + i * w * 0.14, h);
    }
    const scroll = (t * 0.012) % 1;
    for (let k = 0; k < 7; k++) {
      const p = (k + scroll) / 7;
      const y = horizon + (h - horizon) * p * p;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();

    // Damage flash
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(${this.flashColor}, ${this.flashAlpha * 0.38})`;
      ctx.fillRect(0, 0, w, h);
      this.flashAlpha = Math.max(0, this.flashAlpha - 0.045 * dt);
    }

    if (this.vignette) ctx.drawImage(this.vignette, 0, 0, w, h);
  }
}

// Export for Node testing or browser window
if (typeof window !== 'undefined') {
  window.FRUIT_TYPES = FRUIT_TYPES;
  window.Fruit = Fruit;
  window.FruitHalf = FruitHalf;
  window.JuiceParticle = JuiceParticle;
  window.JuiceSplat = JuiceSplat;
  window.ShockRing = ShockRing;
  window.SliceFlash = SliceFlash;
  window.BombSparkParticle = BombSparkParticle;
  window.FloatingScoreText = FloatingScoreText;
  window.BladeTrail = BladeTrail;
  window.ArcadeBackground = ArcadeBackground;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FRUIT_TYPES,
    Fruit,
    FruitHalf,
    JuiceParticle,
    JuiceSplat,
    ShockRing,
    SliceFlash,
    BombSparkParticle,
    FloatingScoreText,
    BladeTrail,
    ArcadeBackground
  };
}
