const prisma = require('../../config/db');

/**
 * Build date filter for queries
 */
function buildDateWhere(startDate, endDate) {
    if (!startDate && !endDate) return {};
    const base = {};
    if (startDate) base.gte = new Date(startDate);
    if (endDate) base.lte = new Date(endDate);
    return { timestamp: base };
}

/**
 * Format seconds to "Xh Ym" string
 */
function fmtSecs(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
}

const analyticsService = {
    /**
     * Get aggregated dashboard metrics from ActivityLog
     */
    getDashboardMetrics: async (organizationId, startDate, endDate) => {
        const where = { organizationId, ...buildDateWhere(startDate, endDate) };

        const logs = await prisma.activityLog.findMany({ where });

        let workTime = 0, activeTime = 0, idleTime = 0, manualTime = 0;
        let productiveTime = 0, unproductiveTime = 0, neutralTime = 0;

        logs.forEach(log => {
            const dur = log.duration || 0;
            workTime += dur;
            if (log.activityType === 'ACTIVE') activeTime += dur;
            if (log.activityType === 'IDLE') idleTime += dur;
            if (log.activityType === 'MANUAL') manualTime += dur;
            if (log.productivity === 'PRODUCTIVE') productiveTime += dur;
            if (log.productivity === 'UNPRODUCTIVE') unproductiveTime += dur;
            if (log.productivity === 'NEUTRAL') neutralTime += dur;
        });

        const utilization = workTime > 0
            ? Math.round((productiveTime / workTime) * 100)
            : 0;

        return {
            workTime: fmtSecs(workTime),
            activeTime: fmtSecs(activeTime),
            idleTime: fmtSecs(idleTime),
            manualTime: fmtSecs(manualTime),
            productiveTime: fmtSecs(productiveTime),
            unproductiveTime: fmtSecs(unproductiveTime),
            neutralTime: fmtSecs(neutralTime),
            utilization,
            // Also raw secs for chart use
            rawWorkTime: workTime,
            rawActiveTime: activeTime,
            rawIdleTime: idleTime,
            rawManualTime: manualTime,
            rawProductiveTime: productiveTime,
            rawUnproductiveTime: unproductiveTime,
            rawNeutralTime: neutralTime,
        };
    },

    /**
     * Timeline: group ActivityLog by hour returning active/idle/manual per hour
     */
    getTimeline: async (organizationId, startDate, endDate) => {
        const where = { organizationId, ...buildDateWhere(startDate, endDate) };
        const logs = await prisma.activityLog.findMany({ where });

        const hourBuckets = Array.from({ length: 24 }, (_, i) => ({
            hour: `${String(i).padStart(2, '0')}:00`,
            activeTime: 0,
            idleTime: 0,
            manualTime: 0,
        }));

        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            const dur = (log.duration || 0) / 3600; // convert to hours
            if (log.activityType === 'ACTIVE') hourBuckets[hour].activeTime += dur;
            if (log.activityType === 'IDLE') hourBuckets[hour].idleTime += dur;
            if (log.activityType === 'MANUAL') hourBuckets[hour].manualTime += dur;
        });

        return hourBuckets.map(b => ({
            ...b,
            activeTime: Math.round(b.activeTime * 100) / 100,
            idleTime: Math.round(b.idleTime * 100) / 100,
            manualTime: Math.round(b.manualTime * 100) / 100,
        }));
    },

    /**
     * Top Employees by productivity score
     */
    getTopEmployees: async (organizationId, startDate, endDate) => {
        const where = { organizationId, ...buildDateWhere(startDate, endDate) };

        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: { id: true, fullName: true, team: { select: { name: true } } }
                }
            }
        });

        // Group by employee
        const empMap = {};
        logs.forEach(log => {
            if (!log.employee) return;
            const eid = log.employeeId;
            if (!empMap[eid]) {
                empMap[eid] = {
                    id: eid,
                    name: log.employee.fullName,
                    team: log.employee.team?.name || 'General',
                    productive: 0,
                    unproductive: 0,
                    total: 0,
                };
            }
            const dur = log.duration || 0;
            empMap[eid].total += dur;
            if (log.productivity === 'PRODUCTIVE') empMap[eid].productive += dur;
            if (log.productivity === 'UNPRODUCTIVE') empMap[eid].unproductive += dur;
        });

        const employees = Object.values(empMap).map(e => ({
            ...e,
            utilization: e.total > 0 ? Math.round((e.productive / e.total) * 100) : 0,
            productiveDisplay: fmtSecs(e.productive),
            unproductiveDisplay: fmtSecs(e.unproductive),
        }));

        const sorted = [...employees].sort((a, b) => b.utilization - a.utilization);

        return {
            topProductiveEmployees: sorted.slice(0, 10),
            topUnproductiveEmployees: [...employees].sort((a, b) => b.unproductive - a.unproductive).slice(0, 10),
        };
    },

    /**
     * Top Teams by average productivity
     */
    getTopTeams: async (organizationId, startDate, endDate) => {
        const where = { organizationId, ...buildDateWhere(startDate, endDate) };

        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                employee: {
                    select: { team: { select: { id: true, name: true } } }
                }
            }
        });

        const teamMap = {};
        logs.forEach(log => {
            const team = log.employee?.team;
            if (!team) return;
            if (!teamMap[team.id]) {
                teamMap[team.id] = { id: team.id, name: team.name, productive: 0, unproductive: 0, total: 0 };
            }
            const dur = log.duration || 0;
            teamMap[team.id].total += dur;
            if (log.productivity === 'PRODUCTIVE') teamMap[team.id].productive += dur;
            if (log.productivity === 'UNPRODUCTIVE') teamMap[team.id].unproductive += dur;
        });

        const teams = Object.values(teamMap).map(t => ({
            ...t,
            utilization: t.total > 0 ? Math.round((t.productive / t.total) * 100) : 0,
            productivePct: t.total > 0 ? Math.round((t.productive / t.total) * 100) : 0,
            unproductivePct: t.total > 0 ? Math.round((t.unproductive / t.total) * 100) : 0,
        }));

        const sorted = [...teams].sort((a, b) => b.utilization - a.utilization);

        return {
            topProductiveTeams: sorted.slice(0, 5),
            topUnproductiveTeams: [...teams].sort((a, b) => b.unproductive - a.unproductive).slice(0, 5),
        };
    },

    /**
     * Category breakdown from AppUsageLog
     */
    getCategoryBreakdown: async (organizationId, startDate, endDate) => {
        const where = { organizationId };
        if (startDate) where.timestamp = { gte: new Date(startDate) };
        if (endDate) {
            if (where.timestamp) where.timestamp.lte = new Date(endDate);
            else where.timestamp = { lte: new Date(endDate) };
        }

        const logs = await prisma.appUsageLog.findMany({ where });

        const catMap = {};
        let totalDuration = 0;

        logs.forEach(log => {
            const cat = log.category || 'Uncategorized';
            if (!catMap[cat]) catMap[cat] = 0;
            catMap[cat] += log.duration || 0;
            totalDuration += log.duration || 0;
        });

        return Object.entries(catMap).map(([category, usage]) => ({
            category,
            totalUsage: usage,
            totalUsageFormatted: fmtSecs(usage),
            percentage: totalDuration > 0 ? Math.round((usage / totalDuration) * 100) : 0,
        })).sort((a, b) => b.totalUsage - a.totalUsage);
    },
};

module.exports = analyticsService;
