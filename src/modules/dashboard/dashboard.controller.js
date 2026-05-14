const dashboardService = require('./dashboard.service');

const getAdminDashboard = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const data = await dashboardService.getAdminDashboard(organizationId, startDate, endDate);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getManagerDashboard = async (req, res) => {
  try {
    const { organizationId, teamId, role } = req.user;
    const { startDate, endDate } = req.query;
    if (role !== 'MANAGER') {
      return res.status(403).json({ message: 'Forbidden: Manager access required' });
    }
    const data = await dashboardService.getManagerDashboard(organizationId, teamId, startDate, endDate);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeeDashboard = async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const { startDate, endDate } = req.query;
    const data = await dashboardService.getEmployeeDashboard(organizationId, employeeId, startDate, endDate);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getEmployeeDashboard
};
