/**
 * Fruit Slice Arcade - Fruit Entities, Procedural Canvas Graphics & Particles
 */

const FRUIT_TYPES = {
  WATERMELON: {
    id: 'watermelon',
    name: 'Watermelon',
    radius: 42,
    color: '#ff4757',
    secondaryColor: '#2ed573',
    points: 1,
    weight: 22
  },
  ORANGE: {
    id: 'orange',
    name: 'Orange',
    radius: 35,
    color: '#ffa502',
    secondaryColor: '#ff7f50',
    points: 1,
    weight: 20
  },
  STRAWBERRY: {
    id: 'strawberry',
    name: 'Strawberry',
    radius: 28,
    color: '#ff3838',
    secondaryColor: '#2ed573',
    points: 2,
    weight: 18
  },
  APPLE: {
    id: 'apple',
    name: 'Crisp Apple',
    radius: 34,
    color: '#ff4d4d',
    secondaryColor: '#7bed9f',
    points: 1,
    weight: 18
  },
  BANANA: {
    id: 'banana',
    name: 'Banana',
    radius: 32,
    color: '#eccc68',
    secondaryColor: '#70a1ff',
    points: 1,
    weight: 16
  },
  PINEAPPLE: {
    id: 'pineapple',
    name: 'Pineapple',
    radius: 40,
    color: '#f9ca24',
    secondaryColor: '#6ab04c',
    points: 2,
    weight: 14
  },
  BOMB: {
    id: 'bomb',
    name: 'Bomb',
    radius: 34,
    color: '#718096',
    secondaryColor: '#ff4757',
    points: -10,
    isBomb: true,
    weight: 0 // handled separately
  }
};

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
    this.active = true;
    this.fuseTimer = 0;
    this.bornAt = performance.now();
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.rotation += this.vRot * deltaTime;

    if (this.isBomb) {
      this.fuseTimer += deltaTime * 0.15;
    }
  }

  // Draw procedural fruit onto canvas context
  render(ctx) {
    if (!this.active || this.isSliced) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    switch (this.type.id) {
      case 'watermelon':
        this.drawWatermelon(ctx);
        break;
      case 'orange':
        this.drawOrange(ctx);
        break;
      case 'strawberry':
        this.drawStrawberry(ctx);
        break;
      case 'apple':
        this.drawApple(ctx);
        break;
      case 'banana':
        this.drawBanana(ctx);
        break;
      case 'pineapple':
        this.drawPineapple(ctx);
        break;
      case 'bomb':
        this.drawBomb(ctx);
        break;
      default:
        this.drawDefault(ctx);
    }

    ctx.restore();
  }

  drawWatermelon(ctx) {
    const r = this.radius;

    // Outer rind gradient
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#2ecc71');
    grad.addColorStop(0.7, '#27ae60');
    grad.addColorStop(1, '#1b4332');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Dark wavy green stripes
    ctx.save();
    ctx.clip(); // clip to circle
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

    // Glossy shine highlight
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.25, r * 0.12, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  }

  drawOrange(ctx) {
    const r = this.radius;

    // Outer peel gradient
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffa502');
    grad.addColorStop(0.8, '#ff7f50');
    grad.addColorStop(1, '#ff6348');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Stem and small green leaf
    ctx.beginPath();
    ctx.arc(0, -r + 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#795548';
    ctx.fill();

    // Leaf
    ctx.beginPath();
    ctx.ellipse(6, -r + 1, 9, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2ed573';
    ctx.fill();

    // Glossy specular highlight
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();
  }

  drawStrawberry(ctx) {
    const r = this.radius;

    // Heart / tapered berry shape
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(-r * 1.25, r * 0.3, -r * 1.15, -r * 0.7, 0, -r * 0.6);
    ctx.bezierCurveTo(r * 1.15, -r * 0.7, r * 1.25, r * 0.3, 0, r);

    const grad = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r * 1.1);
    grad.addColorStop(0, '#ff4757');
    grad.addColorStop(0.7, '#ff3838');
    grad.addColorStop(1, '#c23616');
    ctx.fillStyle = grad;
    ctx.fill();

    // Yellow seeds
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

    // Green leafy cap (calyx)
    ctx.fillStyle = '#2ed573';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 6, -r * 0.65, 5, 8, (i * Math.PI) / 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stem
    ctx.beginPath();
    ctx.rect(-2, -r * 0.95, 4, 8);
    ctx.fillStyle = '#10ac84';
    ctx.fill();
  }

  drawApple(ctx) {
    const r = this.radius;

    // Apple contour
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.bezierCurveTo(-r * 0.8, -r * 0.9, -r * 1.2, r * 0.1, -r * 0.6, r * 0.85);
    ctx.bezierCurveTo(-r * 0.2, r * 0.95, 0, r * 0.75, 0, r * 0.75);
    ctx.bezierCurveTo(0, r * 0.75, r * 0.2, r * 0.95, r * 0.6, r * 0.85);
    ctx.bezierCurveTo(r * 1.2, r * 0.1, r * 0.8, -r * 0.9, 0, -r * 0.55);

    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 5, 0, 0, r * 1.1);
    grad.addColorStop(0, '#ff6b81');
    grad.addColorStop(0.6, '#ff4757');
    grad.addColorStop(1, '#b33939');
    ctx.fillStyle = grad;
    ctx.fill();

    // Stem
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.quadraticCurveTo(4, -r * 0.9, 6, -r * 1.05);
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Leaf
    ctx.beginPath();
    ctx.ellipse(7, -r * 0.85, 8, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2ed573';
    ctx.fill();

    // Specular shine
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.3, r * 0.2, r * 0.1, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  }

  drawBanana(ctx) {
    const r = this.radius;

    // Curved crescent banana
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.7);
    ctx.bezierCurveTo(-r * 0.2, -r * 1.1, r * 0.7, -r * 0.4, r * 1.1, r * 0.7);
    ctx.bezierCurveTo(r * 0.6, r * 0.9, -r * 0.4, r * 0.4, -r * 0.9, -r * 0.7);

    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, '#2ed573'); // greenish stem
    grad.addColorStop(0.2, '#f6e58d');
    grad.addColorStop(0.6, '#f9ca24');
    grad.addColorStop(0.9, '#f0932b');
    grad.addColorStop(1, '#574b90'); // brown tip
    ctx.fillStyle = grad;
    ctx.fill();

    // Ridge line
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.6);
    ctx.bezierCurveTo(-r * 0.1, -r * 0.8, r * 0.6, -r * 0.1, r * 0.95, r * 0.7);
    ctx.strokeStyle = 'rgba(235, 178, 40, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  drawPineapple(ctx) {
    const r = this.radius;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 5, r * 0.85, r, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#f9ca24');
    grad.addColorStop(0.7, '#e67e22');
    grad.addColorStop(1, '#b71540');
    ctx.fillStyle = grad;
    ctx.fill();

    // Diamond scales
    ctx.save();
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

    // Spiky crown leaves on top
    ctx.fillStyle = '#26de81';
    for (let a = -2; a <= 2; a++) {
      ctx.beginPath();
      ctx.moveTo(a * 8, -r * 0.7);
      ctx.lineTo(a * 14, -r * 1.35);
      ctx.lineTo((a + 0.6) * 8, -r * 0.7);
      ctx.fill();
    }
  }

  drawBomb(ctx) {
    const r = this.radius;

    // Metallic bomb sphere
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#57606f');
    grad.addColorStop(0.5, '#2f3542');
    grad.addColorStop(1, '#1e272e');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Collar
    ctx.beginPath();
    ctx.rect(-8, -r - 5, 16, 6);
    ctx.fillStyle = '#747d8c';
    ctx.fill();

    // Twisted fuse cord
    ctx.beginPath();
    ctx.moveTo(0, -r - 5);
    ctx.quadraticCurveTo(12, -r - 18, 18, -r - 26);
    ctx.strokeStyle = '#d2dae2';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Animated fuse flame & sparks
    const sparkPulse = Math.sin(this.fuseTimer * 20) * 2;
    const flameX = 18;
    const flameY = -r - 26;

    // Glowing spark halo
    const flameGrad = ctx.createRadialGradient(flameX, flameY, 1, flameX, flameY, 10 + sparkPulse);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, '#ffa502');
    flameGrad.addColorStop(0.8, '#ff4757');
    flameGrad.addColorStop(1, 'rgba(255, 71, 87, 0)');

    ctx.beginPath();
    ctx.arc(flameX, flameY, 12 + sparkPulse, 0, Math.PI * 2);
    ctx.fillStyle = flameGrad;
    ctx.fill();

    // Core white flame point
    ctx.beginPath();
    ctx.arc(flameX, flameY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Bomb warning skull or crossbones
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff4757';
    ctx.fillText('☠', 0, 2);
  }

  drawDefault(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.type.color;
    ctx.fill();
  }
}

