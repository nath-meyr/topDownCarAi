class Display {
    static instance = null;

    static getInstance() {
        if (!Display.instance) {
            Display.instance = new Display();
        }
        return Display.instance;
    }

    constructor() {
        if (Display.instance) {
            return Display.instance;
        }

        this.container = this.createContainer();
        this.elements = {
            speed: this.createMetricElement('speed'),
            time: this.createMetricElement('time'),
            checkpoints: this.createMetricElement('checkpoints'),
            focusedCar: this.createMetricElement('focusedCar'),
            selectedCars: this.createMetricElement('selectedCars'),
            generation: this.createMetricElement('generation'),
            controls: this.createMetricElement('controls'),
            finish: this.createFinishOverlay(),
            countdown: this.createCountdownElement(),
            pause: this.createPauseOverlay(),
            leaderboard: this.createLeaderboard()
        };
        this.focusedCar = null;

        this.positionElements();
        Display.instance = this;
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'game-overlay';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            font-family: Arial, sans-serif;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(container);
        return container;
    }

    createMetricElement(id) {
        const element = document.createElement('div');
        element.id = id;
        element.style.cssText = `
            position: absolute;
            padding: 10px;
            background-color: rgba(0,0,0,0.5);
            border-radius: 5px;
            font-size: 18px;
            pointer-events: none;
            display: none;
        `;
        this.container.appendChild(element);
        return element;
    }

    createFinishOverlay() {
        const element = document.createElement('div');
        element.id = 'finish-overlay';
        element.style.cssText = `
            position: absolute;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background-color: rgba(0,0,0,0.7);
            padding: 15px;
            border-radius: 8px;
            text-align: left;
            display: none;
            min-width: 250px;
            max-width: 300px;
            pointer-events: auto;
            font-size: 14px;
        `;
        this.container.appendChild(element);
        return element;
    }

    createCountdownElement() {
        const element = document.createElement('div');
        element.id = 'countdown';
        element.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            display: none;
            z-index: 1000;
            pointer-events: none;
        `;
        this.container.appendChild(element);
        return element;
    }

    createPauseOverlay() {
        const element = document.createElement('div');
        element.id = 'pause-overlay';
        element.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0,0,0,0.8);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            display: none;
            font-size: 36px;
            color: white;
            z-index: 1000;
        `;
        element.textContent = 'PAUSED';
        this.container.appendChild(element);
        return element;
    }

    createLeaderboard() {
        const element = document.createElement('div');
        element.id = 'leaderboard';
        element.style.cssText = `
            position: absolute;
            top: 50%;
            left: 20px;
            transform: translateY(-50%);
            background-color: rgba(0,0,0,0.7);
            padding: 15px;
            border-radius: 8px;
            text-align: left;
            display: none;
            min-width: 250px;
            max-width: 300px;
            pointer-events: auto;
            font-size: 14px;
        `;
        this.container.appendChild(element);
        return element;
    }

    positionElements() {
        // Position speed display (top left)
        this.elements.speed.style.top = '20px';
        this.elements.speed.style.left = '20px';

        // Position time display (top right)
        this.elements.time.style.top = '20px';
        this.elements.time.style.right = '20px';

        // Position checkpoints display (top left, below speed)
        this.elements.checkpoints.style.top = '70px';
        this.elements.checkpoints.style.left = '20px';

        // Position focused car display (top left, below checkpoints)
        this.elements.focusedCar.style.top = '120px';
        this.elements.focusedCar.style.left = '20px';

        // Position selected cars display (top left, below focused car)
        this.elements.selectedCars.style.top = '170px';
        this.elements.selectedCars.style.left = '20px';

        // Position generation counter (bottom left)
        this.elements.generation.style.bottom = '20px';
        this.elements.generation.style.left = '20px';

        // Position controls info (bottom right)
        this.elements.controls.style.bottom = '20px';
        this.elements.controls.style.right = '20px';
        this.elements.controls.innerHTML = 'Controls:<br>' +
            'SPACE - Cycle Focus<br>' +
            'ENTER - Select Car<br>' +
            'E - Evolve Selected Cars<br>' +
            'R - Restart Generation<br>' +
            'X - Reset Evolution<br>' +
            'P - Pause/Resume<br>' +
            'Z - Undo Last Evolution<br>' +
            'B - Focus Best Car<br>' +
            '1-9,0 - Focus Car 1-10';
    }

    showAllMetrics() {
        this.elements.speed.style.display = 'block';
        this.elements.time.style.display = 'block';
        this.elements.checkpoints.style.display = 'block';
        this.elements.focusedCar.style.display = 'block';
        this.elements.selectedCars.style.display = 'block';
        this.elements.generation.style.display = 'block';
        this.elements.controls.style.display = 'block';
    }

    hideAllMetrics() {
        this.elements.speed.style.display = 'none';
        this.elements.time.style.display = 'none';
        this.elements.checkpoints.style.display = 'none';
        this.elements.focusedCar.style.display = 'none';
        this.elements.selectedCars.style.display = 'none';
        this.elements.generation.style.display = 'none';
        this.elements.controls.style.display = 'none';
        this.elements.finish.style.display = 'none';
    }

    updateForCar(car, raceTime = 0) {
        if (!car) return;

        const speed = Math.sqrt(
            Math.pow(car.chassisBody.velocity[0], 2) +
            Math.pow(car.chassisBody.velocity[1], 2)
        );

        this.updateSpeed(speed);
        this.updateTime(car.raceFinished ? car.finishTime : car.raceTime);
        this.updateCheckpoints(car.hitCheckpoints.size, car.totalCheckpoints);
        this.updateFocusedCar(car.carNumber);

        // Update focused car reference
        this.focusedCar = car.isFocused ? car : null;

        // Show/hide finish overlay and leaderboard based on focused car's state
        if (car.isFocused) {
            if (car.raceFinished) {
                // Show both finish overlay and leaderboard when focused car finishes
                this.showFinish({
                    time: car.finishTime,
                    checkpointTimes: car.checkpointTimes
                });
                this.elements.leaderboard.style.display = 'block';
                this.elements.leaderboard.style.zIndex = '1';

                // Update leaderboard to show this car's position
                if (car.gameWorld?.geneticManager) {
                    this.updateLeaderboard(car.gameWorld.geneticManager.scores, car.gameWorld.geneticManager.generation);
                }
            } else {
                // Hide both overlays when focused car hasn't finished
                this.elements.finish.style.display = 'none';
                this.elements.leaderboard.style.display = 'none';
            }
        }
    }

    updateSpeed(speed) {
        this.elements.speed.textContent = `Speed: ${speed.toFixed(2)} m/s`;
    }

    updateTime(time) {
        this.elements.time.textContent = `Time: ${time ? time.toFixed(2) : '0.00'}s`;
    }

    updateCheckpoints(current, total) {
        this.elements.checkpoints.textContent = `Checkpoints: ${current}/${total}`;
    }

    updateFocusedCar(carNumber) {
        this.elements.focusedCar.textContent = `Focused Car: #${carNumber}`;
    }

    showFinish(data) {
        // Show finish overlay
        this.elements.finish.style.display = 'block';
        this.elements.finish.style.zIndex = '2'; // Ensure finish overlay is above leaderboard
        this.elements.finish.innerHTML = `
            <h2 style="margin: 0 0 10px 0; font-size: 18px;">Race Complete!</h2>
            <div style="margin: 5px 0;">Time: ${data.time ? data.time.toFixed(2) : '0.00'}s</div>
            <div style="margin: 10px 0 5px 0; font-weight: bold;">Checkpoint Times:</div>
            ${data.checkpointTimes && Object.keys(data.checkpointTimes).length > 0 ?
                Object.entries(data.checkpointTimes)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([index, time]) => `
                        <div style="margin: 2px 0;">CP ${parseInt(index) + 1}: ${time ? time.toFixed(2) : '0.00'}s</div>
                    `).join('')
                : '<div style="margin: 5px 0;">No checkpoint times recorded</div>'
            }
        `;
    }

    async startCountdown(onComplete) {
        this.elements.countdown.style.display = 'block';
        for (let i = 3; i > 0; i--) {
            this.elements.countdown.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.elements.countdown.textContent = 'GO!';
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.elements.countdown.style.display = 'none';
        onComplete();
    }

    updateGeneration(generation) {
        this.elements.generation.textContent = `Generation: ${generation}`;
    }

    updateSelectedCars(selectedCars) {
        if (selectedCars.length === 0) {
            this.elements.selectedCars.textContent = 'Selected Cars: none';
        } else {
            const carNumbers = selectedCars.map(car => car.carNumber).sort((a, b) => a - b);
            this.elements.selectedCars.textContent = `Selected Cars: #${carNumbers.join(', #')}`;
        }
    }

    showPauseOverlay(isPaused) {
        this.elements.pause.style.display = isPaused ? 'block' : 'none';
    }

    updateLeaderboard(scores, currentGeneration) {
        if (!scores || scores.length === 0) {
            return;
        }

        // Get focused car's score if it exists
        const focusedCar = this.focusedCar;
        const focusedCarScore = scores.find(
            score => score.generation === currentGeneration &&
                score.carNumber === focusedCar?.carNumber
        );

        // Get scores to display
        let displayScores;
        if (focusedCarScore) {
            const focusedCarPosition = scores.indexOf(focusedCarScore);
            if (focusedCarPosition < 10) {
                // If focused car is in top 10, show top 10
                displayScores = [...scores].slice(0, 10);
            } else {
                // If focused car is beyond top 10, show:
                // - Top 3
                // - Two positions before focused car
                // - Focused car
                // - Two positions after focused car (if they exist)
                displayScores = [
                    ...scores.slice(0, 3), // Top 3
                    ...(focusedCarPosition > 3 ? ['...'] : []), // Ellipsis if there's a gap
                    ...scores.slice(
                        Math.max(3, focusedCarPosition - 1),
                        Math.min(focusedCarPosition + 3, scores.length)
                    )
                ];
            }
        } else {
            // No focused car, just show top 10
            displayScores = [...scores].slice(0, 10);
        }

        // Only update the content, visibility is controlled by updateForCar
        this.elements.leaderboard.innerHTML = `
            <h2 style="margin: 0 0 10px 0; font-size: 18px;">Leaderboard</h2>
            ${displayScores.map((score) => {
            if (score === '...') {
                return `<div style="text-align: center; margin: 5px 0;">...</div>`;
            }
            const isFocusedCar = focusedCarScore &&
                score.generation === focusedCarScore.generation &&
                score.carNumber === focusedCarScore.carNumber;
            const position = scores.indexOf(score) + 1;
            return `
                    <div style="margin: 5px 0; padding: 5px; 
                        background-color: ${score.generation === currentGeneration ? 'rgba(255,140,0,0.3)' : 'rgba(255,255,255,0.1)'};
                        border-radius: 4px;">
                        <div style="
                            font-weight: bold;
                            color: ${isFocusedCar ? '#00ff00' : 'white'};
                        ">#${position}. Gen ${score.generation} Car ${score.carNumber}</div>
                        <div style="color: ${isFocusedCar ? '#00ff00' : 'white'};">
                            Time: ${score.time.toFixed(2)}s
                        </div>
                    </div>
                `;
        }).join('')}
        `;
    }
} 