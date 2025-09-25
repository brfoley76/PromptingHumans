/**
 * Bubble Pop Game Module - Complete Working Version
 */

class BubblePopGame {
    constructor(curriculumManager) {
        this.curriculumManager = curriculumManager;
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'idle';
        this.bubbles = [];
        this.score = { right: 0, wrong: 0, missed: 0 };
        this.timeRemaining = 60;
        this.gameTimer = null;
        this.animationFrame = null;
        
        this.settings = {
            duration: 60,
            baseSpeed: 0.4,
            tortuosity: 0.5,
            spellingErrorRate: 30,
            minFontSize: 18,
            maxFontSize: 32,
            spawnRate: 2500
        };
        
        this.bubbleImages = [];
        this.imagesLoaded = false;
        this.keysPressed = new Set();
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetedBubble = null;
        
        this.backgroundColors = ['#FFE6E6', '#E6F3FF', '#E6FFE6', '#FFF9E6'];
        this.currentBgColor = '#E6F3FF';
    }

    async initialize(duration = 60, speed = 50, tortuosity = 50, spellingErrorRate = 30) {
        this.settings.duration = duration;
        this.settings.baseSpeed = 0.2 + (speed / 100);
        this.settings.tortuosity = 0.2 + (tortuosity / 100);
        this.settings.spellingErrorRate = spellingErrorRate;
        
        if (window.bubblePopDevSettings) {
            const dev = window.bubblePopDevSettings;
            if (dev.speed !== null) this.settings.baseSpeed = 0.2 + (dev.speed / 100);
            if (dev.tortuosity !== null) this.settings.tortuosity = 0.2 + (dev.tortuosity / 100);
            if (dev.spellingErrorRate !== null) this.settings.spellingErrorRate = dev.spellingErrorRate;
        }
        
        await this.loadBubbleImages();
        this.reset();
        this.currentBgColor = this.backgroundColors[Math.floor(Math.random() * this.backgroundColors.length)];
    }

    async loadBubbleImages() {
        if (this.imagesLoaded) return;
        const promises = [];
        for (let i = 1; i <= 4; i++) {
            const img = new Image();
            img.src = `../../game_assets/bubble_pop/bubble${i}.png`;
            promises.push(new Promise(r => {
                img.onload = () => r();
                img.onerror = () => r();
            }));
            this.bubbleImages.push(img);
        }
        await Promise.all(promises);
        this.imagesLoaded = true;
    }

    reset() {
        this.gameState = 'idle';
        this.bubbles = [];
        this.score = { right: 0, wrong: 0, missed: 0 };
        this.timeRemaining = this.settings.duration;
        this.keysPressed.clear();
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    start(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 900;
        this.canvas.height = 600;
        
        this.reset();
        this.gameState = 'playing';
        
        this.startGameTimer();
        this.startSpawning();
        this.startAnimation();
        this.setupEventListeners();
    }

    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    startSpawning() {
        const spawn = () => {
            if (this.gameState !== 'playing') return;
            this.spawnBubble();
            const next = this.settings.spawnRate + (Math.random() * 500 - 250);
            setTimeout(spawn, next);
        };
        setTimeout(spawn, 1000);
    }

    spawnBubble() {
        const vocab = this.curriculumManager.getVocabulary();
        if (!vocab || vocab.length === 0) return;
        
        const item = vocab[Math.floor(Math.random() * vocab.length)];
        let word = item.word;
        
        const hasError = Math.random() * 100 < this.settings.spellingErrorRate;
        if (hasError) {
            word = this.corruptSpelling(word);
        }
        
        const bubble = {
            id: Date.now() + Math.random(),
            word: word,
            originalWord: item.word,
            hasError: hasError,
            x: this.canvas.width + 50,
            y: 150 + Math.random() * (this.canvas.height - 300),
            vx: -this.settings.baseSpeed * (0.5 + Math.random()),
            vy: 0,
            vyPhase: Math.random() * Math.PI * 2,
            tortuosity: this.settings.tortuosity * (0.7 + Math.random() * 0.6),
            fontSize: this.settings.minFontSize + Math.random() * (this.settings.maxFontSize - this.settings.minFontSize),
            color: '#003366',
            popping: false,
            popAnimation: 0,
            clicked: false
        };
        
        this.bubbles.push(bubble);
    }

    corruptSpelling(word) {
        if (word.length < 3) return word;
        const pos = Math.floor(Math.random() * (word.length - 1));
        const chars = word.split('');
        [chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]];
        return chars.join('');
    }

