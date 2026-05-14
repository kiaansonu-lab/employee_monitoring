const prisma = require('../../config/db');
const { getIO } = require('../../socket/server');

class ProjectsService {
    async createProject(data, organizationId) {
        const { name, billRate, employeeIds } = data;

        return await prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                    name,
                    description: data.description,
                    billableRate: parseFloat(billRate) || 0,
                    budget: parseFloat(data.budget) || 0,
                    organizationId,
                },
            });

            if (employeeIds && employeeIds.length > 0) {
                await tx.projectAssignment.createMany({
                    data: employeeIds.map(employeeId => ({
                        projectId: project.id,
                        employeeId,
                    })),
                });
            }

            const result = {
                id: project.id,
                projectName: project.name,
                assignees: employeeIds?.length || 0,
                tasks: 0,
                totalTime: '00:00',
                clockedTime: '00:00',
                manualTime: '00:00',
                billRate: project.billableRate,
                totalCosts: (parseFloat(data.budget) || 0).toFixed(2),
            };

            // Emit real-time event
            const io = getIO();
            if (io) {
                io.to(`org_${organizationId}`).emit('project:update', { projectId: project.id, type: 'new' });
            }

            return result;
        });
    }

    async getProjects(organizationId, filter = {}) {
        const where = { organizationId };
        
        if (filter.employeeId) {
            where.assignments = {
                some: {
                    employeeId: filter.employeeId
                }
            };
        }

        const projects = await prisma.project.findMany({
            where,
            include: {
                assignments: {
                    include: {
                        employee: true,
                    },
                },
                tasks: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                fullName: true,
                                avatar: true
                            }
                        }
                    }
                },
                timeLogs: true,
                _count: {
                    select: { tasks: true }
                }
            },
        });

        return projects.map(project => {
            const totalSeconds = project.timeLogs.reduce((acc, log) => acc + log.duration, 0);
            const clockedSeconds = project.timeLogs
                .filter(log => log.type === 'CLOCKED')
                .reduce((acc, log) => acc + log.duration, 0);
            const manualSeconds = project.timeLogs
                .filter(log => log.type === 'MANUAL')
                .reduce((acc, log) => acc + log.duration, 0);

            const totalHours = totalSeconds / 3600;
            const billableCost = totalHours * project.billableRate;

            // Calculate unique employees assigned to tasks
            const taskAssigneeIds = new Set(project.tasks.map(t => t.employeeId).filter(id => !!id));
            
            return {
                id: project.id,
                projectName: project.name,
                assignees: taskAssigneeIds.size, // Updated logic: count task assignees
                tasks: project._count.tasks,
                tasksData: project.tasks,
                totalTime: this.formatDuration(totalSeconds),
                clockedTime: this.formatDuration(clockedSeconds),
                manualTime: this.formatDuration(manualSeconds),
                billRate: project.billableRate,
                totalCosts: (project.budget ?? 0).toFixed(2),
                description: project.description,
            };
        });
    }

    async assignEmployees(projectId, employeeIds) {
        return await prisma.projectAssignment.createMany({
            data: employeeIds.map(employeeId => ({
                projectId,
                employeeId,
            })),
            skipDuplicates: true,
        });
    }

    async logTime(data) {
        const { projectId, employeeId, duration, type } = data;
        return await prisma.projectTimeLog.create({
            data: {
                projectId,
                employeeId,
                duration: parseInt(duration),
                type: type || 'CLOCKED',
            },
        });
    }

    async updateProject(id, data) {
        const { name, billRate, employeeIds } = data;

        return await prisma.$transaction(async (tx) => {
            // Update project basic info
            const project = await tx.project.update({
                where: { id },
                data: {
                    name,
                    description: data.description,
                    billableRate: parseFloat(billRate) || 0,
                    budget: parseFloat(data.budget) || 0,
                },
            });

            // Update assignments - simple way: delete all and re-add
            if (employeeIds) {
                await tx.projectAssignment.deleteMany({
                    where: { projectId: id },
                });

                if (employeeIds.length > 0) {
                    await tx.projectAssignment.createMany({
                        data: employeeIds.map(employeeId => ({
                            projectId: id,
                            employeeId,
                        })),
                    });
                }
            }

            // Return the full project object as the frontend expects it
            const fullProject = await tx.project.findUnique({
                where: { id },
                include: {
                    assignments: { include: { employee: true } },
                    tasks: {
                        include: {
                            employee: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    avatar: true
                                }
                            }
                        }
                    },
                    timeLogs: true,
                    _count: { select: { tasks: true } }
                }
            });

            const totalSeconds = fullProject.timeLogs.reduce((acc, log) => acc + log.duration, 0);
            const clockedSeconds = fullProject.timeLogs
                .filter(log => log.type === 'CLOCKED')
                .reduce((acc, log) => acc + log.duration, 0);
            const manualSeconds = fullProject.timeLogs
                .filter(log => log.type === 'MANUAL')
                .reduce((acc, log) => acc + log.duration, 0);

            const taskAssigneeIds = new Set(fullProject.tasks.map(t => t.employeeId).filter(id => !!id));

            const result = {
                id: fullProject.id,
                projectName: fullProject.name,
                assignees: taskAssigneeIds.size,
                tasks: fullProject._count.tasks,
                tasksData: fullProject.tasks,
                totalTime: this.formatDuration(totalSeconds),
                clockedTime: this.formatDuration(clockedSeconds),
                manualTime: this.formatDuration(manualSeconds),
                billRate: fullProject.billableRate,
                totalCosts: (fullProject.budget ?? 0).toFixed(2),
                description: fullProject.description,
            };

            // Emit real-time event
            const io = getIO();
            if (io) {
                io.to(`org_${fullProject.organizationId}`).emit('project:update', { projectId: id, type: 'update' });
            }

            return result;
        });
    }

    async deleteProject(id) {
        return await prisma.$transaction(async (tx) => {
            // Delete related entries first
            await tx.projectAssignment.deleteMany({ where: { projectId: id } });
            await tx.projectTimeLog.deleteMany({ where: { projectId: id } });
            await tx.task.deleteMany({ where: { projectId: id } }); // Optional, but tasks usually belong to projects
            
            const project = await tx.project.delete({
                where: { id },
            });

            // Emit real-time event
            const io = getIO();
            if (io) {
                io.to(`org_${project.organizationId}`).emit('project:update', { projectId: id, type: 'delete' });
            }

            return project;
        });
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}

module.exports = new ProjectsService();
