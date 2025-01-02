class Display {
    constructor(onRestart) {
        this.container = this.createContainer();
        this.onRestart = onRestart;
        this.elements = {
            speed: this.createMetricElement('speed'),
            time: this.createMetricElement('time'),
            checkpoints: this.createMetricElement('checkpoints'),
            wallHits: this.createMetricElement('wallHits'),
            finish: this.createFinishOverlay(),
            countdown: this.createCountdownElement()
        };

        // Initialize finish overlay content structure
        this.finishElements = this.createFinishElements();

        // Track the maximum number of checkpoints we've seen
        this.maxCheckpoints = 0;
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
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0,0,0,0.8);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            display: none;
            min-width: 400px;
            pointer-events: auto;
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
            font-size: 120px;
            font-weight: bold;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            display: none;
            z-index: 1000;
            pointer-events: none;
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

        // Position wall hits display (top left, below checkpoints)
        this.elements.wallHits.style.top = '120px';
        this.elements.wallHits.style.left = '20px';
    }

    updateSpeed(speed) {
        this.elements.speed.textContent = `Speed: ${speed.toFixed(2)} m/s`;
    }

    updateTime(time) {
        this.elements.time.textContent = `Time: ${time.toFixed(2)}s`;
    }

    updateCheckpoints(current, total) {
        this.elements.checkpoints.textContent = `Checkpoints: ${current}/${total}`;
    }

    updateWallHits(hits) {
        this.elements.wallHits.textContent = `Wall Hits: ${hits}`;
    }

    createRestartButton() {
        const button = document.createElement('button');
        button.textContent = 'Restart Race';
        button.style.cssText = `
            background-color: #4CAF50;
            border: none;
            color: white;
            padding: 15px 32px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 4px 2px;
            cursor: pointer;
            border-radius: 4px;
            transition: background-color 0.3s;
            pointer-events: auto;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#45a049';
        });

        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#4CAF50';
        });

        button.addEventListener('click', () => {
            this.hideFinish();
            if (this.onRestart) this.onRestart();
        });

        return button;
    }

    createFinishElements() {
        const elements = {
            title: document.createElement('h2'),
            trackName: document.createElement('h3'),
            time: document.createElement('p'),
            position: document.createElement('p'),
            wallHits: document.createElement('p'),
            bestTime: document.createElement('p'),
            checkpointGrid: document.createElement('div'),
            buttonContainer: document.createElement('div'),
            checkpoints: [] // Array to store checkpoint elements
        };

        // Set up static styles
        elements.title.style.margin = '0 0 15px 0';
        elements.title.textContent = 'FINISH!';

        elements.trackName.style.margin = '0 0 10px 0';

        elements.time.style.margin = '5px 0';
        elements.position.style.margin = '5px 0';
        elements.wallHits.style.margin = '5px 0';
        elements.bestTime.style.margin = '5px 0';

        elements.checkpointGrid.style.cssText = `
            display: grid;
            gap: 10px;
            margin-top: 15px;
            justify-items: center;
        `;

        // Create initial checkpoint elements (we'll show/hide as needed)
        for (let i = 0; i < 20; i++) { // Pre-create 20 checkpoint elements
            const checkpointElement = document.createElement('div');
            checkpointElement.style.display = 'none'; // Hide by default
            elements.checkpointGrid.appendChild(checkpointElement);
            elements.checkpoints.push(checkpointElement);
        }

        elements.buttonContainer.style.marginTop = '20px';
        elements.buttonContainer.appendChild(this.createRestartButton());

        // Add elements to finish overlay
        const finish = this.elements.finish;
        finish.appendChild(elements.title);
        finish.appendChild(elements.trackName);
        finish.appendChild(elements.time);
        finish.appendChild(elements.position);
        finish.appendChild(elements.wallHits);
        finish.appendChild(elements.bestTime);
        finish.appendChild(elements.checkpointGrid);
        finish.appendChild(elements.buttonContainer);

        return elements;
    }

    showFinish(data) {
        // Update content
        this.finishElements.trackName.textContent = data.trackName;
        this.finishElements.time.textContent = `Time: ${data.time.toFixed(2)}s`;
        this.finishElements.position.textContent = `Position: ${data.position}`;
        this.finishElements.wallHits.textContent = `Wall Hits: ${data.wallHits}`;
        this.finishElements.bestTime.textContent = data.bestTime ?
            `Best: ${ScoreManager.formatTime(data.bestTime)}` : '';

        // Update checkpoint grid layout
        const columnsCount = Math.min(4, Math.ceil(Math.sqrt(data.checkpointTimes.length)));
        this.finishElements.checkpointGrid.style.gridTemplateColumns = `repeat(${columnsCount}, 1fr)`;

        // Update checkpoint times and visibility
        const checkpointCount = data.checkpointTimes.length;
        this.finishElements.checkpoints.forEach((element, index) => {
            if (index < checkpointCount) {
                element.textContent = `CP${index + 1}: ${ScoreManager.formatTime(data.checkpointTimes[index])}`;
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });

        // Show overlay
        this.elements.finish.style.display = 'block';
    }

    hideFinish() {
        this.elements.finish.style.display = 'none';
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
        if (onComplete) onComplete();
    }

    hideAllMetrics() {
        this.elements.speed.style.display = 'none';
        this.elements.time.style.display = 'none';
        this.elements.checkpoints.style.display = 'none';
        this.elements.wallHits.style.display = 'none';
    }

    showAllMetrics() {
        this.elements.speed.style.display = 'block';
        this.elements.time.style.display = 'block';
        this.elements.checkpoints.style.display = 'block';
        this.elements.wallHits.style.display = 'block';
    }
} 