const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class OrganizationService {
    async getOrganization() {
        // Since it's a single organization SaaS for now, we get the first one
        // In a multi-tenant app, we'd filter by ID from session/user
        let org = await prisma.organization.findFirst({
            include: {
                complianceSetting: true
            }
        });

        if (!org) {
            // Create a default one if none exists (for development)
            org = await prisma.organization.create({
                data: {
                    legalName: "Insightful Corp",
                    timeZone: "UTC+5:30 (IST)",
                    workStartTime: "09:00",
                    workEndTime: "18:00",
                    workDays: "Monday,Tuesday,Wednesday,Thursday,Friday"
                }
            });
        }

        return org;
    }

    async updateOrganization(id, data) {
        // Convert workDays array to string for Prisma
        const updateData = {
            ...data,
            workDays: Array.isArray(data.workDays) ? data.workDays.join(',') : data.workDays
        };

        return await prisma.organization.update({
            where: { id },
            data: updateData
        });
    }

    async createOrganization(data) {
        return await prisma.organization.create({
            data: {
                ...data,
                workDays: Array.isArray(data.workDays) ? data.workDays.join(',') : data.workDays
            }
        });
    }
}

module.exports = new OrganizationService();
