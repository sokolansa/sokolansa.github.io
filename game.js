// Game Configuration
const TILE_SIZE = 100;
const SPAWN_DISTANCE = 500;
const MAX_DISTANCE = 1500;
const BASE_SPAWN_RATE = 0.3; // Enemies per second at level 1

// Game Objects
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameActive = true;
let gameOver = false;

// Resize canvas to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Player Object
const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 15,
    health: 100,
    maxHealth: 100,
    speed: 300,
    
    // Upgrade stats
    attackSpeed: 1.0,
    projectileSpeed: 500,
    damage: 10,
    projectileSize: 5,
    piercing: 0,
    multishot: 1,
    // Slow zone around player (radius in px, percent slow between 0 and 1)
    slowZoneRadius: 0,
    slowZonePercent: 0,
    
    // Earthquake ability
    earthquakeRange: 0,
    earthquakeCooldown: 0,
    earthquakeStrength: 0,
    lastEarthquakeTime: 0,
    
    // Shooting
    lastShootTime: 0,
    shootCooldown: 1 / 1.0
    
};

// Game State
let gameState = {
    wave: 1,
    waveStartTime: Date.now(),
    waveEnemiesKilled: 0,
    totalEnemiesInWave: 5,
    gold: 0,
    enemies: [],
    projectiles: [],
    currentTarget: null,
    frameCount: 0,
    fps: 0,
    lastFpsTime: Date.now(),
    levelUpChoices: [],
    waitingForLevelUp: false,
    level: 1,
    currentXp: 0,
    maxXp: 50,
    lastSpawnTime: 0,
    // Drop pod events
    dropPods: [],
    lastDropPodTime: Date.now(),
    // Hazard zones created by events (fire, gas)
    hazards: [],
    lastFireballTime: Date.now(),
    lastGasTime: Date.now(),
    // Bomb pods: active thrown bombs and their explosions
    bombs: [],
    explosions: [],
    lastBombPodTime: Date.now(),
    // Health pickups spawned by events
    pickups: [],
    lastHealthPodTime: Date.now(),
    totalEnemiesSpawned: 0
    ,
    projectileLifetimeBonus: 0
    ,
    // Enemy priority order (highest priority first)
    enemyPriority: ['assassin','sniper','tank','random','blackhole','normal','fastSmall','immuneSlow']
    ,
    // Whether to use priority targeting
    usePriority: true
};

// Input Handling
const keys = {
    'ArrowUp': false,
    'ArrowDown': false,
    'ArrowLeft': false,
    'ArrowRight': false,
    'w': false,
    'a': false,
    's': false,
    'd': false
};

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
    if (key === 'arrowup') keys['ArrowUp'] = true;
    if (key === 'arrowdown') keys['ArrowDown'] = true;
    if (key === 'arrowleft') keys['ArrowLeft'] = true;
    if (key === 'arrowright') keys['ArrowRight'] = true;
    
    if (key === 'u') toggleUpgradeMenu();
    if (key === 'escape') closeUpgradeMenu();
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
    if (key === 'arrowup') keys['ArrowUp'] = false;
    if (key === 'arrowdown') keys['ArrowDown'] = false;
    if (key === 'arrowleft') keys['ArrowLeft'] = false;
    if (key === 'arrowright') keys['ArrowRight'] = false;
});

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

document.addEventListener('click', () => {
    // Click disabled - autoshoot enabled
});

// UI Event Listeners
document.getElementById('upgradeBtn').addEventListener('click', toggleUpgradeMenu);
document.getElementById('closeUpgradeBtn').addEventListener('click', closeUpgradeMenu);
document.getElementById('restartBtn').addEventListener('click', restartGame);

// Upgrade Shop System
function toggleUpgradeMenu() {
    const menu = document.getElementById('upgradeMenu');
    menu.classList.toggle('visible');
    gameActive = !menu.classList.contains('visible');
    updateUpgradeMenu();
}

function closeUpgradeMenu() {
    const menu = document.getElementById('upgradeMenu');
    menu.classList.remove('visible');
    gameActive = true;
}

function updateUpgradeMenu() {
    document.getElementById('shopGold').textContent = gameState.gold;
    document.getElementById('upgradeAttackSpeed').textContent = player.attackSpeed.toFixed(2);
    document.getElementById('upgradeProjectileSpeed').textContent = player.projectileSpeed;
    document.getElementById('upgradeDamage').textContent = player.damage;
    document.getElementById('upgradeMaxHealth').textContent = player.maxHealth;
    document.getElementById('upgradeProjectileSize').textContent = player.projectileSize;
    document.getElementById('upgradeEarthquakeRange').textContent = Math.round(player.earthquakeRange);
    document.getElementById('upgradeEarthquakeCooldown').textContent = player.earthquakeCooldown.toFixed(1);
    document.getElementById('upgradeEarthquakeStrength').textContent = Math.round(player.earthquakeStrength);
    // Weapon system removed; this menu shows passive upgrade values only
}

const upgradeCosts = {
    attackSpeed: 50,
    projectileSpeed: 50,
    damage: 60,
    maxHealth: 80,
    projectileSize: 45,
    earthquakeRange: 70,
    earthquakeCooldown: 75,
    earthquakeStrength: 55
};

const upgradeValues = {
    attackSpeed: 0.1,
    projectileSpeed: 50,
    damage: 5,
    maxHealth: 30,
    projectileSize: 1,
    earthquakeRange: 100,
    earthquakeCooldown: 0.5,
    earthquakeStrength: 20
};

function purchaseUpgrade(upgradeType) {
    const cost = upgradeCosts[upgradeType];
    
    if (gameState.gold < cost) {
        alert('Not enough gold!');
        return;
    }
    
    gameState.gold -= cost;
    
    switch(upgradeType) {
        case 'attackSpeed':
            player.attackSpeed += upgradeValues.attackSpeed;
            player.shootCooldown = 1 / player.attackSpeed;
            break;
        case 'projectileSpeed':
            player.projectileSpeed += upgradeValues.projectileSpeed;
            break;
        case 'damage':
            player.damage += upgradeValues.damage;
            break;
        case 'maxHealth':
            player.maxHealth += upgradeValues.maxHealth;
            player.health = Math.min(player.health + upgradeValues.maxHealth, player.maxHealth);
            break;
        case 'projectileSize':
            player.projectileSize += upgradeValues.projectileSize;
            break;
        case 'earthquakeRange':
            player.earthquakeRange += upgradeValues.earthquakeRange;
            break;
        case 'earthquakeCooldown':
            player.earthquakeCooldown = Math.max(0.5, player.earthquakeCooldown - upgradeValues.earthquakeCooldown);
            break;
        case 'earthquakeStrength':
            player.earthquakeStrength += upgradeValues.earthquakeStrength;
            break;
    }
    
    updateUpgradeMenu();
    updateUI();
}

// Game Functions
function updatePlayer(dt) {
    // Movement
    let acceleration = 0;
    if (keys['ArrowUp'] || keys['w']) player.vy = -player.speed;
    else if (keys['ArrowDown'] || keys['s']) player.vy = player.speed;
    else player.vy = 0;
    
    if (keys['ArrowLeft'] || keys['a']) player.vx = -player.speed;
    else if (keys['ArrowRight'] || keys['d']) player.vx = player.speed;
    else player.vx = 0;
    
    // Apply velocity
    player.x += player.vx * dt;
    player.y += player.vy * dt;
}

function shoot(dirX, dirY) {
    const now = Date.now();
    if (now - player.lastShootTime < player.shootCooldown * 1000) return;
    
    player.lastShootTime = now;
    
    // Create projectiles for multishot
    for (let i = 0; i < player.multishot; i++) {
        let angle = Math.atan2(dirY, dirX);
        if (player.multishot > 1) {
            // Spread bullets in a cone
            const spreadAngle = 0.3; // radians
            const offset = (i - (player.multishot - 1) / 2) * spreadAngle;
            angle += offset;
        }
        
        const finalDirX = Math.cos(angle);
        const finalDirY = Math.sin(angle);
        
        gameState.projectiles.push({
            x: player.x,
            y: player.y,
            vx: finalDirX * player.projectileSpeed,
            vy: finalDirY * player.projectileSpeed,
            size: player.projectileSize,
            damage: player.damage,
            lifetime: 8 + (gameState.projectileLifetimeBonus || 0),
            pierceCount: 0,
            maxPierce: player.piercing,
            hitEnemies: []
        });
    }
}

