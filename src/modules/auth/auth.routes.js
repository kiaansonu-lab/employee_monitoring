const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const invitationController = require('./invitation.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/invitations/send', authMiddleware, invitationController.sendInvitation);
router.post('/invitations/complete', invitationController.completeInvitation);
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
