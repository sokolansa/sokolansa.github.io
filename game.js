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
    totalEnemiesSpawned: 0
    ,
    projectileLifetimeBonus: 0
    ,
    // Enemy priority order (highest priority first)
    enemyPriority: ['assassin','sniper','tank','normal','fastSmall','immuneSlow']
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
                        addXp((xpRewards[enemy.type] || 5) + gameState.level);
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
    else if (r < 0.92) type = 'tank';
    else if (r < 0.97) type = 'assassin';
    else type = 'sniper';

    // Base stats
    let size = 12;
    let health = 20 + gameState.level * 3;
    let speed = 50 + gameState.level * 4;
    let damage = 8 + gameState.level;
    let goldValue = 20 + gameState.level * 3;
    let immuneToSlow = false;

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
        // Sniper-specific: shooting cooldown
        lastShotTime: 0,
        shootCooldown: type === 'sniper' ? 2.5 : 0 // seconds between shots
    };
}

// XP rewards per enemy type (base values)
const xpRewards = {
    normal: 5,
    fastSmall: 4,
    immuneSlow: 6,
    tank: 20,
    assassin: 30,
    sniper: 18
};

function updateEnemies(dt) {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
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

            enemy.vx = dirX * enemy.speed * speedMultiplier;
            enemy.vy = dirY * enemy.speed * speedMultiplier;
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
                            addXp((xpRewards[other.type] || 5) + gameState.level);
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
        
        // Draw health bar
        const barWidth = enemy.size * 2;
        const barHeight = 4;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.size - 15;
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff3333';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
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
        
        // Continuous enemy spawning
        const spawnRate = BASE_SPAWN_RATE + gameState.level * 0.04;
        const spawnInterval = 1 / spawnRate;
        if (now - gameState.lastSpawnTime > spawnInterval * 1000) {
            spawnContinuousEnemy();
            gameState.lastSpawnTime = now;
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
