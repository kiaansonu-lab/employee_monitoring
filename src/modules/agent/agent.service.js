const prisma = require('../../config/db');
const attendanceService = require('../attendance/attendance.service');
const { uploadImageBuffer } = require('../../utils/imageStorage');

/**
 * Register a new device agent for an employee
 */
const registerAgent = async (employeeId, deviceId, systemInfo) => {
    // Get employee to find organizationId
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { organizationId: true }
    });

    if (!employee) throw new Error('Employee not found');

    // Upsert agent: update if exists (linked by employeeId), otherwise create
    return await prisma.agent.upsert({
        where: { employeeId },
        update: {
            deviceId,
            systemInfo,
            lastSeen: new Date(),
        },
        create: {
            employeeId,
            deviceId,
            systemInfo,
            status: 'active', // Auto-approve for seamless setup
            lastSeen: new Date(),
        },
    });
};

/**
 * Approve a pending agent
 */
const approveAgent = async (agentId) => {
    return await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'active' }
    });
};

/**
 * Update agent status
 */
const updateAgentStatus = async (id, status) => {
    return await prisma.agent.update({
        where: { id },
        data: { status }
    });
};

/**
 * Update agent/employee information
 */
const updateAgent = async (agentId, data) => {
    const { name, email, password } = data;
    
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { employee: true }
    });

    if (!agent) throw new Error('Agent not found');

    const updateData = {};
    if (name) updateData.fullName = name;
    if (email) updateData.email = email;

    // Update Employee
    await prisma.employee.update({
        where: { id: agent.employeeId },
        data: updateData
    });

    // Update User if exists
    if (password || email) {
        const userUpdate = {};
        if (email) userUpdate.email = email;
        if (password) {
            const bcrypt = require('bcrypt');
            userUpdate.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { employeeId: agent.employeeId },
            data: userUpdate
        });
    }

    return agent;
};

/**
 * Delete an agent and its tracking data
 */
const deleteAgent = async (agentId) => {
    const agent = await prisma.agent.findUnique({
        where: { id: agentId }
    });

    if (!agent) throw new Error('Agent not found');

    // Due to relations, we might need to delete tracking data first if not cascaded
    // But for now, we'll try to delete the agent record
    return await prisma.agent.delete({
        where: { id: agentId }
    });
};

/**
 * Update agent heartbeat
 */
const heartbeat = async (deviceId) => {
    const agent = await prisma.agent.update({
        where: { deviceId },
        data: {
            status: 'active',
            lastSeen: new Date(),
        },
    });

    // Auto Clock-In if not already clocked in
    if (agent && agent.employeeId) {
        try {
            await attendanceService.clockIn(agent.employeeId, agent.organizationId || 'default-org-id');
        } catch (err) {
            // Ignore "Already clocked in"
            if (!err.message.includes('Already clocked in')) {
                console.error('[AgentService] Auto clock-in on heartbeat failed:', err.message);
            }
        }
    }
    return agent;
};

/**
 * Log Activity and Screenshot
 */
