const prisma = require('../../config/db');
const { getOrganizationId } = require('../../utils/orgId');

/**
 * Builds a generic filter object for reports.
 */
const buildReportFilter = (organizationId, startDate, endDate, params = {}) => {
    const { userId, teamId } = params;
    const where = {
        organizationId,
        timestamp: { gte: startDate, lte: endDate }
    };

    if (userId) {
        where.employeeId = userId;
    } else if (teamId) {
        where.employee = { teamId: teamId };
    }

    return where;
};

const PRODUCTIVITY_BUCKETS = ['PRODUCTIVE', 'NEUTRAL', 'UNPRODUCTIVE'];

/**
 * Work Type — Category tab: Productive / Neutral / Unproductive hours.
 */
const getWorkTypeByCategory = async (organizationId, startDate, endDate, params) => {
    const where = buildReportFilter(organizationId, startDate, endDate, params);

    const logs = await prisma.appUsageLog.groupBy({
        by: ['productivity'],
        _sum: { duration: true },
        where,
    });

    const durationByType = Object.fromEntries(
        logs.map((log) => [log.productivity, log._sum.duration || 0])
    );

    return PRODUCTIVITY_BUCKETS.map((productivity) => ({
        productivity,
        duration: durationByType[productivity] || 0,
    })).filter((row) => row.duration > 0);
};

/**
 * Work Type — Tags tab: Focus, Collaborative, Distraction, etc. (admin labels).
 */
const getWorkTypeByTags = async (organizationId, startDate, endDate, params) => {
    const where = buildReportFilter(organizationId, startDate, endDate, params);

    const [logs, rules] = await Promise.all([
        prisma.appUsageLog.findMany({
            where,
            select: { duration: true, domain: true, appName: true },
        }),
        prisma.productivityRule.findMany({
            where: { organizationId },
            include: { tag: true },
        }),
    ]);

    const ruleByDomain = new Map(rules.map((r) => [r.domain, r]));
    const ruleByApp = new Map(
        rules.filter((r) => r.appName).map((r) => [r.appName.toLowerCase(), r])
    );

    const tagTotals = {};

    logs.forEach((log) => {
        const rule =
            ruleByDomain.get(log.domain) ||
            ruleByApp.get((log.appName || '').toLowerCase());
        const tagName = rule?.tag?.name || 'Unassigned';
        const tagColor = rule?.tag?.color || '#94a3b8';
        const tagId = rule?.tag?.id || null;

        if (!tagTotals[tagName]) {
            tagTotals[tagName] = { tagName, tagColor, tagId, duration: 0 };
        }
        tagTotals[tagName].duration += log.duration || 0;
    });

    return Object.values(tagTotals)
        .map((t) => ({
            tagName: t.tagName,
            tagColor: t.tagColor,
            tagId: t.tagId,
            duration: t.duration,
        }))
        .sort((a, b) => b.duration - a.duration);
};

/** @deprecated use getWorkTypeByCategory */
const getWorkTypeReport = getWorkTypeByCategory;

/**
 * Apps & Websites Report: Detailed usage per app.
 */
const getAppsReport = async (organizationId, startDate, endDate, params) => {
    const where = buildReportFilter(organizationId, startDate, endDate, params);

    const data = await prisma.appUsageLog.groupBy({
        by: ['appName', 'category', 'productivity'],
        _sum: { duration: true },
        where,
        orderBy: {
            _sum: { duration: 'desc' }
        },
        take: 20
    });

    return data;
};

/**
 * Schedule Adherence Report: Compare Attendance with Shifts.
 */
