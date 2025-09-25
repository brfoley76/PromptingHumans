/**
 * SpeedReadingUI.js
 * UI integration for Speed Reading game
 */

class SpeedReadingUI {
    constructor(app, speedReadingExercise) {
        this.app = app;
        this.exercise = speedReadingExercise;
        this.canvas = null;
        this.lastSettings = null; // Store last used settings for retry
    }
    
    /**
     * Initialize UI elements
     */
    initialize() {
        // Get canvas element
        this.canvas = document.getElementById('srCanvas');
        
        if (!this.canvas) {
            console.error('Speed Reading canvas not found');
            return false;
        }
        
        // Setup event listeners for UI controls
        this.setupUIListeners();
        
        // Setup exercise event listeners
        this.setupExerciseListeners();
        
        return true;
    }
    
    /**
     * Setup UI event listeners
     */
    setupUIListeners() {
        // Back button
        const backBtn = document.getElementById('srBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.handleBack();
            });
        }
        
        // Start button
        const startBtn = document.getElementById('srStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Quit button (during game)
        const quitBtn = document.getElementById('srQuitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                this.quitGame();
            });
        }
        
        // Difficulty change handler
        const difficultySelect = document.getElementById('srDifficulty');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', () => {
                this.updateDifficultyDescription();
            });
        }
    }
    
    /**
     * Setup exercise event listeners
     */
    setupExerciseListeners() {
        // Score updates
        this.exercise.on('scoreUpdate', (data) => {
            this.updateScoreDisplay(data);
        });
        
        // Time updates
        this.exercise.on('timeUpdate', (data) => {
            this.updateTimeDisplay(data);
        });
        
        // State changes
        this.exercise.on('stateChange', (data) => {
            this.handleStateChange(data);
        });
        
        // Exercise complete
        this.exercise.on('complete', (results) => {
            this.handleComplete(results);
        });
    }
    
    /**
     * Show the speed reading screen
     */
    show() {
        // Show settings panel initially
        this.showSettingsPanel();
        
        // Update difficulty description
        this.updateDifficultyDescription();
        
        // Reset displays
        this.resetDisplays();
    }
    
    /**
     * Show settings panel
     */
    showSettingsPanel() {
        const settingsPanel = document.getElementById('srSettingsPanel');
        const gamePanel = document.getElementById('srGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'block';
        if (gamePanel) gamePanel.style.display = 'none';
        
        // Restore last settings if available
        if (this.lastSettings) {
            this.restoreSettingsToUI(this.lastSettings);
        }
    }
    
    /**
     * Show game panel
     */
    showGamePanel() {
        const settingsPanel = document.getElementById('srSettingsPanel');
        const gamePanel = document.getElementById('srGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'none';
        if (gamePanel) gamePanel.style.display = 'block';
    }
    
    /**
     * Update difficulty description
     */
    updateDifficultyDescription() {
        const difficulty = document.getElementById('srDifficulty')?.value || 'easy';
        const descEl = document.getElementById('srDifficultyDesc');
        
        if (!descEl) return;
        
        let description = '';
        switch (difficulty) {
            case 'easy':
                description = 'Vocabulary variant - Identify incorrect vocabulary words at a comfortable pace';
                break;
            case 'moderate':
                description = 'Spelling variant - Identify spelling errors at 20% faster speed';
                break;
            case 'hard':
                description = 'Both variants - Identify both vocabulary and spelling errors at 40% faster speed';
                break;
        }
        
        descEl.textContent = description;
    }
    
    /**
     * Start the game
     */
    async startGame() {
        // Get settings from UI or use last settings if available
        const settings = this.lastSettings || this.getSettingsFromUI();
        
        // Store settings for retry
        this.lastSettings = settings;
        
        // Show game panel
        this.showGamePanel();
        
        // Initialize the exercise with canvas and settings
        await this.exercise.initializeGame(this.canvas, settings);
        
        // Start the exercise
        this.exercise.start();
    }
    
    /**
     * Get settings from UI controls
     */
    getSettingsFromUI() {
        const difficulty = document.getElementById('srDifficulty')?.value || 'easy';
        
        return {
            difficulty
        };
    }
    
    /**
     * Restore settings to UI controls
     */
    restoreSettingsToUI(settings) {
        const difficultyEl = document.getElementById('srDifficulty');
        
        if (difficultyEl) difficultyEl.value = settings.difficulty;
        
        this.updateDifficultyDescription();
    }
    
    /**
     * Quit the game
     */
    quitGame() {
        if (confirm('Are you sure you want to quit the game?')) {
            this.exercise.end();
            this.showSettingsPanel();
        }
    }
    
    /**
     * Handle back button
     */
    handleBack() {
        if (this.exercise.state === 'active' || this.exercise.state === 'paused') {
            if (confirm('Are you sure you want to quit the game?')) {
                this.exercise.end();
                this.app.showScreen('selectionScreen');
                this.app.updateExerciseCards();
            }
        } else {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        }
    }
    
    /**
     * Update score display
     */
    updateScoreDisplay(data) {
        // Score is displayed in the canvas header, no separate UI elements needed
        // The exercise handles this internally
    }
    
    /**
     * Update time display
     */
    updateTimeDisplay(data) {
        // Time is displayed in the canvas header, no separate UI elements needed
        // The exercise handles this internally
    }
    
    /**
     * Handle state changes
     */
    handleStateChange(data) {
        if (data.newState === 'paused') {
            // Could show pause overlay if needed
        } else if (data.oldState === 'paused' && data.newState === 'active') {
            // Hide pause overlay if implemented
        }
    }
    
    /**
     * Handle exercise completion
     */
    handleComplete(results) {
        // Record score using the stored settings
        const settings = this.lastSettings || this.getSettingsFromUI();
        this.app.scoreManager.recordScore(
            'speed_reading',
            settings.difficulty,
            results.score,
            results.total
        );
        
        // Show results
        this.showResults(results);
    }
    
    /**
     * Show results screen
     */
    showResults(results) {
        // Update results display
        document.getElementById('finalScore').textContent = results.gameScore.correct;
        document.getElementById('finalTotal').textContent = results.gameScore.totalFragments;
        
        const accuracy = results.total > 0 
            ? Math.round((results.gameScore.correct / (results.gameScore.correct + results.gameScore.wrong)) * 100)
            : 0;
        document.getElementById('percentage').textContent = `${accuracy}%`;
        
        // Generate message based on performance
        let message = '';
        if (results.completionRate === 100) {
            message = 'Excellent! You completed the entire passage!';
        } else if (results.completionRate >= 75) {
            message = 'Great job! You made good progress through the passage.';
        } else if (results.completionRate >= 50) {
            message = 'Good effort! Keep practicing to improve your speed.';
        } else {
            message = 'Keep practicing! Speed reading takes time to master.';
        }
        document.getElementById('resultsMessage').textContent = message;
        
        // Create summary for speed reading
        const summaryList = document.getElementById('resultsSummary');
        summaryList.innerHTML = `
            <li class="result-item">
                <strong>Correct Selections:</strong> ${results.gameScore.correct}
            </li>
            <li class="result-item">
                <strong>Wrong Selections:</strong> ${results.gameScore.wrong}
            </li>
            <li class="result-item">
                <strong>Completion Rate:</strong> ${results.completionRate}%
            </li>
            <li class="result-item">
                <strong>Time Used:</strong> ${Math.floor(results.timeUsed / 60)}:${(results.timeUsed % 60).toString().padStart(2, '0')}
            </li>
            <li class="result-item">
                <strong>Accuracy:</strong> ${accuracy}%
            </li>
        `;
        
        // Store current exercise type for retry
        this.app.currentExerciseType = 'speed_reading';
        
        // Show results screen
        this.app.showScreen('resultsScreen');
    }
    
    /**
     * Reset displays
     */
    resetDisplays() {
        // Reset difficulty to default
        const difficultyEl = document.getElementById('srDifficulty');
        if (difficultyEl && !this.lastSettings) {
            difficultyEl.value = 'easy';
        }
        
        // Update difficulty description
        this.updateDifficultyDescription();
    }
    
    /**
     * Clean up
     */
    destroy() {
        if (this.exercise) {
            this.exercise.destroy();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeedReadingUI;
}
