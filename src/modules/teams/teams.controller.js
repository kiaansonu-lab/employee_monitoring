const teamsService = require('./teams.service');
const { createTeamSchema, updateTeamSchema } = require('./teams.validation');
const { getOrganizationId } = require('../../utils/orgId');

const getTeams = async (req, res, next) => {
    try {
        const orgId = await getOrganizationId(req);
        const { role, employeeId: currentEmployeeId } = req.user;

        if (!orgId) {
            console.error(`[TeamsController] No organizationId found for user: ${req.user.userId}`);
            return res.status(400).json({ success: false, message: "Organization ID is required" });
        }

        let filter = {};
        if (role === 'EMPLOYEE') {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const teams = await teamsService.getTeams(orgId, filter);

        // Map to industry/insightful format
        const formattedTeams = teams.map(team => ({
            id: team.id,
            name: team.name,
            description: team.description,
            color: team.color,
            memberCount: team._count.employees,
            onlineCount: team.employees.filter(e => e.status === 'ACTIVE').length, // Simplified online check
            productivity: 85, // Placeholder for metric calculation
            organizationId: team.organizationId
        }));

        res.status(200).json({
            success: true,
            data: formattedTeams
        });
    } catch (error) {
        next(error);
    }
};

const createTeam = async (req, res, next) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
            return res.status(403).json({ success: false, message: "Only admins and managers can create teams" });
        }
        const validatedData = createTeamSchema.parse(req.body);
        const team = await teamsService.createTeam(validatedData);
        res.status(201).json({
            success: true,
            message: "Team created successfully",
            data: team
        });
    } catch (error) {
        next(error);
    }
};

const updateTeam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const validatedData = updateTeamSchema.parse(req.body);
        const team = await teamsService.updateTeam(id, validatedData);
        res.status(200).json({
            success: true,
            message: "Team updated successfully",
            data: team
        });
    } catch (error) {
        next(error);
    }
};

const deleteTeam = async (req, res, next) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
            return res.status(403).json({ success: false, message: "Only admins and managers can delete teams" });
        }
        const { id } = req.params;
        await teamsService.deleteTeam(id);
        res.status(200).json({
            success: true,
            message: "Team deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTeams,
    createTeam,
    updateTeam,
    deleteTeam
};
