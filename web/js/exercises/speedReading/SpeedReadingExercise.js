/**
 * SpeedReadingExercise.js
 * Speed reading game exercise implementation
 */

class SpeedReadingExercise extends ExerciseFramework {
    constructor(curriculumManager) {
        super(curriculumManager, 'speed_reading');
        
        // Game-specific properties
        this.narrative = null;
        this.currentFragmentIndex = 0;
        this.streamingWords = [];  // Changed to word-level tracking
        this.completedWords = [];  // Track completed words
        this.checkpoints = [];
        this.wordQueue = [];  // Queue of words to stream
        
        // Variant tracking
        this.currentVariants = null;
        this.correctVariantPosition = null; // 'top' or 'bottom'
        this.variantSelected = false;  // Track if variant has been selected
        this.hoveredVariant = null; // Track which variant is being hovered
        
        // Scoring
        this.gameScore = {
            correct: 0,
            wrong: 0,
            totalFragments: 0
        };
        
        // Speed and timing
        this.baseSpeed = 100; // pixels per second
        this.currentSpeed = 100;
        this.speedRampingTimer = null;
        this.gameTimer = null;
        this.timeRemaining = 0;
        this.optimalTime = 0;
        
        // UI zones
        this.zones = {
            header: { height: 60 },
            book: { height: 300 },
            streaming: { height: 240 }
        };
        
        // Renderer and input handler
        this.renderer = null;
        this.inputHandler = null;
        
        // Text styling
        this.textStyle = {
            fontSize: 20,
            lineHeight: 30,
            font: 'Georgia, serif',
            color: '#003366'
        };
        
        // Animation state
        this.animationId = null;
        this.lastTimestamp = 0;
        
        // Dev mode
        this.isDevMode = window.location.search.includes('dev');
        this.isPaused = false;
    }
    
    /**
     * Get default settings for speed reading
     */
    getDefaultSettings() {
        return {
            difficulty: 'easy',     // easy (vocab), moderate (spelling), hard (both)
            variant: 'vocab'        // vocab or spelling (overridden by difficulty)
        };
    }
    
    /**
     * Initialize the exercise with canvas and settings
     */
    async initializeGame(canvas, settings = {}) {
        // Reset game state
        this.resetGameState();
        
        // Initialize base exercise
        this.initialize(settings);
        
        // Set up renderer
        this.renderer = new CanvasRenderer(canvas, {
            width: 900,
            height: 600,
            backgroundColor: '#FFFFFF',
            autoResize: false
        });
        
        // Set up input handler
        this.inputHandler = new InputHandler(canvas);
        this.setupInputHandlers();
        
        // Load narrative data
        this.loadNarrative();
        
        // Calculate game parameters based on difficulty
        this.calculateGameParameters();
        
        return this;
    }
    
    /**
     * Reset all game state
     */
    resetGameState() {
        this.currentFragmentIndex = 0;
        this.streamingWords = [];
        this.completedWords = [];
        this.checkpoints = [];
        this.wordQueue = [];
        this.currentVariants = null;
        this.correctVariantPosition = null;
        this.variantSelected = false;
        this.hoveredVariant = null;
        
        this.gameScore = {
            correct: 0,
            wrong: 0,
            totalFragments: 0
        };
        
        if (this.speedRampingTimer) {
            clearInterval(this.speedRampingTimer);
            this.speedRampingTimer = null;
        }
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }
    
    /**
     * Load narrative from curriculum
     */
    loadNarrative() {
        // Access the curriculum data directly
        const curriculumData = this.curriculumManager.curriculumData;
        if (!curriculumData || !curriculumData.content || !curriculumData.content.narrative) {
            console.error('No narrative content available');
            return;
        }
        
        this.narrative = curriculumData.content.narrative;
        
        // Count total fragments (use canonical as base)
        const canonicalKeys = Object.keys(this.narrative.canonical);
        this.gameScore.totalFragments = canonicalKeys.length;
    }
    