function triggerEarthquake() {
    const now = Date.now();
    if (player.earthquakeRange === 0) return; // No earthquake ability yet
    if (now - player.lastEarthquakeTime < player.earthquakeCooldown * 1000) return;
    
    player.lastEarthquakeTime = now;
    
    // Damage all enemies in range
    gameState.enemies.forEach(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= player.earthquakeRange) {
            enemy.health -= player.earthquakeStrength;
        }
    });
}

function autoAim() {
    if (gameState.enemies.length === 0) return null;
    // Respect player's priority list: try to find nearest enemy of highest-priority type
    if (gameState.usePriority) {
        const priorityList = gameState.enemyPriority || [];
        for (const type of priorityList) {
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        for (const enemy of gameState.enemies) {
            if (enemy.type !== type) continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }
        if (nearestEnemy) {
            const dx = nearestEnemy.x - player.x;
            const dy = nearestEnemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) return { x: dx / distance, y: dy / distance, target: nearestEnemy };
        }
        }
    }

    // Fallback: nearest enemy of any type
    let nearestEnemy = null;
    let nearestDistance = Infinity;
    for (const enemy of gameState.enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
        }
    }
    if (nearestEnemy) {
        const dx = nearestEnemy.x - player.x;
        const dy = nearestEnemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) return { x: dx / distance, y: dy / distance, target: nearestEnemy };
    }

    return null;
}

function autoShoot() {
    const aimData = autoAim();
    if (!aimData) return;
    
    shoot(aimData.x, aimData.y);
    
    // Store current target for rendering
    gameState.currentTarget = aimData.target;
}

function updateProjectiles(dt) {
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const proj = gameState.projectiles[i];
        
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.lifetime -= dt;
        
        if (proj.lifetime <= 0) {
            gameState.projectiles.splice(i, 1);
            continue;
        }

        // Enemy projectile: check collision with player
        if (proj.isEnemyProjectile) {
            const dx = player.x - proj.x;
            const dy = player.y - proj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.size + proj.size) {
                player.health -= proj.damage;
                gameState.projectiles.splice(i, 1);
                if (player.health <= 0) {
                    endGame();
                }
                continue;
            }
        } else {
            // Player projectile: check collision with enemies
            for (let j = gameState.enemies.length - 1; j >= 0; j--) {
                const enemy = gameState.enemies[j];
                
                // Skip if this enemy was already hit by this projectile
                if (proj.hitEnemies.includes(j)) {
                    continue;
                }
                
                const dx = enemy.x - proj.x;
                const dy = enemy.y - proj.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemy.size + proj.size) {
                    enemy.health -= proj.damage;
                    proj.pierceCount++;
                    proj.hitEnemies.push(j);
                    
                    if (enemy.health <= 0) {
                        gameState.enemies.splice(j, 1);
                        gameState.gold += enemy.goldValue;
                        addXp(calculateEnemyXp(enemy));
                    }
                    
                    // Remove projectile if out of pierces
                    if (proj.pierceCount > proj.maxPierce) {
                        gameState.projectiles.splice(i, 1);
                    }
                    break;
                }
            }
        }
    }
}

function spawnWaveEnemies() {
    const enemiesThisWave = gameState.totalEnemiesInWave;
    
    for (let i = 0; i < enemiesThisWave; i++) {
        // Use shared spawn helper to create varied enemy types
        const e = createEnemyAtRandomSpot();
        gameState.enemies.push(e);
    }
}

function spawnContinuousEnemy() {
    const e = createEnemyAtRandomSpot();
    gameState.enemies.push(e);
    gameState.totalEnemiesSpawned++;
}

// Enemy type factory: returns an enemy with properties based on type
function createEnemyAtRandomSpot() {
    const angle = (Math.random() * Math.PI * 2);
    const distance = SPAWN_DISTANCE + Math.random() * 200;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;

    // Choose type probabilities (can scale with level later)
    let r = Math.random();
    // Slightly increase chance of tougher enemies with level
    const levelFactor = Math.min(0.2, gameState.level * 0.005);
    r = Math.max(0, r - levelFactor);

    let type = 'normal';
    if (r < 0.55) type = 'normal';
    else if (r < 0.70) type = 'fastSmall';
    else if (r < 0.82) type = 'immuneSlow';
    else if (r < 0.90) type = 'tank';
    else if (r < 0.95) type = 'random';
    else if (r < 0.97) type = 'blackhole';
    else if (r < 0.99) type = 'assassin';
    else type = 'sniper';

    // Base stats
    let size = 12;
    let health = 20 + gameState.level * 3;
    let speed = 50 + gameState.level * 4;
    let damage = 8 + gameState.level;
    let goldValue = 20 + gameState.level * 3;
    let immuneToSlow = false;
    let pullStrength = 0; // used by blackhole

    // Helper to produce a stat template for a given type (uses current level)
    function getTemplate(t) {
        switch (t) {
            case 'normal':
                return {
                    size: 12,
                    health: Math.floor(20 + gameState.level * 3),
                    speed: Math.floor(50 + gameState.level * 4),
                    damage: Math.floor(8 + gameState.level),
                    goldValue: Math.floor(20 + gameState.level * 3),
                    immuneToSlow: false
                };
            case 'immuneSlow':
                return {
                    size: 14,
                    health: Math.floor(30 + gameState.level * 4),
                    speed: Math.floor(55 + gameState.level * 3),
                    damage: Math.floor(10 + gameState.level * 1.2),
                    goldValue: Math.floor(25 + gameState.level * 4),
                    immuneToSlow: true
                };
            case 'tank':
                return {
                    size: 22,
                    health: Math.floor(80 + gameState.level * 12),
                    speed: Math.floor(18 + gameState.level * 1.2),
                    damage: Math.floor(20 + gameState.level * 2),
                    goldValue: Math.floor(60 + gameState.level * 8),
                    immuneToSlow: false
                };
            case 'fastSmall':
                return {
                    size: 8,
                    health: Math.floor(12 + gameState.level * 2),
                    speed: Math.floor(120 + gameState.level * 6),
                    damage: Math.floor(6 + gameState.level * 1),
                    goldValue: Math.floor(12 + gameState.level * 2),
                    immuneToSlow: false
                };
            case 'assassin':
                return {
                    size: 9,
                    health: Math.floor(18 + gameState.level * 3),
                    speed: Math.floor(220 + gameState.level * 10),
                    damage: Math.floor(60 + gameState.level * 8),
                    goldValue: Math.floor(80 + gameState.level * 12),
                    immuneToSlow: false
                };
            case 'sniper':
                return {
                    size: 11,
                    health: Math.floor(35 + gameState.level * 5),
                    speed: Math.floor(45 + gameState.level * 2),
                    damage: Math.floor(25 + gameState.level * 4),
                    goldValue: Math.floor(50 + gameState.level * 6),
                    immuneToSlow: false
                };
            default:
                return {
                    size: 12,
                    health: Math.floor(20 + gameState.level * 3),
                    speed: Math.floor(50 + gameState.level * 4),
                    damage: Math.floor(8 + gameState.level),
                    goldValue: Math.floor(20 + gameState.level * 3),
                    immuneToSlow: false
                };
        }
    }

    switch (type) {
        case 'normal':
            // keep base
            break;
        case 'immuneSlow':
            immuneToSlow = true;
            size = 14;
            health = Math.floor(30 + gameState.level * 4);
            speed = Math.floor(55 + gameState.level * 3);
            damage = Math.floor(10 + gameState.level * 1.2);
            goldValue = Math.floor(25 + gameState.level * 4);
            break;
        case 'tank':
            size = 22;
            health = Math.floor(80 + gameState.level * 12);
            speed = Math.floor(18 + gameState.level * 1.2);
            damage = Math.floor(20 + gameState.level * 2);
            goldValue = Math.floor(60 + gameState.level * 8);
            break;
        case 'fastSmall':
            size = 8;
            health = Math.floor(12 + gameState.level * 2);
            speed = Math.floor(120 + gameState.level * 6);
            damage = Math.floor(6 + gameState.level * 1);
            goldValue = Math.floor(12 + gameState.level * 2);
            break;
        case 'assassin':
            size = 9;
            health = Math.floor(18 + gameState.level * 3);
            speed = Math.floor(220 + gameState.level * 10);
            damage = Math.floor(60 + gameState.level * 8); // heavy single-hit damage
            goldValue = Math.floor(80 + gameState.level * 12);
            break;
        case 'sniper':
            size = 11;
            health = Math.floor(35 + gameState.level * 5);
            speed = Math.floor(45 + gameState.level * 2);
            damage = Math.floor(25 + gameState.level * 4); // single shot damage
            goldValue = Math.floor(50 + gameState.level * 6);
            break;
        case 'blackhole':
            // Black hole: stationary, large, pulls the player slowly
            size = 28;
            health = Math.floor(200 + gameState.level * 40);
            speed = 0;
            damage = 0;
            goldValue = Math.floor(120 + gameState.level * 20);
            immuneToSlow = true;
            pullStrength = Math.floor(35 + gameState.level * 3);
            break;
        case 'random':
            // Compose 2-3 random base types and average their stats to form a hybrid enemy
            const choices = ['normal','fastSmall','immuneSlow','tank','assassin','sniper'];
            const pickCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
            let sum = { size: 0, health: 0, speed: 0, damage: 0, goldValue: 0, immuneToSlow: 0 };
            for (let k = 0; k < pickCount; k++) {
                const t = choices[Math.floor(Math.random() * choices.length)];
                const tpl = getTemplate(t);
                sum.size += tpl.size;
                sum.health += tpl.health;
                sum.speed += tpl.speed;
                sum.damage += tpl.damage;
                sum.goldValue += tpl.goldValue;
                sum.immuneToSlow += tpl.immuneToSlow ? 1 : 0;
            }
            // Average values
            size = Math.max(6, Math.floor(sum.size / pickCount));
            health = Math.max(8, Math.floor(sum.health / pickCount));
            speed = Math.max(12, Math.floor(sum.speed / pickCount));
            damage = Math.max(2, Math.floor(sum.damage / pickCount));
            goldValue = Math.max(8, Math.floor(sum.goldValue / pickCount));
            immuneToSlow = sum.immuneToSlow > 0;
            break;
    }

    return {
        x, y,
        vx: 0,
        vy: 0,
        size,
        health,
        maxHealth: health,
        speed,
        damage,
        goldValue,
        type,
        immuneToSlow,
        pullStrength,
        // Sniper-specific: shooting cooldown
        lastShotTime: 0,
        shootCooldown: type === 'sniper' ? 2.5 : 0 // seconds between shots
    };
}

