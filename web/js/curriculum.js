/**
 * Curriculum Module - Handles loading and managing curriculum data
 */

class CurriculumManager {
    constructor() {
        this.curriculumData = null;
        this.vocabulary = [];
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
                    {"word": "pirate", "definition": "a person who steals from ships at sea"},
                    {"word": "parrot", "definition": "a brightly colored bird that can sometimes speak"},
                    {"word": "ship", "definition": "a large wooden boat, with masts and sails. Used by pirates."},
                    {"word": "shape", "definition": "things can be in a good one of these or bad a bad one of these. When it's good, it's sometimes called a ship one of these"},
                    {"word": "grog", "definition": "a strong drink a young pirate should definitely not taste, in case they get sick."},
                    {"word": "key", "definition": "you can knock on one. What is behind a locked one?"},
                    {"word": "door", "definition": "what is behind a locked door?"},
                    {"word": "chest", "definition": "a large box that you can lock"},
                    {"word": "monkey", "definition": "an animal that can climb easily, and that will make a big mess"},
                    {"word": "money", "definition": "something that a pirate loves more than anything."},
                    {"word": "mother", "definition": "something that a pirate loves almost as much as money."},
                    {"word": "honey", "definition": "something sweet that is hard to find on a pirate ship."},
                    {"word": "mast", "definition": "a very high wooden pole on a ship. It holds up the sails."},
                    {"word": "mate", "definition": "a member of a pirate ship, who tells the other pirates what to do."},
                    {"word": "captain", "definition": "a member of a pirate ship, who tells all the other pirates what to do, even the mate."},
                    {"word": "cat", "definition": "an animal on a pirate ship that purrs and eats rats."},
                    {"word": "rat", "definition": "an animal on a pirate ship that steals food. Pirates hate animals that steal."},
                    {"word": "sea", "definition": "the water that a ship sails on."},
                    {"word": "shore", "definition": "land next to the sea"},
                    {"word": "deck", "definition": "this is what the floors of a ship are called."},
                    {"word": "dock", "definition": "where the ships are tied when pirates are on shore."},
                    {"word": "biscuit", "definition": "dry bread. What pirates eat when they are at sea."},
                    {"word": "basket", "definition": "a container for biscuits."},
                    {"word": "island", "definition": "land surrounded by sea."}
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
