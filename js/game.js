/**
 * Fruit Slice Arcade - Main Game Engine (Premium edition)
 *
 * Depends on (unchanged integration points):
 *   - js/fruit.js   -> FRUIT_TYPES, Fruit, FruitHalf, particles, BladeTrail, ArcadeBackground
 *   - SoundManager  -> existing sound module (enabled, toggle, playClick, playSwoosh,
 *                      playSplat, playCombo, playBombExplosion, startBombFuse,
 *                      stopBombFuse, playCountTick, playGameOver, playRecordFanfare)
 */

/**
 * Self-contained procedural background music + UI beeps (Web Audio, no assets).
 * Follows the mute state of the SoundManager.
 */
class MusicEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.noiseBuf = null;
    this.enabled = true;
    this.playing = false;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.intensity = 0; // 0..5, raised as the game gets harder
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.master.gain.value = 0;
      this.sfxGain.gain.value = this.enabled ? 0.5 : 0;
      this.master.connect(comp);
      this.sfxGain.connect(comp);
      comp.connect(this.ctx.destination);

      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) {
      this.ctx = null;
      return false;
    }
  }

  unlock() {
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEnabled(v) {
    this.enabled = !!v;
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.enabled ? 0.5 : 0, this.ctx.currentTime, 0.05);
    this.applyVolume();
  }

  applyVolume() {
    if (!this.master) return;
    const target = this.enabled && this.playing ? 0.2 : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
  }

  start(reset = true) {
    if (!this.ensure()) return;
    this.unlock();
    if (this.playing) return;
    if (reset) this.step = 0;
    this.playing = true;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.applyVolume();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 40);
  }

  pause() {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    this.applyVolume();
  }

  resume() {
    this.start(false);
  }

  stop() {
    this.pause();
    this.intensity = 0;
  }

  destroy() {
    this.stop();
    try {
      if (this.ctx) this.ctx.close();
    } catch (e) { /* ignore */ }
    this.ctx = null;
  }

  schedule() {
    if (!this.ctx || !this.playing) return;
    const stepDur = 60 / (116 + this.intensity * 6) / 4;
    while (this.nextTime < this.ctx.currentTime + 0.18) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  playStep(step, t, stepDur) {
    const CHORDS = [
      { root: 110, notes: [220, 261.63, 329.63] },      // Am
      { root: 87.31, notes: [174.61, 220, 261.63] },    // F
      { root: 130.81, notes: [261.63, 329.63, 392] },   // C
      { root: 98, notes: [196, 246.94, 293.66] }        // G
    ];
    const ARP = [0, 1, 2, 1, 2, 1, 0, 1];
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const chord = CHORDS[bar];

    if (s % 4 === 0) this.kick(t);
    if (s === 4 || s === 12) this.noise(t, 0.12, 0.22, 1800, 'bandpass');
    if (s % 2 === 1) this.noise(t, 0.04, this.intensity >= 1 ? 0.1 : 0.06, 7000, 'highpass');

    if (s % 2 === 0) {
      const f = s % 8 === 2 || s % 8 === 6 ? chord.root * 2 : chord.root;
      this.tone(f, t, stepDur * 1.8, 'triangle', 0.4);
    }

    const note = chord.notes[ARP[s % 8]] * (s % 8 >= 4 ? 2 : 1);
    this.tone(note, t, stepDur * 0.9, 'square', 0.05);

    if (this.intensity >= 1 && (s === 0 || s === 3 || s === 6 || s === 10 || s === 12)) {
      this.tone(chord.notes[(bar + s) % 3] * 2, t, stepDur * 1.6, 'sawtooth', 0.04);
    }
    if (this.intensity >= 3 && s % 4 === 2) {
      this.noise(t, 0.05, 0.12, 9000, 'highpass');
    }
  }

  tone(freq, t, dur, type, vol, dest) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
    o.connect(g);
    g.connect(dest || this.master);
    o.start(t);
    o.stop(t + Math.max(0.05, dur) + 0.03);
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  }

  noise(t, dur, vol, freq, type) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Countdown beep (final = higher "GO" pitch) */
  beep(final = false) {
    if (!this.enabled || !this.ensure()) return;
    this.unlock();
    const t = this.ctx.currentTime;
    this.tone(final ? 880 : 440, t, final ? 0.35 : 0.14, 'square', 0.22, this.sfxGain);
    if (final) this.tone(1320, t + 0.06, 0.3, 'triangle', 0.16, this.sfxGain);
  }

  /** Level-up rising arpeggio */
  levelUp() {
    if (!this.enabled || !this.ensure()) return;
    this.unlock();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, t + i * 0.07, 0.18, 'square', 0.16, this.sfxGain);
    });
  }

  /** Golden fruit chime */
  chime() {
    if (!this.enabled || !this.ensure()) return;
    this.unlock();
    const t = this.ctx.currentTime;
    [1318.5, 1760, 2093].forEach((f, i) => {
      this.tone(f, t + i * 0.05, 0.4, 'sine', 0.18, this.sfxGain);
    });
  }
}

class FruitArcadeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.wrapper = document.getElementById('canvas-wrapper');
    this.container = document.getElementById('game-container');

    // Listener registry so destroy() can fully clean up
    this._listeners = [];
    this._destroyed = false;

    // Subsystems
    this.sound = (typeof SoundManager !== 'undefined')
      ? new SoundManager()
      : { enabled: true, toggle() { this.enabled = !this.enabled; } };
    this.music = new MusicEngine();
    this.music.enabled = !!this.sound.enabled;
    this.bladeTrail = new BladeTrail('#00d2d3');
    this.bg = new ArcadeBackground();

    // Game state
    this.state = 'START'; // 'START' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.score = 0;
    this.highScore = parseInt(this.readStore('fruit_arcade_high_score') || '0', 10) || 0;
    this.maxTime = 60;
    this.timer = this.maxTime;
    this.timerInterval = null;
    this.bombsEnabled = true;
    this.maxLives = 3;
    this.lives = this.maxLives;

    // Entities & Pools
    this.fruits = [];
    this.fruitHalves = [];
    this.particles = [];
    this.floatingTexts = [];
    this.splats = [];
    this.effects = []; // shock rings & slice flashes

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
    this.lastSlicePos = { x: 0, y: 0 };

    // Spawning engine (clock = accumulated play time in ms, freezes on pause)
    this.playTime = 0;
    this.nextWaveAt = 0;
    this.spawnQueue = [];
    this.announcedLevel = 1;
    this.fuseOn = false;
    this.nextAttractAt = 0;

    // Feel
    this.timeScale = 1;
    this.slowScale = 1;
    this.slowUntil = 0;

    // Countdown & timers
    this.countdown = null;
    this.goFlashUntil = 0;
    this.gameOverTimeout = null;
    this.comboTimeout = null;

    // Animation frame
    this.lastFrameTime = performance.now();
    this.animationFrameId = null;
    this._loggedError = false;

    // Cache UI elements
    this.initDOMElements();
    this.buildExtraUI();
    this.initSettings();
    this.setupEventListeners();
    this.resizeCanvas();
    this.listen(window, 'resize', () => this.resizeCanvas());
    this.listen(window, 'orientationchange', () => setTimeout(() => this.resizeCanvas(), 250));
    if (typeof ResizeObserver !== 'undefined' && this.wrapper) {
      this._resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this._resizeObserver.observe(this.wrapper);
    }

    // Update initial UI
    this.updateHUD();
    this.updateLivesUI();
    this.updateHighScoreDisplay();

    // Start background render loop (menu animation / attract mode)
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  listen(target, type, handler, options) {
    if (!target) return;
    target.addEventListener(type, handler, options);
    this._listeners.push({ target, type, handler, options });
  }

  readStore(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  writeStore(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  /** Safe call into the shared SoundManager (never breaks gameplay) */
  sfx(name, ...args) {
    try {
      const fn = this.sound && this.sound[name];
      if (typeof fn === 'function') return fn.apply(this.sound, args);
    } catch (e) { /* ignore */ }
    return undefined;
  }

  get level() {
    return Math.min(6, 1 + Math.floor(this.playTime / 12000));
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

  /**
   * Adds the lives display, time bar and rank badge from JS so the existing
   * HTML does not need to change. Re-uses elements if they already exist.
   */
  buildExtraUI() {
    // Lives pill (next to the timer)
    this.livesPill = document.getElementById('fs-lives-pill');
    if (!this.livesPill) {
      const pill = document.createElement('div');
      pill.id = 'fs-lives-pill';
      pill.className = 'hud-pill fs-lives-pill';
      pill.setAttribute('role', 'img');
      pill.setAttribute('aria-label', 'Lives remaining');
      for (let i = 0; i < this.maxLives; i++) {
        const h = document.createElement('span');
        h.className = 'fs-heart';
        h.textContent = '❤️';
        pill.appendChild(h);
      }
      if (this.timerPill && this.timerPill.parentElement) {
        this.timerPill.insertAdjacentElement('afterend', pill);
      } else {
        const hud = document.getElementById('hud');
        if (hud) hud.appendChild(pill);
      }
      this.livesPill = pill;
    }

    // Time bar along the bottom
    this.timeBarFill = document.getElementById('fs-time-bar-fill');
    if (!this.timeBarFill && this.container) {
      const bar = document.createElement('div');
      bar.id = 'fs-time-bar';
      bar.className = 'fs-time-bar';
      const fill = document.createElement('div');
      fill.id = 'fs-time-bar-fill';
      fill.className = 'fs-time-bar-fill';
      bar.appendChild(fill);
      this.container.appendChild(bar);
      this.timeBar = bar;
      this.timeBarFill = fill;
    } else {
      this.timeBar = document.getElementById('fs-time-bar');
    }

    // Rank badge on game over
    this.rankBadge = document.getElementById('fs-rank-badge');
    if (!this.rankBadge && this.gameOverOverlay) {
      const badge = document.createElement('div');
      badge.id = 'fs-rank-badge';
      badge.className = 'fs-rank-badge';
      badge.innerHTML =
        '<span class="fs-rank-emoji" id="fs-rank-emoji">🍒</span>' +
        '<span class="fs-rank-text"><span class="fs-rank-title" id="fs-rank-title">Fruit Rookie</span>' +
        '<span class="fs-rank-sub" id="fs-rank-sub"></span></span>';
      const grid = this.gameOverOverlay.querySelector('.stats-grid');
      if (grid && grid.parentElement) {
        grid.parentElement.insertBefore(badge, grid);
      } else {
        const content = this.gameOverOverlay.querySelector('.overlay-content') || this.gameOverOverlay;
        content.appendChild(badge);
      }
      this.rankBadge = badge;
    }
  }

  initSettings() {
    this.updateSoundButtonUI();
    this.music.setEnabled(!!this.sound.enabled);

    const savedBombs = this.readStore('fruit_arcade_bombs_enabled');
    if (savedBombs !== null) {
      this.bombsEnabled = savedBombs === 'true';
    }
    this.updateBombToggleUI();

    const savedBlade = this.readStore('fruit_arcade_blade_color') || '#00d2d3';
    this.setBladeColor(savedBlade);
  }

  updateSoundButtonUI() {
    if (this.btnSound) {
      this.btnSound.textContent = this.sound.enabled ? '🔊' : '🔇';
      this.btnSound.setAttribute('aria-label', this.sound.enabled ? 'Mute Sound' : 'Unmute Sound');
      this.btnSound.title = this.sound.enabled ? 'Mute (M)' : 'Unmute (M)';
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
    this.writeStore('fruit_arcade_blade_color', color);
    this.bladeDots.forEach(dot => {
      if (dot.getAttribute('data-color') === color) {
        dot.classList.add('selected');
      } else {
        dot.classList.remove('selected');
      }
    });
  }

  toggleSound() {
    this.sound.toggle();
    this.updateSoundButtonUI();
    this.music.setEnabled(!!this.sound.enabled);
    if (this.sound.enabled) this.music.unlock();
  }

  resizeCanvas() {
    if (this._destroyed || !this.wrapper || !this.canvas) return;
    const rect = this.wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = (rect.width && rect.width > 0) ? rect.width : (this.container?.clientWidth || 800);
    const h = (rect.height && rect.height > 0) ? rect.height : (this.container?.clientHeight || 520);
    if (this.width === w && this.height === h && this._dpr === dpr) return;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.width = w;
    this.height = h;
    this._dpr = dpr;
    this.bg.resize(w, h, dpr);
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
  /* ------------------------------------------------------------------ */

  setupEventListeners() {
    // Buttons
    this.listen(this.btnPlay, 'click', () => {
      this.music.unlock();
      this.sfx('playClick');
      this.startGame();
    });

    this.listen(this.btnHowToPlay, 'click', () => {
      this.sfx('playClick');
      this.showModal(this.instructionsModal);
    });

    this.listen(this.btnCloseInstructions, 'click', () => {
      this.sfx('playClick');
      this.hideModal(this.instructionsModal);
    });

    this.listen(this.btnSound, 'click', () => this.toggleSound());

    this.listen(this.btnBombToggle, 'click', () => {
      this.bombsEnabled = !this.bombsEnabled;
      this.writeStore('fruit_arcade_bombs_enabled', this.bombsEnabled.toString());
      this.updateBombToggleUI();
      this.sfx('playClick');
      const msg = this.bombsEnabled ? 'Bombs Enabled 💣' : 'Zen Mode (No Bombs) 🛡️';
      this.floatingTexts.push(new FloatingScoreText(msg, this.width / 2, 70, '#00d2d3', false));
      if (!this.bombsEnabled) {
        // Remove live bombs immediately so Zen Mode is truly bomb-free
        this.fruits = this.fruits.filter(f => !f.isBomb);
      }
    });

    this.listen(this.btnPause, 'click', () => {
      if (this.state === 'PLAYING') {
        this.pauseGame();
      }
    });

    this.listen(this.btnResume, 'click', () => {
      this.sfx('playClick');
      this.resumeGame();
    });

    this.listen(this.btnRestartPause, 'click', () => {
      this.sfx('playClick');
      this.hideModal(this.pauseOverlay, true);
      this.startGame();
    });

    this.listen(this.btnMenuPause, 'click', () => {
      this.sfx('playClick');
      this.returnToMenu();
    });

    this.listen(this.btnPlayAgain, 'click', () => {
      this.music.unlock();
      this.sfx('playClick');
      this.startGame();
    });

    this.listen(this.btnMenuGameOver, 'click', () => {
      this.sfx('playClick');
      this.returnToMenu();
    });

    // Bomb toggle option (start menu)
    this.listen(this.toggleBombsOption, 'click', () => {
      this.bombsEnabled = !this.bombsEnabled;
      this.writeStore('fruit_arcade_bombs_enabled', this.bombsEnabled.toString());
      this.updateBombToggleUI();
      this.sfx('playClick');
    });

    // Blade color picker
    this.bladeDots.forEach(dot => {
      this.listen(dot, 'click', () => {
        const color = dot.getAttribute('data-color');
        this.setBladeColor(color);
        this.sfx('playClick');
      });
    });

    // Keyboard: Escape / P pause-resume, M mute
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (e.repeat) return; // holding the key must not flicker pause/resume
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
      } else if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) {
        if (this.container && document.body.contains(this.container)) this.toggleSound();
      }
    });

    // Auto-pause when the tab/app goes to the background
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden && this.state === 'PLAYING') this.pauseGame();
    });
    this.listen(window, 'pagehide', () => {
      if (this.state === 'PLAYING') this.pauseGame();
    });

    // MOUSE slicing
    this.listen(this.canvas, 'mousedown', (e) => this.handlePointerDown(e.clientX, e.clientY));
    this.listen(window, 'mousemove', (e) => {
      if (this.isMouseDown) {
        this.handlePointerMove(e.clientX, e.clientY);
      }
    });
    this.listen(window, 'mouseup', () => this.handlePointerUp());
    this.listen(this.canvas, 'contextmenu', (e) => e.preventDefault());

    // TOUCH slicing (scroll is blocked ONLY while touching the canvas)
    this.listen(this.canvas, 'touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        const t = e.changedTouches[0] || e.touches[0];
        this.activePointerId = t.identifier;
        this.handlePointerDown(t.clientX, t.clientY);
      }
    }, { passive: false });

    this.listen(this.canvas, 'touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === this.activePointerId || this.activePointerId === null) {
          this.handlePointerMove(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    this.listen(this.canvas, 'touchend', (e) => {
      e.preventDefault();
      this.handlePointerUp();
    }, { passive: false });

    this.listen(this.canvas, 'touchcancel', () => {
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
    this.music.unlock();
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

      if (dist > 25 && Math.random() < 0.3) {
        this.sfx('playSwoosh');
      }

      // Only a real swipe slices, not a pointer resting on a fruit
      if (this.state === 'PLAYING' && dist >= 5) {
        this.checkSliceCollisions(this.lastPointer, coords);
      }

      this.lastPointer = coords;
    }
  }

  handlePointerUp() {
    this.isMouseDown = false;
    this.lastPointer = null;
    this.activePointerId = null;

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

      if (this.state === 'PLAYING' || this.state === 'GAMEOVER') {
        this.score += comboBonus;
        this.updateHUD();
        this.showComboBanner(comboText);
        this.sfx('playCombo', this.currentSwipeCombo);

        // Juice it: ring + slow-mo on big combos
        this.effects.push(new ShockRing(this.lastSlicePos.x, this.lastSlicePos.y, '#ffa502', 90 + this.currentSwipeCombo * 15, 6));
        if (this.currentSwipeCombo >= 4) this.hitStop(380, 0.35);

        if (this.currentSwipeCombo > this.maxComboAchieved) {
          this.maxComboAchieved = this.currentSwipeCombo;
        }
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

  hitStop(ms, scale) {
    this.slowScale = scale;
    this.slowUntil = performance.now() + ms;
  }

  /* ------------------------------------------------------------------ */
  /* Slicing                                                             */
  /* ------------------------------------------------------------------ */

  checkSliceCollisions(p1, p2) {
    const cutAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      if (!fruit.active || fruit.isSliced) continue;

      if (this.lineIntersectsCircle(p1, p2, fruit.x, fruit.y, fruit.radius * 0.95)) {
        this.sliceFruit(fruit, i, cutAngle);
        if (this.state !== 'PLAYING') break;
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

    const type = fruit.type;
    this.score += type.points;
    this.totalFruitsSliced++;
    this.currentSwipeCombo++;
    this.lastSlicePos = { x: fruit.x, y: fruit.y };

    // Golden fruit bonus: extra time
    if (type.timeBonus) {
      this.timer += type.timeBonus;
      this.floatingTexts.push(new FloatingScoreText(`+${type.timeBonus}s`, fruit.x, fruit.y - 44, '#00d2d3', true));
      this.effects.push(new ShockRing(fruit.x, fruit.y, '#ffd32a', 150, 7));
      this.music.chime();
      this.flashTimerPill('fs-boost');
    }
    this.updateHUD();

    clearTimeout(this.comboResetTimeout);
    this.comboResetTimeout = setTimeout(() => {
      this.finishCombo();
    }, 420);

    this.sfx('playSplat', type.id === 'golden' ? 'apple' : type.id);

    this.floatingTexts.push(new FloatingScoreText(`+${type.points}`, fruit.x, fruit.y - 10, type.color));

    // Split halves, cut flash, stain & juice
    this.fruitHalves.push(new FruitHalf(fruit, -1, cutAngle, 4.5));
    this.fruitHalves.push(new FruitHalf(fruit, 1, cutAngle, 4.5));
    this.effects.push(new SliceFlash(fruit.x, fruit.y, cutAngle, fruit.radius * 1.6));
    this.splats.push(new JuiceSplat(fruit.x, fruit.y, type.juice || type.color, fruit.radius / 36));
    if (this.splats.length > 28) this.splats.shift();

    const particleCount = type.isGolden ? 30 : 18;
    for (let k = 0; k < particleCount; k++) {
      this.particles.push(new JuiceParticle(fruit.x, fruit.y, type.juice || type.color, type.isGolden ? 1.2 : 1));
    }
    if (this.particles.length > 450) this.particles.splice(0, this.particles.length - 450);
  }

  triggerBombExplosion(bomb) {
    this.bombsHit++;
    this.sfx('stopBombFuse');
    this.fuseOn = false;
    this.sfx('playBombExplosion');

    const scorePenalty = 10;
    const timePenalty = 5;

    this.score = Math.max(0, this.score - scorePenalty);
    this.timer = Math.max(0, this.timer - timePenalty);
    this.lives = Math.max(0, this.lives - 1);
    this.updateHUD();
    this.updateLivesUI(true);
    this.flashTimerPill('fs-hurt');

    // Cancel any running combo: the bomb breaks the streak
    clearTimeout(this.comboResetTimeout);
    this.currentSwipeCombo = 0;

    this.floatingTexts.push(
      new FloatingScoreText(`-${scorePenalty} PTS  -${timePenalty}s  -1 ❤`, bomb.x, bomb.y, '#ff4757', true)
    );

    // Screen shake, damage flash, slow-mo
    this.container.classList.remove('shake', 'damage-flash');
    void this.container.offsetWidth;
    this.container.classList.add('shake', 'damage-flash');
    setTimeout(() => {
      if (this.container) this.container.classList.remove('shake', 'damage-flash');
    }, 450);
    this.bg.flash('255,71,87');
    this.hitStop(520, 0.3);

    this.effects.push(new ShockRing(bomb.x, bomb.y, '#ff9f1a', 220, 11));
    this.effects.push(new ShockRing(bomb.x, bomb.y, '#ffffff', 140, 8));
    this.splats.push(new JuiceSplat(bomb.x, bomb.y, '#2d3436', 1.6));
    for (let i = 0; i < 46; i++) {
      this.particles.push(new BombSparkParticle(bomb.x, bomb.y, true));
    }

    if (this.lives <= 0) {
      this.endGame('NO LIVES LEFT');
    } else if (this.timer <= 0) {
      this.endGame("TIME'S UP");
    }
  }

  flashTimerPill(cls) {
    if (!this.timerPill) return;
    this.timerPill.classList.remove(cls);
    void this.timerPill.offsetWidth;
    this.timerPill.classList.add(cls);
    setTimeout(() => this.timerPill && this.timerPill.classList.remove(cls), 700);
  }

  /* ------------------------------------------------------------------ */
  /* Game flow                                                           */
  /* ------------------------------------------------------------------ */

  startGame() {
    clearTimeout(this.gameOverTimeout);
    clearInterval(this.timerInterval);
    clearTimeout(this.comboResetTimeout);

    this.score = 0;
    this.timer = this.maxTime;
    this.lives = this.maxLives;
    this.totalFruitsSliced = 0;
    this.maxComboAchieved = 0;
    this.bombsHit = 0;
    this.currentSwipeCombo = 0;
    this.fruits = [];
    this.fruitHalves = [];
    this.particles = [];
    this.floatingTexts = [];
    this.splats = [];
    this.effects = [];
    this.spawnQueue = [];
    this.playTime = 0;
    this.nextWaveAt = 500;
    this.announcedLevel = 1;
    this.timeScale = 1;
    this.slowUntil = 0;
    this.sfx('stopBombFuse');
    this.fuseOn = false;
    this.music.stop();

    this.hideAllOverlays();
    this.updateHUD();
    this.updateLivesUI();
    if (this.timerPill) this.timerPill.classList.remove('urgent');
    if (this.timeBar) this.timeBar.classList.remove('urgent');
    document.body.classList.add('fruit-playing');

    this.startCountdown(3, 650, () => this.beginPlaying());
  }

  beginPlaying() {
    this.state = 'PLAYING';
    this.goFlashUntil = performance.now() + 700;
    this.music.start(true);

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state !== 'PLAYING') return;

      this.timer--;
      this.updateHUD();

      if (this.timer <= 10) {
        if (this.timerPill) this.timerPill.classList.add('urgent');
        if (this.timeBar) this.timeBar.classList.add('urgent');
        this.sfx('playCountTick');
      } else {
        if (this.timerPill) this.timerPill.classList.remove('urgent');
        if (this.timeBar) this.timeBar.classList.remove('urgent');
      }

      if (this.timer <= 0) {
        clearInterval(this.timerInterval);
        this.endGame("TIME'S UP");
      }
    }, 1000);
  }

  startCountdown(steps, stepMs, onDone) {
    this.state = 'COUNTDOWN';
    this.countdown = { start: performance.now(), steps, stepMs, lastIdx: -1, onDone };
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.sfx('stopBombFuse');
    this.fuseOn = false;
    this.music.pause();
    this.handlePointerUp();
    this.showModal(this.pauseOverlay);
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.hideModal(this.pauseOverlay);
    this.lastFrameTime = performance.now();
    this.startCountdown(3, 550, () => {
      this.state = 'PLAYING';
      this.goFlashUntil = performance.now() + 500;
      this.music.resume();
      if (this.fruits.some(f => f.isBomb && f.active)) {
        this.sfx('startBombFuse');
        this.fuseOn = true;
      }
    });
  }

  returnToMenu() {
    clearTimeout(this.gameOverTimeout);
    clearInterval(this.timerInterval);
    this.countdown = null;
    this.state = 'START';
    this.sfx('stopBombFuse');
    this.fuseOn = false;
    this.music.stop();
    document.body.classList.remove('fruit-playing');
    this.fruits = [];
    this.fruitHalves = [];
    this.spawnQueue = [];
    this.hideAllOverlays();
    this.showModal(this.startOverlay);
    this.updateHighScoreDisplay();
    this.updateHUD();
  }

  endGame(reason = "TIME'S UP") {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    clearInterval(this.timerInterval);
    clearTimeout(this.comboResetTimeout);
    this.finishCombo();
    this.sfx('stopBombFuse');
    this.fuseOn = false;
    this.music.stop();
    this.sfx('playGameOver');
    document.body.classList.remove('fruit-playing');
    this.fruits = this.fruits.filter(f => !f.isBomb);
    this.updateHUD();

    this.floatingTexts.push(new FloatingScoreText(reason, this.width / 2, this.height / 2, '#ff4757', true));

    const isNewRecord = this.score > this.highScore;
    const previousBest = this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      this.writeStore('fruit_arcade_high_score', this.highScore.toString());
    }

    // Populate Game Over screen
    this.statSlicedEl.textContent = this.totalFruitsSliced;
    this.statMaxComboEl.textContent = this.maxComboAchieved > 1 ? `${this.maxComboAchieved}x` : 'None';
    this.statBombsEl.textContent = this.bombsHit;
    this.finalScoreEl.textContent = '0';
    this.updateRankBadge(previousBest);

    if (isNewRecord && this.score > 0) {
      this.newRecordRibbon.classList.add('visible');
    } else {
      this.newRecordRibbon.classList.remove('visible');
    }

    this.updateHighScoreDisplay();
    this.updateHUD();

    // Let the explosion / "TIME'S UP" breathe before the summary slides in
    clearTimeout(this.gameOverTimeout);
    this.gameOverTimeout = setTimeout(() => {
      if (this.state !== 'GAMEOVER') return;
      this.showModal(this.gameOverOverlay);
      this.countUp(this.finalScoreEl, this.score, 750);
      if (isNewRecord && this.score > 0) this.sfx('playRecordFanfare');
    }, 750);
  }

  updateRankBadge(previousBest) {
    if (!this.rankBadge) return;
    const ranks = [
      [0, 'Fruit Rookie', '🍒'],
      [15, 'Juice Apprentice', '🍊'],
      [35, 'Blade Adept', '🍉'],
      [60, 'Slice Master', '⚔️'],
      [90, 'Fruit Ninja', '🥷'],
      [130, 'Legendary Slicer', '👑']
    ];
    let rank = ranks[0];
    for (const r of ranks) if (this.score >= r[0]) rank = r;

    const emoji = document.getElementById('fs-rank-emoji');
    const title = document.getElementById('fs-rank-title');
    const sub = document.getElementById('fs-rank-sub');
    if (emoji) emoji.textContent = rank[2];
    if (title) title.textContent = rank[1];
    if (sub) {
      if (this.score > previousBest && this.score > 0) {
        sub.textContent = `New best! Previous: ${previousBest}`;
      } else {
        sub.textContent = `Best: ${this.highScore}  •  ${Math.max(0, this.highScore - this.score)} to beat it`;
      }
    }
  }

  countUp(el, target, duration) {
    if (!el) return;
    if (target <= 0) { el.textContent = '0'; return; }
    const start = performance.now();
    const tick = (now) => {
      if (this._destroyed) return;
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  updateHUD() {
    if (this.scoreEl) {
      const text = String(this.score);
      if (this.scoreEl.textContent !== text) {
        this.scoreEl.textContent = text;
        this.scoreEl.classList.remove('fs-bump');
        void this.scoreEl.offsetWidth;
        this.scoreEl.classList.add('fs-bump');
      }
    }
    if (this.timerEl) this.timerEl.textContent = `${Math.max(0, this.timer)}s`;
    if (this.bestScoreHud) this.bestScoreHud.textContent = Math.max(this.highScore, this.score);
    if (this.timeBarFill) {
      const pct = Math.max(0, Math.min(1, this.timer / this.maxTime)) * 100;
      this.timeBarFill.style.width = `${pct}%`;
    }
  }

  updateLivesUI(justLost = false) {
    if (!this.livesPill) return;
    const hearts = this.livesPill.querySelectorAll('.fs-heart');
    hearts.forEach((h, i) => {
      const lost = i >= this.lives;
      const wasLost = h.classList.contains('lost');
      h.classList.toggle('lost', lost);
      if (justLost && lost && !wasLost) {
        h.classList.remove('fs-break');
        void h.offsetWidth;
        h.classList.add('fs-break');
      }
    });
    this.livesPill.setAttribute('aria-label', `${this.lives} lives remaining`);
  }

  updateHighScoreDisplay() {
    if (this.startHighScoreVal) {
      this.startHighScoreVal.textContent = this.highScore;
    }
    if (this.bestScoreHud) this.bestScoreHud.textContent = this.highScore;
  }

  /* ---- Overlays with animated in/out transitions ---- */

  showModal(el) {
    if (!el) return;
    clearTimeout(el._hideTimer);
    el.classList.remove('fs-closing');
    el.classList.remove('hidden');
  }

  hideModal(el, immediate = false) {
    if (!el) return;
    clearTimeout(el._hideTimer);
    if (immediate || el.classList.contains('hidden')) {
      el.classList.remove('fs-closing');
      el.classList.add('hidden');
      return;
    }
    el.classList.add('fs-closing');
    el._hideTimer = setTimeout(() => {
      el.classList.add('hidden');
      el.classList.remove('fs-closing');
    }, 260);
  }

  hideAllOverlays() {
    [this.startOverlay, this.pauseOverlay, this.gameOverOverlay, this.instructionsModal].forEach(ov => {
      if (ov) this.hideModal(ov, true);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Spawner                                                             */
  /* ------------------------------------------------------------------ */

  pickFruitKey() {
    const keys = Object.keys(FRUIT_TYPES).filter(k => FRUIT_TYPES[k].weight > 0);
    let total = 0;
    keys.forEach(k => { total += FRUIT_TYPES[k].weight; });
    let roll = Math.random() * total;
    for (const k of keys) {
      roll -= FRUIT_TYPES[k].weight;
      if (roll <= 0) return k;
    }
    return keys[0];
  }

  processSpawns() {
    if (this.playTime >= this.nextWaveAt) {
      this.spawnFruitWave();
      const interval = Math.max(900, 2100 - this.playTime * 0.02);
      this.nextWaveAt = this.playTime + interval;
    }

    if (this.spawnQueue.length) {
      const remaining = [];
      for (const item of this.spawnQueue) {
        if (item.at <= this.playTime) {
          this.launchFruit(item.key, item.x);
        } else {
          remaining.push(item);
        }
      }
      this.spawnQueue = remaining;
    }

    // Level-up announcement + music intensity
    const lvl = this.level;
    if (lvl > this.announcedLevel) {
      this.announcedLevel = lvl;
      this.floatingTexts.push(new FloatingScoreText(`LEVEL ${lvl}`, this.width / 2, this.height * 0.4, '#00d2d3', true));
      this.music.intensity = Math.min(5, lvl - 1);
      this.music.levelUp();
    }
  }

  spawnFruitWave() {
    const lvl = this.level;
    const w = this.width;
    const margin = Math.min(90, w * 0.12);

    // Fruit frenzy bonus wave (no bombs)
    if (lvl >= 3 && Math.random() < 0.12) {
      this.floatingTexts.push(new FloatingScoreText('FRUIT FRENZY!', w / 2, this.height * 0.35, '#ffa502', true));
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x = margin + ((w - margin * 2) * (i + 0.5)) / n;
        this.spawnQueue.push({ at: this.playTime + i * 110, key: this.pickFruitKey(), x });
      }
      return;
    }

    let count = 1;
    if (Math.random() < 0.45 + lvl * 0.05) count++;
    if (lvl >= 2 && Math.random() < 0.25 + lvl * 0.04) count++;
    if (lvl >= 4 && Math.random() < 0.2) count++;

    const canSpawnBomb = this.bombsEnabled && this.playTime > 4000;
    const bombChance = Math.min(0.42, 0.16 + lvl * 0.045);
    const withBomb = canSpawnBomb && Math.random() < bombChance;
    if (withBomb && count < 2) count = 2;

    const keys = [];
    for (let i = 0; i < count; i++) keys.push(this.pickFruitKey());

    if (withBomb) {
      keys[Math.floor(Math.random() * count)] = 'BOMB';
      if (lvl >= 4 && count >= 3 && Math.random() < 0.3) {
        const j = keys.findIndex(k => k !== 'BOMB');
        if (j >= 0) keys[j] = 'BOMB';
      }
    }

    // Rare golden fruit (replaces a non-bomb slot)
    const goldenAlive = this.fruits.some(f => f.isGolden && f.active);
    if (this.playTime > 6000 && !goldenAlive && Math.random() < 0.07) {
      const j = keys.findIndex(k => k !== 'BOMB');
      if (j >= 0) keys[j] = 'GOLDEN';
      else keys.push('GOLDEN');
    }

    // Fan the wave across the screen with a small stagger
    const spread = Math.random() < 0.5;
    keys.forEach((key, i) => {
      const x = spread
        ? margin + ((w - margin * 2) * (i + 0.5 + (Math.random() - 0.5) * 0.4)) / keys.length
        : undefined;
      this.spawnQueue.push({ at: this.playTime + i * (90 + Math.random() * 110), key, x });
    });
  }

  launchFruit(typeKey, slotX) {
    const w = this.width;
    const h = this.height;
    if (!w || !h) return;

    const margin = Math.min(90, w * 0.12);
    const startX = slotX !== undefined ? slotX : margin + Math.random() * (w - margin * 2);
    const startY = h + 40;

    const gravity = 0.38 + (this.state === 'PLAYING' ? (this.level - 1) * 0.012 : 0);
    const topLimit = Math.min(95, h * 0.2);
    const apex = topLimit + Math.random() * Math.max(20, h * 0.42 - topLimit);
    const vy = -Math.sqrt(2 * gravity * (startY - apex));
    const flightFrames = (2 * Math.abs(vy)) / gravity;

    const lo = margin * 0.6;
    const hi = w - margin * 0.6;
    const destX = Math.max(lo, Math.min(hi, startX + (Math.random() - 0.5) * w * 0.45));
    const vx = (destX - startX) / flightFrames;

    const fruit = new Fruit(typeKey, startX, startY, vx, vy, gravity);
    this.fruits.push(fruit);

    if (typeKey === 'BOMB' && this.state === 'PLAYING') {
      this.sfx('startBombFuse');
      this.fuseOn = true;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Main loop                                                           */
  /* ------------------------------------------------------------------ */

  loop(currentTime) {
    if (this._destroyed) return;

    try {
      this.frame(currentTime);
    } catch (err) {
      if (!this._loggedError) {
        this._loggedError = true;
        console.error('[FruitSlice] frame error:', err);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  frame(currentTime) {
    const frameMs = Math.min(50, Math.max(0, currentTime - this.lastFrameTime));
    this.lastFrameTime = currentTime;
    const now = performance.now();

    if (!this.width || !this.height) this.resizeCanvas();
    if (!this.width || !this.height) return;

    // Slow-motion easing
    const targetScale = now < this.slowUntil ? this.slowScale : 1;
    this.timeScale += (targetScale - this.timeScale) * 0.2;
    const dt = Math.min(2.5, frameMs / 16.666) * this.timeScale;

    const playing = this.state === 'PLAYING';
    const live = playing || this.state === 'GAMEOVER';
    const ctx = this.ctx;

    // Background (always animates)
    this.bg.render(ctx, Math.min(2.5, frameMs / 16.666));

    if (playing) {
      this.playTime += frameMs;
      this.processSpawns();
    }

    // Attract mode: decorative fruit drifting behind the menu
    if (this.state === 'START' && currentTime > this.nextAttractAt && !document.hidden) {
      this.nextAttractAt = currentTime + 1300;
      if (this.fruits.length < 5) this.launchFruit(this.pickFruitKey());
    }

    // Juice stains (under everything)
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const s = this.splats[i];
      if (live) s.update(dt);
      s.render(ctx);
      if (!s.active) this.splats.splice(i, 1);
    }

    // Whole fruits
    let anyBombAlive = false;
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      if (playing || this.state === 'START') {
        fruit.update(dt);
      }
      fruit.render(ctx);

      if (fruit.isBomb && fruit.active) {
        anyBombAlive = true;
        if (playing && Math.random() < 0.45 * Math.min(1, this.timeScale + 0.2)) {
          this.particles.push(new BombSparkParticle(fruit.x + 16, fruit.y - fruit.radius - 24, false));
        }
      }

      if (!fruit.active || (fruit.y > this.height + 90 && fruit.vy > 0)) {
        this.fruits.splice(i, 1);
      }
    }

    if (this.fuseOn && !anyBombAlive) {
      this.sfx('stopBombFuse');
      this.fuseOn = false;
    }

    // Split halves
    for (let i = this.fruitHalves.length - 1; i >= 0; i--) {
      const half = this.fruitHalves[i];
      if (live) half.update(dt);
      half.render(ctx);
      if (half.y > this.height + 90) {
        this.fruitHalves.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (live) p.update(dt);
      p.render(ctx);
      if (!p.active) this.particles.splice(i, 1);
    }

    // Rings & slice flashes
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      if (live) e.update(dt);
      e.render(ctx);
      if (!e.active) this.effects.splice(i, 1);
    }

    // Floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const text = this.floatingTexts[i];
      if (live) text.update(dt);
      text.render(ctx);
      if (!text.active) this.floatingTexts.splice(i, 1);
    }

    // Blade
    this.bladeTrail.update();
    this.bladeTrail.render(ctx);

    // Countdown / GO!
    this.updateCountdown(now);
    this.renderCountdown(ctx, now);
  }

  updateCountdown(now) {
    const c = this.countdown;
    if (!c || this.state !== 'COUNTDOWN') return;
    const idx = Math.floor((now - c.start) / c.stepMs);
    if (idx !== c.lastIdx && idx < c.steps) {
      c.lastIdx = idx;
      this.music.beep(false);
    }
    if (idx >= c.steps) {
      this.countdown = null;
      this.music.beep(true);
      c.onDone();
    }
  }

  renderCountdown(ctx, now) {
    let text = null;
    let progress = 0;
    const c = this.countdown;

    if (c && this.state === 'COUNTDOWN') {
      const elapsed = now - c.start;
      const idx = Math.min(c.steps - 1, Math.floor(elapsed / c.stepMs));
      progress = (elapsed - idx * c.stepMs) / c.stepMs;
      text = String(c.steps - idx);
    } else if (now < this.goFlashUntil) {
      text = 'GO!';
      progress = 1 - (this.goFlashUntil - now) / 600;
    }
    if (!text) return;

    const p = Math.max(0, Math.min(1, progress));
    const scale = text === 'GO!' ? 1.1 + p * 0.5 : 1.5 - p * 0.5;
    const alpha = text === 'GO!' ? 1 - p : Math.min(1, (1 - p) * 2.2);

    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = '96px "Luckiest Guy", Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(text, 0, 0);
    const g = ctx.createLinearGradient(0, -48, 0, 48);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, text === 'GO!' ? '#2ed573' : '#ffa502');
    g.addColorStop(1, text === 'GO!' ? '#00d2d3' : '#ff4757');
    ctx.fillStyle = g;
    ctx.shadowColor = text === 'GO!' ? '#2ed573' : '#ff6b81';
    ctx.shadowBlur = 24;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  destroy() {
    this._destroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    clearTimeout(this.comboResetTimeout);
    clearTimeout(this.comboTimeout);
    clearTimeout(this.gameOverTimeout);
    this.comboResetTimeout = null;

    this._listeners.forEach(({ target, type, handler, options }) => {
      try { target.removeEventListener(type, handler, options); } catch (e) { /* ignore */ }
    });
    this._listeners = [];
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    this.sfx('stopBombFuse');
    if (this.music) this.music.destroy();
    document.body.classList.remove('fruit-playing');
    this.state = 'PAUSED';
  }
}

// Bootstrap on window load if fruit-slice view is active or stand-alone
function bootstrapFruitArcade() {
  if (document.getElementById('gameCanvas') && (!window.ArcadePortal || window.location.hash.includes('fruit-slice'))) {
    const existing = window.gameInstance;
    if (existing && existing instanceof FruitArcadeGame && !existing._destroyed &&
        existing.canvas === document.getElementById('gameCanvas')) {
      return; // already running on this canvas
    }
    window.gameInstance = new FruitArcadeGame();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrapFruitArcade);
} else {
  bootstrapFruitArcade();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FruitArcadeGame, MusicEngine };
}
