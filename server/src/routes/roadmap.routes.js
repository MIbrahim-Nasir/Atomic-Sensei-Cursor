const express = require('express');
const router = express.Router();
const Roadmap = require('../models/roadmap.model');
const User = require('../models/user.model');
const { authMiddleware } = require('../utils/auth.utils');
const geminiService = require('../services/gemini.service');

/**
 * @route   POST /api/roadmaps
 * @desc    Generate a new roadmap
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { goal } = req.body;
    const userId = req.user.id;

    if (!goal) {
      return res.status(400).json({ message: 'Learning goal is required' });
    }

    console.log(`Roadmap generation requested for user ${userId} with goal: ${goal}`);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare user data for roadmap generation
    const userData = {
      name: user.name || 'Student',
      age: user.age || null,
      educationLevel: user.educationLevel || 'other',
      goal,
      learningPreferences: user.learningPreferences || {
        preferredContentType: 'mixed',
        preferredTheme: 'default',
        isGameficationEnabled: true,
        preferredLearningTime: 10
      }
    };

    console.log('Sending data to Gemini service:', JSON.stringify(userData));

    // Generate roadmap using AI
    try {
      const roadmapData = await geminiService.generateRoadmap(userData);
      
      console.log('Roadmap generated successfully, creating database entry');

      // Create roadmap in database
      const roadmap = new Roadmap({
        user: userId,
        title: roadmapData.title,
        description: roadmapData.description,
        goal,
        modules: roadmapData.modules.map(module => ({
          title: module.title,
          description: module.description,
          order: module.order || 0,
          topics: module.topics.map(topic => ({
            title: topic.title,
            description: topic.description,
            order: topic.order || 0,
            estimatedTimeMinutes: topic.estimatedTimeMinutes || 10,
            subtopics: Array.isArray(topic.subtopics) ? topic.subtopics.map(subtopic => ({
              title: subtopic.title,
              description: subtopic.description
            })) : []
          }))
        }))
      });

      await roadmap.save();
      console.log(`Roadmap saved with ID: ${roadmap._id}`);
      res.status(201).json(roadmap);
    } catch (aiError) {
      console.error('AI Roadmap generation error:', aiError);
      return res.status(500).json({ 
        message: 'Error generating roadmap with AI', 
        error: aiError.message,
        details: 'There was an issue creating your roadmap. Please try again with a more specific learning goal.'
      });
    }
  } catch (error) {
    console.error('Generate roadmap error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/roadmaps
 * @desc    Get all roadmaps for user
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(roadmaps);
  } catch (error) {
    console.error('Get roadmaps error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/roadmaps/:id
 * @desc    Get a specific roadmap
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    res.json(roadmap);
  } catch (error) {
    console.error('Get roadmap error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/roadmaps/:id/progress
 * @desc    Update roadmap progress
 * @access  Private
 */
