const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game constants
const GRAVITY = 0.9;
const JUMP_FORCE = -18;
const GAME_SPEED = 10;
const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT = 60;
const MIN_OBSTACLE_DISTANCE = 400;
const CLOUD_SPEED = 2;
const ROCKET_SPEED = 9;
const FAST_FALL_MULTIPLIER = 2.5;
const ROCKET_OFFSET = 200;
const MAX_CLOUDS = 5; // Restored from 3
const MAX_OBSTACLES = 3; // Restored from 2
const MAX_ROCKETS = 2; // Restored from 1
const TARGET_FPS = 60; // Target frames per second
const FRAME_TIME = 1000 / TARGET_FPS; // Time per frame in milliseconds

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
let highScore = localStorage.getItem("highScore") || 0;
let lives = 3;
let gameOver = false;
let isJumping = false;
let isDeflated = false;
let velocityY = 0;
let dinoY = canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET;
let obstacles = [];
let clouds = [];
let rockets = [];
let stars = []; // Array to hold star objects
let gameStarted = false;
let invincibleTimer = 0;
let lastScoreUpdate = 0;
const INVINCIBLE_DURATION = 90; // About 1.5 seconds of invincibility after getting hit
const SCORE_INTERVAL = 10; // Update score every 10ms (0.01s)

// Add these variables at the top with other game state variables
let lastTime = 0;
let deltaTime = 0;
let isNightMode = false;
let lastNightModeCheck = 0;
let nightModeDuration = 0;
let nightModeTransition = 0; // 0 = day, 1 = night
const NIGHT_MODE_DURATION = 30 * 1000;
const TRANSITION_SPEED = 0.05; // Speed of transition (adjust as needed)

// Star properties
const MAX_STARS = 50;
const STAR_SIZE = 2;
const TWINKLE_SPEED = 0.03;

// Comet properties
const MAX_COMETS = 2;
const COMET_SPEED = 4;
const COMET_TRAIL_LENGTH = 20;
const COMET_SPAWN_CHANCE = 0.002;

// Add after other game constants
const MAX_BIRDS = 3;
const BIRD_SPEED = 3;
const BIRD_SIZE = 15;
const BIRD_FLAP_SPEED = 0.1;

// Add to game state variables
let birds = [];
let comets = [];

// Add after other game constants
const OBSTACLE_TYPES = {
  CACTUS: "cactus",
  STOP_SIGN: "stop_sign",
  TRASH_CAN: "trash_can",
  ROCK: "rock",
  CAR: "car",
  TABLE: "table",
  CHAIR: "chair",
  TIRE: "tire",
  ALIEN: "alien",
  METEOR: "meteor",
};

// Obstacle properties for different types
const OBSTACLE_PROPERTIES = {
  [OBSTACLE_TYPES.CACTUS]: {
    width: 30,
    height: 60,
    color: "#16d92c",
  },
  [OBSTACLE_TYPES.STOP_SIGN]: {
    width: 40,
    height: 70,
    color: "#FF0000",
  },
  [OBSTACLE_TYPES.TRASH_CAN]: {
    width: 35,
    height: 50,
    color: "#808080",
  },
  [OBSTACLE_TYPES.ROCK]: {
    width: 45,
    height: 40,
    color: "#A0522D",
  },
  [OBSTACLE_TYPES.CAR]: {
    width: 80,
    height: 50,
    color: "#4169E1",
  },
  [OBSTACLE_TYPES.TABLE]: {
    width: 70,
    height: 45,
    color: "#8B4513",
  },
  [OBSTACLE_TYPES.CHAIR]: {
    width: 35,
    height: 55,
    color: "#DEB887",
  },
  [OBSTACLE_TYPES.TIRE]: {
    width: 40,
    height: 40,
    color: "#2F4F4F",
  },
  [OBSTACLE_TYPES.ALIEN]: {
    width: 50,
    height: 60,
    color: "#00FF00",
  },
  [OBSTACLE_TYPES.METEOR]: {
    width: 60,
    height: 60,
    color: "#8B4513",
  },
};

// Add after other game constants
const UFO_CHANCE = 0.05; // 5% chance for UFO
const METEOR_CHANCE = 0.05; // 5% chance for meteor
const UFO_SIZE = 30;
const METEOR_SIZE = 16; // Double the normal comet size

// Event listeners
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault(); // Prevent page scrolling
    if (!gameStarted) {
      startGame();
    } else if (gameOver) {
      resetGame();
    } else if (
      !isJumping &&
      dinoY >=
        canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET
    ) {
      jump();
    }
  } else if (event.code === "KeyS" && !gameOver && gameStarted) {
    event.preventDefault(); // Prevent default S key behavior
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
  lastTime = performance.now();
  initStars(); // Initialize stars
  resetGame();
}

function jump() {
  if (
    !isJumping &&
    dinoY >= canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET
  ) {
    isJumping = true;
    velocityY = JUMP_FORCE;
  }
}

function resetGame() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  score = 0;
  lives = 3;
  gameOver = false;
  obstacles = [];
  clouds = [];
  rockets = [];
  initStars(); // Reset stars
  isJumping = false;
  isDeflated = false;
  velocityY = 0;
  invincibleTimer = 0;
  dinoY = canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET;
  gameStarted = true;
  birds = [];
  comets = [];

  // Reset night mode variables
  isNightMode = false;
  lastNightModeCheck = Date.now();
  nightModeDuration = 0;
  nightModeTransition = 0;
}

