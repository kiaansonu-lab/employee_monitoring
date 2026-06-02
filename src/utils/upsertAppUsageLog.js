const prisma = require('../config/db');
const { HEARTBEAT_SECONDS } = require('./resolveAppActivity');

async function upsertAppUsageLog({ employeeId, organizationId, appName, domain, category, productivity, durationSeconds = HEARTBEAT_SECONDS }) {
    // If app is unknown, save as "System Activity" instead of dropping it
    if (!appName || appName === 'Unknown') {
        appName = 'System Activity';
        domain = domain || 'system';
        category = category || 'System';
        productivity = productivity || 'NEUTRAL';
    }

    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existingLog = await prisma.appUsageLog.findFirst({
        where: {
            employeeId,
            organizationId,
            appName,
            timestamp: { gte: twoMinsAgo },
        },
    });

    if (existingLog) {
        await prisma.appUsageLog.update({
            where: { id: existingLog.id },
            data: { duration: { increment: durationSeconds } },
        });
        return;
    }

    await prisma.appUsageLog.create({
        data: {
            employeeId,
            organizationId,
            appName,
            domain: domain || '',
            category: category || 'Uncategorized',
            productivity,
            duration: durationSeconds,
            timestamp: new Date(),
        },
    });
}

module.exports = { upsertAppUsageLog };