// Create an enemy of the given `type` at coordinates x,y (used by drop pod spawns)
function createEnemyOfType(type, x, y) {
    // Use much of the same logic as createEnemyAtRandomSpot but with fixed type and position
    // Base stats
    let size = 12;
    let health = 20 + gameState.level * 3;
    let speed = 50 + gameState.level * 4;
    let damage = 8 + gameState.level;
    let goldValue = 20 + gameState.level * 3;
    let immuneToSlow = false;
    let pullStrength = 0;

    function getTemplateLocal(t) {
        switch (t) {
            case 'normal':
                return { size: 12, health: Math.floor(20 + gameState.level * 3), speed: Math.floor(50 + gameState.level * 4), damage: Math.floor(8 + gameState.level), goldValue: Math.floor(20 + gameState.level * 3), immuneToSlow: false };
            case 'immuneSlow':
                return { size: 14, health: Math.floor(30 + gameState.level * 4), speed: Math.floor(55 + gameState.level * 3), damage: Math.floor(10 + gameState.level * 1.2), goldValue: Math.floor(25 + gameState.level * 4), immuneToSlow: true };
            case 'tank':
                return { size: 22, health: Math.floor(80 + gameState.level * 12), speed: Math.floor(18 + gameState.level * 1.2), damage: Math.floor(20 + gameState.level * 2), goldValue: Math.floor(60 + gameState.level * 8), immuneToSlow: false };
            case 'fastSmall':
                return { size: 8, health: Math.floor(12 + gameState.level * 2), speed: Math.floor(120 + gameState.level * 6), damage: Math.floor(6 + gameState.level * 1), goldValue: Math.floor(12 + gameState.level * 2), immuneToSlow: false };
            case 'assassin':
                return { size: 9, health: Math.floor(18 + gameState.level * 3), speed: Math.floor(220 + gameState.level * 10), damage: Math.floor(60 + gameState.level * 8), goldValue: Math.floor(80 + gameState.level * 12), immuneToSlow: false };
            case 'sniper':
                return { size: 11, health: Math.floor(35 + gameState.level * 5), speed: Math.floor(45 + gameState.level * 2), damage: Math.floor(25 + gameState.level * 4), goldValue: Math.floor(50 + gameState.level * 6), immuneToSlow: false };
            case 'random':
                // fall back to normal for single-type creation
                return { size: 12, health: Math.floor(20 + gameState.level * 3), speed: Math.floor(50 + gameState.level * 4), damage: Math.floor(8 + gameState.level), goldValue: Math.floor(20 + gameState.level * 3), immuneToSlow: false };
            case 'blackhole':
                return { size: 28, health: Math.floor(200 + gameState.level * 40), speed: 0, damage: 0, goldValue: Math.floor(120 + gameState.level * 20), immuneToSlow: true, pullStrength: Math.floor(35 + gameState.level * 3) };
            default:
                return { size: 12, health: Math.floor(20 + gameState.level * 3), speed: Math.floor(50 + gameState.level * 4), damage: Math.floor(8 + gameState.level), goldValue: Math.floor(20 + gameState.level * 3), immuneToSlow: false };
        }
    }

    const tpl = getTemplateLocal(type || 'normal');
    size = tpl.size;
    health = tpl.health;
    speed = tpl.speed;
    damage = tpl.damage;
    goldValue = tpl.goldValue;
    immuneToSlow = tpl.immuneToSlow || false;
    pullStrength = tpl.pullStrength || 0;

    return {
        x, y,
        vx: 0,
        vy: 0,
        size,
        health,
        maxHealth: health,
        speed,
        damage,
        goldValue,
        type: type || 'normal',
        immuneToSlow,
        pullStrength,
        lastShotTime: 0,
        shootCooldown: type === 'sniper' ? 2.5 : 0
    };
}

// XP rewards per enemy type (base values)
const xpRewards = {
    normal: 5,
    fastSmall: 4,
    immuneSlow: 6,
    tank: 20,
    assassin: 30,
    sniper: 18,
    random: 12,
    blackhole: 40
};

// Calculate XP for an enemy based on its stats and rarity
function calculateEnemyXp(enemy) {
    if (!enemy) return 1;
    const base = xpRewards[enemy.type] || 5;

    // Factors based on enemy stats
    const hpFactor = Math.max(0, Math.floor(enemy.maxHealth * 0.10));
    const dmgFactor = Math.max(0, Math.floor(enemy.damage * 0.5));

    // Rarity multiplier per type (tuned to feel reasonable)
    const rarityMults = {
        normal: 1.0,
        fastSmall: 0.8,
        immuneSlow: 1.1,
        tank: 2.0,
        assassin: 2.5,
        sniper: 1.8,
        random: 1.3,
        blackhole: 3.0
    };
    const rarity = rarityMults[enemy.type] || 1.0;

    // Combine into an XP value
    let xp = Math.floor((hpFactor + dmgFactor) * rarity + base);

    // Small scaling with level so XP grows slightly as player levels
    xp += Math.floor(gameState.level * 0.5);

    // Ensure at least 1 XP
    return Math.max(1, xp);
}

