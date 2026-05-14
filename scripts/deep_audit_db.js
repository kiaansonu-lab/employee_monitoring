const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepAudit() {
    const employeeId = 'eaae7d7f-bf8d-4676-9bf7-a3882c7bfae6';
    console.log(`Deep audit for employee: ${employeeId}`);
    
    try {
        // 1. Describe table
        const columns = await prisma.$queryRaw`DESCRIBE employees`;
        console.log('Table Structure:', JSON.stringify(columns, null, 2));

        // 2. Dump all values for this employee
        const empDump = await prisma.$queryRaw`SELECT * FROM employees WHERE id = ${employeeId}`;
        console.log('Raw Employee Dump:', JSON.stringify(empDump, null, 2));

        // 3. Dump User record
        const userDump = await prisma.$queryRaw`SELECT * FROM users WHERE employeeId = ${employeeId}`;
        console.log('Raw User Dump:', JSON.stringify(userDump, null, 2));

        // 4. Check for ANY column that might have an empty string
        if (empDump[0]) {
            Object.keys(empDump[0]).forEach(key => {
                if (empDump[0][key] === '') {
                    console.log(`FOUND EMPTY STRING IN COLUMN: ${key}`);
                }
            });
        }

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

deepAudit();
