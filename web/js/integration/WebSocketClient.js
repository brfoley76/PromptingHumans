/**
 * WebSocket Client for Real-time Chat Communication
 * Handles bidirectional messaging with the backend agent
 */

class WebSocketClient {
    constructor(baseURL = 'ws://localhost:8000') {
        this.baseURL = baseURL;
        this.ws = null;
        this.sessionId = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.messageHandlers = [];
    }

    /**
     * Connect to WebSocket server
     * @param {string} sessionId - Session ID for this connection
     */
    connect(sessionId) {
        if (this.connected) {
            console.log('WebSocket already connected');
            return;
        }

        this.sessionId = sessionId;
        const wsURL = `${this.baseURL}/ws/${sessionId}`;
        
        console.log('Connecting to WebSocket:', wsURL);

        try {
            this.ws = new WebSocket(wsURL);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.notifyHandlers({
                    type: 'connection',
                    status: 'connected'
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📨 WebSocket message received:', message);
                    this.notifyHandlers(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.notifyHandlers({
                    type: 'error',
                    error: 'WebSocket connection error'
                });
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.connected = false;
                this.notifyHandlers({
                    type: 'connection',
                    status: 'disconnected'
                });
                
                // Attempt to reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    setTimeout(() => {
                        this.connect(this.sessionId);
                    }, 2000 * this.reconnectAttempts);
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.notifyHandlers({
                type: 'error',
                error: 'Failed to create WebSocket connection'
            });
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
            this.sessionId = null;
        }
    }

    /**
     * Send a chat message
     * @param {string} message - Message text
     */
    sendChatMessage(message) {
        this.send({
            type: 'chat',
            sender: 'student',
            message: message
        });
    }

    /**
     * Send activity start event
     * @param {string} activity - Activity type
     * @param {string} difficulty - Difficulty level
     */
    sendActivityStart(activity, difficulty) {
        this.send({
            type: 'activity_start',
            activity: activity,
            difficulty: difficulty
        });
    }

    /**
     * Send activity end event
     * @param {number} score - Final score
     * @param {number} total - Total possible score
     */
    sendActivityEnd(score, total) {
        this.send({
            type: 'activity_end',
            score: score,
            total: total
        });
    }

    /**
     * Send activity-specific chat message
     * @param {string} message - Message text
     */
    sendActivityChat(message) {
        this.send({
            type: 'activity_chat',
            message: message
        });
    }

    /**
     * Send activity event (wrong answer, correct answer, etc.)
     * @param {string} event - Event type
     * @param {object} context - Event context
     */
    sendActivityEvent(event, context) {
        console.log(`[BREADCRUMB][WEBSOCKET] Sending activity_event: ${event}`);
        this.send({
            type: 'activity_event',
            event: event,
            context: context
        });
    }

    /**
     * Send a game event (legacy)
     * @param {string} event - Event type (e.g., 'wrong_answer')
     * @param {object} context - Event context
     */
    sendGameEvent(event, context) {
        this.send({
            type: 'game_event',
            event: event,
            context: context
        });
    }

    /**
     * Request a hint (legacy)
     * @param {object} context - Context for the hint request
     */
    requestHint(context) {
        this.send({
            type: 'hint_request',
            context: context
        });
    }

    /**
     * Send a message to the server
     * @param {object} data - Message data
     */
    send(data) {
        if (!this.connected || !this.ws) {
            console.warn('WebSocket not connected, cannot send message');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));
            console.log('📤 WebSocket message sent:', data);
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    /**
     * Add a message handler
     * @param {function} handler - Function to handle incoming messages
     */
    addMessageHandler(handler) {
        this.messageHandlers.push(handler);
    }

    /**
     * Remove a message handler
     * @param {function} handler - Handler to remove
     */
    removeMessageHandler(handler) {
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
            this.messageHandlers.splice(index, 1);
        }
    }

    /**
     * Notify all message handlers
     * @param {object} message - Message to send to handlers
     */
    notifyHandlers(message) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('Error in message handler:', error);
            }
        });
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
}

// Export for use in other modules
window.WebSocketClient = WebSocketClient;
