const express = require('express');
const router = express.Router();
const screenshotSettingsController = require('./screenshotSettings.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// All screenshot settings routes require authentication
router.use(authMiddleware);

router.get('/', screenshotSettingsController.getSettings);
router.patch('/', screenshotSettingsController.updateSettings);

module.exports = router;
