const prisma = require('../../config/db');

class ScreenshotSettingsService {
    async getSettings(organizationId) {
        let settings = await prisma.screenshotSetting.findUnique({
            where: { organizationId }
        });

        // Initialize default settings if they don't exist
        if (!settings) {
            settings = await prisma.screenshotSetting.create({
                data: {
                    organizationId,
                    randomShifts: false,
                    excludeAdmin: true,
                    globalBlur: false,
                    frequency: 5
                }
            });
        }

        return settings;
    }

    async updateSettings(organizationId, data) {
        const { randomShifts, excludeAdmin, globalBlur, frequency } = data;

        return await prisma.screenshotSetting.upsert({
            where: { organizationId },
            update: {
                randomShifts,
                excludeAdmin,
                globalBlur,
                frequency: parseInt(frequency) || 5
            },
            create: {
                organizationId,
                randomShifts,
                excludeAdmin,
                globalBlur,
                frequency: parseInt(frequency) || 5
            }
        });
    }
}

module.exports = new ScreenshotSettingsService();
