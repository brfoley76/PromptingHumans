/**
 * @fileoverview Centralized error handling utility
 * @module ErrorHandler
 */

/**
 * Centralized error handler for consistent error management
 * @class ErrorHandler
 */
class ErrorHandler {
    /**
     * Creates an instance of ErrorHandler
     */
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.listeners = [];
        
        // Setup global error handlers
        this.setupGlobalHandlers();
    }
    
    /**
     * Setup global error handlers
     * @private
     */
    setupGlobalHandlers() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'uncaught',
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'unhandled_promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                error: event.reason
            });
        });
    }
    
    /**
     * Handle an error
     * @param {Object|Error} error - Error to handle
     * @param {string} [context] - Context where error occurred
     * @param {string} [severity='error'] - Error severity (error, warning, info)
     * @returns {Object} Processed error object
     */
    handleError(error, context = '', severity = 'error') {
        const errorObj = this.normalizeError(error, context, severity);
        
        // Log to console based on severity
        switch (severity) {
            case 'warning':
                console.warn(`[${context}]`, errorObj.message, errorObj);
                break;
            case 'info':
                console.info(`[${context}]`, errorObj.message, errorObj);
                break;
            default:
                console.error(`[${context}]`, errorObj.message, errorObj);
        }
        
        // Add to error log
        this.logError(errorObj);
        
        // Notify listeners
        this.notifyListeners(errorObj);
        
        // Show user notification if appropriate
        if (severity === 'error' && !errorObj.silent) {
            this.showUserNotification(errorObj);
        }
        
        return errorObj;
    }
    
    /**
     * Normalize error into consistent format
     * @private
     * @param {Object|Error|string} error - Error to normalize
     * @param {string} context - Context where error occurred
     * @param {string} severity - Error severity
     * @returns {Object} Normalized error object
     */
    normalizeError(error, context, severity) {
        const timestamp = Date.now();
        
        if (error instanceof Error) {
            return {
                timestamp,
                context,
                severity,
                message: error.message,
                stack: error.stack,
                name: error.name,
                silent: false
            };
        }
        
        if (typeof error === 'string') {
            return {
                timestamp,
                context,
                severity,
                message: error,
                stack: new Error().stack,
                name: 'Error',
                silent: false
            };
        }
        
        // Assume it's an object with error properties
        return {
            timestamp,
            context,
            severity,
            message: error.message || 'Unknown error',
            stack: error.stack || new Error().stack,
            name: error.name || 'Error',
            type: error.type,
            source: error.source,
            line: error.line,
            column: error.column,
            silent: error.silent || false,
            ...error
        };
    }
    
    /**
     * Log error to internal log
     * @private
     * @param {Object} errorObj - Error object to log
     */
    logError(errorObj) {
        this.errorLog.push(errorObj);
        
        // Trim log if it exceeds max size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }
        
        // Store in localStorage for debugging
        try {
            localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
        } catch (e) {
            // Ignore localStorage errors
        }
    }
    
    /**
     * Show user notification for error
     * @private
     * @param {Object} errorObj - Error object
     */
    showUserNotification(errorObj) {
        const message = this.getUserFriendlyMessage(errorObj);
        
        // Check if a notification element exists
        let notification = document.getElementById('error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f44336;
                color: white;
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 10000;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Get user-friendly error message
     * @private
     * @param {Object} errorObj - Error object
     * @returns {string} User-friendly message
     */
    getUserFriendlyMessage(errorObj) {
        const contextMessages = {
            'network': 'Network error. Please check your connection.',
            'validation': 'Please check your input and try again.',
            'exercise': 'An error occurred in the exercise. Please try again.',
            'save': 'Failed to save. Please try again.',
            'load': 'Failed to load data. Please refresh the page.'
        };
        
        // Check for specific context messages
        for (const [key, message] of Object.entries(contextMessages)) {
            if (errorObj.context?.toLowerCase().includes(key)) {
                return message;
            }
        }
        
        // Check for specific error types
        if (errorObj.message?.includes('network') || errorObj.message?.includes('fetch')) {
            return contextMessages.network;
        }
        
        // Default message
        return 'An error occurred. Please try again.';
    }
    
    /**
     * Add error listener
     * @param {Function} callback - Callback function
     */
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * Remove error listener
     * @param {Function} callback - Callback function
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * Notify all listeners of error
     * @private
     * @param {Object} errorObj - Error object
     */
    notifyListeners(errorObj) {
        this.listeners.forEach(callback => {
            try {
                callback(errorObj);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        });
    }
    
    /**
     * Try to execute a function with error handling
     * @param {Function} fn - Function to execute
     * @param {string} [context] - Context for error reporting
     * @param {*} [defaultValue] - Default value to return on error
     * @returns {*} Function result or default value
     */
    tryExecute(fn, context = '', defaultValue = null) {
        try {
            return fn();
        } catch (error) {
            this.handleError(error, context);
            return defaultValue;
        }
    }
    
    /**
     * Try to execute async function with error handling
     * @param {Function} fn - Async function to execute
     * @param {string} [context] - Context for error reporting
     * @param {*} [defaultValue] - Default value to return on error
     * @returns {Promise<*>} Function result or default value
     */
    async tryExecuteAsync(fn, context = '', defaultValue = null) {
        try {
            return await fn();
        } catch (error) {
            this.handleError(error, context);
            return defaultValue;
        }
    }
    
    /**
     * Get error log
     * @returns {Array} Error log
     */
    getErrorLog() {
        return [...this.errorLog];
    }
    
    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        try {
            localStorage.removeItem('errorLog');
        } catch (e) {
            // Ignore localStorage errors
        }
    }
    
    /**
     * Get errors by context
     * @param {string} context - Context to filter by
     * @returns {Array} Filtered errors
     */
    getErrorsByContext(context) {
        return this.errorLog.filter(error => 
            error.context?.toLowerCase().includes(context.toLowerCase())
        );
    }
    
    /**
     * Get errors by severity
     * @param {string} severity - Severity to filter by
     * @returns {Array} Filtered errors
     */
    getErrorsBySeverity(severity) {
        return this.errorLog.filter(error => error.severity === severity);
    }
    
    /**
     * Export error log as JSON
     * @returns {string} JSON string of error log
     */
    exportErrorLog() {
        return JSON.stringify(this.errorLog, null, 2);
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = errorHandler;
} else {
    window.ErrorHandler = errorHandler;
}
