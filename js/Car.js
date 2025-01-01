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
    static RAY_SPREAD = Math.PI / 2;
    static RAY_DEVIATION = -Math.PI / 4;
    static RAY_COLOR = [255, 165, 0, 128];

    static SCORE_DISPLAY_TIME = 5000;

    static AI_ENABLED = true;  // Pour activer/désactiver l'IA

    // Add constant for minimum speed to consider car "moving"
    static MIN_SPEED_FOR_TIMER = 0.1;

    // Add new static properties for number display
    static NUMBER_SIZE = 0.3;
    static NUMBER_COLOR = [255, 255, 255];
    static NUMBER_BACKGROUND = [0, 0, 0, 180];
    static NUMBER_PADDING = 0.1;

    // Add constant for chassis type
    static CHASSIS_TYPE = p2.Body.DYNAMIC;

    // Add constants for scoring
    static CHECKPOINT_WEIGHT = 1000;  // High weight for checkpoints
    static WALL_PENALTY = -500;       // Penalty per wall collision
    static DISTANCE_WEIGHT = -3;      // Small negative weight for distance

    constructor(gameWorld, debug = false) {
        this.gameWorld = gameWorld;
        this.world = gameWorld.getPhysicsWorld();
        this.debug = debug;
        this.carBodyImage = null;
        this.carWheelImage = null;

        // Timer variables
        this.startTime = null;
        this.finishTime = null;
        this.raceTime = 0;
        this.hasFinished = false;
        this.hasStartedMoving = false;  // Add flag to track if car has started moving
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

        this.brain = new NeuralNetwork();
        this.fitness = 0;

        this.frozen = false;  // Initialize frozen state

        this.setupPhysics();  // Create physics bodies
        this.setupEventListeners();

        // Add car index property
        this.carIndex = null;

        // Add next expected checkpoint
        this.nextCheckpointIndex = 0;

        // Add score property
        this.score = 0;
    }

    setupPhysics() {
        // Create chassis body
        this.chassisBody = new p2.Body({
            mass: Car.CHASSIS_MASS,
            position: [0, 0],
            angle: -90 * Math.PI / 180,
            type: Car.CHASSIS_TYPE  // Set initial type
        });

        this.boxShape = new p2.Box({
            width: Car.CHASSIS_WIDTH,
            height: Car.CHASSIS_HEIGHT,
            // Use AI_CAR collision group
            collisionGroup: Track.COLLISION_GROUP.AI_CAR,
            // Cars collide with walls, checkpoints, start, and finish - but not with other cars
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

                // Check if the other body has a shape
                if (!otherBody.shapes || !otherBody.shapes[0]) return;

                const otherShape = otherBody.shapes[0];
                const collisionGroup = otherShape.collisionGroup;

                if (collisionGroup === Track.COLLISION_GROUP.CHECKPOINT) {
                    this.handleCheckpointCollision(otherBody.checkpointIndex);
                } else if (collisionGroup === Track.COLLISION_GROUP.FINISH) {
                    this.handleFinishCollision();
                } else if (collisionGroup === Track.COLLISION_GROUP.WALL) {
                    this.handleWallCollision();
                }
            }
        });
    }

    handleCheckpointCollision(checkpointIndex) {
        // Only register checkpoint if it's the next expected one
        if (checkpointIndex === this.nextCheckpointIndex) {
            this.hitCheckpoints.add(checkpointIndex);
            this.checkpointTimes.push(this.raceTime);
            this.nextCheckpointIndex++;

            if (this.hitCheckpoints.size === this.totalCheckpoints) {
                this.allCheckpointsHit = true;
            }
        }
    }

    handleFinishCollision() {
        if (this.allCheckpointsHit && !this.hasFinished) {
            this.hasFinished = true;
            this.finishTime = this.raceTime;
            this.backWheel.engineForce = 0;
            this.frontWheel.steerValue = 0;

            this.scorePosition = this.scoreManager.addScore(this.finishTime, this.checkpointTimes);
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
        document.addEventListener("keydown", (evt) => {
            if (!Car.AI_ENABLED) {
                this.handleKeyDown(evt);
            }
        });
        document.addEventListener("keyup", (evt) => {
            if (!Car.AI_ENABLED) {
                this.handleKeyUp(evt);
            }
        });
    }

    handleKeyDown(evt) {
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
        if (this.raceFinished || this.frozen) {
            this.backWheel.engineForce = 0;
            this.frontWheel.steerValue = 0;
            return;
        }

        this.updateSteering();
        this.updateEngineForce();
        this.updateBraking();
    }

    moveViewToCar() {
        translate(GameWorld.CANVAS_WIDTH / (2 * this.gameWorld.getScaleFactor()) - this.chassisBody.position[0],
            GameWorld.CANVAS_HEIGHT / (2 * this.gameWorld.getScaleFactor()) - this.chassisBody.position[1]);
    }

    draw() {
        this.updateRaceProgress();
        this.think();
        // Only update rays if car is visible
        if (this.debug) {
            this.updateRays();
            this.drawRays();  // Add ray rendering
        }
        this.updateScore();  // Update score each frame
    }

    setTotalCheckpoints(total) {
        this.totalCheckpoints = total;
    }

    updateRays() {
        // Only update rays if car is not frozen
        if (this.frozen) return;

        // Optimize raycast by reducing number of checks
        const rayAngleStep = Car.RAY_SPREAD / (Car.RAY_COUNT - 1);

        for (let i = 0; i < Car.RAY_COUNT; i++) {
            // Calculate ray angle to spread evenly in front of the car
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

    think() {
        if (!Car.AI_ENABLED || !this.gameWorld.isRaceStarted() || this.frozen) return;

        // Cache calculations that are used multiple times
        const speed = Math.sqrt(
            Math.pow(this.chassisBody.velocity[0], 2) +
            Math.pow(this.chassisBody.velocity[1], 2)
        );

        // Prepare neural network inputs
        const inputs = [];

        // Normalize ray distances
        this.rays.forEach(ray => {
            inputs.push(ray.fraction);  // already between 0 and 1
        });

        // Add normalized speed (assuming max speed of 10 m/s)
        inputs.push(speed / 10);

        // Add normalized steering angle
        inputs.push(this.frontWheel.steerValue / Car.MAX_STEER);

        // Get next checkpoint information from track using getter
        const nextCheckpoint = this.gameWorld.getTrack().getNextCheckpoint(
            this.chassisBody.position,
            this.hitCheckpoints
        );

        if (nextCheckpoint) {
            // Calculate angle to next checkpoint
            const dx = nextCheckpoint.position.x - this.chassisBody.position[0];
            const dy = nextCheckpoint.position.y - this.chassisBody.position[1];
            const angleToCheckpoint = Math.atan2(dy, dx) - this.chassisBody.angle;
            inputs.push(angleToCheckpoint / Math.PI); // Normalize between -1 and 1

            // Normalized distance to checkpoint
            const distanceToCheckpoint = Math.sqrt(dx * dx + dy * dy);
            inputs.push(Math.min(distanceToCheckpoint / 20, 1)); // Max 20 units
        } else {
            inputs.push(0); // No next checkpoint
            inputs.push(1); // Max distance
        }

        // Get predictions from neural network
        const outputs = this.brain.predict(inputs);

        // Apply actions
        this.keys['38'] = outputs[0] > 0.5 ? 1 : 0; // Forward
        this.keys['40'] = outputs[1] > 0.5 ? 1 : 0; // Backward
        this.keys['37'] = outputs[2] > 0.5 ? 1 : 0; // Left
        this.keys['39'] = outputs[3] > 0.5 ? 1 : 0; // Right

        this.updateVehicleControls();
    }

    calculateFitness() {
        // Base score from checkpoints reached
        this.fitness = this.hitCheckpoints.size * 100;

        // Penalty for wall collisions
        this.fitness -= this.wallCollisions * 10;

        // Bonus for average speed
        if (this.raceTime > 0) {
            this.fitness += (this.hitCheckpoints.size / this.raceTime) * 50;
        }

        return this.fitness;
    }

    // Add method to set initial position
    setPosition(x, y, angle = -90) {
        this.chassisBody.position = [x, y];
        this.chassisBody.angle = angle * Math.PI / 180;
    }

    // Add method to check if car is moving
    isMoving() {
        const speed = Math.sqrt(
            Math.pow(this.chassisBody.velocity[0], 2) +
            Math.pow(this.chassisBody.velocity[1], 2)
        );
        return speed > Car.MIN_SPEED_FOR_TIMER;
    }

    // Add method to update timer
    updateRaceProgress() {
        if (this.gameWorld.isRaceStarted() && !this.hasFinished) {
            this.raceTime = this.gameWorld.getRaceTime();
        }
    }

    // Add setter for car index
    setCarIndex(index) {
        this.carIndex = index;
    }

    freeze() {
        // Set velocity and angular velocity to 0
        this.chassisBody.velocity = [0, 0];
        this.chassisBody.angularVelocity = 0;

        // Disable physics updates
        this.chassisBody.type = p2.Body.STATIC;

        // Reset controls
        this.backWheel.engineForce = 0;
        this.frontWheel.steerValue = 0;

        // Set frozen state
        this.frozen = true;
    }

    unfreeze() {
        // Re-enable physics updates
        this.chassisBody.type = Car.CHASSIS_TYPE;
        this.frozen = false;
    }

    removeFromWorld() {
        // Remove vehicle from world
        this.vehicle.removeFromWorld();

        // Remove chassis body from world
        this.world.removeBody(this.chassisBody);
    }

    // Add method to reset checkpoint progress
    resetCheckpoints() {
        this.hitCheckpoints.clear();
        this.checkpointTimes = [];
        this.nextCheckpointIndex = 0;
        this.allCheckpointsHit = false;
    }

    // Add new method for physics updates
    updatePhysics(deltaTime) {
        // Update vehicle physics
        this.vehicle.update();

        // Update chassis physics if needed
        if (!this.frozen) {
            this.chassisBody.wakeUp();
        }
    }

    // Add method to calculate and update score
    updateScore() {
        // Get next checkpoint
        const nextCheckpoint = this.gameWorld.getTrack().getNextCheckpoint(
            this.chassisBody.position,
            this.hitCheckpoints
        );

        let distanceToNext = Infinity;
        if (nextCheckpoint) {
            const dx = nextCheckpoint.position.x - this.chassisBody.position[0];
            const dy = nextCheckpoint.position.y - this.chassisBody.position[1];
            distanceToNext = Math.sqrt(dx * dx + dy * dy);
        }

        // Calculate weighted score
        const checkpointScore = this.hitCheckpoints.size * Car.CHECKPOINT_WEIGHT;
        const wallPenalty = this.wallCollisions * Car.WALL_PENALTY;
        const distanceScore = distanceToNext * Car.DISTANCE_WEIGHT;

        // Update score
        this.score = checkpointScore + wallPenalty + distanceScore;
        return this.score;
    }

    // Add new method to draw rays
    drawRays() {
        if (!this.debug) return;

        push();
        stroke(...Car.RAY_COLOR);
        strokeWeight(0.1);

        for (let i = 0; i < Car.RAY_COUNT; i++) {
            const ray = this.rays[i];
            // Swap x and y coordinates for drawing
            const endX = ray.start[1] + (ray.end[1] - ray.start[1]) * ray.fraction;
            const endY = ray.start[0] + (ray.end[0] - ray.start[0]) * ray.fraction;

            // Draw the ray with swapped coordinates
            line(ray.start[1], ray.start[0], endX, endY);

            // Draw collision point with swapped coordinates
            if (ray.fraction < 1) {
                fill(255, 0, 0);
                noStroke();
                circle(endX, endY, 0.3);
            }
        }
        pop();
    }
}
