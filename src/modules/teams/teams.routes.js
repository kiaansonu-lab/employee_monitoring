const express = require('express');
const router = express.Router();
const teamsController = require('./teams.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.get('/', authMiddleware, teamsController.getTeams);
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), teamsController.createTeam);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), teamsController.updateTeam);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), teamsController.deleteTeam);

module.exports = router;
