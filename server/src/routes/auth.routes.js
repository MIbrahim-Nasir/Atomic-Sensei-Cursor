const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { generateToken } = require('../utils/auth.utils');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, educationLevel, learningPreferences } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      age,
      educationLevel,
      learningPreferences
    });

    // Save user to database
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Return user data and token
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      educationLevel: user.educationLevel,
      learningPreferences: user.learningPreferences,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last active timestamp
    user.lastActive = Date.now();
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Return user data and token
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      educationLevel: user.educationLevel,
      learningPreferences: user.learningPreferences,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 