const getAdherenceReport = async (organizationId, startDate, endDate, params, options = {}) => {
    const { userId, teamId } = params || {};
    const { maskNames = false } = options;

    const employeeWhere = { organizationId };
    if (userId) {
        employeeWhere.id = userId;
    } else if (teamId) {
        employeeWhere.teamId = teamId;
    }

    const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
            attendance: {
                where: { date: { gte: startDate, lte: endDate } }
            },
            agent: { select: { status: true, lastSeen: true } },
            liveActivities: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const data = employees.map(emp => {
        const totalAttendance = emp.attendance.length;
        const lateAttendance = emp.attendance.filter(a => a.late).length;
        const adherenceScore = totalAttendance > 0
            ? Math.round(((totalAttendance - lateAttendance) / totalAttendance) * 100)
            : 0;

        const lastSeen = emp.agent?.lastSeen ? new Date(emp.agent.lastSeen) : null;
        const isOnline = emp.agent?.status === 'active' && lastSeen && lastSeen > fiveMinAgo;
        const currentApp = emp.liveActivities[0]?.activeApp || null;

        return {
            id: emp.id,
            employee: emp.fullName,
            isOnline,
            currentApp: currentApp && currentApp !== 'Unknown' ? currentApp : null,
            status: adherenceScore >= 90 ? 'Excellent' : adherenceScore >= 80 ? 'Good' : 'Needs Improvement',
            adherence: adherenceScore
        };
    });

    data.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return Number(b.isOnline) - Number(a.isOnline);
        return a.employee.localeCompare(b.employee);
    });

    if (maskNames) {
        return await maskPII(organizationId, data, 'employee');
    }
    return data;
};

/**
 * Helper to mask PII according to GDPR settings
 */
const maskPII = async (organizationId, data, nameField = 'employee') => {
    const settings = await prisma.complianceSetting.findUnique({
        where: { organizationId }
    });

    if (!settings || !settings.gdprEnabled) {
        return data;
    }

    return data.map(item => ({
        ...item,
        [nameField]: `Employee #${item.id?.substring(0, 4) || Math.random().toString(36).substring(7).toUpperCase()}`,
        email: '***@***.***',
        phone: '**********'
    }));
};

/**
 * Location Insights Report: Work hours and employee counts per location.
 */
const getLocationInsights = async (organizationId, startDate, endDate, params) => {
    const { userId, teamId } = params || {};
    
    const employeeWhere = { organizationId };
    if (userId) {
        employeeWhere.id = userId;
    } else if (teamId) {
        employeeWhere.teamId = teamId;
    }

    const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
            attendance: {
                where: { date: { gte: startDate, lte: endDate } }
            },
            locationLogs: {
                where: { createdAt: { gte: startDate, lte: endDate } },
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    const locationStats = {};

    employees.forEach(emp => {
        const loc = emp.location || 'Remote';
        if (!locationStats[loc]) {
            locationStats[loc] = { name: loc, employees: 0, workHours: 0 };
        }
        locationStats[loc].employees += 1;
        
        const totalSeconds = emp.attendance.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        locationStats[loc].workHours += totalSeconds / 3600;
    });

    const data = Object.values(locationStats);
    return await maskPII(organizationId, data, 'name'); // name here is the location name, but wait, usually we mask employee names. 
    // Actually, in Location Insights, it's grouped by location.
    // Let's check employee level reports if any.
};

/**
 * Workload Distribution Report: Hours worked vs optimal range.
 */
const getWorkloadReport = async (organizationId, startDate, endDate, params) => {
    const { userId, teamId } = params || {};
    
    const teamWhere = { organizationId };
    if (teamId) {
        teamWhere.id = teamId;
    }

    const employeeWhere = {};
    if (userId) {
        employeeWhere.id = userId;
    }

    const teams = await prisma.team.findMany({
        where: teamWhere,
        include: {
            employees: {
                where: employeeWhere,
                include: {
                    attendance: {
                        where: { date: { gte: startDate, lte: endDate } }
                    }
                }
            }
        }
    });

    const data = teams.map(team => {
        let totalHours = 0;
        let totalCapacity = team.employees.length * 40; // Assuming 40h per week capacity for now

        team.employees.forEach(emp => {
            const hours = emp.attendance.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 3600;
            totalHours += hours;
        });

        return {
            team: team.name,
            hours: Math.round(totalHours * 10) / 10,
            capacity: totalCapacity || 1,
            employeeCount: team.employees.length
        };
    });

    return data; // No employee names here, so no masking needed
};

module.exports = {
    getWorkTypeReport,
    getWorkTypeByCategory,
    getWorkTypeByTags,
    getAppsReport,
    getAdherenceReport,
    getLocationInsights,
    getWorkloadReport
};
