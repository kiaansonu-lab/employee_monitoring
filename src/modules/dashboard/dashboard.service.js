const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getDateRangeFilter(startDate, endDate) {
    let start, end;
    if (startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
    } else {
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
    }
    return { gte: start, lte: end };
}

// Helper to format seconds to HH:mm
function formatToHM(seconds) {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculate summary metrics
async function calculateMetrics(organizationId, employeeId = null, teamId = null, startDate = null, endDate = null) {
    const dateFilter = getDateRangeFilter(startDate, endDate);

    const whereClause = { organizationId, timestamp: dateFilter };
    if (employeeId) whereClause.employeeId = employeeId;
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ where: whereClause });
    
    let activeTime = 0;
    let idleTime = 0;
    let productiveTime = 0;
    let unproductiveTime = 0;
    let neutralTime = 0;
    
    logs.forEach(log => {
        if (log.activityType === 'ACTIVE') activeTime += log.duration;
        if (log.activityType === 'IDLE') idleTime += log.duration;

        if (log.productivity === 'PRODUCTIVE') productiveTime += log.duration;
        else if (log.productivity === 'UNPRODUCTIVE') unproductiveTime += log.duration;
        else if (log.productivity === 'NEUTRAL') neutralTime += log.duration;
    });

    const manualWhere = { organizationId, startTime: dateFilter };
    if (employeeId) manualWhere.employeeId = employeeId;
    if (teamId) manualWhere.employee = { teamId };
    
    const manualLogs = await prisma.manualTime.findMany({ where: manualWhere });
    const manualTime = manualLogs.reduce((acc, log) => acc + log.duration, 0);
    // manualTime is typically productive or neutral. We'll count it towards productive
    productiveTime += manualTime;

    const workTime = activeTime + manualTime + idleTime;
    
    const utilization = workTime > 0 ? Math.round((productiveTime / workTime) * 100) : 0;
    
    return {
        workTime: formatToHM(workTime),
        activeTime: formatToHM(activeTime),
        idleTime: formatToHM(idleTime),
        manualTime: formatToHM(manualTime),
        productiveTime: formatToHM(productiveTime),
        unproductiveTime: formatToHM(unproductiveTime || idleTime), // Use actual UNPRODUCTIVE or fallback roughly to idle
        neutralTime: formatToHM(neutralTime),
        utilization,
        totalWorkHours: Number((workTime / 3600).toFixed(2))
    };
}

// Calculate intraday chart data
async function getIntradayActivity(organizationId, employeeId = null, teamId = null, startDate = null, endDate = null) {
    const dateFilter = getDateRangeFilter(startDate, endDate);

    const whereClause = { organizationId, timestamp: dateFilter };
    if (employeeId) whereClause.employeeId = employeeId;
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ where: whereClause });
    
    const manualWhere = { organizationId, startTime: dateFilter };
    if (employeeId) manualWhere.employeeId = employeeId;
    if (teamId) manualWhere.employee = { teamId };
    
    const manualLogs = await prisma.manualTime.findMany({ where: manualWhere });

    // Group by hour
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
        hourlyData[i] = { active: 0, idle: 0, break: 0, manual: 0 };
    }

    logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        if (log.activityType === 'ACTIVE') hourlyData[hour].active += log.duration;
        else if (log.activityType === 'IDLE') hourlyData[hour].idle += log.duration;
        else if (log.activityType === 'BREAK') hourlyData[hour].break += log.duration;
    });

    manualLogs.forEach(log => {
        const hour = new Date(log.startTime).getHours();
        hourlyData[hour].manual += log.duration;
    });

    // Format for Recharts
    const result = [];
    for (let i = 8; i <= 20; i += 2) { // 8 AM to 8 PM roughly
        result.push({
            name: `${i.toString().padStart(2, '0')}:00`,
            active: Number((hourlyData[i].active / 3600).toFixed(2)),
            idle: Number((hourlyData[i].idle / 3600).toFixed(2)),
            break: Number((hourlyData[i].break / 3600).toFixed(2)),
            manual: Number((hourlyData[i].manual / 3600).toFixed(2)),
        });
    }

    return result;
}

// Calculate top/bottom employees
async function getEmployeeRankings(organizationId, teamId = null, startDate = null, endDate = null) {
    const dateFilter = getDateRangeFilter(startDate, endDate);

    const whereClause = { organizationId, timestamp: dateFilter };
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ 
        where: whereClause,
        include: { employee: { include: { team: true } } }
    });

    const manualWhere = { organizationId, startTime: dateFilter };
    if (teamId) manualWhere.employee = { teamId };

    const manualLogs = await prisma.manualTime.findMany({ 
        where: manualWhere,
        include: { employee: true }
    });

    const empStats = {};
    
    const initEmp = (emp) => {
        if (!empStats[emp.id]) {
            empStats[emp.id] = {
                name: emp.fullName,
                initials: emp.fullName.substring(0, 2).toUpperCase(),
                team: emp.team?.name || 'Unassigned',
                status: emp.status, // Include status here
                active: 0,
                idle: 0,
                manual: 0,
                productive: 0, 
                unproductive: 0 
            };
        }
    };

    logs.forEach(log => {
        initEmp(log.employee);
        if (log.activityType === 'ACTIVE') empStats[log.employee.id].active += log.duration;
        if (log.activityType === 'IDLE') empStats[log.employee.id].idle += log.duration;

        if (log.productivity === 'PRODUCTIVE') empStats[log.employee.id].productive += log.duration;
        if (log.productivity === 'UNPRODUCTIVE') empStats[log.employee.id].unproductive += log.duration;
    });

    manualLogs.forEach(log => {
        initEmp(log.employee);
        empStats[log.employee.id].manual += log.duration;
        empStats[log.employee.id].productive += log.duration; // manual assumed productive
    });

    const rankings = Object.values(empStats).map(e => {
        const total = e.active + e.manual + e.idle; // Total logged tracking time
        const util = total > 0 ? Math.round((e.productive / total) * 100) : 0;
        return {
            ...e,
            productive: formatToHM(e.productive),
            unproductive: formatToHM(e.unproductive || e.idle), // Fallback to idle if none specific
            utilization: util,
            _rawUtil: util // For sorting
        };
    });

    rankings.sort((a, b) => b._rawUtil - a._rawUtil);

    return {
        topProductive: rankings.slice(0, 5),
        topUnproductive: [...rankings].reverse().slice(0, 5)
    };
}

