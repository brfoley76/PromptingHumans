/**
 * Chat Widget for Main Page
 * Provides interface for chatting with the AI tutor
 */

class ChatWidget {
    constructor(webSocketClient) {
        this.wsClient = webSocketClient;
        this.container = null;
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.isMinimized = false;
        this.isVisible = false;
        
        // Bind message handler
        this.messageHandler = this.handleMessage.bind(this);
    }

    /**
     * Initialize the chat widget
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
     * Create the chat widget HTML
     */
    createWidget() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'chatWidget';
        this.container.className = 'chat-widget';
        this.container.style.display = 'none'; // Hidden by default
        
        this.container.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <span class="chat-icon">🏴‍☠️</span>
                    <span class="chat-title-text">Pirate Tutor</span>
                    <span class="chat-status" id="chatStatus">●</span>
                </div>
                <div class="chat-controls">
                    <button class="chat-btn" id="chatMinimizeBtn" title="Minimize">_</button>
                    <button class="chat-btn" id="chatCloseBtn" title="Close">×</button>
                </div>
            </div>
            <div class="chat-body">
                <div class="chat-messages" id="chatMessages">
                    <!-- Messages will be added here dynamically -->
                </div>
                <div class="chat-input-container">
                    <input type="text" 
                           id="chatInput" 
                           class="chat-input" 
                           placeholder="Type your message..."
                           autocomplete="off">
                    <button id="chatSendBtn" class="chat-send-btn">Send</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // Store references
        this.messagesContainer = document.getElementById('chatMessages');
        this.inputField = document.getElementById('chatInput');
        this.sendButton = document.getElementById('chatSendBtn');
        this.statusIndicator = document.getElementById('chatStatus');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Minimize button
        document.getElementById('chatMinimizeBtn').addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        // Close button
        document.getElementById('chatCloseBtn').addEventListener('click', () => {
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
        
        // Auto-resize input
        this.inputField.addEventListener('input', () => {
            this.inputField.style.height = 'auto';
            this.inputField.style.height = this.inputField.scrollHeight + 'px';
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
        this.inputField.style.height = 'auto';
        
        // Send via WebSocket if connected
        if (this.wsClient && this.wsClient.isConnected()) {
            this.wsClient.sendChatMessage(message);
        } else {
            // Show offline message
            setTimeout(() => {
                this.addMessage('agent', "I'm currently offline. Please make sure the backend is running to chat with me!");
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
        messageDiv.className = `chat-message ${sender}-message`;
        
        const senderName = sender === 'student' ? 'You' : 'Pirate Tutor';
        
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
        if (message.type === 'chat' && message.sender === 'agent') {
            this.addMessage('agent', message.message);
        } else if (message.type === 'hint') {
            this.addMessage('agent', `💡 Hint: ${message.hint}`);
        } else if (message.type === 'connection') {
            this.updateConnectionStatus(message.status);
        } else if (message.type === 'error') {
            this.addMessage('agent', `⚠️ Error: ${message.error || 'Connection error'}`);
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
     * Display tutor greeting
     * @param {string} greeting - Greeting message from backend
     */
    displayGreeting(greeting) {
        if (greeting) {
            this.addMessage('agent', greeting);
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
window.ChatWidget = ChatWidget;
