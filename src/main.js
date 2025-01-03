// Debug flag
const DEBUG = true;
let gameWorld;
let geneticManager;
let isPaused = false;

async function startGame(trackId = 'roundabout', shouldCreateNew = true) {
    if (shouldCreateNew) {
        // Initialize track
        const track = new Track(gameWorld.getPhysicsWorld(), DEBUG);
        track.setup(trackId);
        gameWorld.setTrack(track);

        // Initialize genetic manager
        geneticManager = new GeneticManager(gameWorld);
    } else {
        // Reuse existing game instance
        gameWorld.getTrack().setup(trackId);
        geneticManager.initializePopulation();
    }

    // Start all cars
    geneticManager.cars.forEach(car => {
        car.startRace();
    });
}

function setup() {
    createCanvas(GameWorld.CANVAS_WIDTH, GameWorld.CANVAS_HEIGHT);
    background(100);

    // Initialize game world
    gameWorld = new GameWorld();

    // Load game world assets
    gameWorld.loadAssets();

    // Start game with default track
    startGame('roundabout', true);
}

function draw() {
    if (!gameWorld.getTrack() || isPaused) {
        return; // Don't draw anything if track isn't loaded or game is paused
    }

    // Update genetic manager
    geneticManager.update();

    // Get focused car for camera
    const focusedCar = geneticManager.getFocusedCar();

    // Get car speed for scale factor calculation
    const carSpeed = Math.sqrt(
        Math.pow(focusedCar.chassisBody.velocity[0], 2) +
        Math.pow(focusedCar.chassisBody.velocity[1], 2)
    );

    // Update scale factor based on speed, but don't change if car has finished
    if (!focusedCar.raceFinished) {
        gameWorld.updateScaleFactor(carSpeed, false);
    }

    // Step the physics world
    gameWorld.step();

    push();
    scale(gameWorld.getScaleFactor());

    // Move view to follow focused car
    translate(
        GameWorld.CANVAS_WIDTH / (2 * gameWorld.getScaleFactor()) - focusedCar.chassisBody.position[0],
        GameWorld.CANVAS_HEIGHT / (2 * gameWorld.getScaleFactor()) - focusedCar.chassisBody.position[1]
    );

    gameWorld.drawGrass();
    gameWorld.getTrack().draw();

    // Draw all cars
    geneticManager.draw();

    pop();
}

// Add key handler for car selection and focus cycling
function keyPressed() {
    if (key === ' ') {
        // Space bar - cycle focus
        geneticManager.cycleFocus();
    } else if (key === 'Enter') {
        // Enter - select focused car
        geneticManager.selectFocusedCar();
    } else if (key === 'e' || key === 'E') {
        // E - evolve selected cars
        geneticManager.evolve();
    } else if (key === 'r' || key === 'R') {
        // R - restart generation
        geneticManager.restartGeneration();
    } else if (key === 'x' || key === 'X') {
        // X - reset evolution completely
        geneticManager.resetEvolution();
    } else if (key === 'p' || key === 'P') {
        // P - toggle pause
        isPaused = !isPaused;
        Display.getInstance().showPauseOverlay(isPaused);
        console.log(isPaused ? "Game Paused" : "Game Resumed");
    } else if (key === 'z' || key === 'Z') {
        // Z - undo last evolution
        geneticManager.undoLastEvolution();
    } else if (key === 'b' || key === 'B') {
        // B - focus best car
        geneticManager.focusBestCar();
    } else {
        // Handle numpad keys for quick car selection (1-9 for cars 1-9, 0 for car 10)
        const numKey = parseInt(key);
        if (!isNaN(numKey)) {
            const carIndex = numKey === 0 ? 9 : numKey - 1; // Convert 0 to car 10 (index 9)
            if (carIndex >= 0 && carIndex < geneticManager.cars.length) {
                geneticManager.focusCarByIndex(carIndex);
            }
        }
    }
}