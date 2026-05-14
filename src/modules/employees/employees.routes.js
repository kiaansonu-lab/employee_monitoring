const express = require('express');
const router = express.Router();
const employeesController = require('./employees.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.get('/', authMiddleware, employeesController.getEmployees);
router.get('/:id', authMiddleware, employeesController.getEmployeeById);
router.post('/invite', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), employeesController.inviteEmployee);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), employeesController.updateEmployee);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), employeesController.deleteEmployee);

module.exports = router;
