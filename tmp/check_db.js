const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const taskCount = await prisma.task.count();
    const projectCount = await prisma.project.count();
    const activityCount = await prisma.activityLog.count();
    const employeeCount = await prisma.employee.count();

    console.log({
        taskCount,
        projectCount,
        activityCount,
        employeeCount
    });

    if (taskCount > 0) {
        const tasks = await prisma.task.findMany({ take: 5 });
        console.log('Sample Tasks:', tasks);
    }
    
    if (projectCount > 0) {
        const projects = await prisma.project.findMany({ take: 5 });
        console.log('Sample Projects:', projects);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
