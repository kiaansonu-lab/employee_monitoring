const prisma = require('../../config/db');
const { deleteImageByUrl } = require('../../utils/imageStorage');

class ScreenshotsService {
    async createScreenshot(data) {
        return await prisma.screenshot.create({
            data
        });
    }

    async getScreenshots(where, limit = 50, offset = 0) {
        return await prisma.screenshot.findMany({
            where,
            take: limit,
            skip: offset,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        team: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: {
                capturedAt: 'desc'
            }
        });
    }

    async getScreenshotById(id) {
        return await prisma.screenshot.findUnique({
            where: { id },
            include: {
                employee: true
            }
        });
    }

    async toggleBlur(id) {
        const screenshot = await prisma.screenshot.findUnique({
            where: { id }
        });

        if (!screenshot) return null;

        return await prisma.screenshot.update({
            where: { id },
            data: {
                blurred: !screenshot.blurred
            }
        });
    }

    /**
     * Hard-delete a screenshot permanently (Admin/Manager only)
     * Also removes the physical image file from disk
     */
    async deleteScreenshot(id) {
        const screenshot = await prisma.screenshot.findUnique({ where: { id } });
        if (!screenshot) return null;

        // Delete backing image (local file or cloud object)
        await deleteImageByUrl(screenshot.imageUrl);

        return await prisma.screenshot.delete({ where: { id } });
    }

    /**
     * Soft-delete for employee: marks deletedByEmployee = true
     * Screenshot remains visible to Admin/Manager
     */
    async softDeleteForEmployee(id) {
        return await prisma.screenshot.update({
            where: { id },
            data: { deletedByEmployee: true }
        });
    }

    /**
     * Bulk delete screenshots from disk and database
     */
    async bulkDeleteScreenshots(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };

        const screenshots = await prisma.screenshot.findMany({
            where: { id: { in: ids } }
        });

        // Delete backing files/objects
        for (const ss of screenshots) {
            await deleteImageByUrl(ss.imageUrl);
        }

        // Delete database records
        return await prisma.screenshot.deleteMany({
            where: { id: { in: ids } }
        });
    }

    /**
     * Get all screenshots for a specific employee on a specific date for playback
     * Ordered by capture time
     */
    async getEmployeePlaybackScreenshots(employeeId, dateStr) {
        const start = new Date(dateStr);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(dateStr);
        end.setHours(23, 59, 59, 999);

        return await prisma.screenshot.findMany({
            where: {
                employeeId,
                capturedAt: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: {
                capturedAt: 'asc'
            }
        });
    }
}

module.exports = new ScreenshotsService();
