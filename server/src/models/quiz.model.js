const mongoose = require('mongoose');

// Schema for individual quiz questions
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer'],
    default: 'multiple-choice'
  },
  options: [{
    text: {
      type: String,
      required: function() {
        return this.questionType === 'multiple-choice';
      }
    },
    isCorrect: {
      type: Boolean,
      required: function() {
        return this.questionType === 'multiple-choice';
      }
    }
  }],
  correctAnswer: {
    type: String,
    required: function() {
      return this.questionType === 'true-false' || this.questionType === 'short-answer';
    }
  },
  explanation: {
    type: String
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  pointsValue: {
    type: Number,
    default: 1
  }
});

// Main quiz schema
const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  timeLimit: {
    type: Number, // in minutes
    default: 5
  },
  passingScore: {
    type: Number,
    default: 70 // percentage
  },
  isReview: {
    type: Boolean,
    default: false
  },
  aiGenerated: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz; 