const prisma = require('../config/db');

/** Tag names → productivity enum for scoring */
const TAG_PRODUCTIVITY_MAP = {
    Focus: 'PRODUCTIVE',
    Productive: 'PRODUCTIVE',
    Collaborative: 'NEUTRAL',
    Neutral: 'NEUTRAL',
    Learning: 'PRODUCTIVE',
    Distraction: 'UNPRODUCTIVE',
    Unproductive: 'UNPRODUCTIVE',
};

const DEFAULT_TAGS = [
    { name: 'Focus', color: '#9254DE', productivity: 'PRODUCTIVE' },
    { name: 'Collaborative', color: '#69C0FF', productivity: 'NEUTRAL' },
    { name: 'Learning', color: '#52C41A', productivity: 'PRODUCTIVE' },
    { name: 'Distraction', color: '#FF4D4F', productivity: 'UNPRODUCTIVE' },
];

const AUTO_LABEL_KEYWORDS = [
    { keywords: ['youtube', 'netflix', 'twitch', 'tiktok', 'reddit', 'facebook', 'instagram', 'twitter', 'x.com', 'spotify'], tagName: 'Distraction' },
    { keywords: ['github', 'gitlab', 'jira', 'confluence', 'notion', 'slack', 'teams', 'zoom', 'meet', 'cursor', 'code', 'terminal', 'powershell', 'vscode', 'figma'], tagName: 'Focus' },
    { keywords: ['udemy', 'coursera', 'pluralsight', 'skillshare', 'linkedin learning', 'duolingo'], tagName: 'Learning' },
    { keywords: ['chrome', 'edge', 'firefox', 'outlook', 'gmail', 'mail'], tagName: 'Collaborative' },
];

function productivityFromTagName(tagName) {
    if (!tagName) return 'NEUTRAL';
    const direct = TAG_PRODUCTIVITY_MAP[tagName];
    if (direct) return direct;
    const found = Object.entries(TAG_PRODUCTIVITY_MAP).find(
        ([key]) => key.toLowerCase() === tagName.toLowerCase()
    );
    return found ? found[1] : 'NEUTRAL';
}

function ruleDomainKey(domain, appName) {
    const d = (domain || '').trim();
    if (d) return d.toLowerCase();
    return (appName || 'unknown').toLowerCase().replace(/\s+/g, '-');
}

async function ensureDefaultTags(organizationId) {
    const existing = await prisma.productivityTag.findMany({ where: { organizationId } });
    if (existing.length > 0) return existing;

    const created = [];
    for (const tag of DEFAULT_TAGS) {
        created.push(
            await prisma.productivityTag.create({
                data: { name: tag.name, color: tag.color, organizationId },
            })
        );
    }
    return created;
}

async function getRulesWithTags(organizationId) {
    await ensureDefaultTags(organizationId);
    return prisma.productivityRule.findMany({
        where: { organizationId },
        include: { tag: true },
    });
}

function findMatchingRule(rules, cleanAppName, appDomain, activeWindow = '') {
    const nameLower = (cleanAppName || '').toLowerCase();
    const domainLower = (appDomain || '').toLowerCase();
    const windowLower = (activeWindow || '').toLowerCase();

    for (const rule of rules) {
        const ruleDomain = (rule.domain || '').toLowerCase();
        const ruleApp = (rule.appName || '').toLowerCase();

        if (ruleDomain && (ruleDomain === domainLower || nameLower.includes(ruleDomain) || windowLower.includes(ruleDomain))) {
            return rule;
        }
        if (ruleApp && (ruleApp === nameLower || nameLower.includes(ruleApp))) {
            return rule;
        }
    }
    return null;
}

function applyRuleToResolved(base, rule) {
    if (!rule) return base;
    const productivity = rule.productivity || productivityFromTagName(rule.tag?.name);
    return {
        ...base,
        productivity,
        appCategory: rule.category || base.appCategory,
        appDomain: rule.domain || base.appDomain,
        tagId: rule.tagId || null,
    };
}

async function backfillProductivityForApp(organizationId, domain, appName, productivity, category) {
    const domainKey = ruleDomainKey(domain, appName);
    const name = appName || domain;

    await prisma.appUsageLog.updateMany({
        where: {
            organizationId,
            OR: [
                { domain: domainKey },
                { appName: name },
                ...(domain && domain !== domainKey ? [{ domain }] : []),
            ],
        },
        data: {
            productivity,
            ...(category ? { category } : {}),
        },
    });

    await prisma.activityLog.updateMany({
        where: { organizationId, appWebsite: name },
        data: { productivity },
    });
}

async function autoLabelOrganization(organizationId) {
    const tags = await ensureDefaultTags(organizationId);
    const tagByName = Object.fromEntries(tags.map((t) => [t.name, t]));

    const logs = await prisma.appUsageLog.groupBy({
        by: ['appName', 'domain'],
        where: { organizationId },
        _max: { category: true },
    });

    let updated = 0;
    for (const log of logs) {
        const nameLower = (log.appName || '').toLowerCase();
        const domainLower = (log.domain || '').toLowerCase();
        let matchedTag = null;

        for (const rule of AUTO_LABEL_KEYWORDS) {
            if (rule.keywords.some((k) => nameLower.includes(k) || domainLower.includes(k))) {
                matchedTag = tagByName[rule.tagName];
                break;
            }
        }
        if (!matchedTag) continue;

        const productivity = productivityFromTagName(matchedTag.name);
        const domain = ruleDomainKey(log.domain, log.appName);
        const category = log._max?.category || 'Uncategorized';

        await prisma.productivityRule.upsert({
            where: { organizationId_domain: { organizationId, domain } },
            update: {
                appName: log.appName,
                tagId: matchedTag.id,
                productivity,
                category,
            },
            create: {
                organizationId,
                domain,
                appName: log.appName,
                tagId: matchedTag.id,
                productivity,
                category,
            },
        });

        await backfillProductivityForApp(organizationId, domain, log.appName, productivity, category);
        updated += 1;
    }

    return { updated, tags: tags.length };
}

module.exports = {
    TAG_PRODUCTIVITY_MAP,
    DEFAULT_TAGS,
    AUTO_LABEL_KEYWORDS,
    productivityFromTagName,
    ruleDomainKey,
    ensureDefaultTags,
    getRulesWithTags,
    findMatchingRule,
    applyRuleToResolved,
    backfillProductivityForApp,
    autoLabelOrganization,
};
