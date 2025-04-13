const mongoose = require('mongoose');

// Schema for individual question results
const questionResultSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userAnswer: {
    type: mongoose.Schema.Types.Mixed // Can be a string for short-answer/true-false or an array of selected option IDs
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  answerTime: {
    type: Number, // in seconds
    default: 0
  }
});

// Main quiz result schema
const quizResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  questionResults: [questionResultSchema],
  totalScore: {
    type: Number,
    required: true
  },
  percentageScore: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  completionTime: {
    type: Number, // in seconds
    default: 0
  },
  reviewNeeded: {
    type: Boolean,
    default: false
  },
  // Concepts that need more practice based on wrong answers
  conceptsToReview: [{
    type: String
  }],
  completedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

module.exports = QuizResult; 