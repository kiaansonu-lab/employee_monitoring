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
        
        org.employees.forEach(emp => {
            console.log(`- ${emp.fullName}: HourlyRate=${emp.hourlyRate}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
