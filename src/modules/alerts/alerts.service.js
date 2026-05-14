const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const alertsService = {
    getAlertRules: async (organizationId, type) => {
        return await prisma.alertRule.findMany({
            where: {
                organizationId,
                type
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    },

    createAlertRule: async (data) => {
        return await prisma.alertRule.create({
            data
        });
    },

    updateAlertRule: async (id, data) => {
        return await prisma.alertRule.update({
            where: { id },
            data
        });
    },

    deleteAlertRule: async (id) => {
        return await prisma.alertRule.delete({
            where: { id }
        });
    },

    getAlertSettings: async (organizationId) => {
        let settings = await prisma.alertSettings.findUnique({
            where: { organizationId }
        });

        if (!settings) {
            settings = await prisma.alertSettings.create({
                data: { organizationId }
            });
        }

        return settings;
    },

    updateAlertSettings: async (organizationId, updates) => {
        return await prisma.alertSettings.upsert({
            where: { organizationId },
            update: updates,
            create: {
                ...updates,
                organizationId
            }
        });
    }
};

module.exports = alertsService;
