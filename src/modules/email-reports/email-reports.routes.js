const express = require('express');
const router = express.Router();
const emailReportsController = require('./email-reports.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', emailReportsController.createReport);
router.get('/', emailReportsController.getReports);
router.put('/:id', emailReportsController.updateReport);
router.delete('/:id', emailReportsController.deleteReport);

module.exports = router;
