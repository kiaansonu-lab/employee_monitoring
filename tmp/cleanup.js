const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAdminEmployees() {
    try {
        console.log('Finding admins and managers with dummy employee records...');
        const adminManagers = await prisma.user.findMany({
            where: { 
                role: { in: ['ADMIN', 'MANAGER'] },
                employeeId: { not: null }
            },
            include: { employee: true }
        });

        console.log(`Found ${adminManagers.length} records to clean up.`);

        for (const user of adminManagers) {
            console.log(`Processing: ${user.email}`);
            
            // 1. Unlink array
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: user.name || user.employee.fullName,
                    avatar: user.avatar || user.employee.avatar,
                    employeeId: null
                }
            });

            // 2. Delete the dummy employee record safely
            await prisma.employee.delete({
                where: { id: user.employeeId }
            });
            console.log(`Deleted dummy employee record for ${user.email}`);
        }
        
        console.log('Cleanup completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupAdminEmployees();
