// Trash Stack Game
// A game where you catch falling raccoons and stack them

const stackGame = {
    canvas: null,
    ctx: null,
    width: 400,
    height: 550,
    isRunning: false,
    animationId: null,
    lastTime: 0,
    
    // Camera/view offset
    cameraY: 0,
    targetCameraY: 0,
    cameraSmoothing: 0.05,
    
    // Spawn settings
    spawnTimer: 0,
    spawnInterval: 2500,
    minSpawnInterval: 1500,
    initialDelay: 1500, // Delay before first raccoon spawns
    
    // Game stats
    raccoonsStacked: 0,
    heightReached: 0,
    lives: 3, // Player has 3 chances to miss
    
    // Physics
    gravity: 0.25,
    groundY: 0,
    
    // Wobble increases with stack height
    wobbleAmount: 0,
    wobbleSpeed: 0.03,
    wobblePhase: 0,
    maxWobble: 15
};

// Base raccoon (player controlled)
const baseRaccoon = {
    x: 0,
    y: 0,
    width: 60,
    height: 75,
    targetX: 0,
    speed: 0.12,
    baseSpeed: 0.12
};

// Stack of raccoons
let raccoonStack = [];

// Falling raccoons
let fallingRaccoons = [];

// DOM elements for stack game
let stackStartScreen, stackGameScreen, stackGameOverScreen;
let stackFinalScore, stackHeight;

// Touch/mouse tracking for stack game
let stackTouchStartX = 0;
let stackIsDragging = false;

// Initialize stack game
function initStackGame() {
    stackStartScreen = document.getElementById('stack-start-screen');
    stackGameScreen = document.getElementById('stack-game-screen');
    stackGameOverScreen = document.getElementById('stack-game-over-screen');
    stackFinalScore = document.getElementById('stack-final-score');
    stackHeight = document.getElementById('stack-height');
    
    stackGame.canvas = document.getElementById('stack-canvas');
    stackGame.ctx = stackGame.canvas.getContext('2d');
    
    // Set up canvas size
    resizeStackCanvas();
    window.addEventListener('resize', resizeStackCanvas);
    
    // Event listeners
    document.getElementById('stack-start-btn').addEventListener('click', startStackGame);
    document.getElementById('stack-restart-btn').addEventListener('click', restartStackGame);
    document.getElementById('back-to-menu-btn-2').addEventListener('click', showMenuFromStack);
    document.getElementById('menu-btn-2').addEventListener('click', showMenuFromStack);
    
    // Input handlers
    setupStackInputHandlers();
}

function showMenuFromStack() {
    // Stop game if running
    if (stackGame.isRunning) {
        stackGame.isRunning = false;
        if (stackGame.animationId) {
            cancelAnimationFrame(stackGame.animationId);
        }
    }
    
    // Hide all stack screens and show menu
    stackStartScreen.classList.add('hidden');
    stackGameScreen.classList.add('hidden');
    stackGameOverScreen.classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}

function resizeStackCanvas() {
    const targetWidth = stackGame.width;
    const targetHeight = stackGame.height;
    
    const maxWidth = Math.min(targetWidth, window.innerWidth);
    const maxHeight = Math.min(targetHeight, window.innerHeight);
    
    stackGame.canvas.width = maxWidth;
    stackGame.canvas.height = maxHeight;
    stackGame.width = stackGame.canvas.width;
    stackGame.height = stackGame.canvas.height;
    stackGame.groundY = stackGame.height - 30;
    
    // Position base raccoon
    if (!stackGame.isRunning) {
        baseRaccoon.x = (stackGame.width - baseRaccoon.width) / 2;
        baseRaccoon.targetX = baseRaccoon.x;
        baseRaccoon.y = stackGame.groundY - baseRaccoon.height;
    }
}

function setupStackInputHandlers() {
    // Touch events
    stackGame.canvas.addEventListener('touchstart', handleStackTouchStart, { passive: false });
    stackGame.canvas.addEventListener('touchmove', handleStackTouchMove, { passive: false });
    stackGame.canvas.addEventListener('touchend', handleStackTouchEnd);
    
    // Mouse events
    stackGame.canvas.addEventListener('mousedown', handleStackMouseDown);
    stackGame.canvas.addEventListener('mousemove', handleStackMouseMove);
    stackGame.canvas.addEventListener('mouseup', handleStackMouseUp);
    stackGame.canvas.addEventListener('mouseleave', handleStackMouseUp);
}

function handleStackTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        stackTouchStartX = e.touches[0].clientX;
        stackIsDragging = true;
    }
}

function handleStackTouchMove(e) {
    e.preventDefault();
    if (stackIsDragging && e.touches.length > 0) {
        const touchX = e.touches[0].clientX;
        baseRaccoon.targetX = touchX - baseRaccoon.width / 2;
        constrainBaseRaccoon();
    }
}

function handleStackTouchEnd() {
    stackIsDragging = false;
}

function handleStackMouseDown(e) {
    stackIsDragging = true;
    baseRaccoon.targetX = e.clientX - baseRaccoon.width / 2;
    constrainBaseRaccoon();
}

function handleStackMouseMove(e) {
    if (stackIsDragging) {
        baseRaccoon.targetX = e.clientX - baseRaccoon.width / 2;
        constrainBaseRaccoon();
    }
}

function handleStackMouseUp() {
    stackIsDragging = false;
}

function constrainBaseRaccoon() {
    baseRaccoon.targetX = Math.max(0, Math.min(stackGame.width - baseRaccoon.width, baseRaccoon.targetX));
}

function startStackGame() {
    stackStartScreen.classList.add('hidden');
    stackGameScreen.classList.remove('hidden');
    stackGameOverScreen.classList.add('hidden');
    
    // Reset game state
    stackGame.isRunning = true;
    stackGame.spawnTimer = -stackGame.initialDelay; // Negative to create initial delay
    stackGame.spawnInterval = 2500;
    stackGame.raccoonsStacked = 0;
    stackGame.heightReached = 0;
    stackGame.lives = 3;
    stackGame.cameraY = 0;
    stackGame.targetCameraY = 0;
    stackGame.wobbleAmount = 0;
    stackGame.wobblePhase = 0;
    
    // Clear arrays
    raccoonStack = [];
    fallingRaccoons = [];
    
    // Reset base raccoon
    resizeStackCanvas();
    baseRaccoon.speed = baseRaccoon.baseSpeed;
    
    stackGame.lastTime = 0;
    stackGameLoop();
}

function restartStackGame() {
    startStackGame();
}

function stackGameLoop(currentTime = 0) {
    if (!stackGame.isRunning) return;
    
    // Handle first frame - avoid huge deltaTime
    if (currentTime === 0) {
        stackGame.lastTime = 0;
    }
    
    const deltaTime = Math.min(currentTime - stackGame.lastTime, 100); // Cap deltaTime
    stackGame.lastTime = currentTime;
    
    updateStackGame(deltaTime);
    renderStackGame();
    
    stackGame.animationId = requestAnimationFrame(stackGameLoop);
}

