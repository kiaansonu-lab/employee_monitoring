require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get an organization ID
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error("No organization found. Please create one first.");
        return;
    }

    console.log(`Using Organization: ${org.legalName} (${org.id})`);

    // 1. Create Productivity Tags
    const tagsData = [
        { name: 'Core Work', color: '#52C41A' },
        { name: 'Social Media', color: '#FF4D4F' },
        { name: 'Development', color: '#1890FF' },
        { name: 'Meetings', color: '#722ED1' },
    ];

    const tags = [];
    for (const data of tagsData) {
        let tag = await prisma.productivityTag.findFirst({
            where: {
                organizationId: org.id,
                name: data.name
            }
        });

        if (tag) {
            tag = await prisma.productivityTag.update({
                where: { id: tag.id },
                data: { color: data.color }
            });
            console.log(`Tag updated: ${tag.name}`);
        } else {
            tag = await prisma.productivityTag.create({
                data: {
                    name: data.name,
                    color: data.color,
                    organizationId: org.id
                }
            });
            console.log(`Tag created: ${tag.name}`);
        }
        tags.push(tag);
    }

    // 2. Create Productivity Rules
    const rules = [
        { domain: 'github.com', appName: 'GitHub', tagName: 'Development' },
        { domain: 'slack.com', appName: 'Slack', tagName: 'Core Work' },
        { domain: 'facebook.com', appName: 'Facebook', tagName: 'Social Media' },
        { domain: 'zoom.us', appName: 'Zoom', tagName: 'Meetings' },
    ];

    for (const rule of rules) {
        const tag = tags.find(t => t.name === rule.tagName);
        if (tag) {
            await prisma.productivityRule.upsert({
                where: {
                    organizationId_domain: {
                        organizationId: org.id,
                        domain: rule.domain
                    }
                },
                update: { tagId: tag.id, appName: rule.appName },
                create: {
                    domain: rule.domain,
                    appName: rule.appName,
                    tagId: tag.id,
                    organizationId: org.id
                }
            });
            console.log(`Rule created/updated for: ${rule.domain}`);
        }
    }

    console.log("Seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
