// Game state
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    score: 0,
    lives: 3,
    isRunning: false,
    animationId: null,
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 1500,
    minSpawnInterval: 600,
    difficultyTimer: 0,
    difficultyInterval: 10000
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
    speed: 0.15
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

// DOM elements
let startScreen, gameScreen, gameOverScreen;
let scoreDisplay, livesDisplay, finalScore;

// Touch/mouse tracking
let touchStartX = 0;
let isDragging = false;

// Initialize game
function init() {
    startScreen = document.getElementById('start-screen');
    gameScreen = document.getElementById('game-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    scoreDisplay = document.getElementById('score');
    livesDisplay = document.getElementById('lives');
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
    game.canvas.width = window.innerWidth;
    game.canvas.height = window.innerHeight;
    game.width = game.canvas.width;
    game.height = game.canvas.height;
    
    // Update raccoon position
    raccoon.width = Math.min(80, game.width * 0.15);
    raccoon.height = raccoon.width * 1.25;
    raccoon.y = game.height - raccoon.height - 20;
    
    if (!game.isRunning) {
        raccoon.x = (game.width - raccoon.width) / 2;
        raccoon.targetX = raccoon.x;
    }
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
    game.isRunning = true;
    game.spawnInterval = 1500;
    game.spawnTimer = 0;
    game.difficultyTimer = 0;
    trashItems = [];
    
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
            updateUI();
            trashItems.splice(i, 1);
            continue;
        }
        
        // Check if trash hit ground
        if (trash.y > game.height) {
            game.lives--;
            updateUI();
            trashItems.splice(i, 1);
            
            if (game.lives <= 0) {
                gameOver();
                return;
            }
        }
    }
}

function spawnTrash() {
    const type = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    const size = 35 + Math.random() * 15;
    
    trashItems.push({
        x: Math.random() * (game.width - size),
        y: -size,
        width: size,
        height: size,
        speed: 2 + Math.random() * 2 + (game.score / 500),
        emoji: type.emoji,
        points: type.points,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1
    });
}

function checkCollision(trash) {
    // Collision box for the garbage can (lower part of raccoon sprite)
    const catchZone = {
        x: raccoon.x + raccoon.width * 0.1,
        y: raccoon.y + raccoon.height * 0.4,
        width: raccoon.width * 0.8,
        height: raccoon.height * 0.6
    };
    
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
    
    // Draw trash items
    for (const trash of trashItems) {
        game.ctx.save();
        game.ctx.translate(trash.x + trash.width / 2, trash.y + trash.height / 2);
        trash.rotation += trash.rotationSpeed;
        game.ctx.rotate(trash.rotation);
        game.ctx.font = `${trash.width}px Arial`;
        game.ctx.textAlign = 'center';
        game.ctx.textBaseline = 'middle';
        game.ctx.fillText(trash.emoji, 0, 0);
        game.ctx.restore();
    }
    
    // Draw raccoon
    drawRaccoon();
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

function drawRaccoon() {
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
    
    // Raccoon body
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.38, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Raccoon head
    ctx.fillStyle = '#8a8a8a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.18, w * 0.32, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.fillStyle = '#6a6a6a';
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
    
    // Nose
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.21, w * 0.05, h * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose highlight
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(x + w * 0.48, y + h * 0.205, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
    
    // White muzzle
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.24, w * 0.12, h * 0.05, 0, 0, Math.PI * 2);
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
    ctx.fillStyle = '#7a7a7a';
    // Left arm
    ctx.beginPath();
    ctx.ellipse(x + w * 0.18, y + h * 0.45, w * 0.08, h * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Right arm  
    ctx.beginPath();
    ctx.ellipse(x + w * 0.82, y + h * 0.45, w * 0.08, h * 0.12, 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Paws
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.12, y + h * 0.52, w * 0.06, h * 0.04, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.88, y + h * 0.52, w * 0.06, h * 0.04, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.85, y + h * 0.4);
    ctx.quadraticCurveTo(x + w * 1.1, y + h * 0.3, x + w * 1.0, y + h * 0.15);
    ctx.quadraticCurveTo(x + w * 0.95, y + h * 0.25, x + w * 0.75, y + h * 0.38);
    ctx.fill();
    
    // Tail stripes
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.92, y + h * 0.32, w * 0.04, h * 0.025, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.98, y + h * 0.22, w * 0.035, h * 0.02, 0.6, 0, Math.PI * 2);
    ctx.fill();
}

function updateUI() {
    scoreDisplay.textContent = game.score;
    livesDisplay.textContent = game.lives;
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
