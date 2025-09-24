#Description
Learning Module is a software system for delivering the most effective curricula at the right level in the right order to students. Content is delivered as a sequence of examples, excercises and games. We are starting with the example of a reading and spelling lesson

##Curriculum

Each unit of curriculum is in a separate json file in the repo, in `learning_module.modules`. we have an example reading module already, stored as a json. Curricula are organised into a directed acyclic dependancy graph

Each module has the following: 
* `description`: a plain language description of the module
* `id`: a unique id for the module, nominally coding the subject, the level, and the variant
* `dependencies`: a list of all the immediate upstream prerequsites, defining the dependency DAG
* `subject`: a categorical description of the subject matter, which determines the permissible exercises and content types
* `exercises`: every excercise type that can be used in the lesson. Each excercise type is stored as a distinct module that can be imported from a library
* `content`: the data used for the lessons and the games. The exact structure will depend on the subject

###Reading curricula
If the subject is reading, the curriculum content will have the any of the following types
* `vocabulary`: a list of word and definition pairs that represent the target vocabulary for the current lesson
* `narrative`: a reading sample that contains a text with the target vocabulary. There are variants of the text, whether it be the `body` original text, or variants with spelling mistakes, or other challenges. The sample is broken up into an ordered dictionary of text fragments, numerically indexed. The fragments contain
** `text`: the actual text of the reading
** `variant`: a description of whether the text is modified or not, and what the nature of the modification is.

