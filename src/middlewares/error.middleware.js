const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
    logger.error(err.message, err.stack);

    // Prisma unique constraint error
    if (err.code === 'P2002') {
        const target = err.meta?.target || '';
        if (target.includes('email')) {
            return errorResponse(res, 'Employee with this email is already invited or exists.', 400);
        }
        return errorResponse(res, `Duplicate field value: ${target}`, 400);
    }

    // Zod validation error
    if (err.name === 'ZodError') {
        const message = err.errors.map(e => {
            const path = e.path.join(': ');
            if (e.code === 'invalid_string' && e.validation === 'email') {
                return `Invalid email format`;
            }
            return `${path}: ${e.message}`;
        }).join(', ');
        return errorResponse(res, message, 400);
    }

    // JWT error
    if (err.name === 'JsonWebTokenError') {
        return errorResponse(res, 'Invalid token. Please log in again!', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Your token has expired! Please log in again.', 401);
    }

    // Default error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    errorResponse(res, message, statusCode);
};

module.exports = errorMiddleware;
