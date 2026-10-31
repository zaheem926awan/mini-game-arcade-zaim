/**
 * Tic-Tac-Toe Cyber Arcade Game
 * Includes unbeatable Minimax AI, adjustable difficulty, 2-player local mode,
 * win-line strike effects, and stats tracking.
 */

class TicTacToeGame {
  constructor(container, sound) {
    this.container = container;
    this.sound = sound;

    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.mode = 'ai'; // 'ai' | '2p'
    this.difficulty = 'hard'; // 'easy' | 'medium' | 'hard' (minimax)
    this.gameOver = false;
    this.winningCombo = null;

    this.stats = {
      xWins: 0,
      oWins: 0,
      ties: 0
    };

    this.winningCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diags
    ];
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper tictactoe-arcade">
        <div class="ttt-controls-header">
          <div class="ttt-mode-select">
            <button id="ttt-mode-ai" class="ttt-toggle-btn active">🤖 VS COMPUTER</button>
            <button id="ttt-mode-2p" class="ttt-toggle-btn">👥 2 PLAYERS</button>
          </div>
          <div id="ttt-diff-wrapper" class="ttt-diff-select">
            <label>DIFFICULTY:</label>
            <select id="ttt-difficulty" class="arcade-select">
              <option value="hard" selected>Invincible (Minimax)</option>
              <option value="medium">Medium</option>
              <option value="easy">Easy</option>
            </select>
          </div>
        </div>

        <div class="game-hud">
          <div class="hud-stat"><span class="icon" style="color: #00d2d3;">✕</span> X: <span id="ttt-x-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon">⚖️</span> TIES: <span id="ttt-ties-score" class="val">0</span></div>
          <div class="hud-stat"><span class="icon" style="color: #ff4757;">◯</span> O: <span id="ttt-o-score" class="val">0</span></div>
          <div class="hud-controls-bar">
            <button id="ttt-btn-reset" class="arcade-hud-btn" title="New Round">🔄</button>
          </div>
        </div>

        <div class="ttt-status-banner">
          <span id="ttt-status-text">PLAYER X'S TURN</span>
        </div>

        <div class="ttt-board-container">
          <div id="ttt-board" class="ttt-board"></div>
        </div>
      </div>
    `;

    this.boardEl = this.container.querySelector('#ttt-board');
    this.statusText = this.container.querySelector('#ttt-status-text');
    this.scoreXEl = this.container.querySelector('#ttt-x-score');
    this.scoreOEl = this.container.querySelector('#ttt-o-score');
    this.scoreTiesEl = this.container.querySelector('#ttt-ties-score');
    this.btnModeAi = this.container.querySelector('#ttt-mode-ai');
    this.btnMode2p = this.container.querySelector('#ttt-mode-2p');
    this.diffSelect = this.container.querySelector('#ttt-difficulty');
    this.diffWrapper = this.container.querySelector('#ttt-diff-wrapper');
    this.btnReset = this.container.querySelector('#ttt-btn-reset');

    this.btnModeAi.addEventListener('click', () => {
      this.mode = 'ai';
      this.btnModeAi.classList.add('active');
      this.btnMode2p.classList.remove('active');
      this.diffWrapper.style.display = 'flex';
      this.sound?.playClick();
      this.start();
    });

    this.btnMode2p.addEventListener('click', () => {
      this.mode = '2p';
      this.btnMode2p.classList.add('active');
      this.btnModeAi.classList.remove('active');
      this.diffWrapper.style.display = 'none';
      this.sound?.playClick();
      this.start();
    });

    this.diffSelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.sound?.playClick();
      this.start();
    });

    this.btnReset.addEventListener('click', () => {
      this.sound?.playClick();
      this.start();
    });

    this.start();
  }

  start() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.gameOver = false;
    this.winningCombo = null;

    this.statusText.textContent = "PLAYER X'S TURN";
    this.statusText.style.color = '#00d2d3';

    this.render();
  }

  makeMove(index) {
    if (this.board[index] || this.gameOver) return;

    this.board[index] = this.currentPlayer;
    this.sound?.playHit(this.currentPlayer === 'X' ? 440 : 330);

    const winner = this.checkWinner(this.board);

    if (winner) {
      this.handleGameEnd(winner);
    } else if (this.isBoardFull(this.board)) {
      this.handleGameEnd('tie');
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
      this.statusText.textContent = this.mode === 'ai' && this.currentPlayer === 'O'
        ? "COMPUTER THINKING..."
        : `PLAYER ${this.currentPlayer}'S TURN`;
      this.statusText.style.color = this.currentPlayer === 'X' ? '#00d2d3' : '#ff4757';

