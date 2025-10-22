/**
 * Bubble Pop Exercise - Game-based vocabulary practice
 * @class BubblePopExercise
 * @extends ExerciseFramework
 */
class BubblePopExercise extends ExerciseFramework {
    /**
     * Difficulty behavior configurations
     * For Bubble Pop, metacognitive prompts are used at the end regardless of difficulty
     */
    static DIFFICULTY_BEHAVIORS = {
        'easy': {
            feedbackTiming: 'end_only',
            metacognitivePrompts: true,
            prompts: [
                'Which words were hardest for you to identify?',
                'What strategies did you use to spot misspellings?',
                'Did you notice any patterns in the errors?'
            ],
            description: 'Easy - Slower speed, metacognitive reflection at end'
        },
        'moderate': {
            feedbackTiming: 'end_only',
            metacognitivePrompts: true,
            prompts: [
                'Which words were hardest for you?',
                'What strategies helped you the most?',
                'How did you handle the faster pace?'
            ],
            description: 'Moderate - Medium speed, metacognitive reflection at end'
        },
        'hard': {
            feedbackTiming: 'end_only',
            metacognitivePrompts: true,
            prompts: [
                'What made this challenging for you?',
                'What strategies would you use differently next time?',
                'Which word patterns were trickiest?'
            ],
            description: 'Hard - Fast speed, metacognitive reflection at end'
        }
    };

    constructor(curriculumManager) {
        super(curriculumManager, 'bubble_pop');
        
        // Game-specific properties
        this.bubbles = [];
        this.nextBubbleId = 0;
        this.spawnTimer = null;
        this.gameTimer = null;
        this.rampingTimer = null;
        this.rampingLevel = 0;
        
        // Scoring
        this.gameScore = {
            right: 0,
            wrong: 0,
            missed: 0
        };
        
        // Bubble images
        this.bubbleImages = [];
        this.imagesLoaded = false;
        
        // Background colors
        this.backgroundColors = [
            '#FFE6E6', '#E6F3FF', '#E6FFE6', '#FFF9E6', 
            '#F0E6FF', '#FFE6F5', '#E6FFF5', '#FFF0E6'
        ];
        this.currentBgColor = '#E6F3FF';
        
        // Renderer and input handler (will be set during initialization)
        this.renderer = null;
        this.inputHandler = null;
    }
    
    /**
     * Get default settings for bubble pop
     */
    getDefaultSettings() {
        return {
            duration: 60,           // seconds
            difficulty: 'easy',     // easy, moderate, hard
            spellingErrorRate: 50  // percentage
        };
    }
    
    /**
     * Initialize the exercise with canvas and settings
     */
    async initializeGame(canvas, settings = {}) {
        // Reset all game state for a fresh start
        this.resetGameState();
        
        // Initialize base exercise
        this.initialize(settings);
        
        // Set up renderer
        this.renderer = new CanvasRenderer(canvas, {
            width: 900,
            height: 600,
            backgroundColor: this.currentBgColor,
            autoResize: false
        });
        
        // Set up input handler - use document for keyboard events, canvas for mouse events
        this.inputHandler = new InputHandler(document);
        this.setupInputHandlers();
        
        // Make canvas focusable
        canvas.tabIndex = 1;
        canvas.focus();
        
        // Load bubble images
        await this.loadBubbleImages();
        
        // Calculate game parameters based on settings
        this.calculateGameParameters();
        
        // Set random background
        this.currentBgColor = this.backgroundColors[
            Math.floor(Math.random() * this.backgroundColors.length)
        ];
        this.renderer.options.backgroundColor = this.currentBgColor;
        
        return this;
    }
    
