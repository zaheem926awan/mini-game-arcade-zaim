/**
 * Block Puzzle Arcade Game (Falling Polyominoes / Tetris)
 * 10x20 grid, ghost projection, next piece preview, hold piece, line clears,
 * keyboard and mobile controls.
 */

class BlockPuzzleGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_blocks_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    this.cols = 10;
    this.rows = 20;
    this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));

    this.pieces = {
      I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00d2d3' },
      O: { shape: [[1,1],[1,1]], color: '#fffa65' },
      T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#a55eea' },
      S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#2ed573' },
      Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#ff4757' },
      J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#70a1ff' },
      L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#ffa502' }
    };

    this.currentPiece = null;
    this.nextPiece = null;
    this.heldPiece = null;
    this.canHold = true;

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 800; // ms
    this.lastDropTime = 0;

    this.state = 'START';
    this.animId = null;

    this.keydownHandler = this.handleKeyDown.bind(this);
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper block-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🟦</span> SCORE: <span id="block-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="block-high-score" class="val">${this.highScore}</span></div>
          <div class="hud-stat"><span class="icon">📏</span> LINES: <span id="block-lines" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">⚡</span> LVL: <span id="block-level" class="val">1</span></div>
          <div class="hud-controls-bar">
            <button id="block-btn-pause" class="arcade-hud-btn" title="Pause Game (P)">⏸️</button>
            <button id="block-btn-restart" class="arcade-hud-btn" title="Restart Game">🔄</button>
          </div>
        </div>

        <div class="block-game-layout">
          <div class="block-sidebar left">
            <div class="sidebar-box">
              <span class="box-lbl">HOLD (C)</span>
              <canvas id="block-hold-canvas" width="80" height="80"></canvas>
            </div>
          </div>

          <div class="canvas-container">
            <canvas id="block-canvas" width="240" height="480"></canvas>
            <div id="block-overlay" class="game-overlay">
              <div class="overlay-modal">
                <h2 id="block-overlay-title" class="neon-title">BLOCK PUZZLE</h2>
                <p id="block-overlay-desc">Maneuver falling polyominoes, clear lines, and plan ahead with Ghost projection and Hold slots!</p>
                <div id="block-overlay-stats" class="modal-stats hidden"></div>
                <button id="block-btn-play" class="arcade-btn-primary"><span>🎮</span> DROP BLOCKS</button>
              </div>
            </div>
          </div>

          <div class="block-sidebar right">
            <div class="sidebar-box">
              <span class="box-lbl">NEXT</span>
              <canvas id="block-next-canvas" width="80" height="80"></canvas>
            </div>
          </div>
        </div>

        <div class="block-touch-controls">
          <div class="btn-row">
            <button class="b-btn" id="b-left">◀</button>
            <button class="b-btn" id="b-rotate">🔄 ROTATE</button>
            <button class="b-btn" id="b-right">▶</button>
          </div>
          <div class="btn-row">
            <button class="b-btn" id="b-hold">📥 HOLD</button>
            <button class="b-btn" id="b-down">▼ SOFT</button>
            <button class="b-btn action" id="b-hard">⚡ HARD DROP</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#block-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.holdCanvas = this.container.querySelector('#block-hold-canvas');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.nextCanvas = this.container.querySelector('#block-next-canvas');
    this.nextCtx = this.nextCanvas.getContext('2d');

    this.scoreEl = this.container.querySelector('#block-score');
    this.highScoreEl = this.container.querySelector('#block-high-score');
    this.linesEl = this.container.querySelector('#block-lines');
    this.levelEl = this.container.querySelector('#block-level');
    this.overlay = this.container.querySelector('#block-overlay');
    this.overlayTitle = this.container.querySelector('#block-overlay-title');
    this.overlayDesc = this.container.querySelector('#block-overlay-desc');
    this.overlayStats = this.container.querySelector('#block-overlay-stats');
    this.btnPlay = this.container.querySelector('#block-btn-play');
    this.btnPause = this.container.querySelector('#block-btn-pause');
    this.btnRestart = this.container.querySelector('#block-btn-restart');

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

    // Touch button handlers
    const bindTouch = (id, fn) => {
      const el = this.container.querySelector(id);
      if (el) {
        el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
        el.addEventListener('click', fn);
      }
    };

    bindTouch('#b-left', () => this.moveLeft());
    bindTouch('#b-right', () => this.moveRight());
    bindTouch('#b-rotate', () => this.rotate());
    bindTouch('#b-down', () => this.softDrop());
    bindTouch('#b-hard', () => this.hardDrop());
    bindTouch('#b-hold', () => this.hold());

    window.addEventListener('keydown', this.keydownHandler);

    this.render();
  }

  handleKeyDown(e) {
    if (this.state === 'PLAYING') {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.moveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.moveRight();
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.rotate();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.softDrop();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        this.hardDrop();
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
        e.preventDefault();
        this.hold();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        this.pause();
      }
    } else if (this.state === 'PAUSED' && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
      this.resume();
    } else if (this.state === 'GAMEOVER' && (e.key === ' ' || e.key === 'Enter')) {
      this.start();
    }
  }

  start() {
    this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 800;
    this.heldPiece = null;
    this.canHold = true;

    this.nextPiece = this.generatePiece();
    this.spawnNextPiece();

    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.updateHUD();

    this.lastDropTime = performance.now();
    cancelAnimationFrame(this.animId);
    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.overlayTitle.textContent = 'PAUSED';
    this.overlayDesc.textContent = 'Falling grid paused. Press RESUME or P to return to the puzzle.';
    this.overlayStats.classList.add('hidden');
    this.btnPlay.innerHTML = '<span>▶️</span> RESUME';
    this.overlay.classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.lastDropTime = performance.now();
    this.animId = requestAnimationFrame(this.loop);
  }

  restart() {
    this.start();
  }

  generatePiece() {
    const keys = Object.keys(this.pieces);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const def = this.pieces[key];
    return {
      type: key,
      shape: def.shape.map(r => [...r]),
      color: def.color,
      x: Math.floor((this.cols - def.shape[0].length) / 2),
      y: 0
    };
  }

  spawnNextPiece() {
    this.currentPiece = this.nextPiece || this.generatePiece();
    this.nextPiece = this.generatePiece();
    this.canHold = true;

    // Check collision on spawn -> Game Over
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
      this.gameOver();
    }
    this.renderPreviews();
  }

  checkCollision(x, y, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const gx = x + c;
          const gy = y + r;
          if (gx < 0 || gx >= this.cols || gy >= this.rows) return true;
          if (gy >= 0 && this.grid[gy][gx] !== 0) return true;
        }
      }
    }
    return false;
  }

  moveLeft() {
    if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.shape)) {
      this.currentPiece.x--;
      this.sound?.playMove();
      this.render();
    }
  }

  moveRight() {
    if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.shape)) {
      this.currentPiece.x++;
      this.sound?.playMove();
      this.render();
    }
  }

  rotate() {
    const origShape = this.currentPiece.shape;
    const N = origShape.length;
    const rotated = origShape[0].map((_, idx) => origShape.map(row => row[idx]).reverse());

    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, rotated)) {
      this.currentPiece.shape = rotated;
      this.sound?.playMove();
      this.render();
    } else if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, rotated)) {
      this.currentPiece.x--;
      this.currentPiece.shape = rotated;
      this.sound?.playMove();
      this.render();
    } else if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, rotated)) {
      this.currentPiece.x++;
      this.currentPiece.shape = rotated;
      this.sound?.playMove();
      this.render();
    }
  }

  softDrop() {
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
      this.currentPiece.y++;
      this.score += 1;
      this.updateHUD();
      this.render();
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    let dropDist = 0;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
      this.currentPiece.y++;
      dropDist++;
    }
    this.score += dropDist * 2;
    this.sound?.playHit(500);
    this.lockPiece();
  }

  hold() {
    if (!this.canHold) return;
    this.sound?.playClick();

    if (!this.heldPiece) {
      this.heldPiece = {
        type: this.currentPiece.type,
        shape: this.pieces[this.currentPiece.type].shape.map(r => [...r]),
        color: this.currentPiece.color
      };
      this.spawnNextPiece();
    } else {
      const temp = {
        type: this.currentPiece.type,
        shape: this.pieces[this.currentPiece.type].shape.map(r => [...r]),
        color: this.currentPiece.color
      };
      this.currentPiece = {
        type: this.heldPiece.type,
        shape: this.pieces[this.heldPiece.type].shape.map(r => [...r]),
        color: this.heldPiece.color,
        x: Math.floor((this.cols - this.heldPiece.shape[0].length) / 2),
        y: 0
      };
      this.heldPiece = temp;
    }
    this.canHold = false;
    this.renderPreviews();
    this.render();
  }

  lockPiece() {
    const { x, y, shape, color } = this.currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          if (y + r >= 0) {
            this.grid[y + r][x + c] = color;
          }
        }
      }
    }

    this.clearLines();
    this.spawnNextPiece();
  }

  clearLines() {
    let linesCleared = 0;

    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== 0)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.cols).fill(0));
        linesCleared++;
        r++; // check same row again since rows fell down
      }
    }

    if (linesCleared > 0) {
      const lineScores = [0, 100, 300, 500, 800];
      this.score += (lineScores[linesCleared] || 1000) * this.level;
      this.lines += linesCleared;
      this.sound?.playScore();

      if (linesCleared === 4) {
        this.sound?.playWin();
      }

      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(120, 800 - (this.level - 1) * 70);

      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem(this.storageKey, this.highScore.toString());
      }
      this.updateHUD();
    }
  }

  getGhostY() {
    if (!this.currentPiece) return 0;
    let gy = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, gy + 1, this.currentPiece.shape)) {
      gy++;
    }
    return gy;
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.sound?.playHit();
    this.sound?.playGameOver();

    this.overlayTitle.textContent = 'BLOCK MATRIX FULL';
    this.overlayDesc.textContent = 'Blocks have stacked past the ceiling. Spin up a new matrix!';
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">LINES</span><span class="num">${this.lines}</span></div>
      <div class="stat-box"><span class="lbl">LEVEL</span><span class="num">${this.level}</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.highScore}</span></div>
    `;
    this.overlayStats.classList.remove('hidden');
    this.btnPlay.innerHTML = '<span>🔄</span> DROP AGAIN';
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
    if (this.linesEl) this.linesEl.textContent = this.lines;
    if (this.levelEl) this.levelEl.textContent = this.level;
  }

  loop(currentTime) {
    if (this.state !== 'PLAYING') return;

    if (currentTime - this.lastDropTime >= this.dropInterval) {
      this.softDrop();
      this.lastDropTime = currentTime;
    }

    this.render();
    if (this.state === 'PLAYING') {
      this.animId = requestAnimationFrame(this.loop);
    }
  }

  renderPreviews() {
    // Render Hold
    this.holdCtx.clearRect(0, 0, 80, 80);
    if (this.heldPiece) {
      this.drawMiniPiece(this.holdCtx, this.heldPiece);
    }

    // Render Next
    this.nextCtx.clearRect(0, 0, 80, 80);
    if (this.nextPiece) {
      this.drawMiniPiece(this.nextCtx, this.nextPiece);
    }
  }

  drawMiniPiece(ctx, piece) {
    const s = piece.shape;
    const tileSize = 16;
    const offsetX = (80 - s[0].length * tileSize) / 2;
    const offsetY = (80 - s.length * tileSize) / 2;

    ctx.save();
    ctx.shadowColor = piece.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = piece.color;

    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (s[r][c] !== 0) {
          ctx.beginPath();
          ctx.roundRect(offsetX + c * tileSize + 1, offsetY + r * tileSize + 1, tileSize - 2, tileSize - 2, 3);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const blockW = this.canvas.width / this.cols;
    const blockH = this.canvas.height / this.rows;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * blockW, 0);
      ctx.lineTo(c * blockW, this.canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * blockH);
      ctx.lineTo(this.canvas.width, r * blockH);
      ctx.stroke();
    }

    // Draw locked blocks
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== 0) {
          const col = this.grid[r][c];
          ctx.save();
          ctx.shadowColor = col;
          ctx.shadowBlur = 6;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.roundRect(c * blockW + 1, r * blockH + 1, blockW - 2, blockH - 2, 3);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fillRect(c * blockW + 2, r * blockH + 2, blockW - 4, 3);
          ctx.restore();
        }
      }
    }

    if (this.currentPiece && this.state === 'PLAYING') {
      // Draw Ghost Piece
      const ghostY = this.getGhostY();
      const { x, shape, color } = this.currentPiece;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            ctx.strokeRect((x + c) * blockW + 2, (ghostY + r) * blockH + 2, blockW - 4, blockH - 4);
          }
        }
      }
      ctx.restore();

      // Draw Current Piece
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            const bx = (x + c) * blockW;
            const by = (this.currentPiece.y + r) * blockH;
            ctx.beginPath();
            ctx.roundRect(bx + 1, by + 1, blockW - 2, blockH - 2, 3);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(bx + 2, by + 2, blockW - 4, 3);
            ctx.fillStyle = color;
          }
        }
      }
      ctx.restore();
    }
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('keydown', this.keydownHandler);
    this.state = 'PAUSED';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BlockPuzzleGame };
}
