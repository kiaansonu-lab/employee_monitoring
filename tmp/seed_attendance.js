const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const employees = await prisma.employee.findMany();

    if (employees.length === 0) {
        console.log('No employees found. Please seed employees first.');
        return;
    }

    const organizationId = employees[0].organizationId;

    console.log('Seeding attendance and shifts...');

    for (const emp of employees) {
        // Seed 7 days of attendance
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const clockIn = new Date(date);
            clockIn.setHours(9, 0, 0, 0);

            const clockOut = new Date(date);
            clockOut.setHours(17, 0, 0, 0);

            await prisma.attendance.create({
                data: {
                    employeeId: emp.id,
                    organizationId: organizationId,
                    date: date,
                    clockIn: clockIn,
                    clockOut: clockOut,
                    duration: 8 * 3600,
                    late: false
                }
            });

            // Seed 7 days of shifts
            await prisma.shift.create({
                data: {
                    employeeId: emp.id,
                    organizationId: organizationId,
                    date: date,
                    startTime: '09:00',
                    endTime: '17:00'
                }
            });
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
