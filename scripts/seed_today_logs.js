const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const organizationId = 'default-org-id';
  const employee = await prisma.employee.findFirst({ where: { email: 'employee@example.com' } });
  
  if (!employee) {
    console.log('Employee not found');
    return;
  }

  console.log(`Seeding logs for ${employee.fullName} on ${new Date().toDateString()}...`);

  const logs = [
    { type: 'ACTIVE', hour: 9, duration: 1800 }, 
    { type: 'IDLE', hour: 10, duration: 600 },   
    { type: 'BREAK', hour: 11, duration: 900 },  
    { type: 'ACTIVE', hour: 11, duration: 1200 }, 
    { type: 'ACTIVE', hour: 12, duration: 2400 }, 
  ];

  for (const log of logs) {
    const logDate = new Date();
    logDate.setHours(log.hour, 0, 0, 0);

    await prisma.activityLog.create({
      data: {
        organizationId,
        employeeId: employee.id,
        activityType: log.type,
        duration: log.duration,
        timestamp: logDate,
        productivity: log.type === 'ACTIVE' ? 'PRODUCTIVE' : (log.type === 'BREAK' ? 'NEUTRAL' : 'UNPRODUCTIVE'),
        appWebsite: 'Development'
      }
    });
  }

  console.log('Seeding complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
