const reportsService = require('./reports.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const getReportData = async (req, res) => {
    try {
        const { type, userId, teamId } = req.query;
        const organizationId = await getOrganizationId(req);
        const parseStart = (value) => {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return new Date(new Date().setDate(new Date().getDate() - 7));
            d.setHours(0, 0, 0, 0);
            return d;
        };
        const parseEnd = (value) => {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return new Date();
            d.setHours(23, 59, 59, 999);
            return d;
        };
        const startDate = req.query.startDate ? parseStart(req.query.startDate) : parseStart(new Date());
        const endDate = req.query.endDate ? parseEnd(req.query.endDate) : parseEnd(new Date());

        const params = { userId, teamId };
        const isAdminView = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
        const reportOptions = { maskNames: !isAdminView };

        let data;
        switch (type) {
            case 'work-type':
                data = await reportsService.getWorkTypeByCategory(organizationId, startDate, endDate, params);
                break;
            case 'work-type-tags':
                data = await reportsService.getWorkTypeByTags(organizationId, startDate, endDate, params);
                break;
            case 'apps-websites':
                data = await reportsService.getAppsReport(organizationId, startDate, endDate, params);
                break;
            case 'adherence':
                data = await reportsService.getAdherenceReport(organizationId, startDate, endDate, params, reportOptions);
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
