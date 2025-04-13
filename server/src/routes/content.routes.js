const express = require('express');
const router = express.Router();
const Content = require('../models/content.model');
const User = require('../models/user.model');
const Roadmap = require('../models/roadmap.model');
const { authMiddleware } = require('../utils/auth.utils');
const geminiService = require('../services/gemini.service');

/**
 * @route   POST /api/content/generate
 * @desc    Generate content for a topic or subtopic
 * @access  Private
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { roadmapId, moduleIndex, topicIndex, subtopicIndex } = req.body;
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
    let contentType = 'topic';
    let contentTypeId = topic._id;
    
    if (subtopicIndex !== undefined && subtopicIndex !== null) {
      subtopic = topic.subtopics && topic.subtopics[subtopicIndex];
      if (!subtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }
      contentType = 'subtopic';
      contentTypeId = subtopic._id;
    }

    // Check if content already exists
    const query = { 
      roadmap: roadmapId,
      user: userId,
      moduleIndex: moduleIndex,
      topicIndex: topicIndex
    };
    
    if (contentType === 'subtopic') {
      query.subtopicIndex = subtopicIndex;
    }
    
    const existingContent = await Content.findOne(query);

    if (existingContent) {
      return res.json(existingContent);
    }

    // Prepare data for content generation
    const userData = {
      name: user.name,
      age: user.age,
      educationLevel: user.educationLevel,
      learningPreferences: user.learningPreferences
    };

    const learningData = {
      moduleTitle: module.title,
      moduleDescription: module.description,
      topicTitle: topic.title,
      topicDescription: topic.description,
      estimatedTimeMinutes: topic.estimatedTimeMinutes || 10,
      moduleIndex,
      topicIndex
    };
    
    // Add subtopic data if applicable
    if (contentType === 'subtopic') {
      learningData.subtopicIndex = subtopicIndex;
      learningData.subtopicTitle = subtopic.title;
      learningData.subtopicDescription = subtopic.description;
    }

    // Generate content using AI
    const contentData = await geminiService.generateContent(learningData, userData);

    // Create content in database
    const content = new Content({
      title: contentData.title,
      description: contentData.description,
      type: contentData.type || 'text',
      textContent: contentData.textContent,
      tags: contentData.tags || [],
      estimatedTimeMinutes: contentData.estimatedTimeMinutes,
      difficulty: contentData.difficulty || 'beginner',
      roadmap: roadmapId,
      moduleIndex,
      topicIndex,
      subtopicIndex: contentType === 'subtopic' ? subtopicIndex : null,
      user: userId,
      aiGenerated: true
    });

    await content.save();

    // Update the topic or subtopic with the content ID
    if (contentType === 'subtopic') {
      if (!topic.subtopics[subtopicIndex].contentId) {
        topic.subtopics[subtopicIndex].contentId = content._id;
        await roadmap.save();
      }
    } else {
      if (!topic.contentId) {
        topic.contentId = content._id;
        await roadmap.save();
      }
    }

    res.status(201).json(content);
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/roadmap/:roadmapId/module/:moduleIndex/topic/:topicIndex
 * @desc    Get content for a specific topic
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

    // Get content for this topic
    const content = await Content.findOne({ 
      roadmap: roadmapId,
      moduleIndex: parseInt(moduleIndex),
      topicIndex: parseInt(topicIndex),
      subtopicIndex: null,
      user: userId
    });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/roadmap/:roadmapId/module/:moduleIndex/topic/:topicIndex/subtopic/:subtopicIndex
 * @desc    Get content for a specific subtopic
 * @access  Private
 */
router.get('/roadmap/:roadmapId/module/:moduleIndex/topic/:topicIndex/subtopic/:subtopicIndex', authMiddleware, async (req, res) => {
  try {
    const { roadmapId, moduleIndex, topicIndex, subtopicIndex } = req.params;
    const userId = req.user.id;

    // Check if roadmap exists
    const roadmap = await Roadmap.findOne({ _id: roadmapId, user: userId });
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    // Get the topic and subtopic
    const module = roadmap.modules[moduleIndex];
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const topic = module.topics[topicIndex];
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const subtopic = topic.subtopics && topic.subtopics[subtopicIndex];
    if (!subtopic) {
      return res.status(404).json({ message: 'Subtopic not found' });
    }

    // Get content for this subtopic
    const content = await Content.findOne({ 
      roadmap: roadmapId,
      moduleIndex: parseInt(moduleIndex),
      topicIndex: parseInt(topicIndex),
      subtopicIndex: parseInt(subtopicIndex),
      user: userId
    });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content);
  } catch (error) {
    console.error('Get subtopic content error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/:id
 * @desc    Get content by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const content = await Content.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/content/:id
 * @desc    Update content 
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, type, textContent, videoUrl, videoStartTime, videoEndTime, tags, estimatedTimeMinutes, difficulty } = req.body;
    
    // Find content
    const content = await Content.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // Update fields
    if (title) content.title = title;
    if (description) content.description = description;
    if (type) content.type = type;
    if (textContent) content.textContent = textContent;
    if (videoUrl) content.videoUrl = videoUrl;
    if (videoStartTime !== undefined) content.videoStartTime = videoStartTime;
    if (videoEndTime !== undefined) content.videoEndTime = videoEndTime;
    if (tags) content.tags = tags;
    if (estimatedTimeMinutes) content.estimatedTimeMinutes = estimatedTimeMinutes;
    if (difficulty) content.difficulty = difficulty;
    
    // If manually edited, set aiGenerated to false
    content.aiGenerated = false;
    content.updatedAt = Date.now();
    
    await content.save();
    
    res.json(content);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/content/:id
 * @desc    Delete content
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const content = await Content.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // If this content was linked to a topic or subtopic, remove the reference
    const roadmap = await Roadmap.findOne({ _id: content.roadmap, user: req.user.id });
    if (roadmap) {
      const module = roadmap.modules[content.moduleIndex];
      if (module) {
        const topic = module.topics[content.topicIndex];
        if (topic) {
          if (content.subtopicIndex !== null && topic.subtopics && topic.subtopics[content.subtopicIndex]) {
            // Remove subtopic content reference
            topic.subtopics[content.subtopicIndex].contentId = null;
          } else {
            // Remove topic content reference
            topic.contentId = null;
          }
          await roadmap.save();
        }
      }
    }
    
    res.json({ message: 'Content deleted' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 