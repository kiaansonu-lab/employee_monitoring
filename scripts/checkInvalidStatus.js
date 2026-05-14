const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmployees() {
    try {
        console.log('Checking all employees for invalid status...');
        const employees = await prisma.employee.findMany({
            select: { id: true, fullName: true, status: true }
        });
        
        console.log(`Found ${employees.length} employees.`);
        
        const invalid = employees.filter(e => !e.status || e.status === '');
        if (invalid.length > 0) {
            console.log('Found employees with invalid status:');
            console.table(invalid);
        } else {
            console.log('No employees with empty status found via Prisma (Prisma might be filtering them out or failing to load).');
        }

        // Try raw query to see what's actually in the DB
        console.log('Running raw query to check for empty strings in status column...');
        const rawResults = await prisma.$queryRawUnsafe('SELECT id, fullName, status FROM employees WHERE status = "" OR status IS NULL');
        console.log('Raw query results:', rawResults);

    } catch (error) {
        console.error('Error during check:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEmployees();
