// Game state
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    score: 0,
    highScore: 0, // Session high score
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
    // Golden sneaker settings - spawn very infrequently
    goldenSneakerMinLevel: 10,
    goldenSneakerLastSpawnLevel: 0, // Tracks last level a golden sneaker spawned
    goldenSneakerNextSpawnLevel: 0,  // The next level at which golden sneaker will spawn
    // Red berry settings (3x size for 10 seconds, starts at level 15)
    redBerryMinLevel: 15,
    redBerryLastSpawnLevel: 0,
    redBerryNextSpawnLevel: 0,
    // Green fish skeleton settings (shrink for 10 seconds, starts at level 18)
    greenFishMinLevel: 18,
    greenFishLastSpawnLevel: 0,
    greenFishNextSpawnLevel: 0
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
    baseWidth: 80, // Store original width for size effects
    baseHeight: 100, // Store original height for size effects
    targetX: 0,
    speed: 0.15,
    // Golden boost state
    isGolden: false,
    goldenTimer: 0,
    goldenDuration: 15000, // 15 seconds in milliseconds
    normalSpeed: 0.15,
    goldenSpeedMultiplier: 1.5, // 50% speed boost
    // Red berry effect (3x size)
    isGiant: false,
    giantTimer: 0,
    giantDuration: 10000, // 10 seconds
    giantSizeMultiplier: 3.0,
    // Green fish effect (tiny size)
    isTiny: false,
    tinyTimer: 0,
    tinyDuration: 10000, // 10 seconds
    tinySizeMultiplier: 0.3
};

// Trash items
let trashItems = [];

// Trash types - non-food items only (drawn as custom graphics)
const trashTypes = [
    { type: 'can', points: 10 },           // Aluminum can
    { type: 'bottle', points: 15 },        // Plastic bottle
    { type: 'box', points: 20 },           // Cardboard box
    { type: 'newspaper', points: 10 },     // Newspaper
    { type: 'bag', points: 15 },           // Plastic bag
    { type: 'tire', points: 20 },          // Old tire
    { type: 'battery', points: 15 },       // Battery
    { type: 'shoe', points: 10 },          // Old shoe
    { type: 'sock', points: 10 },          // Dirty sock
    { type: 'paper', points: 15 }          // Crumpled paper
];

// Golden sneaker (special item after level 10)
const goldenTrashType = {
    type: 'golden_sneaker',
    points: 0,
    isGolden: true
};

// Red berry (3x size power-up after level 15)
const redBerryType = {
    type: 'red_berry',
    points: 0,
    isRedBerry: true
};

// Green fish skeleton (shrink power-up after level 18)
const greenFishType = {
    type: 'green_fish',
    points: 0,
    isGreenFish: true
};

// DOM elements
let menuScreen, startScreen, gameScreen, gameOverScreen;
let finalScore;

// Touch/mouse tracking
let touchStartX = 0;
let isDragging = false;

// Show main menu
function showMenu() {
    menuScreen.classList.remove('hidden');
    startScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Also hide stack game screens if they exist
    const stackStartScreen = document.getElementById('stack-start-screen');
    const stackGameScreen = document.getElementById('stack-game-screen');
    const stackGameOverScreen = document.getElementById('stack-game-over-screen');
    if (stackStartScreen) stackStartScreen.classList.add('hidden');
    if (stackGameScreen) stackGameScreen.classList.add('hidden');
    if (stackGameOverScreen) stackGameOverScreen.classList.add('hidden');
}

