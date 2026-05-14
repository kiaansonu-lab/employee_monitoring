const express = require('express');
const router = express.Router();
const projectsController = require('./projects.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// All project routes require authentication
router.use(authMiddleware);

router.post('/', projectsController.createProject);
router.get('/', projectsController.getProjects);
router.post('/assign', projectsController.assignEmployees);
router.post('/log-time', projectsController.logTime);
router.put('/:id', projectsController.updateProject);
router.delete('/:id', projectsController.deleteProject);

module.exports = router;
