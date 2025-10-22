/**
 * Fluent Reading Exercise - Reading practice with streaming text
 * @class FluentReadingExercise
 * @extends ExerciseFramework
 */
class FluentReadingExercise extends ExerciseFramework {
    /**
     * Difficulty behavior configurations
     * For Fluent Reading, metacognitive prompts are used at the end regardless of difficulty
     */
    static DIFFICULTY_BEHAVIORS = {
        'easy': {
            feedbackTiming: 'end_only',
            metacognitivePrompts: true,
            prompts: [
                'Which words or phrases were hardest to read?',
                'What strategies did you use to keep up with the text?',
                'Did you find any patterns that helped you read faster?'
            ],
            description: 'Easy - Slower speed, metacognitive reflection at end'
        },
        'moderate': {
            feedbackTiming: 'end_only',
            metacognitivePrompts: true,
            prompts: [
                'How did the reading speed feel for you?',
                'Which parts were most challenging?',
                'What would help you read more fluently?'
            ],
            description: 'Moderate - Medium speed, metacognitive reflection at end'
        },
        'hard': {
            feedbackTiming: 'end_only',
            metacognitivePrompts: true,
            prompts: [
                'What made this reading challenging?',
                'How did you handle the faster pace?',
                'What strategies would you use next time?'
            ],
            description: 'Hard - Fast speed, metacognitive reflection at end'
        }
    };

    constructor(curriculumManager) {
        super(curriculumManager, 'fluent_reading');
        
        // Core properties
        this.canvas = null;
        this.renderer = null;
        this.inputHandler = null;
        
        // Narrative data
        this.narrative = null;
        this.fragments = [];
        this.totalWords = 0;
        
        // Display state
        this.pageText = [];  // Words displayed in the page zone
        this.scrollOffset = 0;  // Vertical scroll offset for page zone
        this.maxScrollOffset = 0;  // Maximum scroll offset reached
        this.isReadingMode = false;  // Post-exercise reading mode
        this.showSummaryPrompt = false;  // Show summary prompt after completion
        
        // Fragment-based streaming
        this.streamingFragments = [];  // Currently streaming fragments
        this.fragmentQueue = [];       // Fragments waiting to stream
        
        // Fragment tracking for highlighting
        this.wordToFragment = new Map();  // Maps word objects to fragment indices
        this.highlightedFragment = null;
        
        // Variant selection tracking
        this.selectedVariants = new Map();  // Maps fragment index to selected variant type
        
        // Timing and speed
        this.wordsPerMinute = 150;  // Default reading speed
        this.pixelsPerSecond = 100;  // Calculated from WPM
        this.predictedDuration = 0;
        this.timeRemaining = 0;
        this.gameTimer = null;
        
        // Zone dimensions
        this.zones = {
            header: { y: 0, height: 60 },
            page: { y: 60, height: 300 },
            streaming: { y: 360, height: 240 }
        };
        
        // Typography settings
        this.fonts = {
            page: {
                family: 'Georgia, serif',
                size: 18,
                lineHeight: 28,
                color: '#333333'
            },
            streaming: {
                family: 'Arial, sans-serif',
                size: 24,
                color: '#000000',          // Black for all variants initially
                goldColor: '#FFD700',      // Gold for selected variants
                errorColor: '#FF0000'      // Red for incorrect selections
            },
            header: {
                family: 'Arial, sans-serif',
                size: 16,
                color: '#666666'
            }
        };
        
        // Stream positions within streaming zone
        this.streamPositions = {
            vocab: 0,      // Will be calculated based on zone height
            canonical: 0,
            spelling: 0
        };
        
        // Animation
        this.animationId = null;
        this.lastTimestamp = 0;
        this.isPaused = false;
        
        // Error handling
        this.isInErrorState = false;
        this.errorPauseTimeout = null;
        
        // Checkpoint tracking
        this.checkpoints = [];  // Array of checkpoint fragment indices
        this.lastCheckpoint = 0;  // Last checkpoint passed
        this.checkpointPageText = [];  // Page text at last checkpoint
        
        // Difficulty settings
        this.difficultyConfig = {
            easy: {
                speedMultiplier: 0.67,
                timerMultiplier: 2.0,
                variants: ['canonical', 'vocab']  // Only show these variants
            },
            moderate: {
                speedMultiplier: 0.85,
                timerMultiplier: 1.5,
                variants: ['canonical', 'spelling']  // Only show these variants
            },
            hard: {
                speedMultiplier: 1.0,
                timerMultiplier: 1.3,
                variants: ['canonical', 'vocab', 'spelling']  // Show all variants
            }
        };
    }
    
