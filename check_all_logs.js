const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const appLogsCount = await prisma.appUsageLog.count();
        const activityLogsCount = await prisma.activityLog.count();
        
        console.log('--- Database Log Counts ---');
        console.log('Total AppUsageLog entries:', appLogsCount);
        console.log('Total ActivityLog entries:', activityLogsCount);

        if (appLogsCount > 0) {
            const sampleAppLogs = await prisma.appUsageLog.findMany({
                take: 3,
                orderBy: { timestamp: 'desc' },
                include: { employee: true }
            });
            console.log('\n--- Sample AppUsageLog Entries ---');
            sampleAppLogs.forEach(log => {
                console.log(`- ${log.employee.fullName}: App=${log.appName}, Domain=${log.domain}, Prod=${log.productivity}, Time=${log.timestamp.toISOString()}, Duration=${log.duration}s`);
            });
        } else {
            console.log('\nNO entries found in AppUsageLog table!');
        }

        if (activityLogsCount > 0) {
            const sampleActivityLogs = await prisma.activityLog.findMany({
                take: 3,
                orderBy: { timestamp: 'desc' },
                include: { employee: true }
            });
            console.log('\n--- Sample ActivityLog Entries ---');
            sampleActivityLogs.forEach(log => {
                console.log(`- ${log.employee.fullName}: Type=${log.activityType}, App=${log.appWebsite}, Prod=${log.productivity}, Time=${log.timestamp.toISOString()}`);
            });
        }

    } catch (e) {
        console.error('Error checking logs:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
