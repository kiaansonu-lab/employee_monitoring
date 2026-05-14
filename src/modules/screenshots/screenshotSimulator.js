const prisma = require('../../config/db');

const PRODUCTIVITY_TYPES = ['PRODUCTIVE', 'NEUTRAL', 'UNPRODUCTIVE'];

// Picsum photos for realistic screenshots (free service)
function getRandomScreenshotUrl() {
    const width = 1280;
    const height = 800;
    const randomSeed = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/seed/${randomSeed}/${width}/${height}`;
}

function getRandomProductivity() {
    // Adjusted weights: 40% productive, 30% neutral, 30% unproductive (Idle)
    const weights = [0.4, 0.3, 0.3]; 
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) return PRODUCTIVITY_TYPES[i];
    }
    return 'NEUTRAL';
}

async function generateScreenshots() {
    try {
        // Get all active employees with their organizations
        const employees = await prisma.employee.findMany({
            where: {
                status: { in: ['ACTIVE'] }
            },
            select: {
                id: true,
                fullName: true,
                organizationId: true,
            }
        });

        if (!employees || employees.length === 0) {
            console.log('[ScreenshotSimulator] No active employees found, skipping...');
            return;
        }

        // Pick 1-3 random employees to capture screenshots for
        const count = Math.min(employees.length, Math.floor(Math.random() * 3) + 1);
        const shuffled = employees.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        const io = require('../../socket/server').getIO();

        for (const employee of selected) {
            const newScreenshot = await prisma.screenshot.create({
                data: {
                    employeeId: employee.id,
                    organizationId: employee.organizationId,
                    imageUrl: getRandomScreenshotUrl(),
                    productivity: getRandomProductivity(),
                    blurred: false,
                    capturedAt: new Date(),
                }
            });
            console.log(`[ScreenshotSimulator] Screenshot generated for ${employee.fullName}`);

            if (io) {
                io.to(`org_${employee.organizationId}`).emit('screenshot:new', {
                    ...newScreenshot,
                    employee: employee.fullName,
                    timestamp: newScreenshot.capturedAt
                });
            }
        }
    } catch (error) {
        console.error('[ScreenshotSimulator] Error generating screenshots:', error.message);
    }
}

function startSimulator() {
    console.log('[ScreenshotSimulator] Starting simulation engine (every 5 minutes)...');
    // Generate initial screenshots immediately
    generateScreenshots();
    // Then run every 5 minutes
    setInterval(generateScreenshots, 5 * 60 * 1000);
}

module.exports = { startSimulator, generateScreenshots };
