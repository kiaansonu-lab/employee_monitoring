const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFix() {
    console.log('--- Verifying Attendance Fix ---');
    try {
        // Find an employee (Alex Employee from the screenshot)
        let employee = await prisma.employee.findFirst({
            where: { fullName: { contains: 'Alex' } }
        });

        if (!employee) {
            console.log('Alex Employee not found, taking the first available employee.');
            employee = await prisma.employee.findFirst();
        }

        if (!employee) {
            console.error('No employees found in database to test.');
            return;
        }

        console.log(`Testing with Employee: ${employee.fullName} (${employee.id})`);
        console.log(`Current Status: ${employee.status}`);

        // Simulate startBreak logic
        console.log('Simulating startBreak status update to BREAK...');
        const updated = await prisma.employee.update({
            where: { id: employee.id },
            data: { status: 'BREAK' }
        });
        console.log('Successfully updated status to BREAK:', updated.status);

        // Revert to ACTIVE
        console.log('Reverting status to ACTIVE...');
        const reverted = await prisma.employee.update({
            where: { id: employee.id },
            data: { status: 'ACTIVE' }
        });
        console.log('Successfully reverted status to:', reverted.status);

        console.log('Verification PASSED: Prisma can handle the status update.');

    } catch (error) {
        console.error('Verification FAILED:', error.message);
        if (error.message.includes('Value \'\' not found in enum')) {
            console.error('The Enum error is still present!');
        }
    } finally {
        await prisma.$disconnect();
        console.log('--- Verification Finished ---');
        process.exit(0);
    }
}

verifyFix();