function updateStackGame(deltaTime) {
    // Update wobble phase
    stackGame.wobblePhase += stackGame.wobbleSpeed * deltaTime;
    
    // Calculate wobble based on stack height
    const stackCount = raccoonStack.length;
    stackGame.wobbleAmount = Math.min(stackGame.maxWobble, stackCount * 1.5);
    
    // Apply wobble to movement speed (higher stack = harder to control)
    const wobblePenalty = 1 - (stackGame.wobbleAmount / stackGame.maxWobble) * 0.5;
    baseRaccoon.speed = baseRaccoon.baseSpeed * wobblePenalty;
    
    // Smooth base raccoon movement with wobble applied
    const wobbleOffset = Math.sin(stackGame.wobblePhase) * stackGame.wobbleAmount;
    const dx = (baseRaccoon.targetX + wobbleOffset) - baseRaccoon.x;
    baseRaccoon.x += dx * baseRaccoon.speed * Math.min(deltaTime / 16, 2);
    
    // Keep base raccoon in bounds
    baseRaccoon.x = Math.max(0, Math.min(stackGame.width - baseRaccoon.width, baseRaccoon.x));
    
    // Update stacked raccoons positions (they follow the base with wobble)
    updateStackPositions();
    
    // Update camera to follow stack
    updateCamera();
    
    // Spawn falling raccoons
    stackGame.spawnTimer += deltaTime;
    if (stackGame.spawnTimer >= stackGame.spawnInterval) {
        spawnFallingRaccoon();
        stackGame.spawnTimer = 0;
        // Slightly decrease spawn interval over time
        stackGame.spawnInterval = Math.max(stackGame.minSpawnInterval, stackGame.spawnInterval - 20);
    }
    
    // Update falling raccoons (all in world coordinates)
    for (let i = fallingRaccoons.length - 1; i >= 0; i--) {
        const raccoon = fallingRaccoons[i];
        raccoon.vy += stackGame.gravity;
        raccoon.y += raccoon.vy * (deltaTime / 16);
        raccoon.rotation += raccoon.rotationSpeed;
        
        // Check collision with top of stack (in world coordinates)
        const topY = getStackTopY();
        const stackCenterX = baseRaccoon.x + baseRaccoon.width / 2;
        
        // Check if raccoon landed on stack
        if (raccoon.y + raccoon.height >= topY) {
            const raccoonCenterX = raccoon.x + raccoon.width / 2;
            const distance = Math.abs(raccoonCenterX - stackCenterX);
            
            // If close enough to stack center, add to stack
            if (distance < baseRaccoon.width * 0.8) {
                addToStack(raccoon);
                fallingRaccoons.splice(i, 1);
                continue;
            }
        }
        
        // Check if missed (hit ground level in world coordinates)
        if (raccoon.y > stackGame.groundY + 50) {
            // Missed raccoon - lose a life
            fallingRaccoons.splice(i, 1);
            stackGame.lives--;
            
            if (stackGame.lives <= 0) {
                stackGameOver();
                return;
            }
        }
    }
    
    // Check for stack collapse (if wobble is too extreme)
    checkStackStability();
}

function getStackTopY() {
    if (raccoonStack.length === 0) {
        return baseRaccoon.y;
    }
    return baseRaccoon.y - (raccoonStack.length * baseRaccoon.height * 0.7);
}

function updateStackPositions() {
    // Each stacked raccoon follows the one below with slight wobble delay
    for (let i = 0; i < raccoonStack.length; i++) {
        const stackedRaccoon = raccoonStack[i];
        const heightIndex = i + 1;
        
        // Calculate position based on base raccoon with progressive wobble
        const individualWobble = Math.sin(stackGame.wobblePhase + i * 0.3) * (stackGame.wobbleAmount * 0.3 * (i + 1) / raccoonStack.length);
        stackedRaccoon.x = baseRaccoon.x + individualWobble;
        stackedRaccoon.y = baseRaccoon.y - (heightIndex * baseRaccoon.height * 0.7);
        
        // Keep in bounds
        stackedRaccoon.x = Math.max(0, Math.min(stackGame.width - baseRaccoon.width, stackedRaccoon.x));
    }
}

function updateCamera() {
    // Camera follows the top of the stack
    const topY = getStackTopY();
    const viewThreshold = stackGame.height * 0.4;
    
    if (topY < viewThreshold) {
        stackGame.targetCameraY = viewThreshold - topY;
    } else {
        stackGame.targetCameraY = 0;
    }
    
    // Smooth camera movement
    stackGame.cameraY += (stackGame.targetCameraY - stackGame.cameraY) * stackGame.cameraSmoothing;
}

function spawnFallingRaccoon() {
    const width = baseRaccoon.width * (0.8 + Math.random() * 0.4);
    const height = width * 1.25;
    
    // Spawn position in world coordinates (above the current view)
    const spawnY = -stackGame.cameraY - height - 50;
    
    fallingRaccoons.push({
        x: Math.random() * (stackGame.width - width),
        y: spawnY,  // World Y coordinate
        width: width,
        height: height,
        vy: 1 + Math.random() * 2,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.05
    });
}

