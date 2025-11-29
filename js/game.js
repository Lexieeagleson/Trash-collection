// Game state
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    score: 0,
    lives: 3,
    level: 1,
    isRunning: false,
    animationId: null,
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 1500,
    minSpawnInterval: 600,
    difficultyTimer: 0,
    difficultyInterval: 10000,
    // Level progression settings
    pointsPerLevel: 100,
    // Window sizing - fixed larger size from the start (no dynamic resizing)
    baseWindowWidth: 400,
    baseWindowHeight: 550,
    // Trash can sizing - starts large and shrinks
    baseRaccoonWidth: 120,
    minRaccoonWidth: 60,
    raccoonShrinkPerLevel: 5,
    maxRaccoonWidthRatio: 0.45,
    // Trash speed - starts slow and increases
    baseTrashSpeed: 1,
    trashSpeedIncreasePerLevel: 0.15,
    maxTrashSpeed: 5,
    // Golden sneaker settings
    goldenSneakerMinLevel: 10,
    goldenSneakerLastSpawnLevel: 0, // Tracks last level a golden sneaker spawned
    goldenSneakerNextSpawnLevel: 0  // The next level at which golden sneaker will spawn
};

// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (typeof radius === 'number') {
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
        }
        const r = radius;
        this.moveTo(x + r.tl, y);
        this.lineTo(x + width - r.tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + r.tr);
        this.lineTo(x + width, y + height - r.br);
        this.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
        this.lineTo(x + r.bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
        return this;
    };
}

// Raccoon player
const raccoon = {
    x: 0,
    y: 0,
    width: 80,
    height: 100,
    targetX: 0,
    speed: 0.15,
    // Golden boost state
    isGolden: false,
    goldenTimer: 0,
    goldenDuration: 15000, // 15 seconds in milliseconds
    normalSpeed: 0.15,
    goldenSpeedMultiplier: 1.5 // 50% speed boost
};

// Trash items
let trashItems = [];

// Trash types with emojis
const trashTypes = [
    { emoji: '🍌', points: 10 },
    { emoji: '🥫', points: 15 },
    { emoji: '📦', points: 20 },
    { emoji: '🍎', points: 10 },
    { emoji: '🥤', points: 15 },
    { emoji: '🍕', points: 10 },
    { emoji: '🍔', points: 15 },
    { emoji: '🗞️', points: 20 },
    { emoji: '🧃', points: 15 },
    { emoji: '🥡', points: 20 }
];

// Golden sneaker (special item after level 10)
const goldenTrashType = {
    emoji: '👟',
    points: 50,
    isGolden: true
};

// DOM elements
let startScreen, gameScreen, gameOverScreen;
let finalScore;

// Touch/mouse tracking
let touchStartX = 0;
let isDragging = false;

// Initialize game
function init() {
    startScreen = document.getElementById('start-screen');
    gameScreen = document.getElementById('game-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    finalScore = document.getElementById('final-score');
    
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Set up canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // Input handlers
    setupInputHandlers();
}

function resizeCanvas() {
    // Use fixed base size (no dynamic resizing based on level)
    const targetWidth = game.baseWindowWidth;
    const targetHeight = game.baseWindowHeight;
    
    // Use the smaller of target size or window size
    const maxWidth = Math.min(targetWidth, window.innerWidth);
    const maxHeight = Math.min(targetHeight, window.innerHeight);
    
    game.canvas.width = maxWidth;
    game.canvas.height = maxHeight;
    game.width = game.canvas.width;
    game.height = game.canvas.height;
    
    // Calculate raccoon size based on level (starts large, shrinks with level)
    const baseSizeForLevel = game.baseRaccoonWidth - (game.level - 1) * game.raccoonShrinkPerLevel;
    const levelRaccoonWidth = Math.max(game.minRaccoonWidth, baseSizeForLevel);
    
    // Update raccoon position and size (cap at configured ratio of game width)
    raccoon.width = Math.min(levelRaccoonWidth, game.width * game.maxRaccoonWidthRatio);
    raccoon.height = raccoon.width * 1.25;
    raccoon.y = game.height - raccoon.height - 20;
    
    if (!game.isRunning) {
        raccoon.x = (game.width - raccoon.width) / 2;
        raccoon.targetX = raccoon.x;
    }
}

function updateRaccoonSize() {
    // Calculate raccoon size based on level (starts large, shrinks with level)
    const baseSizeForLevel = game.baseRaccoonWidth - (game.level - 1) * game.raccoonShrinkPerLevel;
    const levelRaccoonWidth = Math.max(game.minRaccoonWidth, baseSizeForLevel);
    
    // Update raccoon size (cap at configured ratio of game width)
    raccoon.width = Math.min(levelRaccoonWidth, game.width * game.maxRaccoonWidthRatio);
    raccoon.height = raccoon.width * 1.25;
    raccoon.y = game.height - raccoon.height - 20;
}

function setupInputHandlers() {
    // Touch events
    game.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    game.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    game.canvas.addEventListener('touchend', handleTouchEnd);
    
    // Mouse events for desktop
    game.canvas.addEventListener('mousedown', handleMouseDown);
    game.canvas.addEventListener('mousemove', handleMouseMove);
    game.canvas.addEventListener('mouseup', handleMouseUp);
    game.canvas.addEventListener('mouseleave', handleMouseUp);
}

function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        isDragging = true;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (isDragging && e.touches.length > 0) {
        const touchX = e.touches[0].clientX;
        raccoon.targetX = touchX - raccoon.width / 2;
        constrainRaccoon();
    }
}

