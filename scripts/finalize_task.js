const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const task = await prisma.task.findFirst({
        where: { name: 'insight ful' }
    });

    if (task) {
        console.log(`Updating task "${task.name}" to FINALIZED...`);
        await prisma.task.update({
            where: { id: task.id },
            data: { status: 'FINALIZED' }
        });
        console.log('Task updated successfully.');
    } else {
        console.log('Task "insight ful" not found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
