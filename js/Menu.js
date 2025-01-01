class Menu {
    constructor(onTrackSelect) {
        this.container = this.createContainer();
        this.onTrackSelect = onTrackSelect;
        this.createMenu();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'menu-overlay';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(container);
        return container;
    }

    createMenu() {
        const menuContent = document.createElement('div');
        menuContent.style.cssText = `
            background-color: rgba(0, 0, 0, 0.9);
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            color: white;
        `;

        const title = document.createElement('h1');
        title.textContent = 'Select Circuit';
        title.style.marginBottom = '2rem';

        menuContent.appendChild(title);

        const trackGrid = document.createElement('div');
        trackGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        `;

        Track.TRACKS.forEach(track => {
            const trackButton = this.createTrackButton(track);
            trackGrid.appendChild(trackButton);
        });

        menuContent.appendChild(trackGrid);
        this.container.appendChild(menuContent);
    }

    createTrackButton(track) {
        const button = document.createElement('div');
        button.style.cssText = `
            background-color: rgba(255, 255, 255, 0.1);
            padding: 1rem;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        `;

        const name = document.createElement('h2');
        name.textContent = track.name;
        name.style.margin = '0 0 0.5rem 0';

        const bestTime = this.getBestTime(track.id);
        const timeText = document.createElement('p');
        timeText.textContent = bestTime ? `Best: ${ScoreManager.formatTime(bestTime)}` : 'No times set';
        timeText.style.margin = '0';

        button.appendChild(name);
        button.appendChild(timeText);

        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });

        button.addEventListener('click', () => {
            this.hide();
            this.onTrackSelect(track.id);
        });

        return button;
    }

    getBestTime(trackId) {
        const scoreManager = new ScoreManager();
        const bestScore = scoreManager.getBestScore(trackId);
        return bestScore?.totalTime;
    }

    show() {
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
} 