const authMiddleware = require('./auth.middleware');
const errorMiddleware = require('./error.middleware');
const roleMiddleware = require('./role.middleware');

module.exports = {
    authMiddleware,
    auth: authMiddleware, // Alias for backward compatibility or simple require
    errorMiddleware,
    roleMiddleware
};
