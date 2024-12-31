// Debug flag
const DEBUG = true;
const track = new Track(world);

function setup() {
    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    background(100);
    CAR_BODY_IMAGE = loadImage(CAR_BODY_IMAGE_PATH);
    CAR_WHEEL_IMAGE = loadImage(CAR_WHEEL_IMAGE_PATH);
    GRASS_IMAGE = loadImage(GRASS_IMAGE_PATH);
    track.setup();
    totalCheckpoints = track.getTotalCheckpoints();
}

function draw() {
    // Step the physics world
    world.step(1 / 60);

    // Save the current transformation state
    push();
    // Scale down the view
    scale(SCALE_FACTOR);

    moveViewToCar();
    drawGrass();
    drawOutsideWalls();

    track.draw();
    drawCar();

    drawCarMetrics();
    // Restore the original transformation state
    pop();
}

