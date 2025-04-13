const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { authMiddleware } = require('../utils/auth.utils');

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, age, educationLevel, learningPreferences } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (age) user.age = age;
    if (educationLevel) user.educationLevel = educationLevel;
    if (learningPreferences) {
      // Update specific learning preferences
      if (learningPreferences.preferredContentType) {
        user.learningPreferences.preferredContentType = learningPreferences.preferredContentType;
      }
      if (learningPreferences.preferredTheme) {
        user.learningPreferences.preferredTheme = learningPreferences.preferredTheme;
      }
      if (typeof learningPreferences.isGameficationEnabled === 'boolean') {
        user.learningPreferences.isGameficationEnabled = learningPreferences.isGameficationEnabled;
      }
      if (learningPreferences.preferredLearningTime) {
        user.learningPreferences.preferredLearningTime = learningPreferences.preferredLearningTime;
      }
    }
    
    // Save updated user
    await user.save();
    
    // Return updated user without password
    const updatedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      educationLevel: user.educationLevel,
      learningPreferences: user.learningPreferences
    };
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/users/password
 * @desc    Update user password
 * @access  Private
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 