const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Activity Simulator Service
 * Periodically generates random activity logs for simulation purposes.
 */
class ActivitySimulator {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        console.log('🚀 Activity Simulator started...');
        this.isRunning = true;

        // Run simulation every 30 seconds
        this.intervalId = setInterval(() => {
            this.generateLogs();
        }, 30000);

        // Initial run
        this.generateLogs();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 Activity Simulator stopped.');
    }

    async generateLogs() {
        try {
            const logsToCreate = [];
            // 1. Get all active employees (limit to a few for performance)
            const employees = await prisma.employee.findMany({
                where: { status: 'ACTIVE' },
                take: 10
            });

            if (employees.length === 0) {
                console.log('Simulator: No active employees found.');
                return;
            }

            const io = require('../socket/server').getIO();

            for (const emp of employees) {
                // --- Attendance Simulation ---
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const existingAttendance = await prisma.attendance.findFirst({
                    where: { employeeId: emp.id, date: today }
                });

                if (!existingAttendance) {
                    await prisma.attendance.create({
                        data: {
                            employeeId: emp.id,
                            organizationId: emp.organizationId,
                            date: today,
                            clockIn: new Date(new Date().setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0)),
                            status: 'PRESENT',
                            late: Math.random() > 0.8
                        }
                    });
                    console.log(`[Simulator] Attendance created for ${emp.fullName}`);
                }

                // --- Activity Simulation ---
                // Randomly decide if they are ACTIVE, IDLE, or SYSTEM
                const types = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'IDLE', 'SYSTEM'];
                const activityType = types[Math.floor(Math.random() * types.length)];

                // Randomly decide productivity
                const prodTypes = ['PRODUCTIVE', 'PRODUCTIVE', 'NEUTRAL', 'UNPRODUCTIVE'];
                const productivity = prodTypes[Math.floor(Math.random() * prodTypes.length)];

                // Random apps/websites
                const apps = ['VS Code', 'Google Chrome', 'Slack', 'Terminal', 'Zoom', 'Spotify', 'YouTube'];
                const appWebsite = apps[Math.floor(Math.random() * apps.length)];

                const logData = {
                    employeeId: emp.id,
                    organizationId: emp.organizationId,
                    activityType,
                    productivity,
                    duration: 30, // 30 seconds per tick
                    appWebsite,
                    timestamp: new Date(),
                };

                logsToCreate.push(logData);

                // Emit live update via socket if possible
                if (io) {
                    io.to(`org_${emp.organizationId}`).emit('activity:update', {
                        employeeId: emp.id,
                        activeApp: appWebsite,
                        activeWindow: 'Operating ' + appWebsite,
                        keystrokes: Math.floor(Math.random() * 50),
                        mouseClicks: Math.floor(Math.random() * 20),
                        idleTime: activityType === 'IDLE' ? 65 : 0,
                        timestamp: new Date()
                    });

                    // Also emit status if changed (simulated)
                    if (activityType === 'IDLE') {
                        io.to(`org_${emp.organizationId}`).emit('employee:status', {
                            employeeId: emp.id,
                            status: 'idle'
                        });
                    } else {
                        io.to(`org_${emp.organizationId}`).emit('employee:status', {
                            employeeId: emp.id,
                            status: 'online'
                        });
                    }
                }
            }

            await prisma.activityLog.createMany({
                data: logsToCreate
            });

            console.log(`Simulator: Generated logs for ${employees.length} employees.`);
        } catch (error) {
            console.error('Simulator Error:', error.message);
        }
    }
}

module.exports = new ActivitySimulator();
