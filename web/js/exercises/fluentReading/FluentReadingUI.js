/**
 * FluentReadingUI.js
 * UI integration for Fluent Reading exercise
 */

class FluentReadingUI {
    constructor(app, fluentReadingExercise) {
        this.app = app;
        this.exercise = fluentReadingExercise;
        this.canvas = null;
        this.lastSettings = null;
    }
    
    /**
     * Initialize UI elements
     */
    initialize() {
        // Get canvas element
        this.canvas = document.getElementById('frCanvas');
        
        if (!this.canvas) {
            console.error('Fluent Reading canvas not found');
            return false;
        }
        
        // Setup event listeners
        this.setupUIListeners();
        this.setupExerciseListeners();
        
        return true;
    }
    
    /**
     * Setup UI event listeners
     */
    setupUIListeners() {
        // Back button
        const backBtn = document.getElementById('frBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.handleBack());
        }
        
        // Start button
        const startBtn = document.getElementById('frStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startReading());
        }
        
        // Quit button
        const quitBtn = document.getElementById('frQuitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitReading());
        }
        
        // Speed slider
        const speedSlider = document.getElementById('frSpeed');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.updateSpeedDisplay(e.target.value);
            });
        }
    }
    
    /**
     * Setup exercise event listeners
     */
    setupExerciseListeners() {
        // Time updates
        this.exercise.on('timeUpdate', (data) => {
            this.updateTimeDisplay(data);
        });
        
        // State changes
        this.exercise.on('stateChange', (data) => {
            this.handleStateChange(data);
        });
        
        // Pause/Resume
        this.exercise.on('pause', () => {
            this.handlePause();
        });
        
        this.exercise.on('resume', () => {
            this.handleResume();
        });
        
        // Exercise complete
        this.exercise.on('complete', (results) => {
            this.handleComplete(results);
        });
    }
    
    /**
     * Show the fluent reading screen
     */
    show() {
        this.showSettingsPanel();
        this.resetDisplays();
    }
    
    /**
     * Show settings panel
     */
    showSettingsPanel() {
        const settingsPanel = document.getElementById('frSettingsPanel');
        const gamePanel = document.getElementById('frGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'block';
        if (gamePanel) gamePanel.style.display = 'none';
        
        // Restore last settings if available
        if (this.lastSettings) {
            this.restoreSettingsToUI(this.lastSettings);
        } else {
            // Set default speed
            const speedSlider = document.getElementById('frSpeed');
            if (speedSlider) {
                speedSlider.value = 150;
                this.updateSpeedDisplay(150);
            }
        }
    }
    
    /**
     * Show game panel
     */
    showGamePanel() {
        const settingsPanel = document.getElementById('frSettingsPanel');
        const gamePanel = document.getElementById('frGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'none';
        if (gamePanel) gamePanel.style.display = 'block';
    }
    
    /**
     * Update speed display
     */
    updateSpeedDisplay(speed) {
        const speedValue = document.getElementById('frSpeedValue');
        if (speedValue) {
            speedValue.textContent = `${speed} WPM`;
        }
        
        // Update estimated time
        this.updateEstimatedTime(speed);
    }
    
    /**
     * Update estimated time based on speed
     */
    updateEstimatedTime(speed) {
        const timeEstimate = document.getElementById('frTimeEstimate');
        if (!timeEstimate) return;
        
        // Get total words from narrative (approximate)
        const totalWords = 250; // This will be updated when exercise initializes
        const minutes = Math.ceil(totalWords / speed);
        const timerMinutes = minutes * 2; // Timer is 2x predicted time
        
        timeEstimate.textContent = `Estimated reading time: ${minutes} minute${minutes !== 1 ? 's' : ''} (Timer: ${timerMinutes} minutes)`;
    }
    
    /**
     * Start the reading exercise
     */
    async startReading() {
        // Get settings from UI
        const settings = this.getSettingsFromUI();
        this.lastSettings = settings;
        
        // Show game panel
        this.showGamePanel();
        
        // Initialize and start the exercise
        await this.exercise.initializeGame(this.canvas, settings);
        
        // Update time estimate with actual word count
        const totalWords = this.exercise.totalWords;
        const minutes = Math.ceil(totalWords / settings.speed);
        console.log(`Starting Fluent Reading: ${totalWords} words at ${settings.speed} WPM (~${minutes} minutes)`);
        
        this.exercise.start();
    }
    
    /**
     * Get settings from UI controls
     */
    getSettingsFromUI() {
        const speed = parseInt(document.getElementById('frSpeed')?.value) || 150;
        const difficulty = document.getElementById('frDifficulty')?.value || 'moderate';
        
        return {
            speed: speed,
            difficulty: difficulty
        };
    }
    
    /**
     * Restore settings to UI controls
     */
    restoreSettingsToUI(settings) {
        const speedSlider = document.getElementById('frSpeed');
        if (speedSlider) {
            speedSlider.value = settings.speed;
            this.updateSpeedDisplay(settings.speed);
        }
        
        const difficultySelect = document.getElementById('frDifficulty');
        if (difficultySelect) {
            difficultySelect.value = settings.difficulty || 'moderate';
        }
    }
    
    /**
     * Quit the reading exercise
     */
    quitReading() {
        if (confirm('Are you sure you want to quit the reading exercise?')) {
            this.exercise.end();
            this.showSettingsPanel();
        }
    }
    
    /**
     * Handle back button
     */
    handleBack() {
        if (this.exercise.state === 'active' || this.exercise.state === 'paused') {
            if (confirm('Are you sure you want to quit the reading exercise?')) {
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
     * Update time display
     */
    updateTimeDisplay(data) {
        // Time is displayed in canvas header
    }
    
    /**
     * Handle state changes
     */
    handleStateChange(data) {
        console.log('State changed:', data);
    }
    
    /**
     * Handle pause
     */
    handlePause() {
        console.log('Reading paused');
    }
    
    /**
     * Handle resume
     */
    handleResume() {
        console.log('Reading resumed');
    }
    
    /**
     * Handle exercise completion
     */
    handleComplete(results) {
        // Record score
        const settings = this.lastSettings || this.getSettingsFromUI();
        
        // Use completion rate as the score
        this.app.scoreManager.recordScore(
            'fluent_reading',
            settings.speed, // Use speed as difficulty
            results.completionRate,
            100 // Out of 100%
        );
        
        // Show results
        this.showResults(results);
    }
    
    /**
     * Show results screen
     */
    showResults(results) {
        // Update results display
        document.getElementById('finalScore').textContent = results.completionRate || 0;
        document.getElementById('finalTotal').textContent = '100';
        
        const percentage = results.completionRate || 0;
        document.getElementById('percentage').textContent = `${percentage}%`;
        
        // Generate message
        let message = '';
        if (percentage >= 100) {
            message = 'Excellent! You completed the entire passage!';
        } else if (percentage >= 75) {
            message = 'Great job! You read most of the passage.';
        } else if (percentage >= 50) {
            message = 'Good effort! Keep practicing to improve your reading speed.';
        } else {
            message = 'Keep practicing! Reading fluency improves with time.';
        }
        document.getElementById('resultsMessage').textContent = message;
        
        // Create summary
        const summaryList = document.getElementById('resultsSummary');
        summaryList.innerHTML = `
            <li class="result-item">
                <strong>Words Read:</strong> ${results.wordsRead || 0}
            </li>
            <li class="result-item">
                <strong>Total Words:</strong> ${results.totalWords || 0}
            </li>
            <li class="result-item">
                <strong>Completion Rate:</strong> ${percentage}%
            </li>
            <li class="result-item">
                <strong>Average Speed:</strong> ${results.averageWPM || 0} WPM
            </li>
            <li class="result-item">
                <strong>Target Speed:</strong> ${this.lastSettings?.speed || 150} WPM
            </li>
        `;
        
        // Store exercise type for retry
        this.app.currentExerciseType = 'fluent_reading';
        
        // Show results screen
        this.app.showScreen('resultsScreen');
    }
    
    /**
     * Reset displays
     */
    resetDisplays() {
        // Reset speed to default if no last settings
        const speedSlider = document.getElementById('frSpeed');
        if (speedSlider && !this.lastSettings) {
            speedSlider.value = 150;
            this.updateSpeedDisplay(150);
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

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FluentReadingUI;
}
