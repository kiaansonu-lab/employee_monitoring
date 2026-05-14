const payrollService = require('./payroll.service');
const { getOrganizationId } = require('../../utils/orgId');
const { successResponse, errorResponse } = require('../../utils/response');

const getPayrollSummary = async (req, res) => {
    try {
        const { userId, teamId, startDate, endDate } = req.query;
        const organizationId = await getOrganizationId(req);
        
        const params = { userId, teamId, startDate, endDate };
        const summary = await payrollService.getPayrollSummary(organizationId, params);
        return successResponse(res, summary, 'Payroll summary retrieved successfully');
    } catch (error) {
        console.error('Error fetching payroll summary:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

const getPayrollRecords = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const { userId, teamId, startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();

        const params = { userId, teamId };
        const records = await payrollService.getPayrollRecords(organizationId, start, end, params);
        return successResponse(res, records, 'Payroll records retrieved successfully');
    } catch (error) {
        console.error('Error fetching payroll records:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

module.exports = {
    getPayrollSummary,
    getPayrollRecords
};
