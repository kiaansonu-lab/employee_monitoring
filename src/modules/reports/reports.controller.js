const reportsService = require('./reports.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const getReportData = async (req, res) => {
    try {
        const { type, userId, teamId } = req.query;
        const organizationId = await getOrganizationId(req);
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

        const params = { userId, teamId };

        let data;
        switch (type) {
            case 'work-type':
                data = await reportsService.getWorkTypeReport(organizationId, startDate, endDate, params);
                break;
            case 'apps-websites':
                data = await reportsService.getAppsReport(organizationId, startDate, endDate, params);
                break;
            case 'adherence':
                data = await reportsService.getAdherenceReport(organizationId, startDate, endDate, params);
                break;
            case 'location':
                data = await reportsService.getLocationInsights(organizationId, startDate, endDate, params);
                break;
            case 'workload':
                data = await reportsService.getWorkloadReport(organizationId, startDate, endDate, params);
                break;
            default:
                return errorResponse(res, 'Invalid report type', 400);
        }

        return successResponse(res, data, `${type} report retrieved`);
    } catch (error) {
        console.error(`Error fetching ${req.query.type} report:`, error);
        return errorResponse(res, error.message);
    }
};

module.exports = {
    getReportData
};