      this.render();

      if (this.mode === 'ai' && this.currentPlayer === 'O' && !this.gameOver) {
        setTimeout(() => this.makeAiMove(), 320);
      }
    }

    this.render();
  }

  makeAiMove() {
    if (this.gameOver) return;

    let move;
    if (this.difficulty === 'easy') {
      move = this.getRandomMove();
    } else if (this.difficulty === 'medium') {
      move = Math.random() < 0.65 ? this.getBestMove() : this.getRandomMove();
    } else {
      move = this.getBestMove(); // Minimax
    }

    if (move !== -1 && move !== null) {
      this.makeMove(move);
    }
  }

  getRandomMove() {
    const emptyIndices = this.board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
    if (emptyIndices.length === 0) return -1;
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  getBestMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) {
        this.board[i] = 'O';
        const score = this.minimax(this.board, 0, false);
        this.board[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }

  minimax(board, depth, isMaximizing) {
    const winner = this.checkWinner(board);
    if (winner === 'O') return 10 - depth;
    if (winner === 'X') return depth - 10;
    if (this.isBoardFull(board)) return 0;

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'O';
          const score = this.minimax(board, depth + 1, false);
          board[i] = null;
          maxScore = Math.max(score, maxScore);
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'X';
          const score = this.minimax(board, depth + 1, true);
          board[i] = null;
          minScore = Math.min(score, minScore);
        }
      }
      return minScore;
    }
  }

  checkWinner(board) {
    for (const combo of this.winningCombos) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        this.winningCombo = combo;
        return board[a];
      }
    }
    return null;
  }

  isBoardFull(board) {
    return board.every(cell => cell !== null);
  }

  handleGameEnd(result) {
    this.gameOver = true;

    if (result === 'tie') {
      this.stats.ties++;
      this.statusText.textContent = "IT'S A DRAW!";
      this.statusText.style.color = '#ffa502';
      this.sound?.playHit(280);
    } else {
      if (result === 'X') {
        this.stats.xWins++;
        this.statusText.textContent = this.mode === 'ai' ? 'YOU WON!' : 'PLAYER X WINS!';
        this.statusText.style.color = '#00d2d3';
        this.sound?.playWin();
      } else {
        this.stats.oWins++;
        this.statusText.textContent = this.mode === 'ai' ? 'COMPUTER WINS!' : 'PLAYER O WINS!';
        this.statusText.style.color = '#ff4757';
        if (this.mode === 'ai') this.sound?.playLose();
        else this.sound?.playWin();
      }
    }

    this.updateHUD();
  }

  updateHUD() {
    if (this.scoreXEl) this.scoreXEl.textContent = this.stats.xWins;
    if (this.scoreOEl) this.scoreOEl.textContent = this.stats.oWins;
    if (this.scoreTiesEl) this.scoreTiesEl.textContent = this.stats.ties;
  }

  render() {
    if (!this.boardEl) return;
    this.boardEl.innerHTML = '';

    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'ttt-cell';
      cell.setAttribute('data-index', i);

      if (this.board[i]) {
        cell.classList.add(this.board[i].toLowerCase());
        cell.textContent = this.board[i] === 'X' ? '✕' : '◯';
      }

      if (this.winningCombo && this.winningCombo.includes(i)) {
        cell.classList.add('winner');
      }

      cell.addEventListener('click', () => {
        if (!this.gameOver && (this.mode === '2p' || this.currentPlayer === 'X')) {
          this.makeMove(i);
        }
      });

      this.boardEl.appendChild(cell);
    }
  }

  destroy() {
    // nothing persistent
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TicTacToeGame };
}
