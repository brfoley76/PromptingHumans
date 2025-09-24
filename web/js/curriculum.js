/**
 * Curriculum Module - Handles loading and managing curriculum data
 */

class CurriculumManager {
    constructor() {
        this.curriculumData = null;
        this.vocabulary = [];
    }

    /**
     * Capitalize the first letter of a string
     */
    capitalizeFirst(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Load curriculum data from JSON file
     */
    async loadCurriculum() {
        try {
            const response = await fetch('data/r003.1.json');
            if (!response.ok) {
                throw new Error('Failed to load curriculum data');
            }
            this.curriculumData = await response.json();
            this.vocabulary = this.curriculumData.content.vocabulary;
            return true;
        } catch (error) {
            console.error('Error loading curriculum:', error);
            // Fallback to embedded data if fetch fails (for local file access)
            this.loadEmbeddedCurriculum();
            return true;
        }
    }

    /**
     * Fallback embedded curriculum data for when fetch doesn't work
     */
    loadEmbeddedCurriculum() {
        this.curriculumData = {
            "content": {
                "vocabulary": [
                    {"word": "pirate", "definition": "a person who steals from ships at sea", "fitb": "A {blank} is "},
                    {"word": "parrot", "definition": "a brightly colored bird that can sometimes speak", "fitb": "A {blank} is "},
                    {"word": "ship", "definition": "a large wooden boat, with masts and sails. Used by pirates.", "fitb": "A {blank} is "},
                    {"word": "shape", "definition": "you can either be in good-- or bad--. Good-- is sometimes called ship--", "fitb": "A {blank} is something "},
                    {"word": "grog", "definition": "a strong drink a young pirate should definitely not taste, in case they get sick.", "fitb": "{blank} is "},
                    {"word": "key", "definition": "something you need to open a lock. One might open a door, or a treasure chest.", "fitb": "A {blank} is "},
                    {"word": "door", "definition": "something you can knock on. What is behind a locked one?", "fitb": "A {blank} is "},
                    {"word": "chest", "definition": "a large box that you can lock", "fitb": "A {blank} is "},
                    {"word": "monkey", "definition": "an animal that can climb easily, and make a big mess", "fitb": "A {blank} is "},
                    {"word": "money", "definition": "something that a pirate loves more than anything.", "fitb": "{blank} is "},
                    {"word": "mother", "definition": "something that a pirate loves almost as much as money.", "fitb": "A {blank} is "},
                    {"word": "honey", "definition": "something sweet that is hard to find on a pirate ship.", "fitb": "{blank} is "},
                    {"word": "mast", "definition": "a very high wooden pole on a ship. It holds up the sails.", "fitb": "A {blank} is "},
                    {"word": "mate", "definition": "a member of a pirate ship, who tells the other pirates what to do.", "fitb": "A {blank} is "},
                    {"word": "captain", "definition": "a member of a pirate ship, who tells all the other pirates what to do, even the mate.", "fitb": "A {blank} is "},
                    {"word": "cat", "definition": "an animal on a pirate ship that purrs and eats rats.", "fitb": "A {blank} is "},
                    {"word": "rat", "definition": "an animal on a pirate ship that steals food. Pirates hate animals that steal.", "fitb": "A {blank} is "},
                    {"word": "sea", "definition": "the water the a ship sails on.", "fitb": "The {blank} is "},
                    {"word": "shore", "definition": "land next to the sea", "fitb": "The {blank} is "},
                    {"word": "deck", "definition": "what the floors of a ship are called.", "fitb": "A {blank} is "},
                    {"word": "dock", "definition": "where the ship are tied when pirates are on shore.", "fitb": "A {blank} is "},
                    {"word": "biscuit", "definition": "dry bread. What pirates eat when they are at sea.", "fitb": "A {blank} is "},
                    {"word": "basket", "definition": "a container for biscuits.", "fitb": "A {blank} is "},
                    {"word": "island", "definition": "land surrounded by sea.", "fitb": "An {blank} is "}
                ]
            }
        };
        this.vocabulary = this.curriculumData.content.vocabulary;
    }

    /**
     * Get all vocabulary items
     */
    getVocabulary() {
        return this.vocabulary;
    }

    /**
     * Get a random vocabulary item
     */
    getRandomVocabularyItem() {
        const index = Math.floor(Math.random() * this.vocabulary.length);
        return this.vocabulary[index];
    }

    /**
     * Get random vocabulary items (without duplicates)
     */
    getRandomVocabularyItems(count) {
        const shuffled = [...this.vocabulary].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
}

// Export for use in other modules
window.CurriculumManager = CurriculumManager;
