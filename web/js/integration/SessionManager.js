/**
 * Session Manager
 * Manages session lifecycle and coordinates between frontend and backend
 */

class SessionManager {
    constructor(apiClient, scoreManager) {
        this.apiClient = apiClient;
        this.scoreManager = scoreManager;
        this.sessionId = null;
        this.studentId = null;
        this.backendAvailable = false;
        this.sessionData = null;
    }

    /**
     * Initialize - check backend availability
     */
    async initialize() {
        try {
            this.backendAvailable = await this.apiClient.isAvailable();
            console.log('Backend available:', this.backendAvailable);
            
            if (this.backendAvailable) {
                const health = await this.apiClient.healthCheck();
                console.log('Backend health:', health);
            }
        } catch (error) {
            console.warn('Backend not available, running in offline mode:', error);
            this.backendAvailable = false;
        }
    }

    /**
     * Create or resume session
     * @param {string} name - Student name
     * @param {string} existingStudentId - Existing student ID from localStorage (optional)
     */
    async createSession(name, existingStudentId = null) {
        if (!this.backendAvailable) {
            console.log('Backend unavailable, using localStorage only');
            return {
                offline: true,
                studentId: existingStudentId || this.scoreManager.getUserInfo()?.studentId
            };
        }

        try {
            // Try to initialize session with backend
            const response = await this.apiClient.initSession(name, existingStudentId);
            
            this.sessionId = response.session_id;
            this.studentId = response.student_id;
            this.sessionData = response;
            
            console.log('Session created:', {
                sessionId: this.sessionId,
                studentId: this.studentId,
                studentName: response.student_name
            });

            // Sync with localStorage
            this._syncStudentToLocalStorage(response);

            return {
                offline: false,
                sessionId: this.sessionId,
                studentId: this.studentId,
                tutorGreeting: response.tutor_greeting,
                availableActivities: response.available_activities
            };
        } catch (error) {
            console.error('Failed to create backend session:', error);
            // Fall back to localStorage
            return {
                offline: true,
                error: error.message,
                studentId: existingStudentId || this.scoreManager.getUserInfo()?.studentId
            };
        }
    }

    /**
     * End current session
     */
    async endSession() {
        if (!this.backendAvailable || !this.sessionId) {
            return;
        }

        try {
            await this.apiClient.endSession(this.sessionId);
            console.log('Session ended:', this.sessionId);
        } catch (error) {
            console.error('Failed to end session:', error);
        } finally {
            this.sessionId = null;
            this.sessionData = null;
        }
    }

    /**
     * Start an activity
     * @param {string} activityType - Type of activity
     */
    async startActivity(activityType) {
        if (!this.backendAvailable || !this.sessionId) {
            // Return default tuning for offline mode
            return this._getDefaultTuning(activityType);
        }

        try {
            const response = await this.apiClient.startActivity(this.sessionId, activityType);
            console.log('Activity started:', activityType, response);
            return response;
        } catch (error) {
            console.error('Failed to start activity:', error);
            // Fall back to default tuning
            return this._getDefaultTuning(activityType);
        }
    }

    /**
     * End an activity and record results
     * @param {string} activityType - Type of activity
     * @param {object} results - Activity results
     * @param {object} tuningSettings - Settings used
     */
    async endActivity(activityType, results, tuningSettings) {
        // Always record to localStorage
        this.scoreManager.recordScore(
            activityType,
            tuningSettings.difficulty,
            results.score,
            results.total
        );

        if (!this.backendAvailable || !this.sessionId) {
            return {
                offline: true,
                feedback: this._generateLocalFeedback(results),
                unlocked: this._checkLocalUnlocks(activityType, results, tuningSettings)
            };
        }

        try {
            const response = await this.apiClient.endActivity(
                this.sessionId,
                activityType,
                results,
                tuningSettings
            );
            
            console.log('Activity ended:', activityType, response);
            
            // Update local unlock state based on backend response
            if (response.unlocked_activities && response.unlocked_activities.length > 0) {
                response.unlocked_activities.forEach(exercise => {
                    this.scoreManager.toggleExerciseLock(exercise);
                });
            }

            return {
                offline: false,
                feedback: response.feedback,
                nextRecommendation: response.next_recommendation,
                unlocked: response.unlocked_activities
            };
        } catch (error) {
            console.error('Failed to end activity:', error);
            return {
                offline: true,
                error: error.message,
                feedback: this._generateLocalFeedback(results),
                unlocked: this._checkLocalUnlocks(activityType, results, tuningSettings)
            };
        }
    }

