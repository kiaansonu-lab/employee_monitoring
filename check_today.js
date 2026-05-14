const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await prisma.attendance.count({
        where: { date: today }
    });
    console.log('Attendance Records for TODAY:', count);
    process.exit(0);
}

checkToday();
