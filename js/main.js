// Debug flag
const DEBUG = true;
let gameWorld;
let car;
let menu;

async function startGame(trackId, shouldCreateNew = true) {
    if (shouldCreateNew) {
        // Initialize track and car
        const track = new Track(gameWorld.getPhysicsWorld(), DEBUG);
        track.setup(trackId);
        gameWorld.setTrack(track);

        // Create car with brain
        const brain = new HumanBrain();
        car = new Car(gameWorld, menu, brain, DEBUG);
        car.setTotalCheckpoints(track.getTotalCheckpoints());
    } else {
        // Reuse existing game instance
        gameWorld.getTrack().setup(trackId);
        car.setTotalCheckpoints(gameWorld.getTrack().getTotalCheckpoints());
        car.restartRace();
    }

    // Start countdown and then start the race
    if (shouldCreateNew) {
        await car.display.startCountdown(() => {
            car.startRace();
        });
    }
}

function setup() {
    createCanvas(GameWorld.CANVAS_WIDTH, GameWorld.CANVAS_HEIGHT);
    background(100);

    // Initialize game world
    gameWorld = new GameWorld();

    // Load game world assets
    gameWorld.loadAssets();

    // Create menu
    menu = new Menu(trackId => {
        // If car exists, reuse it, otherwise create new game
        startGame(trackId, !car);
    });
}

function draw() {
    if (!gameWorld.getTrack()) {
        return; // Don't draw anything until track is selected
    }

    // Update car controls
    car.update();

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
    if (keyCode === ESCAPE && !car?.isCountingDown) {
        if (menu.isMenuVisible()) {
            menu.hide();
        } else {
            menu.show();
        }
    }
}

