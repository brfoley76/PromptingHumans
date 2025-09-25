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

class App {
    constructor() {
        this.curriculumManager = new CurriculumManager();
        this.scoreManager = new ScoreManager();
        this.multipleChoiceExercise = new MultipleChoiceExercise(this.curriculumManager);
        this.fillInBlankExercise = new FillInBlankExercise(this.curriculumManager);
        this.spellingExercise = new SpellingExercise(this.curriculumManager);
        
        // Initialize Bubble Pop game
        this.bubblePopExercise = new BubblePopExercise(this.curriculumManager);
        this.bubblePopUI = new BubblePopUI(this, this.bubblePopExercise);
        
        // Initialize Speed Reading game
        this.speedReadingExercise = new SpeedReadingExercise(this.curriculumManager);
        this.speedReadingUI = new SpeedReadingUI(this, this.speedReadingExercise);
        
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
        
        const exercises = ['multiple_choice', 'fill_in_the_blank', 'spelling', 'bubble_pop', 'speed_reading'];
        const exerciseNames = {
            'multiple_choice': 'Multiple Choice',
            'fill_in_the_blank': 'Fill in the Blank',
            'spelling': 'Spelling',
            'bubble_pop': 'Bubble Pop',
            'speed_reading': 'Speed Reading'
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

        // Exercise Selection
        document.querySelectorAll('[data-exercise-btn]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exerciseType = e.target.getAttribute('data-exercise-btn');
                this.selectExercise(exerciseType);
            });
        });

        // Multiple Choice Exercise
        document.getElementById('mcBackBtn').addEventListener('click', () => {
            this.showScreen('selectionScreen');
            this.updateExerciseCards();
        });
        
        document.getElementById('mcStartBtn').addEventListener('click', () => {
            this.startMultipleChoice();
        });
        
        document.getElementById('mcSubmitBtn').addEventListener('click', () => {
            this.submitMultipleChoiceAnswer();
        });
        
        document.getElementById('mcNextBtn').addEventListener('click', () => {
            this.nextMultipleChoiceQuestion();
        });

        // Fill in the Blank Exercise
        document.getElementById('fibBackBtn').addEventListener('click', () => {
            this.showScreen('selectionScreen');
            this.updateExerciseCards();
        });
        
        document.getElementById('fibStartBtn').addEventListener('click', () => {
            this.startFillInBlank();
        });
        
        document.getElementById('fibCheckBtn').addEventListener('click', () => {
            this.checkFillInBlankAnswers();
        });

        // Spelling Exercise
        document.getElementById('spBackBtn').addEventListener('click', () => {
            this.showScreen('selectionScreen');
            this.updateExerciseCards();
        });
        
        document.getElementById('spStartBtn').addEventListener('click', () => {
            this.startSpelling();
        });
        
        document.getElementById('spSubmitBtn').addEventListener('click', () => {
            this.submitSpellingAnswer();
        });
        
        document.getElementById('spNextBtn').addEventListener('click', () => {
            this.nextSpellingQuestion();
        });

        const spAnswerInput = document.getElementById('spAnswerInput');
        spAnswerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const submitBtn = document.getElementById('spSubmitBtn');
                const nextBtn = document.getElementById('spNextBtn');
                
                if (!submitBtn.disabled) {
                    this.submitSpellingAnswer();
                } else if (nextBtn.style.display !== 'none') {
                    this.nextSpellingQuestion();
                }
            }
        });

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
    }

    /**
     * Register a new user
     */
    registerUser() {
        const name = document.getElementById('studentName').value.trim();
        if (name) {
            this.scoreManager.createUser(name);
            this.showUserInfo();
            this.showScreen('selectionScreen');
            this.updateExerciseCards();
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
            } else if (exerciseType === 'speed_reading') {
                return difficulty === 'easy' ? 'Easy' : difficulty === 'moderate' ? 'Moderate' : 'Hard';
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
            this.showScreen('multipleChoiceScreen');
            document.getElementById('mcSettingsPanel').style.display = 'block';
            document.getElementById('mcExercisePanel').style.display = 'none';
        } else if (exerciseType === 'fill_in_the_blank') {
            this.showScreen('fillInBlankScreen');
            document.getElementById('fibSettingsPanel').style.display = 'block';
            document.getElementById('fibExercisePanel').style.display = 'none';
        } else if (exerciseType === 'spelling') {
            this.showScreen('spellingScreen');
            document.getElementById('spSettingsPanel').style.display = 'block';
            document.getElementById('spExercisePanel').style.display = 'none';
        } else if (exerciseType === 'bubble_pop') {
            this.showScreen('bubblePopScreen');
            this.bubblePopUI.initialize();
            this.bubblePopUI.show();
        } else if (exerciseType === 'speed_reading') {
            this.showScreen('speedReadingScreen');
            this.speedReadingUI.initialize();
            this.speedReadingUI.show();
        }
    }

    /**
     * Start Multiple Choice Exercise
     */
    startMultipleChoice() {
        const numQuestions = parseInt(document.getElementById('mcNumQuestions').value);
        const difficulty = parseInt(document.getElementById('mcDifficulty').value);

        this.multipleChoiceExercise.initialize(numQuestions, difficulty);
        this.currentExercise = this.multipleChoiceExercise;

        document.getElementById('mcSettingsPanel').style.display = 'none';
        document.getElementById('mcExercisePanel').style.display = 'block';

        this.displayMultipleChoiceQuestion();
    }

    /**
     * Display Multiple Choice Question
     */
    displayMultipleChoiceQuestion() {
        const question = this.multipleChoiceExercise.getCurrentQuestion();
        if (!question) return;

        this.updateMultipleChoiceProgress();

        // Capitalize the first letter of the definition for display
        const capitalizedDefinition = this.curriculumManager.capitalizeFirst(question.definition);
        document.getElementById('mcQuestionText').textContent = capitalizedDefinition;

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

            optionDiv.addEventListener('click', (e) => {
                if (e.target !== radioInput) {
                    radioInput.click();
                }
            });

            radioInput.addEventListener('change', () => {
                this.selectMultipleChoiceAnswer(choice, optionDiv);
            });

            optionDiv.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    radioInput.click();
                }
            });

            optionsContainer.appendChild(optionDiv);
        });

        this.selectedAnswer = null;
        document.getElementById('mcSubmitBtn').disabled = true;
        document.getElementById('mcNextBtn').style.display = 'none';
        document.getElementById('mcFeedback').style.display = 'none';
        document.getElementById('mcFeedback').className = 'feedback';
    }

    /**
     * Select Multiple Choice Answer
     */
    selectMultipleChoiceAnswer(answer, optionDiv) {
        document.querySelectorAll('.answer-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        optionDiv.classList.add('selected');
        this.selectedAnswer = answer;
        document.getElementById('mcSubmitBtn').disabled = false;
    }

    /**
     * Submit Multiple Choice Answer
     */
    submitMultipleChoiceAnswer() {
        if (!this.selectedAnswer) return;

        const isCorrect = this.multipleChoiceExercise.submitAnswer(this.selectedAnswer);

        this.showMultipleChoiceFeedback(isCorrect);

        document.getElementById('mcSubmitBtn').disabled = true;

        document.querySelectorAll('.answer-option input[type="radio"]').forEach(radio => {
            radio.disabled = true;
        });

        const question = this.multipleChoiceExercise.getCurrentQuestion();
        document.querySelectorAll('.answer-option').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.value === question.correctAnswer) {
                option.classList.add('correct');
            } else if (radio.value === this.selectedAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });

        if (this.multipleChoiceExercise.isComplete()) {
            setTimeout(() => {
                this.showResults('multiple_choice');
            }, 2000);
        } else {
            document.getElementById('mcNextBtn').style.display = 'inline-block';
        }

        document.getElementById('mcScore').textContent = this.multipleChoiceExercise.score;
    }

    /**
     * Show Multiple Choice Feedback
     */
    showMultipleChoiceFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('mcFeedback');
        const question = this.multipleChoiceExercise.getCurrentQuestion();

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
     * Next Multiple Choice Question
     */
    nextMultipleChoiceQuestion() {
        this.multipleChoiceExercise.nextQuestion();
        this.displayMultipleChoiceQuestion();
    }

    /**
     * Update Multiple Choice Progress
     */
    updateMultipleChoiceProgress() {
        const progress = this.multipleChoiceExercise.getProgress();
        
        document.getElementById('mcCurrentQuestion').textContent = progress.current;
        document.getElementById('mcTotalQuestions').textContent = progress.total;
        document.getElementById('mcScore').textContent = progress.score;
        
        const progressFill = document.getElementById('mcProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
    }

    /**
     * Start Fill in the Blank Exercise
     */
    startFillInBlank() {
        const numQuestions = parseInt(document.getElementById('fibNumQuestions').value);
        const difficulty = document.getElementById('fibDifficulty').value;

        this.fillInBlankExercise.initialize(numQuestions, difficulty);
        this.currentExercise = this.fillInBlankExercise;

        document.getElementById('fibSettingsPanel').style.display = 'none';
        document.getElementById('fibExercisePanel').style.display = 'block';

        this.displayFillInBlankQuestions();
    }

    /**
     * Display Fill in the Blank Questions
     */
    displayFillInBlankQuestions() {
        const questions = this.fillInBlankExercise.getAllQuestions();
        const wordBank = this.fillInBlankExercise.getWordBank();

        // Display word bank
        const wordBankDiv = document.getElementById('wordBank');
        wordBankDiv.innerHTML = '';
        
        wordBank.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.textContent = word;
            wordItem.draggable = true;
            wordItem.dataset.word = word;
            
            this.setupDragHandlers(wordItem);
            
            wordBankDiv.appendChild(wordItem);
        });

        // Display questions
        const questionsDiv = document.getElementById('fibQuestions');
        questionsDiv.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'fib-question';
            
            const questionText = document.createElement('div');
            questionText.className = 'fib-question-text';
            
            // Use the fitb field and replace {blank} with the actual blank space
            let fitbText = question.fitb || `A {blank} is `;
            // Capitalize the first letter of fitb
            const capitalizedFitb = this.curriculumManager.capitalizeFirst(fitbText);
            const fitbWithBlank = capitalizedFitb.replace('{blank}', `<span class="blank-space" data-blank-id="${question.blankId}"></span>`);
            
            // Keep definition lowercase (as it comes from data)
            questionText.innerHTML = `${index + 1}. ${fitbWithBlank}${question.definition}`;
            
            questionDiv.appendChild(questionText);
            questionsDiv.appendChild(questionDiv);
            
            // Setup drop zone
            const blankSpace = questionText.querySelector('.blank-space');
            this.setupDropZone(blankSpace);
        });

        this.updateFillInBlankProgress();
    }

    /**
     * Setup drag handlers for word items
     */
    setupDragHandlers(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.word);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
        });
    }

    /**
     * Setup drop zone for blank spaces
     */
    setupDropZone(blankSpace) {
        blankSpace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            blankSpace.classList.add('drag-over');
        });

        blankSpace.addEventListener('dragleave', (e) => {
            blankSpace.classList.remove('drag-over');
        });

        blankSpace.addEventListener('drop', (e) => {
            e.preventDefault();
            blankSpace.classList.remove('drag-over');
            
            const word = e.dataTransfer.getData('text/plain');
            const blankId = blankSpace.dataset.blankId;
            
            // Place word in blank
            const previousWord = this.fillInBlankExercise.placeWord(blankId, word);
            
            // Update display
            blankSpace.textContent = word;
            blankSpace.classList.add('filled');
            
            // Remove word from word bank
            const wordItem = document.querySelector(`.word-item[data-word="${word}"]`);
            if (wordItem) {
                wordItem.remove();
            }
            
            // If there was a previous word, add it back to word bank
            if (previousWord) {
                this.addWordToBank(previousWord);
            }
            
            // Make blank clickable to remove word
            blankSpace.style.cursor = 'pointer';
            blankSpace.onclick = () => {
                const removedWord = this.fillInBlankExercise.removeWord(blankId);
                if (removedWord) {
                    blankSpace.textContent = '';
                    blankSpace.classList.remove('filled', 'correct', 'incorrect');
                    this.addWordToBank(removedWord);
                }
                this.updateFillInBlankProgress();
            };
            
            this.updateFillInBlankProgress();
        });
    }

    /**
     * Add word back to word bank
     */
    addWordToBank(word) {
        const wordBankDiv = document.getElementById('wordBank');
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.textContent = word;
        wordItem.draggable = true;
        wordItem.dataset.word = word;
        
        this.setupDragHandlers(wordItem);
        wordBankDiv.appendChild(wordItem);
    }

    /**
     * Update Fill in the Blank Progress
     */
    updateFillInBlankProgress() {
        const progress = this.fillInBlankExercise.getProgress();
        
        document.getElementById('fibFilled').textContent = progress.filled;
        document.getElementById('fibTotal').textContent = progress.total;
        document.getElementById('fibProgress').textContent = progress.percentage;
        
        const progressFill = document.getElementById('fibProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
        
        // Enable/disable check button
        document.getElementById('fibCheckBtn').disabled = !this.fillInBlankExercise.areAllBlanksFilled();
    }

    /**
     * Check Fill in the Blank Answers
     */
    checkFillInBlankAnswers() {
        const result = this.fillInBlankExercise.checkAnswers();
        
        // Show correct/incorrect for each blank
        const questions = this.fillInBlankExercise.getAllQuestions();
        questions.forEach(question => {
            const blankSpace = document.querySelector(`[data-blank-id="${question.blankId}"]`);
            if (blankSpace) {
                blankSpace.classList.remove('correct', 'incorrect');
                blankSpace.classList.add(question.isCorrect ? 'correct' : 'incorrect');
            }
        });
        
        // Show results after a delay
        setTimeout(() => {
            this.showResults('fill_in_the_blank');
        }, 2000);
    }

    /**
     * Start Spelling Exercise
     */
    startSpelling() {
        const numQuestions = parseInt(document.getElementById('spNumQuestions').value);
        const difficulty = document.getElementById('spDifficulty').value;

        this.spellingExercise.initialize(numQuestions, difficulty);
        this.currentExercise = this.spellingExercise;

        document.getElementById('spSettingsPanel').style.display = 'none';
        document.getElementById('spExercisePanel').style.display = 'block';

        this.displaySpellingQuestion();
    }

    /**
     * Display Spelling Question
     */
    displaySpellingQuestion() {
        const question = this.spellingExercise.getCurrentQuestion();
        if (!question) return;

        this.updateSpellingProgress();

        // Display the definition with capitalized first letter
        const capitalizedDefinition = this.curriculumManager.capitalizeFirst(question.definition);
        document.getElementById('spQuestionText').innerHTML = `${capitalizedDefinition}: _______`;

        // Clear and focus the input
        const input = document.getElementById('spAnswerInput');
        input.value = '';
        input.classList.remove('correct', 'incorrect');
        input.disabled = false;
        input.focus();

        // Reset buttons and feedback
        document.getElementById('spSubmitBtn').disabled = false;
        document.getElementById('spNextBtn').style.display = 'none';
        document.getElementById('spFeedback').style.display = 'none';
        document.getElementById('spFeedback').className = 'feedback';
        document.getElementById('spInputFeedback').textContent = '';
    }

    /**
     * Submit Spelling Answer
     */
    submitSpellingAnswer() {
        const input = document.getElementById('spAnswerInput');
        const answer = input.value.trim();
        
        if (!answer) return;

        const isCorrect = this.spellingExercise.submitAnswer(answer);
        
        this.showSpellingFeedback(isCorrect);
        
        // Disable input and submit button
        input.disabled = true;
        document.getElementById('spSubmitBtn').disabled = true;
        
        // Show visual feedback on input
        input.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        if (this.spellingExercise.isComplete()) {
            setTimeout(() => {
                this.showResults('spelling');
            }, 2000);
        } else {
            document.getElementById('spNextBtn').style.display = 'inline-block';
        }
        
        document.getElementById('spScore').textContent = this.spellingExercise.score;
    }

    /**
     * Show Spelling Feedback
     */
    showSpellingFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('spFeedback');
        const question = this.spellingExercise.getCurrentQuestion();

        if (isCorrect) {
            feedbackDiv.className = 'feedback correct';
            feedbackDiv.innerHTML = '✓ Correct! Well spelled!';
        } else {
            feedbackDiv.className = 'feedback incorrect';
            feedbackDiv.innerHTML = `✗ Incorrect. The correct spelling is: <strong>${question.word}</strong>`;
        }

        feedbackDiv.style.display = 'block';
    }

    /**
     * Next Spelling Question
     */
    nextSpellingQuestion() {
        this.spellingExercise.nextQuestion();
        this.displaySpellingQuestion();
    }

    /**
     * Update Spelling Progress
     */
    updateSpellingProgress() {
        const progress = this.spellingExercise.getProgress();
        
        document.getElementById('spCurrentQuestion').textContent = progress.current;
        document.getElementById('spTotalQuestions').textContent = progress.total;
        document.getElementById('spScore').textContent = progress.score;
        
        const progressFill = document.getElementById('spProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
    }

    /**
     * Show Results Screen
     */
    showResults(exerciseType) {
        let results;
        let difficulty;
        
        if (exerciseType === 'multiple_choice') {
            results = this.multipleChoiceExercise.getResults();
            difficulty = document.getElementById('mcDifficulty').value;
        } else if (exerciseType === 'fill_in_the_blank') {
            results = this.fillInBlankExercise.getResults();
            difficulty = document.getElementById('fibDifficulty').value;
        } else if (exerciseType === 'spelling') {
            results = this.spellingExercise.getResults();
            difficulty = document.getElementById('spDifficulty').value;
        }
        
        // Record score
        this.scoreManager.recordScore(exerciseType, difficulty, results.score, results.total);
        
        // Update results display
        document.getElementById('finalScore').textContent = results.score;
        document.getElementById('finalTotal').textContent = results.total;
        document.getElementById('percentage').textContent = `${results.percentage}%`;
        document.getElementById('resultsMessage').textContent = results.message;
        
        // Create summary list
        const summaryList = document.getElementById('resultsSummary');
        summaryList.innerHTML = '';
        
        results.answers.forEach(answer => {
            const li = document.createElement('li');
            li.className = answer.isCorrect ? 'correct-answer' : 'incorrect-answer';
            
            const icon = answer.isCorrect ? '✓' : '✗';
            
            if (exerciseType === 'multiple_choice') {
                li.innerHTML = `
                    <strong>Q${answer.questionNumber}:</strong> ${answer.definition}<br>
                    <span style="color: ${answer.isCorrect ? '#28a745' : '#dc3545'}">
                        ${icon} Your answer: ${answer.userAnswer}
                        ${!answer.isCorrect ? `<br>Correct answer: ${answer.correctAnswer}` : ''}
                    </span>
                `;
            } else if (exerciseType === 'fill_in_the_blank') {
                li.innerHTML = `
                    <strong>Q${answer.questionNumber}:</strong> A _____ is ${answer.definition}<br>
                    <span style="color: ${answer.isCorrect ? '#28a745' : '#dc3545'}">
                        ${icon} Your answer: ${answer.userAnswer}
                        ${!answer.isCorrect ? `<br>Correct answer: ${answer.word}` : ''}
                    </span>
                `;
            } else if (exerciseType === 'spelling') {
                li.innerHTML = `
                    <strong>Q${answer.questionNumber}:</strong> ${answer.definition}: _______<br>
                    <span style="color: ${answer.isCorrect ? '#28a745' : '#dc3545'}">
                        ${icon} Your answer: ${answer.userAnswer}
                        ${!answer.isCorrect ? `<br>Correct spelling: ${answer.correctAnswer}` : ''}
                    </span>
                `;
            }
            
            summaryList.appendChild(li);
        });
        
        this.showScreen('resultsScreen');
    }

    /**
     * Retry Exercise
     */
    retryExercise() {
        if (this.currentExerciseType === 'multiple_choice') {
            this.multipleChoiceExercise.reset();
            this.showScreen('multipleChoiceScreen');
            document.getElementById('mcSettingsPanel').style.display = 'block';
            document.getElementById('mcExercisePanel').style.display = 'none';
        } else if (this.currentExerciseType === 'fill_in_the_blank') {
            this.fillInBlankExercise.reset();
            this.showScreen('fillInBlankScreen');
            document.getElementById('fibSettingsPanel').style.display = 'block';
            document.getElementById('fibExercisePanel').style.display = 'none';
        } else if (this.currentExerciseType === 'spelling') {
            this.spellingExercise.reset();
            this.showScreen('spellingScreen');
            document.getElementById('spSettingsPanel').style.display = 'block';
            document.getElementById('spExercisePanel').style.display = 'none';
        } else if (this.currentExerciseType === 'bubble_pop') {
            // For Bubble Pop, restart with the same settings
            this.showScreen('bubblePopScreen');
            // Start the game directly without showing settings
            this.bubblePopUI.startGame();
        } else if (this.currentExerciseType === 'speed_reading') {
            // For Speed Reading, restart with the same settings
            this.showScreen('speedReadingScreen');
            // Start the game directly without showing settings
            this.speedReadingUI.startGame();
        }
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyPress(event) {
        const mcExercisePanel = document.getElementById('mcExercisePanel');
        
        if (mcExercisePanel && mcExercisePanel.style.display !== 'none') {
            // Number keys 1-5 for selecting answers
            if (event.key >= '1' && event.key <= '5') {
                const optionIndex = parseInt(event.key) - 1;
                const options = document.querySelectorAll('.answer-option input[type="radio"]');
                if (options[optionIndex]) {
                    options[optionIndex].click();
                }
            }

            // Enter key to submit or go to next question
            if (event.key === 'Enter') {
                const submitBtn = document.getElementById('mcSubmitBtn');
                const nextBtn = document.getElementById('mcNextBtn');
                
                if (!submitBtn.disabled) {
                    this.submitMultipleChoiceAnswer();
                } else if (nextBtn.style.display !== 'none') {
                    this.nextMultipleChoiceQuestion();
                }
            }
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
