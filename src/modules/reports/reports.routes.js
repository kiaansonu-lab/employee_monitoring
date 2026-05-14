const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/', authMiddleware, reportsController.getReportData);

module.exports = router;
