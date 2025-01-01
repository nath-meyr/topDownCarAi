class Car {
    // Asset paths
    static CAR_BODY_IMAGE_PATH = 'assets/f1_no_f_wheels.png';
    static CAR_WHEEL_IMAGE_PATH = 'assets/f1_wheel.png';

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

    static RAY_LENGTH = 20;
    static RAY_COUNT = 5;
    static RAY_SPREAD = Math.PI;
    static RAY_DEVIATION = 0;
    static RAY_COLOR = [255, 165, 0, 128];

    static SCORE_DISPLAY_TIME = 5000;

    constructor(gameWorld, debug = false) {
        this.gameWorld = gameWorld;
        this.world = gameWorld.getPhysicsWorld();
        this.debug = debug;
        this.carBodyImage = null;
        this.carWheelImage = null;

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

        // Key controls
        this.keys = {
            '37': 0, // left
            '39': 0, // right
            '38': 0, // up
            '40': 0  // down
        };

        // Add rays array to store raycast results
        this.rays = Array(Car.RAY_COUNT).fill().map(() => ({
            start: [0, 0],
            end: [0, 0],
            fraction: 1
        }));

        this.scoreManager = new ScoreManager();
        this.scorePosition = null;
        this.scoreDisplayStartTime = null;

        this.display = new Display();
        this.display.positionElements();

        this.setupPhysics();
        this.setupEventListeners();
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

    setupEventListeners() {
        document.addEventListener("keydown", (evt) => this.handleKeyDown(evt));
        document.addEventListener("keyup", (evt) => this.handleKeyUp(evt));
    }

    handleKeyDown(evt) {
        if (this.startTime === null) {
            this.startTime = Date.now();
        }
        this.keys[evt.keyCode] = 1;
        this.updateVehicleControls();
    }

    handleKeyUp(evt) {
        this.keys[evt.keyCode] = 0;
        this.updateVehicleControls();
    }

    updateSteering() {
        this.frontWheel.steerValue = Car.MAX_STEER * (this.keys[39] - this.keys[37]);
    }

    updateEngineForce() {
        this.backWheel.engineForce = this.keys[38] * Car.FORWARD_ENGINE_FORCE;
    }

    updateBraking() {
        this.backWheel.setBrakeForce(0);
        if (this.keys[40]) {
            if (this.backWheel.getSpeed() > 0.1) {
                this.backWheel.setBrakeForce(Car.BRAKE_FORCE);
            } else {
                this.backWheel.setBrakeForce(0);
                this.backWheel.engineForce = Car.REVERSE_ENGINE_FORCE;
            }
        }
    }

    updateVehicleControls() {
        if (!this.raceFinished) {
            this.updateSteering();
            this.updateEngineForce();
            this.updateBraking();
        }
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
        image(CAR_BODY_IMAGE, 0, 0, this.boxShape.width, this.boxShape.height);

        // Draw front wheels
        for (let side = -1; side <= 1; side += 2) {
            push();
            translate(side * Car.WHEEL_OFFSET_X, Car.WHEEL_OFFSET_Y);
            rotate(this.frontWheel.steerValue);
            image(CAR_WHEEL_IMAGE, 0, 0, Car.WHEEL_WIDTH, Car.WHEEL_HEIGHT);
            pop();
        }
        pop();
    }

    updateDisplay() {
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
        // Calculate the angle step for rays spread across 360 degrees
        const rayAngleStep = Car.RAY_SPREAD / (Car.RAY_COUNT - 1);

        for (let i = 0; i < Car.RAY_COUNT; i++) {
            // Calculate ray angle to spread evenly around the car
            // Start at 90 degrees (PI/2) and go counter-clockwise
            const rayAngle = Car.RAY_DEVIATION + i * rayAngleStep;
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
}