    /**
     * Get session info
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            studentId: this.studentId,
            backendAvailable: this.backendAvailable,
            sessionData: this.sessionData
        };
    }

    /**
     * Check if backend is connected
     */
    isBackendConnected() {
        return this.backendAvailable && this.sessionId !== null;
    }

    /**
     * Sync student data to localStorage
     */
    _syncStudentToLocalStorage(sessionData) {
        const localUser = this.scoreManager.getUserInfo();
        
        // If localStorage has different student ID, update it
        if (!localUser || localUser.studentId !== sessionData.student_id) {
            // This is a new student or different student
            // We'll keep localStorage as is for now, but note the backend ID
            console.log('Backend student ID:', sessionData.student_id);
            console.log('Local student ID:', localUser?.studentId);
        }
    }

    /**
     * Get default tuning for offline mode
     */
    _getDefaultTuning(activityType) {
        const defaults = {
            'multiple_choice': {
                activity_type: activityType,
                recommended_tuning: { difficulty: '3', num_questions: 10, num_choices: 4 },
                agent_intro: "Let's try multiple choice!",
                vocabulary_focus: null
            },
            'fill_in_the_blank': {
                activity_type: activityType,
                recommended_tuning: { difficulty: 'easy', num_questions: 10 },
                agent_intro: "Let's practice fill in the blank!",
                vocabulary_focus: null
            },
            'spelling': {
                activity_type: activityType,
                recommended_tuning: { difficulty: 'easy', num_questions: 10 },
                agent_intro: "Let's practice spelling!",
                vocabulary_focus: null
            },
            'bubble_pop': {
                activity_type: activityType,
                recommended_tuning: { difficulty: 'easy', bubble_speed: 1.0, error_rate: 0.2 },
                agent_intro: "Let's play Bubble Pop!",
                vocabulary_focus: null
            },
            'fluent_reading': {
                activity_type: activityType,
                recommended_tuning: { target_speed: 100 },
                agent_intro: "Let's practice reading!",
                vocabulary_focus: null
            }
        };

        return defaults[activityType] || {
            activity_type: activityType,
            recommended_tuning: { difficulty: 'medium' },
            agent_intro: "Let's begin!",
            vocabulary_focus: null
        };
    }

    /**
     * Generate local feedback
     */
    _generateLocalFeedback(results) {
        const percentage = (results.score / results.total * 100);
        
        if (percentage >= 90) {
            return "Excellent work! You're doing great!";
        } else if (percentage >= 80) {
            return "Great job! Keep up the good work!";
        } else if (percentage >= 70) {
            return "Good effort! You're making progress!";
        } else if (percentage >= 60) {
            return "Nice try! Keep practicing!";
        } else {
            return "Keep practicing! You'll get better!";
        }
    }

    /**
     * Check local unlocks
     */
    _checkLocalUnlocks(activityType, results, tuningSettings) {
        const percentage = (results.score / results.total * 100);
        const unlocked = [];

        // Check if should unlock next exercise
        if (percentage >= 80) {
            const isHard = this._isHardDifficulty(activityType, tuningSettings.difficulty);
            if (isHard) {
                const nextExercise = this._getNextExercise(activityType);
                if (nextExercise && !this.scoreManager.isExerciseUnlocked(nextExercise)) {
                    this.scoreManager.toggleExerciseLock(nextExercise);
                    unlocked.push(nextExercise);
                }
            }
        }

        return unlocked;
    }

    /**
     * Check if difficulty is "hard"
     */
    _isHardDifficulty(activityType, difficulty) {
        if (activityType === 'multiple_choice') {
            return difficulty === '5';
        } else if (activityType === 'fill_in_the_blank') {
            return difficulty === 'moderate';
        } else {
            return difficulty === 'hard';
        }
    }

    /**
     * Get next exercise in sequence
     */
    _getNextExercise(currentActivity) {
        const sequence = [
            'multiple_choice',
            'fill_in_the_blank',
            'spelling',
            'bubble_pop',
            'fluent_reading'
        ];
        
        const currentIndex = sequence.indexOf(currentActivity);
        if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
            return sequence[currentIndex + 1];
        }
        return null;
    }
}

// Export for use in other modules
window.SessionManager = SessionManager;
