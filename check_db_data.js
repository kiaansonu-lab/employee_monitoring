const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    const attendanceCount = await prisma.attendance.count();
    const firstRecords = await prisma.attendance.findMany({
        take: 5,
        include: { employee: true }
    });
    console.log('Total Attendance Records:', attendanceCount);
    console.log('Sample Records:', JSON.stringify(firstRecords, null, 2));
    process.exit(0);
}

checkData();
