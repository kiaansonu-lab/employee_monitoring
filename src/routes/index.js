const express = require('express');
const router = express.Router();
const authRoutes = require('../modules/auth/auth.routes');
const organizationRoutes = require('../modules/organization/organization.routes');
const teamsRoutes = require('../modules/teams/teams.routes');
const employeesRoutes = require('../modules/employees/employees.routes');
const activityRoutes = require('../modules/activity/activity.routes');
const screenshotsRoutes = require('../modules/screenshots/screenshots.routes');
const analyticsRoutes = require('../modules/analytics/analytics.routes');
const productivityRoutes = require('../modules/productivity/productivity.routes');
const attendanceRoutes = require('../modules/attendance/attendance.routes');
const projectsRoutes = require('../modules/projects/projects.routes');
const tasksRoutes = require('../modules/tasks/tasks.routes');
const locationRoutes = require('../modules/location/location.routes');
const reportsRoutes = require('../modules/reports/reports.routes');
const payrollRoutes = require('../modules/payroll/payroll.routes');
const monitoringRoutes = require('../modules/monitoring/monitoring.routes');
const complianceRoutes = require('../modules/compliance/compliance.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const alertsRoutes = require('../modules/alerts/alerts.routes');
const emailReportsRoutes = require('../modules/email-reports/email-reports.routes');
const integrationsRoutes = require('../modules/integrations/integrations.routes');
const trackingRoutes = require('../modules/tracking/tracking.routes');
const agentRoutes = require('../modules/agent/agent.routes');
const goalsRoutes = require('../modules/goals/goals.routes');
const { successResponse } = require('../utils/response');

// Routes
router.use('/auth', authRoutes);
router.use('/organization', organizationRoutes);
router.use('/teams', teamsRoutes);
router.use('/employees', employeesRoutes);
router.use('/activity', activityRoutes);
router.use('/screenshots', screenshotsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/productivity', productivityRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/location', locationRoutes);
router.use('/reports', reportsRoutes);
router.use('/payroll', payrollRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/compliance', complianceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/alerts', alertsRoutes);
router.use('/email-reports', emailReportsRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/tracking', trackingRoutes);
router.use('/agent', agentRoutes);
router.use('/goals', goalsRoutes);

router.get('/health', (req, res) => {
    return successResponse(res, null, 'Backend Running', 200);
});

module.exports = router;

