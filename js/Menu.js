class Menu {
    constructor(onTrackSelect) {
        this.container = this.createContainer();
        this.onTrackSelect = onTrackSelect;
        this.scoreManager = new ScoreManager();
        this.isVisible = true;
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
            max-width: 1200px;
            width: 90%;
        `;

        const title = document.createElement('h1');
        title.textContent = 'Select Circuit';
        title.style.marginBottom = '2rem';

        menuContent.appendChild(title);

        const trackGrid = document.createElement('div');
        trackGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
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
            min-height: 200px;
            display: flex;
            flex-direction: column;
        `;

        const name = document.createElement('h2');
        name.textContent = track.name;
        name.style.margin = '0 0 1rem 0';

        // Create scores container
        const scoresContainer = document.createElement('div');
        scoresContainer.style.cssText = `
            flex-grow: 1;
            text-align: left;
            font-size: 0.9rem;
            opacity: 0.8;
        `;

        // Get top 5 scores for this track
        const scores = this.scoreManager.getScores(track.id).slice(0, 5);
        if (scores.length > 0) {
            const scoresList = document.createElement('div');
            scoresList.style.marginBottom = '1rem';

            // Add "Best Times" header
            const header = document.createElement('h3');
            header.textContent = 'Best Times:';
            header.style.margin = '0 0 0.5rem 0';
            header.style.fontSize = '1rem';
            scoresContainer.appendChild(header);

            // Add scores
            scores.forEach((score, index) => {
                const scoreElement = document.createElement('div');
                scoreElement.style.margin = '0.2rem 0';
                scoreElement.innerHTML = `
                    <span style="color: gold;">${index + 1}.</span> 
                    ${ScoreManager.formatTime(score.totalTime)}
                    <span style="opacity: 0.6;"> • ${this.formatDate(score.date)}</span>
                `;
                scoresContainer.appendChild(scoreElement);
            });
        } else {
            const noScores = document.createElement('p');
            noScores.textContent = 'No times set';
            noScores.style.opacity = '0.5';
            noScores.style.fontStyle = 'italic';
            scoresContainer.appendChild(noScores);
        }

        button.appendChild(name);
        button.appendChild(scoresContainer);

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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    }

    show() {
        // Refresh the menu content to show updated scores
        this.container.innerHTML = '';
        this.createMenu();
        this.container.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    isMenuVisible() {
        return this.isVisible;
    }

    updateScores() {
        this.container.innerHTML = '';
        this.createMenu();
    }
} 