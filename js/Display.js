class Display {
    constructor() {
        this.container = this.createContainer();
        this.elements = {
            speed: this.createMetricElement('speed'),
            time: this.createMetricElement('time'),
            checkpoints: this.createMetricElement('checkpoints'),
            wallHits: this.createMetricElement('wallHits'),
            finish: this.createFinishOverlay()
        };
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
            pointer-events: none;
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

    showFinish(data) {
        this.elements.finish.style.display = 'block';

        // Calculate optimal number of columns (max 4)
        const checkpointCount = data.checkpointTimes.length;
        const columnsCount = Math.min(4, Math.ceil(Math.sqrt(checkpointCount)));

        // Create checkpoint grid
        const checkpointGrid = document.createElement('div');
        checkpointGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${columnsCount}, 1fr);
            gap: 10px;
            margin-top: 15px;
            justify-items: center;
        `;

        // Add checkpoint times to grid
        data.checkpointTimes.forEach((time, index) => {
            const checkpointElement = document.createElement('div');
            checkpointElement.textContent = `CP${index + 1}: ${ScoreManager.formatTime(time)}`;
            checkpointGrid.appendChild(checkpointElement);
        });

        this.elements.finish.innerHTML = `
            <h2 style="margin: 0 0 15px 0;">FINISH!</h2>
            <h3 style="margin: 0 0 10px 0;">${data.trackName}</h3>
            <p style="margin: 5px 0;">Time: ${data.time.toFixed(2)}s</p>
            <p style="margin: 5px 0;">Position: ${data.position}</p>
            <p style="margin: 5px 0;">Wall Hits: ${data.wallHits}</p>
            ${data.bestTime ? `<p style="margin: 5px 0;">Best: ${ScoreManager.formatTime(data.bestTime)}</p>` : ''}
        `;

        // Append the checkpoint grid
        this.elements.finish.appendChild(checkpointGrid);
    }

    hideFinish() {
        this.elements.finish.style.display = 'none';
    }
} 