function updateEnemies(dt) {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        // Blackhole: stationary, pulls player slowly toward it
        if (enemy.type === 'blackhole') {
            const dxp = enemy.x - player.x;
            const dyp = enemy.y - player.y;
            const distp = Math.sqrt(dxp * dxp + dyp * dyp);
            if (distp > 0) {
                // Pull strength scales with enemy.pullStrength and falls off with distance
                const base = enemy.pullStrength || 30;
                const pullFactor = (base / (distp + 20)) * dt; // tuned for gradual pull
                player.x += dxp * pullFactor;
                player.y += dyp * pullFactor;
            }
            // Blackhole itself doesn't chase/move
            enemy.vx = 0;
            enemy.vy = 0;
        } else {
            // Chase player
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const dirX = dx / distance;
                const dirY = dy / distance;

                // Apply slow zone effect if within radius (some enemies can be immune)
                let speedMultiplier = 1;
                if (player.slowZoneRadius > 0) {
                    const distToPlayer = Math.sqrt((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2);
                    if (distToPlayer <= player.slowZoneRadius && !enemy.immuneToSlow) {
                        speedMultiplier = Math.max(0, 1 - player.slowZonePercent);
                    }
                }

                // Apply gas hazard slow if inside any gas hazard
                let gasSlow = 0;
                for (const hz of gameState.hazards) {
                    if (hz.type === 'gas') {
                        const dxh = enemy.x - hz.x;
                        const dyh = enemy.y - hz.y;
                        const dh = Math.sqrt(dxh * dxh + dyh * dyh);
                        if (dh <= hz.radius) gasSlow = Math.max(gasSlow, hz.slowPercent || 0);
                    }
                }
                if (gasSlow > 0 && !enemy.immuneToSlow) {
                    speedMultiplier *= Math.max(0, 1 - gasSlow);
                }

                enemy.vx = dirX * enemy.speed * speedMultiplier;
                enemy.vy = dirY * enemy.speed * speedMultiplier;
            }
        }
        
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        
        // Remove if too far
        const distToPlayer = Math.sqrt((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2);
        if (distToPlayer > MAX_DISTANCE) {
            gameState.enemies.splice(i, 1);
            continue;
        }

        // Sniper: attempt to shoot player if in range and cooldown ready
        if (enemy.type === 'sniper' && distToPlayer < 800) {
            const now = Date.now();
            if (now - enemy.lastShotTime > enemy.shootCooldown * 1000) {
                enemy.lastShotTime = now;
                // Fire projectile at player
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    // Sniper projectile: slower but higher damage
                    gameState.projectiles.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx: dirX * 300, // slower than player bullets
                        vy: dirY * 300,
                        size: 4,
                        damage: enemy.damage,
                        lifetime: 5,
                        pierceCount: 0,
                        maxPierce: 0, // no piercing on sniper shots
                        hitEnemies: [],
                        isEnemyProjectile: true // flag for later logic
                    });
                }
            }
        }
        
        // Check collision with player
        const collisionDist = Math.sqrt((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2);
        if (collisionDist < enemy.size + player.size) {
            // Assassin: deals heavy instant damage and explodes on impact
            if (enemy.type === 'assassin') {
                // Direct hit damage
                player.health -= enemy.damage;

                // Explosion AoE
                const explosionRadius = 120;
                const explosionDamage = Math.floor(enemy.damage * 0.8);

                // Damage nearby enemies (friendly fire) and remove if killed
                for (let k = gameState.enemies.length - 1; k >= 0; k--) {
                    if (k === i) continue;
                    const other = gameState.enemies[k];
                    const dx2 = other.x - enemy.x;
                    const dy2 = other.y - enemy.y;
                    const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    if (d2 <= explosionRadius) {
                        other.health -= explosionDamage;
                        if (other.health <= 0) {
                            gameState.enemies.splice(k, 1);
                            gameState.gold += other.goldValue;
                            addXp(calculateEnemyXp(other));
                        }
                    }
                }

                // Remove the assassin immediately after exploding
                gameState.enemies.splice(i, 1);

                if (player.health <= 0) {
                    endGame();
                }
            } else {
                // Normal collision: gradual damage over time
                player.health -= enemy.damage * dt;
                if (player.health <= 0) {
                    endGame();
                }
            }
        }
    }
}

// Drop pod logic: update active pods (falling -> impact -> spawn)
function updateDropPods(dt) {
    for (let i = gameState.dropPods.length - 1; i >= 0; i--) {
        const pod = gameState.dropPods[i];
        if (pod.state === 'falling') {
            pod.fallHeight -= pod.fallSpeed * dt;
            if (pod.fallHeight <= 0) {
                pod.state = 'impact';
                pod.impactTimer = 0;
                // spawn after a short delay to allow impact animation
            }
        } else if (pod.state === 'impact') {
            pod.impactTimer += dt;
            if (!pod.spawned && pod.impactTimer >= 0.25) {
                // spawn or create hazard/pickup depending on pod type
                if (pod.type === 'fireball' || pod.type === 'gas') {
                    // create a hazard zone at the impact point
                    const isFire = pod.type === 'fireball';
                    const hazard = {
                        x: pod.x,
                        y: pod.y,
                        type: isFire ? 'fire' : 'gas',
                        radius: isFire ? 80 + gameState.level * 6 : 100 + gameState.level * 8,
                        duration: isFire ? 5 + Math.random() * 3 : 6 + Math.random() * 4,
                        timer: 0,
                        damagePerSecond: isFire ? (18 + gameState.level * 2) : (8 + gameState.level * 1),
                        slowPercent: isFire ? 0 : 0.35
                    };
                    gameState.hazards.push(hazard);
                } else if (pod.type === 'bombpod') {
                    // spawn 4-7 small thrown bombs that land and explode
                    const count = 4 + Math.floor(Math.random() * 4); // 4-7
                    for (let b = 0; b < count; b++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 140 + Math.random() * 160; // thrown speed
                        const vx = Math.cos(angle) * speed;
                        const vy = Math.sin(angle) * speed;
                        const flight = 0.6 + Math.random() * 0.9; // seconds in air
                        const bomb = {
                            x: pod.x,
                            y: pod.y,
                            vx,
                            vy,
                            flightTime: flight,
                            size: 6,
                            exploded: false
                        };
                        gameState.bombs.push(bomb);
                    }
                } else if (pod.type === 'healthpod') {
                    // health pod: spawn a player-only pickup (no enemies)
                    const amount = 25 + Math.floor(gameState.level * 5);
                    const pickup = { x: pod.x, y: pod.y, amount, timer: 0, duration: 12, size: 10 };
                    gameState.pickups.push(pickup);
                } else {
                    // spawn 4 of the same enemy type around pod.x/pod.y
                    for (let k = 0; k < 4; k++) {
                        const angle = (Math.PI * 2) * (k / 4) + (Math.random() - 0.5) * 0.4;
                        const dist = 20 + Math.random() * 30;
                        const ex = pod.x + Math.cos(angle) * dist;
                        const ey = pod.y + Math.sin(angle) * dist;
                        // For 'random' type, create one hybrid using the random logic
                        if (pod.type === 'random') {
                            // reuse createEnemyAtRandomSpot behaviour: pick a composed random enemy
                            const e = createEnemyAtRandomSpot();
                            e.x = ex; e.y = ey;
                            gameState.enemies.push(e);
                        } else {
                            const e = createEnemyOfType(pod.type, ex, ey);
                            gameState.enemies.push(e);
                        }
                        gameState.totalEnemiesSpawned++;
                    }
                }
                pod.spawned = true;
            }

            // remove pod after visual time
            if (pod.impactTimer > 1.2) {
                gameState.dropPods.splice(i, 1);
            }
        }
    }
}

