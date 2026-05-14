const integrationsService = require('./integrations.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

/**
 * Get all integrations for the current user's organization
 */
const getIntegrations = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        if (!organizationId) {
            return errorResponse(res, 'Organization ID is missing', 400);
        }

        const integrations = await integrationsService.getIntegrations(organizationId);

        // Transform array into an object format expected by the frontend
        const result = {};
        integrations.forEach(i => {
            result[i.integrationId] = {
                connected: i.connected,
                config: i.config
            };
        });

        return successResponse(res, result, 'Integrations fetched successfully');
    } catch (error) {
        console.error('Error fetching integrations:', error);
        return errorResponse(res, 'Failed to fetch integrations', 500);
    }
};

/**
 * Configure/Create an integration
 */
const configureIntegration = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const { integrationId } = req.params;
        const { config } = req.body;

        if (!organizationId) {
            return errorResponse(res, 'Organization ID is missing', 400);
        }

        const integration = await integrationsService.upsertIntegration(
            organizationId,
            integrationId,
            true, // connected
            config
        );

        return successResponse(res, integration, 'Integration configured successfully');
    } catch (error) {
        console.error('Error configuring integration:', error);
        return errorResponse(res, 'Failed to configure integration', 500);
    }
};

/**
 * Disconnect/Delete an integration
 */
const disconnectIntegration = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const { integrationId } = req.params;

        if (!organizationId) {
            return errorResponse(res, 'Organization ID is missing', 400);
        }

        await integrationsService.disconnectIntegration(organizationId, integrationId);

        return successResponse(res, null, 'Integration disconnected successfully');
    } catch (error) {
        console.error('Error disconnecting integration:', error);
        // It might fail if record does not exist, but we can treat as success
        return successResponse(res, null, 'Integration disconnected successfully');
    }
};

module.exports = {
    getIntegrations,
    configureIntegration,
    disconnectIntegration
};
