const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmployee() {
    const employeeId = 'eaae7d7f-bf8d-4676-9bf7-a3882c7bfae6';
    console.log(`Checking employee: ${employeeId}`);
    
    try {
        const result = await prisma.$queryRaw`SELECT id, fullName, status, role, computerType FROM employees WHERE id = ${employeeId}`;
        console.log('Database Result:', JSON.stringify(result, null, 2));

        if (result && result.length > 0) {
            const emp = result[0];
            let needsFix = false;
            let fixSql = "UPDATE employees SET ";
            let updates = [];

            if (!emp.status || emp.status.trim() === '') {
                console.log('Status is empty!');
                updates.push("status = 'ACTIVE'");
                needsFix = true;
            }
            if (!emp.role || emp.role.trim() === '') {
                console.log('Role is empty!');
                updates.push("role = 'EMPLOYEE'");
                needsFix = true;
            }
            if (!emp.computerType || emp.computerType.trim() === '') {
                console.log('computerType is empty!');
                updates.push("computerType = 'COMPANY'");
                needsFix = true;
            }

            if (needsFix) {
                fixSql += updates.join(", ") + ` WHERE id = '${employeeId}'`;
                console.log('Executing fix:', fixSql);
                await prisma.$executeRawUnsafe(fixSql);
                console.log('Employee fixed.');
            } else {
                console.log('Employee data looks valid for known enums.');
            }
        }

        // Check for any other employees with empty enum fields
        const allCorrupts = await prisma.$queryRaw`
            SELECT id, fullName 
            FROM employees 
            WHERE status = '' OR status IS NULL 
               OR role = '' OR role IS NULL 
               OR computerType = '' OR computerType IS NULL
        `;
        console.log(`Found ${allCorrupts.length} other corrupt employees.`);
        
        for (const c of allCorrupts) {
            console.log(`Fixing employee ${c.fullName} (${c.id})...`);
            await prisma.$executeRaw`
                UPDATE employees 
                SET status = COALESCE(NULLIF(status, ''), 'ACTIVE'),
                    role = COALESCE(NULLIF(role, ''), 'EMPLOYEE'),
                    computerType = COALESCE(NULLIF(computerType, ''), 'COMPANY')
                WHERE id = ${c.id}
            `;
        }

    } catch (err) {
        console.error('Error during check:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkEmployee();
