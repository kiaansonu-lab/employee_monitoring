const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const assignments = await prisma.projectAssignment.findMany({
        include: { project: true, employee: true }
    });
    console.log('--- Project Assignments ---');
    assignments.forEach(a => {
        console.log(`Project: ${a.project.name}, Employee: ${a.employee.fullName}, EmpID: ${a.employeeId}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