    startAnimation() {
        const animate = () => {
            if (this.gameState !== 'playing') return;
            this.update();
            this.render();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    update() {
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            
            bubble.x += bubble.vx;
            
            if (bubble.tortuosity > 0) {
                bubble.vyPhase += 0.02;
                bubble.vy = Math.sin(bubble.vyPhase) * bubble.tortuosity * 2;
                bubble.y += bubble.vy;
                bubble.y = Math.max(100, Math.min(this.canvas.height - 100, bubble.y));
            }
            
            if (bubble.popping) {
                bubble.popAnimation += 0.1;
                if (bubble.popAnimation >= 1) {
                    this.bubbles.splice(i, 1);
                    continue;
                }
            }
            
            if (bubble.x < -100) {
                if (!bubble.clicked && !bubble.popping) {
                    this.score.missed++;
                }
                this.bubbles.splice(i, 1);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        
        ctx.fillStyle = this.currentBgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.bubbles.forEach(bubble => this.renderBubble(bubble));
        this.renderUI();
    }

    renderBubble(bubble) {
        const ctx = this.ctx;
        
        ctx.font = `bold ${bubble.fontSize}px Arial`;
        const textWidth = ctx.measureText(bubble.word).width;
        const bubbleSize = Math.max(textWidth + 40, 80);
        
        let scale = 1;
        let opacity = 1;
        if (bubble.popping) {
            scale = 1 + bubble.popAnimation * 0.5;
            opacity = 1 - bubble.popAnimation;
        }
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(bubble.x, bubble.y);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, bubbleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        if (bubble === this.targetedBubble && !bubble.popping && !bubble.clicked) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, bubbleSize / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.font = `bold ${bubble.fontSize}px Arial`;
        ctx.fillStyle = bubble.color;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(bubble.word, 0, 0);
        ctx.fillText(bubble.word, 0, 0);
        
        ctx.restore();
    }

    renderUI() {
        const ctx = this.ctx;
        
        ctx.fillStyle = 'rgba(0, 51, 102, 0.9)';
        ctx.fillRect(0, 0, this.canvas.width, 60);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Time: ${this.formatTime(this.timeRemaining)}`, 20, 35);
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#90EE90';
        ctx.fillText(`Right: ${this.score.right}`, 300, 35);
        
        ctx.fillStyle = '#FFB6C1';
        ctx.fillText(`Wrong: ${this.score.wrong}`, 450, 35);
        
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Missed: ${this.score.missed}`, 600, 35);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('Hover and press Q: Correct | R: Incorrect', this.canvas.width - 20, 35);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    setupEventListeners() {
        this.keyDownHandler = (e) => this.handleKeyDown(e);
        this.keyUpHandler = (e) => this.handleKeyUp(e);
        this.mouseMoveHandler = (e) => this.handleMouseMove(e);
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = event.clientX - rect.left;
        this.mouseY = event.clientY - rect.top;
        
        this.targetedBubble = null;
        let closestDistance = Infinity;
        
        for (const bubble of this.bubbles) {
            if (bubble.popping || bubble.clicked) continue;
            
            const dx = this.mouseX - bubble.x;
            const dy = this.mouseY - bubble.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.ctx.font = `bold ${bubble.fontSize}px Arial`;
