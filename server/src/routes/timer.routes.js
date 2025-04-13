const express = require('express');
const router = express.Router();
const Timer = require('../models/timer.model');
const Roadmap = require('../models/roadmap.model');
const Content = require('../models/content.model');
const Quiz = require('../models/quiz.model');
const { authMiddleware } = require('../utils/auth.utils');

/**
 * @route   GET /api/timers/active
 * @desc    Get all active timers for a user
 * @access  Private
 */
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const timers = await Timer.find({ 
      user: req.user.id,
      active: true,
      contentDelivered: false
    }).sort({ nextContentDelivery: 1 });
    
    res.json(timers);
  } catch (error) {
    console.error('Get active timers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/timers/next
 * @desc    Get the next content due to be delivered
 * @access  Private
 */
router.get('/next', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    
    // Find the next timer that's due (or past due)
    const nextTimer = await Timer.findOne({ 
      user: req.user.id,
      active: true,
      contentDelivered: false,
      nextContentDelivery: { $lte: now }
    }).sort({ nextContentDelivery: 1 });
    
    if (!nextTimer) {
      return res.json({ message: 'No content ready for delivery' });
    }
    
    // Get the roadmap
    const roadmap = await Roadmap.findOne({ _id: nextTimer.roadmap, user: req.user.id });
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    let content;
    let quiz;
    let nextModule;
    let nextTopic;
    
    // If this is a review, get the content and quiz for the review topic
    if (nextTimer.isReview && nextTimer.topic) {
      content = await Content.findOne({ 
        roadmap: nextTimer.roadmap,
        topic: nextTimer.topic,
        user: req.user.id
      });
      
      quiz = await Quiz.findOne({
        roadmap: nextTimer.roadmap,
        topic: nextTimer.topic,
        user: req.user.id
      });
      
      // Find the module and topic info for UI display
      for (const [moduleIndex, module] of roadmap.modules.entries()) {
        for (const [topicIndex, topic] of module.topics.entries()) {
          if (topic._id.toString() === nextTimer.topic.toString()) {
            nextModule = module;
            nextTopic = topic;
            break;
          }
        }
        if (nextModule) break;
      }
    } else {
      // Get the next topic from the roadmap
      nextModule = roadmap.modules[roadmap.currentModule];
      if (!nextModule) {
        return res.status(404).json({ message: 'Module not found in roadmap' });
      }
      
      nextTopic = nextModule.topics[roadmap.currentTopic];
      if (!nextTopic) {
        return res.status(404).json({ message: 'Topic not found in module' });
      }
      
      // Get content for this topic
      content = await Content.findOne({
        roadmap: nextTimer.roadmap,
        topic: nextTopic._id,
        user: req.user.id
      });
      
      // If we need to generate content, return info so client can request it
      if (!content) {
        return res.json({
          message: 'Content needs to be generated',
          timer: nextTimer,
          roadmap: {
            _id: roadmap._id,
            title: roadmap.title,
          },
          module: {
            _id: nextModule._id,
            title: nextModule.title,
            order: nextModule.order,
            index: roadmap.currentModule
          },
          topic: {
            _id: nextTopic._id,
            title: nextTopic.title,
            description: nextTopic.description,
            order: nextTopic.order,
            index: roadmap.currentTopic
          }
        });
      }
      
      // Get quiz for this topic if it exists
      quiz = await Quiz.findOne({
        roadmap: nextTimer.roadmap,
        topic: nextTopic._id,
        user: req.user.id
      });
    }
    
    // Mark the timer as notification sent
    nextTimer.notificationSent = true;
    nextTimer.notificationSentAt = now;
    await nextTimer.save();
    
    // Return the next content information
    res.json({
      timer: nextTimer,
      content: content,
      quiz: quiz,
      roadmap: {
        _id: roadmap._id,
        title: roadmap.title,
      },
      module: {
        _id: nextModule._id,
        title: nextModule.title,
        order: nextModule.order
      },
      topic: {
        _id: nextTopic._id,
        title: nextTopic.title,
        description: nextTopic.description,
        order: nextTopic.order
      },
      isReview: nextTimer.isReview
    });
  } catch (error) {
    console.error('Get next timer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/timers/:id/delivered
 * @desc    Mark a timer's content as delivered
 * @access  Private
 */
router.put('/:id/delivered', authMiddleware, async (req, res) => {
  try {
    const timer = await Timer.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!timer) {
      return res.status(404).json({ message: 'Timer not found' });
    }
    
    timer.contentDelivered = true;
    timer.contentDeliveredAt = new Date();
    await timer.save();
    
    res.json({ message: 'Timer updated', timer });
  } catch (error) {
    console.error('Update timer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/timers/:id/snooze
 * @desc    Snooze a timer by postponing the delivery time
 * @access  Private
 */
router.put('/:id/snooze', authMiddleware, async (req, res) => {
  try {
    const { snoozeMinutes } = req.body;
    
    if (!snoozeMinutes || snoozeMinutes < 1) {
      return res.status(400).json({ message: 'Invalid snooze time' });
    }
    
    const timer = await Timer.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!timer) {
      return res.status(404).json({ message: 'Timer not found' });
    }
    
    // Update next delivery time
    const nextDeliveryDate = new Date(timer.nextContentDelivery);
    nextDeliveryDate.setMinutes(nextDeliveryDate.getMinutes() + snoozeMinutes);
    
    timer.nextContentDelivery = nextDeliveryDate;
    timer.notificationSent = false;
    timer.notificationSentAt = null;
    
    await timer.save();
    
    res.json({ 
      message: 'Timer snoozed', 
      timer,
      nextDelivery: nextDeliveryDate
    });
  } catch (error) {
    console.error('Snooze timer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/timers/:id
 * @desc    Delete a timer
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const timer = await Timer.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!timer) {
      return res.status(404).json({ message: 'Timer not found' });
    }
    
    res.json({ message: 'Timer deleted' });
  } catch (error) {
    console.error('Delete timer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 