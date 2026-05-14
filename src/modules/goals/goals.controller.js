const goalsService = require('./goals.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

class GoalsController {
    async createGoal(req, res) {
        try {
            const organizationId = await getOrganizationId(req);
            const goal = await goalsService.createGoal(req.body, organizationId);
            return successResponse(res, goal, 'Goal created successfully', 201);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async getGoals(req, res) {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId } = req.user;
            let filter = {};

            // Admin and Manager can see all goals in the organization
            // Employees only see goals they are stakeholders of
            if (role === 'EMPLOYEE') {
                filter.stakeholders = {
                    some: {
                        employeeId: employeeId
                    }
                };
            }

            const goals = await goalsService.getGoals(organizationId, filter);
            return successResponse(res, goals, 'Goals retrieved successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async updateGoal(req, res) {
        try {
            const { id } = req.params;
            const goal = await goalsService.updateGoal(id, req.body);
            return successResponse(res, goal, 'Goal updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async deleteGoal(req, res) {
        try {
            if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
                return res.status(403).json({ success: false, message: "Only admins and managers can delete goals" });
            }
            const { id } = req.params;
            await goalsService.deleteGoal(id);
            return successResponse(res, null, 'Goal deleted successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async addActivity(req, res) {
        try {
            const { id } = req.params;
            const activity = await goalsService.addActivity(id, req.body);
            return successResponse(res, activity, 'Activity added successfully', 201);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
}

module.exports = new GoalsController();
