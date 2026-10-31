/**
 * Fruit Slice Arcade - Main Game Engine
 */

class FruitArcadeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.wrapper = document.getElementById('canvas-wrapper');
    this.container = document.getElementById('game-container');

    // Subsystems
    this.sound = new SoundManager();
    this.bladeTrail = new BladeTrail('#00d2d3');

    // Game state
    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('fruit_arcade_high_score') || '0', 10);
    this.timer = 60;
    this.timerInterval = null;
    this.bombsEnabled = true;

    // Entities & Pools
    this.fruits = [];
    this.fruitHalves = [];
    this.particles = [];
    this.floatingTexts = [];

    // Interaction tracking
    this.isMouseDown = false;
    this.lastPointer = null;
    this.activePointerId = null;

    // Combo tracking
    this.currentSwipeCombo = 0;
    this.maxComboAchieved = 0;
    this.totalFruitsSliced = 0;
    this.bombsHit = 0;
    this.comboResetTimeout = null;

    // Spawning engine
    this.lastSpawnTime = 0;
    this.spawnInterval = 2100; // ms
    this.difficultyLevel = 1;

    // Animation frame
    this.lastFrameTime = performance.now();
    this.animationFrameId = null;

    // Cache UI elements
    this.initDOMElements();
    this.initSettings();
    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Update initial UI
    this.updateHUD();
    this.updateHighScoreDisplay();

    // Start background render loop (for menu animations/preview)
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  initDOMElements() {
    // HUD
    this.scoreEl = document.getElementById('current-score');
    this.timerEl = document.getElementById('time-left');
    this.timerPill = document.getElementById('timer-pill');
    this.bestScoreHud = document.getElementById('hud-best-score');
    this.btnBombToggle = document.getElementById('btn-bomb-toggle');
    this.btnSound = document.getElementById('btn-sound');
    this.btnPause = document.getElementById('btn-pause');
    this.comboBanner = document.getElementById('combo-banner');

    // Overlays
    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.instructionsModal = document.getElementById('instructions-modal');

    // Buttons
    this.btnPlay = document.getElementById('btn-play');
    this.btnHowToPlay = document.getElementById('btn-how-to-play');
    this.btnCloseInstructions = document.getElementById('btn-close-instructions');
    this.btnResume = document.getElementById('btn-resume');
    this.btnRestartPause = document.getElementById('btn-restart-pause');
    this.btnMenuPause = document.getElementById('btn-menu-pause');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnMenuGameOver = document.getElementById('btn-menu-game-over');

    // Settings
    this.toggleBombsOption = document.getElementById('toggle-bombs-option');
    this.bladeDots = document.querySelectorAll('.blade-dot');

    // Game Over stats
    this.finalScoreEl = document.getElementById('final-score-val');
    this.statSlicedEl = document.getElementById('stat-sliced-val');
    this.statMaxComboEl = document.getElementById('stat-combo-val');
    this.statBombsEl = document.getElementById('stat-bombs-val');
    this.newRecordRibbon = document.getElementById('new-record-ribbon');
    this.startHighScoreVal = document.getElementById('start-high-score-val');
  }

  initSettings() {
    // Sound setting
    this.updateSoundButtonUI();

    // Bomb setting
    const savedBombs = localStorage.getItem('fruit_arcade_bombs_enabled');
    if (savedBombs !== null) {
      this.bombsEnabled = savedBombs === 'true';
    }
    this.updateBombToggleUI();

    // Blade color setting
    const savedBlade = localStorage.getItem('fruit_arcade_blade_color') || '#00d2d3';
    this.setBladeColor(savedBlade);
  }

  updateSoundButtonUI() {
    if (this.btnSound) {
      this.btnSound.textContent = this.sound.enabled ? '🔊' : '🔇';
      this.btnSound.setAttribute('aria-label', this.sound.enabled ? 'Mute Sound' : 'Unmute Sound');
    }
  }

  updateBombToggleUI() {
    if (this.toggleBombsOption) {
      if (this.bombsEnabled) {
        this.toggleBombsOption.classList.add('checked');
      } else {
        this.toggleBombsOption.classList.remove('checked');
      }
    }
    if (this.btnBombToggle) {
      if (this.bombsEnabled) {
        this.btnBombToggle.classList.add('active');
        this.btnBombToggle.textContent = '💣';
        this.btnBombToggle.title = 'Bombs: ON (Click to disable)';
      } else {
        this.btnBombToggle.classList.remove('active');
        this.btnBombToggle.textContent = '🛡️';
        this.btnBombToggle.title = 'Bombs: OFF / Zen Mode (Click to enable)';
      }
    }
  }

  setBladeColor(color) {
    this.bladeTrail.setColor(color);
    localStorage.setItem('fruit_arcade_blade_color', color);
    this.bladeDots.forEach(dot => {
      if (dot.getAttribute('data-color') === color) {
        dot.classList.add('selected');
      } else {
        dot.classList.remove('selected');
      }
    });
  }

  resizeCanvas() {
    if (!this.wrapper || !this.canvas) return;
    const rect = this.wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = (rect.width && rect.width > 0) ? rect.width : (this.container?.clientWidth || 800);
    const h = (rect.height && rect.height > 0) ? rect.height : (this.container?.clientHeight || 520);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.width = w;
    this.height = h;
  }

  setupEventListeners() {
    // Buttons
    this.btnPlay.addEventListener('click', () => {
      this.sound.playClick();
      this.startGame();
    });

    this.btnHowToPlay.addEventListener('click', () => {
      this.sound.playClick();
      this.showModal(this.instructionsModal);
    });

    this.btnCloseInstructions.addEventListener('click', () => {
      this.sound.playClick();
      this.hideModal(this.instructionsModal);
    });

    this.btnSound.addEventListener('click', () => {
      this.sound.toggle();
      this.updateSoundButtonUI();
    });

    if (this.btnBombToggle) {
      this.btnBombToggle.addEventListener('click', () => {
        this.bombsEnabled = !this.bombsEnabled;
        localStorage.setItem('fruit_arcade_bombs_enabled', this.bombsEnabled.toString());
        this.updateBombToggleUI();
        this.sound.playClick();
        const msg = this.bombsEnabled ? 'Bombs Enabled 💣' : 'Zen Mode (No Bombs) 🛡️';
        this.floatingTexts.push(new FloatingScoreText(msg, this.width / 2, 70, '#00d2d3', false));
      });
    }

    this.btnPause.addEventListener('click', () => {
      if (this.state === 'PLAYING') {
        this.pauseGame();
      }
    });

    this.btnResume.addEventListener('click', () => {
      this.sound.playClick();
      this.resumeGame();
    });

    this.btnRestartPause.addEventListener('click', () => {
      this.sound.playClick();
      this.hideModal(this.pauseOverlay);
      this.startGame();
    });

    this.btnMenuPause.addEventListener('click', () => {
      this.sound.playClick();
      this.returnToMenu();
    });

    this.btnPlayAgain.addEventListener('click', () => {
      this.sound.playClick();
      this.startGame();
    });

    this.btnMenuGameOver.addEventListener('click', () => {
      this.sound.playClick();
      this.returnToMenu();
    });

    // Bomb toggle option
    if (this.toggleBombsOption) {
      this.toggleBombsOption.addEventListener('click', () => {
        this.bombsEnabled = !this.bombsEnabled;
        localStorage.setItem('fruit_arcade_bombs_enabled', this.bombsEnabled.toString());
        this.updateBombToggleUI();
        this.sound.playClick();
      });
    }

    // Blade color picker
    this.bladeDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.getAttribute('data-color');
        this.setBladeColor(color);
        this.sound.playClick();
      });
    });

    // Keyboard shortcuts: Space / Escape to pause
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
      }
    });

    // MOUSE & TOUCH Slicing Controls with STRICT touch prevention ONLY on canvas
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        this.handlePointerMove(e.clientX, e.clientY);
      }
    });
    window.addEventListener('mouseup', () => this.handlePointerUp());

    // Touch events on canvas
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault(); // prevent scrolling only while interacting with canvas
        const t = e.touches[0];
        this.activePointerId = t.identifier;
        this.handlePointerDown(t.clientX, t.clientY);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); // prevent scrolling while swiping
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === this.activePointerId || this.activePointerId === null) {
          this.handlePointerMove(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handlePointerUp();
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', () => {
      this.handlePointerUp();
    });
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  handlePointerDown(clientX, clientY) {
    this.isMouseDown = true;
    const coords = this.getCanvasCoords(clientX, clientY);
    this.lastPointer = coords;
    this.bladeTrail.clear();
    this.bladeTrail.addPoint(coords.x, coords.y);
    this.currentSwipeCombo = 0;
  }

  handlePointerMove(clientX, clientY) {
    const coords = this.getCanvasCoords(clientX, clientY);
    if (!this.lastPointer) {
      this.lastPointer = coords;
      this.bladeTrail.addPoint(coords.x, coords.y);
      return;
    }

    const dist = Math.hypot(coords.x - this.lastPointer.x, coords.y - this.lastPointer.y);
    if (dist > 3) {
      this.bladeTrail.addPoint(coords.x, coords.y);

      // Play blade whoosh sound on swift swipes
      if (dist > 25 && Math.random() < 0.3) {
        this.sound.playSwoosh();
      }

      // Check slicing if game is playing
      if (this.state === 'PLAYING') {
        this.checkSliceCollisions(this.lastPointer, coords);
      }

      this.lastPointer = coords;
    }
  }

  handlePointerUp() {
    this.isMouseDown = false;
    this.lastPointer = null;
    this.activePointerId = null;

    // Check combo end on swipe release
    clearTimeout(this.comboResetTimeout);
    this.finishCombo();
  }

  finishCombo() {
    if (this.currentSwipeCombo >= 2) {
      let comboBonus = 0;
      let comboText = '';

      if (this.currentSwipeCombo === 2) {
        comboBonus = 2;
        comboText = '2x COMBO! +2';
      } else if (this.currentSwipeCombo === 3) {
        comboBonus = 5;
        comboText = '3x TRIPLE! +5';
      } else if (this.currentSwipeCombo === 4) {
        comboBonus = 10;
        comboText = '4x MEGA COMBO! +10';
      } else {
        comboBonus = 15 + (this.currentSwipeCombo - 5) * 5;
        comboText = `${this.currentSwipeCombo}x UNSTOPPABLE! +${comboBonus}`;
      }

      this.score += comboBonus;
      this.updateHUD();

      // Show banner and play fanfare
      this.showComboBanner(comboText);
      this.sound.playCombo(this.currentSwipeCombo);

      // Record max combo
      if (this.currentSwipeCombo > this.maxComboAchieved) {
        this.maxComboAchieved = this.currentSwipeCombo;
      }
    }

    this.currentSwipeCombo = 0;
  }

  showComboBanner(text) {
    if (!this.comboBanner) return;
    this.comboBanner.textContent = text;
    this.comboBanner.classList.add('show');
    clearTimeout(this.comboTimeout);
    this.comboTimeout = setTimeout(() => {
      this.comboBanner.classList.remove('show');
    }, 1100);
  }

  /**
   * Precise line-segment intersection with fruit circle
   */
  checkSliceCollisions(p1, p2) {
    const cutAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      if (!fruit.active || fruit.isSliced) continue;

      if (this.lineIntersectsCircle(p1, p2, fruit.x, fruit.y, fruit.radius)) {
        this.sliceFruit(fruit, i, cutAngle);
      }
    }
  }

  lineIntersectsCircle(p1, p2, cx, cy, r) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.hypot(cx - p1.x, cy - p1.y) <= r;
    }

    // Project circle center onto segment
    const t = Math.max(0, Math.min(1, ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq));
    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;

    const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
    return distSq <= r * r;
  }

  sliceFruit(fruit, index, cutAngle) {
    fruit.isSliced = true;
    fruit.active = false;

    if (fruit.isBomb) {
      this.triggerBombExplosion(fruit);
      return;
    }

    // Fruit score & combo progression
    this.score += fruit.type.points;
    this.totalFruitsSliced++;
    this.currentSwipeCombo++;
    this.updateHUD();

    // Auto-resolve combo window after rapid consecutive slices
    clearTimeout(this.comboResetTimeout);
    this.comboResetTimeout = setTimeout(() => {
      this.finishCombo();
    }, 420);

    // Sound effect
    this.sound.playSplat(fruit.type.id);

    // Floating score indicator
    const popupText = `+${fruit.type.points}`;
    this.floatingTexts.push(new FloatingScoreText(popupText, fruit.x, fruit.y - 10, fruit.type.color));

    // Spawn 2 split fruit halves
    this.fruitHalves.push(new FruitHalf(fruit, -1, cutAngle, 4.5));
    this.fruitHalves.push(new FruitHalf(fruit, 1, cutAngle, 4.5));

    // Spawn 15-22 juice splash particles
    const particleCount = 18;
    for (let k = 0; k < particleCount; k++) {
      this.particles.push(new JuiceParticle(fruit.x, fruit.y, fruit.type.color));
    }
  }

  triggerBombExplosion(bomb) {
    this.bombsHit++;
    this.sound.stopBombFuse();
    this.sound.playBombExplosion();

    // Score and time penalty
    const scorePenalty = 10;
    const timePenalty = 5;

    this.score = Math.max(0, this.score - scorePenalty);
    this.timer = Math.max(0, this.timer - timePenalty);
    this.updateHUD();

    // Floating penalty alert
    this.floatingTexts.push(
      new FloatingScoreText(`-${scorePenalty} PTS! -${timePenalty}s!`, bomb.x, bomb.y, '#ff4757', true)
    );

    // Screen shake & damage flash
    this.container.classList.remove('shake', 'damage-flash');
    void this.container.offsetWidth; // retrigger reflow
    this.container.classList.add('shake', 'damage-flash');
    setTimeout(() => {
      this.container.classList.remove('shake', 'damage-flash');
    }, 450);

    // Massive explosion particles
    for (let i = 0; i < 40; i++) {
      this.particles.push(new BombSparkParticle(bomb.x, bomb.y, true));
    }

    // Check if time reached zero immediately
    if (this.timer <= 0) {
      this.endGame();
    }
  }

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.timer = 60;
    this.totalFruitsSliced = 0;
    this.maxComboAchieved = 0;
    this.bombsHit = 0;
    this.fruits = [];
    this.fruitHalves = [];
    this.particles = [];
    this.floatingTexts = [];
    this.difficultyLevel = 1;

    // Reset UI
    this.hideAllOverlays();
    this.updateHUD();
    this.timerPill.classList.remove('urgent');

    // Start timer countdown
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state !== 'PLAYING') return;

      this.timer--;
      this.updateHUD();

      // Urgent timer alert when <= 10s
      if (this.timer <= 10) {
        this.timerPill.classList.add('urgent');
        this.sound.playCountTick();
      }

      // Check game over
      if (this.timer <= 0) {
        clearInterval(this.timerInterval);
        this.endGame();
      }
    }, 1000);
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.sound.stopBombFuse();
    this.showModal(this.pauseOverlay);
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.hideModal(this.pauseOverlay);
    this.lastFrameTime = performance.now();
  }

  returnToMenu() {
    this.state = 'START';
    clearInterval(this.timerInterval);
    this.sound.stopBombFuse();
    this.hideAllOverlays();
    this.showModal(this.startOverlay);
    this.updateHighScoreDisplay();
  }

  endGame() {
    this.state = 'GAMEOVER';
    clearInterval(this.timerInterval);
    this.sound.stopBombFuse();
    this.sound.playGameOver();

    // Check high score
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      localStorage.setItem('fruit_arcade_high_score', this.highScore.toString());
      this.sound.playRecordFanfare();
    }

    // Populate Game Over screen stats
    this.finalScoreEl.textContent = this.score;
    this.statSlicedEl.textContent = this.totalFruitsSliced;
    this.statMaxComboEl.textContent = this.maxComboAchieved > 1 ? `${this.maxComboAchieved}x` : 'None';
    this.statBombsEl.textContent = this.bombsHit;

    if (isNewRecord && this.score > 0) {
      this.newRecordRibbon.classList.add('visible');
    } else {
      this.newRecordRibbon.classList.remove('visible');
    }

    this.showModal(this.gameOverOverlay);
    this.updateHighScoreDisplay();
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.timerEl) this.timerEl.textContent = `${this.timer}s`;
    if (this.bestScoreHud) this.bestScoreHud.textContent = this.highScore;
  }

  updateHighScoreDisplay() {
    if (this.startHighScoreVal) {
      this.startHighScoreVal.textContent = this.highScore;
    }
  }

  showModal(el) {
    if (el) el.classList.remove('hidden');
  }

  hideModal(el) {
    if (el) el.classList.add('hidden');
  }

  hideAllOverlays() {
    [this.startOverlay, this.pauseOverlay, this.gameOverOverlay, this.instructionsModal].forEach(ov => {
      if (ov) ov.classList.add('hidden');
    });
  }

  /**
   * Spawner Engine: generates random bursts of fruit tossed upwards
   */
  updateSpawner(now) {
    if (this.state !== 'PLAYING') return;

    // Difficulty scales slightly as remaining time counts down
    const timeElapsed = 60 - this.timer;
    const interval = Math.max(1200, this.spawnInterval - timeElapsed * 15);

    if (now - this.lastSpawnTime >= interval) {
      this.lastSpawnTime = now;
      this.spawnFruitWave();
    }
  }

  spawnFruitWave() {
    // 1 to 3 fruits per wave, occasionally 4
    let waveCount = 1;
    const roll = Math.random();
    if (roll > 0.8) waveCount = 3;
    else if (roll > 0.45) waveCount = 2;

    const fruitKeys = ['WATERMELON', 'ORANGE', 'STRAWBERRY', 'APPLE', 'BANANA', 'PINEAPPLE'];

    // Optional bomb spawn if enabled and not initial 5 seconds
    const canSpawnBomb = this.bombsEnabled && (60 - this.timer > 4);
    const bombSpawnRoll = Math.random() < 0.28;

    let hasBombInWave = false;

    for (let i = 0; i < waveCount; i++) {
      let typeKey;
      if (canSpawnBomb && bombSpawnRoll && !hasBombInWave && i === 0) {
        typeKey = 'BOMB';
        hasBombInWave = true;
      } else {
        typeKey = fruitKeys[Math.floor(Math.random() * fruitKeys.length)];
      }

      // Launch position along bottom edge with margins
      const margin = 100;
      const startX = margin + Math.random() * (this.width - margin * 2);
      const startY = this.height + 40;

      // Upward velocity calculated to reach top 25-45% of screen
      const targetHeight = this.height * (0.2 + Math.random() * 0.28);
      const gravity = 0.38;
      const vy = -Math.sqrt(2 * gravity * (startY - targetHeight));

      // Horizontal velocity toward center
      const centerX = this.width / 2;
      const vx = ((centerX - startX) / (this.width / 2)) * (1.5 + Math.random() * 2.5);

      const fruit = new Fruit(typeKey, startX, startY, vx, vy, gravity);
      this.fruits.push(fruit);

      if (typeKey === 'BOMB') {
        this.sound.startBombFuse();
      }
    }
  }

  /**
   * Main game physics, state update & canvas render loop
   */
  loop(currentTime) {
    const deltaTime = Math.min(2.5, (currentTime - this.lastFrameTime) / 16.666);
    this.lastFrameTime = currentTime;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Update spawner
    this.updateSpawner(currentTime);

    // Update & Render Whole Fruits
    let anyBombAlive = false;
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      if (this.state === 'PLAYING') {
        fruit.update(deltaTime);
      }
      fruit.render(this.ctx);

      if (fruit.isBomb && fruit.active) {
        anyBombAlive = true;
        // Emit fuse spark particles
        if (Math.random() < 0.45) {
          this.particles.push(new BombSparkParticle(fruit.x + 16, fruit.y - fruit.radius - 24, false));
        }
      }

      // Remove fruits falling below canvas
      if (fruit.y > this.height + 90 && fruit.vy > 0) {
        this.fruits.splice(i, 1);
      }
    }

    if (!anyBombAlive) {
      this.sound.stopBombFuse();
    }

    // Update & Render Split Fruit Halves
    for (let i = this.fruitHalves.length - 1; i >= 0; i--) {
      const half = this.fruitHalves[i];
      if (this.state === 'PLAYING' || this.state === 'GAMEOVER') {
        half.update(deltaTime);
      }
      half.render(this.ctx);

      if (half.y > this.height + 90) {
        this.fruitHalves.splice(i, 1);
      }
    }

    // Update & Render Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (this.state === 'PLAYING' || this.state === 'GAMEOVER') {
        p.update(deltaTime);
      }
      p.render(this.ctx);

      if (!p.active) {
        this.particles.splice(i, 1);
      }
    }

    // Update & Render Floating Score Text Popups
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const text = this.floatingTexts[i];
      if (this.state === 'PLAYING') {
        text.update(deltaTime);
      }
      text.render(this.ctx);

      if (!text.active) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update & Render Blade Trail
    this.bladeTrail.update();
    this.bladeTrail.render(this.ctx);

    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.comboResetTimeout) {
      clearTimeout(this.comboResetTimeout);
      this.comboResetTimeout = null;
    }
    if (this.sound) {
      this.sound.stopBombFuse();
    }
    this.state = 'PAUSED';
  }
}

// Bootstrap on window load if fruit-slice view is active or stand-alone
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('gameCanvas') && (!window.ArcadePortal || window.location.hash.includes('fruit-slice'))) {
    window.gameInstance = new FruitArcadeGame();
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FruitArcadeGame };
}
