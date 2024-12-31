class ScoreManager {
    constructor() {
        this.scores = this.loadScores();
    }

    // Add a new score entry
    addScore(totalTime, checkpointTimes) {
        const score = {
            date: new Date().toISOString(),
            totalTime: totalTime,
            checkpointTimes: checkpointTimes
        };

        this.scores.push(score);
        this.scores.sort((a, b) => a.totalTime - b.totalTime); // Sort by best time
        this.scores = this.scores.slice(0, 10); // Keep only top 10 scores
        this.saveScores();

        return this.getScorePosition(totalTime);
    }

    // Get the position of a score in the leaderboard (1-based)
    getScorePosition(time) {
        return this.scores.findIndex(score => score.totalTime === time) + 1;
    }

    // Get all scores
    getScores() {
        return this.scores;
    }

    // Load scores from localStorage
    loadScores() {
        const savedScores = localStorage.getItem('raceScores');
        return savedScores ? JSON.parse(savedScores) : [];
    }

    // Save scores to localStorage
    saveScores() {
        localStorage.setItem('raceScores', JSON.stringify(this.scores));
    }

    // Get the best score
    getBestScore() {
        return this.scores.length > 0 ? this.scores[0] : null;
    }

    // Format time to display minutes:seconds.milliseconds
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(2);
        return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
    }
} 