// Debug flag
const DEBUG = true;
const track = new Track(world, DEBUG);
let car; // Declare car variable

function setup() {
    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    background(100);
    CAR_BODY_IMAGE = loadImage(Car.CAR_BODY_IMAGE_PATH);
    CAR_WHEEL_IMAGE = loadImage(Car.CAR_WHEEL_IMAGE_PATH);
    GRASS_IMAGE = loadImage(GRASS_IMAGE_PATH);
    track.setup();

    // Create car instance
    car = new Car(world, DEBUG);
    car.setTotalCheckpoints(track.getTotalCheckpoints());
}

function draw() {
    // Get car speed for scale factor calculation
    const carSpeed = Math.sqrt(
        Math.pow(car.chassisBody.velocity[0], 2) +
        Math.pow(car.chassisBody.velocity[1], 2)
    );

    // Update scale factor based on speed and race state
    updateScaleFactor(carSpeed, car.raceFinished);

    // Step the physics world
    world.step(1 / 60);

    push();
    scale(SCALE_FACTOR);

    car.moveViewToCar();
    drawGrass();

    track.draw();
    car.draw();

    pop();
}

