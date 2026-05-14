/**
 * Standard Success Response
 * @param {Object} res - Express response object
 * @param {Object} data - Data to send
 * @param {string} message - Message to send
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Standard Error Response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
const errorResponse = (res, message = 'Error', statusCode = 500) => {
    return res.status(statusCode).json({
        success: false,
        message,
    });
};

module.exports = {
    successResponse,
    errorResponse,
};
