/**
 * API Client for Backend Communication
 * Handles all REST API calls to the agentic platform backend
 */

class APIClient {
    constructor(baseURL = 'http://localhost:8000') {
        this.baseURL = baseURL;
    }

    /**
     * Make a fetch request with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ 
                    detail: `HTTP ${response.status}: ${response.statusText}` 
                }));
                throw new Error(error.detail || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        return this.request('/health');
    }

    /**
     * Initialize a new session
     * @param {string} name - Student name (for new student)
     * @param {string} studentId - Existing student ID (optional)
     * @param {string} moduleId - Curriculum module ID (default: r003.1)
     */
    async initSession(name = null, studentId = null, moduleId = 'r003.1') {
        return this.request('/api/session/init', {
            method: 'POST',
            body: JSON.stringify({
                name,
                student_id: studentId,
                module_id: moduleId
            })
        });
    }

    /**
     * End a session
     * @param {string} sessionId - Session ID
     */
    async endSession(sessionId) {
        return this.request('/api/session/end', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId
            })
        });
    }

    /**
     * Start an activity
     * @param {string} sessionId - Session ID
     * @param {string} activityType - Type of activity
     */
    async startActivity(sessionId, activityType) {
        return this.request('/api/activity/start', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                activity_type: activityType
            })
        });
    }

    /**
     * End an activity
     * @param {string} sessionId - Session ID
     * @param {string} activityType - Type of activity
     * @param {object} results - Activity results
     * @param {object} tuningSettings - Settings used for the activity
     */
    async endActivity(sessionId, activityType, results, tuningSettings) {
        return this.request('/api/activity/end', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                activity_type: activityType,
                results,
                tuning_settings: tuningSettings
            })
        });
    }

    /**
     * Check if backend is available
     */
    async isAvailable() {
        try {
            await this.healthCheck();
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export for use in other modules
window.APIClient = APIClient;
