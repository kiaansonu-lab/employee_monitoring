const analyticsService = require('./analytics.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const analyticsController = {
    getDashboard: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { startDate, endDate } = req.query;
            if (!organizationId) return successResponse(res, null, 'No organization found');
            const metrics = await analyticsService.getDashboardMetrics(organizationId, startDate, endDate);
            return successResponse(res, metrics, 'Dashboard metrics fetched');
        } catch (error) {
            console.error('[Analytics] getDashboard error:', error);
            return errorResponse(res, error.message);
        }
    },

    getTimeline: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { startDate, endDate } = req.query;
            if (!organizationId) return successResponse(res, [], 'No organization found');
            const timeline = await analyticsService.getTimeline(organizationId, startDate, endDate);
            return successResponse(res, timeline, 'Timeline fetched');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    getTopEmployees: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { startDate, endDate } = req.query;
            if (!organizationId) return successResponse(res, { topProductiveEmployees: [], topUnproductiveEmployees: [] }, 'No organization');
            const data = await analyticsService.getTopEmployees(organizationId, startDate, endDate);
            return successResponse(res, data, 'Top employees fetched');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    getTopTeams: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { startDate, endDate } = req.query;
            if (!organizationId) return successResponse(res, { topProductiveTeams: [], topUnproductiveTeams: [] }, 'No organization');
            const data = await analyticsService.getTopTeams(organizationId, startDate, endDate);
            return successResponse(res, data, 'Top teams fetched');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    getCategoryBreakdown: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { startDate, endDate } = req.query;
            if (!organizationId) return successResponse(res, [], 'No organization');
            const data = await analyticsService.getCategoryBreakdown(organizationId, startDate, endDate);
            return successResponse(res, data, 'Category breakdown fetched');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },
};

module.exports = analyticsController;
