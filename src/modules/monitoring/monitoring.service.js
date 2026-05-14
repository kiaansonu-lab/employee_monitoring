const prisma = require('../../config/db');
const { getLiveSessions } = require('../../socket/server');

/**
 * Get all online employees for an organization
 */
const getOnlineEmployees = async (organizationId) => {
    const liveSessions = getLiveSessions();
    const onlineEmployeeIds = [];

    for (const [employeeId, session] of liveSessions.entries()) {
        if (session.organizationId === organizationId && session.status !== 'OFFLINE') {
            onlineEmployeeIds.push(employeeId);
        }
    }

    if (onlineEmployeeIds.length === 0) return [];

    return await prisma.employee.findMany({
        where: {
            id: { in: onlineEmployeeIds }
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            status: true,
            avatar: true,
            role: true
        }
    });
};

/**
 * Get latest live feed for an organization
 */
const getLiveFeed = async (organizationId, limit = 20) => {
    return await prisma.liveActivity.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            employee: {
                select: {
                    fullName: true,
                    avatar: true
                }
            }
        }
    });
};

/**
 * Get specific employee live data
 */
const getEmployeeLiveData = async (employeeId) => {
    const liveSessions = getLiveSessions();
    const session = liveSessions.get(employeeId);

    const lastActivity = await prisma.liveActivity.findFirst({
        where: { employeeId },
        orderBy: { createdAt: 'desc' }
    });

    return {
        isOnline: session ? session.status !== 'OFFLINE' : false,
        status: session ? session.status : 'OFFLINE',
        currentApp: lastActivity?.activeApp || 'N/A',
        currentWindow: lastActivity?.activeWindow || 'N/A',
        idleTime: lastActivity?.idleTime || 0,
        keystrokes: lastActivity?.keystrokes || 0,
        mouseClicks: lastActivity?.mouseClicks || 0,
        lastSeen: lastActivity?.createdAt || null
    };
};

module.exports = {
    getOnlineEmployees,
    getLiveFeed,
    getEmployeeLiveData
};
