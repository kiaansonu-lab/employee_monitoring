const prisma = require('../../config/db');

/**
 * Get payroll summary for an organization
 */
const getPayrollSummary = async (organizationId, params = {}) => {
    const { userId, teamId, startDate, endDate } = params;
    
    // Default: current month
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const employeeWhere = { organizationId };
    if (userId) employeeWhere.id = userId;
    else if (teamId) employeeWhere.teamId = teamId;

    const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
            attendance: {
                where: { date: { gte: start, lte: end } }
            },
            manualTimeEntries: {
                where: {
                    startTime: { gte: start },
                    endTime: { lte: end }
                }
            }
        }
    });

    let totalGross = 0;
    let totalHours = 0;
    
    employees.forEach(emp => {
        // Attendance hours - Calculate from clockIn/clockOut if duration is 0
        const attSeconds = emp.attendance.reduce((acc, a) => {
            if (a.duration > 0) return acc + a.duration;
            if (a.clockIn && a.clockOut) {
                return acc + Math.floor((new Date(a.clockOut) - new Date(a.clockIn)) / 1000);
            }
            if (a.clockIn && !a.clockOut) {
                // If currently clocked in, calculate until now
                return acc + Math.floor((new Date() - new Date(a.clockIn)) / 1000);
            }
            return acc;
        }, 0);

        // Manual time hours
        const manualSeconds = (emp.manualTimeEntries || []).reduce((acc, m) => acc + (m.duration || 0), 0);
        const empHours = (attSeconds + manualSeconds) / 3600;

        totalHours += empHours;
        totalGross += empHours * (emp.hourlyRate || 0);
    });

    const avgRate = employees.length > 0
        ? employees.reduce((acc, e) => acc + (e.hourlyRate || 0), 0) / employees.length
        : 0;

    return {
        totalPayroll: Math.round(totalGross * 100) / 100,
        avgHourlyRate: Math.round(avgRate * 10) / 10,
        staffCount: employees.length,
        trend: 5.2,
        avgRateTrend: 1.2,
    };
};

/**
 * Get payroll records (timesheet + payslip data) for all employees in org
 */
const getPayrollRecords = async (organizationId, startDate, endDate, params = {}) => {
    const { userId, teamId } = params;
    
    // Default: current month
    const now = new Date();
    const start = startDate instanceof Date ? startDate : (startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1));
    start.setHours(0, 0, 0, 0);
    const end = endDate instanceof Date ? endDate : (endDate ? new Date(endDate) : new Date());
    end.setHours(23, 59, 59, 999);

    const employeeWhere = { organizationId };
    if (userId) employeeWhere.id = userId;
    else if (teamId) employeeWhere.teamId = teamId;

    const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
            attendance: {
                where: { date: { gte: start, lte: end } }
            },
            manualTimeEntries: {
                where: {
                    startTime: { gte: start },
                    endTime: { lte: end }
                }
            },
            team: { select: { name: true } }
        }
    });

    const periodLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return employees.map(emp => {
        // Attendance (clock-in/out) seconds - Calculate dynamically if duration is 0
        const attSeconds = emp.attendance.reduce((acc, a) => {
            if (a.duration > 0) return acc + a.duration;
            if (a.clockIn && a.clockOut) {
                return acc + Math.floor((new Date(a.clockOut) - new Date(a.clockIn)) / 1000);
            }
            if (a.clockIn && !a.clockOut) {
                return acc + Math.floor((new Date() - new Date(a.clockIn)) / 1000);
            }
            return acc;
        }, 0);
        
        // Manual time seconds
        const manualSeconds = (emp.manualTimeEntries || []).reduce((acc, m) => acc + (m.duration || 0), 0);
        const totalSeconds = attSeconds + manualSeconds;
        const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;

        // Calculate overtime: anything over 8h/day is OT
        const workDays = emp.attendance.length;
        const regularSeconds = workDays * 8 * 3600;
        const overtimeSeconds = Math.max(0, attSeconds - regularSeconds);
        const overtimeHours = Math.round((overtimeSeconds / 3600) * 100) / 100;

        const rate = emp.hourlyRate || 0;
        const grossPay = Math.round(totalHours * rate * 100) / 100;

        // Tax deductions: 20%
        const deductions = Math.round(grossPay * 0.2 * 100) / 100;
        const netPay = Math.round((grossPay - deductions) * 100) / 100;

        return {
            id: emp.id,
            employee: emp.fullName,
            role: emp.role,
            team: emp.team?.name || 'No Team',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=random`,
            period: periodLabel,
            totalHours,
            overTime: overtimeHours,
            hourlyRate: rate,
            grossPay,
            deductions,
            netPay,
            status: totalHours > 0 ? 'Ready' : 'Pending',
        };
    });
};

module.exports = {
    getPayrollSummary,
    getPayrollRecords
};
