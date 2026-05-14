const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAttendance() {
    try {
        const employees = await prisma.employee.findMany();
        if (employees.length === 0) {
            console.log('No employees found.');
            process.exit(1);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('Targeting "Today" as:', today.toISOString());

        for (let i = 0; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            console.log(`Checking date: ${dateStr}`);
            
            for (const emp of employees) {
                // Remove existing for this date to ensure fresh seed for Today
                await prisma.attendance.deleteMany({
                    where: { employeeId: emp.id, date: date }
                });

                const clockIn = new Date(new Date(date).setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0));
                const clockOut = new Date(new Date(date).setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0));
                const duration = Math.floor((clockOut - clockIn) / 1000);

                await prisma.attendance.create({
                    data: {
                        employeeId: emp.id,
                        organizationId: emp.organizationId,
                        date,
                        clockIn,
                        clockOut,
                        duration,
                        status: 'PRESENT'
                    }
                });
            }
        }
        console.log('Seed completed successfully for last 8 days (including today).');
    } catch (err) {
        console.error('Seed error:', err.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

seedAttendance();
