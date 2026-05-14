const prisma = require('../src/config/db');

async function main() {
    const emp = await prisma.employee.findUnique({
        where: { email: 'testuser@example.com' }
    });
    console.log(JSON.stringify(emp, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
