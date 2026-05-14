const emailReportsService = require('./email-reports.service');
const { getOrganizationId } = require('../../utils/orgId');

exports.createReport = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        if (!organizationId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required' });
        }
        
        const report = await emailReportsService.createReport({ ...req.body, organizationId });
        res.status(201).json({ success: true, data: report });
    } catch (error) {
        console.error('Error creating email report:', error);
        res.status(500).json({ success: false, message: 'Failed to create email report' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        if (!organizationId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required' });
        }

        const reports = await emailReportsService.getReports(organizationId);
        res.json({ success: true, data: reports });
    } catch (error) {
        console.error('Error fetching email reports:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch email reports' });
    }
};

exports.updateReport = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const report = await emailReportsService.updateReport(req.params.id, req.body, organizationId);
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Error updating email report:', error);
        res.status(500).json({ success: false, message: 'Failed to update email report' });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        await emailReportsService.deleteReport(req.params.id, organizationId);
        res.json({ success: true, message: 'Email report deleted successfully' });
    } catch (error) {
        console.error('Error deleting email report:', error);
        res.status(500).json({ success: false, message: 'Failed to delete email report' });
    }
};
