const express = require('express');
const router = express.Router();
const organizationController = require('./organization.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// Public read access for authenticated users, but write only for ADMIN
router.get('/', authMiddleware, organizationController.getOrganization);

// Only ADMIN can create or update organization settings
router.post('/', authMiddleware, roleMiddleware('ADMIN'), organizationController.createOrganization);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), organizationController.updateOrganization);

module.exports = router;
