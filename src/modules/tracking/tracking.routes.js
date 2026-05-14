const express = require('express');
const router = express.Router();
const trackingController = require('./tracking.controller');
const authenticate = require('../../middlewares/auth');

// Agent uploads (authenticated if possible, but agent might just send employeeId)
router.post('/upload', authenticate, trackingController.upload);

// Admin/Manager views history
router.get('/history/:employeeId', authenticate, trackingController.getHistory);

module.exports = router;
