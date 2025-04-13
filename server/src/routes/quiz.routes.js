const express = require('express');
const router = express.Router();
const Quiz = require('../models/quiz.model');
const QuizResult = require('../models/quizResult.model');
const Content = require('../models/content.model');
const User = require('../models/user.model');
const Roadmap = require('../models/roadmap.model');
const Timer = require('../models/timer.model');
const { authMiddleware } = require('../utils/auth.utils');
const geminiService = require('../services/gemini.service');

/**
 * @route   POST /api/quizzes/generate
 * @desc    Generate a quiz for a topic or subtopic
 * @access  Private
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { 
      roadmapId, 
      moduleIndex, 
      topicIndex, 
      subtopicIndex,
      contentText,
      topicTitle,
      topicDescription,
      moduleTitle,
      moduleDescription,
      subtopicTitle,
      subtopicDescription
    } = req.body;
    
    const userId = req.user.id;

    console.log(`Quiz generation requested for roadmap ${roadmapId}, module ${moduleIndex}, topic ${topicIndex}`);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if roadmap exists
    const roadmap = await Roadmap.findOne({ _id: roadmapId, user: userId });
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    // Get the module
    const module = roadmap.modules[moduleIndex];
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Get the topic
    const topic = module.topics[topicIndex];
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Handle subtopic if specified
    let subtopic = null;
    let contentId = topic.contentId;
    let quizType = 'topic';
    let targetId = topic._id;
    
    if (subtopicIndex !== undefined && subtopicIndex !== null) {
      subtopic = topic.subtopics && topic.subtopics[subtopicIndex];
      if (!subtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }
      contentId = subtopic.contentId;
      quizType = 'subtopic';
      targetId = subtopic._id;
    }

    // Check if quiz already exists
    const query = { 
      roadmap: roadmapId,
      user: userId,
      moduleIndex: moduleIndex,
      topicIndex: topicIndex
    };
    
    if (quizType === 'subtopic') {
      query.subtopicIndex = subtopicIndex;
    }

    const existingQuiz = await Quiz.findOne(query);
    
    if (existingQuiz) {
      console.log(`Found existing quiz for ${topic.title}, returning it`);
      return res.json(existingQuiz);
    }

    // Get content from request or try to fetch from database if not provided
    let learningContent = contentText;
    
    if (!learningContent) {
      // Try to get from database
      if (contentId) {
        const content = await Content.findById(contentId);
        if (content) {
          learningContent = content.textContent;
        }
      }
      
      // If still no content, use topic description as fallback
      if (!learningContent) {
        learningContent = quizType === 'subtopic' ? subtopic.description : topic.description;
      }
    }

    // Prepare data for quiz generation
    const userData = {
      name: user.name,
      age: user.age,
      educationLevel: user.educationLevel,
      learningPreferences: user.learningPreferences,
      skillLevel: user.skillLevel || 'intermediate'
    };

    const learningData = {
      moduleTitle: moduleTitle || module.title,
      moduleDescription: moduleDescription || module.description,
      topicTitle: topicTitle || topic.title,
      topicDescription: topicDescription || topic.description,
      contentText: learningContent,
      estimatedTimeMinutes: topic.estimatedTimeMinutes || 10,
      moduleIndex,
      topicIndex
    };
    
    // Add subtopic data if applicable
    if (quizType === 'subtopic') {
      learningData.subtopicIndex = subtopicIndex;
      learningData.subtopicTitle = subtopicTitle || subtopic.title;
      learningData.subtopicDescription = subtopicDescription || subtopic.description;
    }

    console.log(`Generating quiz using AI for ${quizType} "${learningData.topicTitle}"`);

    try {
      // Generate quiz using AI
      const quizData = await geminiService.generateQuiz(learningData, userData);

      // Ensure we have the minimum required quiz data structure
      if (!quizData || !quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        throw new Error('Invalid quiz data structure returned by AI');
      }

      // Create quiz in database
      const quiz = new Quiz({
        title: quizData.title || `Quiz: ${quizType === 'subtopic' ? subtopic.title : topic.title}`,
        description: quizData.description || `Test your knowledge on ${quizType === 'subtopic' ? subtopic.title : topic.title}`,
        questions: quizData.questions.map(q => ({
          type: q.type,
          question: q.question,
          options: q.type === 'multipleChoice' ? q.options : undefined,
          answer: q.answer,
          explanation: q.explanation
        })),
        roadmap: roadmapId,
        moduleIndex,
        topicIndex,
        subtopicIndex: quizType === 'subtopic' ? subtopicIndex : null,
        user: userId,
        aiGenerated: true
      });

      await quiz.save();
      console.log(`Quiz successfully generated and saved with ID: ${quiz._id}`);

      // Update the topic or subtopic with the quiz ID
      if (quizType === 'subtopic') {
        if (!topic.subtopics[subtopicIndex].quizId) {
          topic.subtopics[subtopicIndex].quizId = quiz._id;
          await roadmap.save();
        }
      } else {
        if (!topic.quizId) {
          topic.quizId = quiz._id;
          await roadmap.save();
        }
      }

      res.status(201).json(quiz);
    } catch (aiError) {
      console.error('AI Quiz generation error:', aiError);
      
      // Create mock quiz for development or fallback
      const mockQuestions = [
        {
          type: 'multipleChoice',
          question: `Which of the following best describes ${quizType === 'subtopic' ? subtopic.title : topic.title}?`,
          options: [
            `This is the main concept covered in this lesson`,
            `This is a secondary concept explained in the module`,
            `This is a practical application of module principles`,
            `This is an advanced topic for further study`
          ],
          answer: 0,
          explanation: 'The main concept is the focus of this specific learning unit.'
        },
        {
          type: 'trueFalse',
          question: `${quizType === 'subtopic' ? subtopic.title : topic.title} is an important component of ${module.title}.`,
          answer: true,
          explanation: `This ${quizType} is integral to understanding the overall module.`
        },
        {
          type: 'multipleChoice',
          question: `What is the relationship between ${topic.title} and ${module.title}?`,
          options: [
            `${topic.title} is a fundamental concept within ${module.title}`,
            `${topic.title} is unrelated to ${module.title}`,
            `${topic.title} is a prerequisite for ${module.title}`,
            `${topic.title} is an advanced concept beyond ${module.title}`
          ],
          answer: 0,
          explanation: `Topics are fundamental concepts that make up a module.`
        }
      ];
      
      const mockQuiz = new Quiz({
        title: `Quiz: ${quizType === 'subtopic' ? subtopic.title : topic.title}`,
        description: `Test your knowledge on ${quizType === 'subtopic' ? subtopic.title : topic.title}`,
        questions: mockQuestions,
        roadmap: roadmapId,
        moduleIndex,
        topicIndex,
        subtopicIndex: quizType === 'subtopic' ? subtopicIndex : null,
        user: userId,
        aiGenerated: false
      });
      
      await mockQuiz.save();
      console.log(`Mock quiz created due to AI error with ID: ${mockQuiz._id}`);
      
      if (quizType === 'subtopic') {
        if (!topic.subtopics[subtopicIndex].quizId) {
          topic.subtopics[subtopicIndex].quizId = mockQuiz._id;
          await roadmap.save();
        }
      } else {
        if (!topic.quizId) {
          topic.quizId = mockQuiz._id;
          await roadmap.save();
        }
      }
      
      res.status(201).json(mockQuiz);
    }
  } catch (error) {
    console.error('Generate quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/quizzes/roadmap/:roadmapId/module/:moduleIndex/topic/:topicIndex
 * @desc    Get quiz for a specific topic
 * @access  Private
 */
