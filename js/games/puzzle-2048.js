/**
 * 2048 Cyber Puzzle Game
 * Sleek 4x4 sliding number puzzle with undo, animations, high-score, and touch/keyboard controls.
 */

class Puzzle2048Game {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_2048_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    this.size = 4;
    this.grid = [];
    this.previousState = null;
    this.score = 0;
    this.previousScore = 0;
    this.won = false;
    this.keepPlaying = false;
    this.gameOver = false;

    this.keydownHandler = this.handleKeyDown.bind(this);
    this.touchStartPos = null;
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper puzzle-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🔢</span> SCORE: <span id="p2048-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="p2048-high-score" class="val">${this.highScore}</span></div>
          <div class="hud-controls-bar">
            <button id="p2048-btn-undo" class="arcade-hud-btn" title="Undo Last Move">↩️</button>
            <button id="p2048-btn-restart" class="arcade-hud-btn" title="New Game">🔄</button>
          </div>
        </div>
        <div class="p2048-board-wrapper">
          <div id="p2048-board" class="p2048-board"></div>
          <div id="p2048-overlay" class="game-overlay hidden">
            <div class="overlay-modal">
              <h2 id="p2048-overlay-title" class="neon-title">GAME OVER</h2>
              <p id="p2048-overlay-desc">No more valid moves available.</p>
              <div id="p2048-overlay-stats" class="modal-stats"></div>
              <div class="overlay-btn-group">
                <button id="p2048-btn-keep-going" class="arcade-btn-secondary hidden">KEEP PLAYING</button>
                <button id="p2048-btn-play" class="arcade-btn-primary"><span>🔄</span> TRY AGAIN</button>
              </div>
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

    this.boardEl = this.container.querySelector('#p2048-board');
    this.scoreEl = this.container.querySelector('#p2048-score');
    this.highScoreEl = this.container.querySelector('#p2048-high-score');
    this.overlay = this.container.querySelector('#p2048-overlay');
    this.overlayTitle = this.container.querySelector('#p2048-overlay-title');
    this.overlayDesc = this.container.querySelector('#p2048-overlay-desc');
    this.overlayStats = this.container.querySelector('#p2048-overlay-stats');
    this.btnUndo = this.container.querySelector('#p2048-btn-undo');
    this.btnRestart = this.container.querySelector('#p2048-btn-restart');
    this.btnPlay = this.container.querySelector('#p2048-btn-play');
    this.btnKeepGoing = this.container.querySelector('#p2048-btn-keep-going');

    this.btnRestart.addEventListener('click', () => {
      this.sound?.playClick();
      this.start();
    });

    this.btnUndo.addEventListener('click', () => {
      this.sound?.playClick();
      this.undo();
    });

    this.btnPlay.addEventListener('click', () => {
      this.sound?.playClick();
      this.start();
    });

    this.btnKeepGoing.addEventListener('click', () => {
      this.keepPlaying = true;
      this.overlay.classList.add('hidden');
    });

