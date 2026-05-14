const express = require('express');
const router = express.Router();
const agentController = require('./agent.controller');
const authenticate = require('../../middlewares/auth');
const { verifyToken } = require('../../utils/jwt');
const { errorResponse } = require('../../utils/response');

// Custom middleware to handle both JWT (Manager/Admin) and Agent-specific Base64 tokens
const combinedAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) return errorResponse(res, 'Authentication required', 401);

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    // 1. Try Agent Token (Base64)
    try {
        const decoded = Buffer.from(token, 'base64').toString('ascii');
        if (decoded.includes('INSIGHTFUL')) {
            const [empId, devId] = decoded.split(':');
            req.user = { employeeId: empId, deviceId: devId, role: 'AGENT' };
            return next();
        }
    } catch (e) {
        // Not a base64 agent token, continue to JWT
    }

    // 2. Try JWT Token
    const user = verifyToken(token);
    if (user) {
        req.user = user;
        return next();
    }

    return errorResponse(res, 'Invalid or expired token', 401);
};

// Public routes
router.get('/download', agentController.downloadAgent);
router.post('/register', agentController.register);
router.get('/check-device/:deviceId', agentController.checkDevice);
router.post('/heartbeat', agentController.heartbeat);
router.post('/activity', agentController.logActivity);
router.post('/stop-tracking', agentController.stopTracking);

// Authenticated status and management
router.get('/status', combinedAuth, agentController.getStatus);
router.get('/status/:employeeId', combinedAuth, agentController.getStatus);
router.get('/list', authenticate, agentController.listAgents);

// Admin/Manager only management routes
router.patch('/status/:id', authenticate, agentController.updateStatus);
router.patch('/:id', authenticate, agentController.update);
router.delete('/:id', authenticate, agentController.remove);

module.exports = router;
