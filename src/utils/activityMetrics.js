/**
 * Activity Metrics Utility
 * Handles calculation of time and productivity based on activity logs.
 */

const activityMetrics = {
    /**
     * Calculate summary metrics from a list of activity logs
     * @param {Array} logs - List of activity logs
     * @returns {Object} Calculated metrics
     */
    calculateMetrics: (logs) => {
        let activeTime = 0; // seconds
        let idleTime = 0;
        let manualTime = 0;
        let systemTime = 0;

        let productiveTime = 0;
        let neutralTime = 0;
        let unproductiveTime = 0;

        logs.forEach(log => {
            // Time by Activity Type
            if (log.activityType === 'ACTIVE') activeTime += log.duration;
            if (log.activityType === 'IDLE') idleTime += log.duration;
            if (log.activityType === 'MANUAL') manualTime += log.duration;
            if (log.activityType === 'SYSTEM') systemTime += log.duration;

            // Time by Productivity
            if (log.productivity === 'PRODUCTIVE') productiveTime += log.duration;
            if (log.productivity === 'NEUTRAL') neutralTime += log.duration;
            if (log.productivity === 'UNPRODUCTIVE') unproductiveTime += log.duration;
        });

        const totalTime = activeTime + idleTime + manualTime + systemTime;
        const productivityScore = totalTime > 0 ? (productiveTime / totalTime) * 100 : 0;

        // Utilization is often (Active Time / Total Tracked Time)
        const utilizationScore = totalTime > 0 ? (activeTime / totalTime) * 100 : 0;

        return {
            activeTime,
            idleTime,
            manualTime,
            systemTime,
            productiveTime,
            neutralTime,
            unproductiveTime,
            totalTime,
            productivityScore: Math.round(productivityScore),
            utilizationScore: Math.round(utilizationScore),
            activeTimeStr: activityMetrics.formatDuration(activeTime),
            idleTimeStr: activityMetrics.formatDuration(idleTime),
            totalTimeStr: activityMetrics.formatDuration(totalTime),
        };
    },

    /**
     * Formats seconds into HH:mm:ss or similar
     * @param {number} seconds 
     */
    formatDuration: (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};

module.exports = activityMetrics;
