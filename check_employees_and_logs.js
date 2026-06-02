const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                _count: {
                    select: {
                        appUsageLogs: true,
                        activityLogs: true,
                        attendance: true,
                        screenshots: true
                    }
                }
            }
        });
        console.log('--- ALL EMPLOYEES ---');
        employees.forEach(emp => {
            console.log(`- ID: ${emp.id}, Name: ${emp.fullName}, Email: ${emp.email}, Role: ${emp.role}, Status: ${emp.status}`);
            console.log(`  Counts: AppUsageLogs=${emp._count.appUsageLogs}, ActivityLogs=${emp._count.activityLogs}, Attendance=${emp._count.attendance}, Screenshots=${emp._count.screenshots}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
