const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmployees() {
    const activeEmps = await prisma.employee.findMany({
        where: { status: 'ACTIVE' }
    });
    console.log('Active Employees:', activeEmps.length);
    console.log('Statuses found:', await prisma.employee.groupBy({ by: ['status'], _count: true }));
    process.exit(0);
}

checkEmployees();
