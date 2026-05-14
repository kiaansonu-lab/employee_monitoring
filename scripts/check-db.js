const prisma = require('../src/config/db');

async function main() {
    console.log('--- EMPLOYEES ---');
    try {
        const employees = await prisma.employee.findMany();
        console.log(employees.map(e => ({ id: e.id, email: e.email, status: e.status })));
    } catch(e) { console.error('Employee fetch failed:', e.message); }

    console.log('--- TEAMS ---');
    try {
        const teams = await prisma.team.findMany();
        console.log(teams.map(t => ({ id: t.id, name: t.name, organizationId: t.organizationId })));
    } catch(e) { console.error('Team fetch failed:', e.message); }

    console.log('--- ORGANIZATIONS ---');
    try {
        const orgs = await prisma.organization.findMany();
        console.log(orgs.map(o => ({ id: o.id, name: o.name })));
    } catch(e) { console.error('Org fetch failed:', e.message); }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
