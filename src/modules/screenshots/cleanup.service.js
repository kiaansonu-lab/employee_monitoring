const cron = require('node-cron');
const prisma = require('../../config/db');
const { deleteImageByUrl } = require('../../utils/imageStorage');

/**
 * Cleanup service to remove old screenshots from disk and database
 * Default: 30 days
 */
class CleanupService {
    init() {
        console.log('[CleanupService] Initializing automated screenshot cleanup (Daily at 2:00 AM)...');
        
        // Schedule: Every day at 2:00 AM
        // '0 2 * * *'
        cron.schedule('0 2 * * *', async () => {
            await this.performCleanup();
        });
    }

    async performCleanup() {
        const MAX_RETENTION_DAYS = 30; // Check if we have data older than 30 days
        const BATCH_DELETE_DAYS = 15; // Delete the oldest batch to keep' 15-30 days backup

        console.log(`[CleanupService] Checking for batch cleanup (Threshold: ${MAX_RETENTION_DAYS} days)...`);
        
        try {
            const now = new Date();
            const threshold30Day = new Date(now);
            threshold30Day.setDate(now.getDate() - MAX_RETENTION_DAYS);

            // 1. Check if there exists ANY screenshot older than 30 days
            const oldestExists = await prisma.screenshot.findFirst({
                where: {
                    capturedAt: {
                        lt: threshold30Day
                    }
                }
            });

            if (!oldestExists) {
                console.log('[CleanupService] No screenshots older than 30 days found. Skipping batch cleanup.');
                return;
            }

            console.log('[CleanupService] Found data older than 30 days. Triggering batch cleanup of oldest 15 days...');

            // 2. Identify all screenshots older than 15 days from today
            // Note: By deleting everything older than 15 days, we keep exactly the last 15 days.
            // As the user said: "1 month ho jaye toh 15 din ka delete kar dena", 
            // which means we keep the most recent 15 days of that month.
            const threshold15Day = new Date(now);
            threshold15Day.setDate(now.getDate() - BATCH_DELETE_DAYS);

            const oldScreenshots = await prisma.screenshot.findMany({
                where: {
                    capturedAt: {
                        lt: threshold15Day
                    }
                }
            });

            if (oldScreenshots.length === 0) {
                console.log('[CleanupService] No old screenshots found for batch deletion.');
                return;
            }

            console.log(`[CleanupService] Deleting ${oldScreenshots.length} screenshots in this batch...`);

            // 3. Delete backing files/objects (local or cloud)
            for (const ss of oldScreenshots) {
                try {
                    await deleteImageByUrl(ss.imageUrl);
                } catch (err) {
                    console.error(`[CleanupService] Error deleting screenshot asset ${ss.imageUrl}:`, err.message);
                }
            }

            // 4. Delete records from database
            const deleteResult = await prisma.screenshot.deleteMany({
                where: {
                    id: {
                        in: oldScreenshots.map(s => s.id)
                    }
                }
            });

            console.log(`[CleanupService] Batch cleanup complete. Successfully deleted ${deleteResult.count} records.`);
        } catch (error) {
            console.error('[CleanupService] Error during batch cleanup:', error.message);
        }
    }
}

module.exports = new CleanupService();
