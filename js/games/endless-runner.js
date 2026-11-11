/**
 * Endless Runner Arcade Game (Cyber Runner)
 * High-speed side-scrolling platformer with jump, double-jump, slide/duck,
 * parallax neon skyline, energy crystals, obstacles, and speed scaling.
 */

class EndlessRunnerGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_runner_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    this.width = 560;
    this.height = 360;
    this.groundY = 290;

    this.player = {
      x: 75,
      y: this.groundY - 44,
      w: 30,
      h: 44,
      baseH: 44,
      slideH: 22,
      vy: 0,
      gravity: 0.65,
      jumpStrength: -11.5,
      isGrounded: true,
      jumpsLeft: 2,
      isSliding: false,
      runAnimFrame: 0,
      invulnerableTimer: 0
    };

    this.speed = 5.5;
    this.baseSpeed = 5.5;
    this.distance = 0;
    this.score = 0;
    this.crystalsCollected = 0;

    this.obstacles = [];
    this.crystals = [];
    this.particles = [];
    this.buildings = [];

    this.lastObstacleDist = 0;
    this.state = 'START';
    this.animId = null;

    this.keydownHandler = this.handleKeyDown.bind(this);
    this.keyupHandler = this.handleKeyUp.bind(this);

    this.initBuildings();
  }

  initBuildings() {
    this.buildings = [];
    for (let x = 0; x < this.width + 100; x += 60) {
      this.buildings.push({
        x,
        w: 45 + Math.random() * 35,
        h: 90 + Math.random() * 110,
        color: Math.random() < 0.5 ? '#1e1b4b' : '#0f172a'
      });
    }
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper runner-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🏃</span> DIST: <span id="run-dist" class="val">0m</span></div>
          <div class="hud-stat"><span class="icon">💎</span> CRYSTALS: <span id="run-crystals" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">⭐</span> SCORE: <span id="run-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="run-best" class="val">${this.highScore}</span></div>
          <div class="hud-controls-bar">
            <button id="run-btn-pause" class="arcade-hud-btn" title="Pause Game (P)">⏸️</button>
            <button id="run-btn-restart" class="arcade-hud-btn" title="Restart Game">🔄</button>
          </div>
        </div>
        <div class="canvas-container">
          <canvas id="runner-canvas" width="${this.width}" height="${this.height}"></canvas>
          <div id="run-overlay" class="game-overlay">
            <div class="overlay-modal">
              <h2 id="run-overlay-title" class="neon-title">CYBER RUNNER</h2>
              <p id="run-overlay-desc">Dash across neon rooftops! Press JUMP (Space/W) to leap over spikes (tap twice for double jump) and SLIDE (S/Down) to duck under lasers.</p>
              <div id="run-overlay-stats" class="modal-stats hidden"></div>
              <button id="run-btn-play" class="arcade-btn-primary"><span>⚡</span> START RUN</button>
            </div>
          </div>
        </div>
        <div class="runner-controls-row">
          <button class="runner-touch-btn jump" id="touch-jump">▲ JUMP (DOUBLE JUMP)</button>
          <button class="runner-touch-btn slide" id="touch-slide">▼ SLIDE / DUCK</button>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#runner-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.distEl = this.container.querySelector('#run-dist');
    this.crystalsEl = this.container.querySelector('#run-crystals');
    this.scoreEl = this.container.querySelector('#run-score');
    this.bestEl = this.container.querySelector('#run-best');
    this.overlay = this.container.querySelector('#run-overlay');
    this.overlayTitle = this.container.querySelector('#run-overlay-title');
    this.overlayDesc = this.container.querySelector('#run-overlay-desc');
    this.overlayStats = this.container.querySelector('#run-overlay-stats');
    this.btnPlay = this.container.querySelector('#run-btn-play');
    this.btnPause = this.container.querySelector('#run-btn-pause');
    this.btnRestart = this.container.querySelector('#run-btn-restart');

    this.btnPlay.addEventListener('click', () => {
      this.sound?.playClick();
      // While paused this button is labelled RESUME: continue the run instead of restarting it.
      if (this.state === 'PAUSED') this.resume();
      else this.start();
    });

    this.btnPause.addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pause();
      else if (this.state === 'PAUSED') this.resume();
    });

    this.btnRestart.addEventListener('click', () => {
      this.sound?.playClick();
      this.restart();
    });

    // Touch controls
    const tJump = this.container.querySelector('#touch-jump');
    const tSlide = this.container.querySelector('#touch-slide');

    tJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.jump(); }, { passive: false });
    tSlide.addEventListener('touchstart', (e) => { e.preventDefault(); this.slide(true); }, { passive: false });
    tSlide.addEventListener('touchend', (e) => { e.preventDefault(); this.slide(false); }, { passive: false });

    // Canvas tap to jump
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        this.jump();
      }
    }, { passive: false });

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);

    this.render();
  }

  handleKeyDown(e) {
    // Holding a pause key sends repeated keydown events; only the first press may toggle pause.
    if (e.repeat && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) return;
    if (this.state === 'PLAYING') {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.jump();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.slide(true);
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        this.pause();
      }
    } else if (this.state === 'PAUSED' && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
      this.resume();
    } else if (this.state === 'GAMEOVER' && (e.key === ' ' || e.key === 'Enter')) {
      this.start();
    }
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      this.slide(false);
    }
  }

  jump() {
    if (this.state !== 'PLAYING') return;
    if (this.player.jumpsLeft > 0) {
      this.player.vy = this.player.jumpStrength;
      this.player.isGrounded = false;
      this.player.jumpsLeft--;
      this.slide(false); // Cancel slide on jump
      this.sound?.playJump();

      // Jump dust particles
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: this.player.x + 10,
          y: this.groundY,
          vx: -2 + (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 2,
          color: '#00d2d3',
          size: 3,
          alpha: 1
        });
      }
    }
  }

  slide(active) {
    if (this.state !== 'PLAYING') return;
    if (active) {
      this.player.isSliding = true;
      this.player.h = this.player.slideH;
      if (this.player.isGrounded) {
        this.player.y = this.groundY - this.player.slideH;
      }
    } else {
      this.player.isSliding = false;
      this.player.h = this.player.baseH;
      if (this.player.isGrounded) {
        this.player.y = this.groundY - this.player.baseH;
      }
    }
  }

  start() {
    this.speed = this.baseSpeed;
    this.distance = 0;
    this.score = 0;
    this.crystalsCollected = 0;
    this.lastObstacleDist = 0;

    this.player.y = this.groundY - this.player.baseH;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.jumpsLeft = 2;
    this.player.isSliding = false;
    this.player.h = this.player.baseH;

    this.obstacles = [];
    this.crystals = [];
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
    this.overlayDesc.textContent = 'Runner halted. Press RESUME or P to pick up the pace.';
    this.overlayStats.classList.add('hidden');
    this.btnPlay.innerHTML = '<span>▶️</span> RESUME';
    this.overlay.classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    cancelAnimationFrame(this.animId); // never run two loops after a quick pause/resume
    this.animId = requestAnimationFrame(this.loop);
  }

  restart() {
    this.start();
  }

  spawnObstacle() {
    const isHighLaser = Math.random() < 0.45;

    if (isHighLaser) {
      // High laser drone: player must slide under!
      this.obstacles.push({
        x: this.width + 40,
        y: this.groundY - 58,
        w: 36,
        h: 24,
        type: 'drone',
        color: '#ff4757'
      });
    } else {
      // Ground barrier/spikes: player must jump over!
      this.obstacles.push({
        x: this.width + 40,
        y: this.groundY - 32,
        w: 26,
        h: 32,
        type: 'spike',
        color: '#ffa502'
      });
    }

    // Spawn trail of crystals nearby
    if (Math.random() < 0.7) {
      const cy = isHighLaser ? this.groundY - 14 : this.groundY - 75;
      for (let k = 0; k < 3; k++) {
        this.crystals.push({
          x: this.width + 120 + k * 30,
          y: cy,
          size: 7,
          color: '#00d2d3'
        });
      }
    }
  }

  update() {
    this.distance += Math.floor(this.speed * 0.4);
    this.score = this.distance + this.crystalsCollected * 25;

    // Difficulty scale
    this.speed = Math.min(11, this.baseSpeed + (this.distance / 1200) * 1.5);

    // Player physics
    this.player.vy += this.player.gravity;
    this.player.y += this.player.vy;

    if (this.player.y >= this.groundY - this.player.h) {
      this.player.y = this.groundY - this.player.h;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.jumpsLeft = 2;
    }

    this.player.runAnimFrame += 0.25;

    // Scroll parallax buildings
    this.buildings.forEach(b => {
      b.x -= this.speed * 0.35;
      if (b.x + b.w < 0) {
        b.x = this.width + Math.random() * 40;
      }
    });

    // Spawn obstacles based on distance
    if (this.distance - this.lastObstacleDist > Math.max(160, 320 - (this.speed - 5) * 20)) {
      this.lastObstacleDist = this.distance;
      this.spawnObstacle();
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      ob.x -= this.speed;

      // Hit test with player bounding box
      const px = this.player.x;
      const py = this.player.y;
      const pw = this.player.w;
      const ph = this.player.h;

      if (px + pw > ob.x + 6 && px + 6 < ob.x + ob.w &&
          py + ph > ob.y + 4 && py + 4 < ob.y + ob.h) {
        this.gameOver();
        return;
      }

      if (ob.x + ob.w < -20) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update crystals
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i];
      c.x -= this.speed;

      // Collect test
      if (Math.hypot(c.x - (this.player.x + this.player.w / 2), c.y - (this.player.y + this.player.h / 2)) < 26) {
        this.crystalsCollected++;
        this.sound?.playPowerup();
        // Sparkle particles
        for (let k = 0; k < 5; k++) {
          this.particles.push({
            x: c.x, y: c.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: '#00d2d3',
            size: 2.5,
            alpha: 1
          });
        }
        this.crystals.splice(i, 1);
        continue;
      }

      if (c.x < -20) {
        this.crystals.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx;
      part.y += part.vy;
      part.alpha -= 0.04;
      if (part.alpha <= 0) this.particles.splice(i, 1);
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.storageKey, this.highScore.toString());
    }

    this.updateHUD();
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.sound?.playHit();
    this.sound?.playGameOver();

    this.overlayTitle.textContent = 'RUN TERMINATED';
    this.overlayDesc.textContent = 'You collided with a cyber hazard. Jump back in and set a new distance record!';
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">DISTANCE</span><span class="num">${this.distance}m</span></div>
      <div class="stat-box"><span class="lbl">CRYSTALS</span><span class="num">${this.crystalsCollected}</span></div>
      <div class="stat-box"><span class="lbl">SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.highScore}</span></div>
    `;
    this.overlayStats.classList.remove('hidden');
    this.btnPlay.innerHTML = '<span>🔄</span> RUN AGAIN';
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.distEl) this.distEl.textContent = `${this.distance}m`;
    if (this.crystalsEl) this.crystalsEl.textContent = this.crystalsCollected;
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.bestEl) this.bestEl.textContent = this.highScore;
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

    // Skyline Buildings
    this.buildings.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, this.groundY - b.h, b.w, b.h);
      // Windows
      ctx.fillStyle = 'rgba(0, 210, 211, 0.15)';
      for (let wy = this.groundY - b.h + 10; wy < this.groundY - 15; wy += 18) {
        ctx.fillRect(b.x + 8, wy, b.w - 16, 6);
      }
    });

    // Ground platform with neon edge
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    ctx.shadowColor = '#00d2d3';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Obstacles
    this.obstacles.forEach(ob => {
      ctx.save();
      ctx.shadowColor = ob.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = ob.color;

      if (ob.type === 'spike') {
        ctx.beginPath();
        ctx.moveTo(ob.x, ob.y + ob.h);
        ctx.lineTo(ob.x + ob.w / 2, ob.y);
        ctx.lineTo(ob.x + ob.w, ob.y + ob.h);
        ctx.closePath();
        ctx.fill();
      } else {
        // Floating Drone
        ctx.beginPath();
        ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 6);
        ctx.fill();

        // Laser beam under drone
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ob.x + 6, ob.y + ob.h);
        ctx.lineTo(ob.x + ob.w - 6, ob.y + ob.h);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Crystals
    this.crystals.forEach(c => {
      ctx.save();
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x - 2, c.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
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

    // Player character (Cyber Ninja / Runner)
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    ctx.shadowColor = '#00d2d3';
    ctx.shadowBlur = 14;

    if (this.player.isSliding) {
      // Sliding silhouette
      ctx.fillStyle = '#00d2d3';
      ctx.beginPath();
      ctx.roundRect(0, 0, 42, this.player.h, 6);
      ctx.fill();

      // Visor
      ctx.fillStyle = '#fffa65';
      ctx.fillRect(26, 4, 12, 5);
    } else {
      // Running upright silhouette
      ctx.fillStyle = '#00d2d3';
      // Torso & legs
      ctx.beginPath();
      ctx.roundRect(4, 12, this.player.w - 8, this.player.h - 12, 6);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(this.player.w / 2, 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Glowing cyber visor
      ctx.fillStyle = '#fffa65';
      ctx.fillRect(this.player.w / 2 + 1, 5, 7, 4);

      // Trailing cyber scarf / ribbon
      ctx.strokeStyle = '#ff4757';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(2, 10);
      const wave = Math.sin(this.player.runAnimFrame) * 4;
      ctx.lineTo(-12, 10 + wave);
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
  module.exports = { EndlessRunnerGame };
}
