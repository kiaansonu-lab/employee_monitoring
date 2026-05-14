const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/admin', roleMiddleware(['ADMIN']), dashboardController.getAdminDashboard);
router.get('/manager', roleMiddleware(['MANAGER']), dashboardController.getManagerDashboard);
router.get('/me', dashboardController.getEmployeeDashboard);

module.exports = router;
