const express = require('express');
const router = express.Router();
const monitoringController = require('./monitoring.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/online', monitoringController.getOnlineEmployees);
router.get('/live-feed', monitoringController.getLiveFeed);
router.get('/employee/:id', monitoringController.getEmployeeLiveData);

module.exports = router;
