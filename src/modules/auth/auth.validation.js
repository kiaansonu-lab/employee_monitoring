const { z } = require('zod');

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
    organizationId: z.string().uuid('Invalid Organization ID'),
    teamId: z.string().uuid('Invalid Team ID').optional(),
    hourlyRate: z.number().nonnegative().optional().default(0),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

module.exports = {
    registerSchema,
    loginSchema,
};