/**
 * Halves of fruit tumbling apart after slice
 */
class FruitHalf {
  constructor(fruit, side, cutAngle, impulseSpeed = 4.5) {
    this.type = fruit.type;
    this.side = side; // -1 for left half, +1 for right half
    this.cutAngle = cutAngle;
    this.radius = fruit.radius;

    // Center starting point
    this.x = fruit.x;
    this.y = fruit.y;

    // Push away perpendicular to cut angle
    const perpAngle = cutAngle + (side * Math.PI) / 2;
    this.vx = fruit.vx * 0.5 + Math.cos(perpAngle) * impulseSpeed;
    this.vy = fruit.vy * 0.5 + Math.sin(perpAngle) * impulseSpeed - 2;

    this.gravity = 0.42;
    this.rotation = fruit.rotation;
    this.vRot = side * (0.08 + Math.random() * 0.12);
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

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Clip to semicircle aligned with cut angle
    ctx.save();
    ctx.rotate(this.cutAngle - this.rotation);
    ctx.beginPath();
    if (this.side < 0) {
      // Top half
      ctx.arc(0, 0, this.radius + 2, Math.PI, 0, false);
    } else {
      // Bottom half
      ctx.arc(0, 0, this.radius + 2, 0, Math.PI, false);
    }
    ctx.closePath();
    ctx.clip();

    // Restore rotation for inner drawing
    ctx.restore();

    // Draw the half slice with juicy internal cross-section
    this.drawCrossSection(ctx);

    ctx.restore();
  }

