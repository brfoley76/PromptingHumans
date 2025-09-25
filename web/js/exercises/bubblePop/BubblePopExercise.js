/**
 * BubblePopExercise.js
 * Bubble Pop game exercise implementation
 */

class BubblePopExercise extends ExerciseFramework {
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
            speed: 50,             // 0-100 scale
            tortuosity: 50,        // 0-100 scale
            spellingErrorRate: 30, // percentage
            difficulty: 'medium'
        };
    }
    
    /**
     * Initialize the exercise with canvas and settings
     */
    async initializeGame(canvas, settings = {}) {
        // Initialize base exercise
        this.initialize(settings);
        
        // Set up renderer
        this.renderer = new CanvasRenderer(canvas, {
            width: 900,
            height: 600,
            backgroundColor: this.currentBgColor,
            autoResize: false
        });
        
        // Set up input handler
        this.inputHandler = new InputHandler(canvas);
        this.setupInputHandlers();
        
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
     * Calculate game parameters from settings
     */
    calculateGameParameters() {
        const s = this.settings;
        
        // Determine difficulty mode
        if (s.speed <= 33) {
            this.difficultyMode = 'easy';
        } else if (s.speed <= 66) {
            this.difficultyMode = 'medium';
        } else {
            this.difficultyMode = 'hard';
        }
        
        // Store original settings for ramping
        this.originalSettings = {
            baseSpeed: 0.2 + (s.speed / 100),
            tortuosity: 0.2 + (s.tortuosity / 100),
            spellingErrorRate: s.spellingErrorRate,
            spawnRate: 2500
        };
        
        // Apply difficulty scaling
        let speedMultiplier = 1.0;
        let spawnMultiplier = 1.0;
        let tortuosityMultiplier = 1.0;
        
        if (this.difficultyMode === 'medium') {
            speedMultiplier = 1.15;
            spawnMultiplier = 0.9;
            tortuosityMultiplier = 1.1;
        } else if (this.difficultyMode === 'hard') {
            speedMultiplier = 1.3;
            spawnMultiplier = 0.8;
            tortuosityMultiplier = 1.2;
        }
        
        // Apply scaled settings
        this.gameSettings = {
            baseSpeed: this.originalSettings.baseSpeed * speedMultiplier,
            tortuosity: this.originalSettings.tortuosity * tortuosityMultiplier,
            spellingErrorRate: this.originalSettings.spellingErrorRate,
            spawnRate: this.originalSettings.spawnRate * spawnMultiplier,
            minFontSize: 18,
            maxFontSize: 32
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
        
        // Mouse move handler to track hover
        this.inputHandler.on('mousemove', (data) => {
            if (this.state !== 'active') return;
            
            const bubble = this.getBubbleAt(data.x, data.y);
            if (bubble !== this.hoveredBubble) {
                this.hoveredBubble = bubble;
                // Update cursor style
                if (this.renderer && this.renderer.canvas) {
                    this.renderer.canvas.style.cursor = bubble ? 'pointer' : 'crosshair';
                }
            }
        });
        
        // Key handlers for Q and R
        this.inputHandler.on('keydown', (data) => {
            if (this.state !== 'active') return;
            
            // Q key - mark as correct spelling
            if (data.key === 'q' && this.hoveredBubble) {
                this.handleBubbleClick(this.hoveredBubble, true);
                this.hoveredBubble = null;
            }
            // R key - mark as incorrect spelling
            else if (data.key === 'r' && this.hoveredBubble) {
                this.handleBubbleClick(this.hoveredBubble, false);
                this.hoveredBubble = null;
            }
            // Escape key to pause/quit
            else if (data.key === 'escape') {
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
     * Handle bubble click
     */
    handleBubbleClick(bubble, markedAsCorrect) {
        if (bubble.clicked) return;
        
        bubble.clicked = true;
        bubble.popping = true;
        bubble.popAnimation = 0;
        
        // Check if the answer is right
        const isCorrectSpelling = !bubble.hasError;
        const answeredCorrectly = (markedAsCorrect === isCorrectSpelling);
        
        if (answeredCorrectly) {
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
        let hasError = false;
        if (this.difficultyMode === 'easy') {
            hasError = Math.random() * 100 < (this.gameSettings.spellingErrorRate * 0.5);
        } else if (this.difficultyMode === 'medium') {
            hasError = Math.random() * 100 < (this.gameSettings.spellingErrorRate * 1.5);
        } else {
            hasError = Math.random() * 100 < this.gameSettings.spellingErrorRate;
        }
        
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
            color: '#FFFFFF', // White text for better visibility
            bubbleColor: this.getRandomBubbleColor(), // Add bubble background color
            bubbleImage: this.bubbleImages[Math.floor(Math.random() * this.bubbleImages.length)],
            popping: false,
            popAnimation: 0,
            clicked: false,
            feedbackColor: null
        };
        
        this.bubbles.push(bubble);
        this.totalQuestions++;
        console.log(`Spawned bubble: ${word}, Total bubbles: ${this.bubbles.length}`);
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
        // Every 3 minutes, increase difficulty
        this.rampingTimer = setInterval(() => {
            this.rampingLevel++;
            this.applyRamping();
        }, 180000);
    }
    
    /**
     * Apply progressive difficulty ramping
     */
    applyRamping() {
        const rampMultiplier = 1 + (this.rampingLevel * 0.2);
        
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
                    this.gameScore.missed++;
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
                
                // Draw text with shadow for better visibility
                this.renderer.drawText(bubble.word, bubble.x, bubble.y, {
                    font: `bold ${bubble.fontSize}px Arial`,
                    color: bubble.color,
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
        });
        
        // Draw hover indicator in corner
        if (this.hoveredBubble && this.state === 'active') {
            const text = 'Press Q (correct) or R (incorrect)';
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
     * Called when exercise is resumed
     */
    onResume() {
        this.startGameTimer();
        this.startSpawning();
        this.startRampingTimer();
        this.startGameAnimation();
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
     * Called when exercise is reset
     */
    onReset() {
        this.bubbles = [];
        this.nextBubbleId = 0;
        this.gameScore = { right: 0, wrong: 0, missed: 0 };
        this.timeRemaining = this.settings.duration;
        this.rampingLevel = 0;
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