// Update hazard zones (fire/gas): apply damage over time and remove when expired
function updateHazards(dt) {
    for (let i = gameState.hazards.length - 1; i >= 0; i--) {
        const h = gameState.hazards[i];
        h.timer += dt;

        // Damage enemies inside the hazard
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const en = gameState.enemies[j];
            const dx = en.x - h.x;
            const dy = en.y - h.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= h.radius) {
                en.health -= h.damagePerSecond * dt;
                if (en.health <= 0) {
                    gameState.enemies.splice(j, 1);
                    gameState.gold += en.goldValue;
                    addXp(calculateEnemyXp(en));
                }
            }
        }

        // Damage player (smaller rate)
        const dxp = player.x - h.x;
        const dyp = player.y - h.y;
        const distp = Math.sqrt(dxp * dxp + dyp * dyp);
        if (distp <= h.radius) {
            player.health -= (h.damagePerSecond * 0.5) * dt;
            if (player.health <= 0) endGame();
        }

        if (h.timer >= h.duration) {
            gameState.hazards.splice(i, 1);
        }
    }
}

// Update thrown bombs: move them through flightTime, explode on landing
function updateBombs(dt) {
    for (let i = gameState.bombs.length - 1; i >= 0; i--) {
        const bomb = gameState.bombs[i];
        if (bomb.flightTime > 0) {
            // simple linear flight
            bomb.x += bomb.vx * dt;
            bomb.y += bomb.vy * dt;
            // apply slight drag
            bomb.vx *= Math.max(0, 1 - dt * 0.6);
            bomb.vy *= Math.max(0, 1 - dt * 0.6);
            bomb.flightTime -= dt;
            if (bomb.flightTime <= 0) {
                // land and explode
                explodeBomb(bomb.x, bomb.y);
                gameState.bombs.splice(i, 1);
            }
        } else {
            // safety: explode if somehow remaining
            explodeBomb(bomb.x, bomb.y);
            gameState.bombs.splice(i, 1);
        }
    }
}

function explodeBomb(x, y) {
    // Explosion parameters (medium damage)
    const radius = 60 + gameState.level * 6;
    const damage = 40 + gameState.level * 6;

    // Damage enemies
    for (let j = gameState.enemies.length - 1; j >= 0; j--) {
        const en = gameState.enemies[j];
        const dx = en.x - x;
        const dy = en.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
            en.health -= damage;
            if (en.health <= 0) {
                gameState.enemies.splice(j, 1);
                gameState.gold += en.goldValue;
                addXp(calculateEnemyXp(en));
            }
        }
    }

    // Damage player if close
    const dxp = player.x - x;
    const dyp = player.y - y;
    const distp = Math.sqrt(dxp * dxp + dyp * dyp);
    if (distp <= radius) {
        player.health -= damage * 0.6;
        if (player.health <= 0) endGame();
    }

    // Add visual explosion entry
    gameState.explosions.push({ x, y, timer: 0, duration: 0.6, radius });
}

// Update visual explosions
function updateExplosions(dt) {
    for (let i = gameState.explosions.length - 1; i >= 0; i--) {
        const ex = gameState.explosions[i];
        ex.timer += dt;
        if (ex.timer >= ex.duration) gameState.explosions.splice(i, 1);
    }
}

// Update pickups: expire over time and detect player pickup
function updatePickups(dt) {
    for (let i = gameState.pickups.length - 1; i >= 0; i--) {
        const p = gameState.pickups[i];
        p.timer += dt;
        // pickup collected by player
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= p.size + player.size) {
            player.health = Math.min(player.maxHealth, player.health + p.amount);
            // remove pickup
            gameState.pickups.splice(i, 1);
            continue;
        }
        // expire
        if (p.timer >= p.duration) {
            gameState.pickups.splice(i, 1);
        }
    }
}

// Trigger a drop pod event: choose a spot and enemy type, add pod to gameState.dropPods
function triggerDropPodEvent() {
    // Choose a position a bit away from player
    const angle = Math.random() * Math.PI * 2;
    const distance = SPAWN_DISTANCE * 0.7 + Math.random() * 200;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;

    // Choose enemy type randomly from common types (exclude blackhole to avoid chaos)
    const pool = ['normal','fastSmall','immuneSlow','tank','assassin','sniper','random'];
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const pod = {
        x, y,
        fallHeight: 600, // starts high above world
        fallSpeed: 700 + Math.random() * 300,
        state: 'falling',
        type: chosen,
        spawned: false,
        impactTimer: 0
    };
    gameState.dropPods.push(pod);
}

// Trigger a falling fireball event that creates a burning zone on impact
function triggerFireballEvent() {
    const angle = Math.random() * Math.PI * 2;
    const distance = SPAWN_DISTANCE * 0.6 + Math.random() * 300;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;

    const pod = {
        x, y,
        fallHeight: 700,
        fallSpeed: 900 + Math.random() * 300,
        state: 'falling',
        type: 'fireball',
        spawned: false,
        impactTimer: 0
    };
    gameState.dropPods.push(pod);
}

// Trigger a falling gas canister event that creates a damaging/slowing gas cloud on impact
function triggerGasEvent() {
    const angle = Math.random() * Math.PI * 2;
    const distance = SPAWN_DISTANCE * 0.6 + Math.random() * 300;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;

    const pod = {
        x, y,
        fallHeight: 700,
        fallSpeed: 650 + Math.random() * 250,
        state: 'falling',
        type: 'gas',
        spawned: false,
        impactTimer: 0
    };
    gameState.dropPods.push(pod);
}

// Global helper: trigger a bomb pod event (callable from console)
function triggerBombPodEvent() {
    const angle = Math.random() * Math.PI * 2;
    const distance = SPAWN_DISTANCE * 0.6 + Math.random() * 200;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;
    const pod = {
        x, y,
        fallHeight: 600,
        fallSpeed: 700 + Math.random() * 200,
        state: 'falling',
        type: 'bombpod',
        spawned: false,
        impactTimer: 0
    };
    gameState.dropPods.push(pod);
}

// Global helper: trigger a health pod event (callable from console)
function triggerHealthPodEvent() {
    const angle = Math.random() * Math.PI * 2;
    const distance = SPAWN_DISTANCE * 0.6 + Math.random() * 200;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;
    const pod = {
        x, y,
        fallHeight: 600,
        fallSpeed: 700 + Math.random() * 200,
        state: 'falling',
        type: 'healthpod',
        spawned: false,
        impactTimer: 0
    };
    gameState.dropPods.push(pod);
}

function addXp(amount) {
    gameState.currentXp += amount;
    
    // Check if level up
    while (gameState.currentXp >= gameState.maxXp) {
        gameState.currentXp -= gameState.maxXp;
        gameState.level++;
        gameState.maxXp = Math.floor(25 * Math.pow(1.05, gameState.level - 1));
        applyRandomUpgrade();
    }
}

function applyRandomUpgrade() {
    const upgrade = levelUpUpgradesList[Math.floor(Math.random() * levelUpUpgradesList.length)];
    
    // Apply upgrade
    switch(upgrade.stat) {
        case 'maxHealth':
            player.maxHealth += upgrade.value;
            player.health = Math.min(player.health + upgrade.value, player.maxHealth);
            break;
        case 'damage':
            player.damage += upgrade.value;
            break;
        case 'attackSpeed':
            player.attackSpeed += upgrade.value;
            player.shootCooldown = 1 / player.attackSpeed;
            break;
        case 'projectileSpeed':
            player.projectileSpeed += upgrade.value;
            break;
        case 'projectileSize':
            player.projectileSize += upgrade.value;
            break;
        case 'piercing':
            player.piercing += upgrade.value;
            break;
        case 'multishot':
            player.multishot += upgrade.value;
            break;
        case 'slowZoneRange':
            // Increase slow zone radius (pixels)
            player.slowZoneRadius += upgrade.value || 75;
            break;
        case 'slowZonePercent':
            // Increase slow effect percentage (0-1)
            player.slowZonePercent = Math.min(0.95, player.slowZonePercent + (upgrade.value || 0.08));
            break;
    }
    
    // Show notification
    showUpgradeNotification(upgrade);
}

