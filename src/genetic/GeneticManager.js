class GeneticManager {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.generation = 1;
        this.populationSize = 20;
        this.cars = [];
        this.bestBrains = [];
        this.selectedCar = null;
        this.focusedCarIndex = 0;
        this.display = Display.getInstance();
        this.display.showAllMetrics();
        this.generationStartFrame = 0;
        this.raceStartFrame = null;
        this.currentFrame = 0;
        this.brainHistory = [];
        this.scores = {};
        this.mutationRate = 0.1; // Chance of random brain vs mutated copy
        this.mutationStrength = 0.3; // Default mutation strength (30%)

        // Try to load saved evolution data
        this.loadEvolution();
        if (this.brainHistory.length === 0) {
            this.initializePopulation();
        } else {
            this.restartFromHistory();
        }

        // Initialize mutation strength display
        this.display.updateMutationStrength(this.mutationStrength);
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
            scores: this.scores,
            mutationStrength: this.mutationStrength
        };
        localStorage.setItem('evolutionData', JSON.stringify(evolutionData));
    }

    loadEvolution() {
        const savedData = localStorage.getItem('evolutionData');
        if (savedData) {
            const evolutionData = JSON.parse(savedData);
            this.generation = evolutionData.generation;
            this.scores = evolutionData.scores || {};
            this.mutationStrength = evolutionData.mutationStrength || 0.3;

            // Reconstruct NeuralBrain objects from saved data
            this.brainHistory = evolutionData.brainHistory.map(entry => ({
                generation: entry.generation,
                brains: entry.brains.map(brainData => {
                    // Create new NeuralBrain with saved weights
                    return new NeuralBrain(brainData.weights);
                })
            }));

            // Update leaderboard display
            const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();
            this.display.updateLeaderboard(this.scores[currentTrackId] || [], this.generation);
        }
    }

    resetEvolution() {
        // Clear all evolution data
        this.generation = 1;
        this.brainHistory = [];
        this.scores = {};
        localStorage.removeItem('evolutionData');

        // Reset cars with random brains
        this.initializePopulation();

        // Clear leaderboard
        const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();
        this.display.updateLeaderboard([], this.generation);
    }

    restartFromHistory() {
        // Remove scores from current generation for current track
        const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();
        if (this.scores[currentTrackId]) {
            this.scores[currentTrackId] = this.scores[currentTrackId].filter(
                score => score.generation !== this.generation
            );
        }

        // Clear existing cars
        this.cars = [];
        this.selectedCar = null;
        this.focusedCarIndex = 0;

        // Get the last saved brains from history
        const lastGenBrains = this.brainHistory[this.brainHistory.length - 1].brains;

        // Create first car with exact copy of the best brain
        const car1 = new Car(this.gameWorld, null, lastGenBrains[0].clone(), null, false);
        car1.carNumber = 1;
        car1.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
        this.cars.push(car1);

        // Create remaining cars with mutations
        for (let i = 1; i < this.populationSize; i++) {
            const brain = lastGenBrains[0].clone();
            brain.mutate(this.mutationStrength);

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
        this.display.updateSelectedCars(this.selectedCar);
        this.display.updateLeaderboard(this.scores[currentTrackId] || [], this.generation);
        this.display.updateMutationStrength(this.mutationStrength);

        // Save evolution data with updated scores
        this.saveEvolution();

        // Start the race
        this.startGeneration();
    }

    initializePopulation() {
        // Remove scores from current generation for current track
        const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();
        if (this.scores[currentTrackId]) {
            this.scores[currentTrackId] = this.scores[currentTrackId].filter(
                score => score.generation !== this.generation
            );
        }

        // Clear existing cars
        this.cars = [];
        this.selectedCar = null;
        this.focusedCarIndex = 0;

        // Create new population with random brains
        for (let i = 0; i < this.populationSize; i++) {
            const brain = new NeuralBrain();
            const car = new Car(this.gameWorld, null, brain, null, false);
            car.carNumber = i + 1;
            car.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
            this.cars.push(car);
        }

        // Focus the first car
        const firstCar = this.cars[0];
        firstCar.setFocused(true);
        this.focusedCarIndex = 0;

        // Show metrics for the focused car
        this.display.updateForCar(firstCar);
        this.display.updateSelectedCars(this.selectedCar);
        this.display.updateLeaderboard(this.scores[currentTrackId] || [], this.generation);
        this.display.updateMutationStrength(this.mutationStrength);

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
        // Check if we have a selected car
        if (!this.selectedCar) {
            console.warn('Need a car selected for evolution.');
            return;
        }

        // Store brain of the selected car
        const bestBrain = this.selectedCar.brain;

        // Add selected brain to history with generation number
        this.brainHistory.push({
            generation: this.generation,
            brains: [bestBrain.clone()]
        });

        // Save evolution data
        this.saveEvolution();

        // Unselect car before clearing
        if (this.selectedCar) {
            this.selectedCar.setSelected(false);
            this.display.updateSelectedCars(null);
        }

        // Clear existing cars
        this.cars = [];
        this.selectedCar = null;
        this.focusedCarIndex = 0;

        // Create first car with exact copy of the best brain
        const car1 = new Car(this.gameWorld, null, bestBrain.clone(), null, false);
        car1.carNumber = 1;
        car1.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
        this.cars.push(car1);

        // Create remaining cars with mutations based on mutation rate
        for (let i = 1; i < this.populationSize; i++) {
            let brain;
            if (Math.random() < this.mutationRate) {
                brain = new NeuralBrain();
            } else {
                brain = bestBrain.clone();
                brain.mutate(this.mutationStrength);
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

        // Update display for the new focused car and clear selected car
        this.display.updateForCar(firstCar);
        this.display.updateSelectedCars(null);
        this.display.updateMutationStrength(this.mutationStrength);

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
            if (this.selectedCar) {
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
                const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();

                // Initialize track scores if needed
                if (!this.scores[currentTrackId]) {
                    this.scores[currentTrackId] = [];
                }

                // Add score to leaderboard
                this.scores[currentTrackId].push({
                    generation: this.generation,
                    carNumber: car.carNumber,
                    time: car.finishTime,
                    checkpointTimes: car.checkpointTimes,
                    brain: car.brain.weights // Save the brain weights
                });

                // Sort scores by time for current track
                this.scores[currentTrackId].sort((a, b) => a.time - b.time);

                // Mark score as recorded
                car.scoreRecorded = true;

                // Update leaderboard display with current track's scores
                this.display.updateLeaderboard(this.scores[currentTrackId], this.generation);

                // Save evolution data with new score
                this.saveEvolution();

                // If this is the focused car or it's the first car to finish, update display
                if (car.isFocused || this.scores[currentTrackId].length === 1) {
                    // If it's the first car to finish and not focused, focus it
                    if (this.scores[currentTrackId].length === 1 && !car.isFocused) {
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
        if (this.selectedCar === focusedCar) {
            this.selectedCar = null;
            focusedCar.setSelected(false);
        } else {
            // Deselect previous car if any
            if (this.selectedCar) {
                this.selectedCar.setSelected(false);
            }
            // Select the new car
            this.selectedCar = focusedCar;
            focusedCar.setSelected(true);
        }

        // Update the selected car display
        this.display.updateSelectedCars(this.selectedCar);
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
            const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();
            this.display.updateLeaderboard(this.scores[currentTrackId] || [], this.generation);
        }
    }

    restartGeneration() {
        // Remove scores from current generation for current track
        const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();
        if (this.scores[currentTrackId]) {
            this.scores[currentTrackId] = this.scores[currentTrackId].filter(
                score => score.generation !== this.generation
            );
        }

        // Store selected brain before clearing
        const selectedBrain = this.selectedCar ? this.selectedCar.brain.clone() : null;

        // Clear existing cars
        this.cars = [];
        this.selectedCar = null;
        this.focusedCarIndex = 0;

        // Create new population
        if (selectedBrain || this.brainHistory.length > 0) {
            // Use either current selected brain or last entry from history
            const brain = selectedBrain || this.brainHistory[this.brainHistory.length - 1].brains[0];

            // Create first car with exact copy
            const car1 = new Car(this.gameWorld, null, brain.clone(), null, false);
            car1.carNumber = 1;
            car1.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
            this.cars.push(car1);

            // Create remaining cars with mutations based on mutation rate
            for (let i = 1; i < this.populationSize; i++) {
                let newBrain;
                if (Math.random() < this.mutationRate) {
                    newBrain = new NeuralBrain();
                } else {
                    newBrain = brain.clone();
                    newBrain.mutate(this.mutationStrength);
                }

                const car = new Car(this.gameWorld, null, newBrain, null, false);
                car.carNumber = i + 1;
                car.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
                this.cars.push(car);
            }
        } else {
            // If no history or selected car, create completely random brains
            for (let i = 0; i < this.populationSize; i++) {
                const brain = new NeuralBrain();
                const car = new Car(this.gameWorld, null, brain, null, false);
                car.carNumber = i + 1;
                car.setTotalCheckpoints(this.gameWorld.getTrack().getTotalCheckpoints());
                this.cars.push(car);
            }
        }

        // Focus the first car
        const firstCar = this.cars[0];
        firstCar.setFocused(true);
        this.focusedCarIndex = 0;

        // Update display
        this.display.updateForCar(firstCar);
        this.display.updateSelectedCars(null);
        this.display.updateLeaderboard(this.scores[currentTrackId] || [], this.generation);
        this.display.updateMutationStrength(this.mutationStrength);

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
            const currentTrackId = this.gameWorld.getTrack().getCurrentTrackId();
            this.display.updateLeaderboard(this.scores[currentTrackId] || [], this.generation);
        }
    }

    focusBestCar() {
        // First try to get finished cars
        const finishedCars = this.cars
            .filter(car => car.raceFinished)
            .sort((a, b) => a.finishTime - b.finishTime);

        if (finishedCars.length > 0) {
            // If there are finished cars, focus the one with best finish time
            const bestCar = finishedCars[0];
            const mainArrayIndex = this.cars.findIndex(car => car === bestCar);
            if (mainArrayIndex !== -1) {
                this.focusCarByIndex(mainArrayIndex);
            }
        } else {
            // If no cars have finished, sort by checkpoints and time
            const unfinishedCars = this.cars
                .filter(car => !car.raceFinished)
                // First sort by last checkpoint time (bigger first)
                .sort((a, b) => {
                    const aCheckpointTimes = Object.keys(a.checkpointTimes).length;
                    const bCheckpointTimes = Object.keys(b.checkpointTimes).length;
                    const aLastTime = aCheckpointTimes > 0 ? a.checkpointTimes[aCheckpointTimes - 1] : -Infinity;
                    const bLastTime = bCheckpointTimes > 0 ? b.checkpointTimes[bCheckpointTimes - 1] : -Infinity;
                    return bLastTime - aLastTime;
                })
                // Then sort by number of checkpoint times (bigger first)
                .sort((a, b) => {
                    const aCheckpointTimes = Object.keys(a.checkpointTimes).length;
                    const bCheckpointTimes = Object.keys(b.checkpointTimes).length;
                    return bCheckpointTimes - aCheckpointTimes;
                });

            if (unfinishedCars.length > 0) {
                // Focus the car with most checkpoints / best time
                const bestCar = unfinishedCars[0];
                const mainArrayIndex = this.cars.findIndex(car => car === bestCar);
                if (mainArrayIndex !== -1) {
                    this.focusCarByIndex(mainArrayIndex);
                }
            }
        }
    }

    // Add method to adjust mutation rate
    setMutationRate(rate) {
        // Clamp rate between 0 and 1
        this.mutationRate = Math.max(0, Math.min(1, rate));
        console.log(`Mutation rate set to ${(this.mutationRate * 100).toFixed(1)}%`);
    }

    // Add method to decrease mutation rate
    decreaseMutationRate() {
        const newRate = Math.max(0, this.mutationRate - 0.1);
        this.setMutationRate(newRate);
    }

    // Add method to increase mutation rate
    increaseMutationRate() {
        const newRate = Math.min(1, this.mutationRate + 0.1);
        this.setMutationRate(newRate);
    }

    // Add method to adjust mutation strength
    setMutationStrength(strength) {
        // Clamp and update the global mutation strength
        this.mutationStrength = Math.max(0, Math.min(1, strength));
        console.log(`Mutation strength set to ${(this.mutationStrength * 100).toFixed(1)}%`);
        // Update display
        this.display.updateMutationStrength(this.mutationStrength);
        // Save the updated mutation strength
        this.saveEvolution();
    }

    // Add method to decrease mutation strength
    decreaseMutationStrength() {
        const newStrength = Math.max(0, this.mutationStrength - 0.1);
        this.setMutationStrength(newStrength);
    }

    // Add method to increase mutation strength
    increaseMutationStrength() {
        const newStrength = Math.min(1, this.mutationStrength + 0.1);
        this.setMutationStrength(newStrength);
    }
}