    /**
     * Clean text by removing curly brackets
     */
    cleanText(text) {
        return text.replace(/[{}]/g, '');
    }
    
    /**
     * Calculate game parameters based on difficulty
     */
    calculateGameParameters() {
        const difficulty = this.settings.difficulty;
        
        // Base speeds for each difficulty
        switch (difficulty) {
            case 'easy':
                this.baseSpeed = 80;  // pixels per second
                this.settings.variant = 'vocab';
                break;
            case 'moderate':
                this.baseSpeed = 96;  // 20% faster than easy
                this.settings.variant = 'spelling';
                break;
            case 'hard':
                this.baseSpeed = 115; // 20% faster than moderate
                this.settings.variant = 'both'; // Uses both variants
                break;
            default:
                this.baseSpeed = 80;
                this.settings.variant = 'vocab';
        }
        
        this.currentSpeed = this.baseSpeed;
        
        // Calculate optimal time (rough estimate based on text length)
        const totalTextLength = this.calculateTotalTextLength();
        const optimalReadingSpeed = 200; // words per minute for optimal reading
        const averageWordLength = 5;
        const estimatedWords = totalTextLength / averageWordLength;
        this.optimalTime = Math.ceil((estimatedWords / optimalReadingSpeed) * 60); // in seconds
        
        // Set timer to 200% of optimal time
        this.timeRemaining = this.optimalTime * 2;
    }
    
    /**
     * Calculate total text length
     */
    calculateTotalTextLength() {
        let totalLength = 0;
        const canonical = this.narrative.canonical;
        
        for (let key in canonical) {
            totalLength += canonical[key].text.length;
        }
        
        return totalLength;
    }
    
    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        // Mouse move handler for hover effects
        this.inputHandler.on('mousemove', (data) => {
            if (this.state !== 'active' || this.isPaused) return;
            if (!this.currentVariants || this.variantSelected) return;
            
            // Check if mouse is over a variant
            const streamingY = this.zones.header.height + this.zones.book.height;
            const topY = streamingY + 40;
            const bottomY = streamingY + 80;
            
            // Check if mouse is horizontally within variant text
            const textWidth = this.renderer.measureText(
                this.currentVariants.top.text,
                `${this.textStyle.fontSize}px ${this.textStyle.font}`
            ).width;
            
            if (data.x >= this.currentVariants.x && data.x <= this.currentVariants.x + textWidth) {
                // Check vertical position
                if (data.y >= topY - 15 && data.y <= topY + 15) {
                    this.hoveredVariant = 'top';
                    this.renderer.canvas.style.cursor = 'pointer';
                } else if (data.y >= bottomY - 15 && data.y <= bottomY + 15) {
                    this.hoveredVariant = 'bottom';
                    this.renderer.canvas.style.cursor = 'pointer';
                } else {
                    this.hoveredVariant = null;
                    this.renderer.canvas.style.cursor = 'default';
                }
            } else {
                this.hoveredVariant = null;
                this.renderer.canvas.style.cursor = 'default';
            }
        });
        
        // Click handler for variant selection and pause button
        this.inputHandler.on('click', (data) => {
            if (this.state !== 'active') return;
            
            // Check if pause button was clicked (dev mode)
            if (this.isDevMode) {
                const pauseBtnX = this.renderer.width - 150;
                const pauseBtnY = 25;
                const pauseBtnWidth = 100;
                const pauseBtnHeight = 30;
                
                if (data.x >= pauseBtnX && data.x <= pauseBtnX + pauseBtnWidth &&
                    data.y >= pauseBtnY && data.y <= pauseBtnY + pauseBtnHeight) {
                    this.togglePause();
                    return;
                }
            }
            
            if (this.isPaused) return;
            if (!this.currentVariants || this.variantSelected) return;
            
            // Use the hovered variant for selection
            if (this.hoveredVariant) {
                this.handleVariantSelection(this.hoveredVariant);
            }
        });
        
