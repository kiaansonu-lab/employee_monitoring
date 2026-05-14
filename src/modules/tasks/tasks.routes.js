const express = require('express');
const router = express.Router();
const tasksController = require('./tasks.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', tasksController.createTask);
router.get('/', tasksController.getTasks);
router.get('/board', tasksController.getBoardTasks);
router.patch('/:id/status', tasksController.updateTaskStatus);
router.patch('/:id', tasksController.updateTask);
router.delete('/:id', tasksController.deleteTask);

module.exports = router;