function showUpgradeNotification(upgrade) {
    const container = document.getElementById('upgradeNotifications');
    const notification = document.createElement('div');
    notification.className = 'upgrade-notification';
    
    let displayValue = '';
    if (upgrade == null) displayValue = '';
    else if (upgrade.stat === 'slowZoneRange') displayValue = `${upgrade.value}px`;
    else if (upgrade.stat === 'slowZonePercent') displayValue = `${Math.round((upgrade.value || 0) * 100)}%`;
    else if (typeof upgrade.value === 'number' && upgrade.value < 1) displayValue = upgrade.value.toFixed(2);
    else displayValue = upgrade.value !== undefined && upgrade.value !== null ? String(upgrade.value) : '';

    notification.innerHTML = `
        <p class="upgrade-notification-title">${upgrade.name}</p>
        <p class="upgrade-notification-value">+${displayValue}</p>
        <p class="upgrade-notification-level">Level ${gameState.level}</p>
    `;
    
    container.appendChild(notification);
    
    // Remove after animation completes
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

const levelUpUpgradesList = [
    { name: 'Max Health', stat: 'maxHealth', value: 30, desc: 'Increase max health' },
    { name: 'Damage', stat: 'damage', value: 5, desc: 'Increase bullet damage' },
    { name: 'Attack Speed', stat: 'attackSpeed', value: 0.25, desc: 'Increase fire rate' },
    { name: 'Projectile Speed', stat: 'projectileSpeed', value: 50, desc: 'Bullets travel faster' },
    { name: 'Projectile Size', stat: 'projectileSize', value: 2, desc: 'Larger projectiles' },
    // Split slow-zone into two passive upgrades: radius and strength
    { name: 'Slow Zone Range', stat: 'slowZoneRange', value: 75, desc: 'Increase slow zone radius (px)' },
    { name: 'Slow Zone Strength', stat: 'slowZonePercent', value: 0.08, desc: 'Increase slow percent (0-1)' },
    { name: 'Piercing', stat: 'piercing', value: 1, desc: 'Bullets pierce enemies' },
    { name: 'Multishot', stat: 'multishot', value: 1, desc: 'Fire extra bullets' },
];

// Weapons removed: upgrades are passive only (handled by levelUpUpgradesList and applyRandomUpgrade)

function generateRandomUpgrades() {
    const choices = [];
    const availableUpgrades = [...levelUpUpgradesList];
    
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
        choices.push(availableUpgrades[randomIndex]);
        availableUpgrades.splice(randomIndex, 1);
    }
    
    return choices;
}

function showLevelUpScreen() {
    gameState.levelUpChoices = generateRandomUpgrades();
    
    for (let i = 0; i < 3; i++) {
        const choice = gameState.levelUpChoices[i];
        document.getElementById(`choice${i}Title`).textContent = choice.name;
        document.getElementById(`choice${i}Desc`).textContent = choice.desc;
        
        const valueText = typeof choice.value === 'number' && choice.value < 1 
            ? choice.value.toFixed(2) 
            : choice.value;
        document.getElementById(`choice${i}Value`).textContent = `+${valueText}`;
    }
    
    document.getElementById('levelUpScreen').classList.remove('hidden');
}

function updateWave() {
    // Wave completion is now handled by XP system, no need for separate wave-based level up
}

function endGame() {
    gameOver = true;
    gameActive = false;
    document.getElementById('finalWave').textContent = gameState.wave;
    document.getElementById('finalGold').textContent = gameState.gold;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function restartGame() {
    // Reset player
    player.x = 0;
    player.y = 0;
    player.health = 100;
    player.maxHealth = 100;
    player.size = 15;
    player.attackSpeed = 1.0;
    player.projectileSpeed = 500;
    player.damage = 10;
    player.projectileSize = 5;
    player.piercing = 0;
    player.multishot = 1;
    player.shootCooldown = 1 / 1.0;
    
    // Reset game state
    gameState.wave = 1;
    gameState.waveEnemiesKilled = 0;
    gameState.totalEnemiesInWave = 5;
    gameState.gold = 0;
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.waitingForLevelUp = false;
    gameState.level = 1;
    gameState.currentXp = 0;
    gameState.maxXp = 25;
    gameState.lastSpawnTime = Date.now();
    
    // Reset UI
    gameOver = false;
    gameActive = true;
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('levelUpScreen').classList.add('hidden');
}

function updateUI() {
    document.getElementById('health').textContent = Math.max(0, Math.ceil(player.health));
    document.getElementById('maxHealth').textContent = player.maxHealth;
    document.getElementById('wave').textContent = gameState.wave;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('currentXp').textContent = gameState.currentXp;
    document.getElementById('maxXp').textContent = gameState.maxXp;
    document.getElementById('enemyCount').textContent = gameState.enemies.length;
    document.getElementById('gold').textContent = gameState.gold;
    document.getElementById('attackSpeed').textContent = player.attackSpeed.toFixed(2);
    document.getElementById('projSpeed').textContent = player.projectileSpeed;
    document.getElementById('sizeDisplay').textContent = player.size;
    document.getElementById('damage').textContent = player.damage;
}

// Priority UI: render and reorder functions
function renderPriorityUI() {
    // Populate the dropdown menu and update the summary text
    const menu = document.getElementById('priorityDropdown');
    const summary = document.getElementById('prioritySummary');
    if (!menu || !summary) return;
    menu.innerHTML = '';

    const list = gameState.enemyPriority || [];
    // Update summary (show full ordered list joined by >)
    summary.textContent = list.join(' > ');

    // Top control: enable/disable priorities
    const control = document.createElement('div');
    control.className = 'priority-item';
    const ctlLeft = document.createElement('div');
    ctlLeft.textContent = 'Use Priority';
    const ctlRight = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!gameState.usePriority;
    checkbox.addEventListener('change', () => {
        gameState.usePriority = checkbox.checked;
        // update summary (no change) and close if needed
        renderPriorityUI();
    });
    ctlRight.appendChild(checkbox);
    control.appendChild(ctlLeft);
    control.appendChild(ctlRight);
    menu.appendChild(control);

    list.forEach((type, idx) => {
        const item = document.createElement('div');
        item.className = 'priority-item';
        item.dataset.type = type;
        item.dataset.index = String(idx);

        const left = document.createElement('div');
        left.textContent = `${idx + 1}. ${type}`;

        const hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = '(Left: higher • Right: lower)';

        item.appendChild(left);
        item.appendChild(hint);

        // Left click -> increase priority (move up)
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const i = Number(item.dataset.index);
            if (!isNaN(i)) {
                if (i > 0) movePriorityUp(i);
                // keep dropdown open and refresh
                renderPriorityUI();
            }
        });

        // Right click -> decrease priority (move down)
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const i = Number(item.dataset.index);
            if (!isNaN(i)) {
                if (i < list.length - 1) movePriorityDown(i);
                renderPriorityUI();
            }
        });

        menu.appendChild(item);
    });
}

function movePriorityUp(index) {
    if (!gameState.enemyPriority) return;
    if (index <= 0) return;
    const arr = gameState.enemyPriority;
    const tmp = arr[index - 1];
    arr[index - 1] = arr[index];
    arr[index] = tmp;
    renderPriorityUI();
}

function movePriorityDown(index) {
    if (!gameState.enemyPriority) return;
    if (index >= gameState.enemyPriority.length - 1) return;
    const arr = gameState.enemyPriority;
    const tmp = arr[index + 1];
    arr[index + 1] = arr[index];
    arr[index] = tmp;
    renderPriorityUI();
}

// Initialize priority UI: attach toggle handlers and render
function initPriorityUI() {
    const toggle = document.getElementById('priorityToggle');
    const menu = document.getElementById('priorityDropdown');
    const panel = document.getElementById('priorityPanel');
    if (!toggle || !menu || !panel) return;

    // Toggle open/close
    function openMenu() {
        menu.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        // Add outside click listener
        setTimeout(() => {
            document.addEventListener('click', outsideClick);
        }, 0);
    }
    function closeMenu() {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', outsideClick);
    }
    function toggleMenu(e) {
        e.stopPropagation();
        if (menu.classList.contains('hidden')) openMenu(); else closeMenu();
    }
    function outsideClick(e) {
        if (!panel.contains(e.target)) closeMenu();
    }

    toggle.addEventListener('click', toggleMenu);
    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    renderPriorityUI();
}

