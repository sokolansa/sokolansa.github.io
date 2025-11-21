const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const timerDisplay = document.getElementById('timer');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const finalTime = document.getElementById('finalTime');
const finalSpeed = document.getElementById('finalSpeed');
const pauseOverlay = document.getElementById('pauseOverlay');

let snake = [{ x: 10, y: 10 }];
let direction = null;
let food = { x: 5, y: 5 };
const startSound = new Audio("Resources/Sound/Sound Effects/Start.wav");
const eatSound = new Audio("Resources/Sound/Sound Effects/Eat.wav");
const gameOverSound = new Audio("Resources/Sound/Sound Effects/Death.wav");

let score = 0;
let baseSpeed = 300;
let speed = baseSpeed;
let gameStarted = false;
let shiftHeld = false;
let startTime = null;
let paused = false;
let pauseStart = null;
let totalPausedTime = 0;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  if (startTime && !paused) {
    const elapsed = Date.now() - startTime - totalPausedTime;
    timerDisplay.textContent = 'Time: ' + formatTime(elapsed);
  }
}

function drawStartScreen() {
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Press Arrow Key to Start', 80, 130);

  ctx.font = '16px Arial';
  ctx.fillText('Controls:', 150, 170);
  ctx.fillText('Arrow Keys - Move Snake', 110, 190);
  ctx.fillText('Shift - Speed Boost (Hold)', 100, 210);
  ctx.fillText('Escape - Pause/Unpause', 110, 230);
  ctx.fillText('Enter - Return to Title (Game Over)', 80, 250);
}

function showGameOverScreen() {
  const elapsed = Date.now() - startTime - totalPausedTime;
  finalScore.textContent = 'Final Score: ' + score;
  finalTime.textContent = 'Time Survived: ' + formatTime(elapsed);
  finalSpeed.textContent = 'Timescale: ' + (baseSpeed / speed).toFixed(1) + 'x';
  gameOverScreen.style.display = 'flex';
  canvas.style.display = 'none';
  timerDisplay.style.display = 'none';
  pauseOverlay.style.display = 'none';

  document.getElementById('scoreDisplay').style.display = 'none';
  document.getElementById('timescaleDisplay').style.display = 'none';
  document.getElementById('speedDisplay').style.display = 'none';

}

function returnToTitle() {
  gameOverScreen.style.display = 'none';
  canvas.style.display = 'block';
  pauseOverlay.style.display = 'none';
  snake = [{ x: 10, y: 10 }];
  direction = null;
  score = 0;
  speed = baseSpeed;
  gameStarted = false;
  startTime = null;
  paused = false;
  pauseStart = null;
  totalPausedTime = 0;
  updateTimer();
  gameLoop();
}

function gameLoop() {
  if (paused) {
    setTimeout(gameLoop, 100);
    return;
  }

  let currentSpeed = shiftHeld ? Math.max(30, speed * 0.75) : speed;

  updateTimer();

  if (!direction) {
    drawStartScreen();
    setTimeout(gameLoop, currentSpeed);
    return;
  } else {
    document.getElementById('timer').style.display = 'flex';

    document.getElementById('scoreDisplay').style.display = 'flex';
    document.getElementById('timescaleDisplay').style.display = 'flex';
    document.getElementById('speedDisplay').style.display = 'flex';
  }

  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  if (
    head.x < 0 || head.x >= 20 ||
    head.y < 0 || head.y >= 20 ||
    snake.some(segment => segment.x === head.x && segment.y === head.y)
  ) {
    gameOverSound.play();
    showGameOverScreen();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    eatSound.play();
    speed = Math.max(50, speed - 5);
    food = {
      x: Math.floor(Math.random() * 20),
      y: Math.floor(Math.random() * 20)
    };
  } else {
    snake.pop();
  }

  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'lime';
  snake.forEach(segment => {
    ctx.fillRect(segment.x * 20, segment.y * 20, 18, 18);
  });

  ctx.fillStyle = 'red';
  ctx.fillRect(food.x * 20, food.y * 20, 18, 18);

  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  
  document.getElementById('scoreDisplay').textContent = 'Score: ' + score;
  document.getElementById('timescaleDisplay').textContent = 'Timescale: ' + (baseSpeed / speed).toFixed(1) + 'x';
  document.getElementById('speedDisplay').textContent = 'Current Speed: ' + currentSpeed.toFixed(0) + 'ms';

  setTimeout(gameLoop, currentSpeed);
}

document.addEventListener('keydown', e => {
  if (!gameStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    startSound.play();
    gameStarted = true;
    startTime = Date.now();
  }

  if (e.key === 'Shift') {
    shiftHeld = true;
  }

  if (e.key === 'Escape') {
    paused = !paused;
    if (paused) {
      pauseStart = Date.now();
      pauseOverlay.style.display = 'flex';
    } else {
      totalPausedTime += Date.now() - pauseStart;
      pauseOverlay.style.display = 'none';
    }
  }

  if (e.key === 'Enter' && gameOverScreen.style.display === 'flex') {
    returnToTitle();
  }

  switch (e.key) {
    case 'ArrowUp': if (!direction || direction.y === 0) direction = { x: 0, y: -1 }; break;
    case 'ArrowDown': if (!direction || direction.y === 0) direction = { x: 0, y: 1 }; break;
    case 'ArrowLeft': if (!direction || direction.x === 0) direction = { x: -1, y: 0 }; break;
    case 'ArrowRight': if (!direction || direction.x === 0) direction = { x: 1, y: 0 }; break;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'Shift') {
    shiftHeld = false;
  }
});

gameLoop();