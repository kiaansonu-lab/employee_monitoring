const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Capture a system or security event in the audit log.
 * 
 * @param {Object} params
 * @param {string} params.organizationId - ID of the organization
 * @param {string} params.userId - ID of the employee/user who performed the action
 * @param {string} params.action - Description of the action (e.g., "User Login")
 * @param {string} params.status - Result of the action (e.g., "Success", "Denied", "Warning")
 * @param {string} [params.ipAddress] - IP address of the user
 * @param {Object} [params.metadata] - Additional JSON data related to the event
 */
const createAuditLog = async ({ organizationId, userId, action, status, ipAddress, metadata }) => {
    try {
        // Guard: Prisma requires these fields to be non-null based on schema
        if (!organizationId || !userId) {
            console.warn(`[AuditLog] Skipping log entry for "${action}" due to missing organizationId (${organizationId}) or userId (${userId})`);
            return;
        }

        await prisma.auditLog.create({
            data: {
                organizationId,
                userId,
                action,
                status,
                ipAddress: ipAddress || null,
                metadata: metadata || {}
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error.message || error);
    }
};

module.exports = {
    createAuditLog
};
