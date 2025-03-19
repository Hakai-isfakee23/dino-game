const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game constants
const GRAVITY = 0.8;
const JUMP_FORCE = -18;
const GAME_SPEED = 5;
const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT = 60;
const MIN_OBSTACLE_DISTANCE = 400;
const CLOUD_SPEED = 2;
const ROCKET_SPEED = 6;
const FAST_FALL_MULTIPLIER = 2.5;
const ROCKET_OFFSET = 200;

// Rocket heights
const ROCKET_HEIGHT = 20;
const ROCKET_WIDTH = 40;
const ROCKET_POSITIONS = {
  GROUND: canvas.height - OBSTACLE_HEIGHT - ROCKET_HEIGHT - 30, // Ground level rocket for ducking
};

// Dino properties
const DINO_BODY_HEIGHT = 60;
const DINO_BODY_WIDTH = 60;
const DINO_LEG_HEIGHT = 20;
const GROUND_OFFSET = 0;
const DEFLATED_SCALE = 0.5; // More squashed when pressing S

// Sun properties
const SUN_X = canvas.width - 80;
const SUN_Y = 80;
const SUN_RADIUS = 40;
const SUN_RAY_LENGTH = 20;

// Game state
let score = 0;
let lives = 3;
let gameOver = false;
let isJumping = false;
let isDeflated = false;
let velocityY = 0;
let dinoY = canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET;
let obstacles = [];
let clouds = [];
let rockets = [];
let gameStarted = false;
let invincibleTimer = 0;
let lastScoreUpdate = 0;
const INVINCIBLE_DURATION = 90; // About 1.5 seconds of invincibility after getting hit
const SCORE_INTERVAL = 10; // Update score every 10ms (0.01s)

// Event listeners
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (!gameStarted) {
      startGame();
    } else if (gameOver) {
      resetGame();
    } else if (!isJumping) {
      jump();
    }
  } else if (event.code === "KeyS" && !gameOver && gameStarted) {
    isDeflated = true;
    if (isJumping) {
      velocityY = velocityY * FAST_FALL_MULTIPLIER;
    }
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "KeyS") {
    isDeflated = false;
  }
});

// Game functions
function startGame() {
  gameStarted = true;
  gameOver = false;
  resetGame();
}

function jump() {
  isJumping = true;
  velocityY = JUMP_FORCE;
}

function resetGame() {
  score = 0;
  lives = 3;
  gameOver = false;
  obstacles = [];
  clouds = [];
  rockets = [];
  isJumping = false;
  isDeflated = false;
  velocityY = 0;
  invincibleTimer = 0;
  dinoY = canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET;
  gameStarted = true;
}

function createObstacle() {
  // Check if there's enough space for a new obstacle
  const lastObstacle = obstacles[obstacles.length - 1];
  if (lastObstacle && lastObstacle.x > canvas.width - MIN_OBSTACLE_DISTANCE) {
    return; // Don't create new obstacle if there isn't enough space
  }

  // Check for nearby ground rockets
  const nearbyGroundRocket = rockets.some((rocket) => {
    return (
      rocket.y === ROCKET_POSITIONS.GROUND &&
      rocket.x > canvas.width - MIN_OBSTACLE_DISTANCE &&
      rocket.x < canvas.width + MIN_OBSTACLE_DISTANCE
    );
  });

  // Don't spawn cactus if there's a ground rocket nearby
  if (nearbyGroundRocket) {
    return;
  }

  const obstacleX = canvas.width;

  obstacles.push({
    x: obstacleX,
    y: canvas.height - OBSTACLE_HEIGHT,
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
  });
}

function createCloud() {
  const cloudHeight = 40 + Math.random() * 30; // Random cloud height
  const cloudWidth = 60 + Math.random() * 40; // Random cloud width
  const cloudY = 50 + Math.random() * 100; // Random cloud height position

  clouds.push({
    x: canvas.width,
    y: cloudY,
    width: cloudWidth,
    height: cloudHeight,
  });
}

function createRocket(xPosition = canvas.width) {
  // Check for nearby cacti
  const nearbyCactus = obstacles.some((obstacle) => {
    return Math.abs(obstacle.x - xPosition) < MIN_OBSTACLE_DISTANCE;
  });

  // Don't spawn rocket if there's a cactus nearby
  if (nearbyCactus) {
    return;
  }

  // Only spawn ground rockets now
  const selectedPosition = ROCKET_POSITIONS.GROUND;

  rockets.push({
    x: xPosition,
    y: selectedPosition,
    width: ROCKET_WIDTH,
    height: ROCKET_HEIGHT,
  });
}

