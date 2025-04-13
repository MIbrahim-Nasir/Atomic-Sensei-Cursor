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
 * @desc    Generate a quiz for a topic
 * @access  Private
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { roadmapId, moduleIndex, topicIndex, contentId } = req.body;
    const userId = req.user.id;

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

    // Get the topic
    const module = roadmap.modules[moduleIndex];
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const topic = module.topics[topicIndex];
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Get the content
    const content = await Content.findOne({ 
      _id: contentId || topic.contentId,
      roadmap: roadmapId,
      user: userId
    });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check if quiz already exists for this topic
    const existingQuiz = await Quiz.findOne({ 
      roadmap: roadmapId,
      topic: topic._id,
      user: userId
    });

    if (existingQuiz) {
      return res.json(existingQuiz);
    }

    // Prepare data for quiz generation
    const userData = {
      name: user.name,
      age: user.age,
      educationLevel: user.educationLevel,
      learningPreferences: user.learningPreferences
    };

    const topicData = {
      title: topic.title,
      description: topic.description
    };

    // Generate quiz using AI
    const quizData = await geminiService.generateQuiz(topicData, content, userData);

    // Create quiz in database
    const quiz = new Quiz({
      title: quizData.title || `Quiz: ${topic.title}`,
      description: quizData.description || `Test your knowledge of ${topic.title}`,
      roadmap: roadmapId,
      topic: topic._id,
      content: content._id,
      user: userId,
      questions: quizData.questions.map(question => ({
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        difficulty: question.difficulty || 'medium',
        pointsValue: question.pointsValue || 1
      })),
      aiGenerated: true
    });

    await quiz.save();

    // Update the topic with the quiz ID
    topic.quizId = quiz._id;
    await roadmap.save();

    res.status(201).json(quiz);
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