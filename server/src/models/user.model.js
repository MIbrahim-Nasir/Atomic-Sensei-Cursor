const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  age: {
    type: Number,
    min: 5,
    max: 100
  },
  educationLevel: {
    type: String,
    enum: ['primary', 'middle', 'high', 'undergraduate', 'graduate', 'other'],
    default: 'other'
  },
  learningPreferences: {
    preferredContentType: {
      type: String,
      enum: ['text', 'video', 'mixed'],
      default: 'mixed'
    },
    preferredTheme: {
      type: String,
      default: 'default'
    },
    isGameficationEnabled: {
      type: Boolean,
      default: true
    },
    preferredLearningTime: {
      type: Number, // minutes per session
      default: 10,
      min: 5,
      max: 60
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  if (!user.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 