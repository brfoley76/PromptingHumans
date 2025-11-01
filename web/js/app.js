/**
 * Main Application Controller
 */

class Config {
    static isDev() {
        // Check URL parameter or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('dev') || localStorage.getItem('devMode') === 'true';
    }
    
    static setDevMode(enabled) {
        if (enabled) {
            localStorage.setItem('devMode', 'true');
        } else {
            localStorage.removeItem('devMode');
        }
    }
}

/**
 * Default exercise settings
 * Used when agent controls difficulty (non-dev mode)
 */
const EXERCISE_DEFAULTS = {
    multiple_choice: {
        numQuestions: 10,
        difficulty: '4' // Medium (4 choices)
    },
    fill_in_the_blank: {
        numQuestions: 10,
        difficulty: 'easy'
    },
    spelling: {
        numQuestions: 10,
        difficulty: 'easy'
    },
    bubble_pop: {
        duration: 120, // 2 minutes
        difficulty: 'easy',
        errorRate: 30
    },
    fluent_reading: {
        speed: 150, // WPM
        difficulty: 'moderate'
    }
};

/**
 * Agent introduction messages for each exercise/difficulty
 */
const AGENT_INSTRUCTIONS = {
    multiple_choice: {
        '3': "Hi! Let's practice matching definitions! You'll see a definition and pick the correct word from 3 choices. Click the screen when you're ready to start!",
        '4': "Ready for some vocabulary practice? You'll match definitions with words, choosing from 4 options. Take your time and click to begin!",
        '5': "Time for a challenge! Match definitions with the correct words from 5 choices. This will test your vocabulary knowledge. Click when ready!"
    },
    fill_in_the_blank: {
        'easy': "Let's fill in the blanks! Drag the correct words to complete each definition. Only the words you need are available. Click to start!",
        'moderate': "Fill in the blank time! Drag words to complete definitions. All vocabulary words are available, so choose carefully. Ready? Click to begin!"
    },
    spelling: {
        'easy': "Spelling practice! I'll show you a definition and you type the word. Don't worry, I'll help if you need it. Click to start!",
        'medium': "Let's work on spelling! Type the correct word for each definition. You'll get one hint if needed. Click when ready!",
        'hard': "Spelling challenge! Type the correct spelling for each definition. No hints this time - you've got this! Click to begin!"
    },
    bubble_pop: {
        'easy': "Bubble Pop! Hover over bubbles and press Q when you see a correctly spelled word. Misspelled words will float away. Click to start!",
        'moderate': "Bubble Pop time! Hover over bubbles and press R when you see a misspelled word. Correctly spelled words float away on their own. Ready? Click!",
        'hard': "Advanced Bubble Pop! Use Q for correct spellings and R for incorrect ones. Watch carefully - they move fast! Click to begin!"
    },
    fluent_reading: {
        'easy': "Fluent Reading practice! Text will stream across the screen at a comfortable pace. Click any word to highlight it. Click to start!",
        'moderate': "Let's practice reading fluency! Words will stream at a moderate pace. Click words to highlight them and track your reading. Ready? Click!",
        'hard': "Fluent Reading challenge! Text streams quickly - keep up and click words to highlight. This will test your reading speed! Click to begin!"
    }
};

