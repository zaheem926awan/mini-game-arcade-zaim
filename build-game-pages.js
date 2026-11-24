/**
 * Builds the 10 direct game pages: game/<slug>.html  ->  https://<domain>/game/<slug>
 *
 * Each page is plain static HTML (own title, description, canonical, structured data and
 * written content) plus the script tags needed to run that one game. js/arcade.js sees
 * <body data-game-page="..."> and mounts the game, so a refresh or a direct visit always
 * loads the right game. The older hash routes (/#/game/<id>) keep working unchanged.
 *
 * Usage:  npm run build-game-pages
 * Edit the GAMES table below, run the script, commit the generated game/*.html files.
 * The domain is read from index.html's canonical URL, so it never has to be typed here.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'game');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ORIGIN = (index.match(/<link rel="canonical" href="(https:\/\/[^"/]+)\/?"/) || [])[1];
if (!ORIGIN) throw new Error('Could not read the site origin from index.html canonical');

const { ARCADE_GAMES } = require('../js/arcade.js');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Which scripts each game needs. Fruit Slice is the only game with its own markup template.
const SCRIPTS = {
  'fruit-slice': ['audio.js', 'fruit.js', 'game.js'],
  'snake': ['audio.js', 'games/snake.js'],
  'brick-breaker': ['audio.js', 'games/brick-breaker.js'],
  'space-shooter': ['audio.js', 'games/space-shooter.js'],
  'puzzle-2048': ['audio.js', 'games/puzzle-2048.js'],
  'tic-tac-toe': ['audio.js', 'games/tic-tac-toe.js'],
  'memory-match': ['audio.js', 'games/memory-match.js'],
  'endless-runner': ['audio.js', 'games/endless-runner.js'],
  'block-puzzle': ['audio.js', 'games/block-puzzle.js'],
  'whack-a-mole': ['audio.js', 'games/whack-a-mole.js']
};

// Written content per game. Every fact here is taken from the matching /play guide page,
// which tests/site-structure.test.js already checks against the game engine source.
const GAMES = {
  'fruit-slice': {
    seoTitle: 'Play Fruit Slice: Free Slicing Game',
    metaDesc: 'Play Fruit Slice free online: swipe through flying fruit in a 60-second round, chain combos for bonus points and dodge the bombs. Mouse or touch, no download.',
    quickStart: 'Press PLAY NOW and a 3-2-1 countdown starts the fruit. Bombs only appear after the first 4 seconds, and only while Hazard Bombs is on, so use that opening window to practise long swipes. Strawberries, pineapples and kiwis are worth 2 points each, double the other fruit.',
    deviceNote: 'Works with a mouse drag or a finger swipe. The page does not scroll while your finger is on the game area.',
    closing: 'Fruit Slice is free, runs in your browser and needs no download or account. Your best score and blade colour stay on your own device.',
    intro: [
      'Fruit Slice runs on a 60-second clock. Fruit is thrown up from the bottom of the screen, every slice scores, and slicing several pieces in one stroke earns combo bonuses.',
      'Bombs are the only way to lose one of your three lives, so half the skill is knowing when not to swipe. The start screen lets you switch bombs off for a calmer round and choose a blade colour.'
    ],
    facts: [['Category', 'Action'], ['Round length', '60 seconds'], ['Lives', '3, lost only to bombs'], ['Best score', 'Saved in this browser']],
    controls: [['Mouse', 'Press and drag across fruit to slice it.'], ['Touch', 'Swipe a finger across fruit.'], ['P or Esc', 'Pause and resume.'], ['M', 'Mute or unmute the sound.']],
    tips: ['Combos count fruits per swipe, so one long stroke through a cluster beats several short ones.', 'A missed fruit costs nothing, while a bomb costs points, time and a life. Do not lunge for everything.', 'Golden apples are rare and give +5 points and 2 extra seconds, so they deserve a deliberate swipe.']
  },
  'snake': {
    seoTitle: 'Play Neon Snake: Free Online Snake Game',
    metaDesc: 'Play Neon Snake free online: steer a glowing snake around a 22 x 22 grid, eat apples, catch golden stars and avoid the walls. Keyboard, swipe or D-pad controls.',
    quickStart: 'You start with a three-cell snake heading right and one red apple on the board. Each apple is worth 10 points, and a step only gets shorter after every third apple, so the early game is the time to settle into a routine. Your first golden star, worth 50 points, shows up after your fifth apple.',
    deviceNote: 'On a computer, use the keyboard or click the on-screen D-pad. The mouse cannot steer on the board itself.',
    closing: 'Neon Snake is free, runs in your browser and needs no download or account. Your best score stays on your own device.',
    intro: [
      'Neon Snake moves one cell per step on a 22 x 22 board with solid walls. Every apple makes the snake longer and the game faster, and one crash ends the run.',
      'After every fifth apple a golden star appears for six seconds, worth as much as five apples. There is no wrap-around and no difficulty menu, just you, the grid and a growing tail.'
    ],
    facts: [['Category', 'Arcade'], ['Board', '22 x 22 cells'], ['Starting length', '3 cells'], ['Best score', 'Saved in this browser']],
    controls: [['Arrow keys or W A S D', 'Steer the snake.'], ['P or Esc', 'Pause and resume.'], ['Swipe', 'Swipe on the board to turn (about 25 pixels or more).'], ['On-screen D-pad', 'Four arrow buttons below the board, for touch or mouse.']],
    tips: ['The first apples are the slowest part of a run. Settle into a steady rhythm before the speed rises.', 'Tap a direction once and wait for the snake to move. Only one pending turn is stored per step.', 'As the snake grows, keep an open lane to turn into. Long snakes end runs far more often than walls do.']
  },
  'brick-breaker': {
    seoTitle: 'Play Brick Breaker: Free Paddle Game',
    metaDesc: 'Play Brick Breaker free online: bounce the ball off your paddle, smash bricks across three stages and catch power-up capsules. Mouse, keyboard or touch.',
    quickStart: 'The ball launches the moment you press LAUNCH BALL, so get the paddle under it first. Stage 1 has five rows across 8 columns of bricks. Gold bricks take three hits and show a small number, while red and green bricks fall to a single hit.',
    deviceNote: 'The mouse needs no clicking: the paddle simply follows the pointer. On a touch screen, drag a finger or hold the MOVE buttons.',
    closing: 'Brick Breaker is free, runs in your browser and needs no download or account. Your best score is saved on your own device when a run ends.',
    intro: [
      'Brick Breaker gives you three lives and three stages of bricks. Move the paddle with the mouse, the keyboard or a finger and keep the ball in play while it chips away at the rows above.',
      'Bricks that need several hits show a number. Falling capsules can add extra balls, widen the paddle, give bonus points or slow the ball down.'
    ],
    facts: [['Category', 'Arcade'], ['Stages', '3'], ['Lives', '3'], ['Best score', 'Saved in this browser']],
    controls: [['Mouse', 'Move the pointer over the board. The paddle follows it.'], ['Left / Right arrows or A / D', 'Move the paddle.'], ['P or Esc', 'Pause and resume.'], ['Touch', 'Drag a finger across the board, or hold the on-screen move buttons.']],
    tips: ['Hit the ball with the paddle edge to send it sideways and reach bricks in the corners.', 'With multi-ball you only lose a life when the last ball falls, so it is the safest capsule to chase.', 'Check the numbers on bricks. A 3-hit gold brick takes three hits, so do not leave it behind.']
  },
  'space-shooter': {
    seoTitle: 'Play Space Shooter: Free Arcade Shooter',
    metaDesc: 'Play Space Shooter free online: fly a starfighter, blast drones, cruisers and asteroids and grab triple-shot, shield and bomb power-ups. No download needed.',
    quickStart: 'Your ship starts at the bottom centre with twin cannons. In the first wave enemies arrive about every 1.4 seconds, which leaves time to line up each orange cruiser: three hits, 50 points, and the only enemy that shoots back. Waves speed up the arrivals as your score rises.',
    deviceNote: 'On a computer, fly with the keyboard and fire with Space. The mouse flies the ship but cannot fire. On a phone, dragging fires automatically.',
    closing: 'Space Shooter is free, runs in your browser and needs no download or account. Your best score is saved on your own device when a run ends.',
    intro: [
      'Space Shooter puts you in a starfighter with three shield points. Drones, heavy cruisers and asteroids come down the screen in busier and busier waves, and only the cruisers shoot back.',
      'Rare power-ups add a triple shot, a shield point or a bomb that clears the screen the moment you touch it.'
    ],
    facts: [['Category', 'Action'], ['Shield', '3 points'], ['Enemy types', '3'], ['Best score', 'Saved in this browser']],
    controls: [['Arrow keys or W A S D', 'Fly in any direction.'], ['Space or Enter', 'Fire. Hold for continuous fire.'], ['P or Esc', 'Pause and resume.'], ['Touch', 'Drag to fly. The ship fires automatically while you drag.']],
    tips: ['Shoot cruisers first. They are the only enemies that fire back, and they take three hits.', 'Do not ram enemies. A collision costs a shield point and scores nothing.', 'Letting an enemy slip off the bottom is free, so never risk your shield for a drone you cannot reach.']
  },
  'puzzle-2048': {
    seoTitle: 'Play 2048 Puzzle: Free Tile Merge Game',
    metaDesc: 'Play the 2048 puzzle game free online: slide and merge tiles on a 4 x 4 board to reach 2048, with a one-step undo for bad moves. Keyboard or swipe. No download.',
    quickStart: 'The board opens with two tiles, each a 2 or, about one time in ten, a 4. Your first merge of two 2s makes a 4 and scores 4 points, because a merge scores the value of the new tile. Only your best score is saved when you leave, not the board, so a short session is a natural fit.',
    deviceNote: 'Use the arrow keys or WASD, swipe on the board, or tap the on-screen arrows. Dragging with the mouse does not move tiles.',
    closing: '2048 Puzzle is free, runs in your browser and needs no download or account. Only your best score is kept on your own device, not the current board.',
    intro: [
      '2048 Puzzle is played on a 4 x 4 board. Each move slides every tile one way and merges equal neighbours into a tile of double the value, and a new tile appears after every move that works.',
      'Reach 2048 to win, or keep going for a higher score. If a move goes wrong, the one-step undo can take it back.'
    ],
    facts: [['Category', 'Puzzle'], ['Board', '4 x 4'], ['Goal', 'Build a 2048 tile'], ['Undo', 'One step']],
    controls: [['Arrow keys or W A S D', 'Slide all tiles up, down, left or right.'], ['Z or Backspace', 'Undo your last move.'], ['Swipe', 'Swipe on the board in the direction you want the tiles to slide.'], ['On-screen D-pad', 'Four arrow buttons below the board.']],
    tips: ['Undo right after a move you regret. It only goes back one move and cannot be used twice in a row.', 'Before each move, look for rows and columns with pairs that will merge, because each merge scores the new tile value.', 'A new tile appears after every move that works, so avoid filling the board with tiles that do not match.']
  },
  'tic-tac-toe': {
    seoTitle: 'Play Tic-Tac-Toe vs Computer or Friend',
    metaDesc: 'Play Tic-Tac-Toe free online against the computer on Easy, Medium or Invincible, or take turns with a friend on one device. Instant start, no sign-up.',
    quickStart: 'You play X and move first. Try Easy to see how the computer replies, then move up to Medium, which picks the best move about 65% of the time, and finally Invincible, where a draw is the best result you can get. Changing mode or difficulty clears the board but keeps your tally.',
    deviceNote: 'Click or tap an empty cell. There are no keyboard shortcuts, and 2 Players mode is for two people sharing one device, not online play.',
    closing: 'Tic-Tac-Toe is free, runs in your browser and needs no download or account. The win tally lasts only while the page stays open.',
    intro: [
      'Tic-Tac-Toe here has two modes: a computer opponent set to Easy, Medium or Invincible, or two players sharing one device. In the computer mode you play X and move first.',
      'A win tally is kept while the page stays open, and a completed line is highlighted so you can see exactly how the round ended.'
    ],
    facts: [['Category', 'Strategy'], ['Modes', 'Vs Computer or 2 Players'], ['Difficulty', 'Easy, Medium, Invincible'], ['Score', 'Win tally, not saved']],
    controls: [['Mouse or touch', 'Click or tap an empty cell to place your mark.'], ['VS COMPUTER / 2 PLAYERS', 'Switch mode. This starts a fresh board.'], ['Difficulty menu', 'Choose Invincible, Medium or Easy in the computer mode.'], ['New round button', 'Clear the board and start again with X to move.']],
    tips: ['You move first as X, so you can claim the centre or a corner on your first turn.', 'Every turn, check whether your opponent has two in a line with an empty third cell, and block it.', 'Against Invincible, aim not to lose. A draw is the best possible result.']
  },
  'memory-match': {
    seoTitle: 'Play Memory Match: Free Card Matching Game',
    metaDesc: 'Play Memory Match free online: flip cards to find all eight pairs on a 4 x 4 grid, with no time limit and one to three stars for fewer moves. No download.',
    quickStart: 'Sixteen cards are shuffled face down, and flipping two counts as one move. Finish in 14 moves or fewer for three stars; the lowest possible is 8 moves. The timer starts as soon as the board appears, but it never changes your stars or your best result.',
    deviceNote: 'Click or tap the cards. There are no keyboard controls and no pause button, so start a round when you have a few minutes.',
    closing: 'Memory Match is free, runs in your browser and needs no download or account. Your fewest moves is saved on your own device.',
    intro: [
      'Memory Match lays out 16 face-down cards: eight pairs of arcade symbols. Flip two at a time, remember where each symbol is hiding and clear the board.',
      'There is no time limit. Your result is rated from one to three stars by the number of moves you needed, and your fewest moves is saved on this device.'
    ],
    facts: [['Category', 'Casual'], ['Cards', '16 (8 pairs)'], ['Rating', '1 to 3 stars'], ['Best score', 'Fewest moves, saved in this browser']],
    controls: [['Mouse or touch', 'Click or tap a face-down card to flip it.'], ['Restart button', 'Reshuffle the cards and start a new game.'], ['PLAY AGAIN', 'Appears on the completion screen and starts a new game.']],
    tips: ['Early flips are for gathering information. Every card you see makes a later match easier.', 'Use rows and columns to remember positions, for example "top row, second card".', 'Stars depend on moves and not on time, so there is no reason to rush.']
  },
  'endless-runner': {
    seoTitle: 'Play Endless Runner: Free Running Game',
    metaDesc: 'Play Endless Runner free online: jump, double jump and slide across neon rooftops, dodge spikes and laser drones and collect crystals. Keyboard or touch.',
    quickStart: 'The runner starts at a steady pace and gets faster as your distance grows, up to a top speed. Your score is distance plus 25 points for every energy crystal, so a trail of three is worth 75. The hitbox is slightly forgiving, so very close misses do not always count as hits.',
    deviceNote: 'On a computer, play with the keyboard: the game area and on-screen buttons respond to touch only, not to mouse clicks.',
    closing: 'Endless Runner is free, runs in your browser and needs no download or account. Your best score is saved on your own device during the run.',
    intro: [
      'In Endless Runner your character runs forward on its own and you decide when to jump, double jump or slide. Spikes need a jump, laser drones need a slide, and energy crystals add to your score.',
      'You have a single life, so one collision ends the run. The challenge is simply how far you can get.'
    ],
    facts: [['Category', 'Action'], ['Lives', '1 (a hit ends the run)'], ['Jumps', '2 before landing'], ['Best score', 'Saved in this browser']],
    controls: [['Space, Up arrow or W', 'Jump. Press again in the air for a double jump.'], ['Down arrow or S (hold)', 'Slide. Release to stand up again.'], ['P or Esc', 'Pause and resume.'], ['Touch', 'Tap the game area to jump, or use the JUMP and SLIDE buttons.']],
    tips: ['Start your slide just before a drone reaches you and hold it until it has passed.', 'Use the double jump on a tight spike so you do not land on the next obstacle.', 'Crystals are worth a small detour, but never a collision.']
  },
  'block-puzzle': {
    seoTitle: 'Play Block Puzzle: Free Falling Blocks Game',
    metaDesc: 'Play Block Puzzle free online: rotate and drop seven falling shapes on a 10 x 20 board to clear lines, with ghost outline, hold slot and hard drop. No download.',
    quickStart: 'At level 1 a piece falls one row every 800 milliseconds, with the next piece shown in the NEXT box and your hold slot on the left. Every 10 lines raises the level, and line clears are worth 100, 300, 500 or 800 times the level, so surviving longer pays off.',
    deviceNote: 'On a computer, use the keyboard. On a phone, use the on-screen buttons below the board, because swipe gestures are not supported here.',
    closing: 'Block Puzzle is free, runs in your browser and needs no download or account. Your best score stays on your own device.',
    intro: [
      'Block Puzzle drops seven shapes onto a 10 x 20 board, one at a time. Move and rotate each piece so that it completes a full row, which then clears.',
      'A ghost outline shows where the piece will land, one piece can be held for later and a hard drop locks it instantly. The pace quickens every ten lines, and the run ends when a new piece no longer fits.'
    ],
    facts: [['Category', 'Puzzle'], ['Board', '10 x 20'], ['Shapes', '7 (I, O, T, S, Z, J, L)'], ['Hold slot', '1 piece']],
    controls: [['Left / Right arrows or A / D', 'Move the piece one cell sideways.'], ['Up arrow or W', 'Rotate clockwise.'], ['Space', 'Hard drop: send the piece to its landing spot.'], ['C or Shift', 'Hold or swap the held piece.'], ['P or Esc', 'Pause and resume.']],
    tips: ['Use the ghost outline to check the landing spot before you drop.', 'You can hold only once per turn, so keep the hold for a piece you really cannot place.', 'Keep the stack low and flat. The game is over as soon as a new piece cannot fit at the top.']
  },
  'whack-a-mole': {
    seoTitle: 'Play Whack-a-Mole: Free Reflex Game',
    metaDesc: 'Play Whack-a-Mole free online: hit moles and golden stars in a fast 30-second round, build combo multipliers and avoid the bombs. Mouse or touch. No download.',
    quickStart: 'Every 0.45 to 0.9 seconds something pops up in a random empty hole: about 58% of the time a mole, 22% a golden star and 20% a bomb. A mole scores 10 points and a star 30 before any combo bonus, and the round is over after 30 seconds.',
    deviceNote: 'Click or tap the holes. Apart from pausing, there are no keyboard controls in this game.',
    closing: 'Whack-a-Mole is free, runs in your browser and needs no download or account. Your best score stays on your own device.',
    intro: [
      'Whack-a-Mole is a 30-second reflex round on a 3 x 3 board. Moles and golden stars pop out of the holes for a moment and score when you hit them, and a combo multiplies the points.',
      'Bombs reset your combo, so a quick eye matters as much as a quick hand. A mouse or a finger is all you need.'
    ],
    facts: [['Category', 'Casual'], ['Round length', '30 seconds'], ['Holes', '9 (3 x 3)'], ['Best score', 'Saved in this browser']],
    controls: [['Mouse', 'Click a mole, star or bomb to whack it.'], ['Touch', 'Tap a mole, star or bomb.'], ['P or Esc', 'Pause and resume.']],
    tips: ['Missed moles are free, so skip a hole if hitting it would mean clicking a bomb.', 'Hit golden stars first. They disappear soonest and are worth the most.', 'Once your combo reaches 4, every hit is worth double, so protect that streak.']
  }
};

// One-line blurbs for the "More games" cards (same wording as the guide pages).
const BLURB = {
  'fruit-slice': 'A 60-second blade game with combos and bombs.',
  'snake': 'Steer a growing snake around a 22 x 22 board.',
  'brick-breaker': 'Clear three stages of bricks with a paddle and a ball.',
  'space-shooter': 'A vertical shooter with three enemy types and power-ups.',
  'puzzle-2048': 'Slide and merge tiles on a 4 x 4 board.',
  'tic-tac-toe': 'Play the computer or a friend on a 3 x 3 grid.',
  'memory-match': 'Match eight pairs of cards in as few moves as you can.',
  'endless-runner': 'Jump, double jump and slide through a neon skyline.',
  'block-puzzle': 'Clear lines on a 10 x 20 board with hold and ghost outline.',
  'whack-a-mole': 'A 30-second reflex game on a 3 x 3 board.'
};

const GA_ID = 'G-LJY94260LN';
const GA_SNIPPET = `  <!-- Google tag (gtag.js) - GA4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>
`;

const urlOf = (g) => `${ORIGIN}/game/${g.slug}`;

// Hand-picked related games (similar play style or input), so every page links to 3 others and
// every game receives exactly 3 inbound links. tests/site-structure.test.js checks the balance.
const RELATED = {
  'fruit-slice': ['whack-a-mole', 'space-shooter', 'endless-runner'],
  'snake': ['block-puzzle', 'brick-breaker', 'puzzle-2048'],
  'brick-breaker': ['snake', 'space-shooter', 'block-puzzle'],
  'space-shooter': ['endless-runner', 'fruit-slice', 'brick-breaker'],
  'puzzle-2048': ['block-puzzle', 'memory-match', 'tic-tac-toe'],
  'tic-tac-toe': ['memory-match', 'puzzle-2048', 'snake'],
  'memory-match': ['puzzle-2048', 'tic-tac-toe', 'whack-a-mole'],
  'endless-runner': ['space-shooter', 'fruit-slice', 'whack-a-mole'],
  'block-puzzle': ['snake', 'tic-tac-toe', 'memory-match'],
  'whack-a-mole': ['fruit-slice', 'endless-runner', 'brick-breaker']
};

function related(game) {
  return RELATED[game.id].map(id => ARCADE_GAMES.find(g => g.id === id));
}

// Fruit Slice keeps its markup in a <template> in index.html; the game page needs the same markup.
function fruitTemplate() {
  const m = index.match(/<template id="fruit-slice-template">[\s\S]*?<\/template>/);
  if (!m) throw new Error('fruit-slice-template not found in index.html');
  // The page already has its own <h1>; the template's start-screen title becomes an <h2> here
  // (it is styled by its class, so it looks identical). index.html's template is not touched.
  return m[0].replace('<h1 class="game-title">FRUIT SLICE</h1>', '<h2 class="game-title">FRUIT SLICE</h2>');
}

// Marquee Vault design: shared logomark used in the header and footer of every page.
const BRAND_MARK = '<svg class="vx-mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="7" fill="var(--signal)"/><path fill="var(--ink-0)" d="M6 7h5v5H6zM21 7h5v5h-5zM9 12h5v5H9zM18 12h5v5h-5zM12 17h8v5h-8zM13 22h6v4h-6z"/></svg>';

// ---- injected by SEO update: per-game FAQs (play-intent questions; the guides answer the rules questions) ----
const FAQ = {
  'fruit-slice': [
    ['How long does a Fruit Slice round last?', 'A round is 60 seconds long. It can end sooner if you slice bombs three times, because every bomb costs one of your three lives.'],
    ['Why did my slice not count?', 'Only a real swipe slices. A pointer resting on a fruit does nothing, so keep the mouse or your finger moving through the fruit.'],
    ['Can I change the look of the blade?', 'Yes. The start screen offers four blade glow colours: Electric Cyan, Flame Red, Golden Sun and Neon Purple. Your choice is remembered in this browser.'],
    ['What happens if I switch to another tab mid-round?', 'The game pauses by itself when you leave the browser tab, so your round is still waiting when you come back.']
  ],
  'snake': [
    ['Is there a difficulty setting in Neon Snake?', 'No. There are no difficulty settings or extra modes. The challenge rises on its own, because the snake gets faster as you eat apples until it reaches a fixed top speed.'],
    ['Does the golden star count towards the next star?', 'No. Only apples count towards the next star, so picking one up does not bring the following star any closer.'],
    ['What happens to the golden star if I pause?', 'You can pause with P or Esc and resume with the same key, but the star\u2019s 6-second timer keeps running while the game is paused.'],
    ['What does the game-over screen tell me?', 'It shows your final score, snake length, apples eaten and your best score, along with how the run ended: hitting the wall or running into yourself.']
  ],
  'brick-breaker': [
    ['Do I get time to aim the first ball?', 'No. The ball launches as soon as you press LAUNCH BALL, and the next ball launches straight away after you lose a life, so get the paddle in position first.'],
    ['How do I send the ball into the corners?', 'Where the ball lands on the paddle sets its bounce angle. Near the centre it goes almost straight up, and near either edge it leaves at a steep angle of up to 70 degrees.'],
    ['Which bricks take more than one hit?', 'Gold bricks take 3 hits, cyan and purple take 2, and red and green take 1. A brick that needs more hits shows the hits remaining as a small number.'],
    ['What happens when I clear a stage?', 'The next layout is built and the ball and paddle reset, while your score and remaining lives carry over. Clearing all bricks on stage 3 wins the game.']
  ],
  'space-shooter': [
    ['Which enemy should I shoot first?', 'The heavy cruiser. It is the only enemy that fires back, and it takes three hits to destroy, so it is worth dealing with early.'],
    ['What do the enemy colours mean?', 'Red drones take one hit and score 20 points, orange heavy cruisers take three hits and score 50, and grey asteroids take two hits and score 30.'],
    ['How long does the triple shot last?', 'A triple shot lasts 9 seconds. About 16% of destroyed enemies drop a power-up, and you collect it by flying into it.'],
    ['What happens when I get hit?', 'A cruiser bolt or a collision costs 1 shield point and gives you 1.2 seconds of invulnerability. That window is best used to reposition rather than to take more risk.']
  ],
  'puzzle-2048': [
    ['Which keys control 2048 Puzzle?', 'Arrow keys or W A S D slide the tiles, Z or Backspace undoes your last move, and Space or Enter starts a new game after a game over.'],
    ['How is the score worked out?', 'Each merge scores the value of the new tile, so merging two 8s gives +16. Sliding without a merge scores nothing.'],
    ['Can I drag tiles with the mouse?', 'No. Dragging with the mouse does not move tiles. Use the keyboard or click the on-screen arrow buttons, or swipe on a touch screen.'],
    ['What happens if I press a direction that cannot move?', 'No new tile is added, so nothing is lost. It does count as your latest step for Undo, though, so Undo after a blocked press will not take you back any further.']
  ],
  'tic-tac-toe': [
    ['Which difficulty should I start with?', 'Easy always plays a random legal move, and Medium plays the best move about 65% of the time. Invincible looks ahead through every continuation, so the best you can get against it is a draw.'],
    ['Who moves first?', 'X always moves first. Against the computer you are X, and in 2 Players mode X and O take turns on the same screen.'],
    ['What does the win tally keep track of?', 'X wins, ties and O wins while the page stays open. Changing mode or difficulty gives you a fresh board but keeps the tally, and reloading the page resets it.'],
    ['How do I know a round is over?', 'The status line announces the result, and a completed row, column or diagonal is highlighted in gold. A full board with no line is a draw.']
  ],
  'memory-match': [
    ['How many moves does a perfect game take?', 'Eight, which means finding every pair on the first try. Fourteen moves or fewer earns the full three stars.'],
    ['Can I pause Memory Match?', 'No. There is no pause button, and the timer starts when the board appears. Because time does not affect your stars or your best score, there is no penalty for taking it slowly.'],
    ['Which symbols are on the cards?', 'Eight symbols, each on two cards: \uD83D\uDC7E \uD83D\uDE80 \uD83D\uDC8E \u26A1 \uD83C\uDFAE \uD83C\uDF52 \uD83D\uDCA3 and \uD83D\uDC51.'],
    ['How long do mismatched cards stay visible?', 'They flip back after about three-quarters of a second, and you cannot flip anything else during that moment.']
  ],
  'endless-runner': [
    ['How fast does the runner get?', 'Speed rises with your distance until it reaches a top speed after about 4,400 m, and the gaps between obstacles get shorter at higher speeds.'],
    ['Are close calls forgiven?', 'Slightly. The collision box is a little forgiving, so very close misses do not always count as hits.'],
    ['Where do the energy crystals appear?', 'About 70% of the time a trail of three crystals follows an obstacle. After a drone they sit near the ground, and after a spike they hang at jump height. Each crystal is worth 25 points.'],
    ['What is the easiest way to play on a phone?', 'Tap the game area to jump, which is quicker than reaching for the JUMP button, and hold the SLIDE button to pass under drones.']
  ],
  'block-puzzle': [
    ['How does the Hold slot work?', 'It stores one piece. You can hold once per turn: the first hold brings in the next piece, and later holds swap the current piece with the held one after the next piece has locked.'],
    ['What is the best way to score big?', 'Clear several lines at once. Four lines in one go is worth 800 x your level, compared with 100 x your level for a single line.'],
    ['Are there swipe controls on a phone?', 'No. There are no swipe gestures on the board. Use the on-screen buttons for left, rotate, right, hold, soft drop and hard drop.'],
    ['Why did my next pieces drop straight away?', 'Space is the hard drop, and holding the key down may repeat it and drop the following pieces too. Press it once per piece.']
  ],
  'whack-a-mole': [
    ['What appears in the holes?', 'Every 0.45 to 0.9 seconds something pops up in a random empty hole. Roughly 58% of the time it is a mole, 22% a golden star and 20% a bomb.'],
    ['Does missing a mole break my combo?', 'No. A mole or star that gets away does not break it, and clicking an empty hole does nothing. Only hitting a bomb resets the combo.'],
    ['How long do moles stay up?', 'About 0.9 to 1.3 seconds. Golden stars are quicker at 0.75 seconds, and bombs stay for about 1.1 seconds.'],
    ['What happens when I pause?', 'Press P or Esc to pause and again to resume. The 30-second clock stays frozen, but moles that are showing when you pause may disappear in the meantime.']
  ]
};

function sameCategory(game) {
  return ARCADE_GAMES.filter(g => g.category === game.category && g.id !== game.id);
}

function categoryLine(game) {
  const cat = game.category.charAt(0).toUpperCase() + game.category.slice(1);
  const others = sameCategory(game);
  if (!others.length) return { text: `It is the only ${game.category} game in the vault.`, cat };
  return { text: `It is one of ${others.length + 1} ${game.category} games in the vault, together with ${others.map(o => o.title).join(' and ')}.`, cat };
}
// ---- end of injected block ----

function page(game) {
  const c = GAMES[game.id];
  const url = urlOf(game);
  const title = `${c.seoTitle} | Neo Arcade Vault`;
  const h1 = `Play ${game.title} Online`;
  const cat = game.category.charAt(0).toUpperCase() + game.category.slice(1);
  const cols = String(game.gradient || '').match(/#[0-9a-fA-F]{3,8}/g) || [];
  const themeStyle = `--m1:${cols[0] || '#ff5c39'};--m2:${cols[1] || cols[0] || '#ff8a4c'};--kicker:'${game.title} \u00b7 ${cat}'`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'VideoGame', '@id': `${url}#game`, name: game.title, description: c.metaDesc, url,
        genre: [cat], gamePlatform: 'Web browser', applicationCategory: 'Game', playMode: ['SinglePlayer'].concat(game.id === 'tic-tac-toe' ? ['MultiPlayer'] : []),
        inLanguage: 'en', isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: 'Neo Arcade Vault', url: `${ORIGIN}/` },
        potentialAction: { '@type': 'PlayAction', target: url }
      },
      {
        '@type': 'FAQPage', '@id': `${url}#faq`,
        mainEntity: FAQ[game.id].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Games', item: `${ORIGIN}/games` },
          { '@type': 'ListItem', position: 3, name: `Play ${game.title}`, item: url }
        ]
      }
    ]
  };

  const scripts = ['site-shell.js'].concat(SCRIPTS[game.id], ['arcade.js']).map(s => `  <script src="/js/${s}"></script>`).join('\n');
  const tpl = game.id === 'fruit-slice' ? `\n  <!-- Markup for the Fruit Slice engine (same template the arcade portal uses) -->\n  ${fruitTemplate()}\n` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0f0d0b">
${GA_SNIPPET}  <title>${esc(title)}</title>
  <meta name="description" content="${esc(c.metaDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Neo Arcade Vault">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(c.metaDesc)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(c.metaDesc)}">

  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/arcade.css">
  <link rel="stylesheet" href="/css/pages.css">
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/vault.css">
</head>
<body data-game-page="${game.id}">
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <div class="arcade-background" aria-hidden="true">
    <div class="arcade-grid"></div>
    <div class="ambient-flare flare-1"></div>
    <div class="ambient-flare flare-2"></div>
  </div>

  <div id="portal-app" class="vault vault-game" style="${esc(themeStyle)}">
    <header>
      <nav class="arcade-navbar" aria-label="Main navigation">
        <a class="nav-brand" href="/" aria-label="Neo Arcade Vault - home">
          ${BRAND_MARK}
          <span class="brand-text">NEO ARCADE</span>
          <span class="brand-badge">VAULT</span>
        </a>
        <div class="vx-menu" id="vx-menu">
        <div class="nav-links">
        <a href="/">Home</a>
        <a href="/games">Games</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        </div>
        </div>
        <button class="vx-menu-btn" id="nav-btn-menu" type="button" aria-label="Menu" aria-expanded="false" aria-controls="vx-menu"><svg class="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </nav>
    </header>

    <div id="game-portal-view" class="game-page-view">
      <main id="main-content" class="game-main">
        <div class="vx-stage">
        <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/games">Games</a> &rsaquo; <span>${esc(`Play ${game.title}`)}</span></nav>

        <div class="game-view-header">
          <div class="gv-left">
            <a class="btn-back-arcade" href="/games">&lsaquo; All games</a>
            <div class="gv-title-meta">
              <h1 class="gv-title">${esc(h1)}</h1>
              <span class="gv-cat-badge">${esc(cat)}</span>
            </div>
          </div>
          <div class="gv-actions" id="game-actions"></div>
        </div>

        <div id="game-viewport" class="game-viewport">
          <p class="game-noscript">${esc(game.title)} needs JavaScript to run. Please enable it in your browser, or read the <a href="/play/${game.slug}">${esc(game.title)} guide</a> for the rules.</p>
        </div>

        <div class="game-details-box">
          <div class="gd-col">
            <h2>How to play ${esc(game.title)} online</h2>
            <p>${esc(game.controls)}</p>
            <p style="margin-top: 8px; color: var(--text-muted); font-size: 0.88rem;">${esc(c.deviceNote)}</p>
            <p style="margin-top: 8px; font-size: 0.88rem;"><a href="/play/${game.slug}">Read the full ${esc(game.title)} guide: rules, scoring and tips</a></p>
          </div>
          <div class="gd-col stats-box">
            <h2>Your ${esc(game.title)} records</h2>
            <div class="gd-stat-row"><span>Category</span><span style="color: var(--accent-2);">${esc(cat)}</span></div>
            <div class="gd-stat-row"><span>${esc(game.scoreLabel)}</span><span id="gd-best-score" style="color: var(--yellow);">${game.scoreKey ? 'No score yet' : 'Not tracked'}</span></div>
            <div class="gd-stat-row"><span>Saved</span><span>This device only</span></div>
          </div>
        </div>
        </div>

        <div class="game-page-info">
          <section class="content-card prose" aria-labelledby="about-game">
            <h2 id="about-game">About ${esc(game.title)}</h2>
${c.intro.map(p => `            <p>${esc(p)}</p>`).join('\n')}
            <p>${esc(c.closing)} ${esc(categoryLine(game).text)} See the <a href="/games#${game.category}">${esc(categoryLine(game).cat)} games</a> or the full <a href="/games">Neo Arcade Vault games collection</a>.</p>
          </section>

          <section class="content-card prose" aria-labelledby="game-quickstart">
            <h2 id="game-quickstart">Quick start for ${esc(game.title)}</h2>
            <p>${esc(c.quickStart)}</p>
          </section>

          <section aria-labelledby="game-facts">
            <h2 id="game-facts" class="sr-only">${esc(game.title)} at a glance</h2>
            <div class="card-grid">
${c.facts.map(([k, v]) => `              <div class="info-card">\n                <h3>${esc(k)}</h3>\n                <p>${esc(v)}</p>\n              </div>`).join('\n')}
            </div>
          </section>

          <section class="content-card prose" aria-labelledby="game-controls">
            <h2 id="game-controls">${esc(game.title)} controls</h2>
            <div class="table-scroll">
              <table>
                <thead><tr><th scope="col">Input</th><th scope="col">What it does</th></tr></thead>
                <tbody>
${c.controls.map(([k, v]) => `                  <tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('\n')}
                </tbody>
              </table>
            </div>
          </section>

          <section class="content-card prose" aria-labelledby="game-tips">
            <h2 id="game-tips">Quick tips for ${esc(game.title)}</h2>
            <ul>
${c.tips.map(t => `              <li>${esc(t)}</li>`).join('\n')}
            </ul>
            <p>Want the full rules, scoring table and answers to common questions? Read the <a href="/play/${game.slug}">${esc(game.title)} guide</a>.</p>
          </section>

          <section class="content-card prose" aria-labelledby="game-faq">
            <h2 id="game-faq">${esc(game.title)} questions answered</h2>
${FAQ[game.id].map(([q, a]) => `            <div class="faq-item">\n              <h3>${esc(q)}</h3>\n              <p>${esc(a)}</p>\n            </div>`).join('\n')}
          </section>

          <section class="content-card prose" aria-labelledby="more-games">
            <h2 id="more-games">More free games like ${esc(game.title)}</h2>
            <div class="card-grid">
${related(game).map(o => `              <article class="info-card">\n                <h3><a href="/game/${o.slug}">Play ${esc(o.title)} online</a></h3>\n                <p>${esc(BLURB[o.id])}</p>\n                <p><a href="/play/${o.slug}">${esc(o.title)} guide: rules and tips</a></p>\n              </article>`).join('\n')}
            </div>
            <div class="btn-row">
              <a class="btn-link secondary" href="/play/${game.slug}">${esc(game.title)} guide: rules, scoring and tips</a>
              <a class="btn-link secondary" href="/games">Browse all 10 free browser games</a>
            </div>
          </section>
        </div>
      </main>
    </div>

    <footer class="arcade-footer site-footer">
      <div class="footer-brand">${BRAND_MARK} NEO ARCADE</div>
      <p>A free collection of 10 browser mini-games. No downloads, no sign-up.</p>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a>
        <a href="/games">Games</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms &amp; Conditions</a>
      </nav>
      <p class="footer-copy">&copy; <span data-year>2026</span> Neo Arcade Vault. All rights reserved.</p>
    </footer>
  </div>
${tpl}
${scripts}
</body>
</html>
`;
}

function build() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const game of ARCADE_GAMES) {
    if (!GAMES[game.id]) throw new Error(`No page content for ${game.id}`);
    fs.writeFileSync(path.join(OUT_DIR, `${game.slug}.html`), page(game));
    console.log(`wrote game/${game.slug}.html`);
  }
}

if (require.main === module) build();
module.exports = { build, page, GAMES, urlOf };
