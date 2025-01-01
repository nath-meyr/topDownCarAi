class ScoreManager {
    // Add a new score entry
    addScore(trackId, totalTime, checkpointTimes) {
        const scores = this.loadScores();

        if (!scores[trackId]) {
            scores[trackId] = [];
        }

        const score = {
            date: new Date().toISOString(),
            totalTime: totalTime,
            checkpointTimes: checkpointTimes
        };

        scores[trackId].push(score);
        scores[trackId].sort((a, b) => a.totalTime - b.totalTime); // Sort by best time
        scores[trackId] = scores[trackId].slice(0, 10); // Keep only top 10 scores

        this.saveScores(scores);

        return this.getScorePosition(trackId, totalTime);
    }

    // Get the position of a score in the leaderboard (1-based)
    getScorePosition(trackId, time) {
        const scores = this.loadScores();
        if (!scores[trackId]) return 1;

        // Create a sorted array of all times including the new one
        const allTimes = [...scores[trackId].map(s => s.totalTime)];
        allTimes.push(time);
        allTimes.sort((a, b) => a - b);

        // Find position (1-based index)
        return allTimes.indexOf(time) + 1;
    }

    // Get all scores for a specific track
    getScores(trackId) {
        const scores = this.loadScores();
        return scores[trackId] || [];
    }

    // Load scores from localStorage
    loadScores() {
        try {
            const savedScores = localStorage.getItem('raceScores');
            return savedScores ? JSON.parse(savedScores) : {};
        } catch (error) {
            console.error('Error loading scores:', error);
            return {};
        }
    }

    // Save scores to localStorage
    saveScores(scores) {
        try {
            localStorage.setItem('raceScores', JSON.stringify(scores));
        } catch (error) {
            console.error('Error saving scores:', error);
        }
    }

    // Get the best score for a specific track
    getBestScore(trackId) {
        const scores = this.loadScores();
        return scores[trackId]?.length > 0 ? scores[trackId][0] : null;
    }

    // Format time to display minutes:seconds.milliseconds
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(2);
        return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
    }

    // Clear all scores (useful for testing)
    clearAllScores() {
        this.saveScores({});
    }
} 