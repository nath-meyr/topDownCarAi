class GeneticManager {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.generation = 1;
        this.populationSize = 10;
        this.cars = [];
        this.bestBrains = [];
        this.selectedCars = [];
        this.focusedCarIndex = 0;
        this.display = Display.getInstance();
        this.display.showAllMetrics();
        this.generationStartFrame = 0;
        this.raceStartFrame = null;
        this.currentFrame = 0;
        this.brainHistory = [];
        this.scores = [];

        // Try to load saved evolution data
        this.loadEvolution();
        if (this.brainHistory.length === 0) {
            this.initializePopulation();
        } else {
            this.restartFromHistory();
        }
    }

    saveEvolution() {
        const evolutionData = {
            generation: this.generation,
            brainHistory: this.brainHistory.map(entry => ({
                generation: entry.generation,
                brains: entry.brains.map(brain => ({
                    weights: brain.weights
                }))
            })),
            scores: this.scores
        };
        localStorage.setItem('evolutionData', JSON.stringify(evolutionData));
    }

    loadEvolution() {
        const savedData = localStorage.getItem('evolutionData');
        if (savedData) {
            const evolutionData = JSON.parse(savedData);
            this.generation = evolutionData.generation;
            this.scores = evolutionData.scores || [];

            // Reconstruct NeuralBrain objects from saved data
            this.brainHistory = evolutionData.brainHistory.map(entry => ({
                generation: entry.generation,
                brains: entry.brains.map(brainData => {
                    // Create new NeuralBrain with saved weights
                    return new NeuralBrain(brainData.weights);
                })
            }));

            // Update leaderboard display
            this.display.updateLeaderboard(this.scores, this.generation);
        }
    }

    resetEvolution() {
        // Clear all evolution data
        this.generation = 1;
        this.brainHistory = [];
        this.scores = [];
        localStorage.removeItem('evolutionData');

        // Reset cars with random brains
        this.initializePopulation();

        // Clear leaderboard
        this.display.updateLeaderboard([], this.generation);
    }

    restartFromHistory() {
        // Remove scores from current generation
        this.scores = this.scores.filter(score => score.generation !== this.generation);

        // Clear existing cars
        this.cars = [];
        this.selectedCars = [];
        this.focusedCarIndex = 0;

        // Get the last saved brains from history
        const lastGenBrains = this.brainHistory[this.brainHistory.length - 1].brains;
        const halfPopulation = Math.floor(this.populationSize / 2);

        // Create new population using saved brains
        for (let i = 0; i < this.populationSize; i++) {
            let brain;
            if (lastGenBrains.length === 2) {
                // If we have two brains, use first brain for first half, second brain for second half
                const baseBrain = i < halfPopulation ? lastGenBrains[0] : lastGenBrains[1];
                brain = baseBrain.clone();
            } else {
                // If we have one brain, use it for all cars
                brain = lastGenBrains[0].clone();
            }
            brain.mutate();

            const car = new Car(this.gameWorld, null, brain, null, false);
            car.carNumber = i + 1;
            car.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
            this.cars.push(car);
        }

        // Focus the first car
        const firstCar = this.cars[0];
        firstCar.setFocused(true);
        this.focusedCarIndex = 0;

        // Update display
        this.display.updateForCar(firstCar);
        this.display.updateSelectedCars(this.selectedCars);
        this.display.updateLeaderboard(this.scores, this.generation); // Update leaderboard after removing scores

        // Save evolution data with updated scores
        this.saveEvolution();

        // Start the race
        this.startGeneration();
    }

    initializePopulation() {
        // Remove scores from current generation
        this.scores = this.scores.filter(score => score.generation !== this.generation);

        // Clear existing cars
        this.cars = [];
        this.selectedCars = [];
        this.focusedCarIndex = 0;

        // Create new population
        for (let i = 0; i < this.populationSize; i++) {
            const brain = new NeuralBrain();
            const car = new Car(this.gameWorld, null, brain, null, false);
            car.carNumber = i + 1; // Assign number starting from 1
            car.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
            this.cars.push(car);
        }

        // Focus the first car (but don't select it)
        const firstCar = this.cars[0];
        firstCar.setFocused(true);
        this.focusedCarIndex = 0;

        // Show metrics for the focused car
        this.display.updateForCar(firstCar);
        this.display.updateSelectedCars(this.selectedCars);
        this.display.updateLeaderboard(this.scores, this.generation); // Update leaderboard after removing scores

        // Save evolution data with updated scores
        this.saveEvolution();

        // Start the race timer and cars
        this.raceStartFrame = this.currentFrame;
        this.generationStartFrame = this.currentFrame;
        this.cars.forEach(car => car.startRace());
    }

    evaluatePopulation() {
        return this.cars.map(car => ({
            car,
            fitness: this.calculateFitness(car)
        })).sort((a, b) => b.fitness - a.fitness);
    }

    calculateFitness(car) {
        // Primary fitness is number of checkpoints hit
        let fitness = car.hitCheckpoints.size * 1000;

        // Add small bonus for distance traveled (to differentiate cars with same checkpoints)
        const distanceTraveled = Math.sqrt(
            Math.pow(car.chassisBody.position[0], 2) +
            Math.pow(car.chassisBody.position[1], 2)
        );
        fitness += distanceTraveled;

        // Penalize wall hits
        fitness -= car.wallCollisions * 50;

        return fitness;
    }

    async startGeneration() {
        // Reset race timer
        this.raceStartFrame = this.currentFrame;
        this.generationStartFrame = this.currentFrame;

        // Start all cars immediately
        this.cars.forEach(car => car.startRace());

        // Show metrics
        this.display.showAllMetrics();
    }

    evolve() {
        // Check if we have at least one selected car
        if (this.selectedCars.length === 0) {
            console.warn('Need at least one car selected for evolution.');
            return;
        }

        // Store brains of selected cars
        this.bestBrains = this.selectedCars.map(car => car.brain);

        // Add selected brains to history with generation number
        this.brainHistory.push({
            generation: this.generation,
            brains: this.bestBrains.map(brain => brain.clone())
        });

        // Save evolution data
        this.saveEvolution();

        // Unselect all cars before clearing them
        this.selectedCars.forEach(car => car.setSelected(false));
        this.display.updateSelectedCars([]);  // Update display to show no selected cars

        // Clear existing cars
        this.cars = [];
        this.selectedCars = [];
        this.focusedCarIndex = 0;

        // Calculate half population for even split
        const halfPopulation = Math.floor(this.populationSize / 2);

        // Create new population
        for (let i = 0; i < this.populationSize; i++) {
            let brain;
            if (this.bestBrains.length === 2) {
                // If we have two selected cars, use first brain for first half, second brain for second half
                const baseBrain = i < halfPopulation ? this.bestBrains[0] : this.bestBrains[1];
                brain = baseBrain.clone();
            } else {
                // If we have one selected car, use it for all cars
                brain = this.bestBrains[0].clone();
            }
            brain.mutate();

            const car = new Car(this.gameWorld, null, brain, null, false);
            car.carNumber = i + 1;
            car.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
            this.cars.push(car);
        }

        // Focus the first car
        const firstCar = this.cars[0];
        firstCar.setFocused(true);
        this.focusedCarIndex = 0;

        // Update display for the new focused car and clear selected cars
        this.display.updateForCar(firstCar);
        this.display.updateSelectedCars(this.selectedCars);

        // Reset generation start time
        this.generationStartFrame = this.currentFrame;

        // Increment generation counter
        this.generation++;

        // Start new generation
        this.startGeneration();
    }

    isGenerationComplete() {
        const frameElapsed = this.currentFrame - this.generationStartFrame;
        const timeElapsed = frameElapsed / 60; // Convert frames to seconds

        // After 30 seconds, wait for 2 selected cars
        if (timeElapsed > 30) {
            if (this.selectedCars.length === 2) {
                return true;
            }
            // If all cars are eliminated/finished and we don't have 2 selections, keep waiting
            return false;
        }

        // Before 30 seconds, only complete if all cars are eliminated/finished
        return this.cars.every(car => car.raceFinished || car.isEliminated);
    }

    update() {
        // Update frame counter
        this.currentFrame++;

        // Update race time (60 frames = 1 second)
        const raceTime = this.raceStartFrame !== null ? (this.currentFrame - this.raceStartFrame) / 60 : 0;

        // Update all active cars
        this.cars.forEach(car => {
            if (!car.raceFinished && !car.isEliminated) {
                car.update();
                car.raceTime = raceTime;
            }

            // Check if car just finished
            if (car.raceFinished && !car.scoreRecorded) {
                // Add score to leaderboard
                this.scores.push({
                    generation: this.generation,
                    carNumber: car.carNumber,
                    time: car.finishTime,
                    checkpointTimes: car.checkpointTimes,
                    brain: car.brain.weights // Save the brain weights
                });

                // Sort scores by time
                this.scores.sort((a, b) => a.time - b.time);

                // Mark score as recorded
                car.scoreRecorded = true;

                // Update leaderboard display
                this.display.updateLeaderboard(this.scores, this.generation);

                // Save evolution data with new score
                this.saveEvolution();

                // If this is the focused car or it's the first car to finish, update display
                if (car.isFocused || this.scores.length === 1) {
                    // If it's the first car to finish and not focused, focus it
                    if (this.scores.length === 1 && !car.isFocused) {
                        // Unfocus current car
                        if (this.focusedCarIndex !== null) {
                            this.cars[this.focusedCarIndex].setFocused(false);
                        }
                        // Focus the finishing car
                        this.focusedCarIndex = this.cars.indexOf(car);
                        car.setFocused(true);
                    }
                    this.display.updateForCar(car);
                }
            }
        });
    }

    draw() {
        // Draw all cars
        this.cars.forEach(car => car.draw());

        // Update generation display
        this.display.updateGeneration(this.generation);
    }

    getFocusedCar() {
        return this.cars[this.focusedCarIndex];
    }

    selectFocusedCar() {
        const focusedCar = this.cars[this.focusedCarIndex];

        // If car is already selected, deselect it
        const index = this.selectedCars.indexOf(focusedCar);
        if (index !== -1) {
            this.selectedCars.splice(index, 1);
            focusedCar.setSelected(false);
        } else {
            // If we already have 2 selected cars, deselect the first one
            if (this.selectedCars.length >= 2) {
                const removedCar = this.selectedCars.shift(); // Remove first car
                removedCar.setSelected(false);
            }

            // Add the car to selected cars
            this.selectedCars.push(focusedCar);
            focusedCar.setSelected(true);
        }

        // Update the selected cars display
        this.display.updateSelectedCars(this.selectedCars);
    }

    cycleFocus() {
        // Clear previous focus
        if (this.focusedCarIndex < this.cars.length) {
            this.cars[this.focusedCarIndex].setFocused(false);
        }

        // Update focus index to next car
        this.focusedCarIndex = (this.focusedCarIndex + 1) % this.cars.length;

        // Set new focus
        const newFocusedCar = this.cars[this.focusedCarIndex];
        newFocusedCar.setFocused(true);

        // Update display for the newly focused car
        this.display.updateForCar(newFocusedCar);

        // Update leaderboard if car has finished
        if (newFocusedCar.raceFinished) {
            this.display.updateLeaderboard(this.scores, this.generation);
        }
    }

    restartGeneration() {
        // Remove scores from current generation
        this.scores = this.scores.filter(score => score.generation !== this.generation);

        // Store selected brains before clearing
        const selectedBrains = this.selectedCars.map(car => car.brain);

        // Add current selected brains to history if any
        if (selectedBrains.length > 0) {
            this.brainHistory.push({
                generation: this.generation,
                brains: selectedBrains.map(brain => brain.clone())
            });
        }

        // Clear existing cars
        this.cars = [];
        this.selectedCars = [];
        this.focusedCarIndex = 0;

        // Calculate half population for even split
        const halfPopulation = Math.floor(this.populationSize / 2);

        // Create new population
        for (let i = 0; i < this.populationSize; i++) {
            let brain;
            if (selectedBrains.length > 0 || this.brainHistory.length > 0) {
                // Use either current selected brains or last entry from history
                const sourceBrains = selectedBrains.length > 0 ? selectedBrains :
                    this.brainHistory[this.brainHistory.length - 1].brains;

                if (sourceBrains.length === 2) {
                    // If we have two brains, use first brain for first half, second brain for second half
                    const baseBrain = i < halfPopulation ? sourceBrains[0] : sourceBrains[1];
                    brain = baseBrain.clone();
                } else {
                    // If we have one brain, use it for all cars
                    brain = sourceBrains[0].clone();
                }
                brain.mutate();
            } else {
                // If no history or selected cars, create completely random brains
                brain = new NeuralBrain();
            }

            const car = new Car(this.gameWorld, null, brain, null, false);
            car.carNumber = i + 1;
            car.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
            this.cars.push(car);
        }

        // Focus the first car
        const firstCar = this.cars[0];
        firstCar.setFocused(true);
        this.focusedCarIndex = 0;

        // Update display
        this.display.updateForCar(firstCar);
        this.display.updateSelectedCars(this.selectedCars);
        this.display.updateLeaderboard(this.scores, this.generation); // Update leaderboard after removing scores

        // Save evolution data with updated scores
        this.saveEvolution();

        // Reset generation start time
        this.generationStartFrame = this.currentFrame;

        // Start new generation
        this.startGeneration();
    }

    undoLastEvolution() {
        // Check if we have any history to go back to
        if (this.brainHistory.length <= 1) {
            console.warn('No previous evolution to undo.');
            return;
        }

        // Remove the last entry from history
        this.brainHistory.pop();
        this.generation--;

        // Save the updated evolution data
        this.saveEvolution();

        // Restart from the previous generation
        this.restartFromHistory();
    }

    focusCarByIndex(index) {
        // Unfocus current car
        if (this.focusedCarIndex !== null) {
            this.cars[this.focusedCarIndex].setFocused(false);
        }

        // Focus new car
        this.focusedCarIndex = index;
        const car = this.cars[index];
        car.setFocused(true);

        // Update display
        this.display.updateForCar(car);

        // Update leaderboard if car has finished
        if (car.raceFinished) {
            this.display.updateLeaderboard(this.scores, this.generation);
        }
    }

    focusBestCar() {
        // First try to get finished cars
        const finishedCars = this.cars
            .filter(car => car.raceFinished)
            .sort((a, b) => a.finishTime - b.finishTime);

        if (finishedCars.length > 0) {
            // If there are finished cars, use finish time to determine best
            const currentFocusedIndex = finishedCars.findIndex(car => car.isFocused);
            const nextIndex = currentFocusedIndex === -1 ? 0 : (currentFocusedIndex + 1) % finishedCars.length;
            const carToFocus = finishedCars[nextIndex];
            const mainArrayIndex = this.cars.findIndex(car => car === carToFocus);
            if (mainArrayIndex !== -1) {
                this.focusCarByIndex(mainArrayIndex);
            }
        } else {
            // If no cars have finished, use checkpoints and time
            const activeCars = this.cars
                .filter(car => !car.isEliminated)
                .sort((a, b) => {
                    // First compare by number of checkpoints
                    const checkpointDiff = b.hitCheckpoints.size - a.hitCheckpoints.size;
                    if (checkpointDiff !== 0) return checkpointDiff;
                    // If same number of checkpoints, compare by time
                    return a.raceTime - b.raceTime;
                });

            if (activeCars.length === 0) {
                console.log('No active cars found');
                return;
            }

            // Find current focused car in active cars
            const currentFocusedIndex = activeCars.findIndex(car => car.isFocused);
            const nextIndex = currentFocusedIndex === -1 ? 0 : (currentFocusedIndex + 1) % activeCars.length;
            const carToFocus = activeCars[nextIndex];
            const mainArrayIndex = this.cars.findIndex(car => car === carToFocus);
            if (mainArrayIndex !== -1) {
                this.focusCarByIndex(mainArrayIndex);
            }
        }
    }
} 