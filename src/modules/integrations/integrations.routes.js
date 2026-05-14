const express = require('express');
const router = express.Router();
const integrationsController = require('./integrations.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all configured integrations
router.get('/', integrationsController.getIntegrations);

// Configure (Create/Update) an integration
router.post('/:integrationId', integrationsController.configureIntegration);

// Disconnect (Delete) an integration
router.delete('/:integrationId', integrationsController.disconnectIntegration);

module.exports = router;
