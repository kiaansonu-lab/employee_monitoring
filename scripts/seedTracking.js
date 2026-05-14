const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function main() {
    console.log('Seeding tracking settings...');

    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error('No organization found. Please create one first.');
        return;
    }

    const trackingProfiles = [
        {
            title: 'Office Standard',
            computerType: 'company',
            isDefault: false,
            visibility: 'visible',
            screenshotsPerHour: 3,
            idleTime: 5,
            trackingScenario: 'unlimited',
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            permissions: { canAnalyze: true, canSeeApps: true, canAddManual: false },
            organizationId: org.id
        },
        {
            title: 'Remote Flexible',
            computerType: 'personal',
            isDefault: false,
            visibility: 'visible',
            screenshotsPerHour: 6,
            idleTime: 10,
            trackingScenario: 'manual',
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            permissions: { canAnalyze: true, canSeeApps: true, canAddManual: true },
            organizationId: org.id
        },
        {
            title: 'High Security (Stealth)',
            computerType: 'company',
            isDefault: false,
            visibility: 'stealth',
            screenshotsPerHour: 0,
            idleTime: 1,
            trackingScenario: 'unlimited',
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            permissions: { canAnalyze: false, canSeeApps: false, canAddManual: false },
            organizationId: org.id
        }
    ];

    for (const p of trackingProfiles) {
        await prisma.trackingSetting.create({
            data: p
        });
    }

    // Initialize Advanced Settings if not exists
    await prisma.advancedTrackingSetting.upsert({
        where: { organizationId: org.id },
        update: {},
        create: {
            organizationId: org.id,
            shiftThreshold: 8,
            strictTime: false,
            inactivityPopups: true,
            identificationMode: 'computer-user',
            showEngagement: true
        }
    });

    console.log('Tracking settings seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