router.get('/roadmap/:roadmapId/module/:moduleIndex/topic/:topicIndex', authMiddleware, async (req, res) => {
  try {
    const { roadmapId, moduleIndex, topicIndex } = req.params;
    const userId = req.user.id;

    // Check if roadmap exists
    const roadmap = await Roadmap.findOne({ _id: roadmapId, user: userId });
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    // Get the topic
    const module = roadmap.modules[moduleIndex];
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const topic = module.topics[topicIndex];
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Get quiz for this topic
    const quiz = await Quiz.findOne({ 
      roadmap: roadmapId,
      topic: topic._id,
      user: userId
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/quizzes/:id
 * @desc    Get quiz by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/quizzes/:id/submit
 * @desc    Submit quiz answers and evaluate results
 * @access  Private
 */
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { answers, completionTime } = req.body;
    const userId = req.user.id;
    
    // Find the quiz
    const quiz = await Quiz.findOne({ _id: req.params.id, user: userId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Get the roadmap and topic info
    const roadmap = await Roadmap.findOne({ _id: quiz.roadmap, user: userId });
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    // Process answers and calculate score
    const questionResults = [];
    let totalPoints = 0;
    let earnedPoints = 0;
    const conceptsToReview = [];
    
    // Process each answer
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const userAnswer = answers[i]; // Get user's answer for this question
      let isCorrect = false;
      let pointsEarned = 0;
      
      // Evaluate answer based on question type
      if (question.questionType === 'multiple-choice') {
        // For multiple choice, check if selected option matches correct option
        if (Array.isArray(userAnswer)) {
          // For questions with multiple correct answers
          const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt._id.toString());
          const userOptions = userAnswer.map(id => id.toString());
          
          // Check if arrays match (all correct options selected and no incorrect ones)
          isCorrect = correctOptions.length === userOptions.length && 
                       correctOptions.every(opt => userOptions.includes(opt));
        } else {
          // For questions with a single correct answer
          const correctOption = question.options.find(opt => opt.isCorrect);
          isCorrect = correctOption && correctOption._id.toString() === userAnswer.toString();
        }
      } else if (question.questionType === 'true-false') {
        // For true/false, direct comparison
        isCorrect = question.correctAnswer.toLowerCase() === userAnswer.toLowerCase();
      } else if (question.questionType === 'short-answer') {
        // For short answer questions, use AI to evaluate
        const evaluation = await geminiService.evaluateAnswer(
          question.questionText,
          question.correctAnswer,
          userAnswer
        );
        
        isCorrect = evaluation.isCorrect;
        // For short answer, we might give partial credit
        pointsEarned = (evaluation.score / 100) * question.pointsValue;
      }
      
      // If not already set by AI evaluation (short-answer)
      if (question.questionType !== 'short-answer') {
        pointsEarned = isCorrect ? question.pointsValue : 0;
      }
      
      // Add to total points
      totalPoints += question.pointsValue;
      earnedPoints += pointsEarned;
      
      // If answer is incorrect, add concept to review list
      if (!isCorrect) {
        // Extract key concept from question text or explanation
        const concept = question.questionText.split(' ').slice(0, 3).join(' ') + '...';
        conceptsToReview.push(concept);
      }
      
      // Add result for this question
      questionResults.push({
        question: question._id,
        userAnswer,
        isCorrect,
        pointsEarned,
        answerTime: 0 // Not tracking individual question time in this version
      });
    }
    
    // Calculate percentage score
    const percentageScore = Math.round((earnedPoints / totalPoints) * 100);
    const passed = percentageScore >= quiz.passingScore;
    
    // Create quiz result
    const quizResult = new QuizResult({
      user: userId,
      quiz: quiz._id,
      roadmap: quiz.roadmap,
      content: quiz.content,
      questionResults,
      totalScore: earnedPoints,
      percentageScore,
      passed,
      completionTime,
      reviewNeeded: !passed || percentageScore < 80, // If score is less than 80%, recommend review
      conceptsToReview: [...new Set(conceptsToReview)] // Remove duplicates
    });
    
    await quizResult.save();
    
    // If quiz is passed, update topic completion status
    if (passed) {
      // Find the module and topic in the roadmap
      let topicFound = false;
      for (const [moduleIndex, module] of roadmap.modules.entries()) {
        for (const [topicIndex, topic] of module.topics.entries()) {
          if (topic._id.toString() === quiz.topic.toString()) {
            // Mark topic as completed
            roadmap.modules[moduleIndex].topics[topicIndex].completed = true;
            roadmap.modules[moduleIndex].topics[topicIndex].completedAt = Date.now();
            
            // Check if all topics in module are completed
            const allTopicsCompleted = roadmap.modules[moduleIndex].topics.every(t => t.completed);
            if (allTopicsCompleted) {
              roadmap.modules[moduleIndex].completed = true;
              roadmap.modules[moduleIndex].completedAt = Date.now();
            }
            
            // Move to next topic
            let nextModuleIndex = moduleIndex;
            let nextTopicIndex = topicIndex + 1;
            
            if (nextTopicIndex >= module.topics.length) {
              nextModuleIndex = moduleIndex + 1;
              nextTopicIndex = 0;
            }
            
            // Check if we've completed the entire roadmap
            if (nextModuleIndex < roadmap.modules.length) {
              roadmap.currentModule = nextModuleIndex;
              roadmap.currentTopic = nextTopicIndex;
            } else {
              // Roadmap completed
              roadmap.completedAt = Date.now();
            }
            
            topicFound = true;
            break;
          }
        }
        if (topicFound) break;
      }
      
      // Calculate overall progress
      const totalTopics = roadmap.modules.reduce((count, module) => count + module.topics.length, 0);
      const completedTopics = roadmap.modules.reduce((count, module) => {
        return count + module.topics.filter(topic => topic.completed).length;
      }, 0);
      
      roadmap.progress = Math.round((completedTopics / totalTopics) * 100);
      await roadmap.save();
    }
    
    // Calculate next content delivery time using AI
    const user = await User.findById(userId);
    const topicData = { quizId: quiz._id, topicId: quiz.topic };
    
    const timerData = await geminiService.calculateNextDeliveryTime(user, topicData, quizResult);
    
    // Create a timer for next content delivery
    const nextDeliveryDate = new Date();
    nextDeliveryDate.setMinutes(nextDeliveryDate.getMinutes() + timerData.intervalMinutes);
    
    const timer = new Timer({
      user: userId,
      roadmap: quiz.roadmap,
      nextContentDelivery: nextDeliveryDate,
      topic: timerData.isReview ? quiz.topic : null, // If review, keep current topic
      content: quiz.content,
      isReview: timerData.isReview,
      interval: timerData.intervalMinutes,
      active: true
    });
    
    await timer.save();
    
    // Return results and next steps
    res.json({
      quizResult,
      nextDelivery: {
        timestamp: nextDeliveryDate,
        intervalMinutes: timerData.intervalMinutes,
        isReview: timerData.isReview,
        reason: timerData.reason
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/quizzes/results/:quizId
 * @desc    Get quiz results for a specific quiz
 * @access  Private
 */
router.get('/results/:quizId', authMiddleware, async (req, res) => {
  try {
    const results = await QuizResult.find({ 
      quiz: req.params.quizId,
      user: req.user.id
    }).sort({ completedAt: -1 });
    
    res.json(results);
  } catch (error) {
    console.error('Get quiz results error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 