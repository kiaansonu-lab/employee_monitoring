const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const activityService = {
    createActivityLog: async (data) => {
        const settings = await prisma.complianceSetting.findUnique({
            where: { organizationId: data.organizationId }
        });

        if (settings && !settings.activityMonitoring) {
            return null;
        }

        return await prisma.activityLog.create({
            data: {
                employeeId: data.employeeId,
                organizationId: data.organizationId,
                activityType: data.activityType,
                productivity: data.productivity,
                duration: data.duration,
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                appWebsite: data.appWebsite || 'Unknown',
                taskId: data.taskId || null,
            },
        });
    },

    getEmployeeActivity: async (employeeId, startDate, endDate) => {
        const where = {
            employeeId,
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        return await prisma.activityLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
        });
    },

    getTeamActivity: async (teamId, startDate, endDate) => {
        const where = {
            employee: {
                teamId,
            },
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        return await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
        });
    },

    getOrganizationActivity: async (organizationId, startDate, endDate) => {
        const where = {
            organizationId,
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        return await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        team: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
        });
    },

    getOrganizationSummary: async (organizationId, startDate, endDate, params) => {
        const where = {
            organizationId,
        };

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            where.timestamp = {
                gte: start,
                lte: end,
            };
        }

        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        team: {
                            select: { name: true }
                        }
                    },
                },
            },
        });

        console.log(`[ActivityService] Found ${logs.length} logs for org ${organizationId}`);

        // Group by Date and Employee
        const summaryMap = {};

        logs.forEach(log => {
            if (!log.employee) {
                console.warn(`[ActivityService] Missing employee for log ID ${log.id}`);
                return;
            }

            const date = log.timestamp ? log.timestamp.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const empId = log.employeeId;
            const key = `${date}_${empId}`;

            if (!summaryMap[key]) {
                summaryMap[key] = {
                    id: key,
                    employeeId: empId,
                    name: log.employee.fullName || 'Unknown',
                    team: log.employee.team?.name || 'General',
                    date: date,
                    workHours: 0,
                    activeHours: 0,
                    idleHours: 0,
                    breakHours: 0,
                    manualHours: 0,
                    productiveHours: 0,
                    unproductiveHours: 0,
                    neutralHours: 0,
                    taskHours: {}, // { taskId: duration }
                    breakStartedAt: null,
                    intradayBuckets: Array.from({ length: 24 }, (_, i) => ({
                        name: `${String(i).padStart(2, '0')}:00`,
                        active: 0,
                        idle: 0,
                        manual: 0,
                        break: 0
                    }))
                };
            }

            const item = summaryMap[key];
            const durationHrs = log.duration / 3600;

            // Types
            if (log.activityType === 'ACTIVE') item.activeHours += durationHrs;
            if (log.activityType === 'IDLE') item.idleHours += durationHrs;
            if (log.activityType === 'MANUAL') item.manualHours += durationHrs;
            if (log.activityType === 'BREAK') {
                item.breakHours += durationHrs;
                if (log.duration === 0) {
                    // Current active break
                    if (!item.breakStartedAt || new Date(log.timestamp) > new Date(item.breakStartedAt)) {
                        item.breakStartedAt = log.timestamp;
                    }
                }
            }

            // Productivity
            if (log.productivity === 'PRODUCTIVE') item.productiveHours += durationHrs;
            if (log.productivity === 'UNPRODUCTIVE') item.unproductiveHours += durationHrs;
            if (log.productivity === 'NEUTRAL') item.neutralHours += durationHrs;
            
            // Task Specific Time
            if (log.taskId) {
                if (!item.taskHours[log.taskId]) item.taskHours[log.taskId] = 0;
                item.taskHours[log.taskId] += durationHrs;
            }

            // Total Work Hours (Active + Idle + Manual)
            item.workHours = item.activeHours + item.idleHours + item.manualHours;

            // Hourly bucket
            const hour = log.timestamp.getHours();
            if (log.activityType === 'ACTIVE') item.intradayBuckets[hour].active += durationHrs;
            if (log.activityType === 'IDLE') item.intradayBuckets[hour].idle += durationHrs;
            if (log.activityType === 'BREAK') item.intradayBuckets[hour].break += durationHrs;
        });

        // Calculate percentages
        return Object.values(summaryMap).map(item => {
            const productivityPct = item.activeHours > 0 ? Math.round((item.productiveHours / item.activeHours) * 100) : 0;
            const utilizationPct = item.workHours > 0 ? Math.round((item.activeHours / item.workHours) * 100) : 0;

            return {
                ...item,
                productivityPct,
                utilizationPct
            };
        });
    },
    getEmployeeSummary: async (employeeId, startDate, endDate) => {
        const where = {
            employeeId,
        };

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            where.timestamp = {
                gte: start,
                lte: end,
            };
        }

        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        team: { select: { name: true } }
                    }
                }
            }
        });

        // Group by Date
        const summaryMap = {};

        logs.forEach(log => {
            const date = log.timestamp ? log.timestamp.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const key = date;

            if (!summaryMap[key]) {
                summaryMap[key] = {
                    id: `${date}_${employeeId}`,
                    employeeId: employeeId,
                    name: log.employee?.fullName || 'Unknown',
                    team: log.employee?.team?.name || 'General',
                    date: date,
                    workHours: 0,
                    activeHours: 0,
                    idleHours: 0,
                    breakHours: 0,
                    manualHours: 0,
                    productiveHours: 0,
                    unproductiveHours: 0,
                    neutralHours: 0,
                    taskHours: {},
                    intradayBuckets: Array.from({ length: 24 }, (_, i) => ({
                        name: `${String(i).padStart(2, '0')}:00`,
                        active: 0,
                        idle: 0,
                        manual: 0,
                        break: 0
                    }))
                };
            }

            const item = summaryMap[key];
            const durationHrs = log.duration / 3600;

            if (log.activityType === 'ACTIVE') item.activeHours += durationHrs;
            if (log.activityType === 'IDLE') item.idleHours += durationHrs;
            if (log.activityType === 'MANUAL') item.manualHours += durationHrs;
            if (log.activityType === 'BREAK') item.breakHours += durationHrs;

            if (log.productivity === 'PRODUCTIVE') item.productiveHours += durationHrs;
            if (log.productivity === 'UNPRODUCTIVE') item.unproductiveHours += durationHrs;
            if (log.productivity === 'NEUTRAL') item.neutralHours += durationHrs;
            
            if (log.taskId) {
                if (!item.taskHours[log.taskId]) item.taskHours[log.taskId] = 0;
                item.taskHours[log.taskId] += durationHrs;
            }

            const hour = log.timestamp.getHours();
            if (log.activityType === 'ACTIVE') item.intradayBuckets[hour].active += durationHrs;
            if (log.activityType === 'IDLE') item.intradayBuckets[hour].idle += durationHrs;
            if (log.activityType === 'BREAK') item.intradayBuckets[hour].break += durationHrs;
        });

        return Object.values(summaryMap).map(item => {
            item.workHours = item.activeHours + item.idleHours + item.manualHours;
            const productivityPct = item.activeHours > 0 ? Math.round((item.productiveHours / item.activeHours) * 100) : 0;
            const utilizationPct = item.workHours > 0 ? Math.round((item.activeHours / item.workHours) * 100) : 0;

            return {
                ...item,
                productivityPct,
                utilizationPct
            };
        });
    },
    getTeamSummary: async (teamId, startDate, endDate) => {
        const where = {
            employee: { teamId: teamId },
        };

        if (startDate && endDate) {
            where.timestamp = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const logs = await prisma.activityLog.findMany({
            where,
        });

        const summary = {
            activeHours: 0,
            idleHours: 0,
            manualHours: 0,
            productiveHours: 0,
            unproductiveHours: 0,
            neutralHours: 0,
            totalWorkHours: 0,
        };

        logs.forEach(log => {
            const durationHrs = log.duration / 3600;
            if (log.activityType === 'ACTIVE') summary.activeHours += durationHrs;
            if (log.activityType === 'IDLE') summary.idleHours += durationHrs;
            if (log.activityType === 'MANUAL') summary.manualHours += durationHrs;
            
            if (log.productivity === 'PRODUCTIVE') summary.productiveHours += durationHrs;
            if (log.productivity === 'UNPRODUCTIVE') summary.unproductiveHours += durationHrs;
            if (log.productivity === 'NEUTRAL') summary.neutralHours += durationHrs;
        });

        summary.totalWorkHours = summary.activeHours + summary.idleHours + summary.manualHours;
        summary.productivityPct = summary.activeHours > 0 ? Math.round((summary.productiveHours / summary.activeHours) * 100) : 0;

        return summary;
    }
};

module.exports = activityService;