const getAdminDashboard = async (organizationId, startDate = null, endDate = null) => {
    const [employees, teams, totalAttendance] = await Promise.all([
        prisma.employee.findMany({ where: { organizationId } }),
        prisma.team.findMany({ where: { organizationId } }),
        prisma.attendance.count({ where: { organizationId } })
    ]);

    const summary = await calculateMetrics(organizationId, null, null, startDate, endDate);
    const intradayActivity = await getIntradayActivity(organizationId, null, null, startDate, endDate);
    const rankings = await getEmployeeRankings(organizationId, null, startDate, endDate);

    // Calculate real team stats
    const teamStats = teams.map(t => {
        const teamEmployees = rankings.topProductive.filter(emp => emp.team === t.name)
            .concat(rankings.topUnproductive.filter(emp => emp.team === t.name));
        
        // Remove duplicates from rank concat
        const uniqueTeamEmps = Array.from(new Set(teamEmployees.map(e => e.id)))
            .map(id => teamEmployees.find(e => e.id === id));

        const avgProductivity = uniqueTeamEmps.length > 0 
            ? Math.round(uniqueTeamEmps.reduce((acc, emp) => acc + emp.utilization, 0) / uniqueTeamEmps.length)
            : 0;

        return {
            id: t.id,
            name: t.name,
            productivity: avgProductivity,
        };
    });

    return {
        employees,
        teams: teamStats,
        totalAttendance,
        workHours: summary.totalWorkHours,
        productivityScore: summary.utilization,
        summary,
        intradayActivity,
        topProductive: rankings.topProductive,
        topUnproductive: rankings.topUnproductive
    };
};

const getManagerDashboard = async (organizationId, teamId, startDate = null, endDate = null) => {
    const [employees, activityLogs, tasks, attendance] = await Promise.all([
        prisma.employee.findMany({ where: { organizationId, teamId } }),
        prisma.activityLog.findMany({
            where: { organizationId, employee: { teamId } },
            take: 10,
            orderBy: { timestamp: 'desc' }
        }),
        prisma.task.findMany({ where: { organizationId, employee: { teamId } } }),
        prisma.attendance.count({ where: { organizationId, employee: { teamId } } })
    ]);

    const summary = await calculateMetrics(organizationId, null, teamId, startDate, endDate);
    const intradayActivity = await getIntradayActivity(organizationId, null, teamId, startDate, endDate);
    const rankings = await getEmployeeRankings(organizationId, teamId, startDate, endDate);

    // Provide contextTeams for the manager UI to avoid crashes if UI expects an array
    const contextTeams = await prisma.team.findMany({ where: { id: teamId } });

    return {
        employees,
        activityLogs,
        tasks,
        totalAttendance: attendance,
        workHours: summary.totalWorkHours,
        productivityScore: summary.utilization,
        summary,
        intradayActivity,
        topProductive: rankings.topProductive,
        topUnproductive: rankings.topUnproductive,
        teams: contextTeams
    };
};

const getEmployeeDashboard = async (organizationId, employeeId, startDate = null, endDate = null) => {
    const [activityLogs, attendanceList, tasks, screenshots] = await Promise.all([
        prisma.activityLog.findMany({
            where: { organizationId, employeeId },
            take: 20,
            orderBy: { timestamp: 'desc' }
        }),
        prisma.attendance.findMany({
            where: { organizationId, employeeId },
            take: 5,
            orderBy: { date: 'desc' }
        }),
        prisma.task.findMany({ where: { organizationId, employeeId } }),
        prisma.screenshot.findMany({
            where: { 
                organizationId, 
                employeeId,
                imageUrl: {
                    startsWith: '/uploads' // Only fetch real screenshots, ignore simulator dummy data
                }
            },
            take: 5,
            orderBy: { capturedAt: 'desc' }
        })
    ]);

    const summary = await calculateMetrics(organizationId, employeeId, null, startDate, endDate);
    const intradayActivity = await getIntradayActivity(organizationId, employeeId, null, startDate, endDate);

    return {
        activityLogs,
        attendance: attendanceList,
        tasks,
        screenshots,
        workHours: summary.totalWorkHours,
        productivityScore: summary.utilization,
        summary,
        intradayActivity,
        // RBAC: Empty peer data for Employees
        topProductive: [],
        topUnproductive: [],
        teams: []
    };
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getEmployeeDashboard
};