    /**
     * Reset all game state for a fresh start
     */
    resetGameState() {
        // Clear bubbles
        this.bubbles = [];
        this.nextBubbleId = 0;
        
        // Clear timers
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
            this.spawnTimer = null;
        }
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.rampingTimer) {
            clearInterval(this.rampingTimer);
            this.rampingTimer = null;
        }
        
        // Reset ramping level - THIS IS CRITICAL!
        this.rampingLevel = 0;
        
        // Reset scoring
        this.gameScore = {
            right: 0,
            wrong: 0,
            missed: 0
        };
        
        // Reset hover state
        this.hoveredBubble = null;
    }
    
    /**
     * Calculate game parameters from settings
     */
    calculateGameParameters() {
        const s = this.settings;
        this.difficultyMode = s.difficulty;
        
        // Base speed and settings based on difficulty
        let baseSpeed, tortuosity, spawnRate;
        
        switch (this.difficultyMode) {
            case 'easy':
                baseSpeed = 0.3;  // 30% of original speed (slowest)
                tortuosity = 0.2; // Low vertical movement
                spawnRate = 3000; // Spawn every 3 seconds
                break;
            case 'moderate':
                baseSpeed = 0.5;  // 50% of original speed (medium)
                tortuosity = 0.4; // Medium vertical movement
                spawnRate = 1500; // Twice as fast as easy (every 1.5 seconds)
                break;
            case 'hard':
                baseSpeed = 0.7;  // 70% of original speed (fastest)
                tortuosity = 0.6; // Higher vertical movement
                spawnRate = 1200; // Even faster spawning (every 1.2 seconds)
                break;
            default:
                baseSpeed = 0.3;
                tortuosity = 0.2;
                spawnRate = 3000;
        }
        
        // Store original settings for ramping
        this.originalSettings = {
            baseSpeed: baseSpeed,
            tortuosity: tortuosity,
            spellingErrorRate: s.spellingErrorRate,
            spawnRate: spawnRate
        };
        
        // Initial game settings (will be ramped up over time)
        this.gameSettings = {
            baseSpeed: this.originalSettings.baseSpeed,
            tortuosity: this.originalSettings.tortuosity,
            spellingErrorRate: this.originalSettings.spellingErrorRate,
            spawnRate: this.originalSettings.spawnRate,
            minFontSize: 20,
            maxFontSize: 34
        };
        
        // Set total questions (time-based, not question count)
        this.totalQuestions = 0; // Will be counted as bubbles spawn
        this.timeRemaining = this.settings.duration;
    }
    
    /**
     * Load bubble images
     */
    async loadBubbleImages() {
        if (this.imagesLoaded) return;
        
        const imagePromises = [];
        for (let i = 1; i <= 4; i++) {
            const img = new Image();
            img.src = `game_assets/bubble_pop/bubble${i}.png`;
            
            imagePromises.push(new Promise((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => {
                    console.error(`Failed to load bubble${i}.png`);
                    resolve();
                };
            }));
            
            this.bubbleImages.push(img);
        }
        
        await Promise.all(imagePromises);
        this.imagesLoaded = true;
    }
    
    /**
     * Setup input handlers for the game
     */
    setupInputHandlers() {
        // Track current hovered bubble
        this.hoveredBubble = null;
        
        // Create a separate mouse handler for the canvas
        const canvas = this.renderer.canvas;
        
        // Mouse move handler to track hover - need to handle canvas-specific coordinates
        canvas.addEventListener('mousemove', (e) => {
            if (this.state !== 'active') return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const bubble = this.getBubbleAt(x, y);
            if (bubble !== this.hoveredBubble) {
                this.hoveredBubble = bubble;
                // Update cursor style
                canvas.style.cursor = bubble ? 'pointer' : 'crosshair';
            }
        });
        
        // Key handlers for Q and R
        this.inputHandler.on('keydown', (data) => {
            if (this.state !== 'active') return;
            
            // Normalize key to lowercase for case-insensitive comparison
            const key = data.key.toLowerCase();
            
            // Different key handling based on difficulty mode
            if (this.difficultyMode === 'easy') {
                // Easy mode: Only Q key works
                if (key === 'q' && this.hoveredBubble) {
                    this.handleBubbleClick(this.hoveredBubble, true);
                    this.hoveredBubble = null;
                }
            } else if (this.difficultyMode === 'moderate') {
                // Moderate mode: Only R key works
                if (key === 'r' && this.hoveredBubble) {
                    this.handleBubbleClick(this.hoveredBubble, false);
                    this.hoveredBubble = null;
                }
            } else {
                // Hard mode: Both Q and R keys work
                if (key === 'q' && this.hoveredBubble) {
                    this.handleBubbleClick(this.hoveredBubble, true);
                    this.hoveredBubble = null;
                } else if (key === 'r' && this.hoveredBubble) {
                    this.handleBubbleClick(this.hoveredBubble, false);
                    this.hoveredBubble = null;
                }
            }
            
            // Escape key to pause/quit (works in all modes)
            if (key === 'escape') {
                this.pause();
            }
        });
        
        // Touch/tap handler for mobile
        this.inputHandler.on('tap', (data) => {
            if (this.state !== 'active') return;
            
            const tappedBubble = this.getBubbleAt(data.x, data.y);
            if (tappedBubble) {
                // For touch, we'll need a different interaction model
                // Could show a popup asking correct/incorrect
                this.handleBubbleClick(tappedBubble, !tappedBubble.hasError);
            }
        });
    }
    
    /**
     * Get bubble at coordinates
     */
    getBubbleAt(x, y) {
        // Check bubbles in reverse order (top to bottom)
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            if (!bubble.popping && !bubble.clicked) {
                const dx = x - bubble.x;
                const dy = y - bubble.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= bubble.radius) {
                    return bubble;
                }
            }
        }
        return null;
    }
    
    /**
     * Handle bubble click based on difficulty mode
     */
    handleBubbleClick(bubble, markedAsCorrect) {
        if (bubble.clicked) return;
        
        const isCorrectSpelling = !bubble.hasError;
        let shouldPop = true; // Always pop in all modes
        let isCorrectAction = false;
        
        // Different logic based on difficulty
        switch (this.difficultyMode) {
            case 'easy':
                // Easy mode: Only Q key works, pop all words
                // Q on correct word = correct, Q on misspelled = wrong
                isCorrectAction = isCorrectSpelling;
                break;
                
            case 'moderate':
                // Moderate mode: Only R key works, pop all words
                // R on misspelled word = correct, R on correct = wrong
                isCorrectAction = !isCorrectSpelling;
                break;
                
            case 'hard':
                // Hard mode: Both keys work, must match word type
                isCorrectAction = (markedAsCorrect === isCorrectSpelling);
                break;
        }
        
        if (shouldPop) {
            bubble.clicked = true;
            bubble.popping = true;
            bubble.popAnimation = 0;
            
            if (isCorrectAction) {
                this.gameScore.right++;
                bubble.feedbackColor = '#00ff00';
            } else {
                this.gameScore.wrong++;
                bubble.feedbackColor = '#ff0000';
            }
            
            // Update score
            this.score = this.gameScore.right;
            this.emit('scoreUpdate', {
                right: this.gameScore.right,
                wrong: this.gameScore.wrong,
                missed: this.gameScore.missed
            });
        }
    }
    
    /**
     * Called when exercise starts
     */
    onStart() {
        // Start game timer
        this.startGameTimer();
        
        // Start spawning bubbles
        this.startSpawning();
        
        // Start ramping timer
        this.startRampingTimer();
        
        // Start animation
        this.startGameAnimation();
    }
    
    /**
     * Start game timer
     */
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            
            this.emit('timeUpdate', {
                remaining: this.timeRemaining,
                total: this.settings.duration
            });
            
            if (this.timeRemaining <= 0) {
                this.end();
            }
        }, 1000);
    }
    
    /**
     * Start spawning bubbles
     */
    startSpawning() {
        const spawn = () => {
            if (this.state !== 'active') return;
            
            this.spawnBubble();
            
            // Random spawn interval with variation
            const nextSpawn = this.gameSettings.spawnRate + 
                             (Math.random() * 500 - 250);
            
            this.spawnTimer = setTimeout(spawn, nextSpawn);
        };
        
        // Start spawning after a short delay
        this.spawnTimer = setTimeout(spawn, 1000);
    }
    
    /**
     * Spawn a new bubble
     */
    spawnBubble() {
        const vocabulary = this.getVocabulary();
        if (!vocabulary || vocabulary.length === 0) {
            console.warn('No vocabulary available for bubble spawn');
            return;
        }
        
        // Select random word
        const vocabItem = vocabulary[Math.floor(Math.random() * vocabulary.length)];
        let word = vocabItem.word;
        
        // Determine if this should have a spelling error
        // 50% chance of spelling error for all difficulty levels
        let hasError = Math.random() < 0.5;
        
        if (hasError) {
            word = this.corruptSpelling(word);
        }
        
        // Create bubble object
        const individualSpeed = this.gameSettings.baseSpeed * (0.5 + Math.random()) * 2; // Increased speed
        const individualTortuosity = this.gameSettings.tortuosity * (0.7 + Math.random() * 0.6);
        
        const fontSize = this.gameSettings.minFontSize + 
                        Math.random() * (this.gameSettings.maxFontSize - this.gameSettings.minFontSize);
        
        // Measure text to determine bubble size
        const textMetrics = this.renderer.measureText(word, `${fontSize}px Arial`);
        const bubbleRadius = Math.max(textMetrics.width * 0.7, 50); // Ensure minimum size
        
        const bubble = {
            id: this.nextBubbleId++,
            word: word,
            originalWord: vocabItem.word,
            hasError: hasError,
            x: this.renderer.width + bubbleRadius,
            y: 100 + Math.random() * (this.renderer.height - 200),
            vx: -individualSpeed * 2, // Increased speed
            vy: 0,
            vyPhase: Math.random() * Math.PI * 2,
            tortuosity: individualTortuosity,
            radius: bubbleRadius,
            fontSize: fontSize,
            color: '#000000', // Black text for better visibility
            bubbleColor: this.getRandomBubbleColor(), // Add bubble background color
            bubbleImage: this.bubbleImages[Math.floor(Math.random() * this.bubbleImages.length)],
            popping: false,
            popAnimation: 0,
            clicked: false,
            feedbackColor: null
        };
        
        this.bubbles.push(bubble);
        this.totalQuestions++;
    }
    
    /**
     * Corrupt spelling of a word
     */
    corruptSpelling(word) {
        if (word.length < 3) return word;
        
        const corruptions = [
            // Swap adjacent letters
            () => {
                const pos = Math.floor(Math.random() * (word.length - 1));
                const chars = word.split('');
                [chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]];
                return chars.join('');
            },
            // Change a vowel
            () => {
                const vowels = 'aeiou';
                const chars = word.split('');
                for (let i = 0; i < chars.length; i++) {
                    if (vowels.includes(chars[i].toLowerCase())) {
                        const otherVowels = vowels.replace(chars[i].toLowerCase(), '');
                        chars[i] = otherVowels[Math.floor(Math.random() * otherVowels.length)];
                        break;
                    }
                }
                return chars.join('');
            },
            // Double a consonant
            () => {
                const consonants = 'bcdfghjklmnpqrstvwxyz';
                const chars = word.split('');
                for (let i = 0; i < chars.length; i++) {
                    if (consonants.includes(chars[i].toLowerCase())) {
                        chars.splice(i, 0, chars[i]);
                        break;
                    }
                }
                return chars.join('');
            },
            // Remove a letter
            () => {
                if (word.length <= 3) return word;
                const pos = 1 + Math.floor(Math.random() * (word.length - 2));
                return word.slice(0, pos) + word.slice(pos + 1);
            }
        ];
        
        const corruption = corruptions[Math.floor(Math.random() * corruptions.length)];
        return corruption();
    }
    
    /**
     * Get random dark color
     */
    getRandomDarkColor() {
        const colors = [
            '#003366', '#004080', '#1a1a2e', '#16213e', '#0f3460',
            '#2c3e50', '#34495e', '#2c2c54', '#40407a', '#2f3640'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Get random bubble color
     */
    getRandomBubbleColor() {
        const colors = [
            'rgba(100, 149, 237, 0.8)', // Cornflower blue
            'rgba(255, 182, 193, 0.8)', // Light pink
            'rgba(144, 238, 144, 0.8)', // Light green
            'rgba(255, 218, 185, 0.8)', // Peach
            'rgba(221, 160, 221, 0.8)', // Plum
            'rgba(135, 206, 235, 0.8)', // Sky blue
            'rgba(255, 255, 224, 0.8)', // Light yellow
            'rgba(176, 224, 230, 0.8)'  // Powder blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Start ramping timer
     */
    startRampingTimer() {
        // Apply ramping every 5 seconds for smooth progression
        this.rampingTimer = setInterval(() => {
            this.applyRamping();
        }, 5000);
    }
    
    /**
     * Apply progressive difficulty ramping (15% increase over time)
     */
    applyRamping() {
        // Calculate progress through the game (0 to 1)
        const progress = (this.settings.duration - this.timeRemaining) / this.settings.duration;
        
        // Apply 15% increase over the course of the game
        const rampMultiplier = 1 + (progress * 0.15);
        
        this.gameSettings.baseSpeed = this.originalSettings.baseSpeed * rampMultiplier;
        this.gameSettings.spawnRate = this.originalSettings.spawnRate / rampMultiplier;
    }
    
    /**
     * Start game animation loop
     */
    startGameAnimation() {
        this.renderer.startAnimation((deltaTime, timestamp) => {
            this.update(deltaTime);
            this.render();
        });
    }
    
    /**
     * Update game state
     */
    update(deltaTime) {
        // Update bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            
            // Update position
            bubble.x += bubble.vx;
            
            // Vertical movement (tortuosity)
            bubble.vyPhase += bubble.tortuosity * 0.05;
            bubble.y += Math.sin(bubble.vyPhase) * bubble.tortuosity;
            
            // Keep bubble in bounds vertically
            if (bubble.y - bubble.radius < 50) {
                bubble.y = 50 + bubble.radius;
                bubble.vyPhase += Math.PI;
            } else if (bubble.y + bubble.radius > this.renderer.height - 50) {
                bubble.y = this.renderer.height - 50 - bubble.radius;
                bubble.vyPhase += Math.PI;
            }
            
            // Update pop animation
            if (bubble.popping) {
                bubble.popAnimation += 0.1;
                if (bubble.popAnimation >= 1) {
                    this.bubbles.splice(i, 1);
                    continue;
                }
            }
            
            // Check if bubble went off screen
            if (bubble.x < -bubble.radius * 2) {
                if (!bubble.clicked) {
                    // Different scoring based on difficulty
                    const isCorrectSpelling = !bubble.hasError;
                    
                    switch (this.difficultyMode) {
                        case 'easy':
                            // In easy mode: target is correct words (Q key)
                            // Unclicked misspelled words count as correct (correctly ignored)
                            // Unclicked correct words count as missed (should have clicked)
                            if (!isCorrectSpelling) {
                                this.gameScore.right++;
                            } else {
                                this.gameScore.missed++;
                            }
                            break;
                            
                        case 'moderate':
                            // In moderate mode: target is misspelled words (R key)
                            // Unclicked correct words count as correct (correctly ignored)
                            // Unclicked misspelled words count as missed (should have clicked)
                            if (isCorrectSpelling) {
                                this.gameScore.right++;
                            } else {
                                this.gameScore.missed++;
                            }
                            break;
                            
                        case 'hard':
                            // In hard mode, all unclicked words count as missed
                            this.gameScore.missed++;
                            break;
                    }
                    
                    this.emit('scoreUpdate', {
                        right: this.gameScore.right,
                        wrong: this.gameScore.wrong,
                        missed: this.gameScore.missed
                    });
                }
                this.bubbles.splice(i, 1);
            }
        }
    }
    
    /**
     * Render the game
     */
    render() {
        // Render bubbles
        this.bubbles.forEach(bubble => {
            const isHovered = bubble === this.hoveredBubble;
            
            if (bubble.popping) {
                // Pop animation
                const scale = 1 + bubble.popAnimation * 0.5;
                const opacity = 1 - bubble.popAnimation;
                
                // Draw bubble background circle
                this.renderer.drawCircle(bubble.x, bubble.y, bubble.radius * scale, {
                    fillColor: bubble.feedbackColor,
                    strokeColor: null,
                    opacity: opacity
                });
                
                // Flash feedback text
                this.renderer.drawText(bubble.word, bubble.x, bubble.y, {
                    font: `bold ${bubble.fontSize * scale}px Arial`,
                    color: '#FFFFFF',
                    align: 'center',
                    baseline: 'middle',
                    shadow: {
                        color: 'rgba(0,0,0,0.5)',
                        blur: 4,
                        offsetX: 2,
                        offsetY: 2
                    }
                });
            } else {
                // Draw bubble background (fallback if no image)
                if (!bubble.bubbleImage || !bubble.bubbleImage.complete) {
                    // Draw colored circle as fallback
                    this.renderer.drawCircle(bubble.x, bubble.y, bubble.radius, {
                        fillColor: bubble.bubbleColor,
                        strokeColor: isHovered ? '#FFD700' : '#FFFFFF',
                        lineWidth: isHovered ? 3 : 2
                    });
                } else {
                    // Draw bubble image
                    this.renderer.drawSprite(bubble.bubbleImage, {
                        x: bubble.x,
                        y: bubble.y,
                        width: bubble.radius * 2,
                        height: bubble.radius * 2,
                        opacity: isHovered ? 0.9 : 1
                    });
                    
                    // Add hover highlight
                    if (isHovered) {
                        this.renderer.drawCircle(bubble.x, bubble.y, bubble.radius, {
                            fillColor: null,
                            strokeColor: '#FFD700',
                            lineWidth: 3
                        });
                    }
                }
                
                // Draw text with white background for better visibility
                this.renderer.drawText(bubble.word, bubble.x, bubble.y, {
                    font: `bold ${bubble.fontSize}px Arial`,
                    color: '#000000', // Black text
                    align: 'center',
                    baseline: 'middle',
                    shadow: {
                        color: 'rgba(255,255,255,0.9)', // White shadow for contrast
                        blur: 6,
                        offsetX: 0,
                        offsetY: 0
                    }
                });
            }
        });
        
        // Draw hover indicator in corner based on difficulty mode
        if (this.hoveredBubble && this.state === 'active') {
            let text;
            switch (this.difficultyMode) {
                case 'easy':
                    text = 'Press Q to identify correct spelling';
                    break;
                case 'moderate':
                    text = 'Press R to identify incorrect spelling';
                    break;
                default:
                    text = 'Press Q (correct) or R (incorrect)';
            }
            
            this.renderer.drawText(text, this.renderer.width / 2, 30, {
                font: 'bold 18px Arial',
                color: '#FFD700',
                align: 'center',
                baseline: 'middle',
                shadow: {
                    color: 'rgba(0,0,0,0.8)',
                    blur: 4,
                    offsetX: 2,
                    offsetY: 2
                }
            });
        }
    }
    
    /**
     * Called when exercise is paused
     */
    onPause() {
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
        }
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        if (this.rampingTimer) {
            clearInterval(this.rampingTimer);
        }
        this.renderer.stopAnimation();
    }
    
    
    /**
     * Called when exercise ends
     */
    onEnd() {
        // Clear timers
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
            this.spawnTimer = null;
        }
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.rampingTimer) {
            clearInterval(this.rampingTimer);
            this.rampingTimer = null;
        }
        
        // Stop animation
        if (this.renderer) {
            this.renderer.stopAnimation();
        }
        
        // Set final score
        this.score = this.gameScore.right;
        this.totalQuestions = this.gameScore.right + this.gameScore.wrong + this.gameScore.missed;
    }
    
    
    /**
     * Get exercise results
     */
    getResults() {
        const results = super.getResults();
        
        // Add bubble pop specific results
        results.gameScore = { ...this.gameScore };
        results.bubbleCount = this.totalQuestions;
        
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
        this.bubbleImages = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubblePopExercise;
}
