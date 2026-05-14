const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const employee = await prisma.employee.findFirst({ where: { email: 'employee@example.com' } });
    const project = await prisma.project.findFirst({ where: { name: 'insight ful' } });

    if (employee && project) {
        console.log(`Assigning ${employee.fullName} to project ${project.name}...`);
        await prisma.projectAssignment.upsert({
            where: {
                projectId_employeeId: {
                    projectId: project.id,
                    employeeId: employee.id
                }
            },
            update: {},
            create: {
                projectId: project.id,
                employeeId: employee.id
            }
        });
        console.log('Assignment successful.');
    } else {
        console.log('Employee or Project not found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
