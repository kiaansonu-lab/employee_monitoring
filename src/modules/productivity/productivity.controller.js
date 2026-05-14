const productivityService = require('./productivity.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

const productivityController = {
    getApps: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { startDate, endDate, productivity } = req.query;
            let data = await productivityService.getAppsUsage(organizationId, startDate, endDate);
            if (productivity) {
                data = data.filter(a => a.productivity === productivity.toUpperCase());
            }
            return successResponse(res, data, 'App usage fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    // ── Tags ────────────────────────────────────────────────────────
    getTags: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const tags = await productivityService.getTags(organizationId);
            return successResponse(res, tags, 'Tags fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    createTag: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const tag = await productivityService.createTag(organizationId, req.body);
            return successResponse(res, tag, 'Tag created successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    updateTag: async (req, res) => {
        try {
            const { id } = req.params;
            const tag = await productivityService.updateTag(id, req.body);
            return successResponse(res, tag, 'Tag updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    deleteTag: async (req, res) => {
        try {
            const { id } = req.params;
            await productivityService.deleteTag(id);
            return successResponse(res, null, 'Tag deleted successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    // ── Rules ────────────────────────────────────────────────────────
    updateRule: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const rule = await productivityService.upsertRule(organizationId, req.body);
            return successResponse(res, rule, 'Rule updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },
};

module.exports = productivityController;
