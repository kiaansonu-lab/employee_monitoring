const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        console.log(`Checking for date range: ${start.toISOString()} to ${end.toISOString()}`);
        
        const sessions = await prisma.attendance.findMany({
            where: {
                date: { gte: start, lte: end }
            },
            include: { employee: true }
        });
        
        console.log(`Attendance records for today: ${sessions.length}`);
        sessions.forEach(s => {
            console.log(`- ${s.employee.fullName}: ClockIn=${s.clockIn}, ClockOut=${s.clockOut}, Duration=${s.duration}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
