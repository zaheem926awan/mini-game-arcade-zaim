/**
 * Whack-a-Mole Arcade Game (Cyber Mole)
 * 3x3 vault grid, normal & golden moles, hazard bombs, hammer impact,
 * combo streaks, 30-second timer, accuracy calculation, and touch controls.
 */

class WhackAMoleGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_mole_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    this.timer = 30;
    this.timerInterval = null;
    this.spawnInterval = null;

    this.score = 0;
    this.whacks = 0;
    this.hits = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.bombsHit = 0;

    this.holes = [];
    this.activeMoles = Array(9).fill(null); // null or { type: 'mole'|'gold'|'bomb', timeout: id }

    this.state = 'START';
    this.keyHandler = this.handleKeyDown.bind(this);
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper mole-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🎯</span> SCORE: <span id="mole-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">⏱️</span> TIME: <span id="mole-time" class="val">30s</span></div>
          <div class="hud-stat"><span class="icon">⚡</span> COMBO: <span id="mole-combo" class="val">0x</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="mole-best" class="val">${this.highScore}</span></div>
          <div class="hud-controls-bar">
            <button id="mole-btn-pause" class="arcade-hud-btn" title="Pause Game (P)">⏸️</button>
            <button id="mole-btn-restart" class="arcade-hud-btn" title="Restart Game">🔄</button>
          </div>
        </div>

        <div class="mole-board-wrapper">
          <div id="mole-board" class="mole-grid"></div>
          <div id="mole-overlay" class="game-overlay">
            <div class="overlay-modal">
              <h2 id="mole-overlay-title" class="neon-title">CYBER MOLE</h2>
              <p id="mole-overlay-desc">Whack pop-up cyber moles before they submerge! Hunt golden bonus moles (+30 pts) and DODGE ticking skull bombs (-15 pts)!</p>
              <div id="mole-overlay-stats" class="modal-stats hidden"></div>
              <button id="mole-btn-play" class="arcade-btn-primary"><span>🔨</span> START WHACKING</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.boardEl = this.container.querySelector('#mole-board');
    this.scoreEl = this.container.querySelector('#mole-score');
    this.timeEl = this.container.querySelector('#mole-time');
    this.comboEl = this.container.querySelector('#mole-combo');
    this.bestEl = this.container.querySelector('#mole-best');
    this.overlay = this.container.querySelector('#mole-overlay');
    this.overlayTitle = this.container.querySelector('#mole-overlay-title');
    this.overlayDesc = this.container.querySelector('#mole-overlay-desc');
    this.overlayStats = this.container.querySelector('#mole-overlay-stats');
    this.btnPlay = this.container.querySelector('#mole-btn-play');
    this.btnPause = this.container.querySelector('#mole-btn-pause');
    this.btnRestart = this.container.querySelector('#mole-btn-restart');

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

    window.addEventListener('keydown', this.keyHandler);

    this.buildGrid();
  }

  /** P / Esc pause and resume, matching every other pausable game. */
  handleKeyDown(e) {
    if (e.key !== 'p' && e.key !== 'P' && e.key !== 'Escape') return;
    if (e.repeat) return;
    if (this.state === 'PLAYING') this.pause();
    else if (this.state === 'PAUSED') this.resume();
  }

  buildGrid() {
    this.boardEl.innerHTML = '';
    this.holes = [];

    for (let i = 0; i < 9; i++) {
      const hole = document.createElement('div');
      hole.className = 'mole-hole';
      hole.innerHTML = `
        <div class="mole-chamber">
          <div class="mole-creature" data-hole="${i}">
            <div class="mole-sprite">🐹</div>
          </div>
        </div>
        <div class="mole-rim"></div>
      `;

      const creature = hole.querySelector('.mole-creature');
      creature.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.whack(i);
      }, { passive: false });
      creature.addEventListener('mousedown', () => this.whack(i));

      this.boardEl.appendChild(hole);
      this.holes.push(hole);
    }
  }

  start() {
    this.clearAllMoles();
    clearInterval(this.timerInterval);
    clearInterval(this.spawnInterval);

    this.timer = 30;
    this.score = 0;
    this.whacks = 0;
    this.hits = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.bombsHit = 0;

    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.updateHUD();

    // Timer countdown
    this.timerInterval = setInterval(() => {
      if (this.state !== 'PLAYING') return;

      this.timer--;
      if (this.timer <= 5) {
        this.sound?.playHit(600);
      }
      this.updateHUD();

      if (this.timer <= 0) {
        this.gameOver();
      }
    }, 1000);

    // Spawner loop
    this.scheduleNextSpawn();
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.overlayTitle.textContent = 'PAUSED';
    this.overlayDesc.textContent = 'Mallets down. Press RESUME or P to jump back into the cyber vault.';
    this.overlayStats.classList.add('hidden');
    this.btnPlay.innerHTML = '<span>▶️</span> RESUME';
    this.overlay.classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');
    this.scheduleNextSpawn();
  }

  restart() {
    this.start();
  }

  scheduleNextSpawn() {
    clearTimeout(this.spawnTimeout); // keep exactly one spawn chain alive across pause/resume
    if (this.state !== 'PLAYING') return;
    const delay = 450 + Math.random() * 450;
    this.spawnTimeout = setTimeout(() => {
      this.popMole();
      this.scheduleNextSpawn();
    }, delay);
  }

  popMole() {
    if (this.state !== 'PLAYING') return;

    // Pick random available hole
    const available = [];
    for (let i = 0; i < 9; i++) {
      if (!this.activeMoles[i]) available.push(i);
    }
    if (available.length === 0) return;

    const idx = available[Math.floor(Math.random() * available.length)];
    const roll = Math.random();

    let type = 'mole';
    let symbol = '🐹';
    let duration = 900 + Math.random() * 400;

    if (roll < 0.22) {
      type = 'gold';
      symbol = '⭐';
      duration = 750; // faster
    } else if (roll < 0.42) {
      type = 'bomb';
      symbol = '💣';
      duration = 1100;
    }

    const creature = this.holes[idx]?.querySelector('.mole-creature');
    if (!creature) return;
    const sprite = creature.querySelector?.('.mole-sprite');
    if (sprite) sprite.textContent = symbol;

    creature.className = `mole-creature active type-${type}`;

    const timeout = setTimeout(() => {
      this.hideMole(idx);
    }, duration);

    this.activeMoles[idx] = { type, timeout };
  }

  hideMole(idx) {
    if (!this.activeMoles[idx]) return;
    clearTimeout(this.activeMoles[idx].timeout);
    this.activeMoles[idx] = null;

    const creature = this.holes[idx].querySelector('.mole-creature');
    creature.classList.remove('active', 'whacked', 'type-mole', 'type-gold', 'type-bomb');
  }

  clearAllMoles() {
    for (let i = 0; i < 9; i++) {
      this.hideMole(i);
    }
    clearTimeout(this.spawnTimeout);
  }

  whack(idx) {
    if (this.state !== 'PLAYING') return;
    const mole = this.activeMoles[idx];
    if (!mole) return;

    this.whacks++;
    const creature = this.holes[idx].querySelector('.mole-creature');
    creature.classList.add('whacked');

    if (mole.type === 'bomb') {
      // Hit bomb
      this.bombsHit++;
      this.combo = 0;
      this.score = Math.max(0, this.score - 15);
      this.sound?.playBombExplosion();

      // Shake hole
      this.holes[idx].classList.add('shake');
      setTimeout(() => this.holes[idx].classList.remove('shake'), 400);
    } else {
      // Hit mole
      this.hits++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const pts = mole.type === 'gold' ? 30 : 10;
      const multiplier = this.combo >= 4 ? 2 : (this.combo >= 2 ? 1.5 : 1);
      const earned = Math.floor(pts * multiplier);

      this.score += earned;

      if (mole.type === 'gold') {
        this.sound?.playPowerup();
      } else {
        this.sound?.playHit(480 + this.combo * 20);
      }
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.storageKey, this.highScore.toString());
    }

    this.updateHUD();
    setTimeout(() => this.hideMole(idx), 200);
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.clearAllMoles();
    clearInterval(this.timerInterval);
    this.sound?.playGameOver();

    const accuracy = this.whacks > 0 ? Math.round((this.hits / this.whacks) * 100) : 0;

    this.overlayTitle.textContent = "TIME'S UP!";
    this.overlayDesc.textContent = 'All cyber moles have burrowed away. Outstanding reflex performance!';
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">FINAL SCORE</span><span class="num">${this.score}</span></div>
      <div class="stat-box"><span class="lbl">MAX COMBO</span><span class="num">${this.maxCombo}x</span></div>
      <div class="stat-box"><span class="lbl">ACCURACY</span><span class="num">${accuracy}%</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.highScore}</span></div>
    `;
    this.overlayStats.classList.remove('hidden');
    this.btnPlay.innerHTML = '<span>🔄</span> WHACK AGAIN';
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.timeEl) this.timeEl.textContent = `${this.timer}s`;
    if (this.comboEl) this.comboEl.textContent = `${this.combo}x`;
    if (this.bestEl) this.bestEl.textContent = this.highScore;
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler);
    this.clearAllMoles();
    clearInterval(this.timerInterval);
    clearInterval(this.spawnInterval);
    this.state = 'PAUSED';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WhackAMoleGame };
}
