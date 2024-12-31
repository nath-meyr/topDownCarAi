let GRASS_IMAGE = null;

// Canvas dimensions
const CANVAS_HEIGHT = window.innerHeight;
const CANVAS_WIDTH = window.innerWidth;
const SCALE_FACTOR = 20;
const PHYSICS_HEIGHT = CANVAS_HEIGHT / SCALE_FACTOR;
const PHYSICS_WIDTH = CANVAS_WIDTH / SCALE_FACTOR;


const GRASS_IMAGE_PATH = 'assets/grass_1.avif';
// Physics constants
const WALL_THICKNESS = 0.3;
const WALL_OPTIONS = {
    isStatic: true,
    collisionResponse: true
};

const outsideWalls = {
    width: 100 * PHYSICS_WIDTH,
    height: 100 * PHYSICS_HEIGHT
};
// Create a World
const world = new p2.World({
    gravity: [0, 0],
});

// Create walls
const wallConfigs = [
    // [width, height, x, y, angle, angleCenter]
    [outsideWalls.width, WALL_THICKNESS, 0, -(outsideWalls.height) / 2, 0],    // Top
    [outsideWalls.width, WALL_THICKNESS, 0, (outsideWalls.height) / 2, 0],     // Bottom  
    [WALL_THICKNESS, outsideWalls.height, -(outsideWalls.width) / 2, 0, 0],    // Left
    [WALL_THICKNESS, outsideWalls.height, (outsideWalls.width) / 2, 0, 0],     // Right

    // Diagonal walls for corners
    // Top-left diagonal
    [WALL_THICKNESS * 4, WALL_THICKNESS, -(outsideWalls.width) / 2 + 0.3, -(outsideWalls.height) / 2 + 0.3, -45, 1],
    // Top-right diagonal  
    [WALL_THICKNESS * 4, WALL_THICKNESS, (outsideWalls.width) / 2 - 0.3, -(outsideWalls.height) / 2 + 0.3, 45, 1],
    // Bottom-left diagonal
    [WALL_THICKNESS * 4, WALL_THICKNESS, -(outsideWalls.width) / 2 + 0.3, (outsideWalls.height) / 2 - 0.3, 45, 1],
    // Bottom-right diagonal
    [WALL_THICKNESS * 4, WALL_THICKNESS, (outsideWalls.width) / 2 - 0.3, (outsideWalls.height) / 2 - 0.3, -45, 1]
];

const walls = wallConfigs.map(([width, height, x, y, angle, angleCenter = 0]) => {
    const wall = new p2.Body(WALL_OPTIONS);
    wall.addShape(new p2.Box({ width, height }));
    wall.position[0] = x;
    wall.position[1] = y;
    if (angleCenter) {
        wall.angle = angle * Math.PI / 180; // Convert angle to radians and rotate around center
    } else {
        wall.angle = angle; // Convert angle to radians and rotate around center
    }
    world.addBody(wall);
    return wall;
});


function drawGrass() {
    // Draw repeating grass background
    const grassSize = 10; // Size of grass tile in pixels
    const numTilesX = Math.ceil(10 * PHYSICS_WIDTH / grassSize); // 10x wider
    const numTilesY = Math.ceil(10 * PHYSICS_HEIGHT / grassSize); // 10x taller
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

function drawOutsideWalls() {

    // Draw walls
    stroke(255, 0, 0);
    fill(200, 0, 0);
    strokeWeight(1 / SCALE_FACTOR);

    for (const wall of walls) {
        beginShape();
        const vertices = wall.shapes[0].vertices;
        for (let i = 0; i < vertices.length; i++) {
            const worldPoint = p2.vec2.create();
            wall.toWorldFrame(worldPoint, vertices[i]);
            vertex(worldPoint[0], worldPoint[1]);
        }
        endShape(CLOSE);
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