setTimeout(initPriorityUI, 200);

// Rendering
function render() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context state for camera
    ctx.save();
    
    // Camera follows player
    const cameraX = player.x - canvas.width / 2;
    const cameraY = player.y - canvas.height / 2;
    ctx.translate(-cameraX, -cameraY);
    
    // Draw infinite grid background
    drawBackground(cameraX, cameraY);

    // Draw earthquake range indicator (if any)
    if (player.earthquakeRange > 0) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,100,0,0.08)';
        ctx.arc(player.x, player.y, player.earthquakeRange, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,100,0,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.earthquakeRange, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw slow zone indicator (if any)
    if (player.slowZoneRadius > 0) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0,150,255,0.06)';
        ctx.arc(player.x, player.y, player.slowZoneRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,150,255,0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.slowZoneRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw player
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player direction indicator
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    // Autoaim line to target
    if (gameState.currentTarget) {
        const tx = gameState.currentTarget.x - player.x;
        const ty = gameState.currentTarget.y - player.y;
        const distance = Math.sqrt(tx * tx + ty * ty);
        if (distance > 0) {
            const dirX = tx / distance;
            const dirY = ty / distance;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(player.x + dirX * 100, player.y + dirY * 100);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw target reticle on enemy
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(gameState.currentTarget.x, gameState.currentTarget.y, gameState.currentTarget.size + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // Draw projectiles
    gameState.projectiles.forEach(proj => {
        // Enemy projectiles are red, player projectiles are yellow
        ctx.fillStyle = proj.isEnemyProjectile ? '#ff4444' : '#ffff00';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw enemies
    gameState.enemies.forEach(enemy => {
        // Color/enemy type visual mapping
        let color = '#ff3333';
        if (enemy.type === 'random') {
            // Rainbow color that cycles over time and space
            const hue = Math.floor(((Date.now() / 20) + enemy.x + enemy.y) % 360);
            color = `hsl(${hue}, 85%, 55%)`;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (enemy.type === 'blackhole') {
            // Black hole visual: radial gradient fading outwards
            const grad = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 3);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(0.6, 'rgba(20,20,20,0.9)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // central core
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            ctx.fill();

            // subtle ring
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size + 8, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            switch (enemy.type) {
                case 'immuneSlow': color = '#9b59b6'; break; // purple
                case 'tank': color = '#8b0000'; break; // dark red
                case 'fastSmall': color = '#ff8c00'; break; // orange
                case 'assassin': color = '#ff00ff'; break; // magenta
                default: color = '#ff3333';
            }

            // Draw enemy body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            ctx.fill();

            // Assassin visual accent
            if (enemy.type === 'assassin') {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size + 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Sniper visual: crosshair
            if (enemy.type === 'sniper') {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1;
                const sightSize = enemy.size + 6;
                ctx.beginPath();
                ctx.moveTo(enemy.x - sightSize, enemy.y);
                ctx.lineTo(enemy.x + sightSize, enemy.y);
                ctx.moveTo(enemy.x, enemy.y - sightSize);
                ctx.lineTo(enemy.x, enemy.y + sightSize);
                ctx.stroke();
                // Scope circle
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, sightSize, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw health bar (skip for blackhole to reduce clutter)
        if (enemy.type !== 'blackhole') {
            const barWidth = enemy.size * 2;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y - enemy.size - 15;

            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = enemy.health / enemy.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff3333';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
    });
    
    // Draw active drop pods (falling and impact visuals)
    gameState.dropPods.forEach(pod => {
        if (pod.state === 'falling') {
            // Draw pod as small rectangle descending from above
            const drawY = pod.y - pod.fallHeight;
            ctx.save();
            ctx.fillStyle = '#cccccc';
            ctx.beginPath();
            ctx.rect(pod.x - 8, drawY - 12, 16, 16);
            ctx.fill();
            // subtle flame/contrail
            ctx.strokeStyle = 'rgba(255,140,0,0.6)';
            ctx.beginPath();
            ctx.moveTo(pod.x, drawY + 8);
            ctx.lineTo(pod.x, drawY + 24);
            ctx.stroke();
            ctx.restore();
        } else if (pod.state === 'impact') {
            // Impact ring
            const t = Math.min(1, pod.impactTimer / 0.6);
            const ringRadius = 10 + t * 120;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,200,60,${1 - t})`;
            ctx.lineWidth = 3 * (1 - t) + 1;
            ctx.arc(pod.x, pod.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            // small flash
            ctx.fillStyle = `rgba(255,220,120,${0.6 - t * 0.6})`;
            ctx.beginPath();
            ctx.arc(pod.x, pod.y, 6 + t * 12, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw active hazards (fire and gas)
    gameState.hazards.forEach(h => {
        const progress = Math.min(1, h.timer / h.duration);
        if (h.type === 'fire') {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,100,20,${0.35 * (1 - progress)})`;
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.fill();
            // flicker core
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,180,60,${0.6 * (1 - progress)})`;
            ctx.arc(h.x, h.y, Math.max(8, h.radius * 0.25), 0, Math.PI * 2);
            ctx.fill();
        } else if (h.type === 'gas') {
            ctx.beginPath();
            ctx.fillStyle = `rgba(120,200,120,${0.22 * (1 - progress)})`;
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = `rgba(80,160,120,${0.14 * (1 - progress)})`;
            ctx.arc(h.x, h.y, Math.max(10, h.radius * 0.2), 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw bombs in flight
    gameState.bombs.forEach(bomb => {
        ctx.save();
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.size, 0, Math.PI * 2);
        ctx.fill();
        // little glow/fuse
        ctx.strokeStyle = 'rgba(255,150,50,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.size + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });

    // Draw short-lived explosions
    gameState.explosions.forEach(ex => {
        const t = Math.min(1, ex.timer / ex.duration);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,120,40,${1 - t})`;
        ctx.lineWidth = 6 * (1 - t) + 1;
        ctx.arc(ex.x, ex.y, ex.radius * t, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,200,120,${0.6 * (1 - t)})`;
        ctx.arc(ex.x, ex.y, Math.max(6, ex.radius * 0.12 * (1 - t)), 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw pickups (health)
    gameState.pickups.forEach(p => {
        const fade = Math.max(0, 1 - p.timer / p.duration);
        // heart background
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,60,60,${0.9 * fade})`;
        ctx.arc(p.x - 4, p.y - 2, p.size * 0.6, 0, Math.PI * 2);
        ctx.arc(p.x + 4, p.y - 2, p.size * 0.6, 0, Math.PI * 2);
        ctx.moveTo(p.x - 8, p.y + 2);
        ctx.quadraticCurveTo(p.x, p.y + 14, p.x + 8, p.y + 2);
        ctx.fill();
        // white plus for clarity
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${fade})`;
        ctx.lineWidth = 2;
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x, p.y + 6);
        ctx.moveTo(p.x - 6, p.y);
        ctx.lineTo(p.x + 6, p.y);
        ctx.stroke();
    });
    
    ctx.restore();
}

function drawBackground(cameraX, cameraY) {
    const gridSize = TILE_SIZE;
    const startX = Math.floor(cameraX / gridSize) * gridSize;
    const startY = Math.floor(cameraY / gridSize) * gridSize;
    
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    
    for (let x = startX; x < startX + canvas.width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY - gridSize);
        ctx.lineTo(x, startY + canvas.height + gridSize);
        ctx.stroke();
    }
    
    for (let y = startY; y < startY + canvas.height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX - gridSize, y);
        ctx.lineTo(startX + canvas.width + gridSize, y);
        ctx.stroke();
    }
}

// Professional HUD Rendering (Linus Style)
function renderHUD() {
    // Save context
    ctx.save();
    
    // Reset transform for HUD overlay (use setTransform for broader compatibility)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Semi-transparent dark background for HUD sections
    const padding = 15;
    const fontSize = 13;
    const lineHeight = 18;
    
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    
    // Top Left - System Stats
    const tlWidth = 280;
    const tlHeight = 160;
    ctx.fillRect(padding, padding, tlWidth, tlHeight);
    ctx.strokeRect(padding, padding, tlWidth, tlHeight);
    
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'left';
    let y = padding + 15;
    
    ctx.font = `bold 14px 'Courier New', monospace`;
    ctx.fillText('┌─ SYSTEM INFO ─┐', padding + 10, y);
    y += lineHeight + 3;
    
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.fillText(`FPS: ${gameState.fps}`, padding + 15, y);
    y += lineHeight;
    ctx.fillText(`ENEMIES: ${gameState.enemies.length}`, padding + 15, y);
    y += lineHeight;
    ctx.fillText(`PROJECTILES: ${gameState.projectiles.length}`, padding + 15, y);
    y += lineHeight;
    const spawnRate = (BASE_SPAWN_RATE + gameState.level * 0.5).toFixed(1);
    ctx.fillText(`SPAWN RATE: ${spawnRate}/s`, padding + 15, y);
    y += lineHeight;
    ctx.fillText(`LEVEL: ${gameState.level}`, padding + 15, y);
    y += lineHeight;
    ctx.fillText(`TIME: ${(Date.now() / 1000).toFixed(1)}s`, padding + 15, y);
    
    // Top Right - Player Stats
    const trX = canvas.width - padding - 280;
    const trWidth = 280;
    const trHeight = 160;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(trX, padding, trWidth, trHeight);
    ctx.strokeStyle = '#00bfff';
    ctx.strokeRect(trX, padding, trWidth, trHeight);
    
    ctx.fillStyle = '#00bfff';
    y = padding + 15;
    
    ctx.font = `bold 14px 'Courier New', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText('┌─ PLAYER STATS ─┐', trX + trWidth - 10, y);
    
    ctx.textAlign = 'right';
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    y += lineHeight + 3;
    ctx.fillText(`HP: ${Math.ceil(player.health)}/${player.maxHealth}`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`DMG: ${player.damage}`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`ATK SPD: ${player.attackSpeed.toFixed(2)}x`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`PROJ SPD: ${player.projectileSpeed}`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`PIERCE: ${player.piercing}`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`SHOTS: ${player.multishot}`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`SIZE: ${player.size}px`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`LVL: ${gameState.level}`, trX + trWidth - 15, y);
    y += lineHeight;
    ctx.fillText(`XP: ${gameState.currentXp}/${gameState.maxXp}`, trX + trWidth - 15, y);
    
    // Bottom Left - Target Info
    const blWidth = 280;
    const blHeight = gameState.currentTarget ? 90 : 60;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(padding, canvas.height - padding - blHeight, blWidth, blHeight);
    ctx.strokeStyle = '#ff6b6b';
    ctx.strokeRect(padding, canvas.height - padding - blHeight, blWidth, blHeight);
    
    ctx.fillStyle = '#ff6b6b';
    y = canvas.height - padding - blHeight + 15;
    
    ctx.font = `bold 14px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('┌─ TARGET INFO ─┐', padding + 10, y);
    y += lineHeight + 3;
    
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    if (gameState.currentTarget) {
        const target = gameState.currentTarget;
        const distToTarget = Math.sqrt((target.x - player.x) ** 2 + (target.y - player.y) ** 2);
        ctx.fillText(`STATUS: LOCKED`, padding + 15, y);
        y += lineHeight;
        ctx.fillText(`DIST: ${Math.round(distToTarget)}px`, padding + 15, y);
        y += lineHeight;
        ctx.fillText(`HP: ${Math.ceil(target.health)}/${target.maxHealth}`, padding + 15, y);
    } else {
        ctx.fillText(`STATUS: NO TARGET`, padding + 15, y);
    }
    
    // Bottom Right debug box removed
    
    // Draw crosshair in center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY);
    ctx.lineTo(centerX + 15, centerY);
    ctx.moveTo(centerX, centerY - 15);
    ctx.lineTo(centerX, centerY + 15);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
}

// Game Loop
let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    
    // FPS Counter
    gameState.frameCount++;
    if (now - gameState.lastFpsTime >= 1000) {
        gameState.fps = gameState.frameCount;
        gameState.frameCount = 0;
        gameState.lastFpsTime = now;
    }
    
    if (gameActive && !gameOver) {
        updatePlayer(dt);
        autoShoot();
        triggerEarthquake();
        updateProjectiles(dt);
        updateEnemies(dt);
        updateDropPods(dt);
        updateHazards(dt);
        updateBombs(dt);
        updateExplosions(dt);
        updatePickups(dt);
        
        // Continuous enemy spawning
        const spawnRate = BASE_SPAWN_RATE + gameState.level * 0.04;
        const spawnInterval = 1 / spawnRate;
        if (now - gameState.lastSpawnTime > spawnInterval * 1000) {
            spawnContinuousEnemy();
            gameState.lastSpawnTime = now;
        }
        // Chance to spawn a drop pod event occasionally
        const dropCooldown = 10000; // minimum ms between attempts
        if (now - gameState.lastDropPodTime > dropCooldown) {
            // Average roughly 1 drop every 20-40 seconds: chance ~0.03-0.05 per check
            if (Math.random() < 0.12) {
                triggerDropPodEvent();
                gameState.lastDropPodTime = now;
            } else {
                // still reset timer to avoid many checks
                gameState.lastDropPodTime = now;
            }
        }
        // Bomb pod event (falls and spawns thrown bombs)
        const bombCooldown = 20000; // ms
        if (now - gameState.lastBombPodTime > bombCooldown) {
            if (Math.random() < 0.08) {
                // schedule a bomb pod
                const angle = Math.random() * Math.PI * 2;
                const distance = SPAWN_DISTANCE * 0.6 + Math.random() * 200;
                const x = player.x + Math.cos(angle) * distance;
                const y = player.y + Math.sin(angle) * distance;
                const pod = { x, y, fallHeight: 600, fallSpeed: 700 + Math.random() * 200, state: 'falling', type: 'bombpod', spawned: false, impactTimer: 0 };
                gameState.dropPods.push(pod);
                gameState.lastBombPodTime = now;
            } else {
                gameState.lastBombPodTime = now;
            }
        }
        // Health pod event (falls and spawns a health pickup on impact)
        const healthCooldown = 22000; // ms
        if (now - gameState.lastHealthPodTime > healthCooldown) {
            if (Math.random() < 0.08) {
                // schedule a health pod
                const angle = Math.random() * Math.PI * 2;
                const distance = SPAWN_DISTANCE * 0.6 + Math.random() * 200;
                const x = player.x + Math.cos(angle) * distance;
                const y = player.y + Math.sin(angle) * distance;
                const pod = { x, y, fallHeight: 600, fallSpeed: 700 + Math.random() * 200, state: 'falling', type: 'healthpod', spawned: false, impactTimer: 0 };
                gameState.dropPods.push(pod);
                gameState.lastHealthPodTime = now;
            } else {
                gameState.lastHealthPodTime = now;
            }
        }
        // Fireball event (falls and creates a burning zone)
        const fireCooldown = 15000;
        if (now - gameState.lastFireballTime > fireCooldown) {
            if (Math.random() < 0.06) {
                triggerFireballEvent();
                gameState.lastFireballTime = now;
            } else {
                gameState.lastFireballTime = now;
            }
        }
        // Gas event (falls and creates a gas cloud)
        const gasCooldown = 20000;
        if (now - gameState.lastGasTime > gasCooldown) {
            if (Math.random() < 0.05) {
                triggerGasEvent();
                gameState.lastGasTime = now;
            } else {
                gameState.lastGasTime = now;
            }
        }
    }
    
    updateUI();
    render();
    renderHUD();
    requestAnimationFrame(gameLoop);
}

// Start game
gameState.lastSpawnTime = Date.now();
gameLoop();
