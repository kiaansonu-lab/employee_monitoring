const express = require('express');
const router = express.Router();
const attendanceController = require('./attendance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);
router.get('/timesheets', attendanceController.getTimesheets);
router.post('/manual-time', attendanceController.addManualTime);
router.get('/manual-time', attendanceController.getManualTimes);
router.get('/shifts', attendanceController.getShifts);
router.post('/shifts', attendanceController.createShift);
router.get('/time-off', attendanceController.getTimeOffs);
router.post('/time-off', attendanceController.createTimeOff);
router.post('/start-break', attendanceController.startBreak);
router.post('/end-break', attendanceController.endBreak);

module.exports = router;
