const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all integrations for an organization
 */
const getIntegrations = async (organizationId) => {
    return await prisma.integration.findMany({
        where: { organizationId }
    });
};

/**
 * Upsert (Create or Update) an integration
 */
const upsertIntegration = async (organizationId, integrationId, connected, config) => {
    return await prisma.integration.upsert({
        where: {
            organizationId_integrationId: {
                organizationId,
                integrationId
            }
        },
        update: {
            connected,
            config: config || {}
        },
        create: {
            organizationId,
            integrationId,
            connected,
            config: config || {}
        }
    });
};

/**
 * Disconnect/Delete an integration
 */
const disconnectIntegration = async (organizationId, integrationId) => {
    return await prisma.integration.delete({
        where: {
            organizationId_integrationId: {
                organizationId,
                integrationId
            }
        }
    });
};

module.exports = {
    getIntegrations,
    upsertIntegration,
    disconnectIntegration
};