function createCloud() {
  // Don't create new clouds if we've reached the maximum
  if (clouds.length >= MAX_CLOUDS) return;

  const cloudHeight = 40 + Math.random() * 30;
  const cloudWidth = 60 + Math.random() * 40;
  const cloudY = 50 + Math.random() * 100;

  clouds.push({
    x: canvas.width,
    y: cloudY,
    width: cloudWidth,
    height: cloudHeight,
  });
}

function createObstacle() {
  // Don't create new obstacles if we've reached the maximum
  if (obstacles.length >= MAX_OBSTACLES) return;

  // Check if there's enough space for a new obstacle
  const lastObstacle = obstacles[obstacles.length - 1];
  if (lastObstacle && lastObstacle.x > canvas.width - MIN_OBSTACLE_DISTANCE) {
    return;
  }

  // Check for nearby ground rockets
  const nearbyGroundRocket = rockets.some((rocket) => {
    return (
      rocket.y === ROCKET_POSITIONS.GROUND &&
      rocket.x > canvas.width - MIN_OBSTACLE_DISTANCE &&
      rocket.x < canvas.width + MIN_OBSTACLE_DISTANCE
    );
  });

  if (nearbyGroundRocket) {
    return;
  }

  // Randomly select an obstacle type with special handling for rare obstacles
  const randomValue = Math.random();
  let selectedType;

  if (randomValue < 0.03) {
    // 3% chance for rare obstacles
    selectedType =
      Math.random() < 0.5 ? OBSTACLE_TYPES.ALIEN : OBSTACLE_TYPES.METEOR;
  } else {
    // Regular obstacles
    const regularTypes = Object.values(OBSTACLE_TYPES).filter(
      (type) => type !== OBSTACLE_TYPES.ALIEN && type !== OBSTACLE_TYPES.METEOR
    );
    selectedType =
      regularTypes[Math.floor(Math.random() * regularTypes.length)];
  }

  const properties = OBSTACLE_PROPERTIES[selectedType];

  obstacles.push({
    x: canvas.width,
    y: canvas.height - properties.height,
    width: properties.width,
    height: properties.height,
    type: selectedType,
  });
}

function createRocket(xPosition = canvas.width) {
  // Don't create new rockets if we've reached the maximum
  if (rockets.length >= MAX_ROCKETS) return;

  // Check for nearby cacti
  const nearbyCactus = obstacles.some((obstacle) => {
    return Math.abs(obstacle.x - xPosition) < MIN_OBSTACLE_DISTANCE;
  });

  if (nearbyCactus) {
    return;
  }

  rockets.push({
    x: xPosition,
    y: ROCKET_POSITIONS.GROUND,
    width: ROCKET_WIDTH,
    height: ROCKET_HEIGHT,
  });
}

function createStar() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height / 2), // Only in upper half of screen
    twinkle: Math.random() * Math.PI * 2, // Random starting phase
  };
}

function initStars() {
  stars = [];
  for (let i = 0; i < MAX_STARS; i++) {
    stars.push(createStar());
  }
}

function createBird() {
  // Don't create new birds if we've reached the maximum or if it's night time
  if (birds.length >= MAX_BIRDS || isNightMode) return;

  const birdY = 50 + Math.random() * 100; // Same height range as clouds
  const isUFO = Math.random() < UFO_CHANCE;

  birds.push({
    x: canvas.width,
    y: birdY,
    wingOffset: 0,
    flapDirection: 1,
    isUFO: isUFO,
  });
}

function createComet() {
  const isMeteor = Math.random() < METEOR_CHANCE;
  return {
    x: canvas.width + 50, // Start slightly off-screen
    y: Math.random() * (canvas.height / 3), // Only in upper third of screen
    angle: -Math.PI / 6 + (Math.random() * Math.PI) / 6, // Angle between -30 and 0 degrees
    speed: COMET_SPEED + Math.random() * 2, // Random speed variation
    isMeteor: isMeteor,
  };
}

