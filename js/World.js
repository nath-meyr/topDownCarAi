class GameWorld {
    // Constants
    static CARS_COUNT = 20;  // Number of cars to generate
    static NEW_BRAIN_PERCENTAGE = 0.1;  // Percentage of cars to generate with new brains
    static CANVAS_HEIGHT = window.innerHeight;
    static CANVAS_WIDTH = window.innerWidth;
    static MIN_SCALE_FACTOR = 25;
    static MAX_SCALE_FACTOR = 35;
    static SCALE_SPEED_FACTOR = 0.5; // How much speed affects zoom (lower = more dramatic)
    static BASE_SCALE_FACTOR = 10;
    static SCALE_TRANSITION_SPEED = 0.03;
    static WALL_THICKNESS = 0.3;
    static WALL_MULTIPLIER = 25;
    static COUNTDOWN_DURATION = 3; // 3 seconds countdown
    static RACE_STATE = {
        WAITING: 'waiting',
        COUNTDOWN: 'countdown',
        RACING: 'racing',
        FINISHED: 'finished'
    };

    static WALL_OPTIONS = {
        isStatic: true,
        collisionResponse: true
    };

    // Add new constants
    static GENERATION_DURATION = 30; // 30 seconds
    static SELECTION_TIME = 5; // 5 seconds to make selection

    // Add constant for number of visible cars
    static VISIBLE_CARS_COUNT = 20;
    static PHYSICS_UPDATE_RATE = 10; // Update physics every N frames for non-visible cars

    // Add auto-selection constant and property
    static AUTO_SELECT_BEST = true;  // Default auto-selection state
    static AUTO_SELECT_DELAY = 2000; // 2 seconds delay before auto-selection

    constructor() {
        // Initialize properties
        this.grassImage = null;
        this.scaleFactor = 100;
        this.world = new p2.World({
            gravity: [0, 0]
        });
        this.track = null;
        this.focusedCarIndex = 0; // Add property to track which car is being followed
        this.cars = []; // Add array to store cars

        // Calculate dimensions
        this.physicsHeight = GameWorld.CANVAS_HEIGHT / this.scaleFactor;
        this.physicsWidth = GameWorld.CANVAS_WIDTH / this.scaleFactor;

        this.outsideWalls = {
            width: GameWorld.WALL_MULTIPLIER * this.physicsWidth,
            height: GameWorld.WALL_MULTIPLIER * this.physicsHeight
        };

        // Add race control properties
        this.raceState = GameWorld.RACE_STATE.WAITING;
        this.raceStartTime = null;
        this.countdownStartTime = null;
        this.raceTime = 0;

        // Add generation tracking
        this.generation = 1;
        this.generationStartTime = null;
        this.selectionMode = false;
        this.selectedCarIndex = null;

        this.frameCount = 0;

        this.autoSelectEnabled = GameWorld.AUTO_SELECT_BEST;
        this.autoSelectTimeout = null;
    }

    loadAssets() {
        this.grassImage = loadImage('assets/grass_1.avif');
    }

    drawGrass() {
        // Draw repeating grass background
        const grassSize = 10; // Size of grass tile in pixels
        const numTilesX = Math.ceil(this.outsideWalls.width / grassSize);
        const numTilesY = Math.ceil(this.outsideWalls.height / grassSize);
        const startX = -numTilesX * grassSize / 2;
        const startY = -numTilesY * grassSize / 2;

        for (let x = startX; x < startX + numTilesX * grassSize; x += grassSize) {
            for (let y = startY; y < startY + numTilesY * grassSize; y += grassSize) {
                push();
                translate(x + grassSize / 2, y + grassSize / 2);
                // Fixed 90 degree rotation
                rotate(90 * PI / 180);
                image(this.grassImage, -grassSize / 2, -grassSize / 2, grassSize, grassSize);
                pop();
            }
        }
    }

    drawPointGrid() {
        // Draw grid points with alternating shades of gray
        strokeWeight(0.5);
        for (let x = -100; x < 100; x += 5) {
            for (let y = -100; y < 100; y += 5) {
                // Change color every 10 points using modulo
                let shade = ((Math.abs(Math.floor(x / 10)) + Math.abs(Math.floor(y / 10))) % 3) * 100;
                stroke(shade);
                fill(shade);
                point(x, y);
            }
        }
    }

    updateScaleFactor(carSpeed, isRaceFinished) {
        let targetScale;

        if (isRaceFinished) {
            // When race is finished, return to base scale
            targetScale = GameWorld.BASE_SCALE_FACTOR;
        } else {
            // Normal racing zoom based on speed
            targetScale = GameWorld.MAX_SCALE_FACTOR - (carSpeed * GameWorld.SCALE_SPEED_FACTOR);
            targetScale = Math.max(GameWorld.MIN_SCALE_FACTOR, Math.min(GameWorld.MAX_SCALE_FACTOR, targetScale));
        }

        // Smooth transition to target scale
        this.scaleFactor = this.scaleFactor + (targetScale - this.scaleFactor) * GameWorld.SCALE_TRANSITION_SPEED;
    }

    getScaleFactor() {
        return this.scaleFactor;
    }

    step() {
        this.frameCount++;
        const bestCars = this.getBestCars(GameWorld.VISIBLE_CARS_COUNT);

        // Update physics for all cars, but at different rates
        this.cars.forEach(car => {
            if (bestCars.includes(car) || car === this.cars[this.focusedCarIndex]) {
                // Best cars and focused car get full physics updates
                car.updatePhysics(1 / 60);
            } else if (this.frameCount % GameWorld.PHYSICS_UPDATE_RATE === 0) {
                // Other cars get reduced physics updates
                car.updatePhysics(GameWorld.PHYSICS_UPDATE_RATE / 60);
            }
        });

        // Step the world physics
        this.world.step(1 / 60);
    }

    getPhysicsWorld() {
        return this.world;
    }

    setTrack(track) {
        this.track = track;
    }

    getTrack() {
        return this.track;
    }

    // Add method to cycle through cars for camera focus
    cycleFocusedCar() {
        this.focusedCarIndex = (this.focusedCarIndex + 1) % this.cars.length;
    }

    getFocusedCarIndex() {
        return this.focusedCarIndex;
    }

    // Add method to store cars
    setCars(cars) {
        this.cars = cars;
    }

    // Add method to get cars
    getCars() {
        return this.cars;
    }

    // Add race control methods
    startRaceCountdown() {
        if (this.raceState === GameWorld.RACE_STATE.WAITING) {
            this.raceState = GameWorld.RACE_STATE.COUNTDOWN;
            this.countdownStartTime = Date.now();
            this.generationStartTime = Date.now(); // Start generation timer
        }
    }

    updateRaceState() {
        if (this.raceState === GameWorld.RACE_STATE.COUNTDOWN) {
            const elapsed = (Date.now() - this.countdownStartTime) / 1000;
            if (elapsed >= GameWorld.COUNTDOWN_DURATION) {
                this.raceState = GameWorld.RACE_STATE.RACING;
                this.raceStartTime = Date.now();
            }
        }

        if (this.raceState === GameWorld.RACE_STATE.RACING) {
            this.raceTime = (Date.now() - this.raceStartTime) / 1000;
        }

        // Check for generation time limit
        if (this.raceState === GameWorld.RACE_STATE.RACING && !this.selectionMode) {
            const generationElapsed = Date.now() - this.generationStartTime;
            if (generationElapsed >= GameWorld.GENERATION_DURATION * 1000) {
                this.selectionMode = true;
                this.selectedCarIndex = this.focusedCarIndex;
                // Freeze all cars
                this.cars.forEach(car => car.freeze());

                // Set up auto-selection if enabled
                if (this.autoSelectEnabled) {
                    this.focusOnBestCar();  // Focus on best car immediately
                    this.selectedCarIndex = this.focusedCarIndex;
                    this.autoSelectTimeout = setTimeout(() => {
                        this.startNextGeneration();
                    }, GameWorld.AUTO_SELECT_DELAY);
                }
            }
        }
    }

    isRaceStarted() {
        return this.raceState === GameWorld.RACE_STATE.RACING;
    }

    getRaceTime() {
        return this.raceTime;
    }

    getCountdownTime() {
        if (this.raceState !== GameWorld.RACE_STATE.COUNTDOWN) return null;
        const remaining = GameWorld.COUNTDOWN_DURATION -
            (Date.now() - this.countdownStartTime) / 1000;
        return Math.ceil(remaining);
    }

    draw() {
        push();
        scale(this.getScaleFactor());

        // Use the focused car for camera following
        const focusedCar = this.cars[this.getFocusedCarIndex()];
        this.moveViewToCar(focusedCar);

        // Draw world elements
        this.drawGrass();
        this.track.draw();

        // Draw all cars
        this.cars.forEach(car => this.drawCar(car));

        // Draw UI elements for focused car
        this.drawUI(focusedCar);

        pop();
    }

    moveViewToCar(car) {
        translate(
            GameWorld.CANVAS_WIDTH / (2 * this.getScaleFactor()) - car.chassisBody.position[0],
            GameWorld.CANVAS_HEIGHT / (2 * this.getScaleFactor()) - car.chassisBody.position[1]
        );
    }

    drawCar(car) {
        // Only draw the car if it's one of the best performers or the focused car
        const bestCars = this.getBestCars(GameWorld.VISIBLE_CARS_COUNT);
        if (!bestCars.includes(car) && car !== this.cars[this.focusedCarIndex]) {
            return;
        }

        // Draw car body and wheels
        push();
        translate(car.chassisBody.position[0], car.chassisBody.position[1]);
        rotate(car.chassisBody.angle + PI);
        imageMode(CENTER);
        image(CAR_BODY_IMAGE, 0, 0, car.boxShape.width, car.boxShape.height);

        // Draw front wheels
        for (let side = -1; side <= 1; side += 2) {
            push();
            translate(side * Car.WHEEL_OFFSET_X, Car.WHEEL_OFFSET_Y);
            rotate(car.frontWheel.steerValue);
            image(CAR_WHEEL_IMAGE, 0, 0, Car.WHEEL_WIDTH, Car.WHEEL_HEIGHT);
            pop();
        }

        // Draw car number
        if (car.carIndex !== null) {
            push();
            rotate(-car.chassisBody.angle - PI);
            textAlign(CENTER, CENTER);
            textSize(Car.NUMBER_SIZE);

            noStroke();
            fill(...Car.NUMBER_BACKGROUND);
            const diameter = Car.NUMBER_SIZE + Car.NUMBER_PADDING * 2;
            circle(0, 0, diameter);

            fill(...Car.NUMBER_COLOR);
            text(car.carIndex + 1, 0, 0);
            pop();
        }

        // Draw debug rays if needed
        if (car.debug && car === this.cars[this.focusedCarIndex]) {
            this.drawRays(car);
        }

        pop();
    }

    drawRays(car) {
        push();
        stroke(...Car.RAY_COLOR);
        strokeWeight(2 / this.getScaleFactor());

        car.rays.forEach((ray, index) => {
            const hitX = ray.start[0] + (ray.end[0] - ray.start[0]) * ray.fraction;
            const hitY = ray.start[1] + (ray.end[1] - ray.start[1]) * ray.fraction;

            line(ray.start[0], ray.start[1], hitX, hitY);

            const distance = Math.min(Car.RAY_LENGTH * ray.fraction, Car.RAY_LENGTH);
            const distanceTextX = (ray.start[0] + hitX) / 2;
            const distanceTextY = (ray.start[1] + hitY) / 2;

            const rayDirection = [hitX - ray.start[0], hitY - ray.start[1]];
            const rayLength = Math.sqrt(rayDirection[0] * rayDirection[0] + rayDirection[1] * rayDirection[1]);
            const normalizedDirection = [rayDirection[0] / rayLength, rayDirection[1] / rayLength];
            const rayNumberX = ray.start[0] + normalizedDirection[0] * 1;
            const rayNumberY = ray.start[1] + normalizedDirection[1] * 1;

            push();
            noStroke();
            fill(255, 255, 0);
            textAlign(CENTER, CENTER);
            textSize(0.3);
            text(index, rayNumberX, rayNumberY);

            fill(255);
            text(distance.toFixed(1), distanceTextX, distanceTextY);
            pop();
        });
        pop();
    }

    drawUI(focusedCar) {
        const baseTextSize = 0.8 * (30 / this.getScaleFactor());
        const padding = 1 * (30 / this.getScaleFactor());

        push();
        fill(255);
        noStroke();
        textAlign(LEFT, TOP);
        textSize(baseTextSize);

        const viewWidth = GameWorld.CANVAS_WIDTH / this.getScaleFactor();
        const viewHeight = GameWorld.CANVAS_HEIGHT / this.getScaleFactor();
        const screenLeft = focusedCar.chassisBody.position[0] - viewWidth / 2;
        const screenTop = focusedCar.chassisBody.position[1] - viewHeight / 2;
        const screenRight = screenLeft + viewWidth;

        // Draw appropriate UI based on race state
        if (this.selectionMode) {
            this.drawSelectionUI(screenLeft, screenTop, viewWidth, viewHeight, baseTextSize);
        } else if (this.raceState === GameWorld.RACE_STATE.WAITING) {
            this.drawWaitingUI(screenLeft, screenTop, viewWidth, viewHeight, baseTextSize);
        } else if (this.raceState === GameWorld.RACE_STATE.COUNTDOWN) {
            this.drawCountdownUI(screenLeft, screenTop, viewWidth, viewHeight, baseTextSize);
        } else if (focusedCar.hasFinished) {
            this.drawFinishUI(focusedCar, baseTextSize);
        } else if (this.raceState === GameWorld.RACE_STATE.RACING) {
            this.drawRacingUI(focusedCar, screenLeft, screenTop, screenRight, baseTextSize, padding);
        }

        // Draw generation counter
        this.drawGenerationCounter(screenLeft, screenTop, viewHeight, baseTextSize, padding);

        pop();
    }

    // Split UI drawing into separate methods for each state
    drawWaitingUI(screenLeft, screenTop, viewWidth, viewHeight, baseTextSize) {
        textAlign(CENTER, CENTER);
        textSize(baseTextSize * 2);
        text("Press ENTER to start!", screenLeft + viewWidth / 2, screenTop + viewHeight / 2);
    }

    drawCountdownUI(screenLeft, screenTop, viewWidth, viewHeight, baseTextSize) {
        textAlign(CENTER, CENTER);
        textSize(baseTextSize * 3);
        text(this.getCountdownTime(), screenLeft + viewWidth / 2, screenTop + viewHeight / 2);
    }

    drawFinishUI(car, baseTextSize) {
        // Center position for finish message
        const centerX = car.chassisBody.position[0];
        const centerY = car.chassisBody.position[1];

        textAlign(CENTER, CENTER);
        textSize(baseTextSize * 2);
        text("FINISH!", centerX, centerY - baseTextSize * 2);
        text(car.finishTime.toFixed(2) + "s", centerX, centerY);

        // Show position and best time
        const bestScore = car.scoreManager.getBestScore();
        textSize(baseTextSize * 1.5);
        text(`Position: ${car.scorePosition}`, centerX, centerY + baseTextSize * 2);
        text(`Wall Hits: ${car.wallCollisions}`, centerX, centerY + baseTextSize * 3);

        if (bestScore) {
            text(`Best: ${ScoreManager.formatTime(bestScore.totalTime)}`,
                centerX, centerY + baseTextSize * 4);
        }

        // Draw checkpoint times in a grid
        textSize(baseTextSize);
        const columnWidth = 6 * (30 / this.getScaleFactor());
        const rowHeight = baseTextSize * 1.5;
        const columnsCount = Math.min(4, Math.ceil(Math.sqrt(car.checkpointTimes.length)));

        car.checkpointTimes.forEach((time, index) => {
            const column = index % columnsCount;
            const row = Math.floor(index / columnsCount);
            const x = centerX + (column - (columnsCount - 1) / 2) * columnWidth;
            const y = centerY + baseTextSize * 6 + row * rowHeight;
            text(`CP${index + 1}: ${ScoreManager.formatTime(time)}`, x, y);
        });
    }

    drawRacingUI(car, screenLeft, screenTop, screenRight, baseTextSize, padding) {
        const rowHeight = baseTextSize * 1.4;

        // Right-aligned time display
        textAlign(RIGHT, TOP);
        const timeText = `Time: ${this.getRaceTime().toFixed(2)}s`;
        const timeTextX = screenRight - padding;
        const timeTextY = screenTop + padding;
        text(timeText, timeTextX, timeTextY);

        // Add generation timer display
        const generationTimeLeft = Math.max(0, GameWorld.GENERATION_DURATION -
            (Date.now() - this.generationStartTime) / 1000);
        const timerText = `Next gen in: ${generationTimeLeft.toFixed(1)}s (or press S)`;
        text(timerText, timeTextX, timeTextY + rowHeight);

        // Left-aligned displays
        textAlign(LEFT, TOP);

        // Speed display
        const carSpeed = Math.sqrt(
            Math.pow(car.chassisBody.velocity[0], 2) +
            Math.pow(car.chassisBody.velocity[1], 2)
        ).toFixed(2);
        const speedX = screenLeft + padding;
        const speedY = screenTop + padding;
        text(`Speed: ${carSpeed} m/s`, speedX, speedY);

        // Checkpoint progress
        const progressText = `Checkpoints: ${car.hitCheckpoints.size}/${car.totalCheckpoints}`;
        const progressX = screenLeft + padding;
        const progressY = screenTop + rowHeight + padding;
        text(progressText, progressX, progressY);

        // Wall collisions display
        const wallText = `Wall Hits: ${car.wallCollisions}`;
        const wallX = screenLeft + padding;
        const wallY = screenTop + 2 * rowHeight + padding;
        text(wallText, wallX, wallY);

        // Add score display
        const scoreText = `Score: ${Math.round(car.score)}`;
        const scoreX = screenLeft + padding;
        const scoreY = screenTop + 3 * rowHeight + padding;
        text(scoreText, scoreX, scoreY);

        // Car number display (moved down one row)
        const carNumberText = `Car: ${car.carIndex + 1}`;
        const carNumberX = screenLeft + padding;
        const carNumberY = screenTop + 4 * rowHeight + padding;
        text(carNumberText, carNumberX, carNumberY);

        // Add auto-select status
        const autoSelectText = `Auto-select: ${this.autoSelectEnabled ? 'ON' : 'OFF'} (A to toggle)`;
        const autoSelectX = screenLeft + padding;
        const autoSelectY = screenTop + 5 * rowHeight + padding;
        text(autoSelectText, autoSelectX, autoSelectY);
    }

    drawSelectionUI(screenLeft, screenTop, viewWidth, viewHeight, baseTextSize) {
        const selectedCar = this.cars[this.selectedCarIndex];

        textAlign(CENTER, CENTER);
        textSize(baseTextSize * 2);
        text("Select car to breed next generation", screenLeft + viewWidth / 2, screenTop + viewHeight / 2);

        // Display car stats
        textSize(baseTextSize * 1.5);
        const statsY = screenTop + viewHeight / 2 + baseTextSize * 3;
        text(`Car ${selectedCar.carIndex + 1} Stats:`, screenLeft + viewWidth / 2, statsY);
        text(`Checkpoints: ${selectedCar.hitCheckpoints.size}`, screenLeft + viewWidth / 2, statsY + baseTextSize * 2);
        text(`Wall Hits: ${selectedCar.wallCollisions}`, screenLeft + viewWidth / 2, statsY + baseTextSize * 3.5);
        text(`Score: ${Math.round(selectedCar.score)}`, screenLeft + viewWidth / 2, statsY + baseTextSize * 5);

        // Instructions
        text("Press SPACE to cycle cars", screenLeft + viewWidth / 2, statsY + baseTextSize * 7);
        text("Press ENTER to select", screenLeft + viewWidth / 2, statsY + baseTextSize * 8.5);
    }

    drawGenerationCounter(screenLeft, screenTop, viewHeight, baseTextSize, padding) {
        textAlign(LEFT, BOTTOM);
        textSize(baseTextSize * 1.5);
        text(`Generation: ${this.generation}`, screenLeft + padding, screenTop + viewHeight - padding);
    }

    startNextGeneration() {
        if (!this.selectionMode) return;

        const selectedCar = this.cars[this.selectedCarIndex];
        const selectedBrain = selectedCar.brain.copy();

        // Remove all old cars from physics world
        this.cars.forEach(car => car.removeFromWorld());

        // Clear cars array
        this.cars = [];

        // Create new cars based on selected car's brain
        for (let i = 0; i < GameWorld.CARS_COUNT; i++) {
            const car = new Car(this, DEBUG);
            car.setTotalCheckpoints(this.track.getTotalCheckpoints());
            car.setPosition(0, 0);
            car.setCarIndex(i);
            car.resetCheckpoints();  // Reset checkpoint progress

            if (i === this.selectedCarIndex) {
                // Keep selected car's brain unchanged
                car.brain = selectedBrain.copy();

            } else if (i >= GameWorld.CARS_COUNT * (1 - GameWorld.NEW_BRAIN_PERCENTAGE)) {
                // Generate random brain for last NEW_BRAIN_PERCENTAGE of cars
                car.brain = new NeuralNetwork();
            } else {
                // Mutate selected brain for remaining cars
                const newBrain = selectedBrain.copy();
                newBrain.mutate(0.1);
                car.brain = newBrain;
            }

            this.cars.push(car);
        }

        // Increment generation
        this.generation++;

        // Reset all race state and timers
        this.raceState = GameWorld.RACE_STATE.WAITING;  // Set to waiting instead of countdown
        this.countdownStartTime = null;
        this.raceStartTime = null;
        this.generationStartTime = null;
        this.raceTime = 0;
        this.selectionMode = false;

        // Start the countdown for the new generation
        this.startRaceCountdown();
    }

    // Add new method to manually enter selection mode
    enterSelectionMode() {
        if (this.raceState === GameWorld.RACE_STATE.RACING && !this.selectionMode) {
            this.selectionMode = true;
            this.selectedCarIndex = this.focusedCarIndex;
            // Freeze all cars
            this.cars.forEach(car => car.freeze());
        }
    }

    // Add new method to add a car
    addCar(car) {
        this.cars.push(car);
    }

    // Add method to get average car speed
    getAverageCarSpeed() {
        return this.cars.reduce((sum, car) => {
            const carSpeed = Math.sqrt(
                Math.pow(car.chassisBody.velocity[0], 2) +
                Math.pow(car.chassisBody.velocity[1], 2)
            );
            return sum + carSpeed;
        }, 0) / this.cars.length;
    }

    // Add method to check if any car has finished
    isAnyCarFinished() {
        return this.cars.some(car => car.raceFinished);
    }

    // Add method to update all cars
    updateCars() {
        const bestCars = this.getBestCars(GameWorld.VISIBLE_CARS_COUNT);

        this.cars.forEach(car => {
            if (bestCars.includes(car) || car === this.cars[this.focusedCarIndex]) {
                // Only update AI and rays for visible cars
                car.draw();
            } else {
                // Minimal update for non-visible cars
                car.updateRaceProgress();
                car.think();
            }
        });
    }
    // Add method to find best car
    findBestCar() {
        return this.cars.reduce((best, current) =>
            current.score > best.score ? current : best,
            this.cars[0]
        );
    }

    // Add method to get N best cars
    getBestCars(n) {
        return [...this.cars]
            .sort((a, b) => b.score - a.score)
            .slice(0, n);
    }

    // Add method to focus on best car
    focusOnBestCar() {
        const bestCar = this.findBestCar();
        this.focusedCarIndex = this.cars.indexOf(bestCar);
    }

    // Add method to toggle auto-selection
    toggleAutoSelect() {
        this.autoSelectEnabled = !this.autoSelectEnabled;
        if (this.autoSelectTimeout) {
            clearTimeout(this.autoSelectTimeout);
            this.autoSelectTimeout = null;
        }
    }
}