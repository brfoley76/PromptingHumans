/**
 * @fileoverview UI wrapper for Multiple Choice exercise
 * @module MultipleChoiceUI
 * @requires MultipleChoiceExercise
 */

/**
 * UI handler for Multiple Choice exercise
 * @class MultipleChoiceUI
 */
class MultipleChoiceUI {
    /**
     * Creates an instance of MultipleChoiceUI
     * @param {App} app - Main application instance
     * @param {MultipleChoiceExercise} exercise - Exercise instance
     */
    constructor(app, exercise) {
        this.app = app;
        this.exercise = exercise;
        this.selectedAnswer = null;
        this.hasRetried = false;  // Track retry attempts for medium difficulty
        
        // Bind WebSocket message handler
        this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
        
        this.setupEventListeners();
        this.setupWebSocketListener();
    }
    
    /**
     * Setup UI event listeners
     * @private
     */
    setupEventListeners() {
        // Settings panel
        document.getElementById('mcBackBtn')?.addEventListener('click', () => {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        });
        
        document.getElementById('mcStartBtn')?.addEventListener('click', () => {
            this.startExercise();
        });
        
        // Exercise panel
        document.getElementById('mcSubmitBtn')?.addEventListener('click', () => {
            this.submitAnswer();
        });
        
        document.getElementById('mcNextBtn')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Exercise events
        this.exercise.on('scoreUpdate', (data) => {
            this.updateScore(data);
        });
        
        this.exercise.on('progressUpdate', (data) => {
            this.updateProgress(data);
        });
        
        this.exercise.on('complete', (results) => {
            this.showResults(results);
        });
        
        this.exercise.on('error', (error) => {
            console.error('Multiple Choice error:', error);
            alert('An error occurred: ' + error.message);
        });
    }
    
    /**
     * Show the exercise screen
     */
    show() {
        // In dev mode: show settings panel (preserve old behavior)
        if (this.app.isDevMode) {
            this.app.showScreen('multipleChoiceScreen');
            document.getElementById('mcSettingsPanel').style.display = 'block';
            document.getElementById('mcExercisePanel').style.display = 'none';
            return;
        }
        
        // Normal mode: use defaults and agent-guided flow
        const defaults = EXERCISE_DEFAULTS.multiple_choice;
        
        // Show exercise screen
        this.app.showScreen('multipleChoiceScreen');
        document.getElementById('mcSettingsPanel').style.display = 'none';
        document.getElementById('mcExercisePanel').style.display = 'block';
        
        // Show exercise chat panel
        this.showExerciseChat();
        
        // LLM will send welcome message when activity_start event is received
        
        // Show click-to-start overlay
        ClickToStartOverlay.show(() => {
            this.startExerciseWithDefaults(defaults);
        });
    }
    
    /**
     * Start exercise with default settings
     * @private
     * @param {Object} settings - Exercise settings
     */
    startExerciseWithDefaults(settings) {
        try {
            this.exercise.initialize({
                numQuestions: settings.numQuestions,
                difficulty: settings.difficulty
            });
            
            this.exercise.start();
            
            // Send activity_start event to backend to create activity agent
            if (this.app.wsClient && this.app.wsClient.isConnected()) {
                this.app.wsClient.send({
                    type: 'activity_start',
                    activity: 'multiple_choice',
                    difficulty: settings.difficulty.toString()
                });
                console.log('[BREADCRUMB][MC] Sent activity_start event');
            }
            
            this.displayQuestion();
        } catch (error) {
            console.error('Failed to start exercise:', error);
            alert('Failed to start exercise: ' + error.message);
        }
    }
    
    /**
     * Start the exercise
     * @private
     */
    startExercise() {
        try {
            const numQuestions = parseInt(document.getElementById('mcNumQuestions').value);
            const difficulty = parseInt(document.getElementById('mcDifficulty').value);
            
            this.exercise.initialize({
                numQuestions: numQuestions,
                difficulty: difficulty
            });
            
            this.exercise.start();
            
            document.getElementById('mcSettingsPanel').style.display = 'none';
            document.getElementById('mcExercisePanel').style.display = 'block';
            
            // Send activity_start event to backend to create activity agent
            if (this.app.wsClient && this.app.wsClient.isConnected()) {
                this.app.wsClient.send({
                    type: 'activity_start',
                    activity: 'multiple_choice',
                    difficulty: difficulty.toString()
                });
                console.log('[BREADCRUMB][MC] Sent activity_start event (dev mode)');
            }
            
            this.displayQuestion();
        } catch (error) {
            console.error('Failed to start exercise:', error);
            alert('Failed to start exercise: ' + error.message);
        }
    }
    
