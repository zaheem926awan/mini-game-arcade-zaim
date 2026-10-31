/**
 * Space Shooter Arcade Game
 * Fast vertical scrolling space shooter with parallax stars, multiple enemy types,
 * power-ups, lasers, shield systems, and touch/keyboard controls.
 */

class SpaceShooterGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_space_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    this.width = 460;
    this.height = 560;

    this.player = {
      x: this.width / 2,
      y: this.height - 70,
      w: 38,
      h: 42,
      speed: 6.5,
      shield: 3,
      maxShield: 3,
      tripleShotTime: 0,
      hasShieldPowerup: false,
      isInvulnerable: false
    };

    this.stars = [];
    this.lasers = [];
    this.enemyLasers = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];

    this.score = 0;
    this.wave = 1;
    this.lastSpawnTime = 0;
    this.lastShotTime = 0;
    this.shootInterval = 180; // ms between shots

    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.animId = null;

    this.keys = { left: false, right: false, up: false, down: false, shoot: false };

    this.keydownHandler = this.handleKeyDown.bind(this);
    this.keyupHandler = this.handleKeyUp.bind(this);
    this.pointerMoveHandler = this.handlePointerMove.bind(this);

    this.initStars();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() < 0.3 ? 2 : 1,
        speed: 0.5 + Math.random() * 2,
        color: Math.random() < 0.2 ? '#00d2d3' : '#ffffff'
      });
    }
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper space-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🚀</span> SCORE: <span id="space-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="space-high-score" class="val">${this.highScore}</span></div>
          <div class="hud-stat"><span class="icon">🛡️</span> SHIELD: <span id="space-shield" class="val">3/3</span></div>
          <div class="hud-stat"><span class="icon">🌌</span> WAVE: <span id="space-wave" class="val">1</span></div>
          <div class="hud-controls-bar">
            <button id="space-btn-pause" class="arcade-hud-btn" title="Pause Game (P)">⏸️</button>
            <button id="space-btn-restart" class="arcade-hud-btn" title="Restart Game">🔄</button>
          </div>
        </div>
        <div class="canvas-container">
          <canvas id="space-canvas" width="${this.width}" height="${this.height}"></canvas>
          <div id="space-overlay" class="game-overlay">
            <div class="overlay-modal">
              <h2 id="space-overlay-title" class="neon-title">SPACE SHOOTER</h2>
              <p id="space-overlay-desc">Pilot your starfighter through enemy swarms and asteroid fields! Collect triple-lasers and shields to survive.</p>
              <div id="space-overlay-stats" class="modal-stats hidden"></div>
              <button id="space-btn-play" class="arcade-btn-primary"><span>🚀</span> LAUNCH SHIP</button>
            </div>
          </div>
        </div>
        <div class="space-mobile-controls">
          <div class="space-touch-pad">
            <button class="arcade-touch-btn" id="sp-btn-fire">🔥 FIRE</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#space-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = this.container.querySelector('#space-score');
    this.highScoreEl = this.container.querySelector('#space-high-score');
    this.shieldEl = this.container.querySelector('#space-shield');
    this.waveEl = this.container.querySelector('#space-wave');
    this.overlay = this.container.querySelector('#space-overlay');
    this.overlayTitle = this.container.querySelector('#space-overlay-title');
    this.overlayDesc = this.container.querySelector('#space-overlay-desc');
    this.overlayStats = this.container.querySelector('#space-overlay-stats');
    this.btnPlay = this.container.querySelector('#space-btn-play');
    this.btnPause = this.container.querySelector('#space-btn-pause');
    this.btnRestart = this.container.querySelector('#space-btn-restart');

    this.btnPlay.addEventListener('click', () => {
      this.sound?.playClick();
      this.start();
    });

    this.btnPause.addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pause();
      else if (this.state === 'PAUSED') this.resume();
    });

    this.btnRestart.addEventListener('click', () => {
      this.sound?.playClick();
      this.restart();
    });

    // Mobile Fire Button
    const fireBtn = this.container.querySelector('#sp-btn-fire');
    fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys.shoot = true; }, { passive: false });
    fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys.shoot = false; }, { passive: false });
    fireBtn.addEventListener('mousedown', () => { this.keys.shoot = true; });
    window.addEventListener('mouseup', () => { this.keys.shoot = false; });

    // Touch & Mouse direct control on canvas
    this.canvas.addEventListener('mousemove', this.pointerMoveHandler);
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        this.pointerMoveHandler(e.touches[0]);
        this.keys.shoot = true; // Auto-fire on mobile drag
      }
    }, { passive: false });
    this.canvas.addEventListener('touchend', () => {
      this.keys.shoot = false;
    });

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);

    this.render();
  }

  handlePointerMove(e) {
    if (this.state !== 'PLAYING') return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    const clientX = e.clientX !== undefined ? e.clientX : e.pageX;
    const clientY = e.clientY !== undefined ? e.clientY : e.pageY;

    this.player.x = Math.max(20, Math.min(this.width - 20, (clientX - rect.left) * scaleX));
    this.player.y = Math.max(60, Math.min(this.height - 40, (clientY - rect.top) * scaleY));
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.keys.shoot = true;
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (this.state === 'PLAYING') this.pause();
      else if (this.state === 'PAUSED') this.resume();
    }
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
    if (e.key === ' ' || e.key === 'Enter') this.keys.shoot = false;
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.player.shield = 3;
    this.player.x = this.width / 2;
    this.player.y = this.height - 70;
    this.player.tripleShotTime = 0;
    this.player.hasShieldPowerup = false;
    this.player.isInvulnerable = false;

    this.lasers = [];
    this.enemyLasers = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];

    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.updateHUD();

    cancelAnimationFrame(this.animId);
    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.overlayTitle.textContent = 'PAUSED';
    this.overlayDesc.textContent = 'Fleet combat suspended. Press RESUME or P to return to flight.';
    this.overlayStats.classList.add('hidden');
    this.btnPlay.innerHTML = '<span>▶️</span> RESUME';
    this.overlay.classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.animId = requestAnimationFrame(this.loop);
  }

  restart() {
    this.start();
  }

  spawnEnemy() {
    const roll = Math.random();
    const x = 30 + Math.random() * (this.width - 60);

    if (roll < 0.45) {
      // Light Drone
      this.enemies.push({
        type: 'drone',
        x, y: -30,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 2.5 + Math.random() * 1.5,
        radius: 14,
        hp: 1,
        color: '#ff4757',
        points: 20
      });
    } else if (roll < 0.75) {
      // Heavy Cruiser (fires laser bolts)
      this.enemies.push({
        type: 'cruiser',
        x, y: -40,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 1.4,
        radius: 20,
        hp: 3,
        color: '#ffa502',
        points: 50,
        lastShot: Date.now() + Math.random() * 800
      });
    } else {
      // Tumbling Asteroid
      this.enemies.push({
        type: 'asteroid',
        x, y: -45,
        vx: (Math.random() - 0.5) * 1.8,
        vy: 1.8 + Math.random() * 1.2,
        radius: 22,
        hp: 2,
        color: '#718096',
        rotation: 0,
        vRot: (Math.random() - 0.5) * 0.06,
        points: 30
      });
    }
  }

  shoot() {
    const now = Date.now();
    if (now - this.lastShotTime < this.shootInterval) return;
    this.lastShotTime = now;
    this.sound?.playLaser();

    const isTriple = this.player.tripleShotTime > now;

    if (isTriple) {
      this.lasers.push(
        { x: this.player.x, y: this.player.y - 20, vx: 0, vy: -10, color: '#00d2d3' },
        { x: this.player.x - 14, y: this.player.y - 10, vx: -2.5, vy: -9.5, color: '#00d2d3' },
        { x: this.player.x + 14, y: this.player.y - 10, vx: 2.5, vy: -9.5, color: '#00d2d3' }
      );
    } else {
      // Twin cannons
      this.lasers.push(
        { x: this.player.x - 9, y: this.player.y - 18, vx: 0, vy: -10, color: '#00d2d3' },
        { x: this.player.x + 9, y: this.player.y - 18, vx: 0, vy: -10, color: '#00d2d3' }
      );
    }
  }

  update() {
    const now = Date.now();

    // Player keyboard movement
    if (this.keys.left) this.player.x = Math.max(20, this.player.x - this.player.speed);
    if (this.keys.right) this.player.x = Math.min(this.width - 20, this.player.x + this.player.speed);
    if (this.keys.up) this.player.y = Math.max(40, this.player.y - this.player.speed);
    if (this.keys.down) this.player.y = Math.min(this.height - 30, this.player.y + this.player.speed);

    if (this.keys.shoot) {
      this.shoot();
    }

    // Scroll stars
    this.stars.forEach(s => {
      s.y += s.speed;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
    });

    // Spawn enemies
    const spawnRate = Math.max(700, 1500 - this.wave * 120);
    if (now - this.lastSpawnTime >= spawnRate) {
      this.lastSpawnTime = now;
      this.spawnEnemy();
    }

    // Update player lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.x += l.vx;
      l.y += l.vy;
      if (l.y < -10 || l.x < 0 || l.x > this.width) {
        this.lasers.splice(i, 1);
      }
    }

    // Update enemy lasers
    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      const el = this.enemyLasers[i];
      el.y += el.vy;

      // Hit player
      const dist = Math.hypot(el.x - this.player.x, el.y - this.player.y);
      if (dist < 20) {
        this.enemyLasers.splice(i, 1);
        this.hitPlayer();
        continue;
      }

      if (el.y > this.height + 10) {
        this.enemyLasers.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx;
      e.y += e.vy;

      // Wall bounce for zig-zag
      if (e.x - e.radius < 10 || e.x + e.radius > this.width - 10) {
        e.vx = -e.vx;
      }

      // Cruiser shooting
      if (e.type === 'cruiser' && now - e.lastShot > 1400) {
        e.lastShot = now;
        this.enemyLasers.push({
          x: e.x,
          y: e.y + e.radius,
          vy: 4.8
        });
      }

      // Asteroid rotation
      if (e.type === 'asteroid') {
        e.rotation += e.vRot;
      }

      // Check collision with player
      const distToPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (distToPlayer < e.radius + 16) {
        this.enemies.splice(i, 1);
        this.explode(e.x, e.y, e.color);
        this.hitPlayer();
        continue;
      }

      // Check collision with lasers
      for (let lIdx = this.lasers.length - 1; lIdx >= 0; lIdx--) {
        const l = this.lasers[lIdx];
        const hitDist = Math.hypot(l.x - e.x, l.y - e.y);
        if (hitDist < e.radius + 4) {
          this.lasers.splice(lIdx, 1);
          e.hp--;
          this.sound?.playHit(420);

          if (e.hp <= 0) {
            this.score += e.points;
            this.explode(e.x, e.y, e.color);

            // Chance to drop power-up (15%)
            if (Math.random() < 0.16) {
              const types = ['triple', 'shield', 'bomb'];
              const type = types[Math.floor(Math.random() * types.length)];
              this.powerups.push({ x: e.x, y: e.y, vy: 1.8, type });
            }

            this.enemies.splice(i, 1);
            this.updateHUD();
            break;
          }
        }
      }

      // Out of bounds
      if (e.y > this.height + 50) {
        this.enemies.splice(i, 1);
      }
    }

    // Update powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy;

      // Collect
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < 28) {
        this.sound?.playPowerup();
        if (p.type === 'triple') {
          this.player.tripleShotTime = now + 9000;
        } else if (p.type === 'shield') {
          this.player.shield = Math.min(this.player.maxShield, this.player.shield + 1);
          this.updateHUD();
        } else if (p.type === 'bomb') {
          // Screen wipe
          this.enemies.forEach(en => {
            this.score += en.points;
            this.explode(en.x, en.y, en.color);
          });
          this.enemies = [];
          this.updateHUD();
        }
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.y > this.height) {
        this.powerups.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx;
      part.y += part.vy;
      part.alpha -= 0.035;
      if (part.alpha <= 0) this.particles.splice(i, 1);
    }

    // Wave progress
    const calculatedWave = Math.floor(this.score / 350) + 1;
    if (calculatedWave > this.wave) {
      this.wave = calculatedWave;
      this.sound?.playPowerup();
      this.updateHUD();
    }
  }

  explode(x, y, color) {
    this.sound?.playBombExplosion();
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
        color,
        size: 2 + Math.random() * 4,
        alpha: 1
      });
    }
  }

  hitPlayer() {
    if (this.player.isInvulnerable) return;

    this.player.shield--;
    this.sound?.playHit(200);
    this.updateHUD();

    this.player.isInvulnerable = true;
    setTimeout(() => {
      this.player.isInvulnerable = false;
    }, 1200);

    if (this.player.shield <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.sound?.playGameOver();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.storageKey, this.highScore.toString());
    }

    this.overlayTitle.textContent = 'SHIP DESTROYED';
    this.overlayDesc.textContent = 'Your vessel was consumed by enemy fire. Re-calibrate systems and launch again!';
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">WAVE</span><span class="num">${this.wave}</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.highScore}</span></div>
    `;
    this.overlayStats.classList.remove('hidden');
    this.btnPlay.innerHTML = '<span>🔄</span> LAUNCH AGAIN';
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
    if (this.shieldEl) this.shieldEl.textContent = `${this.player.shield}/${this.player.maxShield}`;
    if (this.waveEl) this.waveEl.textContent = this.wave;
  }

  loop() {
    if (this.state !== 'PLAYING') return;
    this.update();
    this.render();
    if (this.state === 'PLAYING') {
      this.animId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Starfield
    this.stars.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Enemy lasers
    this.enemyLasers.forEach(el => {
      ctx.save();
      ctx.shadowColor = '#ff4757';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(el.x - 2, el.y - 6, 4, 12);
      ctx.restore();
    });

    // Player lasers
    this.lasers.forEach(l => {
      ctx.save();
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = l.color;
      ctx.fillRect(l.x - 2, l.y - 8, 4, 16);
      ctx.restore();
    });

    // Powerups
    this.powerups.forEach(p => {
      ctx.save();
      const col = p.type === 'triple' ? '#00d2d3' : (p.type === 'shield' ? '#2ed573' : '#ffa502');
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = p.type === 'triple' ? '3x' : (p.type === 'shield' ? '🛡️' : '💣');
      ctx.fillText(icon, p.x, p.y);
      ctx.restore();
    });

    // Enemies
    this.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'drone') {
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.moveTo(0, e.radius);
        ctx.lineTo(-e.radius, -e.radius);
        ctx.lineTo(0, -e.radius / 2);
        ctx.lineTo(e.radius, -e.radius);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'cruiser') {
        ctx.shadowColor = '#ffa502';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffa502';
        ctx.beginPath();
        ctx.moveTo(0, e.radius);
        ctx.lineTo(-e.radius, 0);
        ctx.lineTo(-e.radius * 0.7, -e.radius);
        ctx.lineTo(e.radius * 0.7, -e.radius);
        ctx.lineTo(e.radius, 0);
        ctx.closePath();
        ctx.fill();

        // Core eye
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'asteroid') {
        ctx.rotate(e.rotation);
        ctx.shadowColor = '#a4b0be';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#57606f';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Player ship
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    if (this.player.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Engine flame
    ctx.fillStyle = '#ffa502';
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-6, 16);
    ctx.lineTo(0, 26 + Math.random() * 8);
    ctx.lineTo(6, 16);
    ctx.fill();

    // Fuselage
    ctx.fillStyle = '#00d2d3';
    ctx.shadowColor = '#00d2d3';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-18, 14);
    ctx.lineTo(-6, 10);
    ctx.lineTo(0, 16);
    ctx.lineTo(6, 10);
    ctx.lineTo(18, 14);
    ctx.closePath();
    ctx.fill();

    // Canopy
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shield bubble
    if (this.player.shield > 0) {
      ctx.strokeStyle = 'rgba(0, 210, 211, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    this.state = 'PAUSED';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpaceShooterGame };
}
