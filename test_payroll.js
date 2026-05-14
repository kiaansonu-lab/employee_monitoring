const { getPayrollRecords } = require('./src/modules/payroll/payroll.service');
const prisma = require('./src/config/db');

async function test() {
    try {
        const organizationId = 'default-org-id'; // Based on my previous findings
        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = new Date();
        
        const records = await getPayrollRecords(organizationId, start, end, {});
        console.log(JSON.stringify(records, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
