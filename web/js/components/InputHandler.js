/**
 * InputHandler.js
 * Unified input handling for exercises
 */

class InputHandler {
    constructor(element = document) {
        this.element = element;
        
        // Input state
        this.keys = new Map();
        this.mouse = {
            x: 0,
            y: 0,
            buttons: new Map(),
            isOver: false
        };
        this.touch = {
            touches: new Map(),
            isActive: false
        };
        
        // Event listeners registry
        this.listeners = new Map();
        
        // Key combinations
        this.keyCombos = new Map();
        
        // Input modes
        this.modes = {
            keyboard: true,
            mouse: true,
            touch: true
        };
        
        // Initialize handlers
        this.initialize();
    }
    
    /**
     * Initialize input handlers
     */
    initialize() {
        // Keyboard events
        if (this.modes.keyboard) {
            this.setupKeyboardHandlers();
        }
        
        // Mouse events
        if (this.modes.mouse) {
            this.setupMouseHandlers();
        }
        
        // Touch events
        if (this.modes.touch && 'ontouchstart' in window) {
            this.setupTouchHandlers();
        }
    }
    
    /**
     * Setup keyboard event handlers
     */
    setupKeyboardHandlers() {
        const handleKeyDown = (e) => {
            const key = this.normalizeKey(e.key);
            
            if (!this.keys.has(key)) {
                this.keys.set(key, {
                    pressed: true,
                    time: Date.now(),
                    repeat: false
                });
                
                this.emit('keydown', {
                    key: key,
                    code: e.code,
                    shift: e.shiftKey,
                    ctrl: e.ctrlKey,
                    alt: e.altKey,
                    meta: e.metaKey,
                    originalEvent: e
                });
                
                // Check for key combinations
                this.checkKeyCombos(e);
            } else {
                // Key repeat
                const keyData = this.keys.get(key);
                keyData.repeat = true;
                
                this.emit('keyrepeat', {
                    key: key,
                    code: e.code,
                    originalEvent: e
                });
            }
        };
        
        const handleKeyUp = (e) => {
            const key = this.normalizeKey(e.key);
            
            if (this.keys.has(key)) {
                const keyData = this.keys.get(key);
                const duration = Date.now() - keyData.time;
                
                this.keys.delete(key);
                
                this.emit('keyup', {
                    key: key,
                    code: e.code,
                    duration: duration,
                    originalEvent: e
                });
            }
        };
        
        this.element.addEventListener('keydown', handleKeyDown);
        this.element.addEventListener('keyup', handleKeyUp);
        
        // Store handlers for cleanup
        this.listeners.set('keydown', handleKeyDown);
        this.listeners.set('keyup', handleKeyUp);
    }
    
