const prisma = require('../../config/db');
const { getDistance } = require('../../utils/geo');

/**
 * Track employee location and check for work zone matching.
 */
const trackLocation = async (data) => {
    const { employeeId, organizationId, latitude, longitude, accuracy, source } = data;

    // Check if location tracking is enabled
    const settings = await prisma.complianceSetting.findUnique({
        where: { organizationId }
    });

    if (settings && !settings.locationTracking) {
        return { log: null, matchedZone: null };
    }

    // 1. Store the location log
    const log = await prisma.locationLog.create({
        data: {
            employeeId,
            organizationId,
            latitude,
            longitude,
            accuracy: accuracy || null,
            source: source || 'GPS'
        }
    });

    // 2. Check if employee is in a WorkZone
    const workZones = await prisma.workZone.findMany({
        where: { organizationId }
    });

    let matchedZone = null;
    for (const zone of workZones) {
        const distance = getDistance(latitude, longitude, zone.latitude, zone.longitude);
        if (distance <= zone.radius) {
            matchedZone = zone;
            break;
        }
    }

    // 3. Update employee location label/status
    await prisma.employee.update({
        where: { id: employeeId },
        data: {
            location: matchedZone ? matchedZone.type : 'Remote'
        }
    });

    return { log, matchedZone };
};

/**
 * Get location history for an employee.
 */
const getLocationHistory = async (employeeId, limit = 100) => {
    return prisma.locationLog.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
        take: limit
    });
};

/**
 * Get the latest known location for all employees in an organization.
 * Used for the Live Location Tracking map.
 */
const getLiveLocations = async (organizationId) => {
    // 1. Get all active employees in the organization
    const employees = await prisma.employee.findMany({
        where: { 
            organizationId,
            role: 'EMPLOYEE',
            status: { notIn: ['DEACTIVATED', 'MERGED'] }
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            avatar: true,
            team: { select: { name: true } }
        }
    });

    // 2. Map through employees to fetch their latest location log
    const liveLocations = await Promise.all(
        employees.map(async (emp) => {
            const latestLog = await prisma.locationLog.findFirst({
                where: { employeeId: emp.id },
                orderBy: { createdAt: 'desc' }
            });

            return {
                id: emp.id,
                name: emp.fullName,
                email: emp.email,
                avatar: emp.avatar,
                team: emp.team ? emp.team.name : 'Unassigned',
                latitude: latestLog ? latestLog.latitude : null,
                longitude: latestLog ? latestLog.longitude : null,
                lastUpdate: latestLog ? latestLog.createdAt : null,
                source: latestLog ? latestLog.source : null
            };
        })
    );

    return liveLocations;
};

module.exports = {
    trackLocation,
    getLocationHistory,
    getLiveLocations
};
