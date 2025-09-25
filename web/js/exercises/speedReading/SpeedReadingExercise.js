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
        // Click handler for variant selection
        this.inputHandler.on('click', (data) => {
            if (this.state !== 'active') return;
            if (!this.currentVariants) return;
            
            // Determine which variant was clicked based on y position
            const streamingY = this.zones.header.height + this.zones.book.height;
            const lineHeight = this.textStyle.lineHeight;
            
            if (data.y >= streamingY && data.y <= this.renderer.height) {
                const relativeY = data.y - streamingY;
                
                // Check if click is on top or bottom line
                let clickedPosition;
                if (relativeY < streamingY + lineHeight + 10) {
                    clickedPosition = 'top';
                } else if (relativeY < streamingY + (lineHeight * 2) + 20) {
                    clickedPosition = 'bottom';
                } else {
                    return; // Click outside variant lines
                }
                
                this.handleVariantSelection(clickedPosition);
            }
        });
        
        // Keyboard shortcuts
        this.inputHandler.on('keydown', (data) => {
            if (this.state !== 'active') return;
            
            if (data.key === 'escape') {
                this.pause();
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
            
            // Convert correct variant to streaming words
            const correctText = this.correctVariantPosition === 'top' 
                ? this.currentVariants.top.text 
                : this.currentVariants.bottom.text;
            
            // Check for paragraph breaks
            const hasParagraphBreak = correctText.includes('\n\n');
            const textToProcess = correctText.replace(/\n\n/g, ' ');
            
            // Add words from correct variant to streaming
            const words = textToProcess.split(' ').filter(w => w.trim());
            let currentX = this.currentVariants.x;
            
            words.forEach((word, index) => {
                if (word.trim()) {
                    const wordObj = {
                        word: word,
                        x: currentX,
                        fragmentIndex: this.currentFragmentIndex - 1,
                        isFromVariant: true
                    };
                    
                    // Mark last word if fragment has paragraph break
                    if (hasParagraphBreak && index === words.length - 1) {
                        wordObj.hasParagraphBreak = true;
                        const fourSpacesWidth = this.renderer.measureText(
                            '    ',
                            `${this.textStyle.fontSize}px ${this.textStyle.font}`
                        ).width;
                        wordObj.extraSpacing = fourSpacesWidth;
                    }
                    
                    this.streamingWords.push(wordObj);
                    
                    // Add spacing between words
                    const wordWidth = this.renderer.measureText(
                        word + ' ',
                        `${this.textStyle.fontSize}px ${this.textStyle.font}`
                    ).width;
                    currentX += wordWidth;
                }
            });
            
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
     * Continuous streaming manager
     */
    continuousStream() {
        const streamInterval = setInterval(() => {
            if (this.state !== 'active') {
                clearInterval(streamInterval);
                return;
            }
            
            // Check if we need to prepare more content
            const lastWord = this.streamingWords[this.streamingWords.length - 1];
            const lastX = lastWord ? lastWord.x : this.renderer.width;
            
            // If last word is getting close to screen edge and we have no variants, prepare next
            if (lastX < this.renderer.width + 200 && !this.currentVariants && this.wordQueue.length === 0) {
                this.prepareNextFragment();
            }
            
            // Process word queue
            if (this.wordQueue.length > 0 && !this.currentVariants) {
                const nextWord = this.wordQueue.shift();
                
                // If previous word had paragraph break, adjust position
                if (this.streamingWords.length > 0) {
                    const prevWord = this.streamingWords[this.streamingWords.length - 1];
                    if (prevWord.hasParagraphBreak && prevWord.extraSpacing) {
                        // Shift all queued words by the extra spacing
                        nextWord.x += prevWord.extraSpacing;
                        for (let qWord of this.wordQueue) {
                            qWord.x += prevWord.extraSpacing;
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
        // Find the next valid fragment index
        while (this.currentFragmentIndex < 100) { // Reasonable upper limit
            const canonical = this.narrative.canonical[this.currentFragmentIndex.toString()];
            if (!canonical) {
                this.currentFragmentIndex++;
                continue;
            }
            
            const variant = this.getVariantFragment(this.currentFragmentIndex);
            
            if (variant) {
                // Two variants - create streaming pair
                const correctIsTop = Math.random() < 0.5;
                this.correctVariantPosition = correctIsTop ? 'top' : 'bottom';
                
                // Calculate starting position based on last streaming word
                const lastWord = this.streamingWords[this.streamingWords.length - 1];
                const startX = lastWord ? lastWord.x + 100 : this.renderer.width;
                
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
                const lastWord = this.streamingWords[this.streamingWords.length - 1];
                let currentX = lastWord ? lastWord.x + this.renderer.measureText(lastWord.word + ' ', `${this.textStyle.fontSize}px ${this.textStyle.font}`).width : this.renderer.width;
                
                words.forEach((word, index) => {
                    if (word.trim()) {
                        this.wordQueue.push({
                            word: word,
                            x: currentX,
                            fragmentIndex: this.currentFragmentIndex,
                            isCanonical: true
                        });
                        // Add spacing between words
                        const wordWidth = this.renderer.measureText(
                            word + ' ',
                            `${this.textStyle.fontSize}px ${this.textStyle.font}`
                        ).width;
                        currentX += wordWidth;
                    }
                });
                
                // Add 4 spaces after paragraph break fragments
                if (addExtraSpace && words.length > 0) {
                    const fourSpacesWidth = this.renderer.measureText(
                        '    ',
                        `${this.textStyle.fontSize}px ${this.textStyle.font}`
                    ).width;
                    // Update the position of the last word to include extra spacing
                    if (this.wordQueue.length > 0) {
                        const lastQueuedWord = this.wordQueue[this.wordQueue.length - 1];
                        lastQueuedWord.hasParagraphBreak = true;
                        lastQueuedWord.extraSpacing = fourSpacesWidth;
                    }
                }
            }
            
            this.currentFragmentIndex++;
            return; // Exit after processing one fragment
        }
        
        // All fragments completed
        if (this.streamingWords.length === 0 && this.wordQueue.length === 0) {
            this.end();
        }
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
        
        const movement = this.currentSpeed * deltaTime;
        
        // Update streaming words position
        for (let i = this.streamingWords.length - 1; i >= 0; i--) {
            const word = this.streamingWords[i];
            word.x -= movement;
            
            // Check if word has passed left border
            if (word.x < 0) {
                // Add to completed words
                this.completedWords.push({
                    word: word.word,
                    fragmentIndex: word.fragmentIndex
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
        if (this.currentVariants && !this.variantSelected) {
            this.currentVariants.x -= movement;
            
            // Check if variants have passed without selection
            const textWidth = this.renderer.measureText(
                this.currentVariants.top.text,
                `${this.textStyle.fontSize}px ${this.textStyle.font}`
            ).width;
            
            if (this.currentVariants.x + textWidth < 0) {
                if (!this.currentVariants.selected) {
                    // Treat as wrong selection
                    this.gameScore.wrong++;
                    this.resetToCheckpoint();
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
            
            // Draw vertical separator between variants
            const separatorY = streamingY + 60;
            this.renderer.drawLine(
                0, separatorY,
                this.renderer.width, separatorY,
                { color: '#E0E0E0', width: 1 }
            );
            
            // Only show the non-selected variant if one has been selected
            if (!this.currentVariants.selected) {
                // Top variant
                this.renderer.drawText(this.currentVariants.top.text, this.currentVariants.x, topY, {
                    font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                    color: color,
                    align: 'left',
                    baseline: 'middle'
                });
                
                // Bottom variant
                this.renderer.drawText(this.currentVariants.bottom.text, this.currentVariants.x, bottomY, {
                    font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                    color: color,
                    align: 'left',
                    baseline: 'middle'
                });
            } else {
                // Only show the selected (correct) variant
                const selectedText = this.correctVariantPosition === 'top' 
                    ? this.currentVariants.top.text 
                    : this.currentVariants.bottom.text;
                const selectedY = streamingY + 60;
                
                this.renderer.drawText(selectedText, this.currentVariants.x, selectedY, {
                    font: `${this.textStyle.fontSize}px ${this.textStyle.font}`,
                    color: color,
                    align: 'left',
                    baseline: 'middle'
                });
            }
            
            // Highlight on hover (only if not selected)
            if (!this.currentVariants.selected) {
                const hoverText = 'Click to select the correct text';
                this.renderer.drawText(hoverText, this.renderer.width / 2, streamingY + 120, {
                    font: `italic 16px Arial`,
                    color: '#999999',
                    align: 'center',
                    baseline: 'middle'
                });
            }
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
