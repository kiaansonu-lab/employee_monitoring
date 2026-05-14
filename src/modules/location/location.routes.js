const express = require('express');
const router = express.Router();
const locationController = require('./location.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/track', authMiddleware, locationController.track);
router.get('/live', authMiddleware, locationController.getLive);
// Maintain legacy /employee/:id and add new alias /:employeeId as requested by user
router.get('/employee/:id', authMiddleware, locationController.getHistory);
router.get('/:employeeId', authMiddleware, locationController.getHistory);

module.exports = router;