router.put('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const { moduleIndex, topicIndex, completed } = req.body;
    
    // Find roadmap
    const roadmap = await Roadmap.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    // Update topic completion status
    if (roadmap.modules[moduleIndex] && roadmap.modules[moduleIndex].topics[topicIndex]) {
      roadmap.modules[moduleIndex].topics[topicIndex].completed = completed;
      
      if (completed) {
        roadmap.modules[moduleIndex].topics[topicIndex].completedAt = Date.now();
      } else {
        roadmap.modules[moduleIndex].topics[topicIndex].completedAt = null;
      }
      
      // Check if all topics in module are completed
      const allTopicsCompleted = roadmap.modules[moduleIndex].topics.every(topic => topic.completed);
      roadmap.modules[moduleIndex].completed = allTopicsCompleted;
      
      if (allTopicsCompleted) {
        roadmap.modules[moduleIndex].completedAt = Date.now();
      } else {
        roadmap.modules[moduleIndex].completedAt = null;
      }
      
      // Update current module and topic
      if (completed) {
        // If current topic completed, move to next topic or next module
        let nextModuleIndex = moduleIndex;
        let nextTopicIndex = topicIndex + 1;
        
        if (nextTopicIndex >= roadmap.modules[moduleIndex].topics.length) {
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
      }
      
      // Calculate overall progress
      const totalTopics = roadmap.modules.reduce((count, module) => count + module.topics.length, 0);
      const completedTopics = roadmap.modules.reduce((count, module) => {
        return count + module.topics.filter(topic => topic.completed).length;
      }, 0);
      
      roadmap.progress = Math.round((completedTopics / totalTopics) * 100);
      
      await roadmap.save();
      
      res.json({ 
        message: 'Progress updated',
        roadmap
      });
    } else {
      return res.status(400).json({ message: 'Invalid module or topic index' });
    }
  } catch (error) {
    console.error('Update roadmap progress error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/roadmaps/:id/progress/subtopic
 * @desc    Update roadmap progress for subtopics
 * @access  Private
 */
router.put('/:id/progress/subtopic', authMiddleware, async (req, res) => {
  try {
    const { moduleIndex, topicIndex, subtopicIndex, completed } = req.body;
    
    // Find roadmap
    const roadmap = await Roadmap.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    // Validate that the subtopic exists
    if (!roadmap.modules[moduleIndex] || 
        !roadmap.modules[moduleIndex].topics[topicIndex] || 
        !roadmap.modules[moduleIndex].topics[topicIndex].subtopics || 
        !roadmap.modules[moduleIndex].topics[topicIndex].subtopics[subtopicIndex]) {
      return res.status(400).json({ message: 'Invalid module, topic, or subtopic index' });
    }
    
    // Update subtopic completion status
    roadmap.modules[moduleIndex].topics[topicIndex].subtopics[subtopicIndex].completed = completed;
    
    if (completed) {
      roadmap.modules[moduleIndex].topics[topicIndex].subtopics[subtopicIndex].completedAt = Date.now();
      
      // Check if all subtopics are completed, and if so, mark the parent topic as completed
      const allSubtopicsCompleted = roadmap.modules[moduleIndex].topics[topicIndex].subtopics.every(
        subtopic => subtopic.completed
      );
      
      if (allSubtopicsCompleted) {
        roadmap.modules[moduleIndex].topics[topicIndex].completed = true;
        roadmap.modules[moduleIndex].topics[topicIndex].completedAt = Date.now();
        
        // Check if all topics in module are completed
        const allTopicsCompleted = roadmap.modules[moduleIndex].topics.every(topic => topic.completed);
        roadmap.modules[moduleIndex].completed = allTopicsCompleted;
        
        if (allTopicsCompleted) {
          roadmap.modules[moduleIndex].completedAt = Date.now();
        }
        
        // If current topic completed, move to next topic or next module
        let nextModuleIndex = moduleIndex;
        let nextTopicIndex = topicIndex + 1;
        
        if (nextTopicIndex >= roadmap.modules[moduleIndex].topics.length) {
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
      }
    } else {
      roadmap.modules[moduleIndex].topics[topicIndex].subtopics[subtopicIndex].completedAt = null;
      
      // If a subtopic is marked incomplete, the parent topic should also be marked incomplete
      roadmap.modules[moduleIndex].topics[topicIndex].completed = false;
      roadmap.modules[moduleIndex].topics[topicIndex].completedAt = null;
      
      // Also mark the module as incomplete
      roadmap.modules[moduleIndex].completed = false;
      roadmap.modules[moduleIndex].completedAt = null;
    }
    
    // Calculate overall progress
    const totalTopics = roadmap.modules.reduce((count, module) => count + module.topics.length, 0);
    const completedTopics = roadmap.modules.reduce((count, module) => {
      return count + module.topics.filter(topic => topic.completed).length;
    }, 0);
    
    roadmap.progress = Math.round((completedTopics / totalTopics) * 100);
    
    await roadmap.save();
    
    res.json({
      message: 'Subtopic progress updated',
      roadmap
    });
  } catch (error) {
    console.error('Update subtopic progress error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/roadmaps/:id
 * @desc    Delete a roadmap
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    
    res.json({ message: 'Roadmap deleted' });
  } catch (error) {
    console.error('Delete roadmap error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 