const { errorResponse } = require('../utils/response');

/**
 * Role-based access control middleware
 * @param {Array} roles - Allowed roles
 */
const roleMiddleware = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated!', 401);
        }

        if (!roles.includes(req.user.role)) {
            return errorResponse(res, 'You do not have permission to perform this action!', 403);
        }

        next();
    };
};

module.exports = roleMiddleware;
