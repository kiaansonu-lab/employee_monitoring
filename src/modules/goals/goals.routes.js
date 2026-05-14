const express = require('express');
const router = express.Router();
const goalsController = require('./goals.controller');
const authMiddleware = require('../../middlewares/auth');

// Apply auth middleware to all goal routes
router.use(authMiddleware);

router.post('/', goalsController.createGoal);
router.get('/', goalsController.getGoals);
router.put('/:id', goalsController.updateGoal);
router.delete('/:id', goalsController.deleteGoal);
router.post('/:id/activities', goalsController.addActivity);

module.exports = router;
