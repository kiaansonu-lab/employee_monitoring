const { resolveAppActivity } = require('./resolveAppActivity');
const { getRulesWithTags, findMatchingRule, applyRuleToResolved } = require('./productivityRules');

async function resolveAppActivityForOrg(organizationId, activeApp, activeWindow) {
    const base = resolveAppActivity(activeApp, activeWindow);
    if (!organizationId) return base;

    try {
        const rules = await getRulesWithTags(organizationId);
        const rule = findMatchingRule(rules, base.cleanAppName, base.appDomain, activeWindow);
        return applyRuleToResolved(base, rule);
    } catch (err) {
        console.error('[resolveAppActivityForOrg] Rule lookup failed:', err.message);
        return base;
    }
}

module.exports = { resolveAppActivityForOrg };
