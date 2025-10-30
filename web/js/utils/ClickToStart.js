/**
 * ClickToStart.js
 * Reusable overlay component for "click to start" functionality
 */

class ClickToStartOverlay {
    /**
     * Show the click-to-start overlay
     * @param {Function} onClickCallback - Function to call when user clicks
     * @param {string} message - Optional custom message (default: "Click anywhere to start")
     */
    static show(onClickCallback, message = "Click anywhere to start") {
        // Remove any existing overlay first
        this.hide();
        
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.id = 'clickToStartOverlay';
        overlay.className = 'click-to-start-overlay';
        
        // Create message container
        const messageContainer = document.createElement('div');
        messageContainer.className = 'click-to-start-message';
        messageContainer.innerHTML = `
            <div class="click-icon">👆</div>
            <div class="click-text">${message}</div>
        `;
        
        overlay.appendChild(messageContainer);
        
        // Add click handler
        overlay.addEventListener('click', () => {
            this.hide();
            if (onClickCallback) {
                onClickCallback();
            }
        });
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Fade in animation
        setTimeout(() => {
            overlay.classList.add('visible');
        }, 10);
    }
    
    /**
     * Hide and remove the overlay
     */
    static hide() {
        const overlay = document.getElementById('clickToStartOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
            }, 300); // Match CSS transition time
        }
    }
    
    /**
     * Check if overlay is currently visible
     * @returns {boolean}
     */
    static isVisible() {
        return document.getElementById('clickToStartOverlay') !== null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClickToStartOverlay;
}
