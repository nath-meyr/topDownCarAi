let CAR_BODY_IMAGE = null;
let CAR_WHEEL_IMAGE = null;
// Asset paths
const CAR_BODY_IMAGE_PATH = 'assets/f1_no_f_wheels.png';
const CAR_WHEEL_IMAGE_PATH = 'assets/f1_wheel.png';

// Vehicle constants
const CHASSIS_MASS = 1;
const CHASSIS_WIDTH = 0.54;
const CHASSIS_HEIGHT = 1.04;
const FRONT_WHEEL_POSITION = [0, 0.5];
const BACK_WHEEL_POSITION = [0, -0.5];
const FRONT_WHEEL_FRICTION = 6;
const BACK_WHEEL_FRICTION = 6;
const FORWARD_ENGINE_FORCE = 7;
const REVERSE_ENGINE_FORCE = -2;
const BRAKE_FORCE = 5;
const COLLISION_DAMPING = 0.5;

// Wheel rendering constants
const WHEEL_WIDTH = 0.14;
const WHEEL_HEIGHT = 0.18;
const WHEEL_OFFSET_X = 0.2;
const WHEEL_OFFSET_Y = -0.20;

const MAX_STEER = Math.PI / 4;

// Timer variables
let startTime = null;
let raceTime = 0;
let checkpointTimes = [];
let hitCheckpoints = new Set(); // Track unique checkpoint hits
let totalCheckpoints = 0; // Will store total number of checkpoints
let allCheckpointsHit = false; // Flag for when all checkpoints are hit
let raceFinished = false;

// Create a dynamic body for the chassis
const chassisBody = new p2.Body({
    mass: CHASSIS_MASS,
    position: [0, 0],
    angle: -90 * Math.PI / 180,
});
const boxShape = new p2.Box({
    width: CHASSIS_WIDTH,
    height: CHASSIS_HEIGHT,
    collisionGroup: Track.COLLISION_GROUP.CAR,
    // The car should collide with walls, checkpoints, start, and finish lines
    collisionMask: Track.COLLISION_GROUP.WALL |
        Track.COLLISION_GROUP.CHECKPOINT |
        Track.COLLISION_GROUP.START |
        Track.COLLISION_GROUP.FINISH
});
chassisBody.addShape(boxShape);
world.addBody(chassisBody);

// Create the vehicle
const vehicle = new p2.TopDownVehicle(chassisBody);
const frontWheel = vehicle.addWheel({
    localPosition: FRONT_WHEEL_POSITION,
    sideFriction: FRONT_WHEEL_FRICTION,
});

// Back wheel
const backWheel = vehicle.addWheel({
    localPosition: BACK_WHEEL_POSITION,
    sideFriction: BACK_WHEEL_FRICTION,
});

vehicle.addToWorld(world);


// Add collision handler to reduce speed on impact and track checkpoints
world.on('beginContact', (evt) => {
    if ((evt.bodyA === chassisBody || evt.bodyB === chassisBody)) {
        const otherBody = evt.bodyA === chassisBody ? evt.bodyB : evt.bodyA;
        const otherShape = otherBody.shapes[0];

        // Check collision groups
        if (otherShape.collisionGroup === Track.COLLISION_GROUP.CHECKPOINT) {
            // Get checkpoint index from the body's userData
            const checkpointIndex = otherBody.checkpointIndex;

            // Only record time if we haven't hit this checkpoint before
            if (!hitCheckpoints.has(checkpointIndex)) {
                hitCheckpoints.add(checkpointIndex);
                checkpointTimes.push(raceTime);

                // Check if all checkpoints have been hit
                if (hitCheckpoints.size === totalCheckpoints) {
                    allCheckpointsHit = true;
                }
            }
            return;
        } else if (otherShape.collisionGroup === Track.COLLISION_GROUP.START) {
            return;
        } else if (otherShape.collisionGroup === Track.COLLISION_GROUP.FINISH) {
            // Only finish the race if all checkpoints have been hit
            if (allCheckpointsHit && !raceFinished) {
                raceFinished = true;
                // Just stop engine and steering, but keep momentum
                backWheel.engineForce = 0;
                frontWheel.steerValue = 0;
            }
            return;
        } else if (otherShape.collisionGroup === Track.COLLISION_GROUP.WALL) {
            // Handle wall collisions
            chassisBody.velocity[0] *= COLLISION_DAMPING;
            chassisBody.velocity[1] *= COLLISION_DAMPING;
            chassisBody.angularVelocity *= COLLISION_DAMPING;
            backWheel.engineForce = 0;
        }
    }
});


// Key controls
const keys = {
    '37': 0, // left
    '39': 0, // right
    '38': 0, // up
    '40': 0 // down
};

// Event handlers
function handleKeyDown(evt) {
    // Start timer on first key press
    if (startTime === null) {
        startTime = Date.now();
    }
    keys[evt.keyCode] = 1;
    updateVehicleControls();
}

function handleKeyUp(evt) {
    keys[evt.keyCode] = 0;
    updateVehicleControls();
}

// Add event listeners
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