        // Keyboard shortcuts
        this.inputHandler.on('keydown', (data) => {
            if (this.state !== 'active') return;
            
            if (data.key === 'escape') {
                this.pause();
            } else if (data.key === ' ' && this.isDevMode) {
                // Spacebar to pause in dev mode
                this.togglePause();
            }
        });
    }
    
    /**
     * Handle variant selection
     */
    handleVariantSelection(clickedPosition) {
        if (!this.currentVariants || this.variantSelected) return;
        
        const isCorrect = (clickedPosition === this.correctVariantPosition);
        
        if (isCorrect) {
            // Flash gold and continue
            this.currentVariants.flashColor = '#FFD700';
            this.currentVariants.flashDuration = 500;
            this.currentVariants.flashStart = Date.now();
            
            this.gameScore.correct++;
            
            // Mark variant as selected and hide the wrong one
            this.currentVariants.selected = true;
            this.variantSelected = true;
            
            // Just mark as selected - the variant will turn yellow and continue flowing
            // No need to add text to streaming since it's already displayed as a variant
            
            // Clear variants after a short delay
            setTimeout(() => {
                this.currentVariants = null;
                this.variantSelected = false;
            }, 500);
            
            // Update score
            this.emit('scoreUpdate', {
                correct: this.gameScore.correct,
                wrong: this.gameScore.wrong,
                total: this.gameScore.totalFragments
            });
        } else {
            // Flash red and reset to checkpoint
            this.currentVariants.flashColor = '#FF0000';
            this.currentVariants.flashDuration = 500;
            this.currentVariants.flashStart = Date.now();
            
            this.gameScore.wrong++;
            
            // Reset to last checkpoint after flash
            setTimeout(() => {
                this.resetToCheckpoint();
            }, 500);
            
            // Update score
            this.emit('scoreUpdate', {
                correct: this.gameScore.correct,
                wrong: this.gameScore.wrong,
                total: this.gameScore.totalFragments
            });
        }
    }
    
    /**
     * Create checkpoint
     */
    createCheckpoint() {
        this.checkpoints.push({
            fragmentIndex: this.currentFragmentIndex,
            completedWords: [...this.completedWords],
            score: { ...this.gameScore }
        });
        
        // Keep only last 3 checkpoints
        if (this.checkpoints.length > 3) {
            this.checkpoints.shift();
        }
    }
    
    /**
     * Reset to last checkpoint
     */
    resetToCheckpoint() {
        if (this.checkpoints.length === 0) {
            // No checkpoint, reset to beginning
            this.currentFragmentIndex = 0;
            this.completedWords = [];
            this.streamingWords = [];
            this.wordQueue = [];
            return;
        }
        
        const checkpoint = this.checkpoints[this.checkpoints.length - 1];
        this.currentFragmentIndex = checkpoint.fragmentIndex;
        this.completedWords = [...checkpoint.completedWords];
        this.gameScore = { ...checkpoint.score };
        this.streamingWords = [];
        this.wordQueue = [];
        this.currentVariants = null;
        this.variantSelected = false;
    }
    
    /**
     * Called when exercise starts
     */
    onStart() {
        // Start game timer
        this.startGameTimer();
        
        // Start speed ramping
        this.startSpeedRamping();
        
        // Start streaming text
        this.startStreaming();
        
        // Start animation loop
        this.startAnimation();
    }
    
    /**
     * Start game timer
     */
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            
            this.emit('timeUpdate', {
                remaining: this.timeRemaining,
                total: this.optimalTime * 2
            });
            
            if (this.timeRemaining <= 0) {
                this.end();
            }
        }, 1000);
    }
    
    /**
     * Start speed ramping (15% increase over time)
     */
    startSpeedRamping() {
        const totalTime = this.optimalTime * 2;
        const rampInterval = 5000; // Update every 5 seconds
        
        this.speedRampingTimer = setInterval(() => {
            const elapsed = (this.optimalTime * 2) - this.timeRemaining;
            const progress = elapsed / totalTime;
            
            // Apply 15% increase over the course of the game
            const rampMultiplier = 1 + (progress * 0.15);
            this.currentSpeed = this.baseSpeed * rampMultiplier;
        }, rampInterval);
    }
    
    /**
     * Start streaming text
     */
    startStreaming() {
        this.prepareNextFragment();
        // Start continuous streaming
        this.continuousStream();
    }
    
    /**
     * Toggle pause state (dev mode)
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        console.log(`Speed Reading ${this.isPaused ? 'PAUSED' : 'RESUMED'}`);
    }
    
    /**
     * Continuous streaming manager
     */
    continuousStream() {
        this.streamInterval = setInterval(() => {
            if (this.state !== 'active') {
                clearInterval(this.streamInterval);
                return;
            }
            
            if (this.isPaused) return; // Skip if paused
            
            // Check if we need to prepare more content
            const lastStreamingWord = this.streamingWords[this.streamingWords.length - 1];
            const lastQueuedWord = this.wordQueue[this.wordQueue.length - 1];
            const lastX = lastQueuedWord ? lastQueuedWord.x : (lastStreamingWord ? lastStreamingWord.x : this.renderer.width);
            
            // If last word is getting close to screen edge and we have no variants, prepare next
            if (lastX < this.renderer.width + 300 && !this.currentVariants && this.wordQueue.length < 5) {
                this.prepareNextFragment();
            }
            
            // Process word queue
            if (this.wordQueue.length > 0 && !this.currentVariants) {
                const nextWord = this.wordQueue.shift();
                
                // If previous word had paragraph break, add extra spacing
                if (this.streamingWords.length > 0) {
                    const prevWord = this.streamingWords[this.streamingWords.length - 1];
                    if (prevWord.hasParagraphBreak) {
                        // Add visual paragraph spacing
                        const paragraphSpacing = this.renderer.measureText('    ', `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                        nextWord.x += paragraphSpacing;
                        // Shift all remaining queued words
                        for (let qWord of this.wordQueue) {
                            qWord.x += paragraphSpacing;
                        }
                    }
                }
                
                this.streamingWords.push(nextWord);
            }
        }, 100);
    }
    
    /**
     * Prepare next fragment for streaming
     */
    prepareNextFragment() {
        // Debug logging
        if (this.isDevMode) {
            console.log(`\n=== Preparing fragment ${this.currentFragmentIndex} ===`);
        }
        
        // Find the next valid fragment index
        const maxFragments = Object.keys(this.narrative.canonical).length;
        
        if (this.currentFragmentIndex >= maxFragments) {
            // All fragments completed
            if (this.streamingWords.length === 0 && this.wordQueue.length === 0) {
                this.end();
            }
            return;
        }
        
        const canonical = this.narrative.canonical[this.currentFragmentIndex.toString()];
        if (canonical) {
            
            const variant = this.getVariantFragment(this.currentFragmentIndex);
            
            if (variant) {
                // Two variants - create streaming pair
                const correctIsTop = Math.random() < 0.5;
                this.correctVariantPosition = correctIsTop ? 'top' : 'bottom';
                
                // Calculate variant position based on last element
                let startX = this.renderer.width;
                
                // Check both streaming words and queued words for last position
                let lastX = 0;
                let needsSpace = false;
                
                if (this.streamingWords.length > 0) {
                    const lastWord = this.streamingWords[this.streamingWords.length - 1];
                    const wordWidth = this.renderer.measureText(lastWord.word, `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                    lastX = lastWord.x + wordWidth;
                    needsSpace = true;
                }
                
                if (this.wordQueue.length > 0) {
                    const lastQueued = this.wordQueue[this.wordQueue.length - 1];
                    const wordWidth = this.renderer.measureText(lastQueued.word, `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                    const queuedX = lastQueued.x + wordWidth;
                    if (queuedX > lastX) {
                        lastX = queuedX;
                        needsSpace = true;
                    }
                }
                
                if (needsSpace) {
                    const spaceWidth = this.renderer.measureText(' ', `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                    startX = lastX + spaceWidth;
                }
                
                // Clean text for both variants
                const cleanedCanonical = { ...canonical, text: this.cleanText(canonical.text) };
                const cleanedVariant = { ...variant, text: this.cleanText(variant.text) };
                
                this.currentVariants = {
                    top: correctIsTop ? cleanedCanonical : cleanedVariant,
                    bottom: correctIsTop ? cleanedVariant : cleanedCanonical,
                    x: startX,
                    selected: false,
                    flashColor: null,
                    flashDuration: 0,
                    flashStart: null
                };
                
                // Create checkpoint before variant choice
                this.createCheckpoint();
            } else if (canonical) {
                // Single line - convert to words and add to queue
                const cleanedText = this.cleanText(canonical.text);
                const hasParagraphBreak = cleanedText.includes('\n\n');
                
                // Split text but preserve paragraph markers
                let textToProcess = cleanedText;
                let addExtraSpace = false;
                
                if (hasParagraphBreak) {
                    // Remove the \n\n for word processing but remember to add space
                    textToProcess = cleanedText.replace(/\n\n/g, ' ');
                    addExtraSpace = true;
                }
                
                const words = textToProcess.split(' ').filter(w => w.trim());
                
                // Calculate starting position - check all existing elements
                let currentX = this.renderer.width;
                let lastX = 0;
                
                // Check streaming words
                if (this.streamingWords.length > 0) {
                    const lastWord = this.streamingWords[this.streamingWords.length - 1];
                    const wordWidth = this.renderer.measureText(lastWord.word, `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                    lastX = Math.max(lastX, lastWord.x + wordWidth);
                }
                
                // Check queued words
                if (this.wordQueue.length > 0) {
                    const lastQueued = this.wordQueue[this.wordQueue.length - 1];
                    const wordWidth = this.renderer.measureText(lastQueued.word, `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                    lastX = Math.max(lastX, lastQueued.x + wordWidth);
                }
                
                // Check current variants
                if (this.currentVariants) {
                    const variantWidth = this.renderer.measureText(
                        this.currentVariants.top.text,
                        `${this.textStyle.fontSize}px ${this.textStyle.font}`
                    ).width;
                    lastX = Math.max(lastX, this.currentVariants.x + variantWidth);
                }
                
                if (lastX > 0) {
                    const spaceWidth = this.renderer.measureText(' ', `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                    currentX = lastX + spaceWidth;
                }
                
                words.forEach((word, index) => {
                    if (word.trim()) {
                        this.wordQueue.push({
                            word: word,
                            x: currentX,
                            fragmentIndex: this.currentFragmentIndex,
                            isCanonical: true
                        });
                        // Add spacing between words (word width + space)
                        const wordWidth = this.renderer.measureText(word, `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                        const spaceWidth = this.renderer.measureText(' ', `${this.textStyle.fontSize}px ${this.textStyle.font}`).width;
                        currentX += wordWidth + spaceWidth;
                        
                        if (this.isDevMode) {
                            console.log(`  Queued word "${word}" at x=${Math.round(currentX - wordWidth - spaceWidth)}`);
                        }
                    }
                });
                
                // Add more spacing after paragraph break fragments
                if (addExtraSpace && this.wordQueue.length > 0) {
                    // Mark the last word with paragraph break
                    const lastQueuedWord = this.wordQueue[this.wordQueue.length - 1];
                    lastQueuedWord.hasParagraphBreak = true;
                }
            }
            
            
            // Debug logging
            if (this.isDevMode) {
                console.log(`Fragment ${this.currentFragmentIndex} prepared: "${canonical.text.substring(0, 30)}..."`);
            }
        }
        
        this.currentFragmentIndex++;
    }
    
    /**
     * Get variant fragment for current index
     */
    getVariantFragment(index) {
        const difficulty = this.settings.difficulty;
        const indexStr = index.toString();
        
        if (difficulty === 'easy') {
            // Vocabulary variant
            return this.narrative.vocab?.[indexStr] || null;
        } else if (difficulty === 'moderate') {
            // Spelling variant
            return this.narrative.spelling?.[indexStr] || null;
        } else if (difficulty === 'hard') {
            // Both variants - randomly choose one
            const hasSpelling = this.narrative.spelling?.[indexStr];
            const hasVocab = this.narrative.vocab?.[indexStr];
            
            if (hasSpelling && hasVocab) {
                return Math.random() < 0.5 ? hasSpelling : hasVocab;
            }
            return hasSpelling || hasVocab || null;
        }
        
        return null;
    }
    
    /**
     * Start animation loop
     */
    startAnimation() {
        const animate = (timestamp) => {
            if (this.state !== 'active') return;
            
            const deltaTime = timestamp - this.lastTimestamp;
            this.lastTimestamp = timestamp;
            
            this.update(deltaTime / 1000); // Convert to seconds
            this.render();
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    /**
     * Update game state
     */
    update(deltaTime) {
        if (!deltaTime || deltaTime > 0.1) deltaTime = 0.016; // Cap at 60fps
        
        if (this.isPaused) return; // Skip update if paused
        
        const movement = this.currentSpeed * deltaTime;
        
        // Update streaming words position
        for (let i = this.streamingWords.length - 1; i >= 0; i--) {
            const word = this.streamingWords[i];
            word.x -= movement;
            
            // Check if word has passed left border
            if (word.x + this.renderer.measureText(word.word, `${this.textStyle.fontSize}px ${this.textStyle.font}`).width < 0) {
                // Add to completed words with all properties
                this.completedWords.push({
                    word: word.word,
                    fragmentIndex: word.fragmentIndex,
                    hasParagraphBreak: word.hasParagraphBreak || false
                });
                
                // Remove from streaming
                this.streamingWords.splice(i, 1);
            }
        }
        
        // Update word queue positions
        for (let word of this.wordQueue) {
            word.x -= movement;
        }
        
        // Update variant position
        if (this.currentVariants) {
            this.currentVariants.x -= movement;
            
            // Check if variants have passed without selection
            const textWidth = this.renderer.measureText(
                this.currentVariants.top.text,
                `${this.textStyle.fontSize}px ${this.textStyle.font}`
            ).width;
            
            if (this.currentVariants.x + textWidth < 0) {
                // Variant has passed left edge
                if (!this.currentVariants.selected) {
                    // Treat as wrong selection
                    this.gameScore.wrong++;
                    this.resetToCheckpoint();
                } else {
                    // Add correct variant text to completed words
                    const correctText = this.correctVariantPosition === 'top' 
                        ? this.currentVariants.top.text 
                        : this.currentVariants.bottom.text;
                    
                    const words = correctText.split(' ').filter(w => w.trim());
                    words.forEach(word => {
                        this.completedWords.push({
                            word: word,
                            fragmentIndex: this.currentFragmentIndex - 1,
                            hasParagraphBreak: false
                        });
                    });
                    
                    // Clear variants
                    this.currentVariants = null;
                    this.variantSelected = false;
                }
            }
        }
    }
    
    /**
     * Render the game
     */
    render() {
        // Clear canvas
        this.renderer.clear();
        
        // Render header zone
        this.renderHeader();
        
        // Render book zone
        this.renderBook();
        
        // Render streaming zone
        this.renderStreaming();
    }
    
    /**
     * Render header with timer and score
     */
    renderHeader() {
        const y = 30;
        
        // Timer
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeText = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.renderer.drawText(timeText, 50, y, {
            font: `bold 20px Arial`,
            color: this.timeRemaining < 30 ? '#FF0000' : '#003366',
            align: 'left',
            baseline: 'middle'
        });
        
        // Score
        const scoreText = `Correct: ${this.gameScore.correct} | Wrong: ${this.gameScore.wrong}`;
        this.renderer.drawText(scoreText, this.renderer.width / 2, y, {
            font: `bold 20px Arial`,
            color: '#003366',
            align: 'center',
            baseline: 'middle'
        });
        
        // Progress
        const progress = Math.round((this.completedWords.length / (this.gameScore.totalFragments * 10)) * 100); // Estimate words per fragment
        const progressText = `Progress: ${Math.min(progress, 100)}%`;
        
        this.renderer.drawText(progressText, this.renderer.width - 50, y, {
            font: `bold 20px Arial`,
            color: '#003366',
            align: 'right',
            baseline: 'middle'
        });
        
        // Draw separator line
        this.renderer.drawLine(
            0, this.zones.header.height,
            this.renderer.width, this.zones.header.height,
            { color: '#CCCCCC', width: 2 }
        );
        
        // Draw pause button in dev mode
        if (this.isDevMode) {
            const btnX = this.renderer.width - 150;
            const btnY = 25;
            const btnWidth = 100;
            const btnHeight = 30;
            
            // Button background
            this.renderer.drawRect(btnX, btnY - 15, btnWidth, btnHeight, {
                fillColor: this.isPaused ? '#FF6B6B' : '#4CAF50',
                strokeColor: '#333333',
                lineWidth: 2
            });
            
            // Button text
            this.renderer.drawText(this.isPaused ? 'PAUSED' : 'Pause', btnX + 50, btnY, {
                font: 'bold 16px Arial',
                color: '#FFFFFF',
                align: 'center',
                baseline: 'middle'
            });
        }
    }
    
    /**
     * Render book zone with completed text
     */
    renderBook() {
        const startY = this.zones.header.height + 40;
        const padding = 50;
        const maxWidth = this.renderer.width - (padding * 2);
        
        // Combine completed words with proper paragraph breaks
        let fullText = '';
        let lastFragmentIndex = -1;
        
        for (let i = 0; i < this.completedWords.length; i++) {
            const wordObj = this.completedWords[i];
            
            // Check if we need a paragraph break (when fragment changes and previous had \n\n)
            if (wordObj.fragmentIndex !== lastFragmentIndex && lastFragmentIndex !== -1) {
                // Check if the previous fragment had a paragraph break
                const prevFragmentWords = this.completedWords.filter(w => w.fragmentIndex === lastFragmentIndex);
                if (prevFragmentWords.length > 0) {
                    const lastWordOfPrevFragment = prevFragmentWords[prevFragmentWords.length - 1];
                    if (lastWordOfPrevFragment.hasParagraphBreak) {
                        fullText += '\n\n';
                    }
                }
            }
            
            // Add space before word (except first word or after paragraph break)
            if (fullText && !fullText.endsWith('\n')) {
                fullText += ' ';
            }
            
            fullText += wordObj.word;
            lastFragmentIndex = wordObj.fragmentIndex;
        }
        
        // Wrap text to fit width
        const lines = this.wrapText(fullText, maxWidth);
        
        // Render lines
        let y = startY;
        for (let line of lines) {
            if (y > this.zones.header.height + this.zones.book.height - 20) break;
            
            this.renderer.drawText(line, padding, y, {
                font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                color: this.textStyle.color,
                align: 'left',
                baseline: 'top'
            });
            
            y += this.textStyle.lineHeight;
        }
        
        // Draw separator line
        const separatorY = this.zones.header.height + this.zones.book.height;
        this.renderer.drawLine(
            0, separatorY,
            this.renderer.width, separatorY,
            { color: '#CCCCCC', width: 2 }
        );
    }
    
    /**
     * Render streaming zone
     */
    renderStreaming() {
        const streamingY = this.zones.header.height + this.zones.book.height;
        
        // Render streaming words
        for (let wordObj of this.streamingWords) {
            const y = streamingY + 60;
            
            this.renderer.drawText(wordObj.word, wordObj.x, y, {
                font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                color: this.textStyle.color,
                align: 'left',
                baseline: 'middle'
            });
        }
        
        // Render variant pairs (only if not selected)
        if (this.currentVariants && !this.variantSelected) {
            const topY = streamingY + 40;
            const bottomY = streamingY + 80;
            
            // Apply flash effect if active
            let color = this.textStyle.color;
            if (this.currentVariants.flashColor && this.currentVariants.flashStart) {
                const elapsed = Date.now() - this.currentVariants.flashStart;
                if (elapsed < this.currentVariants.flashDuration) {
                    color = this.currentVariants.flashColor;
                }
            }
            
            // Show both variants, with correct one in yellow if selected
            if (!this.currentVariants.selected) {
                // Top variant with hover effect
                const topColor = this.hoveredVariant === 'top' ? '#0066CC' : color;
                this.renderer.drawText(this.currentVariants.top.text, this.currentVariants.x, topY, {
                    font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                    color: topColor,
                    align: 'left',
                    baseline: 'middle'
                });
                
                // Bottom variant with hover effect
                const bottomColor = this.hoveredVariant === 'bottom' ? '#0066CC' : color;
                this.renderer.drawText(this.currentVariants.bottom.text, this.currentVariants.x, bottomY, {
                    font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                    color: bottomColor,
                    align: 'left',
                    baseline: 'middle'
                });
            } else {
                // Show both variants, with correct one in yellow
                const topColor = this.correctVariantPosition === 'top' ? '#FFD700' : '#999999';
                const bottomColor = this.correctVariantPosition === 'bottom' ? '#FFD700' : '#999999';
                
                this.renderer.drawText(this.currentVariants.top.text, this.currentVariants.x, topY, {
                    font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                    color: topColor,
                    align: 'left',
                    baseline: 'middle'
                });
                
                this.renderer.drawText(this.currentVariants.bottom.text, this.currentVariants.x, bottomY, {
                    font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                    color: bottomColor,
                    align: 'left',
                    baseline: 'middle'
                });
            }
                
            
            // Draw hover highlight background
            if (this.hoveredVariant && !this.currentVariants.selected) {
                    const highlightY = this.hoveredVariant === 'top' ? topY : bottomY;
                    const textWidth = this.renderer.measureText(
                        this.currentVariants[this.hoveredVariant].text,
                        `${this.textStyle.fontSize}px ${this.textStyle.font}`
                    ).width;
                    
                    // Draw subtle background highlight using renderer's drawRect method
                    this.renderer.drawRect(
                        this.currentVariants.x - 5,
                        highlightY - 15,
                        textWidth + 10,
                        30,
                        { fillColor: 'rgba(0, 102, 204, 0.1)' }
                );
            }
            
            // Removed "Click to select" prompt
        }
    }
    
    /**
     * Wrap text to fit width
     */
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = this.renderer.measureText(
                testLine,
                `${this.textStyle.fontSize}px ${this.textStyle.font}`
            );
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    /**
     * Called when exercise is paused
     */
    onPause() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        if (this.speedRampingTimer) {
            clearInterval(this.speedRampingTimer);
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Called when exercise ends
     */
    onEnd() {
        // Clear timers
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.speedRampingTimer) {
            clearInterval(this.speedRampingTimer);
            this.speedRampingTimer = null;
        }
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Set final score
        this.score = this.gameScore.correct;
        this.totalQuestions = this.gameScore.totalFragments;
    }
    
    /**
     * Get exercise results
     */
    getResults() {
        const results = super.getResults();
        
        // Add speed reading specific results
        results.gameScore = { ...this.gameScore };
        results.completionRate = Math.round((this.completedWords.length / (this.gameScore.totalFragments * 10)) * 100);
        results.timeUsed = (this.optimalTime * 2) - this.timeRemaining;
        
        return results;
    }
    
    /**
     * Clean up when destroyed
     */
    onDestroy() {
        if (this.renderer) {
            this.renderer.destroy();
        }
        if (this.inputHandler) {
            this.inputHandler.destroy();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeedReadingExercise;
}
