const express = require('express');
const router = express.Router();
const complianceController = require('./compliance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// All routes are protected by authMiddleware
router.use(authMiddleware);

// Get compliance settings - Admin and Manager can see
router.get('/settings', complianceController.getSettings);

// Update compliance settings - Admin only
router.post('/settings', roleMiddleware(['ADMIN']), complianceController.updateSettings);

// Get audit logs - Admin and Manager can see
router.get('/audit-logs', complianceController.getAuditLogs);

module.exports = router;
