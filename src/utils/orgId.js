 const prisma = require('../config/db');

/**
 * Resolves the organizationId for a request.
 * Tries: 
 * 1. req.user.organizationId (from JWT)
 * 2. req.user.employeeId (linked employee record)
 * 3. Global fallback to the first organization in DB
 */
async function getOrganizationId(req) {
    // 1. Check JWT
    if (req.user?.organizationId) return req.user.organizationId;

    // 2. Check linked employee
    if (req.user?.employeeId) {
        const employee = await prisma.employee.findUnique({
            where: { id: req.user.employeeId }
        });
        if (employee?.organizationId) return employee.organizationId;
    }

    // 3. Global Fallback (for ADMINs without employee record)
    const org = await prisma.organization.findFirst({ select: { id: true } });
    return org?.id || 'default-org-id';
}

module.exports = { getOrganizationId };
