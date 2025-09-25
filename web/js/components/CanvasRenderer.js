/**
 * CanvasRenderer.js
 * Reusable canvas rendering utilities for exercises
 */

class CanvasRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Default options
        this.options = {
            width: 900,
            height: 600,
            backgroundColor: '#ffffff',
            autoResize: true,
            pixelRatio: window.devicePixelRatio || 1,
            ...options
        };
        
        // Animation state
        this.animationFrame = null;
        this.isAnimating = false;
        this.fps = 60;
        this.lastFrameTime = 0;
        
        // Render queue
        this.renderQueue = [];
        
        // Initialize canvas
        this.initialize();
    }
    
    /**
     * Initialize canvas settings
     */
    initialize() {
        this.resize(this.options.width, this.options.height);
        
        if (this.options.autoResize) {
            this.setupResizeHandler();
        }
        
        // Set default styles
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    /**
     * Resize canvas
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    resize(width, height) {
        const ratio = this.options.pixelRatio;
        
        // Set display size
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Set actual size in memory (scaled for pixel ratio)
        this.canvas.width = width * ratio;
        this.canvas.height = height * ratio;
        
        // Scale context to match pixel ratio
        this.ctx.scale(ratio, ratio);
        
        // Store logical dimensions
        this.width = width;
        this.height = height;
    }
    
    /**
     * Setup window resize handler
     */
    setupResizeHandler() {
        let resizeTimeout;
        
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const rect = this.canvas.parentElement?.getBoundingClientRect();
                if (rect) {
                    this.resize(rect.width, rect.height);
                }
            }, 250);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Store handler for cleanup
        this.resizeHandler = handleResize;
    }
    
    /**
     * Clear the canvas
     * @param {string} color - Background color (optional)
     */
    clear(color = null) {
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }
    
    /**
     * Draw text
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Text options
     */
    drawText(text, x, y, options = {}) {
        const defaults = {
            font: '16px Arial',
            color: '#000000',
            align: 'left',
            baseline: 'top',
            maxWidth: null,
            shadow: null
        };
        
        const opts = { ...defaults, ...options };
        
        this.ctx.save();
        
        // Apply shadow if specified
        if (opts.shadow) {
            this.ctx.shadowColor = opts.shadow.color || 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = opts.shadow.blur || 4;
            this.ctx.shadowOffsetX = opts.shadow.offsetX || 2;
            this.ctx.shadowOffsetY = opts.shadow.offsetY || 2;
        }
        
        this.ctx.font = opts.font;
        this.ctx.fillStyle = opts.color;
        this.ctx.textAlign = opts.align;
        this.ctx.textBaseline = opts.baseline;
        
        if (opts.maxWidth) {
            this.ctx.fillText(text, x, y, opts.maxWidth);
        } else {
            this.ctx.fillText(text, x, y);
        }
        
        this.ctx.restore();
    }
    
    /**
     * Draw an image
     * @param {Image} image - Image to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width (optional)
     * @param {number} height - Height (optional)
     */
    drawImage(image, x, y, width = null, height = null) {
        if (!image || !image.complete) return;
        
        if (width && height) {
            this.ctx.drawImage(image, x, y, width, height);
        } else {
            this.ctx.drawImage(image, x, y);
        }
    }
    
    /**
     * Draw a sprite with rotation and scaling
     * @param {Image} image - Sprite image
     * @param {Object} options - Sprite options
     */
    drawSprite(image, options = {}) {
        if (!image || !image.complete) return;
        
        const defaults = {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
            rotation: 0,
            scale: 1,
            opacity: 1,
            anchorX: 0.5,
            anchorY: 0.5
        };
        
        const opts = { ...defaults, ...options };
        
        this.ctx.save();
        
        // Set opacity
        this.ctx.globalAlpha = opts.opacity;
        
        // Translate to position
        this.ctx.translate(opts.x, opts.y);
        
        // Rotate if needed
        if (opts.rotation !== 0) {
            this.ctx.rotate(opts.rotation);
        }
        
        // Scale if needed
        if (opts.scale !== 1) {
            this.ctx.scale(opts.scale, opts.scale);
        }
        
        // Draw image centered on anchor point
        const drawX = -(opts.width * opts.anchorX);
        const drawY = -(opts.height * opts.anchorY);
        
        this.ctx.drawImage(image, drawX, drawY, opts.width, opts.height);
        
        this.ctx.restore();
    }
    
    /**
     * Draw a circle
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Circle radius
     * @param {Object} options - Drawing options
     */
    drawCircle(x, y, radius, options = {}) {
        const defaults = {
            fillColor: null,
            strokeColor: '#000000',
            lineWidth: 1
        };
        
        const opts = { ...defaults, ...options };
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (opts.fillColor) {
            this.ctx.fillStyle = opts.fillColor;
            this.ctx.fill();
        }
        
        if (opts.strokeColor) {
            this.ctx.strokeStyle = opts.strokeColor;
            this.ctx.lineWidth = opts.lineWidth;
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw a rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {Object} options - Drawing options
     */
    drawRect(x, y, width, height, options = {}) {
        const defaults = {
            fillColor: null,
            strokeColor: '#000000',
            lineWidth: 1,
            cornerRadius: 0
        };
        
        const opts = { ...defaults, ...options };
        
        if (opts.cornerRadius > 0) {
            this.drawRoundedRect(x, y, width, height, opts.cornerRadius, opts);
        } else {
            if (opts.fillColor) {
                this.ctx.fillStyle = opts.fillColor;
                this.ctx.fillRect(x, y, width, height);
            }
            
            if (opts.strokeColor) {
                this.ctx.strokeStyle = opts.strokeColor;
                this.ctx.lineWidth = opts.lineWidth;
                this.ctx.strokeRect(x, y, width, height);
            }
        }
    }
    
    /**
     * Draw a rounded rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {number} radius - Corner radius
     * @param {Object} options - Drawing options
     */
    drawRoundedRect(x, y, width, height, radius, options = {}) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        
        if (options.fillColor) {
            this.ctx.fillStyle = options.fillColor;
            this.ctx.fill();
        }
        
        if (options.strokeColor) {
            this.ctx.strokeStyle = options.strokeColor;
            this.ctx.lineWidth = options.lineWidth || 1;
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw a line
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {Object} options - Line options
     */
    drawLine(x1, y1, x2, y2, options = {}) {
        const defaults = {
            color: '#000000',
            width: 1,
            dash: null
        };
        
        const opts = { ...defaults, ...options };
        
        this.ctx.save();
        
        this.ctx.strokeStyle = opts.color;
        this.ctx.lineWidth = opts.width;
        
        if (opts.dash) {
            this.ctx.setLineDash(opts.dash);
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * Start animation loop
     * @param {Function} renderCallback - Function to call on each frame
     */
    startAnimation(renderCallback) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        const animate = (timestamp) => {
            if (!this.isAnimating) return;
            
            // Calculate delta time
            const deltaTime = timestamp - this.lastFrameTime;
            const targetFrameTime = 1000 / this.fps;
            
            // Only render if enough time has passed
            if (deltaTime >= targetFrameTime) {
                this.lastFrameTime = timestamp - (deltaTime % targetFrameTime);
                
                // Clear canvas
                this.clear(this.options.backgroundColor);
                
                // Call render callback
                if (renderCallback) {
                    renderCallback(deltaTime, timestamp);
                }
                
                // Process render queue
                this.processRenderQueue();
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    /**
     * Stop animation loop
     */
    stopAnimation() {
        this.isAnimating = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    /**
     * Add item to render queue
     * @param {Function} renderFunc - Function to execute during render
     */
    addToRenderQueue(renderFunc) {
        this.renderQueue.push(renderFunc);
    }
    
    /**
     * Process render queue
     */
    processRenderQueue() {
        while (this.renderQueue.length > 0) {
            const renderFunc = this.renderQueue.shift();
            renderFunc(this.ctx);
        }
    }
    
    /**
     * Get text metrics
     * @param {string} text - Text to measure
     * @param {string} font - Font style
     */
    measureText(text, font = '16px Arial') {
        this.ctx.save();
        this.ctx.font = font;
        const metrics = this.ctx.measureText(text);
        this.ctx.restore();
        return metrics;
    }
    
    /**
     * Create gradient
     * @param {string} type - 'linear' or 'radial'
     * @param {Object} options - Gradient options
     */
    createGradient(type, options) {
        let gradient;
        
        if (type === 'linear') {
            gradient = this.ctx.createLinearGradient(
                options.x1 || 0,
                options.y1 || 0,
                options.x2 || this.width,
                options.y2 || 0
            );
        } else if (type === 'radial') {
            gradient = this.ctx.createRadialGradient(
                options.x1 || this.width / 2,
                options.y1 || this.height / 2,
                options.r1 || 0,
                options.x2 || this.width / 2,
                options.y2 || this.height / 2,
                options.r2 || Math.min(this.width, this.height) / 2
            );
        }
        
        if (gradient && options.stops) {
            options.stops.forEach(stop => {
                gradient.addColorStop(stop.position, stop.color);
            });
        }
        
        return gradient;
    }
    
    /**
     * Save canvas state
     */
    save() {
        this.ctx.save();
    }
    
    /**
     * Restore canvas state
     */
    restore() {
        this.ctx.restore();
    }
    
    /**
     * Clean up and destroy renderer
     */
    destroy() {
        this.stopAnimation();
        
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        this.renderQueue = [];
        this.canvas = null;
        this.ctx = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasRenderer;
}
