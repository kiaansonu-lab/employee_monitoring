const locationService = require('./location.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const track = async (req, res) => {
    try {
        const { latitude, longitude, accuracy, source } = req.body;
        const employeeId = req.user.employeeId;

        if (!employeeId) {
            return errorResponse(res, 'Employee profile not found for this user', 400);
        }

        const organizationId = await getOrganizationId(req);

        const result = await locationService.trackLocation({
            employeeId,
            organizationId,
            latitude,
            longitude,
            accuracy,
            source
        });

        return successResponse(res, result, 'Location tracked successfully');
    } catch (error) {
        console.error('Error tracking location:', error);
        return errorResponse(res, error.message);
    }
};

const getHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await locationService.getLocationHistory(id);
        return successResponse(res, history, 'Location history retrieved');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

const getLive = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const liveLocations = await locationService.getLiveLocations(organizationId);
        return successResponse(res, liveLocations, 'Live locations retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

module.exports = {
    track,
    getHistory,
    getLive
};