    /**
     * Display current question
     * @private
     */
    displayQuestion() {
        const question = this.exercise.getCurrentQuestion();
        if (!question) return;
        
        this.updateProgress(this.exercise.getProgress());
        
        // Display question text
        const capitalizedDefinition = this.capitalizeFirst(question.definition);
        document.getElementById('mcQuestionText').textContent = capitalizedDefinition;
        
        // Display answer options
        const optionsContainer = document.getElementById('mcAnswerOptions');
        optionsContainer.innerHTML = '';
        
        question.choices.forEach((choice, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'answer-option';
            optionDiv.setAttribute('tabindex', '0');
            
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'answer';
            radioInput.value = choice;
            radioInput.id = `option${index}`;
            
            const label = document.createElement('label');
            label.htmlFor = `option${index}`;
            label.textContent = choice;
            
            optionDiv.appendChild(radioInput);
            optionDiv.appendChild(label);
            
            // Click handlers
            optionDiv.addEventListener('click', (e) => {
                if (e.target !== radioInput) {
                    radioInput.click();
                }
            });
            
            radioInput.addEventListener('change', () => {
                this.selectAnswer(choice, optionDiv);
            });
            
            optionDiv.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    radioInput.click();
                }
            });
            
            optionsContainer.appendChild(optionDiv);
        });
        
        // Reset UI state
        this.selectedAnswer = null;
        this.hasRetried = false;  // Reset retry flag for new question
        document.getElementById('mcSubmitBtn').disabled = true;
        document.getElementById('mcNextBtn').style.display = 'none';
        document.getElementById('mcFeedback').style.display = 'none';
        document.getElementById('mcFeedback').className = 'feedback';
    }
    
    /**
     * Select an answer
     * @private
     * @param {string} answer - Selected answer
     * @param {HTMLElement} optionDiv - Option element
     */
    selectAnswer(answer, optionDiv) {
        document.querySelectorAll('.answer-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        optionDiv.classList.add('selected');
        this.selectedAnswer = answer;
        document.getElementById('mcSubmitBtn').disabled = false;
    }
    
    /**
     * Submit the selected answer
     * @private
     */
    submitAnswer() {
        if (!this.selectedAnswer) return;
        
        try {
            const question = this.exercise.getCurrentQuestion();
            const isCorrect = this.exercise.submitAnswer(this.selectedAnswer);
            
            // Disable submit button temporarily
            document.getElementById('mcSubmitBtn').disabled = true;
            
            // Get difficulty behavior config
            const difficulty = this.exercise.settings.difficulty.toString();
            const behavior = MultipleChoiceExercise.DIFFICULTY_BEHAVIORS[difficulty];
            
            // Agent-driven flow
            if (isCorrect) {
                // Correct answer: Show visual feedback, send event to LLM for encouragement
                this.showVisualFeedback(question, true);
                
                // Send correct answer event to backend for LLM encouragement
                this.sendActivityEvent('correct_answer', {
                    question: question.definition,
                    correctAnswer: question.correctAnswer,
                    userAnswer: this.selectedAnswer
                });
                
                // Auto-advance after 3 seconds (give time for LLM response)
                setTimeout(() => {
                    if (this.exercise.isComplete()) {
                        this.exercise.end();
                    } else {
                        this.nextQuestion();
                    }
                }, 3000);
            } else {
                // Wrong answer: Behavior depends on difficulty
                this.handleWrongAnswer(question, difficulty, behavior);
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
            alert('Failed to submit answer: ' + error.message);
        }
    }
    
    /**
     * Show visual feedback (colors) for final answers
     * @private
     * @param {Object} question - Current question
     * @param {boolean} isCorrect - Whether answer was correct
     */
    showVisualFeedback(question, isCorrect) {
        // Disable all options
        document.querySelectorAll('.answer-option input[type="radio"]').forEach(radio => {
            radio.disabled = true;
        });
        
        // Show correct/incorrect styling
        document.querySelectorAll('.answer-option').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.value === question.correctAnswer) {
                option.classList.add('correct');
            } else if (radio.value === this.selectedAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });
    }
    
    /**
     * Handle wrong answer based on difficulty
     * @private
     * @param {Object} question - Current question
     * @param {string} difficulty - Difficulty level
     * @param {Object} behavior - Difficulty behavior config
     */
    handleWrongAnswer(question, difficulty, behavior) {
        // Track attempt number for this question
        if (!this.attemptNumber) {
            this.attemptNumber = 1;
        } else {
            this.attemptNumber++;
        }
        
        // Send event to backend to get LLM response
        this.sendActivityEvent('wrong_answer', {
            question: question.definition,
            correctAnswer: question.correctAnswer,
            userAnswer: this.selectedAnswer,
            choices: question.choices,
            attemptNumber: this.attemptNumber
        });
        
        // Determine if retry is allowed based on difficulty
        const allowRetry = (difficulty === '3') || (difficulty === '4' && !this.hasRetried);
        
        if (allowRetry) {
            // Re-enable options for retry (no colors shown)
            setTimeout(() => {
                document.querySelectorAll('.answer-option input[type="radio"]').forEach(radio => {
                    radio.disabled = false;
                    radio.checked = false;
                });
                document.querySelectorAll('.answer-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                document.getElementById('mcSubmitBtn').disabled = true;
                this.selectedAnswer = null;
                
                if (difficulty === '4') {
                    this.hasRetried = true;
                }
            }, 1500);
        } else {
            // No more retries: Show visual feedback, then move on
            this.showVisualFeedback(question, false);
            this.hasRetried = false;
            this.attemptNumber = 0;
            
            setTimeout(() => {
                if (this.exercise.isComplete()) {
                    this.exercise.end();
                } else {
                    this.nextQuestion();
                }
            }, 3000);
        }
    }
    
    /**
     * Show feedback for answer
     * @private
     * @param {boolean} isCorrect - Whether answer was correct
     */
    showFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('mcFeedback');
        const question = this.exercise.getCurrentQuestion();
        
        if (isCorrect) {
            feedbackDiv.className = 'feedback correct';
            feedbackDiv.innerHTML = '✓ Correct! Well done!';
        } else {
            feedbackDiv.className = 'feedback incorrect';
            feedbackDiv.innerHTML = `✗ Incorrect. The correct answer is: <strong>${question.correctAnswer}</strong>`;
        }
        
        feedbackDiv.style.display = 'block';
    }
    
    /**
     * Move to next question
     * @private
     */
    nextQuestion() {
        this.exercise.nextQuestion();
        if (!this.exercise.isComplete()) {
            this.displayQuestion();
        }
    }
    
    /**
     * Update score display
     * @private
     * @param {Object} data - Score data
     */
    updateScore(data) {
        document.getElementById('mcScore').textContent = data.score;
    }
    
    /**
     * Update progress display
     * @private
     * @param {Object} progress - Progress data
     */
    updateProgress(progress) {
        document.getElementById('mcCurrentQuestion').textContent = progress.current;
        document.getElementById('mcTotalQuestions').textContent = progress.total;
        document.getElementById('mcScore').textContent = progress.score;
        
        const progressFill = document.getElementById('mcProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
    }
    
    /**
     * Setup WebSocket message listener
     * @private
     */
    setupWebSocketListener() {
        if (this.app.wsClient) {
            this.app.wsClient.addMessageHandler(this.handleWebSocketMessage);
            console.log('[BREADCRUMB][MC] WebSocket listener added');
        }
    }
    
    /**
     * Handle incoming WebSocket messages
     * @private
     * @param {Object} message - WebSocket message
     */
    handleWebSocketMessage(message) {
        console.log('[BREADCRUMB][MC] WebSocket message received:', message.type);
        
        // Only handle activity-related messages
        if (message.type === 'activity_chat' && message.sender === 'agent') {
            console.log('[BREADCRUMB][MC] Displaying LLM response in embedded chat');
            this.sendChatMessage(message.message, 'agent');
        } else if (message.type === 'activity_hint') {
            console.log('[BREADCRUMB][MC] Displaying hint in embedded chat');
            this.sendChatMessage(`💡 ${message.hint}`, 'agent');
        } else if (message.type === 'activity_feedback') {
            console.log('[BREADCRUMB][MC] Displaying feedback in embedded chat');
            this.sendChatMessage(message.feedback, 'agent');
        }
    }
    
    /**
     * Show exercise chat panel
     * @private
     */
    showExerciseChat() {
        const chatPanel = document.getElementById('mcChatPanel');
        if (chatPanel) {
            chatPanel.style.display = 'flex';
            document.body.classList.add('exercise-active');
        }
        
        // Setup chat controls
        const minimizeBtn = document.getElementById('mcChatMinimize');
        const sendBtn = document.getElementById('mcChatSend');
        const input = document.getElementById('mcChatInput');
        
        if (minimizeBtn) {
            minimizeBtn.onclick = () => this.toggleChatMinimize();
        }
        
        if (sendBtn) {
            sendBtn.onclick = () => this.sendUserMessage();
        }
        
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.sendUserMessage();
                }
            };
        }
    }
    
    /**
     * Hide exercise chat panel
     * @private
     */
    hideExerciseChat() {
        const chatPanel = document.getElementById('mcChatPanel');
        if (chatPanel) {
            chatPanel.style.display = 'none';
            document.body.classList.remove('exercise-active');
        }
    }
    
    /**
     * Toggle chat minimize state
     * @private
     */
    toggleChatMinimize() {
        const chatPanel = document.getElementById('mcChatPanel');
        if (chatPanel) {
            chatPanel.classList.toggle('minimized');
        }
    }
    
    /**
     * Send a message to the exercise chat
     * @private
     * @param {string} message - Message text
     * @param {string} sender - 'agent' or 'student'
     */
    sendChatMessage(message, sender = 'agent') {
        const messagesContainer = document.getElementById('mcChatMessages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `exercise-chat-message ${sender}`;
        
        const senderName = sender === 'agent' ? 'Helper' : 'You';
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        messageDiv.innerHTML = `
            <div class="exercise-message-bubble">
                <div class="exercise-message-sender">${senderName}</div>
                ${this.escapeHtml(message)}
                <div class="exercise-message-time">${timeStr}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Send user message from input
     * @private
     */
    sendUserMessage() {
        console.log('[BREADCRUMB][MC] sendUserMessage() called');
        const input = document.getElementById('mcChatInput');
        if (!input) {
            console.log('[BREADCRUMB][MC] ERROR: Input element not found');
            return;
        }
        
        const message = input.value.trim();
        console.log('[BREADCRUMB][MC] Message:', message);
        if (!message) {
            console.log('[BREADCRUMB][MC] Empty message, returning');
            return;
        }
        
        console.log('[BREADCRUMB][MC] Adding message to chat UI');
        this.sendChatMessage(message, 'student');
        input.value = '';
        
        // Send to backend via WebSocket if available
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            console.log('[BREADCRUMB][MC] Sending to backend via WebSocket');
            this.app.wsClient.sendActivityChat(message);
        } else {
            console.log('[BREADCRUMB][MC] ERROR: WebSocket not connected');
        }
    }
    
    /**
     * Send activity event to backend
     * @private
     * @param {string} event - Event type (e.g., 'wrong_answer', 'correct_answer')
     * @param {Object} context - Event context data
     */
    sendActivityEvent(event, context) {
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            this.app.wsClient.sendActivityEvent(event, context);
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Show results screen
     * @private
     * @param {Object} results - Exercise results
     */
    showResults(results) {
        // Hide exercise chat
        this.hideExerciseChat();
        
        // Send activity_end event to backend
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            this.app.wsClient.send({
                type: 'activity_end',
                score: results.score,
                total: results.total
            });
            console.log('[BREADCRUMB][MC] Sent activity_end event');
        }
        
        this.app.showResults('multiple_choice', results);
    }
    
    /**
     * Capitalize first letter of string
     * @private
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultipleChoiceUI;
}
