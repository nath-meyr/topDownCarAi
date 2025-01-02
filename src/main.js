// Debug flag
const DEBUG = true;
let gameWorld;
let car;
let menu;

// Add brain type tracking
let currentBrainType = 'ai'; // or 'ai'
let trainingData = [];

async function startGame(trackId, shouldCreateNew = true) {
    if (shouldCreateNew) {
        // Initialize track and car
        const track = new Track(gameWorld.getPhysicsWorld(), DEBUG);
        track.setup(trackId);
        gameWorld.setTrack(track);

        // Create brain based on type
        const brain = currentBrainType === 'human' ?
            new HumanBrain() :
            new NeuralBrain();

        // If AI brain, try to load saved weights
        if (currentBrainType === 'ai') {
            await brain.loadWeights();
        }

        car = new Car(gameWorld, menu, brain, null, DEBUG);
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
    } else if (keyCode === 84) { // 'T' key
        toggleBrain();
    } else if (keyCode === 82) { // 'R' key
        recordTraining();
    } else if (keyCode === 76) { // 'L' key
        trainAI();
    }
}

// Add function to toggle brain type
async function toggleBrain() {
    currentBrainType = currentBrainType === 'human' ? 'ai' : 'human';
    // Restart game with new brain
    startGame(gameWorld.getTrack().getCurrentTrackId(), true);
}

// Add function to record human training data
function recordTraining() {
    if (car && car.brain instanceof HumanBrain) {
        const state = car.brain.getState();
        trainingData.push(state);
    }
}

// Add function to train AI with recorded data
async function trainAI() {
    if (trainingData.length === 0) {
        console.log('No training data available');
        return;
    }

    const aiBrain = new NeuralBrain();
    await aiBrain.train(trainingData);
    await aiBrain.saveWeights();
    console.log('AI trained with', trainingData.length, 'samples');
}

