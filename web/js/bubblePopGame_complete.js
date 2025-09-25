/**
 * Bubble Pop Game Module - Complete Implementation
 */

class BubblePopGame {
    constructor(curriculumManager) {
        this.curriculumManager = curriculumManager;
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'idle'; // idle, instructions, playing, paused, ended
        this.bubbles = [];
        this.score = { right: 0, wrong: 0, missed: 0 };
        this.timeRemaining = 60; // seconds
        this.gameTimer = null;
        this.animationFrame = null;
        this.gameStartTime = null;
        this.rampingTimer = null;
        this.wasQuit = false;
        this.difficultyMode = 'medium'; // easy, medium, hard
        this.rampingLevel = 0; // Increases every 3 minutes
        
        // Game settings
        this.settings = {
            duration: 60, // seconds
            baseSpeed: 0.4, // pixels per frame - reduced to 1/5th
            tortuosity: 0.5, // reduced for gentler movement
            spellingErrorRate: 30, // percentage
            minFontSize: 18,
            maxFontSize: 32,
            spawnRate: 2500 // milliseconds between spawns - reduced by 70% from 800ms
        };
        
        // Original settings for ramping
        this.originalSettings = {};
        
        // Dev mode overrides
        this.devSettings = {
            speed: null,
            tortuosity: null,
            spellingErrorRate: null
        };
        
        // Bubble images
        this.bubbleImages = [];
        this.imagesLoaded = false;
        
        // Input state
        this.keysPressed = new Set();
        this.lastClickedBubble = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetedBubble = null;
        
        // Colors for background
        this.backgroundColors = [
            '#FFE6E6', '#E6F3FF', '#E6FFE6', '#FFF9E6', 
            '#F0E6FF', '#FFE6F5', '#E6FFF5', '#FFF0E6'
        ];
        this.currentBgColor = '#E6F3FF';
        
        // Callback for game end
        this.onGameEnd = null;
    }

    /**
     * Initialize the game
     */
    async initialize(duration = 60, speed = 50, tortuosity = 50, spellingErrorRate = 30) {
        // Determine difficulty mode based on speed setting
        if (speed <= 33) {
            this.difficultyMode = 'easy';
        } else if (speed <= 66) {
            this.difficultyMode = 'medium';
        } else {
            this.difficultyMode = 'hard';
        }
        
        // Store original settings for ramping
        this.originalSettings = {
            duration: duration,
            baseSpeed: 0.2 + (speed / 100),
            tortuosity: 0.2 + (tortuosity / 100),
            spellingErrorRate: spellingErrorRate,
            spawnRate: 2500
        };
        
        // Apply difficulty scaling
        let speedMultiplier = 1.0;
        let spawnMultiplier = 1.0;
        let tortuosityMultiplier = 1.0;
        
        if (this.difficultyMode === 'medium') {
            speedMultiplier = 1.15; // 15% faster
            spawnMultiplier = 0.9; // 10% more frequent (lower is more)
            tortuosityMultiplier = 1.1; // 10% more movement
        } else if (this.difficultyMode === 'hard') {
            speedMultiplier = 1.3; // 30% faster
            spawnMultiplier = 0.8; // 20% more frequent
            tortuosityMultiplier = 1.2; // 20% more movement
        }
        
        this.settings.duration = duration;
        this.settings.baseSpeed = this.originalSettings.baseSpeed * speedMultiplier;
        this.settings.tortuosity = this.originalSettings.tortuosity * tortuosityMultiplier;
        this.settings.spellingErrorRate = spellingErrorRate;
        this.settings.spawnRate = this.originalSettings.spawnRate * spawnMultiplier;
        
        // Apply dev mode overrides if they exist
        this.applyDevSettings();
        
        // Load bubble images
        await this.loadBubbleImages();
        
        // Reset game state
        this.reset();
        
        // Set random background color
        this.currentBgColor = this.backgroundColors[Math.floor(Math.random() * this.backgroundColors.length)];
    }

    /**
     * Apply dev mode settings if available
     */
    applyDevSettings() {
        if (window.bubblePopDevSettings) {
            const devSettings = window.bubblePopDevSettings;
            if (devSettings.speed !== null && devSettings.speed !== undefined) {
                this.settings.baseSpeed = 0.2 + (devSettings.speed / 100); // Much slower
            }
            if (devSettings.tortuosity !== null && devSettings.tortuosity !== undefined) {
                this.settings.tortuosity = 0.2 + (devSettings.tortuosity / 100); // Gentler movement
            }
            if (devSettings.spellingErrorRate !== null && devSettings.spellingErrorRate !== undefined) {
                this.settings.spellingErrorRate = devSettings.spellingErrorRate;
            }
        }
    }

    /**
     * Load bubble images
     */
    async loadBubbleImages() {
        if (this.imagesLoaded) return;
        
        const imagePromises = [];
        for (let i = 1; i <= 4; i++) {
            const img = new Image();
            // Fix path - go up two levels from web/js to reach game_assets
            img.src = `../../game_assets/bubble_pop/bubble${i}.png`;
            imagePromises.push(new Promise((resolve) => {
                img.onload = () => {
                    console.log(`Loaded bubble image ${i}`);
                    resolve();
                };
                img.onerror = (e) => {
                    console.error(`Failed to load bubble image ${i}:`, e);
                    resolve(); // Continue even if image fails
                };
            }));
            this.bubbleImages.push(img);
        }
        
        await Promise.all(imagePromises);
        this.imagesLoaded = true;
    }