// Control update functions
function updateSteering() {
    frontWheel.steerValue = MAX_STEER * (keys[39] - keys[37]);
}

function updateEngineForce() {
    backWheel.engineForce = keys[38] * FORWARD_ENGINE_FORCE;
}

function updateBraking() {
    backWheel.setBrakeForce(0);
    if (keys[40]) {
        if (backWheel.getSpeed() > 0.1) {
            // Moving forward - add some brake force to slow down
            backWheel.setBrakeForce(BRAKE_FORCE);
        } else {
            // Moving backwards - reverse the engine force
            backWheel.setBrakeForce(0);
            backWheel.engineForce = REVERSE_ENGINE_FORCE;
        }
    }
}

function updateVehicleControls() {
    if (!raceFinished) {
        updateSteering();
        updateEngineForce();
        updateBraking();
    }
}

function moveViewToCar() {
    // Center the view on the car
    translate(CANVAS_WIDTH / (2 * SCALE_FACTOR) - chassisBody.position[0],
        CANVAS_HEIGHT / (2 * SCALE_FACTOR) - chassisBody.position[1]);
}

function drawCar() {
    // Draw chassis
    push();
    translate(chassisBody.position[0], chassisBody.position[1]);
    rotate(chassisBody.angle + PI); // Add PI (180 degrees) to rotate the image
    imageMode(CENTER);
    image(CAR_BODY_IMAGE, 0, 0, boxShape.width, boxShape.height);

    // Draw front wheels
    for (let side = -1; side <= 1; side += 2) {
        push();
        translate(side * WHEEL_OFFSET_X, WHEEL_OFFSET_Y);
        rotate(frontWheel.steerValue);
        image(CAR_WHEEL_IMAGE, 0, 0, WHEEL_WIDTH, WHEEL_HEIGHT);
        pop();
    }
    pop();
}

function drawCarMetrics() {
    const textSizeValue = 1.2; // Base text size

    push();
    fill(255);
    noStroke();

    // Position text relative to camera view
    const screenX = chassisBody.position[0] - PHYSICS_WIDTH / 2 + textSizeValue;
    const screenY = chassisBody.position[1] - PHYSICS_HEIGHT / 2 + textSizeValue;

    if (raceFinished) {
        // Draw large centered finish text
        textSize(textSizeValue * 3); // Larger text for finish message
        textAlign(CENTER, CENTER);

        // Calculate center of screen relative to car
        const centerX = chassisBody.position[0];
        const centerY = chassisBody.position[1];

        // Draw finish message and time
        text("FINISH!", centerX, centerY - textSizeValue * 2);
        text(raceTime.toFixed(2) + "s", centerX, centerY + textSizeValue * 2);

        // Draw checkpoint times in columns
        textSize(textSizeValue);

        // Calculate number of columns based on total checkpoints
        const columnsCount = Math.min(4, Math.ceil(Math.sqrt(checkpointTimes.length)));
        const rowsCount = Math.ceil(checkpointTimes.length / columnsCount);
        const columnWidth = textSizeValue * 8; // Width between columns
        const rowHeight = textSizeValue * 1.5; // Height between rows

        checkpointTimes.forEach((time, index) => {
            const column = index % columnsCount;
            const row = Math.floor(index / columnsCount);

            const x = centerX + (column - (columnsCount - 1) / 2) * columnWidth;
            const y = centerY + textSizeValue * 6 + row * rowHeight;

            text(`CP${index + 1}: ${time.toFixed(2)}s`, x, y);
        });
    } else {
        // Regular race display
        textSize(textSizeValue);
        textAlign(LEFT, TOP);

        // Update and display race time
        if (startTime !== null && !raceFinished) {
            raceTime = (Date.now() - startTime) / 1000;
        }
        const timeText = `Time: ${raceTime.toFixed(2)}s`;
        const timerLeftPosition = screenX + PHYSICS_WIDTH - (textWidth(timeText) + 2);
        text(timeText, timerLeftPosition, screenY);

        // Display checkpoint times in columns on the right
        const columnsCount = Math.min(3, Math.ceil(Math.sqrt(checkpointTimes.length)));
        const rowsCount = Math.ceil(checkpointTimes.length / columnsCount);
        const columnWidth = textSizeValue * 8;

        checkpointTimes.forEach((time, index) => {
            const column = index % columnsCount;
            const row = Math.floor(index / columnsCount);

            const x = screenX + PHYSICS_WIDTH - (columnsCount - column) * columnWidth;
            const y = screenY + textSizeValue * (1.5 + row);

            text(`CP${index + 1}: ${time.toFixed(2)}s`, x, y);
        });

        // Display car metrics
        const carSpeed = Math.sqrt(Math.pow(chassisBody.velocity[0], 2) + Math.pow(chassisBody.velocity[1], 2)).toFixed(2);
        text(`Speed: ${carSpeed} m/s`, screenX, screenY + textSizeValue * 1.5);

        // Display checkpoint progress
        const progressText = `Checkpoints: ${hitCheckpoints.size}/${totalCheckpoints}`;
        text(progressText, screenX, screenY + textSizeValue * 3);

    }

    pop();
}