function addToStack(raccoon) {
    // Add raccoon to stack
    const newStackRaccoon = {
        x: baseRaccoon.x,
        y: getStackTopY() - baseRaccoon.height * 0.7,
        width: baseRaccoon.width,
        height: baseRaccoon.height
    };
    
    raccoonStack.push(newStackRaccoon);
    stackGame.raccoonsStacked = raccoonStack.length;
    
    // Update height reached (in "meters")
    stackGame.heightReached = Math.round(raccoonStack.length * 0.5 * 10) / 10;
}

function checkStackStability() {
    // Stack collapses if wobble gets too extreme at the top
    if (raccoonStack.length > 5) {
        const topWobble = Math.abs(Math.sin(stackGame.wobblePhase + raccoonStack.length * 0.3) * stackGame.wobbleAmount);
        const stabilityThreshold = baseRaccoon.width * 0.6;
        
        // Higher stacks are more likely to collapse
        const collapseChance = (topWobble / stabilityThreshold) * (raccoonStack.length / 20);
        
        if (collapseChance > 1 && Math.random() < 0.001 * raccoonStack.length) {
            stackGameOver();
        }
    }
}

function renderStackGame() {
    const ctx = stackGame.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, stackGame.width, stackGame.height);
    
    // Draw background gradient (sky that extends upward)
    const gradient = ctx.createLinearGradient(0, 0, 0, stackGame.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.3, '#B0E0E6');
    gradient.addColorStop(0.7, '#98D8C8');
    gradient.addColorStop(1, '#87CEEB');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, stackGame.width, stackGame.height);
    
    // Draw clouds (parallax effect with camera)
    drawClouds(ctx);
    
    // Apply camera transform
    ctx.save();
    ctx.translate(0, stackGame.cameraY);
    
    // Draw ground
    const groundY = stackGame.groundY;
    ctx.fillStyle = '#2d5a2d';
    ctx.fillRect(0, groundY, stackGame.width, stackGame.height);
    
    // Draw grass
    ctx.fillStyle = '#4a8f4a';
    for (let i = 0; i < stackGame.width; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.lineTo(i + 7, groundY - 10);
        ctx.lineTo(i + 14, groundY);
        ctx.fill();
    }
    
    // Draw base raccoon
    drawStackRaccoon(ctx, baseRaccoon.x, baseRaccoon.y, baseRaccoon.width, baseRaccoon.height, false);
    
    // Draw stacked raccoons
    for (let i = 0; i < raccoonStack.length; i++) {
        const r = raccoonStack[i];
        drawStackRaccoon(ctx, r.x, r.y, r.width, r.height, true);
    }
    
    // Draw falling raccoons (in world coordinates, inside camera transform)
    for (const raccoon of fallingRaccoons) {
        ctx.save();
        ctx.translate(raccoon.x + raccoon.width / 2, raccoon.y + raccoon.height / 2);
        ctx.rotate(raccoon.rotation);
        drawStackRaccoon(ctx, -raccoon.width / 2, -raccoon.height / 2, raccoon.width, raccoon.height, true);
        ctx.restore();
    }
    
    ctx.restore();
    
    // Draw HUD
    drawStackHUD(ctx);
}

function drawClouds(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Cloud positions that scroll with camera (parallax)
    const cloudOffsetY = stackGame.cameraY * 0.3;
    
    const clouds = [
        { x: 30, y: 50, scale: 1 },
        { x: 150, y: 80, scale: 0.8 },
        { x: 280, y: 40, scale: 1.2 },
        { x: 80, y: 150, scale: 0.9 },
        { x: 220, y: 180, scale: 1.1 },
        { x: 350, y: 120, scale: 0.7 }
    ];
    
    for (const cloud of clouds) {
        const y = (cloud.y + cloudOffsetY) % (stackGame.height + 100) - 50;
        drawCloud(ctx, cloud.x, y, cloud.scale);
    }
}

function drawCloud(ctx, x, y, scale) {
    ctx.beginPath();
    ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 25 * scale, y - 10 * scale, 25 * scale, 0, Math.PI * 2);
    ctx.arc(x + 50 * scale, y, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 25 * scale, y + 5 * scale, 15 * scale, 0, Math.PI * 2);
    ctx.fill();
}

