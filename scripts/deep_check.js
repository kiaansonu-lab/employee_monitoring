const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const employees = await prisma.employee.findMany({
        include: { user: true, organization: true }
    });
    console.log('--- Employees ---');
    employees.forEach(e => {
        console.log(`Emp: ${e.fullName}, ID: ${e.id}, OrgID: ${e.organizationId}, UserID: ${e.user?.id}, Role: ${e.role}`);
    });

    const users = await prisma.user.findMany();
    console.log('\n--- Users ---');
    users.forEach(u => {
        console.log(`User: ${u.email}, ID: ${u.id}, Role: ${u.role}, EmpID: ${u.employeeId}`);
    });

    const tasks = await prisma.task.findMany({
        include: { organization: true, project: true }
    });
    console.log('\n--- Tasks ---');
    tasks.forEach(t => {
        console.log(`Task: ${t.name}, Status: ${t.status}, OrgID: ${t.organizationId}, EmpID: ${t.employeeId}, Due: ${t.dueDate}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
