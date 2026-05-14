const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const orgs = await prisma.organization.findMany({
            include: { _count: { select: { employees: true, attendance: true } } }
        });
        
        console.log(`Total Organizations: ${orgs.length}`);
        orgs.forEach(o => {
            console.log(`Org: ${o.legalName} (${o.id}), Employees: ${o._count.employees}, Attendance: ${o._count.attendance}`);
        });

        const latestAttendance = await prisma.attendance.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: { employee: true }
        });
        
        console.log('\nLatest Attendance Records:');
        latestAttendance.forEach(a => {
            console.log(`- ${a.employee.fullName} (Org: ${a.organizationId}): ${a.date.toISOString()} Duration=${a.duration}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