function drawStackRaccoon(ctx, x, y, w, h, isStacked) {
    const scale = w / 60;
    
    // Body colors
    const bodyColor = '#7a7a7a';
    const headColor = '#8a8a8a';
    const earColor = '#6a6a6a';
    
    // Draw tail
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.85, y + h * 0.3);
    ctx.quadraticCurveTo(x + w * 1.1, y + h * 0.2, x + w * 1.0, y + h * 0.05);
    ctx.quadraticCurveTo(x + w * 0.95, y + h * 0.15, x + w * 0.75, y + h * 0.28);
    ctx.fill();
    
    // Tail stripes
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.92, y + h * 0.22, w * 0.04, h * 0.02, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.98, y + h * 0.12, w * 0.035, h * 0.015, 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.55, w * 0.4, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.25, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.fillStyle = earColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.08, w * 0.1, h * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.8, y + h * 0.08, w * 0.1, h * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner ears
    ctx.fillStyle = '#ffd5d5';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.08, w * 0.05, h * 0.04, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.8, y + h * 0.08, w * 0.05, h * 0.04, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Face mask
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.35, y + h * 0.22, w * 0.12, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.65, y + h * 0.22, w * 0.12, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.38, y + h * 0.21, w * 0.07, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.62, y + h * 0.21, w * 0.07, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.40, y + h * 0.21, w * 0.035, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.64, y + h * 0.21, w * 0.035, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x + w * 0.38, y + h * 0.20, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.62, y + h * 0.20, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
    
    // Muzzle
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.32, w * 0.12, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.32, w * 0.05, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Arms reaching up (for stacked raccoons) or to sides (for base)
    ctx.fillStyle = bodyColor;
    if (isStacked) {
        // Arms reaching up
        ctx.beginPath();
        ctx.ellipse(x + w * 0.15, y + h * 0.45, w * 0.08, h * 0.12, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.85, y + h * 0.45, w * 0.08, h * 0.12, 0.5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Arms to sides (ready to catch)
        ctx.beginPath();
        ctx.ellipse(x + w * 0.1, y + h * 0.5, w * 0.1, h * 0.08, -0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.9, y + h * 0.5, w * 0.1, h * 0.08, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Paws
    ctx.fillStyle = '#5a5a5a';
    if (isStacked) {
        ctx.beginPath();
        ctx.ellipse(x + w * 0.12, y + h * 0.38, w * 0.05, h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.88, y + h * 0.38, w * 0.05, h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.ellipse(x + w * 0.05, y + h * 0.52, w * 0.05, h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.95, y + h * 0.52, w * 0.05, h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Feet
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.92, w * 0.12, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.7, y + h * 0.92, w * 0.12, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawStackHUD(ctx) {
    const fontSize = Math.max(12, Math.min(16, stackGame.width / 20));
    
    ctx.font = `bold ${fontSize}px 'Comic Sans MS', sans-serif`;
    ctx.textBaseline = 'top';
    
    // Draw raccoons stacked (left)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(5, 5, 100, 25);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`🦝 x ${stackGame.raccoonsStacked}`, 10, 10);
    
    // Draw lives (center)
    const livesText = `Lives: ${stackGame.lives}`;
    const livesWidth = ctx.measureText(livesText).width + 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect((stackGame.width - livesWidth) / 2, 5, livesWidth, 25);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(livesText, stackGame.width / 2, 10);
    
    // Draw height (right)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(stackGame.width - 85, 5, 80, 25);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.fillText(`${stackGame.heightReached}m`, stackGame.width - 10, 10);
    
    // Draw wobble warning if high
    if (stackGame.wobbleAmount > stackGame.maxWobble * 0.6) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ WOBBLY!', stackGame.width / 2, 35);
    }
}

function stackGameOver() {
    stackGame.isRunning = false;
    if (stackGame.animationId) {
        cancelAnimationFrame(stackGame.animationId);
    }
    
    stackFinalScore.textContent = stackGame.raccoonsStacked;
    stackHeight.textContent = stackGame.heightReached;
    stackGameOverScreen.classList.remove('hidden');
}

// Initialize stack game when DOM is loaded
document.addEventListener('DOMContentLoaded', initStackGame);
