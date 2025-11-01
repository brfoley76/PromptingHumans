/**
 * @fileoverview Input validation utilities for the learning module
 * Provides validation functions for user inputs before API calls
 * @module InputValidator
 */

/**
 * Input validation utility class
 * Validates user inputs to ensure data integrity and security
 */
class InputValidator {
    /**
     * Validate username format
     * @param {string} username - Username to validate
     * @returns {Object} Validation result with isValid and error message
     */
    static validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return {
                isValid: false,
                error: 'Username is required'
            };
        }

        const trimmed = username.trim();

        if (trimmed.length === 0) {
            return {
                isValid: false,
                error: 'Username cannot be empty'
            };
        }

        if (trimmed.length < 3) {
            return {
                isValid: false,
                error: 'Username must be at least 3 characters long'
            };
        }

        if (trimmed.length > 50) {
            return {
                isValid: false,
                error: 'Username must be less than 50 characters'
            };
        }

        // Only alphanumeric characters allowed
        if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
            return {
                isValid: false,
                error: 'Username must contain only letters and numbers'
            };
        }

        return {
            isValid: true,
            value: trimmed
        };
    }

    /**
     * Validate session ID format
     * @param {string} sessionId - Session ID to validate
     * @returns {Object} Validation result
     */
    static validateSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            return {
                isValid: false,
                error: 'Session ID is required'
            };
        }

        // UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sessionId)) {
            return {
                isValid: false,
                error: 'Invalid session ID format'
            };
        }

        return {
            isValid: true,
            value: sessionId
        };
    }

    /**
     * Validate activity type
     * @param {string} activityType - Activity type to validate
     * @returns {Object} Validation result
     */
    static validateActivityType(activityType) {
        const validTypes = [
            'multiple_choice',
            'fill_in_the_blank',
            'spelling',
            'bubble_pop',
            'fluent_reading'
        ];

        if (!activityType || typeof activityType !== 'string') {
            return {
                isValid: false,
                error: 'Activity type is required'
            };
        }

        if (!validTypes.includes(activityType)) {
            return {
                isValid: false,
                error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}`
            };
        }

        return {
            isValid: true,
            value: activityType
        };
    }

    /**
     * Validate score data
     * @param {number} score - Score achieved
     * @param {number} total - Total possible score
     * @returns {Object} Validation result
     */
    static validateScore(score, total) {
        if (typeof score !== 'number' || typeof total !== 'number') {
            return {
                isValid: false,
                error: 'Score and total must be numbers'
            };
        }

        if (score < 0 || total < 0) {
            return {
                isValid: false,
                error: 'Score and total must be non-negative'
            };
        }

        if (score > total) {
            return {
                isValid: false,
                error: 'Score cannot exceed total'
            };
        }

        if (!Number.isInteger(score) || !Number.isInteger(total)) {
            return {
                isValid: false,
                error: 'Score and total must be integers'
            };
        }

        return {
            isValid: true,
            value: { score, total }
        };
    }

    /**
     * Validate difficulty level
     * @param {string} difficulty - Difficulty level
     * @param {string} activityType - Activity type for context
     * @returns {Object} Validation result
     */
    static validateDifficulty(difficulty, activityType) {
        if (!difficulty || typeof difficulty !== 'string') {
            return {
                isValid: false,
                error: 'Difficulty is required'
            };
        }

        const validDifficulties = {
            'multiple_choice': ['3', '4', '5'],
            'fill_in_the_blank': ['easy', 'moderate'],
            'spelling': ['easy', 'medium', 'hard'],
            'bubble_pop': ['easy', 'moderate', 'hard'],
            'fluent_reading': ['easy', 'moderate', 'hard']
        };

        const valid = validDifficulties[activityType] || ['easy', 'medium', 'hard'];

        if (!valid.includes(difficulty)) {
            return {
                isValid: false,
                error: `Invalid difficulty for ${activityType}. Must be one of: ${valid.join(', ')}`
            };
        }

        return {
            isValid: true,
            value: difficulty
        };
    }

    /**
     * Validate module ID
     * @param {string} moduleId - Module ID to validate
     * @returns {Object} Validation result
     */
    static validateModuleId(moduleId) {
        if (!moduleId || typeof moduleId !== 'string') {
            return {
                isValid: false,
                error: 'Module ID is required'
            };
        }

        const trimmed = moduleId.trim();

        if (trimmed.length === 0) {
            return {
                isValid: false,
                error: 'Module ID cannot be empty'
            };
        }

        // Module ID format: alphanumeric with dots and underscores
        if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
            return {
                isValid: false,
                error: 'Module ID contains invalid characters'
            };
        }

        return {
            isValid: true,
            value: trimmed
        };
    }

    /**
     * Validate chat message
     * @param {string} message - Chat message to validate
     * @returns {Object} Validation result
     */
    static validateChatMessage(message) {
        if (!message || typeof message !== 'string') {
            return {
                isValid: false,
                error: 'Message is required'
            };
        }

        const trimmed = message.trim();

        if (trimmed.length === 0) {
            return {
                isValid: false,
                error: 'Message cannot be empty'
            };
        }

        if (trimmed.length > 1000) {
            return {
                isValid: false,
                error: 'Message must be less than 1000 characters'
            };
        }

        return {
            isValid: true,
            value: trimmed
        };
    }

    /**
     * Validate tuning settings object
     * @param {Object} settings - Tuning settings to validate
     * @param {string} activityType - Activity type for context
     * @returns {Object} Validation result
     */
    static validateTuningSettings(settings, activityType) {
        if (!settings || typeof settings !== 'object') {
            return {
                isValid: false,
                error: 'Tuning settings must be an object'
            };
        }

        // Validate difficulty if present
        if (settings.difficulty) {
            const difficultyValidation = this.validateDifficulty(settings.difficulty, activityType);
            if (!difficultyValidation.isValid) {
                return difficultyValidation;
            }
        }

        // Validate numeric settings
        const numericFields = ['num_questions', 'num_choices', 'bubble_speed', 'error_rate', 'target_speed'];
        for (const field of numericFields) {
            if (settings[field] !== undefined) {
                if (typeof settings[field] !== 'number' || settings[field] < 0) {
                    return {
                        isValid: false,
                        error: `${field} must be a non-negative number`
                    };
                }
            }
        }

        return {
            isValid: true,
            value: settings
        };
    }

    /**
     * Validate results object
     * @param {Object} results - Results object to validate
     * @returns {Object} Validation result
     */
    static validateResults(results) {
        if (!results || typeof results !== 'object') {
            return {
                isValid: false,
                error: 'Results must be an object'
            };
        }

        // Validate score and total
        if (results.score === undefined || results.total === undefined) {
            return {
                isValid: false,
                error: 'Results must include score and total'
            };
        }

        const scoreValidation = this.validateScore(results.score, results.total);
        if (!scoreValidation.isValid) {
            return scoreValidation;
        }

        // Validate item_results if present
        if (results.item_results !== undefined) {
            if (!Array.isArray(results.item_results)) {
                return {
                    isValid: false,
                    error: 'item_results must be an array'
                };
            }
        }

        return {
            isValid: true,
            value: results
        };
    }

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML
     */
    static sanitizeHtml(html) {
        if (typeof html !== 'string') {
            return '';
        }

        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Validate and sanitize user input for display
     * @param {string} input - User input to validate
     * @returns {Object} Validation result with sanitized value
     */
    static validateAndSanitizeInput(input) {
        if (!input || typeof input !== 'string') {
            return {
                isValid: false,
                error: 'Input is required'
            };
        }

        const trimmed = input.trim();

        if (trimmed.length === 0) {
            return {
                isValid: false,
                error: 'Input cannot be empty'
            };
        }

        return {
            isValid: true,
            value: this.sanitizeHtml(trimmed)
        };
    }

    /**
     * Validate all session init parameters
     * @param {Object} params - Parameters to validate
     * @returns {Object} Validation result
     */
    static validateSessionInitParams(params) {
        const usernameValidation = this.validateUsername(params.username);
        if (!usernameValidation.isValid) {
            return usernameValidation;
        }

        const moduleValidation = this.validateModuleId(params.module_id || 'r003.1');
        if (!moduleValidation.isValid) {
            return moduleValidation;
        }

        return {
            isValid: true,
            value: {
                username: usernameValidation.value,
                module_id: moduleValidation.value
            }
        };
    }

    /**
     * Validate all activity end parameters
     * @param {Object} params - Parameters to validate
     * @returns {Object} Validation result
     */
    static validateActivityEndParams(params) {
        const sessionValidation = this.validateSessionId(params.session_id);
        if (!sessionValidation.isValid) {
            return sessionValidation;
        }

        const activityValidation = this.validateActivityType(params.activity_type);
        if (!activityValidation.isValid) {
            return activityValidation;
        }

        const resultsValidation = this.validateResults(params.results);
        if (!resultsValidation.isValid) {
            return resultsValidation;
        }

        const tuningValidation = this.validateTuningSettings(
            params.tuning_settings,
            params.activity_type
        );
        if (!tuningValidation.isValid) {
            return tuningValidation;
        }

        return {
            isValid: true,
            value: {
                session_id: sessionValidation.value,
                activity_type: activityValidation.value,
                results: resultsValidation.value,
                tuning_settings: tuningValidation.value
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputValidator;
}