function handleTouchEnd() {
    isDragging = false;
}

function handleMouseDown(e) {
    isDragging = true;
    raccoon.targetX = e.clientX - raccoon.width / 2;
    constrainRaccoon();
}

function handleMouseMove(e) {
    if (isDragging) {
        raccoon.targetX = e.clientX - raccoon.width / 2;
        constrainRaccoon();
    }
}

function handleMouseUp() {
    isDragging = false;
}

function constrainRaccoon() {
    raccoon.targetX = Math.max(0, Math.min(game.width - raccoon.width, raccoon.targetX));
}

function startGame() {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    
    game.score = 0;
    game.lives = 3;
    game.level = 1;
    game.isRunning = true;
    game.spawnInterval = 1500;
    game.spawnTimer = 0;
    game.difficultyTimer = 0;
    trashItems = [];
    
    // Reset golden sneaker spawning state
    game.goldenSneakerLastSpawnLevel = 0;
    // Set first golden sneaker spawn level (level 10 + random 0-2 levels)
    game.goldenSneakerNextSpawnLevel = game.goldenSneakerMinLevel + Math.floor(Math.random() * 3);
    
    // Reset golden boost state
    raccoon.isGolden = false;
    raccoon.goldenTimer = 0;
    raccoon.speed = raccoon.normalSpeed;
    
    // Reset canvas size for level 1
    resizeCanvas();
    
    raccoon.x = (game.width - raccoon.width) / 2;
    raccoon.targetX = raccoon.x;
    
    updateUI();
    game.lastTime = performance.now();
    gameLoop();
}

function restartGame() {
    startGame();
}

function gameLoop(currentTime = 0) {
    if (!game.isRunning) return;
    
    const deltaTime = currentTime - game.lastTime;
    game.lastTime = currentTime;
    
    update(deltaTime);
    render();
    
    game.animationId = requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Check for level up based on score
    const newLevel = Math.floor(game.score / game.pointsPerLevel) + 1;
    if (newLevel !== game.level) {
        game.level = newLevel;
        // Update raccoon size for new level (no canvas resize to avoid visual jump)
        updateRaccoonSize();
        // Constrain raccoon position to new boundaries
        constrainRaccoon();
        raccoon.x = Math.max(0, Math.min(game.width - raccoon.width, raccoon.x));
        updateUI();
    }
    
    // Update golden boost timer
    if (raccoon.isGolden) {
        raccoon.goldenTimer -= deltaTime;
        if (raccoon.goldenTimer <= 0) {
            // Golden boost expired
            raccoon.isGolden = false;
            raccoon.goldenTimer = 0;
            raccoon.speed = raccoon.normalSpeed;
        }
    }
    
    // Smooth raccoon movement
    const dx = raccoon.targetX - raccoon.x;
    raccoon.x += dx * raccoon.speed * Math.min(deltaTime / 16, 2);
    
    // Spawn trash
    game.spawnTimer += deltaTime;
    if (game.spawnTimer >= game.spawnInterval) {
        spawnTrash();
        game.spawnTimer = 0;
    }
    
    // Increase difficulty
    game.difficultyTimer += deltaTime;
    if (game.difficultyTimer >= game.difficultyInterval) {
        game.spawnInterval = Math.max(game.minSpawnInterval, game.spawnInterval - 100);
        game.difficultyTimer = 0;
    }
    
    // Update trash
    for (let i = trashItems.length - 1; i >= 0; i--) {
        const trash = trashItems[i];
        trash.y += trash.speed * (deltaTime / 16);
        
        // Check collision with raccoon
        if (checkCollision(trash)) {
            game.score += trash.points;
            // Check if this is golden sneaker
            if (trash.isGolden) {
                activateGoldenBoost();
            }
            updateUI();
            trashItems.splice(i, 1);
            continue;
        }
        
        // Check if trash hit ground
        if (trash.y > game.height) {
            // Golden sneakers don't remove lives when missed
            if (!trash.isGolden) {
                game.lives--;
                updateUI();
                
                if (game.lives <= 0) {
                    trashItems.splice(i, 1);
                    gameOver();
                    return;
                }
            }
            trashItems.splice(i, 1);
        }
    }
}