// Helper function to interpolate between two colors
function lerpColor(color1, color2, amount) {
  // Convert hex to rgb
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  // Interpolate
  const r = Math.round(r1 + (r2 - r1) * amount);
  const g = Math.round(g1 + (g2 - g1) * amount);
  const b = Math.round(b1 + (b2 - b1) * amount);

  // Convert back to hex
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Helper function to get current color based on transition
function getCurrentColor(dayColor, nightColor) {
  return lerpColor(dayColor, nightColor, nightModeTransition);
}

function drawCloud(cloud) {
  ctx.fillStyle = getCurrentColor("#B0E2FF", "#404040");

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

  // Draw main body with a more subtle night mode color
  ctx.fillStyle = getCurrentColor("#535353", "#AAAAAA");
  ctx.fillRect(50, dinoY, DINO_BODY_WIDTH, scaledHeight);

  if (!isDeflated) {
    // Draw legs with matching color
    ctx.fillStyle = getCurrentColor("#535353", "#AAAAAA");
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
  } else {
    // Wings stay red in both modes
    ctx.fillStyle = "#FF0000";

    // Left wing
    ctx.beginPath();
    ctx.moveTo(50, dinoY + scaledHeight * 0.3); // Wing base
    ctx.lineTo(30, dinoY + scaledHeight * 0.1); // Wing tip top
    ctx.lineTo(25, dinoY + scaledHeight * 0.3); // Wing tip middle
    ctx.lineTo(30, dinoY + scaledHeight * 0.5); // Wing tip bottom
    ctx.closePath();
    ctx.fill();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(50 + DINO_BODY_WIDTH, dinoY + scaledHeight * 0.3); // Wing base
    ctx.lineTo(50 + DINO_BODY_WIDTH + 20, dinoY + scaledHeight * 0.1); // Wing tip top
    ctx.lineTo(50 + DINO_BODY_WIDTH + 25, dinoY + scaledHeight * 0.3); // Wing tip middle
    ctx.lineTo(50 + DINO_BODY_WIDTH + 20, dinoY + scaledHeight * 0.5); // Wing tip bottom
    ctx.closePath();
    ctx.fill();
  }

  // Draw arms with matching color
  ctx.fillStyle = getCurrentColor("#535353", "#AAAAAA");
  // Left arm
  ctx.fillRect(
    50 + DINO_BODY_WIDTH * 0.2,
    dinoY + scaledHeight * 0.4,
    15,
    8 * scale
  );
  // Right arm
  ctx.fillRect(
    50 + DINO_BODY_WIDTH * 0.6,
    dinoY + scaledHeight * 0.4,
    15,
    8 * scale
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

  // Eyes with adjusted colors for night mode
  const eyeRadius = 8 * scale;
  const pupilRadius = 4 * scale;

  // Eye whites stay white but slightly dimmed in night mode
  ctx.fillStyle = getCurrentColor("#FFFFFF", "#DDDDDD");
  ctx.beginPath();
  ctx.arc(
    50 + DINO_BODY_WIDTH * 0.7,
    dinoY + scaledHeight * 0.3,
    eyeRadius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Pupils stay black in both modes
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
  ctx.fillStyle = getCurrentColor("#FFFFFF", "#DDDDDD");
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

  // Teeth slightly dimmed in night mode
  ctx.fillStyle = getCurrentColor("#FFFFFF", "#DDDDDD");
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

function drawCactus(obstacle) {
  const baseColor = getCurrentColor("#16d92c", "#0fa01f");
  const darkColor = getCurrentColor("#0fa01f", "#097016");

  // Main body
  ctx.fillStyle = baseColor;
  ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

  // Left arm
  ctx.fillRect(
    obstacle.x - obstacle.width / 2,
    obstacle.y + obstacle.height * 0.3,
    obstacle.width,
    obstacle.height * 0.3
  );

  // Right arm
  ctx.fillRect(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height * 0.5,
    obstacle.width,
    obstacle.height * 0.3
  );

  // Draw spikes
  ctx.fillStyle = darkColor;
  const spikeSize = 4;

  // Spikes on main body
  for (let i = 0; i < obstacle.height; i += 10) {
    // Left spikes
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y + i);
    ctx.lineTo(obstacle.x - spikeSize, obstacle.y + i + spikeSize);
    ctx.lineTo(obstacle.x, obstacle.y + i + spikeSize * 2);
    ctx.fill();

    // Right spikes
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width, obstacle.y + i);
    ctx.lineTo(
      obstacle.x + obstacle.width + spikeSize,
      obstacle.y + i + spikeSize
    );
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + i + spikeSize * 2);
    ctx.fill();
  }

  // Spikes on arms
  // Left arm spikes
  for (let i = 0; i < obstacle.width; i += 10) {
    ctx.beginPath();
    ctx.moveTo(
      obstacle.x - obstacle.width / 2 + i,
      obstacle.y + obstacle.height * 0.3
    );
    ctx.lineTo(
      obstacle.x - obstacle.width / 2 + i + spikeSize,
      obstacle.y + obstacle.height * 0.3 - spikeSize
    );
    ctx.lineTo(
      obstacle.x - obstacle.width / 2 + i + spikeSize * 2,
      obstacle.y + obstacle.height * 0.3
    );
    ctx.fill();
  }

  // Right arm spikes
  for (let i = 0; i < obstacle.width; i += 10) {
    ctx.beginPath();
    ctx.moveTo(
      obstacle.x + obstacle.width / 2 + i,
      obstacle.y + obstacle.height * 0.5
    );
    ctx.lineTo(
      obstacle.x + obstacle.width / 2 + i + spikeSize,
      obstacle.y + obstacle.height * 0.5 - spikeSize
    );
    ctx.lineTo(
      obstacle.x + obstacle.width / 2 + i + spikeSize * 2,
      obstacle.y + obstacle.height * 0.5
    );
    ctx.fill();
  }
}

function drawStopSign(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.STOP_SIGN].color,
    "#CC0000"
  );

  // Draw pole
  ctx.fillStyle = getCurrentColor("#808080", "#606060");
  ctx.fillRect(
    obstacle.x + obstacle.width / 2 - 5,
    obstacle.y + obstacle.height / 2,
    10,
    obstacle.height / 2
  );

  // Draw octagon
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  const centerX = obstacle.x + obstacle.width / 2;
  const centerY = obstacle.y + obstacle.height / 3;
  const radius = obstacle.width / 2;

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 8;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Draw "STOP" text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("STOP", centerX, centerY + 5);
  ctx.textAlign = "left";
}

