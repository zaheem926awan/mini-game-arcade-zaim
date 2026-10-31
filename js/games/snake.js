/**
 * Neon Snake Arcade Game
 * Fast-paced glowing cyber snake with normal foods, golden powerups, and responsive controls.
 */

class NeonSnakeGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_snake_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    this.gridSize = 22; // 22x22 cells
    this.tileSize = 20;
    this.width = this.gridSize * this.tileSize;
    this.height = this.gridSize * this.tileSize;

    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = { x: 15, y: 11 };
    this.bonusFood = null;
    this.bonusTimer = 0;
    this.bonusTimeout = null;

    this.score = 0;
    this.applesEaten = 0;
    this.speed = 120; // ms per tick
    this.baseSpeed = 120;
    this.lastTickTime = 0;
    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.animId = null;

    this.keyHandler = this.handleKey.bind(this);
    this.touchStartPos = null;
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper snake-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🍎</span> SCORE: <span id="snake-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="snake-high-score" class="val">${this.highScore}</span></div>
          <div class="hud-stat"><span class="icon">📏</span> LENGTH: <span id="snake-length" class="val">3</span></div>
          <div class="hud-controls-bar">
            <button id="snake-btn-pause" class="arcade-hud-btn" title="Pause Game (P)">⏸️</button>
            <button id="snake-btn-restart" class="arcade-hud-btn" title="Restart Game">🔄</button>
          </div>
        </div>
        <div class="canvas-container">
          <canvas id="snake-canvas" width="${this.width}" height="${this.height}"></canvas>
          <div id="snake-overlay" class="game-overlay">
            <div class="overlay-modal">
              <h2 id="snake-overlay-title" class="neon-title">NEON SNAKE</h2>
              <p id="snake-overlay-desc">Slither through the cyber grid. Eat apples to grow, hunt golden stars for bonus points, and avoid the walls and yourself!</p>
              <div id="snake-overlay-stats" class="modal-stats hidden"></div>
              <button id="snake-btn-play" class="arcade-btn-primary"><span>🎮</span> PLAY NOW</button>
            </div>
          </div>
        </div>
        <div class="virtual-dpad">
          <button class="dpad-btn up" data-dir="up">▲</button>
          <div class="dpad-mid">
            <button class="dpad-btn left" data-dir="left">◀</button>
            <button class="dpad-btn down" data-dir="down">▼</button>
            <button class="dpad-btn right" data-dir="right">▶</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#snake-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = this.container.querySelector('#snake-score');
    this.highScoreEl = this.container.querySelector('#snake-high-score');
    this.lengthEl = this.container.querySelector('#snake-length');
    this.overlay = this.container.querySelector('#snake-overlay');
    this.overlayTitle = this.container.querySelector('#snake-overlay-title');
    this.overlayDesc = this.container.querySelector('#snake-overlay-desc');
    this.overlayStats = this.container.querySelector('#snake-overlay-stats');
    this.btnPlay = this.container.querySelector('#snake-btn-play');
    this.btnPause = this.container.querySelector('#snake-btn-pause');
    this.btnRestart = this.container.querySelector('#snake-btn-restart');

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

    // Virtual D-pad
    this.container.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleDirectionInput(btn.getAttribute('data-dir'));
      }, { passive: false });
      btn.addEventListener('mousedown', () => {
        this.handleDirectionInput(btn.getAttribute('data-dir'));
      });
    });

    // Touch swipe on canvas
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.touchStartPos || e.touches.length === 0) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - this.touchStartPos.x;
      const dy = e.touches[0].clientY - this.touchStartPos.y;
      if (Math.hypot(dx, dy) > 25) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.handleDirectionInput(dx > 0 ? 'right' : 'left');
        } else {
          this.handleDirectionInput(dy > 0 ? 'down' : 'up');
        }
        this.touchStartPos = null;
      }
    }, { passive: false });

    window.addEventListener('keydown', this.keyHandler);

    this.resetState();
    this.render();
  }

  handleKey(e) {
    if (this.state === 'PLAYING') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.handleDirectionInput('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.handleDirectionInput('down');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.handleDirectionInput('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.handleDirectionInput('right');
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        this.pause();
      }
    } else if (this.state === 'PAUSED' && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
      e.preventDefault();
      this.resume();
    } else if (this.state === 'GAMEOVER' && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      this.start();
    }
  }

  handleDirectionInput(dir) {
    if (this.state !== 'PLAYING') return;
    if (dir === 'up' && this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
    if (dir === 'down' && this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
    if (dir === 'left' && this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
    if (dir === 'right' && this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
  }

  resetState() {
    this.snake = [
      { x: 10, y: 11 },
      { x: 9, y: 11 },
      { x: 8, y: 11 }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.applesEaten = 0;
    this.speed = this.baseSpeed;
    this.bonusFood = null;
    clearTimeout(this.bonusTimeout);
    this.spawnFood();
    this.updateHUD();
  }

  start() {
    this.resetState();
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.lastTickTime = performance.now();
    cancelAnimationFrame(this.animId);
    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.overlayTitle.textContent = 'PAUSED';
    this.overlayDesc.textContent = 'Take a breather. Press RESUME or P to jump back into the cyber grid.';
    this.overlayStats.classList.add('hidden');
    this.btnPlay.innerHTML = '<span>▶️</span> RESUME';
    this.overlay.classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.lastTickTime = performance.now();
    this.animId = requestAnimationFrame(this.loop);
  }

  restart() {
    this.start();
  }

  spawnFood() {
    let valid = false;
    while (!valid) {
      const rx = Math.floor(Math.random() * this.gridSize);
      const ry = Math.floor(Math.random() * this.gridSize);
      valid = !this.snake.some(segment => segment.x === rx && segment.y === ry);
      if (valid) {
        this.food = { x: rx, y: ry };
      }
    }
  }

  spawnBonusFood() {
    let valid = false;
    while (!valid) {
      const rx = Math.floor(Math.random() * this.gridSize);
      const ry = Math.floor(Math.random() * this.gridSize);
      valid = !this.snake.some(s => s.x === rx && s.y === ry) && (this.food.x !== rx || this.food.y !== ry);
      if (valid) {
        this.bonusFood = { x: rx, y: ry };
        this.bonusTimer = 6000;
        clearTimeout(this.bonusTimeout);
        this.bonusTimeout = setTimeout(() => {
          this.bonusFood = null;
        }, 6000);
      }
    }
  }

  tick() {
    this.direction = { ...this.nextDirection };
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    // Wall collision
    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      this.gameOver('Hit the electric boundary wall!');
      return;
    }

    // Self collision
    if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      this.gameOver('Ran into yourself!');
      return;
    }

    this.snake.unshift(head);

    // Food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.applesEaten++;
      this.sound?.playScore();
      this.spawnFood();

      // Bonus food every 5 apples
      if (this.applesEaten % 5 === 0 && !this.bonusFood) {
        this.spawnBonusFood();
      }

      // Speed scale
      this.speed = Math.max(65, this.baseSpeed - Math.floor(this.applesEaten / 3) * 4);
    } else if (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
      this.score += 50;
      this.bonusFood = null;
      clearTimeout(this.bonusTimeout);
      this.sound?.playPowerup();
    } else {
      this.snake.pop(); // regular motion without growth
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.storageKey, this.highScore.toString());
    }

    this.updateHUD();
  }

  gameOver(reason) {
    this.state = 'GAMEOVER';
    this.sound?.playHit();
    this.sound?.playGameOver();

    this.overlayTitle.textContent = 'GAME OVER';
    this.overlayDesc.textContent = reason;
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">FINAL SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">LENGTH</span><span class="num">${this.snake.length}</span></div>
      <div class="stat-box"><span class="lbl">APPLES</span><span class="num">${this.applesEaten}</span></div>
      <div class="stat-box"><span class="lbl">HIGH SCORE</span><span class="num">${this.highScore}</span></div>
    `;
    this.overlayStats.classList.remove('hidden');
    this.btnPlay.innerHTML = '<span>🔄</span> PLAY AGAIN';
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
    if (this.lengthEl) this.lengthEl.textContent = this.snake.length;
  }

  loop(currentTime) {
    if (this.state !== 'PLAYING') return;

    if (currentTime - this.lastTickTime >= this.speed) {
      this.tick();
      this.lastTickTime = currentTime;
    }

    this.render();
    if (this.state === 'PLAYING') {
      this.animId = requestAnimationFrame(this.loop);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Subtle Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw Bonus Golden Star if active
    if (this.bonusFood) {
      const bx = this.bonusFood.x * this.tileSize + this.tileSize / 2;
      const by = this.bonusFood.y * this.tileSize + this.tileSize / 2;
      const pulse = Math.sin(Date.now() / 150) * 3;

      ctx.save();
      ctx.shadowColor = '#ffa502';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#fffa65';
      ctx.beginPath();
      ctx.arc(bx, by, this.tileSize / 2 - 2 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e67e22';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', bx, by);
      ctx.restore();
    }

    // Draw Normal Apple (Neon Pink/Red)
    const fx = this.food.x * this.tileSize;
    const fy = this.food.y * this.tileSize;
    ctx.save();
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.roundRect(fx + 2, fy + 2, this.tileSize - 4, this.tileSize - 4, 6);
    ctx.fill();

    // Leaf
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(fx + this.tileSize / 2, fy, 3, 3);
    ctx.restore();

    // Draw Snake Segments
    this.snake.forEach((seg, idx) => {
      const sx = seg.x * this.tileSize;
      const sy = seg.y * this.tileSize;
      ctx.save();

      if (idx === 0) {
        // Head
        ctx.shadowColor = '#00d2d3';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#00d2d3';
        ctx.beginPath();
        ctx.roundRect(sx + 1, sy + 1, this.tileSize - 2, this.tileSize - 2, 6);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        const eyeOffset = 4;
        ctx.beginPath();
        if (this.direction.x === 1) {
          ctx.arc(sx + 14, sy + 6, 2.5, 0, Math.PI * 2);
          ctx.arc(sx + 14, sy + 14, 2.5, 0, Math.PI * 2);
        } else if (this.direction.x === -1) {
          ctx.arc(sx + 6, sy + 6, 2.5, 0, Math.PI * 2);
          ctx.arc(sx + 6, sy + 14, 2.5, 0, Math.PI * 2);
        } else if (this.direction.y === 1) {
          ctx.arc(sx + 6, sy + 14, 2.5, 0, Math.PI * 2);
          ctx.arc(sx + 14, sy + 14, 2.5, 0, Math.PI * 2);
        } else {
          ctx.arc(sx + 6, sy + 6, 2.5, 0, Math.PI * 2);
          ctx.arc(sx + 14, sy + 6, 2.5, 0, Math.PI * 2);
        }
        ctx.fill();
      } else {
        // Body with gradient fade towards tail
        const ratio = 1 - (idx / this.snake.length) * 0.6;
        ctx.shadowColor = '#10ac84';
        ctx.shadowBlur = 6;
        ctx.fillStyle = `rgba(16, 172, 132, ${ratio})`;
        ctx.beginPath();
        ctx.roundRect(sx + 2, sy + 2, this.tileSize - 4, this.tileSize - 4, 4);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    clearTimeout(this.bonusTimeout);
    window.removeEventListener('keydown', this.keyHandler);
    this.state = 'PAUSED';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NeonSnakeGame };
}
