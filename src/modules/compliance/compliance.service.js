const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createAuditLog } = require('../../utils/audit.util');

class ComplianceService {
    async getSettings(organizationId) {
        let settings = await prisma.complianceSetting.findUnique({
            where: { organizationId }
        });

        if (!settings) {
            // Create default settings if they don't exist
            settings = await prisma.complianceSetting.create({
                data: {
                    organizationId,
                    gdprEnabled: true,
                    activityMonitoring: true,
                    locationTracking: true
                }
            });
        }

        return settings;
    }

    async updateSettings(organizationId, userId, data, ipAddress) {
        const updatedSettings = await prisma.complianceSetting.upsert({
            where: { organizationId },
            update: {
                gdprEnabled: data.gdprEnabled,
                activityMonitoring: data.activityMonitoring,
                locationTracking: data.locationTracking,
                showUrlsInActivityLogs: data.showUrlsInActivityLogs,
                blurLevel: data.blurLevel,
                saveOriginalScreenshots: data.saveOriginalScreenshots,
                collectPHI: data.collectPHI
            },
            create: {
                organizationId,
                gdprEnabled: data.gdprEnabled,
                activityMonitoring: data.activityMonitoring,
                locationTracking: data.locationTracking,
                showUrlsInActivityLogs: data.showUrlsInActivityLogs,
                blurLevel: data.blurLevel,
                saveOriginalScreenshots: data.saveOriginalScreenshots,
                collectPHI: data.collectPHI
            }
        });

        // Create audit log for policy update
        await createAuditLog({
            organizationId,
            userId,
            action: 'Updated Monitoring Policy',
            status: 'Success',
            ipAddress,
            metadata: data
        });

        return updatedSettings;
    }

    async getAuditLogs(organizationId, search = '') {
        const whereClause = {
            organizationId,
        };

        if (search) {
            whereClause.OR = [
                { action: { contains: search } },
                { status: { contains: search } },
                { user: { fullName: { contains: search } } },
                { user: { email: { contains: search } } }
            ];
        }

        return await prisma.auditLog.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        fullName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
}

module.exports = new ComplianceService();