function drawTrashCan(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.TRASH_CAN].color,
    "#606060"
  );

  // Draw main body
  ctx.fillStyle = baseColor;
  ctx.fillRect(obstacle.x, obstacle.y + 5, obstacle.width, obstacle.height - 5);

  // Draw lid
  ctx.fillStyle = getCurrentColor("#606060", "#404040");
  ctx.fillRect(obstacle.x - 5, obstacle.y, obstacle.width + 10, 10);

  // Draw handle
  ctx.fillStyle = getCurrentColor("#404040", "#303030");
  ctx.fillRect(obstacle.x + obstacle.width / 2 - 5, obstacle.y - 5, 10, 8);
}

function drawRock(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.ROCK].color,
    "#8B4513"
  );

  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
  ctx.quadraticCurveTo(
    obstacle.x + obstacle.width / 4,
    obstacle.y,
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 3
  );
  ctx.quadraticCurveTo(
    obstacle.x + (obstacle.width * 3) / 4,
    obstacle.y,
    obstacle.x + obstacle.width,
    obstacle.y + obstacle.height
  );
  ctx.closePath();
  ctx.fill();
}

function drawCar(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.CAR].color,
    "#3A5FCD"
  );

  // Draw main body
  ctx.fillStyle = baseColor;
  ctx.fillRect(
    obstacle.x,
    obstacle.y + obstacle.height / 3,
    obstacle.width,
    (obstacle.height * 2) / 3
  );

  // Draw roof
  ctx.beginPath();
  ctx.moveTo(obstacle.x + obstacle.width / 4, obstacle.y + obstacle.height / 3);
  ctx.lineTo(
    obstacle.x + (obstacle.width * 3) / 4,
    obstacle.y + obstacle.height / 3
  );
  ctx.lineTo(obstacle.x + (obstacle.width * 2) / 3, obstacle.y);
  ctx.lineTo(obstacle.x + obstacle.width / 3, obstacle.y);
  ctx.closePath();
  ctx.fill();

  // Draw wheels
  ctx.fillStyle = getCurrentColor("#2F4F4F", "#1F3F3F");
  ctx.beginPath();
  ctx.arc(
    obstacle.x + obstacle.width / 4,
    obstacle.y + obstacle.height,
    obstacle.height / 4,
    0,
    Math.PI * 2
  );
  ctx.arc(
    obstacle.x + (obstacle.width * 3) / 4,
    obstacle.y + obstacle.height,
    obstacle.height / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawTable(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.TABLE].color,
    "#6B2D13"
  );

  // Draw table top
  ctx.fillStyle = baseColor;
  ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height / 4);

  // Draw legs
  const legWidth = 8;
  ctx.fillRect(
    obstacle.x + legWidth,
    obstacle.y + obstacle.height / 4,
    legWidth,
    (obstacle.height * 3) / 4
  );
  ctx.fillRect(
    obstacle.x + obstacle.width - legWidth * 2,
    obstacle.y + obstacle.height / 4,
    legWidth,
    (obstacle.height * 3) / 4
  );
}

function drawChair(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.CHAIR].color,
    "#BC8F6A"
  );

  // Draw seat
  ctx.fillStyle = baseColor;
  ctx.fillRect(
    obstacle.x,
    obstacle.y + obstacle.height / 2,
    obstacle.width,
    obstacle.height / 6
  );

  // Draw backrest
  ctx.fillRect(obstacle.x, obstacle.y, obstacle.width / 3, obstacle.height / 2);

  // Draw legs
  const legWidth = 5;
  ctx.fillRect(
    obstacle.x + legWidth,
    obstacle.y + (obstacle.height * 2) / 3,
    legWidth,
    obstacle.height / 3
  );
  ctx.fillRect(
    obstacle.x + obstacle.width - legWidth * 2,
    obstacle.y + (obstacle.height * 2) / 3,
    legWidth,
    obstacle.height / 3
  );
}

