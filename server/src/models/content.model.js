const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'video', 'mixed'],
    default: 'text'
  },
  // Text content
  textContent: {
    type: String
  },
  // Video content
  videoUrl: {
    type: String
  },
  videoStartTime: {
    type: Number
  },
  videoEndTime: {
    type: Number
  },
  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  estimatedTimeMinutes: {
    type: Number,
    default: 10
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  // References
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    required: true
  },
  moduleIndex: {
    type: Number,
    required: true
  },
  topicIndex: {
    type: Number,
    required: true
  },
  subtopicIndex: {
    type: Number,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Stats
  aiGenerated: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewed: {
    type: Date
  },
  // Related content
  relatedQuiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  relatedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }]
}, { timestamps: true });

// Index for faster queries by roadmap and user
contentSchema.index({ roadmap: 1, user: 1 });

// Index for faster queries by module, topic and subtopic indices
contentSchema.index({ roadmap: 1, moduleIndex: 1, topicIndex: 1, subtopicIndex: 1 });

const Content = mongoose.model('Content', contentSchema);

module.exports = Content; 