class App {
    constructor() {
        this.curriculumManager = new CurriculumManager();
        this.scoreManager = new ScoreManager();
        
        // Initialize backend integration
        this.apiClient = new APIClient();
        this.sessionManager = new SessionManager(this.apiClient, this.scoreManager);
        this.wsClient = new WebSocketClient();
        // Floating widgets removed - using embedded chat only
        // this.chatWidget = new ChatWidget(this.wsClient);
        // this.activityChatWidget = new ActivityChatWidget(this.wsClient);
        
        // Initialize Multiple Choice with new modular pattern
        this.multipleChoiceExercise = new MultipleChoiceExercise(this.curriculumManager);
        this.multipleChoiceUI = new MultipleChoiceUI(this, this.multipleChoiceExercise);
        
        // Initialize Fill in the Blank with new modular pattern
        this.fillInBlankExercise = new FillInBlankExercise(this.curriculumManager);
        this.fillInBlankUI = new FillInBlankUI(this, this.fillInBlankExercise);
        
        // Initialize Spelling with new modular pattern
        this.spellingExercise = new SpellingExercise(this.curriculumManager);
        this.spellingUI = new SpellingUI(this, this.spellingExercise);
        
        // Initialize Bubble Pop game
        this.bubblePopExercise = new BubblePopExercise(this.curriculumManager);
        this.bubblePopUI = new BubblePopUI(this, this.bubblePopExercise);
        
        // Initialize Fluent Reading exercise
        this.fluentReadingExercise = new FluentReadingExercise(this.curriculumManager);
        this.fluentReadingUI = new FluentReadingUI(this, this.fluentReadingExercise);
        
        this.currentExercise = null;
        this.currentExerciseType = null;
        this.selectedAnswer = null;
        this.isDevMode = Config.isDev();
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Initialize backend session manager
        await this.sessionManager.initialize();
        
        // Floating widgets removed - using embedded chat only
        // this.chatWidget.initialize();
        // this.activityChatWidget.initialize();
        
        // Load curriculum data
        await this.curriculumManager.loadCurriculum();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Debug: Log dev mode status
        console.log('Dev Mode Status:', this.isDevMode);
        console.log('URL:', window.location.href);
        console.log('URL Params:', window.location.search);
        
        // Initialize dev mode if enabled
        if (this.isDevMode) {
            console.log('Initializing dev mode...');
            this.initializeDevMode();
        }
        
        // Check if user exists
        if (this.scoreManager.hasUser()) {
            this.showUserInfo();
            
            // Attempt to restore backend session
            await this.restoreBackendSession();
            
            this.showScreen('selectionScreen');
            this.updateExerciseCards();
        } else {
            this.showScreen('registrationScreen');
        }
    }

    /**
     * Initialize dev mode features
     */
    initializeDevMode() {
        console.log('initializeDevMode called');
        
        // Add body class for CSS
        document.body.classList.add('dev-mode');
        
        // Create and show dev panel
        this.createDevPanel();
        
        // Add dev mode indicator
        const header = document.querySelector('.header');
        console.log('Header element:', header);
        
        if (header) {
            // Check if indicator already exists
            if (!header.querySelector('.dev-indicator')) {
                const devIndicator = document.createElement('div');
                devIndicator.className = 'dev-indicator';
                devIndicator.textContent = 'DEV MODE';
                header.appendChild(devIndicator);
                console.log('Dev indicator added');
            }
        } else {
            console.error('Header element not found!');
        }
    }

