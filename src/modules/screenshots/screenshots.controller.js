const screenshotsService = require('./screenshots.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');
const prisma = require('../../config/db');
const { uploadImageBuffer } = require('../../utils/imageStorage');

const screenshotsController = {
    // POST /api/screenshots
    createScreenshot: async (req, res) => {
        try {
            const { employeeId, productivity, capturedAt } = req.body;
            let { imageUrl } = req.body; // Falback if they still send URL directly
            const organizationId = await getOrganizationId(req);

            if (!employeeId) {
                return errorResponse(res, 'employeeId is required', 400);
            }

            if (!imageUrl && !req.file) {
                 return errorResponse(res, 'imageUrl or image file is required', 400);
            }

            // If an image file was uploaded, process it
            if (req.file) {
                // Compress image and store in Cloudinary (or local fallback)
                const shouldBlur = req.body.blurred === 'true';
                const uploadResult = await uploadImageBuffer(req.file.buffer, {
                    format: 'webp',
                    quality: 80,
                    blur: shouldBlur,
                    folder: `insightful/screenshots/${organizationId}`,
                    fileNamePrefix: `manual_${employeeId}`
                });
                imageUrl = uploadResult.imageUrl;
            }

            const screenshot = await screenshotsService.createScreenshot({
                employeeId,
                organizationId,
                imageUrl,
                productivity: productivity || 'NEUTRAL',
                blurred: req.body.blurred === 'true',
                capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
            });

            return successResponse(res, screenshot, 'Screenshot captured successfully');
        } catch (error) {
            console.error('Error creating screenshot:', error);
            return errorResponse(res, error.message);
        }
    },

    // GET /api/screenshots
    getScreenshots: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId: userId } = req.user;
            const { employeeId, date, productivity, limit = 50, offset = 0 } = req.query;

            let where = { organizationId };

            // Role-based filtering
            if (role === 'EMPLOYEE') {
                // Employee can only see own screenshots (and only non-soft-deleted ones)
                where.employeeId = userId;
                where.deletedByEmployee = false;
            } else if (role === 'MANAGER') {
                // Manager can see all screenshots in organization
                where.organizationId = organizationId;
            }
            // ADMIN sees all - no extra filter needed

            // Additional query filters
            if (employeeId && role !== 'EMPLOYEE') {
                where.employeeId = employeeId;
            }

            if (productivity) {
                where.productivity = productivity.toUpperCase();
            }

            if (date) {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                where.capturedAt = { gte: start, lte: end };
            }

            const parsedLimit = parseInt(limit, 10) || 50;
            const parsedOffset = parseInt(offset, 10) || 0;

            const screenshots = await screenshotsService.getScreenshots(where, parsedLimit, parsedOffset);

            return successResponse(res, screenshots, 'Screenshots fetched successfully');
        } catch (error) {
            console.error('Error fetching screenshots:', error);
            return errorResponse(res, error.message);
        }
    },

    // GET /api/screenshots/employee/:employeeId
    getEmployeeScreenshots: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { date, limit = 50, offset = 0 } = req.query;
            const organizationId = await getOrganizationId(req);
            const { role } = req.user;

            let where = { employeeId, organizationId };

            if (date) {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                where.capturedAt = { gte: start, lte: end };
            }

            const parsedLimit = parseInt(limit, 10) || 50;
            const parsedOffset = parseInt(offset, 10) || 0;

            const screenshots = await screenshotsService.getScreenshots(where, parsedLimit, parsedOffset);
            return successResponse(res, screenshots, 'Employee screenshots fetched');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    // PATCH /api/screenshots/:id/blur
    toggleBlur: async (req, res) => {
        try {
            const { id } = req.params;
            const screenshot = await screenshotsService.toggleBlur(id);

            if (!screenshot) {
                return errorResponse(res, 'Screenshot not found', 404);
            }

            return successResponse(res, screenshot, `Screenshot ${screenshot.blurred ? 'blurred' : 'unblurred'} successfully`);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    // DELETE /api/screenshots/:id
    deleteScreenshot: async (req, res) => {
        try {
            const { id } = req.params;
            const { role, employeeId: userId } = req.user;

            // Find screenshot first
            const screenshot = await screenshotsService.getScreenshotById(id);

            if (!screenshot) {
                return errorResponse(res, 'Screenshot not found', 404);
            }

            if (role === 'EMPLOYEE') {
                // Employee can only soft-delete their OWN screenshots
                if (screenshot.employeeId !== userId) {
                    return errorResponse(res, 'Forbidden: You can only delete your own screenshots', 403);
                }
                await screenshotsService.softDeleteForEmployee(id);
                return successResponse(res, null, 'Screenshot hidden from your view');
            }

            // ADMIN or MANAGER: hard-delete permanently from database
            if (role === 'ADMIN' || role === 'MANAGER') {
                await screenshotsService.deleteScreenshot(id);
                return successResponse(res, null, 'Screenshot permanently deleted');
            }

            return errorResponse(res, 'Forbidden', 403);
        } catch (error) {
            console.error('Error deleting screenshot:', error);
            return errorResponse(res, error.message);
        }
    },

    // POST /api/screenshots/bulk-delete
    bulkDelete: async (req, res) => {
        try {
            const { ids } = req.body;
            const { role } = req.user;

            if (role !== 'ADMIN' && role !== 'MANAGER') {
                return errorResponse(res, 'Forbidden: Only Admins/Managers can bulk delete', 403);
            }

            if (!ids || !Array.isArray(ids)) {
                return errorResponse(res, 'IDs array is required', 400);
            }

            const result = await screenshotsService.bulkDeleteScreenshots(ids);
            return successResponse(res, result, `${result.count} screenshots deleted successfully`);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    },

    // GET /api/screenshots/playback/:employeeId
    getPlaybackScreenshots: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { date } = req.query;

            if (!date) {
                return errorResponse(res, 'Date is required for playback', 400);
            }

            const screenshots = await screenshotsService.getEmployeePlaybackScreenshots(employeeId, date);
            return successResponse(res, screenshots, 'Playback screenshots fetched successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
};

module.exports = screenshotsController;
