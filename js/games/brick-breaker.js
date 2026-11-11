/**
 * Brick Breaker Arcade Game
 * Dynamic breakout arcade with particle effects, power-ups, levels, and physics bounce angles.
 */

class BrickBreakerGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_bricks_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    this.width = 520;
    this.height = 480;

    this.paddleWidth = 90;
    this.basePaddleWidth = 90;
    this.paddleHeight = 14;
    this.paddleX = (this.width - this.paddleWidth) / 2;
    this.paddleSpeed = 8;

    this.balls = [];
    this.bricks = [];
    this.particles = [];
    this.powerups = [];

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.maxLevels = 3;
    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'
    this.animId = null;

    this.keys = { left: false, right: false };
    this.paddleTimer = null;

    this.keydownHandler = this.handleKeyDown.bind(this);
    this.keyupHandler = this.handleKeyUp.bind(this);
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper bricks-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🧱</span> SCORE: <span id="bricks-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="bricks-high-score" class="val">${this.highScore}</span></div>
          <div class="hud-stat"><span class="icon">❤️</span> LIVES: <span id="bricks-lives" class="val">❤️❤️❤️</span></div>
          <div class="hud-stat"><span class="icon">🗺️</span> LVL: <span id="bricks-level" class="val">1</span></div>
          <div class="hud-controls-bar">
            <button id="bricks-btn-pause" class="arcade-hud-btn" title="Pause Game (P)">⏸️</button>
            <button id="bricks-btn-restart" class="arcade-hud-btn" title="Restart Game">🔄</button>
          </div>
        </div>
        <div class="canvas-container">
          <canvas id="bricks-canvas" width="${this.width}" height="${this.height}"></canvas>
          <div id="bricks-overlay" class="game-overlay">
            <div class="overlay-modal">
              <h2 id="bricks-overlay-title" class="neon-title">BRICK BREAKER</h2>
              <p id="bricks-overlay-desc">Deflect the cyber energy ball, shatter colored bricks, and collect falling power-up capsules!</p>
              <div id="bricks-overlay-stats" class="modal-stats hidden"></div>
              <button id="bricks-btn-play" class="arcade-btn-primary"><span>🎮</span> LAUNCH BALL</button>
            </div>
          </div>
        </div>
        <div class="touch-paddle-controls">
          <button class="touch-paddle-btn left" id="touch-left">◀ MOVE LEFT</button>
          <button class="touch-paddle-btn right" id="touch-right">MOVE RIGHT ▶</button>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#bricks-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = this.container.querySelector('#bricks-score');
    this.highScoreEl = this.container.querySelector('#bricks-high-score');
    this.livesEl = this.container.querySelector('#bricks-lives');
    this.levelEl = this.container.querySelector('#bricks-level');
    this.overlay = this.container.querySelector('#bricks-overlay');
    this.overlayTitle = this.container.querySelector('#bricks-overlay-title');
    this.overlayDesc = this.container.querySelector('#bricks-overlay-desc');
    this.overlayStats = this.container.querySelector('#bricks-overlay-stats');
    this.btnPlay = this.container.querySelector('#bricks-btn-play');
    this.btnPause = this.container.querySelector('#bricks-btn-pause');
    this.btnRestart = this.container.querySelector('#bricks-btn-restart');

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
    const tLeft = this.container.querySelector('#touch-left');
    const tRight = this.container.querySelector('#touch-right');

    const handleTouch = (isLeft, isDown) => {
      if (isLeft) this.keys.left = isDown;
      else this.keys.right = isDown;
    };

    tLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(true, true); }, { passive: false });
    tLeft.addEventListener('touchend', (e) => { e.preventDefault(); handleTouch(true, false); }, { passive: false });
    tRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(false, true); }, { passive: false });
    tRight.addEventListener('touchend', (e) => { e.preventDefault(); handleTouch(false, false); }, { passive: false });

    // Canvas Mouse / Touch Move
    this.canvas.addEventListener('mousemove', this.pointerMoveHandler);
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        this.pointerMoveHandler(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);

    this.buildLevel(1);
    this.resetPaddleAndBall();
    this.render();
  }

  handlePointerMove(e) {
    if (this.state !== 'PLAYING') return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const clientX = e.clientX !== undefined ? e.clientX : e.pageX;
    const mouseX = (clientX - rect.left) * scaleX;
    this.paddleX = Math.max(0, Math.min(this.width - this.paddleWidth, mouseX - this.paddleWidth / 2));
  }

  handleKeyDown(e) {
    // Holding a pause key sends repeated keydown events; only the first press may toggle pause.
    if (e.repeat && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.keys.left = true;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.keys.right = true;
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (this.state === 'PLAYING') this.pause();
      else if (this.state === 'PAUSED') this.resume();
    } else if (this.state === 'GAMEOVER' || this.state === 'VICTORY') {
      if (e.key === ' ' || e.key === 'Enter') {
        this.start();
      }
    }
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.keys.left = false;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.keys.right = false;
    }
  }

  buildLevel(lvl) {
    this.bricks = [];
    const rows = 4 + lvl;
    const cols = 8;
    const brickW = 54;
    const brickH = 18;
    const offsetX = 22;
    const offsetY = 45;

    const colors = [
      { hp: 3, color: '#ffa502', name: 'gold' },
      { hp: 2, color: '#00d2d3', name: 'cyan' },
      { hp: 1, color: '#ff4757', name: 'magenta' },
      { hp: 1, color: '#2ed573', name: 'emerald' },
      { hp: 2, color: '#a55eea', name: 'purple' }
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Creative pattern based on level
        if (lvl === 2 && (r + c) % 2 === 1 && r > 1) continue;
        if (lvl === 3 && (r === 2 || r === 3) && (c === 3 || c === 4)) continue;

        const info = colors[r % colors.length];
        this.bricks.push({
          x: offsetX + c * (brickW + 8),
          y: offsetY + r * (brickH + 7),
          w: brickW,
          h: brickH,
          hp: info.hp,
          maxHp: info.hp,
          color: info.color
        });
      }
    }
  }

  resetPaddleAndBall() {
    this.paddleWidth = this.basePaddleWidth;
    this.paddleX = (this.width - this.paddleWidth) / 2;
    this.balls = [{
      x: this.width / 2,
      y: this.height - 35,
      vx: (Math.random() > 0.5 ? 1 : -1) * 3.8,
      vy: -4.8,
      radius: 6,
      speed: 5.5
    }];
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.powerups = [];
    this.particles = [];
    this.buildLevel(1);
    this.resetPaddleAndBall();
    this.updateHUD();

    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    cancelAnimationFrame(this.animId);
    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.overlayTitle.textContent = 'PAUSED';
    this.overlayDesc.textContent = 'Game paused. Press RESUME or P to continue shattering bricks.';
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

  spawnPowerup(x, y) {
    const types = [
      { id: 'multiball', label: '⚡', color: '#00d2d3' },
      { id: 'expand', label: '↔', color: '#2ed573' },
      { id: 'score', label: '★', color: '#ffa502' },
      { id: 'slow', label: '🐢', color: '#a55eea' }
    ];
    const picked = types[Math.floor(Math.random() * types.length)];
    this.powerups.push({
      x, y,
      vy: 2.2,
      w: 22,
      h: 22,
      type: picked.id,
      label: picked.label,
      color: picked.color
    });
  }

  applyPowerup(p) {
    this.sound?.playPowerup();
    if (p.type === 'multiball') {
      const b = this.balls[0] || { x: this.width / 2, y: this.height / 2, speed: 5 };
      this.balls.push(
        { x: b.x, y: b.y, vx: -3.5, vy: -4, radius: 6, speed: b.speed },
        { x: b.x, y: b.y, vx: 3.5, vy: -4, radius: 6, speed: b.speed }
      );
    } else if (p.type === 'expand') {
      this.paddleWidth = 140;
      clearTimeout(this.paddleTimer);
      this.paddleTimer = setTimeout(() => {
        this.paddleWidth = this.basePaddleWidth;
      }, 10000);
    } else if (p.type === 'score') {
      this.score += 75;
      this.updateHUD();
    } else if (p.type === 'slow') {
      this.balls.forEach(ball => {
        ball.vx *= 0.75;
        ball.vy *= 0.75;
      });
    }
  }

  update() {
    // Paddle keyboard movement
    if (this.keys.left) {
      this.paddleX = Math.max(0, this.paddleX - this.paddleSpeed);
    }
    if (this.keys.right) {
      this.paddleX = Math.min(this.width - this.paddleWidth, this.paddleX + this.paddleSpeed);
    }

    // Update powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy;

      // Check paddle catch
      if (p.y + p.h >= this.height - 24 && p.y <= this.height - 10 &&
          p.x + p.w >= this.paddleX && p.x <= this.paddleX + this.paddleWidth) {
        this.applyPowerup(p);
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
      part.alpha -= 0.03;
      if (part.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update balls
    for (let bIdx = this.balls.length - 1; bIdx >= 0; bIdx--) {
      const b = this.balls[bIdx];
      b.x += b.vx;
      b.y += b.vy;

      // Wall reflections
      if (b.x - b.radius <= 0) {
        b.x = b.radius;
        b.vx = Math.abs(b.vx);
        this.sound?.playHit(300);
      } else if (b.x + b.radius >= this.width) {
        b.x = this.width - b.radius;
        b.vx = -Math.abs(b.vx);
        this.sound?.playHit(300);
      }

      if (b.y - b.radius <= 0) {
        b.y = b.radius;
        b.vy = Math.abs(b.vy);
        this.sound?.playHit(320);
      }

      // Paddle collision with angle deflection
      const paddleY = this.height - 22;
      if (b.y + b.radius >= paddleY && b.y - b.radius <= paddleY + this.paddleHeight &&
          b.x >= this.paddleX && b.x <= this.paddleX + this.paddleWidth && b.vy > 0) {
        // Calculate hit factor from -1 (far left) to 1 (far right)
        const hitOffset = (b.x - (this.paddleX + this.paddleWidth / 2)) / (this.paddleWidth / 2);
        const maxAngle = (70 * Math.PI) / 180;
        const angle = hitOffset * maxAngle;
        const speed = Math.min(8, Math.hypot(b.vx, b.vy) * 1.02);

        b.vx = speed * Math.sin(angle);
        b.vy = -speed * Math.cos(angle);
        b.y = paddleY - b.radius;

        this.sound?.playHit(480);
      }

      // Brick collisions
      for (let i = this.bricks.length - 1; i >= 0; i--) {
        const br = this.bricks[i];
        if (b.x + b.radius >= br.x && b.x - b.radius <= br.x + br.w &&
            b.y + b.radius >= br.y && b.y - b.radius <= br.y + br.h) {

          // Determine collision face
          const prevX = b.x - b.vx;
          const prevY = b.y - b.vy;

          if (prevX + b.radius <= br.x || prevX - b.radius >= br.x + br.w) {
            b.vx = -b.vx;
          } else {
            b.vy = -b.vy;
          }

          br.hp--;
          this.score += 15;
          this.sound?.playHit(540);

          // Brick shattered
          if (br.hp <= 0) {
            this.score += 25;
            // Spawn debris particles
            for (let k = 0; k < 8; k++) {
              this.particles.push({
                x: br.x + br.w / 2,
                y: br.y + br.h / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: br.color,
                alpha: 1,
                size: 3 + Math.random() * 3
              });
            }

            // Chance to drop power-up (20%)
            if (Math.random() < 0.22) {
              this.spawnPowerup(br.x + br.w / 2, br.y + br.h / 2);
            }

            this.bricks.splice(i, 1);
          }

          this.updateHUD();
          break; // only hit 1 brick per frame per ball
        }
      }

      // Ball fell down
      if (b.y - b.radius > this.height) {
        this.balls.splice(bIdx, 1);
      }
    }

    // All balls lost
    if (this.balls.length === 0) {
      this.lives--;
      this.sound?.playHit(180);
      this.updateHUD();

      if (this.lives <= 0) {
        this.gameOver(false);
      } else {
        this.resetPaddleAndBall();
      }
    }

    // All bricks destroyed -> Level Complete
    if (this.bricks.length === 0) {
      if (this.level < this.maxLevels) {
        this.level++;
        this.sound?.playPowerup();
        this.buildLevel(this.level);
        this.resetPaddleAndBall();
        this.updateHUD();
      } else {
        this.gameOver(true);
      }
    }
  }

  gameOver(isVictory) {
    this.state = isVictory ? 'VICTORY' : 'GAMEOVER';
    if (isVictory) this.sound?.playWin();
    else this.sound?.playLose();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.storageKey, this.highScore.toString());
    }

    this.overlayTitle.textContent = isVictory ? 'STAGE CLEAR!' : 'GAME OVER';
    this.overlayDesc.textContent = isVictory
      ? 'Outstanding! You demolished every cyber brick matrix!'
      : 'All energy balls depleted. Re-arm your paddle and try again!';

    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">LEVEL</span><span class="num">${this.level}/${this.maxLevels}</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.highScore}</span></div>
    `;
    this.overlayStats.classList.remove('hidden');
    this.btnPlay.innerHTML = '<span>🔄</span> PLAY AGAIN';
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
    if (this.levelEl) this.levelEl.textContent = this.level;
    if (this.livesEl) {
      this.livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
    }
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

    // Draw Bricks
    this.bricks.forEach(br => {
      ctx.save();
      ctx.shadowColor = br.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = br.color;
      ctx.beginPath();
      ctx.roundRect(br.x, br.y, br.w, br.h, 4);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, 3);

      // Hit point notch if multiple HP
      if (br.maxHp > 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(br.hp, br.x + br.w / 2, br.y + br.h - 4);
      }
      ctx.restore();
    });

    // Draw Falling Powerups
    this.powerups.forEach(p => {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(p.x - p.w / 2, p.y, p.w, p.h, 8);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, p.x, p.y + p.h / 2);
      ctx.restore();
    });

    // Draw Particles
    this.particles.forEach(part => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, part.alpha);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Paddle
    const paddleY = this.height - 22;
    ctx.save();
    ctx.shadowColor = '#00d2d3';
    ctx.shadowBlur = 14;
    const grad = ctx.createLinearGradient(this.paddleX, paddleY, this.paddleX + this.paddleWidth, paddleY);
    grad.addColorStop(0, '#00d2d3');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#00d2d3');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(this.paddleX, paddleY, this.paddleWidth, this.paddleHeight, 6);
    ctx.fill();
    ctx.restore();

    // Draw Balls
    this.balls.forEach(b => {
      ctx.save();
      ctx.shadowColor = '#fffa65';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    clearTimeout(this.paddleTimer);
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    this.state = 'PAUSED';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BrickBreakerGame };
}
