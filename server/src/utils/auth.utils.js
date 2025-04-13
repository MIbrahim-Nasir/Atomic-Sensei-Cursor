const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for authentication
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      name: user.name,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d', // Token expires in 30 days
    }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Middleware to authenticate requests with JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload to request object
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware
}; 