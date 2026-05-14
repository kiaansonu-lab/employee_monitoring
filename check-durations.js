const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const stats = await prisma.attendance.aggregate({
            _sum: { duration: true },
            _count: { id: true },
            where: { duration: { gt: 0 } }
        });
        
        console.log(`Records with duration > 0: ${stats._count.id}`);
        console.log(`Total duration (seconds): ${stats._sum.duration}`);

        const top10 = await prisma.attendance.findMany({
            where: { duration: { gt: 0 } },
            take: 10,
            orderBy: { duration: 'desc' },
            include: { employee: true }
        });
        
        console.log('\nTop 10 Attendance Records by Duration:');
        top10.forEach(a => {
            console.log(`- ${a.employee.fullName}: Date=${a.date.toISOString()} Duration=${a.duration} sec (${(a.duration/3600).toFixed(2)}h)`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
