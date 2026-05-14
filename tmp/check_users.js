
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany({
        include: { employee: true }
    });
    console.log('--- USERS ---');
    users.forEach(u => {
        console.log(`ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, EmployeeId: ${u.employeeId}, EmployeeName: ${u.employee?.fullName}`);
    });
    await prisma.$disconnect();
}

checkUsers().catch(e => {
    console.error(e);
    process.exit(1);
});
