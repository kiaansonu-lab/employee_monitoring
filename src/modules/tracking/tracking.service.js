const prisma = require('../../config/db');

/**
 * Save consolidated tracking data from the agent
 */
const saveTracking = async (data) => {
    const { employeeId, screenshotUrl, videoUrl, activityStatus, location } = data;

    return await prisma.tracking.create({
        data: {
            employeeId,
            screenshotUrl,
            videoUrl,
            activityStatus,
            location,
            source: 'AGENT',
            timestamp: new Date()
        }
    });
};

/**
 * Get tracking history for an employee
 */
const getTrackingHistory = async (employeeId, params = {}) => {
    const { startDate, endDate } = params;
    
    return await prisma.tracking.findMany({
        where: {
            employeeId,
            timestamp: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
            }
        },
        orderBy: { timestamp: 'desc' }
    });
};

module.exports = {
    saveTracking,
    getTrackingHistory,
};