    // Touch D-Pad
    this.container.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.move(btn.getAttribute('data-dir'));
      }, { passive: false });
      btn.addEventListener('click', () => {
        this.move(btn.getAttribute('data-dir'));
      });
    });

    // Touch Swipe on board
    this.boardEl.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: false });

    this.boardEl.addEventListener('touchend', (e) => {
      if (!this.touchStartPos || e.changedTouches.length === 0) return;
      e.preventDefault();
      const dx = e.changedTouches[0].clientX - this.touchStartPos.x;
      const dy = e.changedTouches[0].clientY - this.touchStartPos.y;
      if (Math.hypot(dx, dy) > 25) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.move(dx > 0 ? 'right' : 'left');
        } else {
          this.move(dy > 0 ? 'down' : 'up');
        }
      }
      this.touchStartPos = null;
    }, { passive: false });

    window.addEventListener('keydown', this.keydownHandler);

    this.start();
  }

  handleKeyDown(e) {
    if (this.gameOver && (e.key === ' ' || e.key === 'Enter')) {
      this.start();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      this.move('up');
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      this.move('down');
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      this.move('left');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      this.move('right');
    } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      this.undo();
    }
  }

  start() {
    this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    this.score = 0;
    this.previousState = null;
    this.won = false;
    this.keepPlaying = false;
    this.gameOver = false;
    this.overlay.classList.add('hidden');

    this.addRandomTile();
    this.addRandomTile();

    this.updateHUD();
    this.render();
  }

  saveState() {
    this.previousState = this.grid.map(row => [...row]);
    this.previousScore = this.score;
  }

  undo() {
    if (!this.previousState) return;
    this.grid = this.previousState.map(row => [...row]);
    this.score = this.previousScore;
    this.previousState = null;
    this.gameOver = false;
    this.overlay.classList.add('hidden');
    this.updateHUD();
    this.render();
  }

  addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  move(dir) {
    if (this.gameOver) return;

    this.saveState();
    let moved = false;

    // Helper functions for row manipulation
    const slide = (row) => {
      let filtered = row.filter(val => val !== 0);
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          this.score += filtered[i];
          if (filtered[i] === 2048 && !this.won) {
            this.won = true;
            this.handleVictory();
          }
          filtered.splice(i + 1, 1);
        }
      }
      while (filtered.length < this.size) filtered.push(0);
      return filtered;
    };

    const rotate = (matrix) => {
      return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
    };

    let tempGrid = this.grid.map(row => [...row]);

    if (dir === 'left') {
      for (let r = 0; r < this.size; r++) {
        const newRow = slide(tempGrid[r]);
        if (newRow.some((val, idx) => val !== tempGrid[r][idx])) moved = true;
        tempGrid[r] = newRow;
      }
    } else if (dir === 'right') {
      for (let r = 0; r < this.size; r++) {
        const reversed = [...tempGrid[r]].reverse();
        const newRow = slide(reversed).reverse();
        if (newRow.some((val, idx) => val !== tempGrid[r][idx])) moved = true;
        tempGrid[r] = newRow;
      }
    } else if (dir === 'up') {
      let rot = rotate(rotate(rotate(tempGrid)));
      for (let r = 0; r < this.size; r++) {
        const newRow = slide(rot[r]);
        if (newRow.some((val, idx) => val !== rot[r][idx])) moved = true;
        rot[r] = newRow;
      }
      tempGrid = rotate(rot);
    } else if (dir === 'down') {
      let rot = rotate(tempGrid);
      for (let r = 0; r < this.size; r++) {
        const newRow = slide(rot[r]);
        if (newRow.some((val, idx) => val !== rot[r][idx])) moved = true;
        rot[r] = newRow;
      }
      tempGrid = rotate(rotate(rotate(rot)));
    }

    if (moved) {
      this.grid = tempGrid;
      this.sound?.playMove();
      this.addRandomTile();

      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem(this.storageKey, this.highScore.toString());
      }

      this.updateHUD();
      this.render();

      if (this.checkGameOver()) {
        this.handleGameOver();
      }
    }
  }

  checkGameOver() {
    // Check if any empty cell exists
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) return false;
      }
    }
    // Check if any horizontal merge is possible
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size - 1; c++) {
        if (this.grid[r][c] === this.grid[r][c + 1]) return false;
      }
    }
    // Check if any vertical merge is possible
    for (let c = 0; c < this.size; c++) {
      for (let r = 0; r < this.size - 1; r++) {
        if (this.grid[r][c] === this.grid[r + 1][c]) return false;
      }
    }
    return true;
  }

  handleVictory() {
    this.sound?.playWin();
    this.overlayTitle.textContent = 'YOU REACHED 2048!';
    this.overlayDesc.textContent = 'Spectacular achievement! You engineered the 2048 cyber core!';
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.highScore}</span></div>
    `;
    this.btnKeepGoing.classList.remove('hidden');
    this.overlay.classList.remove('hidden');
  }

  handleGameOver() {
    this.gameOver = true;
    this.sound?.playLose();
    this.overlayTitle.textContent = 'GAME OVER';
    this.overlayDesc.textContent = 'No more tile movements are possible. Undo or start a new game!';
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.highScore}</span></div>
    `;
    this.btnKeepGoing.classList.add('hidden');
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
  }

  render() {
    if (!this.boardEl) return;
    this.boardEl.innerHTML = '';

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = this.grid[r][c];
        const tile = document.createElement('div');
        tile.className = `p2048-cell ${val > 0 ? 'tile-' + val : 'empty'}`;
        if (val > 0) {
          tile.textContent = val;
        }
        this.boardEl.appendChild(tile);
      }
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Puzzle2048Game };
}
