const mongoose = require('mongoose');

const subtopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
});

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  estimatedTimeMinutes: {
    type: Number,
    default: 10
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  nextReviewDate: {
    type: Date
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  subtopics: [subtopicSchema]
});

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  topics: [topicSchema],
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
});

const roadmapSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  goal: {
    type: String,
    required: true,
    trim: true
  },
  modules: [moduleSchema],
  progress: {
    type: Number, // Percentage (0-100)
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  currentModule: {
    type: Number,
    default: 0
  },
  currentTopic: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Roadmap = mongoose.model('Roadmap', roadmapSchema);

module.exports = Roadmap; 