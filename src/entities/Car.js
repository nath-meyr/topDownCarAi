class Car {
    // Asset paths
    static CAR_BODY_TRANSPARENT_PATH = 'assets/images/f1_transparent.png';
    static CAR_BODY_GREEN_SCREEN_PATH = 'assets/images/f1_green_screen.png';
    static CAR_WHEEL_IMAGE_PATH = 'assets/images/f1_wheel.png';

    // Vehicle constants
    static CHASSIS_MASS = 1;
    static CHASSIS_WIDTH = 0.54;
    static CHASSIS_HEIGHT = 1.04;
    static FRONT_WHEEL_POSITION = [0, 0.5];
    static BACK_WHEEL_POSITION = [0, -0.5];
    static FRONT_WHEEL_FRICTION = 6;
    static BACK_WHEEL_FRICTION = 6;
    static FORWARD_ENGINE_FORCE = 7;
    static REVERSE_ENGINE_FORCE = -2;
    static BRAKE_FORCE = 5;
    static COLLISION_DAMPING = 0.5;

    // Wheel rendering constants
    static WHEEL_WIDTH = 0.14;
    static WHEEL_HEIGHT = 0.18;
    static WHEEL_OFFSET_X = 0.2;
    static WHEEL_OFFSET_Y = -0.20;

    static MAX_STEER = Math.PI / 4;

    static RAY_LENGTH = 30;
    static RAY_COUNT = 9;
    static RAY_SPREAD = 120;
    static RAY_DEVIATION = 30;
    static RAY_COLOR = [255, 165, 0, 128];

    static SCORE_DISPLAY_TIME = 5000;

    // Define available car colors
    static COLORS = {
        RED: { r: 255, g: 0, b: 0 },      // Pure red
        BLUE: { r: 0, g: 100, b: 255 },   // Pure blue
        GREEN: { r: 0, g: 255, b: 0 },    // Pure green
        ORANGE: { r: 255, g: 165, b: 0 }  // Pure orange
    };

    constructor(gameWorld, menu = null, brain = null, color = null, debug = false) {
        this.gameWorld = gameWorld;
        this.world = gameWorld.getPhysicsWorld();
        this.debug = debug;
        this.menu = menu;
        this.brain = brain;
        this.brain.setCar(this);

        // Set car color - if none provided, pick random from COLORS
        if (color) {
            this.carColor = color;
        } else {
            const colors = Object.values(Car.COLORS);
            this.carColor = colors[Math.floor(Math.random() * colors.length)];
        }

        // Load images
        this.loadImages();

        // Timer variables
        this.startTime = null;
        this.raceTime = 0;
        this.checkpointTimes = [];
        this.hitCheckpoints = new Set();
        this.totalCheckpoints = 0;
        this.allCheckpointsHit = false;
        this.raceFinished = false;

        // Wall collision counter
        this.wallCollisions = 0;

        // Add rays array to store raycast results
        this.rays = Array(Car.RAY_COUNT).fill().map(() => ({
            start: [0, 0],
            end: [0, 0],
            fraction: 1
        }));

        this.scoreManager = new ScoreManager();
        this.scorePosition = null;
        this.scoreDisplayStartTime = null;

        this.display = new Display(() => this.restartRace());
        this.display.positionElements();

        this.setupPhysics();

        this.isCountingDown = true;
        this.display.hideAllMetrics();
    }

    loadImages() {
        // Create a graphics buffer for the combined image
        this.carBodyImage = createGraphics(27, 52);

        // Load both car body images
        loadImage(Car.CAR_BODY_GREEN_SCREEN_PATH, baseImg => {
            baseImg.loadPixels();

            // Replace green screen with desired color
            for (let i = 0; i < baseImg.pixels.length; i += 4) {
                const r = baseImg.pixels[i];
                const g = baseImg.pixels[i + 1];
                const b = baseImg.pixels[i + 2];
                const a = baseImg.pixels[i + 3];

                // Check if pixel is green screen (adjust values as needed)
                if (g > 200 && r < 50 && b == 0) {
                    // Replace with car color
                    baseImg.pixels[i] = this.carColor.r;
                    baseImg.pixels[i + 1] = this.carColor.g;
                    baseImg.pixels[i + 2] = this.carColor.b;
                }
            }
            baseImg.updatePixels();

            // Load transparent overlay
            loadImage(Car.CAR_BODY_TRANSPARENT_PATH, overlayImg => {
                // Draw both images to the buffer
                this.carBodyImage.image(baseImg, 0, 0);
                this.carBodyImage.image(overlayImg, 0, 0);
            });
        });

        // Load wheel image
        this.carWheelImage = loadImage(Car.CAR_WHEEL_IMAGE_PATH);
    }

    // Helper method to check if a color matches within tolerance
    colorMatch(r, g, b, targetColor, tolerance) {
        return Math.abs(r - targetColor.r) < tolerance &&
            Math.abs(g - targetColor.g) < tolerance &&
            Math.abs(b - targetColor.b) < tolerance;
    }

    setupPhysics() {
        // Create chassis body
        this.chassisBody = new p2.Body({
            mass: Car.CHASSIS_MASS,
            position: [0, 0],
            angle: -90 * Math.PI / 180,
        });

        this.boxShape = new p2.Box({
            width: Car.CHASSIS_WIDTH,
            height: Car.CHASSIS_HEIGHT,
            collisionGroup: Track.COLLISION_GROUP.CAR,
            collisionMask: Track.COLLISION_GROUP.WALL |
                Track.COLLISION_GROUP.CHECKPOINT |
                Track.COLLISION_GROUP.START |
                Track.COLLISION_GROUP.FINISH
        });

        this.chassisBody.addShape(this.boxShape);
        this.world.addBody(this.chassisBody);

        // Create vehicle
        this.vehicle = new p2.TopDownVehicle(this.chassisBody);
        this.frontWheel = this.vehicle.addWheel({
            localPosition: Car.FRONT_WHEEL_POSITION,
            sideFriction: Car.FRONT_WHEEL_FRICTION,
        });

        this.backWheel = this.vehicle.addWheel({
            localPosition: Car.BACK_WHEEL_POSITION,
            sideFriction: Car.BACK_WHEEL_FRICTION,
        });

        this.vehicle.addToWorld(this.world);
        this.setupCollisionHandler();
    }

    setupCollisionHandler() {
        this.world.on('beginContact', (evt) => {
            if ((evt.bodyA === this.chassisBody || evt.bodyB === this.chassisBody)) {
                const otherBody = evt.bodyA === this.chassisBody ? evt.bodyB : evt.bodyA;
                const otherShape = otherBody.shapes[0];

                if (otherShape.collisionGroup === Track.COLLISION_GROUP.CHECKPOINT) {
                    this.handleCheckpointCollision(otherBody.checkpointIndex);
                } else if (otherShape.collisionGroup === Track.COLLISION_GROUP.FINISH) {
                    this.handleFinishCollision();
                } else if (otherShape.collisionGroup === Track.COLLISION_GROUP.WALL) {
                    this.handleWallCollision();
                }
            }
        });
    }

    handleCheckpointCollision(checkpointIndex) {
        if (!this.hitCheckpoints.has(checkpointIndex)) {
            this.hitCheckpoints.add(checkpointIndex);
            this.checkpointTimes.push(this.raceTime);

            if (this.hitCheckpoints.size === this.totalCheckpoints) {
                this.allCheckpointsHit = true;
            }
        }
    }

    handleFinishCollision() {
        if (this.allCheckpointsHit && !this.raceFinished) {
            this.raceFinished = true;
            this.backWheel.engineForce = 0;
            this.frontWheel.steerValue = 0;

            // Add score to score manager with track ID
            const trackId = this.gameWorld.track.getCurrentTrackId();
            this.scorePosition = this.scoreManager.addScore(trackId, this.raceTime, this.checkpointTimes);
            this.scoreDisplayStartTime = Date.now();

            // Update menu scores if menu exists
            if (this.menu) {
                this.menu.updateScores();
            }

            // Show finish overlay
            const bestScore = this.scoreManager.getBestScore(trackId);
            this.display.showFinish({
                time: this.raceTime,
                position: this.scorePosition,
                wallHits: this.wallCollisions,
                bestTime: bestScore ? bestScore.totalTime : null,
                checkpointTimes: this.checkpointTimes,
                trackName: this.gameWorld.track.getCurrentTrackName()
            });
        }
    }
    handleWallCollision() {
        const speed = Math.sqrt(
            this.chassisBody.velocity[0] * this.chassisBody.velocity[0] +
            this.chassisBody.velocity[1] * this.chassisBody.velocity[1]
        );

        if (speed > 0.1) {
            this.wallCollisions++; // Increment wall collision counter
            this.chassisBody.velocity[0] *= Car.COLLISION_DAMPING;
            this.chassisBody.velocity[1] *= Car.COLLISION_DAMPING;
            this.chassisBody.angularVelocity *= Car.COLLISION_DAMPING;
            this.backWheel.engineForce = 0;
        }
    }

    // Add input methods
    forward(value = 1) {
        if (this.isCountingDown || this.raceFinished) return;
        this.backWheel.engineForce = value * Car.FORWARD_ENGINE_FORCE;
    }

    backward(value = 1) {
        if (this.isCountingDown || this.raceFinished) return;
        if (this.backWheel.getSpeed() > 0.1) {
            this.backWheel.setBrakeForce(Car.BRAKE_FORCE * value);
        } else {
            this.backWheel.setBrakeForce(0);
            this.backWheel.engineForce = Car.REVERSE_ENGINE_FORCE * value;
        }
    }

    steerLeft(value = 1) {
        if (this.isCountingDown || this.raceFinished) return;
        this.frontWheel.steerValue = -Car.MAX_STEER * value;
    }

    steerRight(value = 1) {
        if (this.isCountingDown || this.raceFinished) return;
        this.frontWheel.steerValue = Car.MAX_STEER * value;
    }

    clearControls() {
        this.frontWheel.steerValue = 0;
        this.backWheel.engineForce = 0;
        this.backWheel.setBrakeForce(0);
    }

    updateVehicleControls() {
        if (this.isCountingDown || this.raceFinished) return;

        const controls = this.brain.getControls();

        // Clear previous controls
        this.clearControls();

        // Apply new controls
        if (controls.left > 0) this.steerLeft(controls.left);
        if (controls.right > 0) this.steerRight(controls.right);
        if (controls.up > 0) this.forward(controls.up);
        if (controls.down > 0) this.backward(controls.down);
    }

    update() {
        this.brain.update();
        this.brain.drive();
    }

    moveViewToCar() {
        translate(GameWorld.CANVAS_WIDTH / (2 * this.gameWorld.getScaleFactor()) - this.chassisBody.position[0],
            GameWorld.CANVAS_HEIGHT / (2 * this.gameWorld.getScaleFactor()) - this.chassisBody.position[1]);
    }

    draw() {
        this.updateRays();
        if (this.debug) {
            this.drawRays();
        }
        this.drawCar();
        this.updateDisplay();
    }

    drawCar() {
        push();
        translate(this.chassisBody.position[0], this.chassisBody.position[1]);
        rotate(this.chassisBody.angle + PI);
        imageMode(CENTER);
        image(this.carBodyImage, 0, 0, this.boxShape.width, this.boxShape.height);

        // Draw front wheels
        for (let side = -1; side <= 1; side += 2) {
            push();
            translate(side * Car.WHEEL_OFFSET_X, Car.WHEEL_OFFSET_Y);
            rotate(this.frontWheel.steerValue);
            image(this.carWheelImage, 0, 0, Car.WHEEL_WIDTH, Car.WHEEL_HEIGHT);
            pop();
        }
        pop();
    }

    updateDisplay() {
        if (this.isCountingDown) return;

        const speed = Math.sqrt(
            Math.pow(this.chassisBody.velocity[0], 2) +
            Math.pow(this.chassisBody.velocity[1], 2)
        );

        // Update race time
        if (this.startTime !== null && !this.raceFinished) {
            this.raceTime = (Date.now() - this.startTime) / 1000;
        }

        // Update display elements
        this.display.updateSpeed(speed);
        this.display.updateTime(this.raceTime);
        this.display.updateCheckpoints(this.hitCheckpoints.size, this.totalCheckpoints);
        this.display.updateWallHits(this.wallCollisions);

        if (this.raceFinished) {
            const trackId = this.gameWorld.track.getCurrentTrackId();
            const bestScore = this.scoreManager.getBestScore(trackId);
            this.display.showFinish({
                time: this.raceTime,
                position: this.scorePosition,
                wallHits: this.wallCollisions,
                bestTime: bestScore ? bestScore.totalTime : null,
                checkpointTimes: this.checkpointTimes,
                trackName: this.gameWorld.track.getCurrentTrackName() // Add track name to display
            });
        }
    }

    setTotalCheckpoints(total) {
        this.totalCheckpoints = total;
    }

    updateRays() {
        // Convert degrees to radians for calculations
        const raySpreadRad = radians(Car.RAY_SPREAD);
        const rayDeviationRad = radians(Car.RAY_DEVIATION);

        // Calculate the angle step for rays spread across the specified degrees
        const rayAngleStep = raySpreadRad / (Car.RAY_COUNT - 1);

        for (let i = 0; i < Car.RAY_COUNT; i++) {
            // Calculate ray angle to spread evenly
            const rayAngle = rayDeviationRad + i * rayAngleStep;
            const globalAngle = this.chassisBody.angle + rayAngle;

            // Calculate ray start point (car's position)
            const start = this.chassisBody.position;

            // Calculate ray end point
            const end = [
                start[0] + Math.cos(globalAngle) * Car.RAY_LENGTH,
                start[1] + Math.sin(globalAngle) * Car.RAY_LENGTH
            ];

            // Store ray start and end points
            this.rays[i].start = start;
            this.rays[i].end = end;

            // Perform raycast
            const result = new p2.RaycastResult();
            this.world.raycast(result, new p2.Ray({
                from: start,
                to: end,
                mode: p2.Ray.CLOSEST,
                collisionMask: Track.COLLISION_GROUP.WALL
            }));

            // Store the fraction of how far the ray got before hitting something
            this.rays[i].fraction = result.hasHit() ? result.fraction : 1;
        }
    }

    drawRays() {
        push();
        stroke(...Car.RAY_COLOR); // Semi-transparent orange color
        strokeWeight(2 / this.gameWorld.getScaleFactor()); // Use gameWorld's scale factor

        this.rays.forEach((ray, index) => {
            const hitX = ray.start[0] + (ray.end[0] - ray.start[0]) * ray.fraction;
            const hitY = ray.start[1] + (ray.end[1] - ray.start[1]) * ray.fraction;

            // Draw the ray line
            line(ray.start[0], ray.start[1], hitX, hitY);

            // Calculate actual distance, capped at RAY_LENGTH
            const distance = Math.min(Car.RAY_LENGTH * ray.fraction, Car.RAY_LENGTH);

            // Position for distance text (middle of the ray)
            const distanceTextX = (ray.start[0] + hitX) / 2;
            const distanceTextY = (ray.start[1] + hitY) / 2;

            // Calculate position for ray number (further out from start of ray)
            const rayDirection = [
                hitX - ray.start[0],
                hitY - ray.start[1]
            ];
            const rayLength = Math.sqrt(rayDirection[0] * rayDirection[0] + rayDirection[1] * rayDirection[1]);
            const normalizedDirection = [
                rayDirection[0] / rayLength,
                rayDirection[1] / rayLength
            ];
            const rayNumberX = ray.start[0] + normalizedDirection[0] * 1;
            const rayNumberY = ray.start[1] + normalizedDirection[1] * 1;

            // Draw ray number
            push();
            noStroke();
            fill(255, 255, 0); // Yellow color for ray number
            textAlign(CENTER, CENTER);
            textSize(0.3);
            text(index, rayNumberX, rayNumberY);

            // Draw distance value
            fill(255); // White color for distance
            text(distance.toFixed(1), distanceTextX, distanceTextY);
            pop();
        });
        pop();
    }

    startRace() {
        this.isCountingDown = false;
        this.startTime = Date.now();
        this.display.showAllMetrics();
    }

    restartRace() {
        // Reset car position and angle
        this.chassisBody.position = [0, 0];
        this.chassisBody.angle = -90 * Math.PI / 180;
        this.chassisBody.velocity = [0, 0];
        this.chassisBody.angularVelocity = 0;

        // Reset wheels
        this.frontWheel.steerValue = 0;
        this.backWheel.engineForce = 0;
        this.backWheel.setBrakeForce(0);

        // Reset race variables
        this.startTime = null;
        this.raceTime = 0;
        this.checkpointTimes = [];
        this.hitCheckpoints = new Set();
        this.allCheckpointsHit = false;
        this.raceFinished = false;
        this.wallCollisions = 0;

        // Reset countdown state
        this.isCountingDown = true;
        this.display.hideAllMetrics();

        // Start new countdown
        this.display.startCountdown(() => {
            this.startRace();
        });
    }
}
