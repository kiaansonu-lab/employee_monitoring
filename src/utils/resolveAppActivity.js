const { APPS } = require('../modules/productivity/productivity.service');

const HEARTBEAT_SECONDS = 30;

/**
 * Map raw agent window/app strings to clean names and productivity.
 */
function resolveAppActivity(activeApp, activeWindow) {
    let productivity = 'NEUTRAL';
    let appCategory = 'Uncategorized';
    let appDomain = '';
    let cleanAppName = activeApp || 'Unknown';

    const appLower = (activeApp || '').toLowerCase();
    const windowLower = (activeWindow || '').toLowerCase();
    const isUnknownApp = !activeApp || appLower === 'unknown';

    const set = (name, prod, category, domain = '') => {
        cleanAppName = name;
        productivity = prod;
        appCategory = category;
        appDomain = domain;
    };

    // Window title often works when process name detection fails
    if (windowLower.includes('visual studio code') || windowLower.includes(' - cursor') || appLower === 'cursor') {
        set('Cursor', 'PRODUCTIVE', 'Development', 'cursor.sh');
    } else if (windowLower.includes('antigravity')) {
        set('Antigravity AI', 'PRODUCTIVE', 'AI Tools', 'antigravity.ai');
    } else if (windowLower.includes('youtube')) {
        set('YouTube', 'UNPRODUCTIVE', 'Entertainment', 'youtube.com');
    } else if (windowLower.includes('github')) {
        set('GitHub', 'PRODUCTIVE', 'Development', 'github.com');
    } else if (windowLower.includes('stackoverflow') || windowLower.includes('stack overflow')) {
        set('Stack Overflow', 'PRODUCTIVE', 'Research', 'stackoverflow.com');
    } else if (!isUnknownApp) {
        if (appLower === 'code' || appLower === 'cursor' || appLower === 'devenv') {
            set('VS Code', 'PRODUCTIVE', 'Development', 'visualstudio.com');
        } else if (appLower === 'chrome' || appLower === 'msedge' || appLower === 'firefox') {
            set(appLower === 'msedge' ? 'Microsoft Edge' : (appLower === 'firefox' ? 'Firefox' : 'Google Chrome'), 'NEUTRAL', 'Browser', 'chrome');
        } else if (appLower.includes('code') || appLower.includes('visual studio') || appLower.includes('cursor')) {
            set('VS Code', 'PRODUCTIVE', 'Development', 'visualstudio.com');
        } else if (appLower.includes('chrome') || appLower.includes('google chrome') || appLower.includes('chromium')) {
            set('Google Chrome', 'NEUTRAL', 'Browser', 'chrome');
            if (windowLower.includes('youtube')) {
                set('YouTube', 'UNPRODUCTIVE', 'Entertainment', 'youtube.com');
            } else if (windowLower.includes('github')) {
                set('GitHub', 'PRODUCTIVE', 'Development', 'github.com');
            } else if (windowLower.includes('localhost') || windowLower.includes('employee monitoring') || windowLower.includes('employee performance')) {
                set('Google Chrome (Dev)', 'PRODUCTIVE', 'Development', 'localhost');
            } else if (windowLower.includes('stackoverflow') || windowLower.includes('stack overflow')) {
                set('Stack Overflow', 'PRODUCTIVE', 'Research', 'stackoverflow.com');
            } else if (windowLower.includes('gmail') || windowLower.includes('mail')) {
                set('Gmail', 'NEUTRAL', 'Communication', 'gmail.com');
            }
        } else if (appLower.includes('antigravity') || appLower.includes('gemini')) {
            set('Antigravity AI', 'PRODUCTIVE', 'AI Tools', 'antigravity.ai');
        } else if (appLower.includes('terminal') || appLower.includes('cmd') || appLower.includes('powershell') || appLower.includes('bash')) {
            set('Terminal', 'PRODUCTIVE', 'Development', 'terminal');
        } else if (appLower.includes('slack')) {
            set('Slack', 'NEUTRAL', 'Communication', 'slack.com');
        } else if (appLower.includes('zoom') || appLower.includes('teams') || appLower.includes('meet')) {
            const name = appLower.includes('teams') ? 'Microsoft Teams' : (appLower.includes('meet') ? 'Google Meet' : 'Zoom');
            set(name, 'NEUTRAL', 'Meeting', 'zoom.us');
        } else if (appLower.includes('figma')) {
            set('Figma', 'PRODUCTIVE', 'Design', 'figma.com');
        } else if (appLower.includes('notion') || appLower.includes('obsidian')) {
            set(appLower.includes('notion') ? 'Notion' : 'Obsidian', 'PRODUCTIVE', 'Documentation');
        } else if (appLower.includes('spotify') || appLower.includes('vlc') || appLower.includes('netflix')) {
            const name = appLower.includes('spotify') ? 'Spotify' : (appLower.includes('vlc') ? 'VLC' : 'Netflix');
            set(name, 'UNPRODUCTIVE', 'Entertainment');
        } else {
            const knownApp = APPS.find(a =>
                appLower.includes(a.name.toLowerCase()) ||
                (a.domain && appLower.includes(a.domain.toLowerCase()))
            );
            if (knownApp) {
                set(knownApp.name, knownApp.productivity, knownApp.category, knownApp.domain || '');
            }
        }
    } else if (windowLower.includes('chrome') || windowLower.includes('mozilla') || windowLower.includes('edge')) {
        set('Google Chrome', 'NEUTRAL', 'Browser', 'chrome');
    }

    return { cleanAppName, productivity, appCategory, appDomain };
}

module.exports = { resolveAppActivity, HEARTBEAT_SECONDS };
