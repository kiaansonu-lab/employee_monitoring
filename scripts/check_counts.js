const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany();
    console.log('--- Organizations ---');
    orgs.forEach(o => console.log(`Org: ${o.legalName}, ID: ${o.id}`));

    const projects = await prisma.project.findMany();
    console.log('\n--- Projects ---');
    projects.forEach(p => console.log(`Project: ${p.name}, OrgID: ${p.organizationId}`));

    const tasks = await prisma.task.findMany();
    console.log('\n--- Tasks ---');
    tasks.forEach(t => console.log(`Task: ${t.name}, OrgID: ${t.organizationId}, ProjectID: ${t.projectId}`));

    const employees = await prisma.employee.findMany();
    console.log('\n--- Employees ---');
    employees.forEach(e => console.log(`Employee: ${e.fullName}, OrgID: ${e.organizationId}, ID: ${e.id}`));

    const activityLogs = await prisma.activityLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' }
    });
    console.log('\n--- Recent Activity Logs (last 10) ---');
    activityLogs.forEach(l => console.log(`Log ID: ${l.id}, Type: ${l.activityType}, Duration: ${l.duration}, OrgID: ${l.organizationId}, EmpID: ${l.employeeId}, Time: ${l.timestamp}`));

    const today = new Date().toISOString().split('T')[0];
    const todayLogsCount = await prisma.activityLog.count({
        where: {
            timestamp: {
                gte: new Date(today)
            }
        }
    });
    console.log(`\nToday's Activity Logs Count: ${todayLogsCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
