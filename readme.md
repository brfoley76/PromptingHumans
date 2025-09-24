# Description

PromptingHumans is a software system for delivering the most effective curricula at the right level in the right order to students. Content is delivered as a sequence of examples, excercises and games. We are starting with the example of a reading and spelling lesson

## Lesson
A lesson will consist of one or more exercises drawn from a specific curriculum module, along with some nominal amount of review material integrated into the exercises.

## Curriculum
Each module of curriculum is in a separate json file in the repo, in `learning_module.modules`. we have an example reading module already, stored as a json. Curricula are organised into a directed acyclic dependancy graph

Each module has the following: 
* `description`: a plain language description of the module
* `id`: a unique id for the module, nominally coding the subject, the level, and the variant
* `dependencies`: a list of all the immediate upstream prerequsites, defining the dependency DAG
* `subject`: a categorical description of the subject matter, which determines the permissible exercises and content types
* `exercises`: every excercise type that can be used in the lesson. Each excercise type is stored as a distinct module that can be imported from a library
* `content`: the data used for the lessons and the games. The exact structure will depend on the subject

### Reading curricula
For example, if the subject is reading, the curriculum content will have any of the following content types
* `vocabulary`: a list of word and definition pairs that represent the target vocabulary for the current lesson
* `narrative`: a reading sample that contains a text with the target vocabulary. There are variants of the text, whether it be the `body` original text, or variants with spelling mistakes, or other challenges. The sample is broken up into an ordered dictionary of text fragments, numerically indexed. The fragments contain
    * `text`: the actual text of the reading
    * `variant`: a description of whether the text is modified or not, and what the nature of the modification is.

## Exercise
The content of the exercises will be tailored to the curriculum, and the student's mastery of the content. Different exercises have implicitly different difficulties, based on the amount of support each provides to the user, and the difficulty can also be tuned based on how obvious the right answer is, or how fast a timed component is.

Exercises may also recycle material from earlier lessons in the dependency graph, to increase and maintain a student's mastery of the content.

Thus each exercise  will take as arguments:
* one `exercise` drawn from `curriculum.exercises`
* `curriculum.content` for a given `curriculum`
* `student.curriculum.level.mastery` for each level and mastery in `student.curriculum` for a given `student_id` and `curriculum`
* additional arguments

Lessons are done on a computer screen, with a readable, friendly, clear font. Trackpad, mouse, and tabbed navigation should be supported Unless otherwise indicated

Background should be white, and the text dark blue unless otherwise indicated

### Reading exercise: multiple choice
* arguments
    * `n` number of questions
    * `curriculum.content.vocabulary`
    * `mastery ` the student's mastery score of the vocabulary
* from the vocabulary content choose a random set of definitions
    * offer a multiple choice of vocabulary vocabulary items for each, from 3 to 5, with 3 being easiest
* students click on the radio buttons to answer, and submit with each answer
* difficulty: easy

### Reading exercise: fill in the blank
* arguments
    * `n` number of questions
    * `curriculum.content.vocabulary`
    * `mastery ` the student's mastery score of the vocabulary
* from the vocabulary content choose a random set of definitions and their associated words
    * Format the definitions as "A {blank} is {definition}
    * put the words in a list
* students drag the defintions to the correct spaces
* difficulty: easy

### Reading exercise: spelling
* arguments
    * `n` number of questions
    * `curriculum.content.vocabulary`
    * `mastery ` the student's mastery score of the vocabulary
* from the vocabulary content choose a random set of definitions and their associated words
    * Format the definitions as "{definition}: {blank}"
* students type the correct words in the correct spaces
* difficulty: medium

### Reading exercise: bubble pop
* arguments
    * `t` time
    * `v` speed
    * `tau` tortuosity
    * `mastery ` the student's mastery score of the vocabulary
    * `p` proportion of words spelled correctly
* from the vocabulary content choose a random set of words
* the background of the screen can be any random light color
* along the top there is a timer, and a speed, and a "right", "wrong", "missed" counter
* words move into the screen from right to left
    * they are enclosed in bubbles
    * they randomly vary in font size and color, but always larger than 14pt, and always dark
    * they move with a random speed proportional to `v`
    * as they move right to left, they also move up or down in the screen, changing direction stochastically, with the frequency and magnitude of changes proportional to `tau`
    * if they occupy the same space, the larger size word will be "in front". 
    * one or more letters in the word can be changed randomly, making the spelling "incorrect"
* students click on the words, to indicate whether they are spelled correctly or not, with click+q=correct, and click+r=incorrect
    * the bubble will pop
    * the word will flash blue if the student chose correctly, red if wrong, then disappear
* when a student correctly clicks on a word, their "right" score increments
    * if they are wrong, their "wrong" score increments
    * if they don't click on it before it passes from the screen, the "missed" score increments.
* the game continues until the timer runs out (between 1 and 3 minutes)