function spawnTrash() {
    // Determine if this should be golden sneaker
    // Spawns approximately once every two levels with randomized interval, starting at level 10
    let type;
    let isGoldenTrash = false;
    
    if (game.level >= game.goldenSneakerNextSpawnLevel && 
        game.goldenSneakerLastSpawnLevel !== game.level) {
        // Spawn golden sneaker
        type = goldenTrashType;
        isGoldenTrash = true;
        game.goldenSneakerLastSpawnLevel = game.level;
        // Set next spawn level: approximately 2 levels later with randomization (1-3 levels)
        game.goldenSneakerNextSpawnLevel = game.level + 1 + Math.floor(Math.random() * 3);
    } else {
        type = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    }
    
    const size = isGoldenTrash ? 45 : 35 + Math.random() * 15; // Golden sneaker is slightly larger
    
    // Calculate trash speed based on level (starts slow, increases with level)
    const levelSpeed = game.baseTrashSpeed + (game.level - 1) * game.trashSpeedIncreasePerLevel;
    const baseSpeed = Math.min(levelSpeed, game.maxTrashSpeed);
    
    trashItems.push({
        x: Math.random() * (game.width - size),
        y: -size,
        width: size,
        height: size,
        speed: baseSpeed + Math.random() * 1,
        emoji: type.emoji,
        points: type.points,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        isGolden: isGoldenTrash
    });
}

// Activate the golden boost when golden sneaker is collected
function activateGoldenBoost() {
    raccoon.isGolden = true;
    raccoon.goldenTimer = raccoon.goldenDuration;
    raccoon.speed = raccoon.normalSpeed * raccoon.goldenSpeedMultiplier;
}

function checkCollision(trash) {
    // Collision zone for the top of the raccoon's head
    // The head is drawn with ears at y + h * 0.05 and head ellipse centered at y + h * 0.18
    // Catch zone covers the top of the head area (ears and upper head)
    const catchZone = {
        x: raccoon.x + raccoon.width * 0.15,
        y: raccoon.y,
        width: raccoon.width * 0.7,
        height: raccoon.height * 0.25
    };
    
    // Trash is caught when it intersects or makes contact with the top of the raccoon's head
    // Check horizontal overlap
    const horizontalOverlap = trash.x < catchZone.x + catchZone.width &&
                              trash.x + trash.width > catchZone.x;
    
    // Check if trash's bottom edge has reached or is within the head zone
    // This ensures trash is caught when it contacts the top of the head
    const verticalContact = trash.y + trash.height >= catchZone.y &&
                            trash.y < catchZone.y + catchZone.height;
    
    return horizontalOverlap && verticalContact;
}

