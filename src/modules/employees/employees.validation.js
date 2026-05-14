const { z } = require('zod');

const inviteEmployeeSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    teamId: z.string(),
    location: z.string().optional().default('Remote'),
    computerType: z.enum(['COMPANY', 'PERSONAL']).default('PERSONAL'),
    organizationId: z.string(),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
});

const updateEmployeeSchema = z.object({
    fullName: z.string().optional(),
    teamId: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(['INVITED', 'ACTIVE', 'OFFLINE', 'IDLE', 'DEACTIVATED', 'MERGED']).optional(),
    hourlyRate: z.number().optional(),
    avatar: z.string().optional(),
    password: z.string().min(6).optional(),
});

module.exports = {
    inviteEmployeeSchema,
    updateEmployeeSchema,
};
