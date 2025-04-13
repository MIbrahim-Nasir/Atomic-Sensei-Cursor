const mongoose = require('mongoose');

const timerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    required: true
  },
  nextContentDelivery: {
    type: Date,
    required: true
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  isReview: {
    type: Boolean,
    default: false
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: {
    type: Date
  },
  contentDelivered: {
    type: Boolean,
    default: false
  },
  contentDeliveredAt: {
    type: Date
  },
  active: {
    type: Boolean,
    default: true
  },
  interval: {
    type: Number, // in minutes
    default: 60
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Timer = mongoose.model('Timer', timerSchema);

module.exports = Timer; 