const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Clearing attendance table...');
    const deleted = await prisma.attendance.deleteMany({});
    console.log(`Deleted ${deleted.count} records from attendance table.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
