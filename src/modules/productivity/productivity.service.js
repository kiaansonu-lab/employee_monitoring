const prisma = require('../../config/db');

const productivityService = {
    // ── Tags ────────────────────────────────────────────────────────
    getTags: async (organizationId) => {
        return await prisma.productivityTag.findMany({
            where: { organizationId },
            include: { _count: { select: { rules: true } } }
        });
    },

    createTag: async (organizationId, data) => {
        return await prisma.productivityTag.create({
            data: {
                ...data,
                organizationId
            }
        });
    },

    updateTag: async (tagId, data) => {
        return await prisma.productivityTag.update({
            where: { id: tagId },
            data
        });
    },

    deleteTag: async (tagId) => {
        return await prisma.productivityTag.delete({
            where: { id: tagId }
        });
    },

    // ── Rules (Branding/Classification) ──────────────────────────────
    getRules: async (organizationId) => {
        return await prisma.productivityRule.findMany({
            where: { organizationId },
            include: { tag: true }
        });
    },

    upsertRule: async (organizationId, data) => {
        const { domain, ...rest } = data;
        return await prisma.productivityRule.upsert({
            where: {
                organizationId_domain: {
                    organizationId,
                    domain
                }
            },
            update: rest,
            create: {
                ...rest,
                domain,
                organizationId
            }
        });
    },

    // ── Usage ────────────────────────────────────────────────────────
    getAppsUsage: async (organizationId, startDate, endDate) => {
        const where = { organizationId };
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const [logs, rules] = await Promise.all([
            prisma.appUsageLog.findMany({ where }),
            prisma.productivityRule.findMany({ where: { organizationId } })
        ]);

        const ruleMap = new Map(rules.map(r => [r.domain, r]));
        const appMap = {};

        logs.forEach(log => {
            const key = log.appName;
            if (!appMap[key]) {
                const rule = ruleMap.get(log.domain);
                appMap[key] = {
                    appName: log.appName,
                    domain: log.domain,
                    category: rule?.category || log.category,
                    productivity: rule?.productivity || log.productivity,
                    tagId: rule?.tagId || null,
                    totalUsage: 0,
                };
            }
            appMap[key].totalUsage += log.duration || 0;
        });

        return Object.values(appMap)
            .map(app => ({
                ...app,
                totalUsageHours: Math.round((app.totalUsage / 3600) * 10) / 10,
            }))
            .sort((a, b) => b.totalUsage - a.totalUsage);
    },
};

const APPS = [
    { name: 'VS Code', domain: 'visualstudio.com', category: 'Development', productivity: 'PRODUCTIVE' },
    { name: 'Google Chrome', domain: 'google.com', category: 'Research', productivity: 'PRODUCTIVE' },
    { name: 'Slack', domain: 'slack.com', category: 'Communication', productivity: 'PRODUCTIVE' },
    { name: 'Zoom', domain: 'zoom.us', category: 'Meeting', productivity: 'NEUTRAL' },
    { name: 'Spotify', domain: 'spotify.com', category: 'Entertainment', productivity: 'UNPRODUCTIVE' },
    { name: 'YouTube', domain: 'youtube.com', category: 'Entertainment', productivity: 'UNPRODUCTIVE' },
    { name: 'Terminal', domain: 'iterm2.com', category: 'Development', productivity: 'PRODUCTIVE' }
];

module.exports = { ...productivityService, APPS };