    /**
     * Reset game state
     */
    reset() {
        this.gameState = 'idle';
        this.bubbles = [];
        this.score = { right: 0, wrong: 0, missed: 0 };
        this.timeRemaining = this.settings.duration;
        this.keysPressed.clear();
        this.lastClickedBubble = null;
        this.rampingLevel = 0;
        this.wasQuit = false;
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        if (this.rampingTimer) {
            clearInterval(this.rampingTimer);
            this.rampingTimer = null;
        }
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Start the game
     */
    start(canvas) {
        console.log('Starting bubble pop game');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = 900;
        this.canvas.height = 600;
        
        console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
        console.log('Images loaded:', this.imagesLoaded, 'Number of images:', this.bubbleImages.length);
        console.log('Difficulty mode:', this.difficultyMode);
        
        // Reset and show instructions
        this.reset();
        this.gameState = 'instructions';
        this.wasQuit = false;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation to show instructions
        this.startAnimation();
    }
    
    /**
     * Actually start the gameplay
     */
    startGameplay() {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        
        // Start timers
        this.startGameTimer();
        this.startSpawning();
        this.startRampingTimer();
    }

    /**
     * Start game timer
     */
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            if (this.timeRemaining <= 0) {
                this.endGame(false); // Natural end
            }
        }, 1000);
    }
    
    /**
     * Start ramping timer
     */
    startRampingTimer() {
        // Every 3 minutes (180 seconds), increase difficulty
        this.rampingTimer = setInterval(() => {
            this.rampingLevel++;
            this.applyRamping();
        }, 180000); // 3 minutes
    }
    
    /**
     * Apply progressive difficulty ramping
     */
    applyRamping() {
        const rampMultiplier = 1 + (this.rampingLevel * 0.2); // 20% increase per level
        
        // Apply ramping to speed and spawn rate
        this.settings.baseSpeed = this.originalSettings.baseSpeed * rampMultiplier;
        this.settings.spawnRate = this.originalSettings.spawnRate / rampMultiplier; // Lower is faster
        
        console.log(`Ramping level ${this.rampingLevel}: Speed ${this.settings.baseSpeed}, Spawn ${this.settings.spawnRate}`);
    }

    /**
     * Start spawning bubbles
     */
    startSpawning() {
        const spawn = () => {
            if (this.gameState !== 'playing') return;
            
            this.spawnBubble();
            
            // Random spawn interval with some variation
            const nextSpawn = this.settings.spawnRate + (Math.random() * 500 - 250);
            setTimeout(spawn, nextSpawn);
        };
        
        // Start spawning
        setTimeout(spawn, 1000);
    }

    /**
     * Spawn a new bubble
     */
    spawnBubble() {
        const vocabulary = this.curriculumManager.getVocabulary();
        console.log('Spawning bubble. Vocabulary length:', vocabulary ? vocabulary.length : 0);
        
        if (!vocabulary || vocabulary.length === 0) {
            console.error('No vocabulary available for bubble spawning');
            return;
        }
        
        // Select random word
        const vocabItem = vocabulary[Math.floor(Math.random() * vocabulary.length)];
        let word = vocabItem.word;
        
        // Randomly introduce spelling error based on difficulty
        let hasError = false;
        if (this.difficultyMode === 'easy') {
            // Easy: Only correct words matter, errors are rare
            hasError = Math.random() * 100 < (this.settings.spellingErrorRate * 0.5);
        } else if (this.difficultyMode === 'medium') {
            // Medium: Only errors matter, so more errors
            hasError = Math.random() * 100 < (this.settings.spellingErrorRate * 1.5);
        } else {
            // Hard: Normal error rate
            hasError = Math.random() * 100 < this.settings.spellingErrorRate;
        }
        
        if (hasError) {
            word = this.corruptSpelling(word);
        }
        
        // Create bubble object with individual speed and tortuosity
        const individualSpeed = this.settings.baseSpeed * (0.5 + Math.random()); // 50% to 150% of base speed
        const individualTortuosity = this.settings.tortuosity * (0.7 + Math.random() * 0.6); // 70% to 130% of base tortuosity
        
        // Ensure canvas dimensions are available
        if (!this.canvas || !this.canvas.width || !this.canvas.height) {
            console.error('Canvas not properly initialized');
            return;
        }
        
        const bubble = {
            id: Date.now() + Math.random(),
            word: word,
            originalWord: vocabItem.word,
            hasError: hasError,
            x: this.canvas.width + 50,
            y: 150 + Math.random() * (this.canvas.height - 300), // Adjusted spawn range
            vx: -individualSpeed,
            vy: 0,
            vyPhase: Math.random() * Math.PI * 2,
            tortuosity: individualTortuosity,
            fontSize: this.settings.minFontSize + Math.random() * (this.settings.maxFontSize - this.settings.minFontSize),
            color: this.getRandomDarkColor(),
            bubbleImage: this.bubbleImages[Math.floor(Math.random() * this.bubbleImages.length)],
            popping: false,
            popAnimation: 0,
            clicked: false,
            targeted: false
        };
        
        console.log('Created bubble:', bubble.word, 'at position', bubble.x, bubble.y);
        this.bubbles.push(bubble);
        console.log('Total bubbles:', this.bubbles.length);
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
     * Get random dark color for text
     */
    getRandomDarkColor() {
        const colors = [
            '#003366', '#004080', '#1a1a2e', '#16213e', '#0f3460',
            '#2c3e50', '#34495e', '#2c2c54', '#40407a', '#2f3640'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        console.log('Starting animation loop');
        const animate = () => {
            if (this.gameState === 'ended') {
                console.log('Game ended, stopping animation');
                return;
            }
            
            if (this.gameState === 'instructions') {
                this.renderInstructions();
            } else if (this.gameState === 'playing') {
                this.update();
                this.render();
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Render instructions screen
     */
    renderInstructions() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = this.currentBgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Bubble Pop Game', this.canvas.width / 2, 100);
        
        // Difficulty mode
        ctx.font = 'bold 24px Arial';
