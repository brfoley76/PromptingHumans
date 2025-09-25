/**
 * Bubble Pop Game Module - Part 1: Core Setup
 */

class BubblePopGame {
    constructor(curriculumManager) {
        this.curriculumManager = curriculumManager;
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'idle'; // idle, instructions, playing, ended
        this.bubbles = [];
        this.score = { right: 0, wrong: 0, missed: 0 };
        this.timeRemaining = 60;
        this.gameTimer = null;
        this.animationFrame = null;
        this.gameStartTime = null;
        this.rampingTimer = null;
        this.wasQuit = false;
        this.difficultyMode = 'medium';
        this.rampingLevel = 0;
        
        // Game settings
        this.settings = {
            duration: 60,
            baseSpeed: 0.4,
            tortuosity: 0.5,
            spellingErrorRate: 30,
            minFontSize: 18,
            maxFontSize: 32,
            spawnRate: 2500
        };
        
        // Original settings for ramping
        this.originalSettings = {};
        
        // Bubble images
        this.bubbleImages = [];
        this.imagesLoaded = false;
        
        // Input state
        this.keysPressed = new Set();
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetedBubble = null;
        
        // Colors for background
        this.backgroundColors = [
            '#FFE6E6', '#E6F3FF', '#E6FFE6', '#FFF9E6', 
            '#F0E6FF', '#FFE6F5', '#E6FFF5', '#FFF0E6'
        ];
        this.currentBgColor = '#E6F3FF';
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
            speedMultiplier = 1.15;
            spawnMultiplier = 0.9;
            tortuosityMultiplier = 1.1;
        } else if (this.difficultyMode === 'hard') {
            speedMultiplier = 1.3;
            spawnMultiplier = 0.8;
            tortuosityMultiplier = 1.2;
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
                this.settings.baseSpeed = 0.2 + (devSettings.speed / 100);
            }
            if (devSettings.tortuosity !== null && devSettings.tortuosity !== undefined) {
                this.settings.tortuosity = 0.2 + (devSettings.tortuosity / 100);
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
            img.src = `../../game_assets/bubble_pop/bubble${i}.png`;
            imagePromises.push(new Promise((resolve) => {
                img.onload = () => {
                    console.log(`Loaded bubble image ${i}`);
                    resolve();
                };
                img.onerror = (e) => {
                    console.error(`Failed to load bubble image ${i}:`, e);
                    resolve();
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
                this.endGame(false);
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
        }, 180000);
    }
    
    /**
     * Apply progressive difficulty ramping
     */
    applyRamping() {
        const rampMultiplier = 1 + (this.rampingLevel * 0.2);
        
        // Apply ramping to speed and spawn rate
        this.settings.baseSpeed = this.originalSettings.baseSpeed * rampMultiplier;
        this.settings.spawnRate = this.originalSettings.spawnRate / rampMultiplier;
        
        console.log(`Ramping level ${this.rampingLevel}: Speed ${this.settings.baseSpeed}, Spawn ${this.settings.spawnRate}`);
    }
