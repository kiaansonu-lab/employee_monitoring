const prisma = require('../../config/db');
const { getIO, updateSessionStatus } = require('../../socket/server');

const attendanceService = {
    clockIn: async (employeeId, organizationId) => {
        const now = new Date();
        // Set today to noon to prevent timezone shifts from changing the calendar date in MySQL
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

        // Check if there is already an active (unclosed) session - search for ANY active session for this employee
        const active = await prisma.attendance.findFirst({
            where: {
                employeeId,
                clockOut: null,
            },
            orderBy: { clockIn: 'desc' }
        });
        
        if (active) {
            throw new Error('Already clocked in (active session exists)');
        }

        // Get employee's shift for today to detect lateness
        const shift = await prisma.shift.findFirst({
            where: {
                employeeId,
                date: today,
            }
        });

        let late = false;
        if (shift) {
            const [sHour, sMin] = shift.startTime.split(':').map(Number);
            const shiftStartTime = new Date(now);
            shiftStartTime.setHours(sHour, sMin, 0, 0);

            if (now > shiftStartTime) {
                late = true;
            }
        }

        const attendance = await prisma.attendance.create({
            data: {
                employeeId,
                organizationId,
                date: today,
                clockIn: now,
                status: 'PRESENT',
                late,
            }
        });

        // Update employee status to ACTIVE (Guard: Ensure not deactivated)
        const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { status: true } });
        if (employee && employee.status !== 'DEACTIVATED') {
            await prisma.employee.update({
                where: { id: employeeId },
                data: { status: 'ACTIVE' }
            });
        }

        // Emit real-time events
        const io = getIO();
        if (io) {
            io.to(`org_${organizationId}`).emit('attendance:update', { employeeId, type: 'clock-in' });
            io.to(`org_${organizationId}`).emit('employee:status', { employeeId, status: 'ACTIVE' });
        }

        return attendance;
    },

    clockOut: async (employeeId) => {
        const now = new Date();

        // Find the most recent active session regardless of date
        const attendance = await prisma.attendance.findFirst({
            where: {
                employeeId,
                clockOut: null,
            },
            orderBy: {
                clockIn: 'desc'
            }
        });

        if (!attendance) {
            throw new Error('No active clock-in session found');
        }

        const duration = Math.floor((now - attendance.clockIn) / 1000); // in seconds

        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                clockOut: now,
                duration,
            }
        });

        // Update employee status to OFFLINE (Guard: Ensure not deactivated)
        const employeeInfo = await prisma.employee.findUnique({ where: { id: employeeId }, select: { status: true } });
        if (employeeInfo && employeeInfo.status !== 'DEACTIVATED') {
            await prisma.employee.update({
                where: { id: employeeId },
                data: { status: 'OFFLINE' }
            });
        }

        // Emit real-time events
        const io = getIO();
        if (io) {
            io.to(`org_${attendance.organizationId}`).emit('attendance:update', { employeeId, type: 'clock-out' });
            io.to(`org_${attendance.organizationId}`).emit('employee:status', { employeeId, status: 'OFFLINE' });
        }

        return updatedAttendance;
    },

    getTimesheets: async (organizationId, filters = {}) => {
        const where = { organizationId };

        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.teamId) where.employee = { teamId: filters.teamId };
        if (filters.startDate && filters.endDate) {
            where.date = {
                gte: new Date(filters.startDate),
                lte: new Date(filters.endDate),
            };
        }

        return await prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        fullName: true,
                        location: true,
                        team: {
                            select: { name: true, description: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' },
        });
    },

    addManualTime: async (data) => {
        const { employeeId, organizationId, startDate, startTime, endDate, endTime, timezone, type, description } = data;

        const start = new Date(`${startDate} ${startTime}`);
        const end = new Date(`${endDate} ${endTime}`);
        const duration = Math.floor((end - start) / 1000);

        const manualTime = await prisma.manualTime.create({
            data: {
                employeeId,
                organizationId,
                startTime: start,
                endTime: end,
                timezone,
                type: type || 'Regular',
                duration: duration > 0 ? duration : 0,
                note: description,
            }
        });

        // Emit real-time event
        const io = getIO();
        if (io) {
            io.to(`org_${organizationId}`).emit('attendance:update', { employeeId, type: 'manual-time' });
        }

        return manualTime;
    },

    getManualTimes: async (filters) => {
        const where = { organizationId: filters.organizationId };
        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.teamId) where.employee = { teamId: filters.teamId };
        
        if (filters.startDate && filters.endDate) {
            where.startTime = {
                gte: new Date(filters.startDate),
            };
            where.endTime = {
                lte: new Date(`${filters.endDate} 23:59:59`),
            };
        }

        return await prisma.manualTime.findMany({
            where,
            include: {
                employee: {
                    select: { fullName: true }
                }
            },
            orderBy: { startTime: 'desc' }
        });
    },

    getShifts: async (organizationId, filters = {}) => {
        const where = { organizationId };
        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.startDate && filters.endDate) {
            where.date = {
                gte: new Date(filters.startDate),
                lte: new Date(filters.endDate),
            };
        }

        return await prisma.shift.findMany({
            where,
            include: {
                employee: { select: { fullName: true } }
            },
            orderBy: { date: 'asc' }
        });
    },

    createShift: async (data) => {
        const shift = await prisma.shift.create({
            data: {
                employeeId: data.employeeId,
                organizationId: data.organizationId,
                startTime: data.startTime,
                endTime: data.endTime,
                date: new Date(data.date),
            },
            include: { employee: { select: { fullName: true } } }
        });

        // Emit real-time event
        const io = getIO();
        if (io) {
            io.to(`org_${data.organizationId}`).emit('attendance:update', { employeeId: data.employeeId, type: 'shift-new' });
        }

        return shift;
    },

    createTimeOff: async (data) => {
        const timeOff = await prisma.timeOff.create({
            data: {
                employeeId: data.employeeId,
                organizationId: data.organizationId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                type: data.type || 'Days',
                timeOffType: data.timeOffType || null,
                timezone: data.timezone || null,
                note: data.note || null,
                singleDay: data.singleDay || false,
            },
            include: { employee: { select: { fullName: true } } }
        });

        // Emit real-time event
        const io = getIO();
        if (io) {
            io.to(`org_${data.organizationId}`).emit('attendance:update', { employeeId: data.employeeId, type: 'time-off-new' });
        }

        return timeOff;
    },

    getTimeOffs: async (organizationId, filters = {}) => {
        const where = { organizationId };
        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.startDate && filters.endDate) {
            where.startDate = { lte: new Date(filters.endDate) };
            where.endDate = { gte: new Date(filters.startDate) };
        }

        return await prisma.timeOff.findMany({
            where,
            include: { employee: { select: { fullName: true } } },
            orderBy: { startDate: 'asc' }
        });
    },

    startBreak: async (employeeId, organizationId) => {
        // Validation: Ensure valid IDs are passed
        if (!employeeId || employeeId === '') {
            console.error('[AttendanceService] startBreak failed: employeeId is missing or empty');
            throw new Error('Employee ID is required to start a break');
        }
        if (!organizationId) {
            console.warn('[AttendanceService] startBreak: organizationId is missing, using default');
        }

        console.log(`[AttendanceService] Starting break for employee: ${employeeId}, org: ${organizationId}`);

        try {
            // Update employee status to BREAK (Must match Enum exactly: BREAK)
            // Guard: Ensure not deactivated
            const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { status: true } });
            if (emp && emp.status === 'DEACTIVATED') {
                throw new Error('Deactivated employees cannot start a break');
            }

            await prisma.employee.update({
                where: { id: employeeId },
                data: { status: 'BREAK' }
            });

            // Create an activity log for the break start
            const log = await prisma.activityLog.create({
                data: {
                    employeeId,
                    organizationId: organizationId || 'default-org-id',
                    activityType: 'BREAK',
                    productivity: 'NEUTRAL',
                    duration: 0,
                    timestamp: new Date(),
                    appWebsite: 'Break'
                }
            });

            // Notify real-time
            updateSessionStatus(employeeId, 'BREAK');

            const io = getIO();
            if (io) {
                // We still emit these for backward compatibility or direct listeners
                io.to(`org_${organizationId}`).emit('attendance:update', { employeeId, type: 'break-start' });
            }

            return log;
        } catch (error) {
            console.error('[AttendanceService] startBreak Error:', error);
            // Hint for common enum error
            if (error.message.includes('Value \'\' not found in enum')) {
                console.error('[AttendanceService] Critical error: An enum field (likely EmployeeStatus) is being set to an empty string. Please check database data.');
            }
            throw error;
        }
    },

    endBreak: async (employeeId) => {
        if (!employeeId || employeeId === '') {
            console.error('[AttendanceService] endBreak failed: employeeId is missing or empty');
            throw new Error('Employee ID is required to end a break');
        }

        // Fetch employee to get organizationId for socket
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { organizationId: true }
        });

        if (!employee) {
            throw new Error('Employee not found');
        }

        console.log(`[AttendanceService] Ending break for employee: ${employeeId}, org: ${employee.organizationId}`);

        try {
            // Update employee status back to ACTIVE (Guard: Ensure not deactivated)
            const empInfo = await prisma.employee.findUnique({ where: { id: employeeId }, select: { status: true } });
            if (empInfo && empInfo.status !== 'DEACTIVATED') {
                await prisma.employee.update({
                    where: { id: employeeId },
                    data: { status: 'ACTIVE' }
                });
            }

            // Find the last BREAK activity log for this employee that has 0 duration
            const lastBreak = await prisma.activityLog.findFirst({
                where: {
                    employeeId,
                    activityType: 'BREAK',
                    duration: 0
                },
                orderBy: { timestamp: 'desc' }
            });

            if (lastBreak) {
                const now = new Date();
                const duration = Math.floor((now - lastBreak.timestamp) / 1000);
                await prisma.activityLog.update({
                    where: { id: lastBreak.id },
                    data: { duration }
                });
            }

            // Notify real-time
            updateSessionStatus(employeeId, 'ACTIVE');

            const io = getIO();
            if (io) {
                io.to(`org_${employee.organizationId}`).emit('attendance:update', { employeeId, type: 'break-end' });
            }

            return { success: true };
        } catch (error) {
            console.error('[AttendanceService] endBreak Error:', error);
            throw error;
        }
    }
};

module.exports = attendanceService;