const logActivity = async (employeeId, data) => {
    const { activeApp, activeWindow, idleTime, screenshotUrl, location, timestamp } = data;
    let screenshotSaved = false;
    let finalScreenshotUrl = null;

    // Get employee for organizationId
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { organizationId: true }
    });

    if (!employee) throw new Error('Employee not found');
    console.log(`[AgentService] Processing activity for employee: ${employeeId}. Screenshot included: ${!!screenshotUrl}`);

    // Auto Clock-In if not already clocked in
    try {
        await attendanceService.clockIn(employeeId, employee.organizationId);
    } catch (err) {
        // Ignore "Already clocked in"
        if (!err.message.includes('Already clocked in')) {
            console.error(`[AgentService:${employeeId}] Auto clock-in on activity failed:`, err.message);
        }
    }

    console.log(`[AgentService:${employeeId}] Logging activities: App=${activeApp}, Idle=${idleTime}s`);

    // 1. Save Activity Log
    try {
        await prisma.activityLog.create({
            data: {
                employeeId,
                organizationId: employee.organizationId,
                activityType: (idleTime || 0) > 60 ? 'IDLE' : 'ACTIVE',
                productivity: 'NEUTRAL', 
                duration: 60, 
                appWebsite: activeApp || 'Unknown',
                timestamp: timestamp ? new Date(timestamp) : new Date()
            }
        });
    } catch (e) { console.error(`[AgentService:${employeeId}] ActivityLog failed:`, e.message); }

    // 2. Update Live Activity
    try {
        await prisma.liveActivity.create({
            data: {
                employeeId,
                organizationId: employee.organizationId,
                activeApp: activeApp || 'Unknown',
                activeWindow: activeWindow || 'Unknown',
                keystrokes: 0,
                mouseClicks: 0,
                idleTime: idleTime || 0
            }
        });
    } catch (e) { console.error('LiveActivity failed:', e.message); }

    // 2. Save Screenshot if provided
    if (screenshotUrl) {
        let finalUrl = screenshotUrl;
        
        // Handle Base64 strings by saving to Cloudinary (or local fallback)
        if (screenshotUrl.startsWith('data:image/')) {
            try {
                const matches = screenshotUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    const uploadResult = await uploadImageBuffer(buffer, {
                        format: 'jpeg',
                        quality: 60,
                        folder: `insightful/screenshots/${employee.organizationId}`,
                        fileNamePrefix: `agent_${employeeId}`
                    });
                    finalUrl = uploadResult.imageUrl;
                    console.log(`[AgentService:${employeeId}] Screenshot stored in ${uploadResult.storage}: ${finalUrl}`);
                }
            } catch (err) {
                console.error(`[AgentService:${employeeId}] Failed to store base64 screenshot:`, err.message);
            }
        }

        try {
            const isIdle = (idleTime || 0) > 60;
            await prisma.screenshot.create({
                data: {
                    employeeId,
                    organizationId: employee.organizationId,
                    imageUrl: finalUrl,
                    capturedAt: timestamp ? new Date(timestamp) : new Date(),
                    productivity: isIdle ? 'UNPRODUCTIVE' : 'NEUTRAL'
                }
            });
            screenshotSaved = true;
            finalScreenshotUrl = finalUrl;
            console.log(`[AgentService:${employeeId}] Screenshot record created in DB`);
        } catch (e) { console.error(`[AgentService:${employeeId}] Screenshot log failed:`, e.message); }
        
        // Also update tracking for history with the file URL
        data.screenshotUrl = finalUrl; 
    }

    // 3. Save Tracking Data (History + Location)
    const locationStr = location ? `${location.city}, ${location.country}` : 'Unknown';
    try {
        await prisma.tracking.create({
            data: {
                employeeId,
                screenshotUrl: data.screenshotUrl || screenshotUrl,
                activityStatus: 'active',
                location: locationStr,
                source: 'AGENT',
                timestamp: timestamp ? new Date(timestamp) : new Date()
            }
        });
    } catch (e) { console.error(`[AgentService:${employeeId}] Tracking log failed:`, e.message); }

    // 4. Save to LocationLog (for Map) and Update Employee Location
    const hasLat = typeof location?.latitude === 'number' || typeof location?.lat === 'number';
    const hasLng = typeof location?.longitude === 'number' || typeof location?.lon === 'number';
    
    if (location && hasLat && hasLng) {
        const lat = parseFloat(location.latitude || location.lat);
        const lng = parseFloat(location.longitude || location.lon);

        try {
            await prisma.locationLog.create({
                data: {
                    employeeId,
                    organizationId: employee.organizationId,
                    latitude: lat,
                    longitude: lng,
                    source: 'AGENT'
                }
            });
            console.log(`[AgentService:${employeeId}] Location log saved: ${lat}, ${lng}`);
        } catch (e) { console.error(`[AgentService:${employeeId}] LocationLog failed:`, e.message); }

        try {
            await prisma.employee.update({
                where: { id: employeeId },
                data: { 
                    location: location.city || location.country || 'Remote',
                    latitude: lat,
                    longitude: lng
                }
            });
        } catch (e) { 
            // Silent retry or ignore conflict for high-frequency updates
            console.error('Employee coord update conflict skipped:', e.message); 
        }
    }

    // 6. Update Agent lastSeen
    try {
        await prisma.agent.updateMany({
            where: { employeeId },
            data: { lastSeen: new Date(), status: 'active' }
        });
    } catch (e) { console.error('Agent update failed:', e.message); }

    return { success: true, screenshotSaved, finalScreenshotUrl };
};

/**
 * Check if employee has an active agent
 */
const getAgentStatus = async (employeeId) => {
    const agent = await prisma.agent.findUnique({
        where: { employeeId }
    });

    if (!agent) return { active: false, status: 'missing' };

    // Agent is active if status is 'active' AND lastSeen is within 10 minutes
    const isRecent = new Date() - new Date(agent.lastSeen) < 10 * 60 * 1000;
    const isActive = agent.status === 'active' && isRecent;

    return {
        active: isActive, // Online/Recent status
        status: agent.status, // Persistent approval status ('active', 'pending', 'inactive')
        lastSeen: agent.lastSeen,
        deviceId: agent.deviceId
    };
};

const findAgentByDeviceId = async (deviceId) => {
    return await prisma.agent.findUnique({
        where: { deviceId },
        include: { employee: true }
    });
};

/**
 * Get all registered agents
 */
const getAllAgents = async (organizationId) => {
    const where = organizationId ? { employee: { organizationId } } : {};
    return await prisma.agent.findMany({
        where,
        include: {
            employee: {
                select: {
                    fullName: true,
                    email: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Stop tracking - usually called when agent shuts down or user stops tracking
 */
const stopTracking = async (employeeId) => {
    try {
        // Clock out the employee
        await attendanceService.clockOut(employeeId);
    } catch (err) {
        // Ignore if already clocked out
        if (!err.message.includes('No active clock-in session found')) {
            console.error('[AgentService] Auto clock-out on stopTracking failed:', err.message);
        }
    }
    
    // Update agent status to inactive
    await prisma.agent.updateMany({
        where: { employeeId },
        data: { status: 'inactive', lastSeen: new Date() }
    });

    return { success: true };
};

module.exports = {
    registerAgent,
    heartbeat,
    logActivity,
    getAgentStatus,
    getAllAgents,
    updateAgentStatus,
    updateAgent,
    deleteAgent,
    findAgentByDeviceId,
    stopTracking
};
