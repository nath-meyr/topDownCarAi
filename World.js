let GRASS_IMAGE = null;

// Canvas dimensions
const CANVAS_HEIGHT = window.innerHeight;
const CANVAS_WIDTH = window.innerWidth;
const MIN_SCALE_FACTOR = 25;
const MAX_SCALE_FACTOR = 35;
const SCALE_SPEED_FACTOR = 0.5; // How much speed affects zoom (lower = more dramatic)
let SCALE_FACTOR = 100;
const PHYSICS_HEIGHT = CANVAS_HEIGHT / SCALE_FACTOR;
const PHYSICS_WIDTH = CANVAS_WIDTH / SCALE_FACTOR;


const GRASS_IMAGE_PATH = 'assets/grass_1.avif';
// Physics constants
const WALL_THICKNESS = 0.3;
const WALL_OPTIONS = {
    isStatic: true,
    collisionResponse: true
};

const wallMultiplier = 25;
const outsideWalls = {
    width: wallMultiplier * PHYSICS_WIDTH,
    height: wallMultiplier * PHYSICS_HEIGHT
};
// Create a World
const world = new p2.World({
    gravity: [0, 0],
});

function drawGrass() {
    // Draw repeating grass background
    const grassSize = 10; // Size of grass tile in pixels
    const numTilesX = Math.ceil(outsideWalls.width / grassSize); // 10x wider
    const numTilesY = Math.ceil(outsideWalls.height / grassSize); // 10x taller
    const startX = -numTilesX * grassSize / 2;
    const startY = -numTilesY * grassSize / 2;
    // Create a deterministic random value based on x,y coordinates
    function getRandomFromCoords(x, y) {
        const a = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (a - Math.floor(a));
    }

    for (let x = startX; x < startX + numTilesX * grassSize; x += grassSize) {
        for (let y = startY; y < startY + numTilesY * grassSize; y += grassSize) {
            push();
            translate(x + grassSize / 2, y + grassSize / 2);
            // Fixed 90 degree rotation
            rotate(90 * PI / 180);
            image(GRASS_IMAGE, -grassSize / 2, -grassSize / 2, grassSize, grassSize);
            pop();
        }
    }

}

function drawPointGrid() {
    // Draw grid points with alternating shades of gray
    strokeWeight(0.5);
    for (let x = -100; x < 100; x += 5) {
        for (let y = -100; y < 100; y += 5) {
            // Change color every 10 points using modulo
            // Use Math.abs to handle negative values before modulo
            let shade = ((Math.abs(Math.floor(x / 10)) + Math.abs(Math.floor(y / 10))) % 3) * 100;
            stroke(shade);
            fill(shade);
            point(x, y);
        }
    }

}

// Add these constants at the top with other scale constants
const BASE_SCALE_FACTOR = 10;
const SCALE_TRANSITION_SPEED = 0.03;

// Modify the updateScaleFactor function
function updateScaleFactor(carSpeed, isRaceFinished) {
    let targetScale;

    if (isRaceFinished) {
        // When race is finished, return to base scale
        targetScale = BASE_SCALE_FACTOR;
    } else {
        // Normal racing zoom based on speed
        targetScale = MAX_SCALE_FACTOR - (carSpeed * SCALE_SPEED_FACTOR);
        targetScale = Math.max(MIN_SCALE_FACTOR, Math.min(MAX_SCALE_FACTOR, targetScale));
    }

    // Smooth transition to target scale
    SCALE_FACTOR = SCALE_FACTOR + (targetScale - SCALE_FACTOR) * SCALE_TRANSITION_SPEED;
}