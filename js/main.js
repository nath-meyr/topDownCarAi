// Debug flag
const DEBUG = true;
let gameWorld;

function setup() {
    createCanvas(GameWorld.CANVAS_WIDTH, GameWorld.CANVAS_HEIGHT);
    background(100);

    // Initialize game world
    gameWorld = new GameWorld();

    // Load assets
    CAR_BODY_IMAGE = loadImage(Car.CAR_BODY_IMAGE_PATH);
    CAR_WHEEL_IMAGE = loadImage(Car.CAR_WHEEL_IMAGE_PATH);
    gameWorld.loadAssets();

    // Initialize track in gameWorld
    const track = new Track(gameWorld.getPhysicsWorld(), DEBUG);
    track.setup();
    gameWorld.setTrack(track);

    // Create cars and store them in gameWorld
    for (let i = 0; i < GameWorld.CARS_COUNT; i++) {
        const car = new Car(gameWorld, DEBUG);
        car.setTotalCheckpoints(track.getTotalCheckpoints());
        car.setPosition(0, 0);
        car.setCarIndex(i);
        gameWorld.addCar(car);
    }
}
function keyPressed() {
    if (gameWorld.selectionMode) {
        if (key === ' ') {
            gameWorld.cycleFocusedCar();
        } else if (keyCode === ENTER) {
            gameWorld.startNextGeneration();
        } else if (key === 'B' || key === 'b') {
            gameWorld.focusOnBestCar();
        } else if (key === 'A' || key === 'a') {
            gameWorld.toggleAutoSelect();
        }
    } else {
        if (key === ' ') {
            gameWorld.cycleFocusedCar();
        } else if (keyCode === ENTER) {
            gameWorld.startRaceCountdown();
        } else if (key === 'S' || key === 's') {
            gameWorld.enterSelectionMode();
        } else if (key === 'B' || key === 'b') {
            gameWorld.focusOnBestCar();
        } else if (key === 'A' || key === 'a') {
            gameWorld.toggleAutoSelect();
        }
    }
}

function draw() {
    // Update race state
    gameWorld.updateRaceState();

    // Get average car speed for scale factor calculation
    const averageSpeed = gameWorld.getAverageCarSpeed();

    // Update scale factor based on average speed and race state
    const anyCarFinished = gameWorld.isAnyCarFinished();
    gameWorld.updateScaleFactor(averageSpeed, anyCarFinished);

    // Step the physics world
    gameWorld.step();

    // Update all cars
    gameWorld.updateCars();

    // Draw the world (includes all visual elements)
    gameWorld.draw();
}

