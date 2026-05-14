const { z } = require('zod');

const organizationSchema = z.object({
    legalName: z.string().min(3, "Legal name must be at least 3 characters"),
    industry: z.string().optional(),
    organizationSize: z.string().optional(),
    timeZone: z.string().min(1, "Time zone is required"),
    workStartTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid start time format"),
    workEndTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid end time format"),
    workDays: z.array(z.string()).min(1, "At least one workday is required"),
});

module.exports = {
    organizationSchema
};
