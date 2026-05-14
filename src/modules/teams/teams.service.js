const prisma = require('../../config/db');
const { getIO } = require('../../socket/server');

class TeamsService {
    async getTeams(organizationId, filter = {}) {
        return await prisma.team.findMany({
            where: { 
                organizationId,
                ...filter
            },
            include: {
                _count: {
                    select: { employees: true }
                },
                employees: {
                    select: {
                        id: true,
                        status: true
                    }
                }
            }
        });
    }

    async getTeamById(id) {
        return await prisma.team.findUnique({
            where: { id },
            include: {
                employees: true
            }
        });
    }

    async createTeam(data) {
        const team = await prisma.team.create({
            data
        });

        // Emit real-time event
        const io = getIO();
        if (io) {
            io.to(`org_${team.organizationId}`).emit('team:update', { teamId: team.id, type: 'new' });
        }

        return team;
    }

    async updateTeam(id, data) {
        const team = await prisma.team.update({
            where: { id },
            data
        });

        // Emit real-time event
        const io = getIO();
        if (io && team) {
            io.to(`org_${team.organizationId}`).emit('team:update', { teamId: id, type: 'update' });
        }

        return team;
    }

    async deleteTeam(id) {
        const team = await prisma.team.delete({
            where: { id }
        });

        // Emit real-time event
        const io = getIO();
        if (io && team) {
            io.to(`org_${team.organizationId}`).emit('team:update', { teamId: id, type: 'delete' });
        }

        return team;
    }
}

module.exports = new TeamsService();
