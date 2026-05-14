const prisma = require('../config/db');
const { APPS } = require('../modules/productivity/productivity.service');

async function generateAppUsageLogs() {
    try {
        const employees = await prisma.employee.findMany({
            where: { status: { in: ['ACTIVE'] } },
            select: { id: true, fullName: true, organizationId: true },
        });

        if (!employees || employees.length === 0) return;

        // Pick 2-4 employees randomly
        const count = Math.min(employees.length, Math.floor(Math.random() * 3) + 2);
        const selected = employees.sort(() => 0.5 - Math.random()).slice(0, count);

        for (const emp of selected) {
            // Pick 1-3 random apps per employee
            const appCount = Math.floor(Math.random() * 3) + 1;
            const apps = APPS.sort(() => 0.5 - Math.random()).slice(0, appCount);

            for (const app of apps) {
                const duration = Math.floor(Math.random() * 1800) + 300; // 5 to 35 minutes in seconds
                await prisma.appUsageLog.create({
                    data: {
                        employeeId: emp.id,
                        organizationId: emp.organizationId,
                        appName: app.name,
                        domain: app.domain,
                        category: app.category,
                        productivity: app.productivity,
                        duration,
                        timestamp: new Date(),
                    }
                });
            }
            console.log(`[AppUsageSimulator] Logged ${apps.length} app(s) for ${emp.fullName}`);
        }
    } catch (error) {
        console.error('[AppUsageSimulator] Error:', error.message);
    }
}

function startAppUsageSimulator() {
    console.log('[AppUsageSimulator] Starting (every 5 minutes)...');
    generateAppUsageLogs();
    setInterval(generateAppUsageLogs, 5 * 60 * 1000);
}

module.exports = { startAppUsageSimulator, generateAppUsageLogs };
