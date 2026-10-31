/**
 * Memory Match Cyber Arcade Game
 * 4x4 card flipping memory game with 3D card flips, match combos, timer, stars rating.
 */

class MemoryMatchGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;
    this.storageKey = 'arcade_memory_best';
    this.bestMoves = parseInt(localStorage.getItem(this.storageKey) || '999', 10);

    this.icons = [
      { id: 'alien', symbol: '👾', color: '#2ed573' },
      { id: 'rocket', symbol: '🚀', color: '#00d2d3' },
      { id: 'gem', symbol: '💎', color: '#70a1ff' },
      { id: 'bolt', symbol: '⚡', color: '#ffa502' },
      { id: 'gamepad', symbol: '🎮', color: '#a55eea' },
      { id: 'cherry', symbol: '🍒', color: '#ff4757' },
      { id: 'bomb', symbol: '💣', color: '#ff6b81' },
      { id: 'crown', symbol: '👑', color: '#fffa65' }
    ];

    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.timer = 0;
    this.timerInterval = null;
    this.isLocked = false;
    this.state = 'START';
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper memory-arcade">
        <div class="game-hud">
          <div class="hud-stat"><span class="icon">🔄</span> MOVES: <span id="mem-moves" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">⏱️</span> TIME: <span id="mem-time" class="val">0s</span></div>
          <div class="hud-stat"><span class="icon">🏆</span> BEST: <span id="mem-best" class="val">${this.bestMoves === 999 ? '-' : this.bestMoves}</span></div>
          <div class="hud-controls-bar">
            <button id="mem-btn-restart" class="arcade-hud-btn" title="Restart Game">🔄</button>
          </div>
        </div>
        <div class="memory-board-wrapper">
          <div id="memory-board" class="memory-grid"></div>
          <div id="mem-overlay" class="game-overlay hidden">
            <div class="overlay-modal">
              <h2 id="mem-overlay-title" class="neon-title">STAGE COMPLETE!</h2>
              <div id="mem-stars" class="memory-stars">⭐⭐⭐</div>
              <p id="mem-overlay-desc">You revealed and matched all memory nodes in the grid!</p>
              <div id="mem-overlay-stats" class="modal-stats"></div>
              <button id="mem-btn-play" class="arcade-btn-primary"><span>🔄</span> PLAY AGAIN</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.boardEl = this.container.querySelector('#memory-board');
    this.movesEl = this.container.querySelector('#mem-moves');
    this.timeEl = this.container.querySelector('#mem-time');
    this.bestEl = this.container.querySelector('#mem-best');
    this.overlay = this.container.querySelector('#mem-overlay');
    this.overlayTitle = this.container.querySelector('#mem-overlay-title');
    this.overlayDesc = this.container.querySelector('#mem-overlay-desc');
    this.overlayStats = this.container.querySelector('#mem-overlay-stats');
    this.starsEl = this.container.querySelector('#mem-stars');
    this.btnRestart = this.container.querySelector('#mem-btn-restart');
    this.btnPlay = this.container.querySelector('#mem-btn-play');

    this.btnRestart.addEventListener('click', () => {
      this.sound?.playClick();
      this.start();
    });

    this.btnPlay.addEventListener('click', () => {
      this.sound?.playClick();
      this.start();
    });

    this.start();
  }

  start() {
    clearInterval(this.timerInterval);
    this.timer = 0;
    this.moves = 0;
    this.matchedPairs = 0;
    this.flippedCards = [];
    this.isLocked = false;
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');

    this.timerInterval = setInterval(() => {
      if (this.state === 'PLAYING') {
        this.timer++;
        if (this.timeEl) this.timeEl.textContent = `${this.timer}s`;
      }
    }, 1000);

    this.buildDeck();
    this.updateHUD();
    this.render();
  }

  buildDeck() {
    const deck = [...this.icons, ...this.icons].map((icon, idx) => ({
      uniqueId: idx,
      id: icon.id,
      symbol: icon.symbol,
      color: icon.color,
      isFlipped: false,
      isMatched: false
    }));

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.cards = deck;
  }

  flipCard(card) {
    if (this.isLocked || card.isFlipped || card.isMatched) return;

    card.isFlipped = true;
    this.flippedCards.push(card);
    this.sound?.playClick();
    this.render();

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.updateHUD();
      this.checkMatch();
    }
  }

  checkMatch() {
    const [c1, c2] = this.flippedCards;
    this.isLocked = true;

    if (c1.id === c2.id) {
      // Match found
      c1.isMatched = true;
      c2.isMatched = true;
      this.matchedPairs++;
      this.sound?.playMatch();
      this.flippedCards = [];
      this.isLocked = false;
      this.render();

      if (this.matchedPairs === this.icons.length) {
        setTimeout(() => this.handleVictory(), 400);
      }
    } else {
      // No match
      setTimeout(() => {
        c1.isFlipped = false;
        c2.isFlipped = false;
        this.flippedCards = [];
        this.isLocked = false;
        this.sound?.playHit(220);
        this.render();
      }, 750);
    }
  }

  handleVictory() {
    clearInterval(this.timerInterval);
    this.state = 'VICTORY';
    this.sound?.playWin();

    if (this.moves < this.bestMoves) {
      this.bestMoves = this.moves;
      localStorage.setItem(this.storageKey, this.bestMoves.toString());
    }

    let stars = '⭐⭐⭐';
    if (this.moves > 20) stars = '⭐';
    else if (this.moves > 14) stars = '⭐⭐';

    this.starsEl.textContent = stars;
    this.overlayTitle.textContent = 'MEMORY GRID CLEARED!';
    this.overlayDesc.textContent = 'All cyber nodes successfully matched and verified.';
    this.overlayStats.innerHTML = `
      <div class="stat-box"><span class="lbl">MOVES</span><span class="num">${this.moves}</span></div>
      <div class="stat-box"><span class="lbl">TIME</span><span class="num">${this.timer}s</span></div>
      <div class="stat-box"><span class="lbl">BEST</span><span class="num">${this.bestMoves}</span></div>
    `;
    this.overlay.classList.remove('hidden');
    this.updateHUD();
  }

  updateHUD() {
    if (this.movesEl) this.movesEl.textContent = this.moves;
    if (this.timeEl) this.timeEl.textContent = `${this.timer}s`;
    if (this.bestEl) this.bestEl.textContent = this.bestMoves === 999 ? '-' : this.bestMoves;
  }

  render() {
    if (!this.boardEl) return;
    this.boardEl.innerHTML = '';

    this.cards.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = `memory-card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`;

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-back">
            <span class="card-pattern">❖</span>
          </div>
          <div class="card-front" style="color: ${card.color};">
            <span class="card-symbol">${card.symbol}</span>
          </div>
        </div>
      `;

      cardEl.addEventListener('click', () => this.flipCard(card));
      this.boardEl.appendChild(cardEl);
    });
  }

  destroy() {
    clearInterval(this.timerInterval);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MemoryMatchGame };
}
