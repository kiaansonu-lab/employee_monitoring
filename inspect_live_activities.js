const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const live = await prisma.liveActivity.findMany({
            where: { employeeId: 'e0497c2a-ca6f-48c9-bb55-ff255eb56810' },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log('--- Last 5 LiveActivity Entries for demo ---');
        console.log(JSON.stringify(live, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