    /**
     * Create dev panel
     */
    createDevPanel() {
        const devPanel = document.createElement('div');
        devPanel.id = 'devPanel';
        devPanel.className = 'dev-panel';
        devPanel.innerHTML = `
            <div class="dev-panel-header">
                <h3>Dev Tools</h3>
                <button class="dev-panel-toggle" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">_</button>
            </div>
            <div class="dev-panel-content">
                <div class="dev-section">
                    <h4>Data Management</h4>
                    <button id="clearDataBtn" class="dev-btn">Clear All Data</button>
                    <button id="unlockAllBtn" class="dev-btn">Unlock All Exercises</button>
                </div>
                <div class="dev-section">
                    <h4>Exercise Locks</h4>
                    <div id="exerciseLocks"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(devPanel);
        
        // Set up dev panel event listeners
        this.setupDevPanelListeners();
        this.updateDevPanel();
    }

    /**
     * Set up dev panel event listeners
     */
    setupDevPanelListeners() {
        const clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                    this.scoreManager.resetUserData();
                    window.location.reload();
                }
            });
        }
        
        const unlockBtn = document.getElementById('unlockAllBtn');
        if (unlockBtn) {
            unlockBtn.addEventListener('click', () => {
                this.scoreManager.unlockAllExercises();
                this.updateExerciseCards();
                this.updateDevPanel();
            });
        }
    }

    /**
     * Update dev panel with current exercise lock status
     */
    updateDevPanel() {
        if (!this.isDevMode) return;
        
        const locksContainer = document.getElementById('exerciseLocks');
        if (!locksContainer) return;
        
        const exercises = ['multiple_choice', 'fill_in_the_blank', 'spelling', 'bubble_pop', 'fluent_reading'];
        const exerciseNames = {
            'multiple_choice': 'Multiple Choice',
            'fill_in_the_blank': 'Fill in the Blank',
            'spelling': 'Spelling',
            'bubble_pop': 'Bubble Pop',
            'fluent_reading': 'Fluent Reading'
        };
        
        locksContainer.innerHTML = '';
        
        exercises.forEach(exerciseType => {
            const isUnlocked = this.scoreManager.isExerciseUnlocked(exerciseType);
            const lockDiv = document.createElement('div');
            lockDiv.className = 'exercise-lock-item';
            lockDiv.innerHTML = `
                <span>${exerciseNames[exerciseType]}</span>
                <button class="lock-toggle ${isUnlocked ? 'unlocked' : 'locked'}" 
                        data-exercise="${exerciseType}">
                    ${isUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                </button>
            `;
            locksContainer.appendChild(lockDiv);
        });
        
        // Add click handlers for lock toggles
        locksContainer.querySelectorAll('.lock-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exerciseType = e.target.getAttribute('data-exercise');
                const newStatus = this.scoreManager.toggleExerciseLock(exerciseType);
                e.target.textContent = newStatus ? '🔓 Unlocked' : '🔒 Locked';
                e.target.className = `lock-toggle ${newStatus ? 'unlocked' : 'locked'}`;
                this.updateExerciseCards();
            });
        });
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Registration
        const studentNameInput = document.getElementById('studentName');
        const registerBtn = document.getElementById('registerBtn');
        
        studentNameInput.addEventListener('input', (e) => {
            registerBtn.disabled = e.target.value.trim().length === 0;
        });
        
        registerBtn.addEventListener('click', () => {
            this.registerUser();
        });
        
        studentNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !registerBtn.disabled) {
                this.registerUser();
            }
        });

        // Exercise Selection - Old card buttons (for backward compatibility)
        document.querySelectorAll('[data-exercise-btn]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exerciseType = e.target.getAttribute('data-exercise-btn');
                this.selectExercise(exerciseType);
            });
        });
        
        // New Layout - Activity Icon clicks
        document.querySelectorAll('.activity-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                // Don't trigger if clicking on a locked icon
                if (icon.classList.contains('locked')) {
                    const exerciseType = icon.getAttribute('data-exercise');
                    alert('This exercise is locked. Complete previous exercises to unlock it!');
                    return;
                }
                
                const exerciseType = icon.getAttribute('data-exercise');
                this.selectExercise(exerciseType);
            });
        });
        
        // Chat Tab Switching
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = tab.getAttribute('data-tab');
                this.switchChatTab(tabName);
            });
        });

        // Multiple Choice Exercise - handled by UI wrapper
        // Fill in the Blank Exercise - handled by UI wrapper
        // Spelling Exercise - handled by UI wrapper
        // Event listeners are set up in their respective UI constructors

        // Results Screen
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.showScreen('selectionScreen');
            this.updateExerciseCards();
        });
        
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.retryExercise();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
        
        // Main Tutor Chat
        const mainChatSend = document.getElementById('mainChatSend');
        const mainChatInput = document.getElementById('mainChatInput');
        
        if (mainChatSend) {
            mainChatSend.addEventListener('click', () => {
                this.sendMainChatMessage();
            });
        }
        
        if (mainChatInput) {
            mainChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMainChatMessage();
                }
            });
        }
        
        // Setup WebSocket listener for main tutor messages
        this.setupMainTutorListener();
    }

    /**
     * Register a new user
     */
    async registerUser() {
        const username = document.getElementById('studentName').value.trim();
        
        // Validate username
        if (!this.scoreManager.validateUsername(username)) {
            alert('Username must contain only letters and numbers (no spaces or special characters)');
            return;
        }
        
        if (username) {
            try {
                // Create backend session (which will also set up ScoreManager)
                const sessionResult = await this.sessionManager.createSession(username);
            
                if (sessionResult.tutorGreeting) {
                    console.log('Tutor greeting:', sessionResult.tutorGreeting);
                    // Display LLM tutor greeting in main chat
                    this.sendToFixedChat('main', sessionResult.tutorGreeting, 'agent');
                }
                
                if (sessionResult.offline) {
                    console.log('Running in offline mode');
                } else {
                    console.log('Connected to backend, session ID:', sessionResult.sessionId);
                    if (sessionResult.isReturningStudent) {
                        console.log('Welcome back! Progress restored.');
                    }
                    // Connect WebSocket
                    this.wsClient.connect(sessionResult.sessionId);
                }
                
                this.showUserInfo();
                this.showScreen('selectionScreen');
                this.updateExerciseCards();
            } catch (error) {
                alert(error.message);
            }
        }
    }

    /**
     * Restore backend session on page reload
     */
    async restoreBackendSession() {
        const username = this.scoreManager.getCurrentUsername();
        if (!username) return;
        
        console.log('Attempting to restore backend session for:', username);
        
        try {
            const sessionResult = await this.sessionManager.createSession(username);
            
            if (sessionResult.offline) {
                console.log('Backend unavailable, running in offline mode');
                return;
            }
            
            console.log('Backend session restored:', sessionResult.sessionId);
            
            // Connect WebSocket
            this.wsClient.connect(sessionResult.sessionId);
            
        } catch (error) {
            console.error('Failed to restore backend session:', error);
            // Continue in offline mode
        }
    }

    /**
     * Show user info in header
     */
    showUserInfo() {
        const userInfo = this.scoreManager.getUserInfo();
        if (userInfo) {
            document.getElementById('userName').textContent = userInfo.name;
            document.getElementById('studentId').textContent = userInfo.studentId;
            document.getElementById('userInfo').style.display = 'flex';
        }
    }

    /**
     * Switch chat tabs in the new layout
     */
    switchChatTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.chat-tab').forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update tab panels
        document.querySelectorAll('.chat-tab-panel').forEach(panel => {
            if (panel.getAttribute('data-panel') === tabName) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    }
    
    /**
     * Send a message to the fixed chat window
     * @param {string} tabName - 'main' or 'activity'
     * @param {string} message - Message text
     * @param {string} sender - 'agent' or 'student' (default: 'agent')
     */
    sendToFixedChat(tabName, message, sender = 'agent') {
        // Get the appropriate messages container
        const messagesId = tabName === 'main' ? 'mainChatMessages' : 'activityChatMessages';
        const messagesContainer = document.getElementById(messagesId);
        
        if (!messagesContainer) {
            console.error(`Chat messages container not found: ${messagesId}`);
            return;
        }
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        const senderName = sender === 'agent' ? 'Tutor' : 'You';
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                <div class="message-sender">${senderName}</div>
                ${this.escapeHtml(message)}
                <div class="message-time">${timeStr}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Update exercise cards with scores and lock status
     */
    updateExerciseCards() {
        const statuses = this.scoreManager.getExerciseStatuses();
        
        // Helper function to get difficulty label
        const getDifficultyLabel = (exerciseType, difficulty) => {
            if (exerciseType === 'multiple_choice') {
                return difficulty === '3' ? 'Easy' : difficulty === '4' ? 'Medium' : 'Hard';
            } else if (exerciseType === 'fill_in_the_blank') {
                return difficulty === 'easy' ? 'Easy' : 'Moderate';
            } else if (exerciseType === 'spelling') {
                return difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard';
            } else if (exerciseType === 'bubble_pop') {
                return difficulty === 'easy' ? 'Easy' : difficulty === 'moderate' ? 'Moderate' : 'Hard';
            } else if (exerciseType === 'fluent_reading') {
                // Use speed as difficulty label
                return `${difficulty} WPM`;
            }
            return difficulty;
        };

        // Update all exercise cards
        document.querySelectorAll('.exercise-card').forEach(card => {
            const exerciseType = card.getAttribute('data-exercise');
            if (!exerciseType || !statuses[exerciseType]) return;

            const status = statuses[exerciseType];
            
            // In dev mode, unlock all exercises including bubble_pop
            if (this.isDevMode) {
                status.unlocked = true;
            }
            
            // Handle lock/unlock status
            if (status.unlocked) {
                card.classList.remove('locked');
                const overlay = card.querySelector('.lock-overlay');
                if (overlay) overlay.remove();
                const btn = card.querySelector('button');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Play';
                }
            }

            // Update score display - show only best score
            const scoresContainer = card.querySelector('.exercise-scores');
            if (scoresContainer) {
                const bestScore = this.scoreManager.getBestScoreForExercise(exerciseType);
                
                if (bestScore && bestScore.highest) {
                    const difficultyLabel = getDifficultyLabel(exerciseType, bestScore.difficulty);
                    scoresContainer.innerHTML = `
                        <div class="score-display">
                            <div class="best-score">
                                ${difficultyLabel}: Best ${bestScore.highest.score}/${bestScore.highest.total} (${bestScore.highest.percentage}%)
                                ${bestScore.recent ? ` | Last ${bestScore.recent.score}/${bestScore.recent.total} (${bestScore.recent.percentage}%)` : ''}
                            </div>
                        </div>
                    `;
                } else {
                    scoresContainer.innerHTML = `
                        <div class="score-display">
                            <div class="no-score">Not attempted</div>
                        </div>
                    `;
                }
            }
        });

        // Update new layout activity icons
        document.querySelectorAll('.activity-icon').forEach(icon => {
            const exerciseType = icon.getAttribute('data-exercise');
            if (!exerciseType || !statuses[exerciseType]) return;

            const status = statuses[exerciseType];
            
            // In dev mode, unlock all exercises
            if (this.isDevMode) {
                status.unlocked = true;
            }
            
            // Handle lock/unlock status
            if (status.unlocked) {
                icon.classList.remove('locked');
            } else {
                icon.classList.add('locked');
            }

            // Update score bubble
            const scoreBubble = icon.querySelector('.score-bubble');
            if (scoreBubble) {
                const bestScore = this.scoreManager.getBestScoreForExercise(exerciseType);
                
                if (bestScore && bestScore.highest) {
                    const percentage = bestScore.highest.percentage;
                    scoreBubble.textContent = `${percentage}%`;
                    scoreBubble.style.display = 'flex';
                    
                    // Check if this score unlocks the next level (80%+ on hard mode)
                    const difficulty = bestScore.difficulty;
                    const isHardMode = (exerciseType === 'multiple_choice' && difficulty === '5') ||
                                      (exerciseType === 'fill_in_the_blank' && difficulty === 'moderate') ||
                                      (exerciseType === 'spelling' && difficulty === 'hard') ||
                                      (exerciseType === 'bubble_pop' && difficulty === 'hard') ||
                                      (exerciseType === 'fluent_reading' && difficulty === 'hard');
                    
                    if (isHardMode && percentage >= 80) {
                        scoreBubble.classList.add('unlocking');
                    } else {
                        scoreBubble.classList.remove('unlocking');
                    }
                } else {
                    scoreBubble.textContent = '';
                    scoreBubble.style.display = 'none';
                }
            }
        });

        // Update dev panel if in dev mode
        if (this.isDevMode) {
            this.updateDevPanel();
        }
    }

    /**
     * Select an exercise
     */
    selectExercise(exerciseType) {
        if (!this.scoreManager.isExerciseUnlocked(exerciseType)) {
            alert('This exercise is locked. Complete previous exercises to unlock it!');
            return;
        }

        this.currentExerciseType = exerciseType;
        
        if (exerciseType === 'multiple_choice') {
            this.multipleChoiceUI.show();
        } else if (exerciseType === 'fill_in_the_blank') {
            this.fillInBlankUI.show();
        } else if (exerciseType === 'spelling') {
            this.spellingUI.show();
        } else if (exerciseType === 'bubble_pop') {
            this.showScreen('bubblePopScreen');
            this.bubblePopUI.initialize();
            this.bubblePopUI.show();
        } else if (exerciseType === 'fluent_reading') {
            this.showScreen('fluentReadingScreen');
            this.fluentReadingUI.initialize();
            this.fluentReadingUI.show();
        }
    }

    // Multiple Choice methods removed - now handled by MultipleChoiceUI
    // Fill in the Blank methods removed - now handled by FillInBlankUI
    // Spelling methods removed - now handled by SpellingUI

    /**
     * Show Results - Return to main page and get LLM summary
     */
    async showResults(exerciseType, results = null) {
        let difficulty;
        
        // If results not provided, get them from the exercise
        if (!results) {
            if (exerciseType === 'multiple_choice') {
                results = this.multipleChoiceExercise.getResults();
                difficulty = document.getElementById('mcDifficulty').value;
            }
        }
        
        if (exerciseType === 'multiple_choice' && results) {
            difficulty = document.getElementById('mcDifficulty').value;
        } else if (exerciseType === 'fill_in_the_blank') {
            results = this.fillInBlankExercise.getResults();
            difficulty = document.getElementById('fibDifficulty').value;
        } else if (exerciseType === 'spelling') {
            results = this.spellingExercise.getResults();
            difficulty = document.getElementById('spDifficulty').value;
        }
        
        // Record score locally
        this.scoreManager.recordScore(exerciseType, difficulty, results.score, results.total);
        
        // Save to backend database via REST API
        try {
            const tuningSettings = { difficulty: difficulty };
            
            // Map frontend results format to backend format
            // Add 'item' and 'correct' fields required by Bayesian proficiency system
            const backendResults = {
                score: results.score,
                total: results.total,
                item_results: (results.answers || []).map(answer => ({
                    ...answer,
                    item: answer.correctAnswer,  // Item identifier for proficiency tracking
                    correct: answer.isCorrect    // Boolean field expected by backend
                }))
            };
            
            await this.sessionManager.endActivity(exerciseType, backendResults, tuningSettings);
            console.log('[BREADCRUMB][RESULTS] Activity results saved to database');
        } catch (error) {
            console.error('[BREADCRUMB][RESULTS] Failed to save results to database:', error);
            // Continue anyway - local score is saved
        }
        
        // Send results to backend for LLM summary via WebSocket
        if (this.wsClient && this.wsClient.isConnected()) {
            this.wsClient.send({
                type: 'exercise_complete',
                exercise_type: exerciseType,
                difficulty: difficulty,
                score: results.score,
                total: results.total,
                percentage: results.percentage,
                answers: results.answers
            });
            console.log('[BREADCRUMB][RESULTS] Sent exercise results to backend for LLM summary');
        }
        
        // Return to main page
        this.showScreen('selectionScreen');
        this.updateExerciseCards();
        
        // Display a brief message in main chat while waiting for LLM
        this.sendToFixedChat('main', '📊 Analyzing your results...', 'agent');
    }

    /**
     * Retry Exercise
     */
    retryExercise() {
        if (this.currentExerciseType === 'multiple_choice') {
            this.multipleChoiceUI.show();
        } else if (this.currentExerciseType === 'fill_in_the_blank') {
            this.fillInBlankUI.show();
        } else if (this.currentExerciseType === 'spelling') {
            this.spellingUI.show();
        } else if (this.currentExerciseType === 'bubble_pop') {
            // For Bubble Pop, restart with the same settings
            this.showScreen('bubblePopScreen');
            // Start the game directly without showing settings
            this.bubblePopUI.startGame();
        } else if (this.currentExerciseType === 'fluent_reading') {
            // For Fluent Reading, restart with the same settings
            this.showScreen('fluentReadingScreen');
            // Start the reading directly without showing settings
            this.fluentReadingUI.startReading();
        }
    }

    /**
     * Handle keyboard navigation
     * Legacy keyboard shortcuts removed - exercises now handle their own keyboard events
     */
    handleKeyPress(event) {
        // Keyboard shortcuts moved to individual exercise UI classes
        // This prevents conflicts and allows each exercise to define its own shortcuts
    }

    /**
     * Setup WebSocket listener for main tutor messages
     */
    setupMainTutorListener() {
        if (this.wsClient) {
            this.wsClient.addMessageHandler((message) => {
                if (message.type === 'chat' && message.sender === 'agent') {
                    console.log('[BREADCRUMB][MAIN] Displaying tutor message');
                    this.sendToFixedChat('main', message.message, 'agent');
                }
            });
            console.log('[BREADCRUMB][MAIN] Tutor listener added');
        }
    }
    
    /**
     * Send main chat message to tutor
     */
    sendMainChatMessage() {
        const input = document.getElementById('mainChatInput');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        console.log('[BREADCRUMB][MAIN] Sending message:', message);
        
        // Display user message
        this.sendToFixedChat('main', message, 'student');
        input.value = '';
        
        // Send to backend via WebSocket
        if (this.wsClient && this.wsClient.isConnected()) {
            this.wsClient.send({
                type: 'chat',
                message: message
            });
            console.log('[BREADCRUMB][MAIN] Message sent to backend');
        } else {
            console.log('[BREADCRUMB][MAIN] ERROR: WebSocket not connected');
        }
    }

    /**
     * Show a specific screen
     */
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        document.getElementById(screenId).classList.add('active');
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
