const tasksService = require('./tasks.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');

class TasksController {
    async createTask(req, res) {
        try {
            const organizationId = await getOrganizationId(req);
            const task = await tasksService.createTask(req.body, organizationId);
            return successResponse(res, task, 'Task created successfully', 201);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async getTasks(req, res) {
        try {
            const organizationId = await getOrganizationId(req);
            let { role, employeeId, userId } = req.user;
            const queryEmployeeId = req.query.employeeId;
            
            // Priority 1: Query param override (requested by user)
            // Priority 2: Token employeeId
            // Priority 3: Database lookup via userId
            let effectiveEmployeeId = (queryEmployeeId && queryEmployeeId !== 'null' && queryEmployeeId !== 'undefined') ? queryEmployeeId : employeeId;

            if (!effectiveEmployeeId && role === 'EMPLOYEE') {
                const user = await require('../../config/db').user.findUnique({
                    where: { id: userId },
                    select: { employeeId: true }
                });
                effectiveEmployeeId = user?.employeeId;
            }

            console.log(`[TasksController] Role: ${role}, Org: ${organizationId}, Resolved Emp: ${effectiveEmployeeId}`);

            let filter = {};
            if (role === 'EMPLOYEE' || (queryEmployeeId && queryEmployeeId !== 'null')) {
                filter.employeeId = effectiveEmployeeId;
            }

            const tasks = await tasksService.getTasks(organizationId, filter);
            return successResponse(res, tasks, 'Tasks retrieved successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async getBoardTasks(req, res) {
        try {
            const organizationId = await getOrganizationId(req);
            let { role, employeeId, userId } = req.user;
            const queryEmployeeId = req.query.employeeId;
            
            let effectiveEmployeeId = (queryEmployeeId && queryEmployeeId !== 'null' && queryEmployeeId !== 'undefined') ? queryEmployeeId : employeeId;

            if (!effectiveEmployeeId && role === 'EMPLOYEE') {
                const user = await require('../../config/db').user.findUnique({
                    where: { id: userId },
                    select: { employeeId: true }
                });
                effectiveEmployeeId = user?.employeeId;
            }
            
            let filter = {};
            if (role === 'EMPLOYEE' || (queryEmployeeId && queryEmployeeId !== 'null')) {
                filter.employeeId = effectiveEmployeeId;
            }

            const board = await tasksService.getBoardTasks(organizationId, filter);
            return successResponse(res, board, 'Board tasks retrieved successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async updateTask(req, res) {
        try {
            const { id } = req.params;
            const task = await tasksService.updateTask(id, req.body);
            return successResponse(res, task, 'Task updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async updateTaskStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const task = await tasksService.updateTaskStatus(id, status);
            return successResponse(res, task, 'Task status updated successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async deleteTask(req, res) {
        try {
            if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
                return res.status(403).json({ success: false, message: "Only admins and managers can delete tasks" });
            }
            const { id } = req.params;
            await tasksService.deleteTask(id);
            return successResponse(res, null, 'Task deleted successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
}

module.exports = new TasksController();
