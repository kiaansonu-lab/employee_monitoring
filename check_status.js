const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({ 
        where: { email: { contains: 'demo' } },
        include: { employee: true } 
    });
    console.log('Search Results for "demo":', JSON.stringify(users, null, 2));
    process.exit(0);
}

check();
