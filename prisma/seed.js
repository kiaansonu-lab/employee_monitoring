const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Organization
    const organization = await prisma.organization.upsert({
        where: { id: 'default-org-id' },
        update: {},
        create: {
            id: 'default-org-id',
            legalName: 'Insightful Corp',
            industry: 'Technology',
            organizationSize: '11-50 employees',
            timeZone: 'UTC+5:30 (IST)',
            workStartTime: '09:00',
            workEndTime: '18:00',
            workDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
        },
    });
    console.log('Organization created:', organization.legalName);

    // 2. Create Team
    const team = await prisma.team.upsert({
        where: { id: 'default-team-id' },
        update: {},
        create: {
            id: 'default-team-id',
            name: 'Development Team',
            organizationId: organization.id,
        },
    });
    console.log('Team created:', team.name);

    const password = await bcrypt.hash('123456', 10);

    const usersToCreate = [
        {
            name: 'Jane Admin',
            email: 'admin@example.com',
            role: 'ADMIN',
        },
        {
            name: 'Mike Manager',
            email: 'manager@example.com',
            role: 'MANAGER',
        },
        {
            name: 'Alex Employee',
            email: 'employee@example.com',
            role: 'EMPLOYEE',
        },
    ];

    for (const userData of usersToCreate) {
        let employeeId = null;

        // Create Employee record for EVERY user (Admin, Manager, Employee)
        // This ensures organizationId and other profile details are accessible
        const employee = await prisma.employee.upsert({
            where: { email: userData.email },
            update: {
                fullName: userData.name,
                role: userData.role,
                organizationId: organization.id,
                teamId: userData.role === 'EMPLOYEE' ? team.id : null,
            },
            create: {
                fullName: userData.name,
                email: userData.email,
                role: userData.role,
                organizationId: organization.id,
                teamId: userData.role === 'EMPLOYEE' ? team.id : null,
            },
        });
        employeeId = employee.id;

        // Create User (All roles)
        await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                password: password,
                role: userData.role,
                employeeId: employeeId,
            },
            create: {
                email: userData.email,
                password: password,
                role: userData.role,
                employeeId: employeeId,
            },
        });
        console.log(`User created: ${userData.email} (${userData.role}) with Employee entry ${employeeId}`);
    }

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
