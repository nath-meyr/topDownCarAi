// Debug flag
const DEBUG = true;
let gameWorld;
let car;
let menu;

function startGame(trackId) {
    // Initialize track and car
    const track = new Track(gameWorld.getPhysicsWorld(), DEBUG);
    track.setup(trackId);
    gameWorld.setTrack(track);

    car = new Car(gameWorld, DEBUG);
    car.setTotalCheckpoints(track.getTotalCheckpoints());
}

function setup() {
    createCanvas(GameWorld.CANVAS_WIDTH, GameWorld.CANVAS_HEIGHT);
    background(100);

    // Initialize game world
    gameWorld = new GameWorld();

    // Load assets
    CAR_BODY_IMAGE = loadImage(Car.CAR_BODY_IMAGE_PATH);
    CAR_WHEEL_IMAGE = loadImage(Car.CAR_WHEEL_IMAGE_PATH);
    gameWorld.loadAssets();

    // Create menu
    menu = new Menu(trackId => {
        startGame(trackId);
    });
}

function draw() {
    if (!gameWorld.getTrack()) {
        return; // Don't draw anything until track is selected
    }

    // Get car speed for scale factor calculation
    const carSpeed = Math.sqrt(
        Math.pow(car.chassisBody.velocity[0], 2) +
        Math.pow(car.chassisBody.velocity[1], 2)
    );

    // Update scale factor based on speed and race state
    gameWorld.updateScaleFactor(carSpeed, car.raceFinished);

    // Step the physics world
    gameWorld.step();

    push();
    scale(gameWorld.getScaleFactor());

    car.moveViewToCar();
    gameWorld.drawGrass();

    gameWorld.getTrack().draw();
    car.draw();

    pop();
}

// Add key handler to return to menu
function keyPressed() {
    if (keyCode === ESCAPE) {
        menu.show();
    }
}

