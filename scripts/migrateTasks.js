const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting migration with raw queries...');
  
  // Map WORKING_ON_IT and IN_PROGRESS to IN_OPERATIONS
  await prisma.$executeRawUnsafe(`UPDATE tasks SET status = 'IN_OPERATIONS' WHERE status IN ('WORKING_ON_IT', 'IN_PROGRESS')`);
  
  // Map DONE and COMPLETED to FINALIZED
  await prisma.$executeRawUnsafe(`UPDATE tasks SET status = 'FINALIZED' WHERE status IN ('DONE', 'COMPLETED')`);
  
  // Map QA and FOR_CLIENT_REVIEW to QUALITY_ASSURANCE
  await prisma.$executeRawUnsafe(`UPDATE tasks SET status = 'QUALITY_ASSURANCE' WHERE status IN ('QA', 'FOR_CLIENT_REVIEW')`);
  
  // Map everything else that is not in the new enum to BACKLOG
  await prisma.$executeRawUnsafe(`UPDATE tasks SET status = 'BACKLOG' WHERE status NOT IN ('BACKLOG', 'IN_OPERATIONS', 'QUALITY_ASSURANCE', 'FINALIZED')`);

  console.log('Migration complete.');
  await prisma.$disconnect();
}

migrate();