    /**
     * Setup mouse event handlers
     */
    setupMouseHandlers() {
        const updateMousePosition = (e) => {
            const rect = this.element === document 
                ? { left: 0, top: 0 } 
                : this.element.getBoundingClientRect();
            
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        };
        
        const handleMouseMove = (e) => {
            updateMousePosition(e);
            
            this.emit('mousemove', {
                x: this.mouse.x,
                y: this.mouse.y,
                deltaX: e.movementX,
                deltaY: e.movementY,
                originalEvent: e
            });
        };
        
        const handleMouseDown = (e) => {
            updateMousePosition(e);
            
            this.mouse.buttons.set(e.button, {
                pressed: true,
                time: Date.now(),
                x: this.mouse.x,
                y: this.mouse.y
            });
            
            this.emit('mousedown', {
                button: e.button,
                x: this.mouse.x,
                y: this.mouse.y,
                originalEvent: e
            });
        };
        
        const handleMouseUp = (e) => {
            updateMousePosition(e);
            
            if (this.mouse.buttons.has(e.button)) {
                const buttonData = this.mouse.buttons.get(e.button);
                const duration = Date.now() - buttonData.time;
                const distance = Math.sqrt(
                    Math.pow(this.mouse.x - buttonData.x, 2) + 
                    Math.pow(this.mouse.y - buttonData.y, 2)
                );
                
                this.mouse.buttons.delete(e.button);
                
                this.emit('mouseup', {
                    button: e.button,
                    x: this.mouse.x,
                    y: this.mouse.y,
                    duration: duration,
                    originalEvent: e
                });
                
                // Detect click (short duration and small movement)
                if (duration < 500 && distance < 5) {
                    this.emit('click', {
                        button: e.button,
                        x: this.mouse.x,
                        y: this.mouse.y,
                        originalEvent: e
                    });
                }
            }
        };
        
        const handleMouseEnter = (e) => {
            this.mouse.isOver = true;
            this.emit('mouseenter', { originalEvent: e });
        };
        
        const handleMouseLeave = (e) => {
            this.mouse.isOver = false;
            this.emit('mouseleave', { originalEvent: e });
        };
        
        const handleWheel = (e) => {
            this.emit('wheel', {
                deltaX: e.deltaX,
                deltaY: e.deltaY,
                deltaZ: e.deltaZ,
                originalEvent: e
            });
        };
        
        this.element.addEventListener('mousemove', handleMouseMove);
        this.element.addEventListener('mousedown', handleMouseDown);
        this.element.addEventListener('mouseup', handleMouseUp);
        this.element.addEventListener('mouseenter', handleMouseEnter);
        this.element.addEventListener('mouseleave', handleMouseLeave);
        this.element.addEventListener('wheel', handleWheel);
        
        // Store handlers for cleanup
        this.listeners.set('mousemove', handleMouseMove);
        this.listeners.set('mousedown', handleMouseDown);
        this.listeners.set('mouseup', handleMouseUp);
        this.listeners.set('mouseenter', handleMouseEnter);
        this.listeners.set('mouseleave', handleMouseLeave);
        this.listeners.set('wheel', handleWheel);
    }
    
    /**
     * Setup touch event handlers
     */
    setupTouchHandlers() {
        const handleTouchStart = (e) => {
            this.touch.isActive = true;
            
            for (let touch of e.changedTouches) {
                const rect = this.element === document 
                    ? { left: 0, top: 0 } 
                    : this.element.getBoundingClientRect();
                
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                this.touch.touches.set(touch.identifier, {
                    x: x,
                    y: y,
                    startX: x,
                    startY: y,
                    time: Date.now()
                });
                
                this.emit('touchstart', {
                    id: touch.identifier,
                    x: x,
                    y: y,
                    touches: this.touch.touches.size,
                    originalEvent: e
                });
            }
        };
        
        const handleTouchMove = (e) => {
            for (let touch of e.changedTouches) {
                if (this.touch.touches.has(touch.identifier)) {
                    const rect = this.element === document 
                        ? { left: 0, top: 0 } 
                        : this.element.getBoundingClientRect();
                    
                    const x = touch.clientX - rect.left;
                    const y = touch.clientY - rect.top;
                    const touchData = this.touch.touches.get(touch.identifier);
                    
                    const deltaX = x - touchData.x;
                    const deltaY = y - touchData.y;
                    
                    touchData.x = x;
                    touchData.y = y;
                    
                    this.emit('touchmove', {
                        id: touch.identifier,
                        x: x,
                        y: y,
                        deltaX: deltaX,
                        deltaY: deltaY,
                        touches: this.touch.touches.size,
                        originalEvent: e
                    });
                }
            }
        };
        
        const handleTouchEnd = (e) => {
            for (let touch of e.changedTouches) {
                if (this.touch.touches.has(touch.identifier)) {
                    const touchData = this.touch.touches.get(touch.identifier);
                    const duration = Date.now() - touchData.time;
                    const distance = Math.sqrt(
                        Math.pow(touchData.x - touchData.startX, 2) + 
                        Math.pow(touchData.y - touchData.startY, 2)
                    );
                    
                    this.touch.touches.delete(touch.identifier);
                    
                    this.emit('touchend', {
                        id: touch.identifier,
                        x: touchData.x,
                        y: touchData.y,
                        duration: duration,
                        touches: this.touch.touches.size,
                        originalEvent: e
                    });
                    
                    // Detect tap (short duration and small movement)
                    if (duration < 500 && distance < 10) {
                        this.emit('tap', {
                            x: touchData.x,
                            y: touchData.y,
                            originalEvent: e
                        });
                    }
                    
                    // Detect swipe
                    if (duration < 1000 && distance > 50) {
                        const angle = Math.atan2(
                            touchData.y - touchData.startY,
                            touchData.x - touchData.startX
                        );
                        
                        let direction;
                        if (Math.abs(angle) < Math.PI / 4) {
                            direction = 'right';
                        } else if (Math.abs(angle) > 3 * Math.PI / 4) {
                            direction = 'left';
                        } else if (angle > 0) {
                            direction = 'down';
                        } else {
                            direction = 'up';
                        }
                        
                        this.emit('swipe', {
                            direction: direction,
                            distance: distance,
                            duration: duration,
                            originalEvent: e
                        });
                    }
                }
            }
            
            if (this.touch.touches.size === 0) {
                this.touch.isActive = false;
            }
        };
        
        this.element.addEventListener('touchstart', handleTouchStart);
        this.element.addEventListener('touchmove', handleTouchMove);
        this.element.addEventListener('touchend', handleTouchEnd);
        
        // Store handlers for cleanup
        this.listeners.set('touchstart', handleTouchStart);
        this.listeners.set('touchmove', handleTouchMove);
        this.listeners.set('touchend', handleTouchEnd);
    }
    
