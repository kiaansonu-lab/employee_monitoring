const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * Generate JWT Token
 * @param {Object} payload - Data to be encoded (userId, role)
 * @returns {string} token
 */
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Verify JWT Token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} payload or null if invalid
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken,
};
