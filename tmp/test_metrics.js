
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

function formatToHM(seconds) {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

async function calculateMetrics(organizationId, employeeId = null, teamId = null) {
    const today = dayjs().startOf('day').toDate();
    const whereClause = { organizationId, timestamp: { gte: today } };
    if (employeeId) whereClause.employeeId = employeeId;
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ where: whereClause });
    
    let activeTime = 0;
    let idleTime = 0;
    
    logs.forEach(log => {
        if (log.status === 'ACTIVE') activeTime += log.duration;
        if (log.status === 'IDLE') idleTime += log.duration;
    });

    const manualWhere = { organizationId, startTime: { gte: today } };
    if (employeeId) manualWhere.employeeId = employeeId;
    if (teamId) manualWhere.employee = { teamId };
    
    const manualLogs = await prisma.manualTime.findMany({ where: manualWhere });
    const manualTime = manualLogs.reduce((acc, log) => acc + log.duration, 0);

    const workTime = activeTime + manualTime + idleTime;
    const productiveTime = activeTime + manualTime; // Assuming active is productive for now
    
    const utilization = workTime > 0 ? Math.round((productiveTime / workTime) * 100) : 0;
    
    return {
        workTime: formatToHM(workTime),
        activeTime: formatToHM(activeTime),
        idleTime: formatToHM(idleTime),
        manualTime: formatToHM(manualTime),
        productiveTime: formatToHM(productiveTime),
        unproductiveTime: formatToHM(idleTime),
        neutralTime: '00:00',
        utilization
    };
}

async function getIntradayActivity(organizationId, employeeId = null, teamId = null) {
    const today = dayjs().startOf('day').toDate();
    const whereClause = { organizationId, timestamp: { gte: today } };
    if (employeeId) whereClause.employeeId = employeeId;
    if (teamId) whereClause.employee = { teamId };

    const logs = await prisma.activityLog.findMany({ where: whereClause });
    
    const manualWhere = { organizationId, startTime: { gte: today } };
    if (employeeId) manualWhere.employeeId = employeeId;
    if (teamId) manualWhere.employee = { teamId };
    
    const manualLogs = await prisma.manualTime.findMany({ where: manualWhere });

    // Group by hour
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
        hourlyData[i] = { active: 0, idle: 0, break: 0, manual: 0 };
    }

    logs.forEach(log => {
        const hour = dayjs(log.timestamp).hour();
        if (log.status === 'ACTIVE') hourlyData[hour].active += log.duration;
        if (log.status === 'IDLE') hourlyData[hour].idle += log.duration;
    });

    manualLogs.forEach(log => {
        const hour = dayjs(log.startTime).hour();
        hourlyData[hour].manual += log.duration;
    });

    // Format for Recharts
    const result = [];
    for (let i = 8; i <= 20; i+=2) { // 8 AM to 8 PM roughly
        result.push({
            name: `${i.toString().padStart(2, '0')}:00`,
            active: Number((hourlyData[i].active / 3600).toFixed(2)),
            idle: Number((hourlyData[i].idle / 3600).toFixed(2)),
            break: 0,
            manual: Number((hourlyData[i].manual / 3600).toFixed(2)),
        });
    }

    return result;
}

async function test() {
    console.log("Testing calculations...");
    const org = await prisma.organization.findFirst();
    if (!org) return console.log("No org");
    const m = await calculateMetrics(org.id);
    console.log("Summary:", m);
    const chart = await getIntradayActivity(org.id);
    console.log("Chart:", chart);
    process.exit(0);
}

test();
