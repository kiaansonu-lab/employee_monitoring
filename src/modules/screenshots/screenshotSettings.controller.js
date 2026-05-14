const screenshotSettingsService = require('./screenshotSettings.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

class ScreenshotSettingsController {
    async getSettings(req, res) {
        try {
            const organizationId = await getOrganizationId(req);
            const settings = await screenshotSettingsService.getSettings(organizationId);
            return successResponse(res, settings, 'Screenshot settings retrieved successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async updateSettings(req, res) {
        try {
            const organizationId = await getOrganizationId(req);
            const settings = await screenshotSettingsService.updateSettings(organizationId, req.body);
            return successResponse(res, settings, 'Screenshot settings updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
}

module.exports = new ScreenshotSettingsController();
