class ScoreManager {
    constructor() {
        this.scores = {};
        this.loadScores();
    }

    // Add a new score entry
    addScore(trackId, totalTime, checkpointTimes) {
        if (!this.scores[trackId]) {
            this.scores[trackId] = [];
        }

        const score = {
            date: new Date().toISOString(),
            totalTime: totalTime,
            checkpointTimes: checkpointTimes
        };

        this.scores[trackId].push(score);
        this.scores[trackId].sort((a, b) => a.totalTime - b.totalTime); // Sort by best time
        this.scores[trackId] = this.scores[trackId].slice(0, 10); // Keep only top 10 scores

        // Save scores immediately after adding a new one
        this.saveScores();

        return this.getScorePosition(trackId, totalTime);
    }

    // Get the position of a score in the leaderboard (1-based)
    getScorePosition(trackId, time) {
        if (!this.scores[trackId]) return 1;
        return this.scores[trackId].findIndex(score => score.totalTime === time) + 1;
    }

    // Get all scores for a specific track
    getScores(trackId) {
        return this.scores[trackId] || [];
    }

    // Load scores from localStorage
    loadScores() {
        try {
            const savedScores = localStorage.getItem('raceScores');
            if (savedScores) {
                this.scores = JSON.parse(savedScores);
            }
        } catch (error) {
            console.error('Error loading scores:', error);
            this.scores = {};
        }
    }

    // Save scores to localStorage
    saveScores() {
        try {
            localStorage.setItem('raceScores', JSON.stringify(this.scores));
        } catch (error) {
            console.error('Error saving scores:', error);
        }
    }

    // Get the best score for a specific track
    getBestScore(trackId) {
        return this.scores[trackId]?.length > 0 ? this.scores[trackId][0] : null;
    }

    // Format time to display minutes:seconds.milliseconds
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(2);
        return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
    }

    // Clear all scores (useful for testing)
    clearAllScores() {
        this.scores = {};
        this.saveScores();
    }
} 