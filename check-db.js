const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const org = await prisma.organization.findFirst({
            include: { employees: true }
        });
        
        if (!org) {
            console.log('No organization found');
            return;
        }
        
        console.log(`Organization: ${org.legalName} (${org.id})`);
        console.log(`Employee Count: ${org.employees.length}`);
        
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date();
        
        const employees = await prisma.employee.findMany({
            where: { organizationId: org.id },
            include: {
                attendance: { where: { date: { gte: start, lte: end } } },
                manualTimeEntries: { where: { startTime: { gte: start }, endTime: { lte: end } } }
            }
        });
        
        console.log(`Employees found via findMany: ${employees.length}`);
        
        employees.forEach(emp => {
            const attSeconds = emp.attendance.reduce((acc, a) => acc + (a.duration || 0), 0);
            const manualSeconds = (emp.manualTimeEntries || []).reduce((acc, m) => acc + (m.duration || 0), 0);
            const totalHours = (attSeconds + manualSeconds) / 3600;
            
            console.log(`- ${emp.fullName}: Attendance=${emp.attendance.length}, ManualTime=${emp.manualTimeEntries?.length || 0}, TotalHours=${totalHours.toFixed(2)}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
