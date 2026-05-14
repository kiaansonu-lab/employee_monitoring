const trackingService = require('./tracking.service');
const { successResponse, errorResponse } = require('../../utils/response');

const upload = async (req, res) => {
    try {
        const { employeeId, screenshotUrl, videoUrl, activityStatus, location } = req.body;
        
        const tracking = await trackingService.saveTracking({
            employeeId: employeeId || req.user?.employeeId,
            screenshotUrl,
            videoUrl,
            activityStatus,
            location
        });

        return successResponse(res, tracking, 'Tracking data uploaded');
    } catch (error) {
        console.error('Tracking upload error:', error);
        return errorResponse(res, error.message || 'Upload failed', 500);
    }
};

const getHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;
        
        const history = await trackingService.getTrackingHistory(employeeId, { startDate, endDate });
        return successResponse(res, history, 'Tracking history retrieved');
    } catch (error) {
        console.error('Get tracking history error:', error);
        return errorResponse(res, error.message || 'Failed to get history', 500);
    }
};

module.exports = {
    upload,
    getHistory,
};
