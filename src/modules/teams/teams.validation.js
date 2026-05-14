const { z } = require('zod');

const createTeamSchema = z.object({
    name: z.string().min(2, 'Team name must be at least 2 characters'),
    description: z.string().optional(),
    color: z.string().optional(),
    organizationId: z.string(),
});

const updateTeamSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    color: z.string().optional(),
});

module.exports = {
    createTeamSchema,
    updateTeamSchema,
};
