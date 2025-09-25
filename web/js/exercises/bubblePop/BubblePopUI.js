/**
 * BubblePopUI.js
 * UI integration for Bubble Pop game
 */

class BubblePopUI {
    constructor(app, bubblePopExercise) {
        this.app = app;
        this.exercise = bubblePopExercise;
        this.canvas = null;
        this.isInstructionsShown = false;
    }
    
    /**
     * Initialize UI elements
     */
    initialize() {
        // Get canvas element
        this.canvas = document.getElementById('bpCanvas');
        
        if (!this.canvas) {
            console.error('Bubble Pop canvas not found');
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
        const backBtn = document.getElementById('bpBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.handleBack();
            });
        }
        
        // Start button
        const startBtn = document.getElementById('bpStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Quit button (during game)
        const quitBtn = document.getElementById('bpQuitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                this.quitGame();
            });
        }
        
        // Instructions button
        const instructionsBtn = document.getElementById('bpInstructionsBtn');
        if (instructionsBtn) {
            instructionsBtn.addEventListener('click', () => {
                this.toggleInstructions();
            });
        }
        
        // Instructions overlay close
        const closeInstructions = document.getElementById('bpCloseInstructions');
        if (closeInstructions) {
            closeInstructions.addEventListener('click', () => {
                this.hideInstructions();
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
     * Show the bubble pop screen
     */
    show() {
        // Show settings panel initially
        this.showSettingsPanel();
        
        // Reset displays
        this.resetDisplays();
    }
    
    /**
     * Show settings panel
     */
    showSettingsPanel() {
        const settingsPanel = document.getElementById('bpSettingsPanel');
        const gamePanel = document.getElementById('bpGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'block';
        if (gamePanel) gamePanel.style.display = 'none';
        
        // Show instructions by default
        this.showInstructions();
    }
    
    /**
     * Show game panel
     */
    showGamePanel() {
        const settingsPanel = document.getElementById('bpSettingsPanel');
        const gamePanel = document.getElementById('bpGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'none';
        if (gamePanel) gamePanel.style.display = 'block';
    }
    
    /**
     * Start the game
     */
    async startGame() {
        // Get settings from UI
        const settings = this.getSettingsFromUI();
        
        // Hide instructions
        this.hideInstructions();
        
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
        const duration = parseInt(document.getElementById('bpDuration')?.value || 60);
        const speed = parseInt(document.getElementById('bpSpeed')?.value || 50);
        const tortuosity = parseInt(document.getElementById('bpTortuosity')?.value || 50);
        const spellingErrorRate = parseInt(document.getElementById('bpErrorRate')?.value || 30);
        
        // Determine difficulty based on speed
        let difficulty = 'medium';
        if (speed <= 33) difficulty = 'easy';
        else if (speed > 66) difficulty = 'hard';
        
        return {
            duration,
            speed,
            tortuosity,
            spellingErrorRate,
            difficulty
        };
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
     * Toggle instructions display
     */
    toggleInstructions() {
        if (this.isInstructionsShown) {
            this.hideInstructions();
        } else {
            this.showInstructions();
        }
    }
    
    /**
     * Show instructions
     */
    showInstructions() {
        const overlay = document.getElementById('bpInstructionsOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.isInstructionsShown = true;
        }
    }
    
    /**
     * Hide instructions
     */
    hideInstructions() {
        const overlay = document.getElementById('bpInstructionsOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            this.isInstructionsShown = false;
        }
    }
    
    /**
     * Update score display
     */
    updateScoreDisplay(data) {
        const rightEl = document.getElementById('bpScoreRight');
        const wrongEl = document.getElementById('bpScoreWrong');
        const missedEl = document.getElementById('bpScoreMissed');
        
        if (rightEl) rightEl.textContent = data.right;
        if (wrongEl) wrongEl.textContent = data.wrong;
        if (missedEl) missedEl.textContent = data.missed;
    }
    
    /**
     * Update time display
     */
    updateTimeDisplay(data) {
        const timeEl = document.getElementById('bpTimeRemaining');
        if (timeEl) {
            const minutes = Math.floor(data.remaining / 60);
            const seconds = data.remaining % 60;
            timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Handle state changes
     */
    handleStateChange(data) {
        if (data.newState === 'paused') {
            // Show pause overlay
            const pauseOverlay = document.getElementById('bpPauseOverlay');
            if (pauseOverlay) pauseOverlay.style.display = 'flex';
        } else if (data.oldState === 'paused' && data.newState === 'active') {
            // Hide pause overlay
            const pauseOverlay = document.getElementById('bpPauseOverlay');
            if (pauseOverlay) pauseOverlay.style.display = 'none';
        }
    }
    
    /**
     * Handle exercise completion
     */
    handleComplete(results) {
        // Record score
        const settings = this.getSettingsFromUI();
        this.app.scoreManager.recordScore(
            'bubble_pop',
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
        document.getElementById('finalScore').textContent = results.gameScore.right;
        document.getElementById('finalTotal').textContent = results.bubbleCount;
        document.getElementById('percentage').textContent = `${results.percentage}%`;
        document.getElementById('resultsMessage').textContent = results.message;
        
        // Create summary for bubble pop
        const summaryList = document.getElementById('resultsSummary');
        summaryList.innerHTML = `
            <li class="result-item">
                <strong>Correct:</strong> ${results.gameScore.right} bubbles
            </li>
            <li class="result-item">
                <strong>Wrong:</strong> ${results.gameScore.wrong} bubbles
            </li>
            <li class="result-item">
                <strong>Missed:</strong> ${results.gameScore.missed} bubbles
            </li>
            <li class="result-item">
                <strong>Total Bubbles:</strong> ${results.bubbleCount}
            </li>
            <li class="result-item">
                <strong>Time Played:</strong> ${results.timeSpent} seconds
            </li>
            <li class="result-item">
                <strong>Accuracy:</strong> ${results.percentage}%
            </li>
        `;
        
        // Store current exercise type for retry
        this.app.currentExerciseType = 'bubble_pop';
        
        // Show results screen
        this.app.showScreen('resultsScreen');
    }
    
    /**
     * Reset displays
     */
    resetDisplays() {
        // Reset scores
        const rightEl = document.getElementById('bpScoreRight');
        const wrongEl = document.getElementById('bpScoreWrong');
        const missedEl = document.getElementById('bpScoreMissed');
        
        if (rightEl) rightEl.textContent = '0';
        if (wrongEl) wrongEl.textContent = '0';
        if (missedEl) missedEl.textContent = '0';
        
        // Reset time
        const timeEl = document.getElementById('bpTimeRemaining');
        if (timeEl) timeEl.textContent = '1:00';
        
        // Reset settings to defaults
        const durationEl = document.getElementById('bpDuration');
        const speedEl = document.getElementById('bpSpeed');
        const tortuosityEl = document.getElementById('bpTortuosity');
        const errorRateEl = document.getElementById('bpErrorRate');
        
        if (durationEl) durationEl.value = '60';
        if (speedEl) speedEl.value = '50';
        if (tortuosityEl) tortuosityEl.value = '50';
        if (errorRateEl) errorRateEl.value = '30';
        
        // Update range displays
        this.updateRangeDisplays();
    }
    
    /**
     * Update range slider displays
     */
    updateRangeDisplays() {
        const speedValue = document.getElementById('bpSpeedValue');
        const tortuosityValue = document.getElementById('bpTortuosityValue');
        const errorRateValue = document.getElementById('bpErrorRateValue');
        
        const speedSlider = document.getElementById('bpSpeed');
        const tortuositySlider = document.getElementById('bpTortuosity');
        const errorRateSlider = document.getElementById('bpErrorRate');
        
        if (speedValue && speedSlider) {
            speedValue.textContent = speedSlider.value;
        }
        if (tortuosityValue && tortuositySlider) {
            tortuosityValue.textContent = tortuositySlider.value;
        }
        if (errorRateValue && errorRateSlider) {
            errorRateValue.textContent = errorRateSlider.value + '%';
        }
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
    module.exports = BubblePopUI;
}
