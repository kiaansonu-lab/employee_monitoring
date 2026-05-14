const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/timeline', analyticsController.getTimeline);
router.get('/top-employees', analyticsController.getTopEmployees);
router.get('/top-teams', analyticsController.getTopTeams);
router.get('/category-breakdown', analyticsController.getCategoryBreakdown);

module.exports = router;