// Initialize game
function init() {
    menuScreen = document.getElementById('menu-screen');
    startScreen = document.getElementById('start-screen');
    gameScreen = document.getElementById('game-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    finalScore = document.getElementById('final-score');
    
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Set up canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Menu event listeners
    document.getElementById('trash-catcher-btn').addEventListener('click', showTrashCatcherStart);
    document.getElementById('trash-stack-btn').addEventListener('click', showTrashStackStart);
    
    // Event listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('back-to-menu-btn').addEventListener('click', showMenu);
    document.getElementById('menu-btn-1').addEventListener('click', showMenu);
    
    // Input handlers
    setupInputHandlers();
}

function showTrashCatcherStart() {
    menuScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

function showTrashStackStart() {
    menuScreen.classList.add('hidden');
    const stackStartScreen = document.getElementById('stack-start-screen');
    if (stackStartScreen) stackStartScreen.classList.remove('hidden');
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
    let levelRaccoonWidth = Math.max(game.minRaccoonWidth, baseSizeForLevel);
    
    // Apply giant effect (3x size)
    if (raccoon.isGiant) {
        levelRaccoonWidth *= raccoon.giantSizeMultiplier;
    }
    // Apply tiny effect (0.3x size)
    else if (raccoon.isTiny) {
        levelRaccoonWidth *= raccoon.tinySizeMultiplier;
    }
    
    // Update raccoon size (cap at configured ratio of game width, unless giant)
    if (!raccoon.isGiant) {
        raccoon.width = Math.min(levelRaccoonWidth, game.width * game.maxRaccoonWidthRatio);
    } else {
        raccoon.width = Math.min(levelRaccoonWidth, game.width * 0.9); // Allow larger size when giant
    }
    raccoon.height = raccoon.width * 1.25;
    raccoon.y = game.height - raccoon.height - 20;
    
    // Store base dimensions for reference
    raccoon.baseWidth = levelRaccoonWidth;
    raccoon.baseHeight = levelRaccoonWidth * 1.25;
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
    menuScreen.classList.add('hidden');
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
    // Set first golden sneaker spawn level (level 10 + random 5-10 levels for very infrequent spawning)
    game.goldenSneakerNextSpawnLevel = game.goldenSneakerMinLevel + Math.floor(Math.random() * 6) + 5;
    
    // Reset red berry spawning state
    game.redBerryLastSpawnLevel = 0;
    game.redBerryNextSpawnLevel = game.redBerryMinLevel + Math.floor(Math.random() * 4) + 3;
    
    // Reset green fish spawning state
    game.greenFishLastSpawnLevel = 0;
    game.greenFishNextSpawnLevel = game.greenFishMinLevel + Math.floor(Math.random() * 4) + 3;
    
    // Reset golden boost state
    raccoon.isGolden = false;
    raccoon.goldenTimer = 0;
    raccoon.speed = raccoon.normalSpeed;
    
    // Reset giant state
    raccoon.isGiant = false;
    raccoon.giantTimer = 0;
    
    // Reset tiny state
    raccoon.isTiny = false;
    raccoon.tinyTimer = 0;
    
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
    
    // Update giant effect timer
    if (raccoon.isGiant) {
        raccoon.giantTimer -= deltaTime;
        if (raccoon.giantTimer <= 0) {
            raccoon.isGiant = false;
            raccoon.giantTimer = 0;
            updateRaccoonSize(); // Reset size
        }
    }
    
    // Update tiny effect timer
    if (raccoon.isTiny) {
        raccoon.tinyTimer -= deltaTime;
        if (raccoon.tinyTimer <= 0) {
            raccoon.isTiny = false;
            raccoon.tinyTimer = 0;
            updateRaccoonSize(); // Reset size
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
            // Check if this is red berry (giant effect)
            if (trash.isRedBerry) {
                activateGiantEffect();
            }
            // Check if this is green fish (tiny effect)
            if (trash.isGreenFish) {
                activateTinyEffect();
            }
            updateUI();
            trashItems.splice(i, 1);
            continue;
        }
        
        // Check if trash hit ground
        if (trash.y > game.height) {
            // Don't lose lives during golden period, or for special power-up items
            if (!trash.isGolden && !trash.isRedBerry && !trash.isGreenFish && !raccoon.isGolden) {
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
    // Determine if this should be a special power-up item
    let type;
    let isGoldenTrash = false;
    let isRedBerryTrash = false;
    let isGreenFishTrash = false;
    
    // Check for green fish skeleton spawn (level 18+, infrequent)
    if (game.level >= game.greenFishNextSpawnLevel && 
        game.greenFishLastSpawnLevel !== game.level) {
        type = greenFishType;
        isGreenFishTrash = true;
        game.greenFishLastSpawnLevel = game.level;
        // Set next spawn level: 5-8 levels later (infrequent)
        game.greenFishNextSpawnLevel = game.level + 5 + Math.floor(Math.random() * 4);
    }
    // Check for red berry spawn (level 15+, infrequent)
    else if (game.level >= game.redBerryNextSpawnLevel && 
        game.redBerryLastSpawnLevel !== game.level) {
        type = redBerryType;
        isRedBerryTrash = true;
        game.redBerryLastSpawnLevel = game.level;
        // Set next spawn level: 5-8 levels later (infrequent)
        game.redBerryNextSpawnLevel = game.level + 5 + Math.floor(Math.random() * 4);
    }
    // Check for golden sneaker spawn (level 10+, very infrequent)
    else if (game.level >= game.goldenSneakerNextSpawnLevel && 
        game.goldenSneakerLastSpawnLevel !== game.level) {
        type = goldenTrashType;
        isGoldenTrash = true;
        game.goldenSneakerLastSpawnLevel = game.level;
        // Set next spawn level: 8-12 levels later (very infrequent)
        game.goldenSneakerNextSpawnLevel = game.level + 8 + Math.floor(Math.random() * 5);
    } else {
        type = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    }
    
    const isSpecialItem = isGoldenTrash || isRedBerryTrash || isGreenFishTrash;
    const size = isSpecialItem ? 45 : 35 + Math.random() * 15;
    
    // Calculate trash speed based on level (starts slow, increases with level)
    const levelSpeed = game.baseTrashSpeed + (game.level - 1) * game.trashSpeedIncreasePerLevel;
    const baseSpeed = Math.min(levelSpeed, game.maxTrashSpeed);
    
    trashItems.push({
        x: Math.random() * (game.width - size),
        y: -size,
        width: size,
        height: size,
        speed: baseSpeed + Math.random() * 1,
        type: type.type,
        points: type.points,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        isGolden: isGoldenTrash,
        isRedBerry: isRedBerryTrash,
        isGreenFish: isGreenFishTrash
    });
}

// Activate the golden boost when golden sneaker is collected
function activateGoldenBoost() {
    raccoon.isGolden = true;
    raccoon.goldenTimer = raccoon.goldenDuration;
    raccoon.speed = raccoon.normalSpeed * raccoon.goldenSpeedMultiplier;
}

// Activate the giant effect when red berry is collected
function activateGiantEffect() {
    raccoon.isGiant = true;
    raccoon.isTiny = false; // Cancel tiny effect if active
    raccoon.giantTimer = raccoon.giantDuration;
    updateRaccoonSize();
}

// Activate the tiny effect when green fish is collected
function activateTinyEffect() {
    raccoon.isTiny = true;
    raccoon.isGiant = false; // Cancel giant effect if active
    raccoon.tinyTimer = raccoon.tinyDuration;
    updateRaccoonSize();
}

function checkCollision(trash) {
    // Collision zone covers the entire raccoon sprite
    const catchZone = {
        x: raccoon.x,
        y: raccoon.y,
        width: raccoon.width,
        height: raccoon.height
    };
    
    // Trash is caught when it intersects with any part of the raccoon
    return trash.x < catchZone.x + catchZone.width &&
           trash.x + trash.width > catchZone.x &&
           trash.y < catchZone.y + catchZone.height &&
           trash.y + trash.height > catchZone.y;
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
    
    // Draw giant glow behind raccoon if active
    if (raccoon.isGiant) {
        drawGiantGlow();
    }
    
    // Draw tiny glow behind raccoon if active
    if (raccoon.isTiny) {
        drawTinyGlow();
    }
    
    // Draw raccoon back (body, head, tail - behind trash can and trash items)
    drawRaccoonBack();
    
    // Draw trash items (falling toward the trash can)
    for (const trash of trashItems) {
        game.ctx.save();
        game.ctx.translate(trash.x + trash.width / 2, trash.y + trash.height / 2);
        trash.rotation += trash.rotationSpeed;
        game.ctx.rotate(trash.rotation);
        
        // Add glow effects for special items
        if (trash.isGolden) {
            game.ctx.shadowColor = '#FFFF00';
            game.ctx.shadowBlur = 35;
        } else if (trash.isRedBerry) {
            game.ctx.shadowColor = '#FF0000';
            game.ctx.shadowBlur = 40;
        } else if (trash.isGreenFish) {
            game.ctx.shadowColor = '#00FF00';
            game.ctx.shadowBlur = 40;
        }
        
        // Draw custom trash graphics
        drawTrashItem(game.ctx, trash.type, trash.width);
        
        // Reset shadow
        if (trash.isGolden || trash.isRedBerry || trash.isGreenFish) {
            game.ctx.shadowColor = 'transparent';
            game.ctx.shadowBlur = 0;
        }
        
        game.ctx.restore();
    }
    
    // Draw trash can (in front, so raccoon appears to hold it forward)
    drawTrashCan();
    
    // Draw raccoon arms last (in front of trash can, holding it)
    drawRaccoonArms();
    
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
    
    // Draw high score (below score)
    if (game.highScore > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(5, 35, 80, 20);
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.fillText(`Best: ${game.highScore}`, 10, 38);
    }
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
    gradient.addColorStop(0, `rgba(255, 255, 0, ${0.6 * pulseIntensity})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 0, ${0.3 * pulseIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.9, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawGiantGlow() {
    const ctx = game.ctx;
    const x = raccoon.x;
    const y = raccoon.y;
    const w = raccoon.width;
    const h = raccoon.height;
    
    // Create a pulsating effect based on time
    const pulseTime = Date.now() / 150;
    const pulseIntensity = 0.5 + 0.3 * Math.sin(pulseTime);
    
    // Draw red glow behind the raccoon
    ctx.save();
    
    const gradient = ctx.createRadialGradient(
        x + w / 2, y + h / 2, 0,
        x + w / 2, y + h / 2, w * 0.9
    );
    gradient.addColorStop(0, `rgba(255, 0, 0, ${0.5 * pulseIntensity})`);
    gradient.addColorStop(0.5, `rgba(255, 0, 0, ${0.25 * pulseIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.9, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawTinyGlow() {
    const ctx = game.ctx;
    const x = raccoon.x;
    const y = raccoon.y;
    const w = raccoon.width;
    const h = raccoon.height;
    
    // Create a pulsating effect based on time
    const pulseTime = Date.now() / 150;
    const pulseIntensity = 0.5 + 0.3 * Math.sin(pulseTime);
    
    // Draw green glow behind the raccoon
    ctx.save();
    
    const gradient = ctx.createRadialGradient(
        x + w / 2, y + h / 2, 0,
        x + w / 2, y + h / 2, w * 1.5
    );
    gradient.addColorStop(0, `rgba(0, 255, 0, ${0.5 * pulseIntensity})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 0, ${0.25 * pulseIntensity})`);
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 1.5, h * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Draw custom trash item graphics
function drawTrashItem(ctx, type, size) {
    const s = size / 2; // Half size for drawing from center
    
    switch(type) {
        case 'can':
            // Aluminum can
            ctx.fillStyle = '#C0C0C0';
            ctx.beginPath();
            ctx.ellipse(0, 0, s * 0.6, s * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#808080';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Top ring
            ctx.fillStyle = '#A0A0A0';
            ctx.beginPath();
            ctx.ellipse(0, -s * 0.7, s * 0.5, s * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pull tab
            ctx.fillStyle = '#707070';
            ctx.beginPath();
            ctx.ellipse(0, -s * 0.6, s * 0.2, s * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'bottle':
            // Plastic bottle
            ctx.fillStyle = '#87CEEB';
            ctx.globalAlpha = 0.8;
            // Body
            ctx.beginPath();
            ctx.ellipse(0, s * 0.2, s * 0.5, s * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            // Neck
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(-s * 0.15, -s * 0.8, s * 0.3, s * 0.5);
            // Cap
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1E90FF';
            ctx.fillRect(-s * 0.2, -s * 0.95, s * 0.4, s * 0.2);
            break;
            
        case 'box':
            // Cardboard box
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(-s * 0.8, -s * 0.6, s * 1.6, s * 1.2);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.strokeRect(-s * 0.8, -s * 0.6, s * 1.6, s * 1.2);
            // Tape
            ctx.fillStyle = '#DEB887';
            ctx.fillRect(-s * 0.1, -s * 0.6, s * 0.2, s * 1.2);
            break;
            
        case 'newspaper':
            // Newspaper
            ctx.fillStyle = '#F5F5DC';
            ctx.fillRect(-s * 0.7, -s * 0.5, s * 1.4, s * 1.0);
            ctx.strokeStyle = '#808080';
            ctx.lineWidth = 1;
            // Text lines
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(-s * 0.5, -s * 0.3 + i * s * 0.2);
                ctx.lineTo(s * 0.5, -s * 0.3 + i * s * 0.2);
                ctx.stroke();
            }
            break;
            
        case 'bag':
            // Plastic bag
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.8);
            ctx.quadraticCurveTo(s * 0.8, -s * 0.3, s * 0.6, s * 0.8);
            ctx.lineTo(-s * 0.6, s * 0.8);
            ctx.quadraticCurveTo(-s * 0.8, -s * 0.3, 0, -s * 0.8);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 1;
            ctx.stroke();
            break;
            
        case 'tire':
            // Old tire
            ctx.fillStyle = '#2F2F2F';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
            ctx.fill();
            // Tread marks
            ctx.strokeStyle = '#3F3F3F';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * s * 0.5, Math.sin(angle) * s * 0.5);
                ctx.lineTo(Math.cos(angle) * s * 0.75, Math.sin(angle) * s * 0.75);
                ctx.stroke();
            }
            break;
            
        case 'battery':
            // Battery
            ctx.fillStyle = '#2F4F4F';
            ctx.fillRect(-s * 0.4, -s * 0.7, s * 0.8, s * 1.4);
            // Positive terminal
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-s * 0.15, -s * 0.85, s * 0.3, s * 0.2);
            // Labels
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.3);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${s * 0.3}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', 0, -s * 0.15);
            break;
            
        case 'shoe':
            // Old shoe
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(s * 0.2, 0, s * 0.7, s * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Sole
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(-s * 0.4, s * 0.2, s * 1.2, s * 0.2);
            // Laces
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-s * 0.2, -s * 0.2);
            ctx.lineTo(s * 0.2, -s * 0.2);
            ctx.stroke();
            break;
            
        case 'sock':
            // Dirty sock
            ctx.fillStyle = '#D3D3D3';
            ctx.beginPath();
            ctx.moveTo(-s * 0.3, -s * 0.8);
            ctx.quadraticCurveTo(-s * 0.4, s * 0.3, 0, s * 0.6);
            ctx.quadraticCurveTo(s * 0.5, s * 0.4, s * 0.3, s * 0.1);
            ctx.quadraticCurveTo(s * 0.2, -s * 0.3, s * 0.1, -s * 0.8);
            ctx.closePath();
            ctx.fill();
            // Dirt spots
            ctx.fillStyle = '#8B7355';
            ctx.beginPath();
            ctx.arc(-s * 0.1, s * 0.1, s * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(s * 0.15, s * 0.3, s * 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'paper':
            // Crumpled paper
            ctx.fillStyle = '#FFFAF0';
            ctx.beginPath();
            ctx.moveTo(-s * 0.6, -s * 0.3);
            ctx.lineTo(-s * 0.2, -s * 0.7);
            ctx.lineTo(s * 0.4, -s * 0.5);
            ctx.lineTo(s * 0.7, 0);
            ctx.lineTo(s * 0.3, s * 0.6);
            ctx.lineTo(-s * 0.3, s * 0.5);
            ctx.lineTo(-s * 0.7, s * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#DDD';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Crumple lines
            ctx.beginPath();
            ctx.moveTo(-s * 0.3, -s * 0.2);
            ctx.lineTo(s * 0.2, s * 0.1);
            ctx.stroke();
            break;
            
        case 'golden_sneaker':
            // Golden sneaker
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(s * 0.1, 0, s * 0.8, s * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Sole
            ctx.fillStyle = '#B8860B';
            ctx.fillRect(-s * 0.6, s * 0.3, s * 1.4, s * 0.2);
            // Laces
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-s * 0.3, -s * 0.2);
            ctx.lineTo(s * 0.1, -s * 0.3);
            ctx.lineTo(s * 0.3, -s * 0.2);
            ctx.stroke();
            // Sparkle
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(s * 0.4, -s * 0.2, s * 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'red_berry':
            // Glowing red berry
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = '#FF6666';
            ctx.beginPath();
            ctx.arc(-s * 0.2, -s * 0.2, s * 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Stem
            ctx.strokeStyle = '#228B22';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.5);
            ctx.quadraticCurveTo(s * 0.2, -s * 0.8, s * 0.3, -s * 0.7);
            ctx.stroke();
            // Leaf
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.ellipse(s * 0.15, -s * 0.65, s * 0.2, s * 0.1, 0.5, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'green_fish':
            // Glowing green fish skeleton
            ctx.strokeStyle = '#00FF00';
            ctx.fillStyle = '#00FF00';
            ctx.lineWidth = 2;
            // Spine
            ctx.beginPath();
            ctx.moveTo(-s * 0.8, 0);
            ctx.lineTo(s * 0.6, 0);
            ctx.stroke();
            // Head (skull)
            ctx.beginPath();
            ctx.arc(s * 0.6, 0, s * 0.25, 0, Math.PI * 2);
            ctx.stroke();
            // Eye socket
            ctx.beginPath();
            ctx.arc(s * 0.65, -s * 0.05, s * 0.08, 0, Math.PI * 2);
            ctx.fill();
            // Ribs
            for (let i = 0; i < 5; i++) {
                const x = -s * 0.5 + i * s * 0.25;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x - s * 0.1, -s * 0.3);
                ctx.moveTo(x, 0);
                ctx.lineTo(x - s * 0.1, s * 0.3);
                ctx.stroke();
            }
            // Tail
            ctx.beginPath();
            ctx.moveTo(-s * 0.8, 0);
            ctx.lineTo(-s * 0.95, -s * 0.3);
            ctx.moveTo(-s * 0.8, 0);
            ctx.lineTo(-s * 0.95, s * 0.3);
            ctx.stroke();
            break;
            
        default:
            // Fallback: simple circle
            ctx.fillStyle = '#888888';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
            ctx.fill();
    }
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
    
    // Trash can dimensions
    const canTop = y + h * 0.48;
    const canBottom = y + h * 0.98;
    const canHeight = canBottom - canTop;
    const topWidth = w * 0.75;
    const bottomWidth = w * 0.6;
    const centerX = x + w * 0.5;
    
    // Draw trash can body (tapered shape - wider at top)
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.moveTo(centerX - topWidth / 2, canTop);
    ctx.lineTo(centerX + topWidth / 2, canTop);
    ctx.lineTo(centerX + bottomWidth / 2, canBottom);
    ctx.lineTo(centerX - bottomWidth / 2, canBottom);
    ctx.closePath();
    ctx.fill();
    
    // Draw darker outline
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    
    // Horizontal ridges on can body
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1.5 * scale;
    for (let i = 1; i <= 3; i++) {
        const ridgeY = canTop + (canHeight * i) / 4;
        const ridgeProgress = i / 4;
        const ridgeWidth = topWidth - (topWidth - bottomWidth) * ridgeProgress;
        ctx.beginPath();
        ctx.moveTo(centerX - ridgeWidth / 2, ridgeY);
        ctx.lineTo(centerX + ridgeWidth / 2, ridgeY);
        ctx.stroke();
    }
    
    // Highlight on left side
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath();
    ctx.moveTo(centerX - topWidth / 2 + 4 * scale, canTop + 2 * scale);
    ctx.lineTo(centerX - topWidth / 2 + 12 * scale, canTop + 2 * scale);
    ctx.lineTo(centerX - bottomWidth / 2 + 10 * scale, canBottom - 2 * scale);
    ctx.lineTo(centerX - bottomWidth / 2 + 4 * scale, canBottom - 2 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Rim at top of can (ellipse)
    ctx.fillStyle = '#6a6a6a';
    ctx.beginPath();
    ctx.ellipse(centerX, canTop, topWidth / 2, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
    
    // Inner rim (darker, showing opening)
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.ellipse(centerX, canTop, topWidth / 2 - 4 * scale, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Handles on sides
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    
    // Left handle
    ctx.beginPath();
    ctx.moveTo(centerX - topWidth / 2 - 2 * scale, canTop + canHeight * 0.2);
    ctx.quadraticCurveTo(centerX - topWidth / 2 - 8 * scale, canTop + canHeight * 0.35, 
                         centerX - topWidth / 2 - 2 * scale, canTop + canHeight * 0.5);
    ctx.stroke();
    
    // Right handle
    ctx.beginPath();
    ctx.moveTo(centerX + topWidth / 2 + 2 * scale, canTop + canHeight * 0.2);
    ctx.quadraticCurveTo(centerX + topWidth / 2 + 8 * scale, canTop + canHeight * 0.35, 
                         centerX + topWidth / 2 + 2 * scale, canTop + canHeight * 0.5);
    ctx.stroke();
}

// Helper function to get raccoon colors based on golden state
function getRaccoonColors() {
    return {
        body: raccoon.isGolden ? '#D4A017' : '#7a7a7a',
        head: raccoon.isGolden ? '#E5B22A' : '#8a8a8a',
        ear: raccoon.isGolden ? '#C49A16' : '#6a6a6a',
        arm: raccoon.isGolden ? '#D4A017' : '#7a7a7a',
        paw: raccoon.isGolden ? '#B8860B' : '#5a5a5a',
        tail: raccoon.isGolden ? '#D4A017' : '#7a7a7a',
        tailStripe: raccoon.isGolden ? '#8B6914' : '#4a4a4a'
    };
}

function drawRaccoonBack() {
    const ctx = game.ctx;
    const x = raccoon.x;
    const y = raccoon.y;
    const w = raccoon.width;
    const h = raccoon.height;
    
    // Scale factor for consistent proportions
    const scale = w / 80;
    
    // Get colors based on golden state
    const colors = getRaccoonColors();
    
    // Tail (drawn first, behind body)
    ctx.fillStyle = colors.tail;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.85, y + h * 0.4);
    ctx.quadraticCurveTo(x + w * 1.1, y + h * 0.3, x + w * 1.0, y + h * 0.15);
    ctx.quadraticCurveTo(x + w * 0.95, y + h * 0.25, x + w * 0.75, y + h * 0.38);
    ctx.fill();
    
    // Tail stripes
    ctx.fillStyle = colors.tailStripe;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.92, y + h * 0.32, w * 0.04, h * 0.025, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.98, y + h * 0.22, w * 0.035, h * 0.02, 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Raccoon body
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.38, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Raccoon head
    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.18, w * 0.32, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.fillStyle = colors.ear;
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
}

function drawRaccoonArms() {
    const ctx = game.ctx;
    const x = raccoon.x;
    const y = raccoon.y;
    const w = raccoon.width;
    const h = raccoon.height;
    
    // Get colors based on golden state
    const colors = getRaccoonColors();
    
    // Arms holding can (drawn in front of trash can)
    ctx.fillStyle = colors.arm;
    // Left arm - shorter and positioned to grip trash can
    ctx.beginPath();
    ctx.ellipse(x + w * 0.22, y + h * 0.48, w * 0.07, h * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Right arm - shorter and positioned to grip trash can
    ctx.beginPath();
    ctx.ellipse(x + w * 0.78, y + h * 0.48, w * 0.07, h * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Paws (gripping the trash can)
    ctx.fillStyle = colors.paw;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.17, y + h * 0.52, w * 0.05, h * 0.035, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.83, y + h * 0.52, w * 0.05, h * 0.035, 0.3, 0, Math.PI * 2);
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
    
    // Update high score if current score is higher
    if (game.score > game.highScore) {
        game.highScore = game.score;
    }
    
    finalScore.textContent = game.score;
    gameOverScreen.classList.remove('hidden');
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