    /**
     * Normalize key names
     * @param {string} key - Raw key value
     */
    normalizeKey(key) {
        const keyMap = {
            ' ': 'space',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'Enter': 'enter',
            'Escape': 'escape',
            'Tab': 'tab',
            'Backspace': 'backspace',
            'Delete': 'delete',
            'Control': 'ctrl',
            'Shift': 'shift',
            'Alt': 'alt',
            'Meta': 'meta'
        };
        
        return keyMap[key] || key.toLowerCase();
    }
    
    /**
     * Check if a key is currently pressed
     * @param {string} key - Key to check
     */
    isKeyPressed(key) {
        return this.keys.has(this.normalizeKey(key));
    }
    
    /**
     * Check if a mouse button is pressed
     * @param {number} button - Button number (0=left, 1=middle, 2=right)
     */
    isMouseButtonPressed(button) {
        return this.mouse.buttons.has(button);
    }
    
    /**
     * Get current mouse position
     */
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
    
    /**
     * Register a key combination
     * @param {string} combo - Key combination (e.g., 'ctrl+s')
     * @param {Function} callback - Callback function
     */
    registerKeyCombo(combo, callback) {
        this.keyCombos.set(combo.toLowerCase(), callback);
    }
    
    /**
     * Check for key combinations
     * @param {KeyboardEvent} e - Keyboard event
     */
    checkKeyCombos(e) {
        const key = this.normalizeKey(e.key);
        const modifiers = [];
        
        if (e.ctrlKey) modifiers.push('ctrl');
        if (e.shiftKey) modifiers.push('shift');
        if (e.altKey) modifiers.push('alt');
        if (e.metaKey) modifiers.push('meta');
        
        modifiers.push(key);
        const combo = modifiers.join('+');
        
        if (this.keyCombos.has(combo)) {
            const callback = this.keyCombos.get(combo);
            callback(e);
            e.preventDefault();
        }
    }
    
    /**
     * Event emitter functionality
     */
    eventListeners = new Map();
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        return this;
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in input event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Enable/disable input modes
     * @param {string} mode - Input mode (keyboard, mouse, touch)
     * @param {boolean} enabled - Enable or disable
     */
    setMode(mode, enabled) {
        this.modes[mode] = enabled;
        
        // Re-initialize if needed
        if (enabled) {
            if (mode === 'keyboard') this.setupKeyboardHandlers();
            if (mode === 'mouse') this.setupMouseHandlers();
            if (mode === 'touch') this.setupTouchHandlers();
        }
    }
    
    /**
     * Clean up and destroy input handler
     */
    destroy() {
        // Remove all event listeners
        this.listeners.forEach((handler, event) => {
            this.element.removeEventListener(event, handler);
        });
        
        // Clear all state
        this.keys.clear();
        this.mouse.buttons.clear();
        this.touch.touches.clear();
        this.keyCombos.clear();
        this.eventListeners.clear();
        this.listeners.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputHandler;
}
