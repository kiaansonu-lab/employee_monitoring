const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixData() {
    console.log('--- Starting Database Cleanup ---');
    try {
        // 1. Fix Employee.status
        const employees = await prisma.employee.findMany({
            select: { id: true, fullName: true, status: true }
        });
        
        const validStatuses = ['INVITED', 'ACTIVE', 'OFFLINE', 'IDLE', 'BREAK', 'DEACTIVATED', 'MERGED'];
        let fixCount = 0;

        for (const emp of employees) {
            // Check if status is invalid or empty
            if (!emp.status || !validStatuses.includes(emp.status) || emp.status.trim() === '') {
                console.log(`Fixing status for: ${emp.fullName} (${emp.id}). Current: "${emp.status}" -> ACTIVE`);
                await prisma.employee.update({
                    where: { id: emp.id },
                    data: { status: 'ACTIVE' }
                });
                fixCount++;
            }
        }
        console.log(`Cleaned up ${fixCount} employee records.`);

        // 2. Optional: Fix broken user/employee links (any user with employeeId as empty string)
        const users = await prisma.user.findMany({
            where: { OR: [{ employeeId: '' }, { employeeId: null }] }
        });
        console.log(`Found ${users.length} users with missing or empty employeeId.`);

    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await prisma.$disconnect();
        console.log('--- Cleanup Finished ---');
        process.exit(0);
    }
}

fixData();