    /**
     * Initialize the exercise
     */
    async initializeGame(canvas, settings = {}) {
        this.canvas = canvas;
        this.settings = { ...this.getDefaultSettings(), ...settings };
        
        // Initialize base framework
        this.initialize(settings);
        
        // Setup renderer
        this.renderer = new CanvasRenderer(canvas, {
            width: 900,
            height: 600,
            backgroundColor: '#FFFFFF'
        });
        
        // Setup input handler
        this.inputHandler = new InputHandler(canvas);
        this.setupInputHandlers();
        
        // Load and process narrative
        this.loadNarrative();
        
        // Calculate timing based on speed setting
        this.calculateTiming();
        
        return this;
    }
    
    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            speed: 150,  // Words per minute
            difficulty: 'moderate'  // Default difficulty level
        };
    }
    
    /**
     * Load narrative from curriculum
     */
    loadNarrative() {
        const curriculumData = this.curriculumManager.curriculumData;
        
        // Enhanced error logging
        if (!curriculumData) {
            console.error('FluentReading: No curriculum data available');
            console.error('CurriculumManager state:', this.curriculumManager);
            return;
        }
        
        if (!curriculumData.content) {
            console.error('FluentReading: No content in curriculum data');
            console.error('Available keys:', Object.keys(curriculumData));
            return;
        }
        
        if (!curriculumData.content.narrative) {
            console.error('FluentReading: No narrative in curriculum content');
            console.error('Available content keys:', Object.keys(curriculumData.content));
            return;
        }
        
        this.narrative = curriculumData.content.narrative;
        console.log('FluentReading: Loaded narrative with', Object.keys(this.narrative).length, 'fragments');
        this.processNarrative();
    }
    
    /**
     * Process narrative into fragments and words
     */
    processNarrative() {
        this.fragments = [];
        this.fragmentQueue = [];
        this.totalWords = 0;
        this.checkpoints = [];
        this.lastCheckpoint = 0;
        
        // Calculate stream Y positions
        const streamHeight = this.zones.streaming.height;
        this.streamPositions.vocab = this.zones.streaming.y + streamHeight * 0.2;
        this.streamPositions.canonical = this.zones.streaming.y + streamHeight * 0.5;
        this.streamPositions.spelling = this.zones.streaming.y + streamHeight * 0.8;
        
        // Process narrative in index order
        const indices = Object.keys(this.narrative).sort((a, b) => parseInt(a) - parseInt(b));
        
        for (let index of indices) {
            const fragment = this.narrative[index];
            const fragmentIndex = parseInt(index);
            
            // Skip fragments without text
            if (!fragment.text) continue;
            
            // Extract focal word (text within curly brackets)
            const focalWordMatch = fragment.text.match(/\{([^}]+)\}/);
            const focalWord = focalWordMatch ? focalWordMatch[1] : null;
            
            // Process canonical text
            let canonicalText = fragment.text.replace(/[{}]/g, '');
            // Check if fragment ends with paragraph break BEFORE removing it
            const hasParagraphBreak = canonicalText.includes('\n\n');
            // Remove paragraph breaks for streaming display
            canonicalText = canonicalText.replace(/\n\n/g, ' ');
            
            // Get current difficulty configuration
            const diffConfig = this.difficultyConfig[this.settings.difficulty || 'moderate'];
            
            // Process vocab variant text - empty if no variant or not in difficulty
            let vocabText = '';
            if (fragment.vocab && focalWord && diffConfig.variants.includes('vocab')) {
                let tempText = fragment.text.replace(`{${focalWord}}`, fragment.vocab);
                tempText = tempText.replace(/[{}]/g, '');
                vocabText = tempText.replace(/\n\n/g, ' ');
            }
            
            // Process spelling variant text - empty if no variant or not in difficulty
            let spellingText = '';
            if (fragment.spelling && focalWord && diffConfig.variants.includes('spelling')) {
                let tempText = fragment.text.replace(`{${focalWord}}`, fragment.spelling);
                tempText = tempText.replace(/[{}]/g, '');
                spellingText = tempText.replace(/\n\n/g, ' ');
            }
            
            // Create fragment object with all three variants
            const fragmentObj = {
                index: fragmentIndex,
                canonical: canonicalText,
                vocab: vocabText,
                spelling: spellingText,
                x: 0,  // Will be set when streaming
                width: 0,  // Will be calculated based on longest variant
                hasVocab: fragment.vocab !== undefined && vocabText !== '',
                hasSpelling: fragment.spelling !== undefined && spellingText !== '',
                words: [],  // Individual word tracking for page zone
                wordsInPage: 0,  // Track how many words have moved to page
                selectedVariant: null,  // No default selection
                isError: false,  // Track if incorrect variant was selected
                hasParagraphBreak: hasParagraphBreak,  // Track if fragment ends with paragraph
                isCheckpoint: fragment.flag === 'checkpoint' || fragment.flag === '{checkpoint}',  // Mark checkpoint
                // Store shuffled positions for this fragment
                streamPositions: this.shuffleStreamPositions(vocabText, canonicalText, spellingText)
            };
            
            // Track checkpoint indices
            if (fragmentObj.isCheckpoint) {
                this.checkpoints.push(fragmentIndex);
            }
            
            // Auto-select canonical for single fragments (no variants)
            if (!fragment.vocab && !fragment.spelling) {
                fragmentObj.selectedVariant = 'canonical';
            }
            
            // Parse individual words with their positions
            const words = canonicalText.split(/\s+/).filter(word => word.length > 0);
            let wordX = 0;
            const font = `${this.fonts.streaming.size}px ${this.fonts.streaming.family}`;
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const wordMetrics = this.renderer ? this.renderer.measureText(word + ' ', font) : { width: 60 };
                const wordObj = {
                    text: word,
                    relativeX: wordX,  // Position relative to fragment start
                    width: wordMetrics.width,
                    inPage: false
                };
                
                // Mark the last word if fragment has paragraph break
                if (i === words.length - 1 && hasParagraphBreak) {
                    wordObj.endsWithParagraph = true;
                }
                
                fragmentObj.words.push(wordObj);
                wordX += wordMetrics.width;
            }
            
            // Store fragment
            this.fragments.push(fragmentObj);
            this.fragmentQueue.push(fragmentObj);
            
            // Count words for progress (canonical only)
            this.totalWords += words.length;
            
            // Create word objects for page text tracking
            for (let word of words) {
                const wordObj = {
                    text: word,
                    fragmentIndex: fragmentIndex,
                    isInPage: false
                };
                this.wordToFragment.set(wordObj, fragmentIndex);
            }
        }
    }
    
    /**
     * Shuffle stream positions for variants
     */
    shuffleStreamPositions(vocabText, canonicalText, spellingText) {
        // Count how many variants exist
        const variants = [];
        if (vocabText) variants.push({ type: 'vocab', text: vocabText });
        if (canonicalText) variants.push({ type: 'canonical', text: canonicalText });
        if (spellingText) variants.push({ type: 'spelling', text: spellingText });
        
        // If only one variant, return standard positions
        if (variants.length <= 1) {
            return {
                vocab: 'top',
                canonical: 'middle',
                spelling: 'bottom'
            };
        }
        
        // Shuffle the available positions
        const positions = ['top', 'middle', 'bottom'];
        const shuffled = positions.sort(() => Math.random() - 0.5);
        
        // Assign shuffled positions
        const result = {
            vocab: null,
            canonical: null,
            spelling: null
        };
        
        let posIndex = 0;
        if (vocabText) result.vocab = shuffled[posIndex++];
        if (canonicalText) result.canonical = shuffled[posIndex++];
        if (spellingText) result.spelling = shuffled[posIndex++];
        
        return result;
    }
    
    /**
     * Get Y position for a stream based on shuffled position
     */
    getStreamYPosition(fragment, variantType) {
        const position = fragment.streamPositions[variantType];
        if (!position) return null;
        
        const streamHeight = this.zones.streaming.height;
        switch(position) {
            case 'top':
                return this.zones.streaming.y + streamHeight * 0.2;
            case 'middle':
                return this.zones.streaming.y + streamHeight * 0.5;
            case 'bottom':
                return this.zones.streaming.y + streamHeight * 0.8;
            default:
                return this.zones.streaming.y + streamHeight * 0.5;
        }
    }
    
    /**
     * Calculate timing based on speed and difficulty
     */
    calculateTiming() {
        const baseSpeed = this.settings.speed || 150;
        const diffConfig = this.difficultyConfig[this.settings.difficulty || 'moderate'];
        
        // Apply difficulty speed multiplier
        this.wordsPerMinute = Math.round(baseSpeed * diffConfig.speedMultiplier);
        
        // Calculate pixels per second based on WPM
        // Assuming average word width of 60 pixels
        const wordsPerSecond = this.wordsPerMinute / 60;
        this.pixelsPerSecond = wordsPerSecond * 60;
        
        // Calculate predicted duration
        this.predictedDuration = Math.ceil(this.totalWords / (this.wordsPerMinute / 60));
        
        // Set timer based on difficulty multiplier
        this.timeRemaining = Math.round(this.predictedDuration * diffConfig.timerMultiplier);
    }
    
    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        // Click handler for word highlighting and variant selection
        this.inputHandler.on('click', (data) => {
            // Handle summary prompt clicks in reading mode
            if (this.isReadingMode && this.showSummaryPrompt) {
                this.handleSummaryPromptClick(data);
                return;
            }
            
            if ((this.state !== 'active' && !this.isReadingMode) || this.isPaused) return;
            
            // Check if click is in streaming zone (only during active exercise)
            if (!this.isReadingMode && data.y >= this.zones.streaming.y && 
                data.y <= this.zones.streaming.y + this.zones.streaming.height) {
                this.handleStreamingClick(data);
            } else {
                this.handleWordClick(data);
            }
        });
        
        // Keyboard handler
        this.inputHandler.on('keydown', (data) => {
            if (this.state !== 'active' && !this.isReadingMode) return;
            
            if (data.key === 'escape' && !this.isReadingMode) {
                this.togglePause();
            } else if (data.key === 'arrowup' && this.isReadingMode) {
                this.scrollPage(-50);
            } else if (data.key === 'arrowdown' && this.isReadingMode) {
                this.scrollPage(50);
            } else if (data.key === 'home' && this.isReadingMode) {
                this.scrollOffset = 0;
            } else if (data.key === 'end' && this.isReadingMode) {
                this.scrollToBottom();
            }
        });
        
        // Mouse wheel handler for scrolling
        this.inputHandler.on('wheel', (data) => {
            if (this.isReadingMode) {
                this.scrollPage(-data.deltaY);
            }
        });
    }
    
    /**
     * Handle word click for fragment highlighting
     */
    handleWordClick(clickData) {
        // Check if click is in page zone
        if (clickData.y < this.zones.page.y || 
            clickData.y > this.zones.page.y + this.zones.page.height) {
            return;
        }
        
        // Find clicked word in page text (accounting for scroll offset)
        let clickedWord = null;
        const padding = 40;
        let currentX = padding;
        let currentY = this.zones.page.y + 40 - this.scrollOffset;
        
        for (let word of this.pageText) {
            const font = `${this.fonts.page.size}px ${this.fonts.page.family}`;
            const metrics = this.renderer.measureText(word.text + ' ', font);
            
            // Check if we need to wrap to next line
            if (currentX + metrics.width > this.renderer.width - padding) {
                currentX = padding;
                currentY += this.fonts.page.lineHeight;
            }
            
            // Add paragraph break if needed
            if (word.endsWithParagraph) {
                currentY += this.fonts.page.lineHeight * 2;
                currentX = padding;
            }
            
            // Check if click is within word bounds (only if visible)
            if (currentY >= this.zones.page.y && currentY <= this.zones.page.y + this.zones.page.height) {
                if (clickData.x >= currentX && clickData.x <= currentX + metrics.width &&
                    clickData.y >= currentY - this.fonts.page.size && 
                    clickData.y <= currentY + 5) {
                    clickedWord = word;
                    break;
                }
            }
            
            currentX += metrics.width;
        }
        
        if (clickedWord) {
            // Toggle highlighting for this fragment
            const fragmentIndex = clickedWord.fragmentIndex;
            if (this.highlightedFragment === fragmentIndex) {
                this.highlightedFragment = null;  // Unhighlight
            } else {
                this.highlightedFragment = fragmentIndex;  // Highlight new fragment
            }
        }
    }
    
    /**
     * Handle click in streaming zone for variant selection
     */
    handleStreamingClick(clickData) {
        // Find which fragment was clicked
        for (let fragment of this.streamingFragments) {
            if (clickData.x >= fragment.x && clickData.x <= fragment.x + fragment.width) {
                // Determine which variant was clicked based on Y position and shuffled positions
                const streamHeight = this.zones.streaming.height;
                const clickY = clickData.y - this.zones.streaming.y;
                let clickedPosition = null;
                
                if (Math.abs(clickY - (streamHeight * 0.2)) < 20) {
                    clickedPosition = 'top';
                } else if (Math.abs(clickY - (streamHeight * 0.5)) < 20) {
                    clickedPosition = 'middle';
                } else if (Math.abs(clickY - (streamHeight * 0.8)) < 20) {
                    clickedPosition = 'bottom';
                }
                
                if (!clickedPosition) return;
                
                // Find which variant type is at this position for this fragment
                let clickedVariant = null;
                for (let [variantType, position] of Object.entries(fragment.streamPositions)) {
                    if (position === clickedPosition) {
                        // Check if this variant has content
                        if (variantType === 'vocab' && !fragment.vocab) continue;
                        if (variantType === 'spelling' && !fragment.spelling) continue;
                        if (variantType === 'canonical' && !fragment.canonical) continue;
                        
                        clickedVariant = variantType;
                        break;
                    }
                }
                
                if (!clickedVariant) return;
                
                // Check if the selected variant is canonical (correct)
                if (clickedVariant !== 'canonical') {
                    // Wrong selection - trigger error state
                    fragment.selectedVariant = clickedVariant;
                    fragment.isError = true;
                    this.selectedVariants.set(fragment.index, clickedVariant);
                    
                    // Trigger error handling
                    this.handleIncorrectSelection();
                } else {
                    // Correct selection
                    fragment.selectedVariant = clickedVariant;
                    fragment.isError = false;
                    this.selectedVariants.set(fragment.index, clickedVariant);
                    
                    // Update words that will flow to page zone
                    this.updateFragmentWords(fragment);
                }
                break;
            }
        }
    }
    
    /**
     * Update fragment words based on selected variant
     */
    updateFragmentWords(fragment) {
        // Get the text for the selected variant
        let selectedText = fragment.canonical;
        if (fragment.selectedVariant === 'vocab' && fragment.vocab) {
            selectedText = fragment.vocab;
        } else if (fragment.selectedVariant === 'spelling' && fragment.spelling) {
            selectedText = fragment.spelling;
        }
        
        // Update word objects with selected variant text
        const words = selectedText.split(/\s+/).filter(word => word.length > 0);
        fragment.words = [];
        fragment.wordsInPage = 0;
        
        let wordX = 0;
        const font = `${this.fonts.streaming.size}px ${this.fonts.streaming.family}`;
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordMetrics = this.renderer ? this.renderer.measureText(word + ' ', font) : { width: 60 };
            const wordObj = {
                text: word,
                relativeX: wordX,
                width: wordMetrics.width,
                inPage: false,
                variantType: fragment.selectedVariant  // Track which variant this word came from
            };
            
            // Mark the last word if fragment has paragraph break
            if (i === words.length - 1 && fragment.hasParagraphBreak) {
                wordObj.endsWithParagraph = true;
            }
            
            fragment.words.push(wordObj);
            wordX += wordMetrics.width;
        }
    }
    
    /**
     * Handle incorrect variant selection
     */
    handleIncorrectSelection() {
        // Set error state
        this.isInErrorState = true;
        
        // Pause for 0.25 seconds
        this.errorPauseTimeout = setTimeout(() => {
            // Reset the exercise
            this.resetStreaming();
            this.isInErrorState = false;
        }, 250);
    }
    
    /**
     * Reset streaming to checkpoint (but keep timer)
     */
    resetStreaming() {
        // Find the checkpoint to reset to - use lastCheckpoint directly
        let resetIndex = this.lastCheckpoint;
        
        // Find the fragment index after the checkpoint
        let startFragmentIndex = 0;
        for (let i = 0; i < this.fragments.length; i++) {
            if (this.fragments[i].index === resetIndex) {
                startFragmentIndex = i + 1;  // Start from fragment after checkpoint
                break;
            }
        }
        
        // Clear page text to checkpoint
        if (resetIndex === 0) {
            this.pageText = [];
        } else {
            // Keep page text up to checkpoint
            this.pageText = [...this.checkpointPageText];
        }
        
        // Clear streaming fragments
        this.streamingFragments = [];
        
        // Reset fragment queue from checkpoint
        if (resetIndex === 0) {
            this.fragmentQueue = [...this.fragments];
        } else {
            // Start from fragment after checkpoint
            this.fragmentQueue = this.fragments.slice(startFragmentIndex);
        }
        
        // Clear selections
        this.selectedVariants.clear();
        
        // Reset fragment states
        for (let fragment of this.fragments) {
            fragment.selectedVariant = null;
            fragment.isError = false;
            fragment.wordsInPage = 0;
            
            // Auto-select canonical for single fragments
            if (!fragment.vocab && !fragment.spelling) {
                fragment.selectedVariant = 'canonical';
            }
            
            // Reset word states
            for (let word of fragment.words) {
                word.inPage = false;
            }
        }
        
        // Reinitialize streaming
        this.initializeStreaming();
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.emit('pause');
        } else {
            this.emit('resume');
        }
    }
    
    /**
     * Called when exercise starts
     */
    onStart() {
        // Initialize streaming
        this.initializeStreaming();
        
        // Start game timer
        this.startGameTimer();
        
        // Start animation loop
        this.startAnimation();
    }
    
    /**
     * Initialize streaming fragments
     */
    initializeStreaming() {
        if (this.fragmentQueue.length === 0) return;
        
        let currentX = this.renderer.width + 50;
        const font = `${this.fonts.streaming.size}px ${this.fonts.streaming.family}`;
        
        // Initialize first few fragments
        while (currentX < this.renderer.width + 500 && this.fragmentQueue.length > 0) {
            const fragment = this.fragmentQueue.shift();
            
            // Calculate fragment width based on longest non-empty variant
            const canonicalWidth = this.renderer.measureText(fragment.canonical + ' ', font).width;
            const vocabWidth = fragment.vocab ? this.renderer.measureText(fragment.vocab + ' ', font).width : 0;
            const spellingWidth = fragment.spelling ? this.renderer.measureText(fragment.spelling + ' ', font).width : 0;
            
            fragment.width = Math.max(canonicalWidth, vocabWidth, spellingWidth);
            fragment.x = currentX;
            
            this.streamingFragments.push(fragment);
            currentX += fragment.width + 20;  // Add spacing between fragments
        }
    }
    
    /**
     * Start game timer
     */
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            if (!this.isPaused) {
                this.timeRemaining--;
                
                this.emit('timeUpdate', {
                    remaining: this.timeRemaining,
                    total: this.predictedDuration * 2
                });
                
                if (this.timeRemaining <= 0) {
                    this.end();
                }
            }
        }, 1000);
    }
    
    /**
     * Start animation loop
     */
    startAnimation() {
        const animate = (timestamp) => {
            if (this.state !== 'active') return;
            
            const deltaTime = timestamp - this.lastTimestamp;
            this.lastTimestamp = timestamp;
            
            if (!this.isPaused) {
                this.update(deltaTime / 1000);
            }
            
            this.render();
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    /**
     * Update game state
     */
    update(deltaTime) {
        if (!deltaTime || deltaTime > 0.1) deltaTime = 0.016;
        
        // Don't update if in error state
        if (this.isInErrorState) return;
        
        const movement = this.pixelsPerSecond * deltaTime;
        
        // Update all fragments together
        for (let i = this.streamingFragments.length - 1; i >= 0; i--) {
            const fragment = this.streamingFragments[i];
            fragment.x -= movement;
            
            // Check individual words for page zone transition
            for (let j = 0; j < fragment.words.length; j++) {
                const word = fragment.words[j];
                if (!word.inPage) {
                    const wordAbsoluteX = fragment.x + word.relativeX;
                    
                    // Check if this word has passed the left edge
                    if (wordAbsoluteX + word.width < 0) {
                        word.inPage = true;
                        fragment.wordsInPage++;
                        
                        // Check if fragment needs selection but doesn't have one
                        if (!fragment.selectedVariant && (fragment.hasVocab || fragment.hasSpelling)) {
                            // Multi-variant fragment without selection - trigger error
                            fragment.isError = true;
                            this.handleIncorrectSelection();
                            return;  // Stop processing until reset
                        }
                        
                        // Add word to page text with variant tracking
                        // Only add to page if a variant is selected (including auto-selected)
                        if (fragment.selectedVariant && !fragment.isError) {
                            this.pageText.push({
                                text: word.text,
                                fragmentIndex: fragment.index,
                                isInPage: true,
                                variantType: word.variantType || fragment.selectedVariant,
                                endsWithParagraph: word.endsWithParagraph || false
                            });
                            
                            // Check if we passed a checkpoint
                            if (fragment.isCheckpoint) {
                                this.lastCheckpoint = fragment.index;
                                this.checkpointPageText = [...this.pageText];
                            }
                        }
                    }
                }
            }
            
            // Remove fragment when completely off screen and all words are in page
            if (fragment.x + fragment.width < -50 && 
                fragment.wordsInPage === fragment.words.length) {
                this.streamingFragments.splice(i, 1);
            }
        }
        
        // Add new fragments from queue if needed
        if (this.streamingFragments.length > 0 && this.fragmentQueue.length > 0) {
            const lastFragment = this.streamingFragments[this.streamingFragments.length - 1];
            
            if (lastFragment.x + lastFragment.width < this.renderer.width + 100) {
                const newFragment = this.fragmentQueue.shift();
                if (newFragment) {
                    const font = `${this.fonts.streaming.size}px ${this.fonts.streaming.family}`;
                    
                    // Calculate fragment width based on non-empty variants
                    const canonicalWidth = this.renderer.measureText(newFragment.canonical + ' ', font).width;
                    const vocabWidth = newFragment.vocab ? this.renderer.measureText(newFragment.vocab + ' ', font).width : 0;
                    const spellingWidth = newFragment.spelling ? this.renderer.measureText(newFragment.spelling + ' ', font).width : 0;
                    
                    newFragment.width = Math.max(canonicalWidth, vocabWidth, spellingWidth);
                    
                    // Check if there's a saved selection for this fragment
                    if (this.selectedVariants.has(newFragment.index)) {
                        newFragment.selectedVariant = this.selectedVariants.get(newFragment.index);
                        this.updateFragmentWords(newFragment);
                    } else {
                        // Auto-select canonical for single fragments
                        if (!newFragment.vocab && !newFragment.spelling) {
                            newFragment.selectedVariant = 'canonical';
                            this.updateFragmentWords(newFragment);
                        } else {
                            // Initialize word positions for new fragment
                            let wordX = 0;
                            for (let word of newFragment.words) {
                                word.relativeX = wordX;
                                word.width = this.renderer.measureText(word.text + ' ', font).width;
                                wordX += word.width;
                            }
                        }
                    }
                    newFragment.x = lastFragment.x + lastFragment.width + 20;
                    
                    this.streamingFragments.push(newFragment);
                }
            }
        } else if (this.streamingFragments.length === 0 && this.fragmentQueue.length > 0) {
            // Start new fragment if stream is empty
            const newFragment = this.fragmentQueue.shift();
            if (newFragment) {
                const font = `${this.fonts.streaming.size}px ${this.fonts.streaming.family}`;
                
                // Calculate fragment width based on non-empty variants
                const canonicalWidth = this.renderer.measureText(newFragment.canonical + ' ', font).width;
                const vocabWidth = newFragment.vocab ? this.renderer.measureText(newFragment.vocab + ' ', font).width : 0;
                const spellingWidth = newFragment.spelling ? this.renderer.measureText(newFragment.spelling + ' ', font).width : 0;
                
                newFragment.width = Math.max(canonicalWidth, vocabWidth, spellingWidth);
                
                // Check if there's a saved selection for this fragment
                if (this.selectedVariants.has(newFragment.index)) {
                    newFragment.selectedVariant = this.selectedVariants.get(newFragment.index);
                    this.updateFragmentWords(newFragment);
                } else {
                    // Auto-select canonical for single fragments
                    if (!newFragment.vocab && !newFragment.spelling) {
                        newFragment.selectedVariant = 'canonical';
                        this.updateFragmentWords(newFragment);
                    } else {
                        // Initialize word positions for new fragment
                        let wordX = 0;
                        for (let word of newFragment.words) {
                            word.relativeX = wordX;
                            word.width = this.renderer.measureText(word.text + ' ', font).width;
                            wordX += word.width;
                        }
                    }
                }
                newFragment.x = this.renderer.width + 50;
                
                this.streamingFragments.push(newFragment);
            }
        }
        
        // Check if exercise is complete
        if (this.streamingFragments.length === 0 && this.fragmentQueue.length === 0) {
            this.enterReadingMode();
        }
    }
    
    /**
     * Render the exercise
     */
    render() {
        // Clear canvas
        this.renderer.clear();
        
        if (this.isReadingMode) {
            // In reading mode, expand page zone to full height
            this.renderReadingMode();
        } else {
            // Normal exercise mode
            this.renderHeader();
            this.renderPageZone();
            this.renderStreamingZone();
        }
    }
    
    /**
     * Render header zone
     */
    renderHeader() {
        // Background
        this.renderer.drawRect(0, this.zones.header.y, this.renderer.width, this.zones.header.height, {
            fillColor: '#F8F8F8'
        });
        
        // Timer
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeText = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.renderer.drawText(timeText, 50, this.zones.header.y + 30, {
            font: `bold ${this.fonts.header.size}px ${this.fonts.header.family}`,
            color: this.timeRemaining < 30 ? '#FF0000' : this.fonts.header.color,
            align: 'left',
            baseline: 'middle'
        });
        
        // Progress ticker
        const progress = Math.round((this.pageText.length / this.totalWords) * 100);
        const progressText = `Progress: ${progress}%`;
        
        this.renderer.drawText(progressText, this.renderer.width - 50, this.zones.header.y + 30, {
            font: `bold ${this.fonts.header.size}px ${this.fonts.header.family}`,
            color: this.fonts.header.color,
            align: 'right',
            baseline: 'middle'
        });
        
        // Speed indicator
        const speedText = `${this.wordsPerMinute} WPM`;
        this.renderer.drawText(speedText, this.renderer.width / 2, this.zones.header.y + 30, {
            font: `${this.fonts.header.size}px ${this.fonts.header.family}`,
            color: this.fonts.header.color,
            align: 'center',
            baseline: 'middle'
        });
        
        // Separator line
        this.renderer.drawLine(0, this.zones.header.y + this.zones.header.height, 
                               this.renderer.width, this.zones.header.y + this.zones.header.height, {
            color: '#DDDDDD',
            width: 1
        });
    }
    
    /**
     * Render page zone
     */
    renderPageZone() {
        // Background
        this.renderer.drawRect(0, this.zones.page.y, this.renderer.width, this.zones.page.height, {
            fillColor: '#FAFAFA'
        });
        
        // Save canvas state for clipping
        const ctx = this.renderer.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, this.zones.page.y, this.renderer.width, this.zones.page.height);
        ctx.clip();
        
        // Render page text with word wrapping and scrolling
        const padding = 40;
        let currentX = padding;
        let currentY = this.zones.page.y + 40 - this.scrollOffset;
        const maxWidth = this.renderer.width - (padding * 2);
        let totalHeight = 40;  // Track total content height
        
        for (let word of this.pageText) {
            const font = `${this.fonts.page.size}px ${this.fonts.page.family}`;
            const text = word.text + ' ';
            const metrics = this.renderer.measureText(text, font);
            
            // Check if we need to wrap to next line
            if (currentX + metrics.width > this.renderer.width - padding) {
                currentX = padding;
                currentY += this.fonts.page.lineHeight;
                totalHeight += this.fonts.page.lineHeight;
            }
            
            // Only render if visible in the page zone
            if (currentY + this.fonts.page.size >= this.zones.page.y && 
                currentY <= this.zones.page.y + this.zones.page.height) {
                
                // Determine color based on highlighting
                let color = this.fonts.page.color;
                let backgroundColor = null;
                
                if (this.highlightedFragment !== null && word.fragmentIndex === this.highlightedFragment) {
                    backgroundColor = '#FFEB3B';  // Yellow highlight
                }
                
                // Draw background if highlighted
                if (backgroundColor) {
                    this.renderer.drawRect(currentX - 2, currentY - this.fonts.page.size, 
                                           metrics.width, this.fonts.page.size + 4, {
                        fillColor: backgroundColor
                    });
                }
                
                // Draw text
                this.renderer.drawText(text, currentX, currentY, {
                    font: font,
                    color: color,
                    align: 'left',
                    baseline: 'top'
                });
            }
            
            currentX += metrics.width;
            
            // Add paragraph break after drawing if this word ends with one
            if (word.endsWithParagraph) {
                currentY += this.fonts.page.lineHeight * 2;  // Double line break for paragraph
                totalHeight += this.fonts.page.lineHeight * 2;
                currentX = padding;  // Reset to start of line
            }
        }
        
        // Auto-scroll if content exceeds page zone
        if (!this.isReadingMode && totalHeight > this.zones.page.height - 40) {
            const targetScroll = totalHeight - (this.zones.page.height - 80);
            if (this.scrollOffset < targetScroll) {
                this.scrollOffset = Math.min(this.scrollOffset + 2, targetScroll);
                this.maxScrollOffset = Math.max(this.maxScrollOffset, this.scrollOffset);
            }
        }
        
        // Restore canvas state
        ctx.restore();
        
        // Separator line
        this.renderer.drawLine(0, this.zones.page.y + this.zones.page.height, 
                               this.renderer.width, this.zones.page.y + this.zones.page.height, {
            color: '#DDDDDD',
            width: 1
        });
    }
    
    /**
     * Render streaming zone
     */
    renderStreamingZone() {
        // Background
        this.renderer.drawRect(0, this.zones.streaming.y, this.renderer.width, this.zones.streaming.height, {
            fillColor: '#FFFFFF'
        });
        
        // Draw subtle guide lines for each stream
        const guideLineAlpha = 0.1;
        
        // Vocab stream guide
        this.renderer.drawLine(0, this.streamPositions.vocab, 
                               this.renderer.width, this.streamPositions.vocab, {
            color: `rgba(0, 128, 0, ${guideLineAlpha})`,
            width: 1
        });
        
        // Canonical stream guide
        this.renderer.drawLine(0, this.streamPositions.canonical, 
                               this.renderer.width, this.streamPositions.canonical, {
            color: `rgba(0, 51, 102, ${guideLineAlpha})`,
            width: 1
        });
        
        // Spelling stream guide
        this.renderer.drawLine(0, this.streamPositions.spelling, 
                               this.renderer.width, this.streamPositions.spelling, {
            color: `rgba(204, 0, 0, ${guideLineAlpha})`,
            width: 1
        });
        
        // Render all fragments
        for (let fragment of this.streamingFragments) {
            // Draw vertical alignment guide (optional, for debugging)
            if (false) {  // Set to true to see fragment boundaries
                this.renderer.drawLine(fragment.x, this.zones.streaming.y, 
                                       fragment.x, this.zones.streaming.y + this.zones.streaming.height, {
                    color: 'rgba(0, 0, 0, 0.1)',
                    width: 1
                });
            }
            
            // Count how many variants this fragment has
            let variantCount = 0;
            if (fragment.canonical) variantCount++;
            if (fragment.vocab) variantCount++;
            if (fragment.spelling) variantCount++;
            
            // Render variants at their shuffled positions
            if (fragment.vocab) {
                const vocabY = this.getStreamYPosition(fragment, 'vocab');
                let vocabColor = this.fonts.streaming.color;
                // Only show gold if multiple variants and user selected
                if (fragment.selectedVariant === 'vocab' && variantCount > 1) {
                    vocabColor = fragment.isError ? this.fonts.streaming.errorColor : this.fonts.streaming.goldColor;
                }
                this.renderFragmentText(fragment.vocab, fragment.x, vocabY, 
                                        vocabColor, fragment.index, 
                                        fragment.selectedVariant === 'vocab' && variantCount > 1, 
                                        fragment.isError);
            }
            
            if (fragment.canonical) {
                const canonicalY = this.getStreamYPosition(fragment, 'canonical');
                let canonicalColor = this.fonts.streaming.color;
                // Only show gold if multiple variants and user selected
                if (fragment.selectedVariant === 'canonical' && variantCount > 1) {
                    canonicalColor = fragment.isError ? this.fonts.streaming.errorColor : this.fonts.streaming.goldColor;
                }
                this.renderFragmentText(fragment.canonical, fragment.x, canonicalY, 
                                        canonicalColor, fragment.index, 
                                        fragment.selectedVariant === 'canonical' && variantCount > 1, 
                                        fragment.isError);
            }
            
            if (fragment.spelling) {
                const spellingY = this.getStreamYPosition(fragment, 'spelling');
                let spellingColor = this.fonts.streaming.color;
                // Only show gold if multiple variants and user selected
                if (fragment.selectedVariant === 'spelling' && variantCount > 1) {
                    spellingColor = fragment.isError ? this.fonts.streaming.errorColor : this.fonts.streaming.goldColor;
                }
                this.renderFragmentText(fragment.spelling, fragment.x, spellingY, 
                                        spellingColor, fragment.index, 
                                        fragment.selectedVariant === 'spelling' && variantCount > 1, 
                                        fragment.isError);
            }
        }
        
        // Pause indicator if paused
        if (this.isPaused) {
            this.renderer.drawText('PAUSED', this.renderer.width / 2, 
                                   this.zones.streaming.y + this.zones.streaming.height / 2 - 50, {
                font: `bold 32px ${this.fonts.streaming.family}`,
                color: '#FF6B6B',
                align: 'center',
                baseline: 'middle'
            });
        }
    }
    
    /**
     * Render fragment text
     */
    renderFragmentText(text, x, y, color, fragmentIndex, isSelected = false, isError = false) {
        const font = `${this.fonts.streaming.size}px ${this.fonts.streaming.family}`;
        
        // Add glow effect if selected (clicked)
        if (isSelected) {
            // Draw a subtle background glow
            const metrics = this.renderer.measureText(text + ' ', font);
            const glowColor = isError ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 215, 0, 0.2)';
            this.renderer.drawRect(x - 4, y - this.fonts.streaming.size/2 - 2, 
                                   metrics.width + 8, this.fonts.streaming.size + 4, {
                fillColor: glowColor
            });
        }
        
        // Highlight if this fragment is selected in page zone
        if (this.highlightedFragment !== null && fragmentIndex === this.highlightedFragment) {
            // Draw yellow background for highlighted fragment
            const metrics = this.renderer.measureText(text + ' ', font);
            this.renderer.drawRect(x - 2, y - this.fonts.streaming.size/2, 
                                   metrics.width, this.fonts.streaming.size, {
                fillColor: '#FFEB3B'
            });
        }
        
        // Draw the text - only bold if selected
        const fontStyle = isSelected ? `bold ${font}` : font;
        this.renderer.drawText(text, x, y, {
            font: fontStyle,
            color: color,
            align: 'left',
            baseline: 'middle'
        });
    }
    
    /**
     * Called when exercise is paused
     */
    onPause() {
        // Handled by togglePause
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
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.errorPauseTimeout) {
            clearTimeout(this.errorPauseTimeout);
            this.errorPauseTimeout = null;
        }
        
        // Calculate score based on completion
        this.score = Math.round((this.pageText.length / this.totalWords) * 100);
        this.totalQuestions = 100;  // Percentage based
    }
    
    /**
     * Get exercise results
     */
    getResults() {
        const results = super.getResults();
        
        results.wordsRead = this.pageText.length;
        results.totalWords = this.totalWords;
        results.completionRate = Math.round((this.pageText.length / this.totalWords) * 100);
        results.averageWPM = Math.round(this.pageText.length / ((this.predictedDuration * 2 - this.timeRemaining) / 60));
        
        return results;
    }
    
    /**
     * Enter reading mode after exercise completion
     */
    enterReadingMode() {
        // Stop the timer
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        // Set reading mode state
        this.isReadingMode = true;
        this.showSummaryPrompt = true;
        this.scrollOffset = 0;  // Reset scroll to top
        
        // Expand page zone to full height (minus prompt area)
        this.zones.page = {
            y: 40,
            height: 520  // Leave room for summary prompt at bottom
        };
        
        // Continue animation for scrolling and interaction
        if (!this.animationId) {
            this.startAnimation();
        }
    }
    
    /**
     * Render reading mode (full text view)
     */
    renderReadingMode() {
        // Header with completion info
        this.renderer.drawRect(0, 0, this.renderer.width, 40, {
            fillColor: '#F8F8F8'
        });
        
        const completionText = `Reading Complete - ${Math.round((this.pageText.length / this.totalWords) * 100)}% Read`;
        this.renderer.drawText(completionText, this.renderer.width / 2, 20, {
            font: `bold 16px ${this.fonts.header.family}`,
            color: '#333333',
            align: 'center',
            baseline: 'middle'
        });
        
        // Render expanded page zone
        this.renderPageZone();
        
        // Render summary prompt at bottom
        if (this.showSummaryPrompt) {
            this.renderSummaryPrompt();
        }
        
        // Render scroll indicator if content is scrollable
        this.renderScrollIndicator();
    }
    
    /**
     * Render summary prompt at bottom of screen
     */
    renderSummaryPrompt() {
        const promptY = 560;
        const promptHeight = 40;
        
        // Background
        this.renderer.drawRect(0, promptY, this.renderer.width, promptHeight, {
            fillColor: '#004080'
        });
        
        // Prompt text
        this.renderer.drawText('Would you like to view your reading summary?', 
                               this.renderer.width / 2 - 100, promptY + 20, {
            font: '14px Arial',
            color: '#FFFFFF',
            align: 'center',
            baseline: 'middle'
        });
        
        // Buttons
        const buttonWidth = 120;
        const buttonHeight = 28;
        const buttonY = promptY + 6;
        
        // View Summary button
        const summaryBtnX = this.renderer.width / 2 + 80;
        this.renderer.drawRect(summaryBtnX, buttonY, buttonWidth, buttonHeight, {
            fillColor: '#28a745',
            strokeColor: '#1e7e34',
            lineWidth: 1
        });
        this.renderer.drawText('View Summary', summaryBtnX + buttonWidth/2, buttonY + buttonHeight/2, {
            font: 'bold 12px Arial',
            color: '#FFFFFF',
            align: 'center',
            baseline: 'middle'
        });
        
        // Continue Reading button
        const continueBtnX = this.renderer.width / 2 + 210;
        this.renderer.drawRect(continueBtnX, buttonY, buttonWidth, buttonHeight, {
            fillColor: '#6c757d',
            strokeColor: '#545b62',
            lineWidth: 1
        });
        this.renderer.drawText('Continue Reading', continueBtnX + buttonWidth/2, buttonY + buttonHeight/2, {
            font: 'bold 12px Arial',
            color: '#FFFFFF',
            align: 'center',
            baseline: 'middle'
        });
    }
    
    /**
     * Render scroll indicator
     */
    renderScrollIndicator() {
        // Calculate total content height
        const padding = 40;
        let totalHeight = this.calculateTotalTextHeight();
        
        // Only show scrollbar if content exceeds viewport
        if (totalHeight > this.zones.page.height) {
            const scrollbarX = this.renderer.width - 20;
            const scrollbarWidth = 10;
            const scrollbarHeight = this.zones.page.height;
            
            // Background track
            this.renderer.drawRect(scrollbarX, this.zones.page.y, scrollbarWidth, scrollbarHeight, {
                fillColor: '#E0E0E0'
            });
            
            // Calculate thumb size and position
            const viewportRatio = this.zones.page.height / totalHeight;
            const thumbHeight = Math.max(30, scrollbarHeight * viewportRatio);
            const maxScroll = totalHeight - this.zones.page.height;
            const scrollRatio = this.scrollOffset / maxScroll;
            const thumbY = this.zones.page.y + (scrollbarHeight - thumbHeight) * scrollRatio;
            
            // Thumb
            this.renderer.drawRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight, {
                fillColor: '#888888'
            });
        }
    }
    
    /**
     * Calculate total height of text content
     */
    calculateTotalTextHeight() {
        const padding = 40;
        let currentX = padding;
        let totalHeight = 40;
        
        for (let word of this.pageText) {
            const font = `${this.fonts.page.size}px ${this.fonts.page.family}`;
            const metrics = this.renderer.measureText(word.text + ' ', font);
            
            // Check if we need to wrap to next line
            if (currentX + metrics.width > this.renderer.width - padding) {
                currentX = padding;
                totalHeight += this.fonts.page.lineHeight;
            }
            
            currentX += metrics.width;
            
            // Add paragraph break if needed
            if (word.endsWithParagraph) {
                totalHeight += this.fonts.page.lineHeight * 2;
                currentX = padding;
            }
        }
        
        return totalHeight;
    }
    
    /**
     * Handle summary prompt button clicks
     */
    handleSummaryPromptClick(clickData) {
        const promptY = 560;
        const buttonY = promptY + 6;
        const buttonHeight = 28;
        
        // Check if click is in button area
        if (clickData.y >= buttonY && clickData.y <= buttonY + buttonHeight) {
            const summaryBtnX = this.renderer.width / 2 + 80;
            const continueBtnX = this.renderer.width / 2 + 210;
            const buttonWidth = 120;
            
            // View Summary button
            if (clickData.x >= summaryBtnX && clickData.x <= summaryBtnX + buttonWidth) {
                this.showSummaryPrompt = false;
                this.end();  // Proceed to results
            }
            // Continue Reading button
            else if (clickData.x >= continueBtnX && clickData.x <= continueBtnX + buttonWidth) {
                this.showSummaryPrompt = false;
                // Expand page zone to full height
                this.zones.page.height = 560;
            }
        }
    }
    
    /**
     * Scroll the page content
     */
    scrollPage(delta) {
        const totalHeight = this.calculateTotalTextHeight();
        const maxScroll = Math.max(0, totalHeight - this.zones.page.height);
        
        this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + delta));
    }
    
    /**
     * Scroll to bottom of content
     */
    scrollToBottom() {
        const totalHeight = this.calculateTotalTextHeight();
        const maxScroll = Math.max(0, totalHeight - this.zones.page.height);
        this.scrollOffset = maxScroll;
    }
    
    /**
     * Clean up
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

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FluentReadingExercise;
}