  drawCrossSection(ctx) {
    const r = this.radius;

    // First draw standard fruit body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = this.type.color;
    ctx.fill();

    // Now overlay the juicy inner flesh based on fruit type
    switch (this.type.id) {
      case 'watermelon':
        // Light green rind
        ctx.beginPath();
        ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
        ctx.fillStyle = '#b8e994';
        ctx.fill();

        // Ruby flesh
        ctx.beginPath();
        ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
        ctx.fillStyle = '#eb2f06';
        ctx.fill();

        // Black seeds
        ctx.fillStyle = '#1e272e';
        const seedAngles = [0.2, 0.6, 1.1, 1.8, 2.4, 2.9];
        seedAngles.forEach(a => {
          const sx = Math.cos(a) * (r * 0.55);
          const sy = Math.sin(a) * (r * 0.55);
          ctx.beginPath();
          ctx.ellipse(sx, sy, 2, 3.5, a, 0, Math.PI * 2);
          ctx.fill();
        });
        break;

      case 'orange':
        // White inner peel
        ctx.beginPath();
        ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff5e6';
        ctx.fill();

        // Segments
        ctx.fillStyle = '#ff9f1a';
        for (let i = 0; i < 8; i++) {
          const start = (i * Math.PI) / 4 + 0.08;
          const end = ((i + 1) * Math.PI) / 4 - 0.08;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, r - 7, start, end);
          ctx.closePath();
          ctx.fill();
        }

        // Center pith
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff5e6';
        ctx.fill();
        break;

      case 'strawberry':
        // Pink interior
        ctx.beginPath();
        ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff7675';
        ctx.fill();

        // White radiating center
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#fff0f0';
        ctx.fill();
        break;

      case 'apple':
        // Crisp ivory meat
        ctx.beginPath();
        ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
        ctx.fillStyle = '#f8f9fa';
        ctx.fill();

        // Core and seed
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e9ecef';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, 2, 2.5, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#4a2810';
        ctx.fill();
        break;

      case 'banana':
      case 'pineapple':
        ctx.beginPath();
        ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#fde047';
        ctx.fill();
        break;

      default:
        ctx.beginPath();
        ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
  }
}

/**
 * Juice droplet particle
 */
class JuiceParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
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

    // Elongate in motion direction
    const speed = Math.hypot(this.vx, this.vy);
    const angle = Math.atan2(this.vy, this.vx);

    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * (1 + speed * 0.12), this.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

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

    // Palette: white, yellow, orange, smoke grey
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
    this.scale = isCombo ? 1.4 : 1.0;
    this.decay = isCombo ? 0.016 : 0.025;
    this.active = true;
  }

  update(deltaTime = 1) {
    if (!this.active) return;
    this.y += this.vy * deltaTime;
    this.vy *= 0.96;
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
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.font = this.isCombo ? 'bold 26px "Luckiest Guy", Impact, sans-serif' : 'bold 20px "Luckiest Guy", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black stroke shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);

    // Glowing text
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

/**
 * Blade swipe trail renderer
 */
class BladeTrail {
  constructor(colorTheme = '#00d2d3') {
    this.points = [];
    this.maxAgeMs = 160;
    this.colorTheme = colorTheme;
  }

  setColor(color) {
    this.colorTheme = color;
  }

  addPoint(x, y) {
    this.points.push({ x, y, time: performance.now() });
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
    const now = performance.now();

    for (let i = 1; i < this.points.length; i++) {
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const ageRatio = (now - p2.time) / this.maxAgeMs; // 0 (new) to 1 (old)
      const alpha = Math.max(0, 1 - ageRatio);
      const width = (1 - ageRatio) * 9 + 1;

      // Outer glow line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = this.colorTheme;
      ctx.globalAlpha = alpha * 0.75;
      ctx.lineWidth = width * 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Sharp bright core
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

// Export for Node testing or browser window
if (typeof window !== 'undefined') {
  window.FRUIT_TYPES = FRUIT_TYPES;
  window.Fruit = Fruit;
  window.FruitHalf = FruitHalf;
  window.JuiceParticle = JuiceParticle;
  window.BombSparkParticle = BombSparkParticle;
  window.FloatingScoreText = FloatingScoreText;
  window.BladeTrail = BladeTrail;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FRUIT_TYPES,
    Fruit,
    FruitHalf,
    JuiceParticle,
    BombSparkParticle,
    FloatingScoreText,
    BladeTrail
  };
}