function render() {
    // Clear canvas
    game.ctx.clearRect(0, 0, game.width, game.height);
    
    // Draw background gradient
    const gradient = game.ctx.createLinearGradient(0, 0, 0, game.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#1f3a1f');
    game.ctx.fillStyle = gradient;
    game.ctx.fillRect(0, 0, game.width, game.height);
    
    // Draw stars
    drawStars();
    
    // Draw ground
    game.ctx.fillStyle = '#2d5a2d';
    game.ctx.fillRect(0, game.height - 20, game.width, 20);
    
    // Draw grass
    game.ctx.fillStyle = '#4a8f4a';
    for (let i = 0; i < game.width; i += 15) {
        game.ctx.beginPath();
        game.ctx.moveTo(i, game.height - 20);
        game.ctx.lineTo(i + 7, game.height - 30);
        game.ctx.lineTo(i + 14, game.height - 20);
        game.ctx.fill();
    }
    
    // Draw golden glow behind raccoon if active
    if (raccoon.isGolden) {
        drawGoldenGlow();
    }
    
    // Draw trash can first (behind trash items)
    drawTrashCan();
    
    // Draw trash items (between trash can and raccoon)
    for (const trash of trashItems) {
        game.ctx.save();
        game.ctx.translate(trash.x + trash.width / 2, trash.y + trash.height / 2);
        trash.rotation += trash.rotationSpeed;
        game.ctx.rotate(trash.rotation);
        
        // Add golden glow effect for golden sneaker
        if (trash.isGolden) {
            game.ctx.shadowColor = '#FFD700';
            game.ctx.shadowBlur = 20;
        }
        
        game.ctx.font = `${trash.width}px Arial`;
        game.ctx.textAlign = 'center';
        game.ctx.textBaseline = 'middle';
        game.ctx.fillText(trash.emoji, 0, 0);
        
        // Reset shadow
        if (trash.isGolden) {
            game.ctx.shadowColor = 'transparent';
            game.ctx.shadowBlur = 0;
        }
        
        game.ctx.restore();
    }
    
    // Draw raccoon body (in front of trash items)
    drawRaccoonBody();
    
    // Draw HUD on canvas
    drawHUD();
}

function drawHUD() {
    const ctx = game.ctx;
    const fontSize = Math.max(12, Math.min(16, game.width / 20));
    
    ctx.font = `bold ${fontSize}px 'Comic Sans MS', sans-serif`;
    ctx.textBaseline = 'top';
    
    // Draw score (left)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(5, 5, 80, 25);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${game.score}`, 10, 10);
    
    // Draw level (center)
    const levelText = `Lvl: ${game.level}`;
    const levelWidth = ctx.measureText(levelText).width + 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect((game.width - levelWidth) / 2, 5, levelWidth, 25);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(levelText, game.width / 2, 10);
    
    // Draw lives (right)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(game.width - 75, 5, 70, 25);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${game.lives}`, game.width - 10, 10);
}

function drawGoldenGlow() {
    const ctx = game.ctx;
    const x = raccoon.x;
    const y = raccoon.y;
    const w = raccoon.width;
    const h = raccoon.height;
    
    // Create a pulsating effect based on time
    const pulseTime = Date.now() / 200;
    const pulseIntensity = 0.5 + 0.3 * Math.sin(pulseTime);
    
    // Draw golden glow behind the raccoon
    ctx.save();
    
    // Outer glow
    const gradient = ctx.createRadialGradient(
        x + w / 2, y + h / 2, 0,
        x + w / 2, y + h / 2, w * 0.9
    );
    gradient.addColorStop(0, `rgba(255, 215, 0, ${0.6 * pulseIntensity})`);
    gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.3 * pulseIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.9, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawStars() {
    game.ctx.fillStyle = 'white';
    const starPositions = [
        [0.1, 0.1], [0.3, 0.15], [0.5, 0.08], [0.7, 0.12], [0.9, 0.1],
        [0.15, 0.25], [0.45, 0.22], [0.75, 0.28], [0.85, 0.2],
        [0.2, 0.35], [0.6, 0.32], [0.95, 0.35]
    ];
    
    for (const [xRatio, yRatio] of starPositions) {
        const x = game.width * xRatio;
        const y = game.height * yRatio;
        const size = 1 + Math.random() * 1.5;
        game.ctx.beginPath();
        game.ctx.arc(x, y, size, 0, Math.PI * 2);
        game.ctx.fill();
    }
}

function drawTrashCan() {
    const ctx = game.ctx;
    const x = raccoon.x;
    const y = raccoon.y;
    const w = raccoon.width;
    const h = raccoon.height;
    
    // Scale factor for consistent proportions
    const scale = w / 80;
    
    // Garbage can
    ctx.fillStyle = '#6b6b6b';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.15, y + h * 0.55, w * 0.7, h * 0.45, 5 * scale);
    ctx.fill();
    
    // Can lid
    ctx.fillStyle = '#8a8a8a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.55, w * 0.4, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Can highlights
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(x + w * 0.2, y + h * 0.6, w * 0.08, h * 0.35);
    ctx.fillRect(x + w * 0.35, y + h * 0.6, w * 0.08, h * 0.35);
}

function drawRaccoonBody() {
    const ctx = game.ctx;
    const x = raccoon.x;
    const y = raccoon.y;
    const w = raccoon.width;
    const h = raccoon.height;
    
    // Scale factor for consistent proportions
    const scale = w / 80;
    
    // Golden color palette for when boost is active
    const bodyColor = raccoon.isGolden ? '#D4A017' : '#7a7a7a';
    const headColor = raccoon.isGolden ? '#E5B22A' : '#8a8a8a';
    const earColor = raccoon.isGolden ? '#C49A16' : '#6a6a6a';
    const armColor = raccoon.isGolden ? '#D4A017' : '#7a7a7a';
    const pawColor = raccoon.isGolden ? '#B8860B' : '#5a5a5a';
    const tailColor = raccoon.isGolden ? '#D4A017' : '#7a7a7a';
    const tailStripeColor = raccoon.isGolden ? '#8B6914' : '#4a4a4a';
    
    // Raccoon body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.38, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Raccoon head
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.18, w * 0.32, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.fillStyle = earColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h * 0.05, w * 0.1, h * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.75, y + h * 0.05, w * 0.1, h * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner ears
    ctx.fillStyle = '#ffd5d5';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h * 0.05, w * 0.05, h * 0.04, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.75, y + h * 0.05, w * 0.05, h * 0.04, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Face mask (darker area around eyes)
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.35, y + h * 0.16, w * 0.12, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.65, y + h * 0.16, w * 0.12, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.38, y + h * 0.15, w * 0.07, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.62, y + h * 0.15, w * 0.07, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.40, y + h * 0.15, w * 0.035, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.64, y + h * 0.15, w * 0.035, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x + w * 0.38, y + h * 0.14, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.62, y + h * 0.14, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
    
    // White muzzle
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.24, w * 0.12, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose (on the front of the muzzle where mouth would be)
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.24, w * 0.05, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose highlight
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(x + w * 0.48, y + h * 0.235, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
    
    // Whiskers
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1.5 * scale;
    ctx.lineCap = 'round';
    
    // Left whiskers
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h * 0.22);
    ctx.lineTo(x + w * 0.2, y + h * 0.20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h * 0.24);
    ctx.lineTo(x + w * 0.18, y + h * 0.24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h * 0.26);
    ctx.lineTo(x + w * 0.2, y + h * 0.28);
    ctx.stroke();
    
    // Right whiskers
    ctx.beginPath();
    ctx.moveTo(x + w * 0.62, y + h * 0.22);
    ctx.lineTo(x + w * 0.8, y + h * 0.20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.62, y + h * 0.24);
    ctx.lineTo(x + w * 0.82, y + h * 0.24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.62, y + h * 0.26);
    ctx.lineTo(x + w * 0.8, y + h * 0.28);
    ctx.stroke();
    
    // Arms holding can
    ctx.fillStyle = armColor;
    // Left arm
    ctx.beginPath();
    ctx.ellipse(x + w * 0.18, y + h * 0.45, w * 0.08, h * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Right arm  
    ctx.beginPath();
    ctx.ellipse(x + w * 0.82, y + h * 0.45, w * 0.08, h * 0.12, 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Paws
    ctx.fillStyle = pawColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.12, y + h * 0.52, w * 0.06, h * 0.04, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.88, y + h * 0.52, w * 0.06, h * 0.04, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = tailColor;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.85, y + h * 0.4);
    ctx.quadraticCurveTo(x + w * 1.1, y + h * 0.3, x + w * 1.0, y + h * 0.15);
    ctx.quadraticCurveTo(x + w * 0.95, y + h * 0.25, x + w * 0.75, y + h * 0.38);
    ctx.fill();
    
    // Tail stripes
    ctx.fillStyle = tailStripeColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.92, y + h * 0.32, w * 0.04, h * 0.025, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.98, y + h * 0.22, w * 0.035, h * 0.02, 0.6, 0, Math.PI * 2);
    ctx.fill();
}

function updateUI() {
    // HUD is now drawn on canvas in drawHUD()
    // This function is kept for compatibility but may be used 
    // for other UI updates if needed
}

function gameOver() {
    game.isRunning = false;
    if (game.animationId) {
        cancelAnimationFrame(game.animationId);
    }
    
    finalScore.textContent = game.score;
    gameOverScreen.classList.remove('hidden');
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
