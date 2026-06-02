const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const logs = await prisma.activityLog.findMany({
            where: { employee: { fullName: 'demo' } },
            orderBy: { timestamp: 'desc' },
            take: 5
        });

        console.log('--- Last 5 ActivityLog Entries for demo ---');
        console.log(JSON.stringify(logs, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