function drawTire(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.TIRE].color,
    "#1F2F2F"
  );

  // Draw outer circle
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
    obstacle.width / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw inner circle
  ctx.fillStyle = getCurrentColor("#1F1F1F", "#0F0F0F");
  ctx.beginPath();
  ctx.arc(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
    obstacle.width / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

// Add this helper function before drawObstacle
function drawNightModeBorder(obstacle) {
  if (nightModeTransition > 0) {
    // Save current context state
    ctx.save();

    // Set up border style
    ctx.strokeStyle = `rgba(255, 255, 255, ${nightModeTransition * 0.5})`; // Semi-transparent white
    ctx.lineWidth = 2;

    // For circular obstacles like tire
    if (obstacle.type === OBSTACLE_TYPES.TIRE) {
      ctx.beginPath();
      ctx.arc(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        obstacle.width / 2 + 1, // Slightly larger than the tire
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else {
      // For rectangular obstacles, add some padding
      const padding = 2;
      ctx.strokeRect(
        obstacle.x - padding,
        obstacle.y - padding,
        obstacle.width + padding * 2,
        obstacle.height + padding * 2
      );
    }

    // Restore context state
    ctx.restore();
  }
}

// Replace the existing drawObstacle function
function drawObstacle(obstacle) {
  // Draw the night mode border first (it will be behind the obstacle)
  drawNightModeBorder(obstacle);

  // Draw the obstacle based on its type
  switch (obstacle.type) {
    case OBSTACLE_TYPES.CACTUS:
      drawCactus(obstacle);
      break;
    case OBSTACLE_TYPES.STOP_SIGN:
      drawStopSign(obstacle);
      break;
    case OBSTACLE_TYPES.TRASH_CAN:
      drawTrashCan(obstacle);
      break;
    case OBSTACLE_TYPES.ROCK:
      drawRock(obstacle);
      break;
    case OBSTACLE_TYPES.CAR:
      drawCar(obstacle);
      break;
    case OBSTACLE_TYPES.TABLE:
      drawTable(obstacle);
      break;
    case OBSTACLE_TYPES.CHAIR:
      drawChair(obstacle);
      break;
    case OBSTACLE_TYPES.TIRE:
      drawTire(obstacle);
      break;
    case OBSTACLE_TYPES.ALIEN:
      drawAlien(obstacle);
      break;
    case OBSTACLE_TYPES.METEOR:
      drawMeteor(obstacle);
      break;
  }
}

function drawBird(bird) {
  if (bird.isUFO) {
    drawUFO(bird);
    return;
  }

  // Update wing flapping animation
  bird.wingOffset += BIRD_FLAP_SPEED * bird.flapDirection;
  if (bird.wingOffset > 1 || bird.wingOffset < -1) {
    bird.flapDirection *= -1;
  }

  ctx.fillStyle = getCurrentColor("#535353", "#AAAAAA");

  // Draw body
  ctx.beginPath();
  ctx.ellipse(bird.x, bird.y, BIRD_SIZE, BIRD_SIZE / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw wings
  ctx.beginPath();
  // Left wing
  ctx.moveTo(bird.x - BIRD_SIZE / 2, bird.y);
  ctx.quadraticCurveTo(
    bird.x - BIRD_SIZE,
    bird.y - (10 + bird.wingOffset * 5),
    bird.x - BIRD_SIZE * 1.5,
    bird.y + bird.wingOffset * 2
  );
  ctx.lineTo(bird.x - BIRD_SIZE / 2, bird.y);

  // Right wing
  ctx.moveTo(bird.x + BIRD_SIZE / 2, bird.y);
  ctx.quadraticCurveTo(
    bird.x + BIRD_SIZE,
    bird.y - (10 + bird.wingOffset * 5),
    bird.x + BIRD_SIZE * 1.5,
    bird.y + bird.wingOffset * 2
  );
  ctx.lineTo(bird.x + BIRD_SIZE / 2, bird.y);

  ctx.fill();
}

function drawUFO(bird) {
  // Draw UFO body (oval)
  ctx.fillStyle = getCurrentColor("#808080", "#A0A0A0");
  ctx.beginPath();
  ctx.ellipse(bird.x, bird.y, UFO_SIZE, UFO_SIZE / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw dome
  ctx.fillStyle = getCurrentColor("#ADD8E6", "#87CEEB");
  ctx.beginPath();
  ctx.ellipse(
    bird.x,
    bird.y - UFO_SIZE / 4,
    UFO_SIZE / 2,
    UFO_SIZE / 3,
    0,
    Math.PI,
    Math.PI * 2
  );
  ctx.fill();

  // Draw lights
  const lightColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const x = bird.x + Math.cos(angle) * (UFO_SIZE * 0.8);
    const y = bird.y + Math.sin(angle) * (UFO_SIZE / 4);

    ctx.fillStyle = lightColors[i];
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw green cone ray
  const rayGradient = ctx.createLinearGradient(
    bird.x,
    bird.y + UFO_SIZE / 2,
    bird.x,
    bird.y + UFO_SIZE * 3
  );
  rayGradient.addColorStop(0, "rgba(0, 255, 128, 0.4)"); // Brighter, more vibrant green with higher opacity
  rayGradient.addColorStop(0.5, "rgba(0, 255, 128, 0.2)"); // Mid-point with medium opacity
  rayGradient.addColorStop(1, "rgba(0, 255, 128, 0)"); // Fade to transparent

  ctx.fillStyle = rayGradient;
  ctx.beginPath();
  // Start with a narrower top
  ctx.moveTo(bird.x - UFO_SIZE / 3, bird.y + UFO_SIZE / 2);
  ctx.lineTo(bird.x + UFO_SIZE / 3, bird.y + UFO_SIZE / 2);
  // End with a wider bottom
  ctx.lineTo(bird.x + UFO_SIZE * 1.5, bird.y + UFO_SIZE * 3);
  ctx.lineTo(bird.x - UFO_SIZE * 1.5, bird.y + UFO_SIZE * 3);
  ctx.closePath();
  ctx.fill();

  // Add a pulsing effect to the ray
  const pulseOpacity = 0.2 + Math.sin(Date.now() / 200) * 0.1;
  const pulseGradient = ctx.createLinearGradient(
    bird.x,
    bird.y + UFO_SIZE / 2,
    bird.x,
    bird.y + UFO_SIZE * 2
  );
  pulseGradient.addColorStop(0, `rgba(0, 255, 128, ${pulseOpacity})`);
  pulseGradient.addColorStop(1, "rgba(0, 255, 128, 0)");

  ctx.fillStyle = pulseGradient;
  ctx.beginPath();
  ctx.moveTo(bird.x - UFO_SIZE / 4, bird.y + UFO_SIZE / 2);
  ctx.lineTo(bird.x + UFO_SIZE / 4, bird.y + UFO_SIZE / 2);
  ctx.lineTo(bird.x + UFO_SIZE, bird.y + UFO_SIZE * 2);
  ctx.lineTo(bird.x - UFO_SIZE, bird.y + UFO_SIZE * 2);
  ctx.closePath();
  ctx.fill();
}

function drawComet(comet) {
  if (comet.isMeteor) {
    drawMeteor(comet);
    return;
  }

  const opacity = nightModeTransition;

  // Calculate tilt angle based on movement
  const tiltAngle = comet.angle - Math.PI / 6;

  // Draw the trail with gradient opacity and tilt
  ctx.lineWidth = 6; // Increased line width for thicker trail

  // Draw a wider trail with multiple lines
  const trailWidth = 6; // Width of the entire trail
  for (let offset = -trailWidth; offset <= trailWidth; offset += 2) {
    const trailPoints = [];
    for (let i = 0; i < COMET_TRAIL_LENGTH; i++) {
      trailPoints.push({
        x: comet.x + i * Math.cos(tiltAngle) * 4, // Changed minus to plus to reverse direction
        y: comet.y + i * Math.sin(tiltAngle) * 4 + offset, // Changed minus to plus to reverse direction
      });
    }

    // Draw each trail line with gradient opacity
    for (let i = 0; i < trailPoints.length - 1; i++) {
      const trailOpacity = opacity * (1 - i / COMET_TRAIL_LENGTH) * 0.8;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${trailOpacity})`;
      ctx.moveTo(trailPoints[i].x, trailPoints[i].y);
      ctx.lineTo(trailPoints[i + 1].x, trailPoints[i + 1].y);
      ctx.stroke();
    }
  }

  // Draw the comet head (larger yellow star)
  const starSize = 8; // Doubled star size
  const numPoints = 5;
  const outerRadius = starSize;
  const innerRadius = starSize / 2;

  ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`; // Yellow color
  ctx.beginPath();

  // Draw star shape
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / numPoints;
    const x = comet.x + Math.cos(angle - tiltAngle) * radius;
    const y = comet.y + Math.sin(angle - tiltAngle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fill();

  // Add a white center to the star
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, starSize / 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawMeteor(comet) {
  const opacity = nightModeTransition;

  // Calculate tilt angle based on movement
  const tiltAngle = comet.angle - Math.PI / 6;

  // Draw the flaming trail
  ctx.lineWidth = 12; // Thicker trail for meteor

  // Draw multiple flame trails
  const flameColors = [
    `rgba(255, 0, 0, ${opacity})`, // Red
    `rgba(255, 165, 0, ${opacity})`, // Orange
    `rgba(255, 255, 0, ${opacity})`, // Yellow
  ];

  flameColors.forEach((color, index) => {
    const trailWidth = 12 - index * 2; // Decreasing width for each layer
    for (let offset = -trailWidth; offset <= trailWidth; offset += 3) {
      const trailPoints = [];
      for (let i = 0; i < COMET_TRAIL_LENGTH * 1.5; i++) {
        trailPoints.push({
          x: comet.x + i * Math.cos(tiltAngle) * 4,
          y:
            comet.y +
            i * Math.sin(tiltAngle) * 4 +
            offset +
            Math.sin(i / 2) * 3,
        });
      }

      // Draw each trail line with gradient opacity
      for (let i = 0; i < trailPoints.length - 1; i++) {
        const trailOpacity =
          opacity * (1 - i / (COMET_TRAIL_LENGTH * 1.5)) * 0.8;
        ctx.beginPath();
        ctx.strokeStyle = color.replace(opacity, trailOpacity);
        ctx.moveTo(trailPoints[i].x, trailPoints[i].y);
        ctx.lineTo(trailPoints[i + 1].x, trailPoints[i + 1].y);
        ctx.stroke();
      }
    }
  });

  // Draw the meteor head (larger rocky sphere)
  ctx.fillStyle = getCurrentColor("#8B4513", "#A0522D"); // Brown color
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, METEOR_SIZE, 0, Math.PI * 2);
  ctx.fill();

  // Add some crater details
  ctx.fillStyle = getCurrentColor("#654321", "#8B4513");
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const x = comet.x + Math.cos(angle) * (METEOR_SIZE * 0.5);
    const y = comet.y + Math.sin(angle) * (METEOR_SIZE * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, METEOR_SIZE * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAlien(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.ALIEN].color,
    "#00CC00"
  );

  // Draw body
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
    obstacle.width / 2,
    obstacle.height / 3,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw head
  ctx.beginPath();
  ctx.ellipse(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 4,
    obstacle.width / 3,
    obstacle.height / 4,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw eyes
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(
    obstacle.x + obstacle.width / 3,
    obstacle.y + obstacle.height / 4,
    4,
    0,
    Math.PI * 2
  );
  ctx.arc(
    obstacle.x + (obstacle.width * 2) / 3,
    obstacle.y + obstacle.height / 4,
    4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw pupils
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(
    obstacle.x + obstacle.width / 3,
    obstacle.y + obstacle.height / 4,
    2,
    0,
    Math.PI * 2
  );
  ctx.arc(
    obstacle.x + (obstacle.width * 2) / 3,
    obstacle.y + obstacle.height / 4,
    2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw antenna
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 6);
  ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw antenna ball
  ctx.beginPath();
  ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMeteor(obstacle) {
  const baseColor = getCurrentColor(
    OBSTACLE_PROPERTIES[OBSTACLE_TYPES.METEOR].color,
    "#A0522D"
  );

  // Draw main meteor body
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
    obstacle.width / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Add crater details
  ctx.fillStyle = getCurrentColor("#654321", "#8B4513");
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const x =
      obstacle.x +
      obstacle.width / 2 +
      Math.cos(angle) * (obstacle.width * 0.3);
    const y =
      obstacle.y +
      obstacle.height / 2 +
      Math.sin(angle) * (obstacle.width * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, obstacle.width * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add glowing effect
  const glowGradient = ctx.createRadialGradient(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
    0,
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
    obstacle.width
  );
  glowGradient.addColorStop(0, "rgba(255, 165, 0, 0.3)");
  glowGradient.addColorStop(1, "rgba(255, 165, 0, 0)");

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
    obstacle.width,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function update() {
  if (!gameStarted || gameOver) return;

  // Calculate delta time
  const currentTime = performance.now();
  deltaTime = Math.min((currentTime - lastTime) / FRAME_TIME, 2); // Cap delta time to prevent huge jumps
  lastTime = currentTime;

  // Update night mode transition
  if (isNightMode && nightModeTransition < 1) {
    nightModeTransition = Math.min(
      1,
      nightModeTransition + TRANSITION_SPEED * deltaTime
    );
  } else if (!isNightMode && nightModeTransition > 0) {
    nightModeTransition = Math.max(
      0,
      nightModeTransition - TRANSITION_SPEED * deltaTime
    );
  }

  // Check for night mode every 1 second
  const currentTimeMs = Date.now();
  if (currentTimeMs - lastNightModeCheck >= 1000) {
    lastNightModeCheck = currentTimeMs;

    if (isNightMode) {
      nightModeDuration += 1000; // Add check interval time
      if (nightModeDuration >= NIGHT_MODE_DURATION) {
        isNightMode = false;
        nightModeDuration = 0;
        nightModeTransition = 1; // Start transition to day
        // Clear birds and comets when night mode ends
        birds = [];
        comets = [];
      }
    } else if (Math.random() < 0.05) {
      // 5% chance to activate night mode
      isNightMode = true;
      nightModeDuration = 0;
      nightModeTransition = 0; // Start transition to night
      // Clear any existing birds when night mode starts
      birds = [];
    }
  }

  // Update invincibility timer
  if (invincibleTimer > 0) {
    invincibleTimer--;
  }

  // Add score over time (every 0.01s)
  if (currentTimeMs - lastScoreUpdate >= SCORE_INTERVAL) {
    score++;
    lastScoreUpdate = currentTimeMs;
  }

  // Update dino position with delta time
  if (isJumping) {
    dinoY = Math.max(0, dinoY + velocityY * deltaTime); // Prevent going above screen
    velocityY += GRAVITY * (isDeflated ? FAST_FALL_MULTIPLIER : 1) * deltaTime;

    const groundY =
      canvas.height - DINO_BODY_HEIGHT - DINO_LEG_HEIGHT - GROUND_OFFSET;
    if (dinoY >= groundY) {
      dinoY = groundY;
      isJumping = false;
      velocityY = 0;
    }
  }

  // Create new clouds
  if (Math.random() < 0.005 * deltaTime) {
    createCloud();
  }

  // Create new rockets only after scores
  if (score >= 500 && Math.random() < 0.0001 * deltaTime) {
    createRocket();
  } else if (score >= 1000 && Math.random() < 0.0002 * deltaTime) {
    createRocket();
  } else if (score >= 2000 && Math.random() < 0.0003 * deltaTime) {
    createRocket();
  } else if (score >= 3000 && Math.random() < 0.0004 * deltaTime) {
    createRocket();
  } else if (score >= 4000 && Math.random() < 0.0005 * deltaTime) {
    createRocket();
  } else if (score >= 5000 && Math.random() < 0.001 * deltaTime) {
    createRocket();
  } else if (score >= 6000 && Math.random() < 0.002 * deltaTime) {
    createRocket();
  }

  // Update clouds with delta time
  clouds.forEach((cloud, index) => {
    cloud.x -= CLOUD_SPEED * deltaTime;
    if (cloud.x + cloud.width < 0) {
      clouds.splice(index, 1);
    }
  });

  // Update rockets with delta time
  rockets.forEach((rocket, index) => {
    rocket.x -= ROCKET_SPEED * deltaTime;
    if (rocket.x + rocket.width < 0) {
      rockets.splice(index, 1);
      score += 20;
    }
  });

  // Update obstacles with delta time
  if (Math.random() < 0.02 * deltaTime) {
    createObstacle();
  }

  obstacles.forEach((obstacle, index) => {
    obstacle.x -= GAME_SPEED * deltaTime;
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(index, 1);
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

  // Create new birds (moved spawn check here for better visibility)
  if (
    !isNightMode &&
    birds.length < MAX_BIRDS &&
    Math.random() < 0.005 * deltaTime
  ) {
    createBird();
  }

  // Update birds
  birds = birds.filter((bird) => {
    bird.x -= BIRD_SPEED * deltaTime;
    return bird.x + BIRD_SIZE * 2 >= 0;
  });

  // Update comets during night mode
  if (
    isNightMode &&
    Math.random() < COMET_SPAWN_CHANCE * deltaTime &&
    comets.length < MAX_COMETS
  ) {
    comets.push(createComet());
  }

  // Update existing comets
  comets = comets.filter((comet) => {
    comet.x -= comet.speed * Math.cos(comet.angle) * deltaTime;
    comet.y -= comet.speed * Math.sin(comet.angle) * deltaTime;
    return comet.x > -50 && comet.y < canvas.height;
  });
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
  if (nightModeTransition < 0.5) {
    // Draw sun when in day mode or transitioning to night (first half)
    ctx.beginPath();
    ctx.arc(SUN_X, SUN_Y, SUN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = getCurrentColor("#FFD700", "#FFD700");
    ctx.fill();

    // Draw sun rays with opacity based on transition
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const startX = SUN_X + Math.cos(angle) * SUN_RADIUS;
      const startY = SUN_Y + Math.sin(angle) * SUN_RADIUS;
      const endX = SUN_X + Math.cos(angle) * (SUN_RADIUS + SUN_RAY_LENGTH);
      const endY = SUN_Y + Math.sin(angle) * (SUN_RAY_LENGTH + SUN_RADIUS);

      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
    }
    ctx.strokeStyle = getCurrentColor("#FFD700", "#FFD700");
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    // Draw crescent moon when in night mode or transitioning to night (second half)
    // Main moon circle
    ctx.beginPath();
    ctx.arc(SUN_X, SUN_Y, SUN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Create crescent shape by overlapping a slightly offset circle
    ctx.beginPath();
    ctx.arc(SUN_X - 15, SUN_Y, SUN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = getCurrentColor("#f7f7f7", "#2c2c2c");
    ctx.fill();
  }
}

function drawStars() {
  // Only draw stars during night mode transition
  if (nightModeTransition > 0) {
    stars.forEach((star) => {
      // Update twinkle animation
      star.twinkle += TWINKLE_SPEED;
      if (star.twinkle > Math.PI * 2) star.twinkle = 0;

      // Calculate star opacity based on night mode transition and twinkle effect
      const twinkleOpacity = (Math.sin(star.twinkle) + 1) / 2; // Value between 0 and 1
      const opacity = nightModeTransition * twinkleOpacity;

      // Draw star with current opacity
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, STAR_SIZE, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function draw() {
  // Clear canvas with transition background color
  ctx.fillStyle = getCurrentColor("#f7f7f7", "#2c2c2c");
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stars (before sun/moon)
  drawStars();

  // Draw comets
  comets.forEach(drawComet);

  // Draw sun/moon with transition
  drawSun();

  // Draw clouds with transition color
  clouds.forEach((cloud) => {
    ctx.fillStyle = getCurrentColor("#B0E2FF", "#404040");
    drawCloud(cloud);
  });

  // Draw rockets
  rockets.forEach(drawRocket);

  // Draw dino (flash if invincible)
  if (invincibleTimer === 0 || Math.floor(invincibleTimer / 4) % 2 === 0) {
    drawDino();
  }

  // Draw obstacles with transition color
  obstacles.forEach((obstacle) => {
    drawObstacle(obstacle);
  });

  // Draw birds
  if (!isNightMode) {
    birds.forEach(drawBird);
  }

  // Draw score with transition color
  ctx.fillStyle = getCurrentColor("#535353", "#ffffff");
  ctx.font = "24px Arial";
  ctx.fillText(`Score: ${score}`, 30, 40);

  // Draw hearts
  for (let i = 0; i < 3; i++) {
    drawHeart(30 + i * 40, 60, i < lives);
  }

  // Draw messages with transition colors
  if (!gameStarted) {
    ctx.fillStyle = getCurrentColor(
      "rgba(83, 83, 83, 0.8)",
      "rgba(255, 255, 255, 0.8)"
    );
    ctx.font = "24px Arial";
    ctx.textAlign = "center";

    // Draw subtitle
    ctx.fillStyle = getCurrentColor("#000000", "#ffffff");
    ctx.font = "bold 28px Arial";
    ctx.fillText(
      "A goofy ahh google chrome dino inspired game",
      canvas.width / 2,
      canvas.height / 2 - 40
    );

    // Draw main text
    ctx.fillStyle = getCurrentColor(
      "rgba(83, 83, 83, 0.8)",
      "rgba(255, 255, 255, 0.8)"
    );
    ctx.font = "24px Arial";
    ctx.fillText(
      "Press Spacebar to start the game",
      canvas.width / 2,
      canvas.height / 2
    );
    ctx.textAlign = "left";
  } else if (gameOver) {
    ctx.fillStyle = getCurrentColor("#535353", "#ffffff");
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 40);

    // Draw score
    ctx.font = "24px Arial";
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);

    // Always show Best score, highlight if beaten
    if (score > highScore) {
      ctx.fillStyle = "#008000"; // Keep green for new best
      ctx.font = "bold 24px Arial";
      ctx.fillText(`Best: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
    } else {
      ctx.fillStyle = getCurrentColor("#535353", "#ffffff");
      ctx.font = "bold 24px Arial";
      ctx.fillText(
        `Best: ${highScore}`,
        canvas.width / 2,
        canvas.height / 2 + 30
      );
    }

    // Add Skill Issue text (keep red)
    ctx.fillStyle = "#FF0000";
    ctx.font = "bold 32px Arial";
    ctx.fillText(
      "Skill issue, try again",
      canvas.width / 2,
      canvas.height / 2 + 70
    );

    // Reset color and add restart text
    ctx.fillStyle = getCurrentColor("#535353", "#ffffff");
    ctx.font = "20px Arial";
    ctx.fillText(
      "Press Spacebar to restart",
      canvas.width / 2,
      canvas.height / 2 + 110
    );
    ctx.textAlign = "left";
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
