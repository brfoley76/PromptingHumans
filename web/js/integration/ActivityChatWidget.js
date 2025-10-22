/**
 * Activity Chat Widget
 * Separate chat widget for activity-specific helper agents
 * Scoped to a single activity attempt
 */

class ActivityChatWidget {
    constructor(webSocketClient) {
        this.wsClient = webSocketClient;
        this.container = null;
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.isMinimized = false;
        this.isVisible = false;
        this.currentActivity = null;
        this.currentDifficulty = null;
        
        // Bind message handler
        this.messageHandler = this.handleMessage.bind(this);
    }

    /**
     * Initialize the activity chat widget
     */
    initialize() {
        this.createWidget();
        this.setupEventListeners();
        
        // Add WebSocket message handler
        if (this.wsClient) {
            this.wsClient.addMessageHandler(this.messageHandler);
        }
    }

    /**
     * Create the activity chat widget HTML
     */
    createWidget() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'activityChatWidget';
        this.container.className = 'activity-chat-widget';
        this.container.style.display = 'none'; // Hidden by default
        
        this.container.innerHTML = `
            <div class="activity-chat-header">
                <div class="activity-chat-title">
                    <span class="activity-chat-icon">🎯</span>
                    <span class="activity-chat-title-text">Activity Helper</span>
                    <span class="activity-chat-status" id="activityChatStatus">●</span>
                </div>
                <div class="activity-chat-controls">
                    <button class="activity-chat-btn" id="activityChatMinimizeBtn" title="Minimize">_</button>
                    <button class="activity-chat-btn" id="activityChatCloseBtn" title="Close">×</button>
                </div>
            </div>
            <div class="activity-chat-body">
                <div class="activity-chat-messages" id="activityChatMessages">
                    <!-- Messages will be added here dynamically -->
                </div>
                <div class="activity-chat-input-container">
                    <input type="text" 
                           id="activityChatInput" 
                           class="activity-chat-input" 
                           placeholder="Ask for help..."
                           autocomplete="off">
                    <button id="activityChatSendBtn" class="activity-chat-send-btn">Send</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // Store references
        this.messagesContainer = document.getElementById('activityChatMessages');
        this.inputField = document.getElementById('activityChatInput');
        this.sendButton = document.getElementById('activityChatSendBtn');
        this.statusIndicator = document.getElementById('activityChatStatus');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Minimize button
        document.getElementById('activityChatMinimizeBtn').addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        // Close button
        document.getElementById('activityChatCloseBtn').addEventListener('click', () => {
            this.hide();
        });
        
        // Send button
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key to send
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    /**
     * Start activity session
     * @param {string} activityType - Type of activity
     * @param {string} difficulty - Difficulty level
     */
    startActivity(activityType, difficulty) {
        this.currentActivity = activityType;
        this.currentDifficulty = difficulty;
        this.clearMessages();
        
        // Hide main chat widget
        const mainChatWidget = document.getElementById('chatWidget');
        if (mainChatWidget) {
            mainChatWidget.style.display = 'none';
        }
        
        this.show();
        
        // Send activity start event to backend
        if (this.wsClient && this.wsClient.isConnected()) {
            this.wsClient.send({
                type: 'activity_start',
                activity: activityType,
                difficulty: difficulty
            });
        }
        
        console.log(`Activity chat started: ${activityType} (${difficulty})`);
    }

    /**
     * End activity session
     */
    endActivity() {
        this.currentActivity = null;
        this.currentDifficulty = null;
        this.hide();
        
        // Show main chat widget again
        const mainChatWidget = document.getElementById('chatWidget');
        if (mainChatWidget) {
            mainChatWidget.style.display = 'flex';
        }
        
        console.log('Activity chat ended');
    }

    /**
     * Send an activity event to the agent
     * @param {string} eventType - Type of event (e.g., 'wrong_answer', 'hint_request')
     * @param {object} context - Event context
     */
    sendActivityEvent(eventType, context) {
        if (!this.wsClient || !this.wsClient.isConnected()) {
            console.warn('WebSocket not connected, cannot send activity event');
            return;
        }

        this.wsClient.send({
            type: 'activity_event',
            activity: this.currentActivity,
            difficulty: this.currentDifficulty,
            event: eventType,
            context: context
        });
    }

    /**
     * Show the chat widget
     */
    show() {
        this.container.style.display = 'flex';
        this.isVisible = true;
        this.scrollToBottom();
    }

    /**
     * Hide the chat widget
     */
    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * Toggle minimize state
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.container.classList.add('minimized');
        } else {
            this.container.classList.remove('minimized');
            this.scrollToBottom();
        }
    }

    /**
     * Send a message
     */
    sendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;
        
        // Add user message to chat
        this.addMessage('student', message);
        
        // Clear input
        this.inputField.value = '';
        
        // Send via WebSocket if connected
        if (this.wsClient && this.wsClient.isConnected()) {
            this.wsClient.send({
                type: 'activity_chat',
                activity: this.currentActivity,
                difficulty: this.currentDifficulty,
                sender: 'student',
                message: message
            });
        } else {
            // Show offline message
            setTimeout(() => {
                this.addMessage('agent', "I'm currently offline. Please make sure the backend is running!");
            }, 500);
        }
    }

    /**
     * Add a message to the chat
     * @param {string} sender - 'student' or 'agent'
     * @param {string} message - Message text
     */
    addMessage(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `activity-chat-message ${sender}-message`;
        
        const senderName = sender === 'student' ? 'You' : 'Helper';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>${senderName}:</strong> ${this.escapeHtml(message)}
            </div>
            <div class="message-time">${this.getCurrentTime()}</div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Handle incoming WebSocket messages
     * @param {object} message - WebSocket message
     */
    handleMessage(message) {
        // Only handle messages relevant to activity chat
        if (message.type === 'activity_chat' && message.sender === 'agent') {
            this.addMessage('agent', message.message);
        } else if (message.type === 'activity_hint') {
            this.addMessage('agent', `💡 ${message.hint}`);
        } else if (message.type === 'activity_feedback') {
            this.addMessage('agent', message.feedback);
        } else if (message.type === 'connection') {
            this.updateConnectionStatus(message.status);
        }
    }

    /**
     * Update connection status indicator
     * @param {string} status - 'connected' or 'disconnected'
     */
    updateConnectionStatus(status) {
        if (status === 'connected') {
            this.statusIndicator.style.color = '#28a745';
            this.statusIndicator.title = 'Connected';
        } else {
            this.statusIndicator.style.color = '#dc3545';
            this.statusIndicator.title = 'Disconnected';
        }
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    /**
     * Get current time formatted
     */
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messagesContainer.innerHTML = '';
    }

    /**
     * Destroy the widget
     */
    destroy() {
        if (this.wsClient) {
            this.wsClient.removeMessageHandler(this.messageHandler);
        }
        if (this.container) {
            this.container.remove();
        }
    }
}

// Export for use in other modules
window.ActivityChatWidget = ActivityChatWidget;
