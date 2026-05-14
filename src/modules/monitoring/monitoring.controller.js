const monitoringService = require('./monitoring.service');
const { getOrganizationId } = require('../../utils/orgId');
const { successResponse, errorResponse } = require('../../utils/response');

const getOnlineEmployees = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const employees = await monitoringService.getOnlineEmployees(organizationId);
        return successResponse(res, employees, 'Online employees retrieved successfully');
    } catch (error) {
        console.error('Error fetching online employees:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

const getLiveFeed = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const { limit } = req.query;
        const feed = await monitoringService.getLiveFeed(organizationId, limit ? parseInt(limit) : 20);
        return successResponse(res, feed, 'Live feed retrieved successfully');
    } catch (error) {
        console.error('Error fetching live feed:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

const getEmployeeLiveData = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await monitoringService.getEmployeeLiveData(id);
        return successResponse(res, data, 'Employee live data retrieved successfully');
    } catch (error) {
        console.error('Error fetching employee live data:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

module.exports = {
    getOnlineEmployees,
    getLiveFeed,
    getEmployeeLiveData
};