function drawCloud(cloud) {
  ctx.fillStyle = "#B0E2FF"; // Light blue color

  // Draw main cloud body
  ctx.beginPath();
  ctx.arc(
    cloud.x + cloud.width / 3,
    cloud.y + cloud.height / 2,
    cloud.height / 2,
    0,
    Math.PI * 2
  );
  ctx.arc(
    cloud.x + (cloud.width * 2) / 3,
    cloud.y + cloud.height / 2,
    cloud.height / 2,
    0,
    Math.PI * 2
  );
  ctx.arc(
    cloud.x + cloud.width / 2,
    cloud.y + cloud.height / 2,
    cloud.height / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawMountains() {
  ctx.beginPath();
  MOUNTAIN_POINTS.forEach((point) => {
    ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.stroke();
}

function drawRocket(rocket) {
  ctx.fillStyle = "#FF4444";
  // Rocket body
  ctx.fillRect(rocket.x, rocket.y, rocket.width, rocket.height);

  // Rocket nose
  ctx.beginPath();
  ctx.moveTo(rocket.x + rocket.width, rocket.y + rocket.height / 2);
  ctx.lineTo(rocket.x + rocket.width + 10, rocket.y + rocket.height / 2);
  ctx.lineTo(rocket.x + rocket.width, rocket.y + rocket.height);
  ctx.fill();

  // Rocket flames
  ctx.fillStyle = "#FFA500";
  ctx.beginPath();
  ctx.moveTo(rocket.x, rocket.y + rocket.height / 4);
  ctx.lineTo(rocket.x - 15, rocket.y + rocket.height / 2);
  ctx.lineTo(rocket.x, rocket.y + (rocket.height * 3) / 4);
  ctx.fill();
}

function drawDino() {
  const scale = isDeflated ? DEFLATED_SCALE : 1;
  const originalHeight = DINO_BODY_HEIGHT;
  const scaledHeight = originalHeight * scale;

  // Draw main body
  ctx.fillStyle = "#535353";
  ctx.fillRect(50, dinoY, DINO_BODY_WIDTH, scaledHeight);

  // Draw legs (connected to body bottom)
  ctx.fillStyle = "#535353";
  // Left leg
  ctx.fillRect(
    50 + DINO_BODY_WIDTH * 0.2,
    dinoY + scaledHeight,
    10,
    DINO_LEG_HEIGHT
  );
  // Right leg
  ctx.fillRect(
    50 + DINO_BODY_WIDTH * 0.7,
    dinoY + scaledHeight,
    10,
    DINO_LEG_HEIGHT
  );

  // Draw arms (scaled and relative to body)
  const armHeight = 8 * scale;
  // Left arm
  ctx.fillRect(
    50 + DINO_BODY_WIDTH * 0.2,
    dinoY + scaledHeight * 0.4,
    15,
    armHeight
  );
  // Right arm
  ctx.fillRect(
    50 + DINO_BODY_WIDTH * 0.6,
    dinoY + scaledHeight * 0.4,
    15,
    armHeight
  );

  // Draw horns (scaled)
  ctx.fillStyle = "#FF0000";
  const hornHeight = 20 * scale;
  // Left horn
  ctx.beginPath();
  ctx.moveTo(50 + DINO_BODY_WIDTH * 0.3, dinoY);
  ctx.lineTo(50 + DINO_BODY_WIDTH * 0.3, dinoY - hornHeight);
  ctx.lineTo(50 + DINO_BODY_WIDTH * 0.4, dinoY);
  ctx.fill();
  // Right horn
  ctx.beginPath();
  ctx.moveTo(50 + DINO_BODY_WIDTH * 0.6, dinoY);
  ctx.lineTo(50 + DINO_BODY_WIDTH * 0.6, dinoY - hornHeight);
  ctx.lineTo(50 + DINO_BODY_WIDTH * 0.7, dinoY);
  ctx.fill();

  // Draw eyes (scaled)
  const eyeRadius = 8 * scale;
  const pupilRadius = 4 * scale;
  // First eye
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(
    50 + DINO_BODY_WIDTH * 0.7,
    dinoY + scaledHeight * 0.3,
    eyeRadius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // First pupil
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(
    50 + DINO_BODY_WIDTH * 0.7,
    dinoY + scaledHeight * 0.3,
    pupilRadius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Second eye
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(
    50 + DINO_BODY_WIDTH * 0.3,
    dinoY + scaledHeight * 0.3,
    eyeRadius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Second pupil
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(
    50 + DINO_BODY_WIDTH * 0.3,
    dinoY + scaledHeight * 0.3,
    pupilRadius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw sharp teeth (scaled)
  ctx.fillStyle = "white";
  ctx.beginPath();
  const toothHeight = scaledHeight * 0.1;
  // First tooth
  ctx.moveTo(50 + DINO_BODY_WIDTH * 0.6, dinoY + scaledHeight * 0.7);
  ctx.lineTo(
    50 + DINO_BODY_WIDTH * 0.7,
    dinoY + scaledHeight * 0.7 + toothHeight
  );
  ctx.lineTo(50 + DINO_BODY_WIDTH * 0.8, dinoY + scaledHeight * 0.7);
  // Second tooth
  ctx.moveTo(50 + DINO_BODY_WIDTH * 0.4, dinoY + scaledHeight * 0.7);
  ctx.lineTo(
    50 + DINO_BODY_WIDTH * 0.5,
    dinoY + scaledHeight * 0.7 + toothHeight
  );
  ctx.lineTo(50 + DINO_BODY_WIDTH * 0.6, dinoY + scaledHeight * 0.7);
  // Third tooth
  ctx.moveTo(50 + DINO_BODY_WIDTH * 0.2, dinoY + scaledHeight * 0.7);
  ctx.lineTo(
    50 + DINO_BODY_WIDTH * 0.3,
    dinoY + scaledHeight * 0.7 + toothHeight
  );
  ctx.lineTo(50 + DINO_BODY_WIDTH * 0.4, dinoY + scaledHeight * 0.7);
  ctx.fill();
}

function drawHeart(x, y, filled) {
  ctx.fillStyle = filled ? "#FF0000" : "#808080";
  ctx.beginPath();

  // Left half of heart
  ctx.moveTo(x + 15, y + 5);
  ctx.bezierCurveTo(x + 15, y + 5, x + 12, y, x + 7.5, y);
  ctx.bezierCurveTo(x + 2, y, x, y + 3.5, x, y + 7.5);
  ctx.bezierCurveTo(x, y + 12, x + 7.5, y + 19, x + 15, y + 24);

  // Right half of heart
  ctx.moveTo(x + 15, y + 5);
  ctx.bezierCurveTo(x + 15, y + 5, x + 18, y, x + 22.5, y);
  ctx.bezierCurveTo(x + 28, y, x + 30, y + 3.5, x + 30, y + 7.5);
  ctx.bezierCurveTo(x + 30, y + 12, x + 22.5, y + 19, x + 15, y + 24);

  ctx.fill();
}

function update() {
  if (!gameStarted || gameOver) return;

  // Update invincibility timer
  if (invincibleTimer > 0) {
    invincibleTimer--;
  }

  // Add score over time (every 0.01s)
  const currentTime = Date.now();
  if (currentTime - lastScoreUpdate >= SCORE_INTERVAL) {
    score++;
    lastScoreUpdate = currentTime;
  }

  // Update dino position
  if (isJumping) {
    dinoY += velocityY;
    velocityY += GRAVITY * (isDeflated ? FAST_FALL_MULTIPLIER : 1);

    const groundY =
      canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET;
    if (dinoY >= groundY) {
      dinoY = groundY;
      isJumping = false;
      velocityY = 0;
    }
  }

  // Create new clouds
  if (Math.random() < 0.005) {
    createCloud();
  }

  // Create new rockets only after scores
  if (score >= 500 && Math.random() < 0.0001) {
    createRocket();
  } else if (score >= 1000 && Math.random() < 0.0002) {
    createRocket();
  } else if (score >= 2000 && Math.random() < 0.0003) {
    createRocket();
  } else if (score >= 3000 && Math.random() < 0.0004) {
    createRocket();
  } else if (score >= 4000 && Math.random() < 0.0005) {
    createRocket();
  } else if (score >= 5000 && Math.random() < 0.001) {
    createRocket();
  } else if (score >= 6000 && Math.random() < 0.002) {
    createRocket();
  }

  // Update clouds
  clouds.forEach((cloud, index) => {
    cloud.x -= CLOUD_SPEED;
    if (cloud.x + cloud.width < 0) {
      clouds.splice(index, 1);
    }
  });

  // Update rockets
  rockets.forEach((rocket, index) => {
    rocket.x -= ROCKET_SPEED;
    if (rocket.x + rocket.width < 0) {
      rockets.splice(index, 1);
      // Add 20 points for successfully dodging a ground rocket
      score += 20;
    }
  });

  // Update obstacles
  if (Math.random() < 0.02) {
    createObstacle();
  }

  obstacles.forEach((obstacle, index) => {
    obstacle.x -= GAME_SPEED;
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(index, 1);
      // Add 5 points for successfully jumping over a cactus
      score += 5;
    }
  });

  // Check collisions with obstacles and rockets
  const dinoHeight = isDeflated
    ? DINO_BODY_HEIGHT * DEFLATED_SCALE
    : DINO_BODY_HEIGHT;
  const dinoHitbox = {
    x: 50,
    y: dinoY,
    width: DINO_BODY_WIDTH,
    height: dinoHeight,
  };

  // Check collisions only if not invincible
  if (invincibleTimer === 0) {
    // Check collisions with obstacles
    obstacles.forEach((obstacle) => {
      if (checkCollision(dinoHitbox, obstacle)) {
        lives--;
        if (lives <= 0) {
          gameOver = true;
        } else {
          invincibleTimer = INVINCIBLE_DURATION;
        }
      }
    });

    // Check collisions with rockets
    rockets.forEach((rocket) => {
      if (checkCollision(dinoHitbox, rocket)) {
        lives--;
        if (lives <= 0) {
          gameOver = true;
        } else {
          invincibleTimer = INVINCIBLE_DURATION;
        }
      }
    });
  }
}

function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

function drawSun() {
  // Draw sun circle
  ctx.beginPath();
  ctx.arc(SUN_X, SUN_Y, SUN_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD700";
  ctx.fill();

  // Draw sun rays
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const startX = SUN_X + Math.cos(angle) * SUN_RADIUS;
    const startY = SUN_Y + Math.sin(angle) * SUN_RADIUS;
    const endX = SUN_X + Math.cos(angle) * (SUN_RADIUS + SUN_RAY_LENGTH);
    const endY = SUN_Y + Math.sin(angle) * (SUN_RADIUS + SUN_RAY_LENGTH);

    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
  }
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function draw() {
  // Clear canvas
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw sun
  drawSun();

  // Draw clouds
  clouds.forEach(drawCloud);

  // Draw rockets
  rockets.forEach(drawRocket);

  // Draw dino (flash if invincible)
  if (invincibleTimer === 0 || Math.floor(invincibleTimer / 4) % 2 === 0) {
    drawDino();
  }

  // Draw obstacles (green cacti)
  ctx.fillStyle = "#16d92c";
  obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  // Draw score
  ctx.fillStyle = "#535353";
  ctx.font = "24px Arial";
  ctx.fillText(`Score: ${score}`, 30, 40);

  // Draw hearts
  for (let i = 0; i < 3; i++) {
    drawHeart(30 + i * 40, 60, i < lives);
  }

  // Draw messages
  if (!gameStarted) {
    ctx.fillStyle = "rgba(83, 83, 83, 0.8)";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";

    // Draw subtitle
    ctx.fillStyle = "#000000";
    ctx.font = "bold 28px Arial";
    ctx.fillText(
      "A goofy ahh google chrome dino inspired game",
      canvas.width / 2,
      canvas.height / 2 - 40
    );

    // Draw main text
    ctx.fillStyle = "rgba(83, 83, 83, 0.8)";
    ctx.font = "24px Arial";
    ctx.fillText(
      "Press Spacebar to start the game",
      canvas.width / 2,
      canvas.height / 2
    );
    ctx.textAlign = "left"; // Reset text alignment for score
  } else if (gameOver) {
    ctx.fillStyle = "#535353";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText(
      `Final Score: ${score}`,
      canvas.width / 2,
      canvas.height / 2 + 30
    );
    ctx.fillText(
      "Press Spacebar to restart",
      canvas.width / 2,
      canvas.height / 2 + 60
    );
    ctx.textAlign = "left"; // Reset text alignment for score
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
