const express = require('express');
const router = express.Router();
const productivityController = require('./productivity.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.use(authMiddleware);

// Apps & Usage
router.get('/apps', productivityController.getApps);

// Tags Management
router.get('/tags', productivityController.getTags);
router.post('/tags', roleMiddleware(['ADMIN', 'MANAGER']), productivityController.createTag);
router.put('/tags/:id', roleMiddleware(['ADMIN', 'MANAGER']), productivityController.updateTag);
router.delete('/tags/:id', roleMiddleware(['ADMIN', 'MANAGER']), productivityController.deleteTag);

// Rule/Label Assignment
router.post('/rules', roleMiddleware(['ADMIN', 'MANAGER']), productivityController.updateRule);

module.exports = router;
