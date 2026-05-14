const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const activityService = require('../modules/activity/activity.service');
const { APPS } = require('../modules/productivity/productivity.service');

// In-memory cache for live employee sessions
// Map: employeeId -> { socketId, organizationId, status, lastActivity }
const liveSessions = new Map();

let ioInstance;

const initSocketServer = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST']
        }
    });
    ioInstance = io;

    // Middleware for Authentication (JWT or Agent Token)
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        // 1. Try Agent Token (Base64)
        try {
            const decoded = Buffer.from(token, 'base64').toString('ascii');
            if (decoded.includes('INSIGHTFUL')) {
                const [empId, devId] = decoded.split(':');
                // For agents, we mock the user object enough for the connection logic
                socket.user = { 
                    id: `agent_${empId}`, 
                    employeeId: empId, 
                    deviceId: devId,
                    role: 'AGENT' 
                };
                return next();
            }
        } catch (e) {
            // Not a base64 agent token, continue to JWT
        }

        // 2. Try JWT Token
        try {
            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Invalid token'));
            }
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const { id: userId, employeeId, organizationId, role } = socket.user;
        
        logger.info(`Socket connected: ${socket.id} (User: ${userId}, Role: ${role})`);

        // Handle Employee Connection
        if (employeeId) {
            // Fetch current status from DB instead of assuming ONLINE
            prisma.employee.findUnique({
                where: { id: employeeId },
                select: { status: true }
            }).then(emp => {
                const initialStatus = emp?.status || 'ONLINE';
                liveSessions.set(employeeId, {
                    socketId: socket.id,
                    organizationId,
                    status: initialStatus,
                    lastActivity: new Date()
                });

                // Join employee-specific room
                socket.join(`employee_${employeeId}`);

                // Broadcast status update to admins/managers
                io.to(`org_${organizationId}`).emit('employee:status', {
                    employeeId,
                    status: initialStatus
                });
            });
        }

        // Join organization-specific room for broadcasting updates
        if (organizationId) {
            socket.join(`org_${organizationId}`);
        }

        // Handle Status Override (like 'ON_BREAK')
        socket.on('employee:status_override', async ({ status }) => {
            if (!employeeId) return;
            const session = liveSessions.get(employeeId);
            if (session) {
                session.status = status;
                session.lastActivity = new Date(); // Reset timeout
                io.to(`org_${organizationId}`).emit('employee:status', {
                    employeeId,
                    status
                });
            }
        });

        // Handle Live Activity
        socket.on('employee:activity', async (data) => {
            if (!employeeId) return;

            const { activeApp, activeWindow, keystrokes, mouseClicks, idleTime } = data;

            // Update session cache
            const session = liveSessions.get(employeeId);
            if (session) {
                session.lastActivity = new Date();
                
                // Status logic: 
                // If user is on BREAK, only return to ONLINE if idleTime is low AND we want to auto-resume
                // In this system, we prefer manual RESUME, so keep BREAK if it's set.
                // Guard: If status is DEACTIVATED, don't auto-update it
                if (session.status === 'DEACTIVATED') return;

                let newStatus = session.status === 'BREAK' ? 'BREAK' : (idleTime > 300 ? 'OFFLINE' : (idleTime > 60 ? 'IDLE' : 'ONLINE'));
                
                if (session.status !== newStatus) {
                    session.status = newStatus;
                    io.to(`org_${organizationId}`).emit('employee:status', {
                        employeeId,
                        status: newStatus
                    });
                }
            }

            try {
                // Store in DB (Live heartbeat)
                await prisma.liveActivity.create({
                    data: {
                        employeeId,
                        organizationId,
                        activeApp: activeApp || 'Unknown',
                        activeWindow: activeWindow || 'Unknown',
                        keystrokes: keystrokes || 0,
                        mouseClicks: mouseClicks || 0,
                        idleTime: idleTime || 0
                    }
                });

                // --- AGGREGATION: Ingest into ActivityLog for Dashboard Metrics ---
                
                // 1. Determine Activity Type
                const activityType = idleTime > 60 ? 'IDLE' : 'ACTIVE';
                
                // 2. Determine Productivity (Heuristic)
                let productivity = 'NEUTRAL';
                if (activityType === 'ACTIVE' && activeApp) {
                    const knownApp = APPS.find(a => 
                        activeApp.toLowerCase().includes(a.name.toLowerCase()) || 
                        (a.domain && activeApp.toLowerCase().includes(a.domain.toLowerCase()))
                    );
                    if (knownApp) {
                        productivity = knownApp.productivity;
                    } else if (activeApp.toLowerCase().includes('visual studio') || activeApp.toLowerCase().includes('code')) {
                        productivity = 'PRODUCTIVE';
                    }
                }

                // 3. Create ActivityLog entry
                // Using 30 seconds as duration for each heartbeat log
                await activityService.createActivityLog({
                    employeeId,
                    organizationId,
                    activityType,
                    productivity,
                    duration: 30, // 30 seconds per heartbeat
                    appWebsite: activeApp || 'Unknown',
                    timestamp: new Date()
                });

                // Broadcast to admin dashboard
                io.to(`org_${organizationId}`).emit('activity:update', {
                    employeeId,
                    ...data,
                    timestamp: new Date()
                });
            } catch (err) {
                logger.error('Error saving live activity:', err);
            }
        });

        // Handle Screenshots
        socket.on('employee:screenshot', (data) => {
            if (!organizationId) return;
            // Broadcast event to listeners (ScreenshotMonitoring page)
            io.to(`org_${organizationId}`).emit('screenshot:new', data);
        });

        // ─── WebRTC Live Monitoring Events ───────────────────────────────────
        
        // 1. Admin requests to view live: Admin -> Employee (Broadcasting to all sessions of this employee)
        socket.on('live:request', ({ employeeId }) => {
            if (role !== 'ADMIN' && role !== 'MANAGER') return;
            
            // Emit to the entire employee room so that any active tracker session can respond
            io.to(`employee_${employeeId}`).emit('live:request', { requesterId: socket.id });
            logger.info(`Live request from ${socket.id} to employee room employee_${employeeId}`);
        });

        // 2. Employee sends offer: Employee -> Requester (Admin)
        socket.on('live:offer', ({ requesterId, offer }) => {
            if (!employeeId) return;
            // Include fromId so admin knows which specific socket to answer to
            io.to(requesterId).emit('live:offer', { employeeId, offer, fromId: socket.id });
        });

        // 3. Admin sends answer: Admin -> Employee
        socket.on('live:answer', ({ employeeId, answer, targetId }) => {
            if (role !== 'ADMIN' && role !== 'MANAGER') return;
            
            // If we have a specific target socket (from the offer), use it
            if (targetId) {
                io.to(targetId).emit('live:answer', { answer });
            } else {
                // Fallback to room or first session (less reliable)
                const session = liveSessions.get(employeeId);
                if (session && session.socketId) {
                    io.to(session.socketId).emit('live:answer', { answer });
                }
            }
        });

        // 4. ICE Candidates exchange: Bidirectional
        socket.on('live:candidate', ({ targetId, candidate, forEmployeeId }) => {
            if (targetId) {
                // Point-to-point delivery
                io.to(targetId).emit('live:candidate', { candidate, employeeId: forEmployeeId });
            } else if (forEmployeeId) {
                // Fallback to rooms for employee-targeted candidates
                io.to(`employee_${forEmployeeId}`).emit('live:candidate', { candidate });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
            
            if (employeeId) {
                const session = liveSessions.get(employeeId);
                if (session && session.socketId === socket.id) {
                    liveSessions.delete(employeeId);
                    
                    // Guard: Don't emit OFFLINE if already DEACTIVATED
                    if (session.status !== 'DEACTIVATED') {
                        io.to(`org_${organizationId}`).emit('employee:status', {
                            employeeId,
                            status: 'OFFLINE'
                        });
                    }

                    // Auto Clock-Out mechanism after a short grace period (e.g., 2 minutes)
                    if (role === 'EMPLOYEE') {
                        setTimeout(async () => {
                            // Check if the user reconnected during the grace period
                            const reconnectedSession = liveSessions.get(employeeId);
                            if (!reconnectedSession) {
                                try {
                                    const attendanceService = require('../modules/attendance/attendance.service');
                                    logger.info(`Auto clocking out employee ${employeeId} due to disconnect grace period expiry`);
                                    await attendanceService.clockOut(employeeId);
                                    
                                    // Notify the organization that this session was ended
                                    io.to(`org_${organizationId}`).emit('attendance:auto_clockout', { employeeId });
                                } catch (err) {
                                    if (!err.message.includes('No active clock-in session found')) {
                                        logger.error(`Error auto clocking out employee ${employeeId}:`, err);
                                    }
                                }
                            }
                        }, 2 * 60 * 1000); // 2 minutes grace period
                    }
                }
            }
        });
    });

    return io;
};

/**
 * Update a session status from outside (e.g., AttendanceService)
 */
const updateSessionStatus = (employeeId, status) => {
    const session = liveSessions.get(employeeId);
    if (session) {
        session.status = status;
        session.lastActivity = new Date();
        if (ioInstance) {
            ioInstance.to(`org_${session.organizationId}`).emit('employee:status', {
                employeeId,
                status
            });
        }
        return true;
    }
    return false;
};

const getLiveSessions = () => liveSessions;
const getIO = () => ioInstance;

module.exports = { initSocketServer, getLiveSessions, getIO, updateSessionStatus };
