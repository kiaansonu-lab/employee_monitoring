const bcrypt = require('bcrypt');
const prisma = require('../../config/db');
const { generateToken } = require('../../utils/jwt');

/**
 * Register a new user and employee
 */
const register = async (userData) => {
    const { name, email, password, role, organizationId, teamId, hourlyRate } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Employee and User in a transaction
    return await prisma.$transaction(async (tx) => {
        // 1. Create Employee
        const employee = await tx.employee.create({
            data: {
                fullName: name, // Fixed: fullName instead of name
                email,
                role,
                organizationId,
                teamId,
                hourlyRate,
            },
        });

        // 2. Create User linked to Employee
        const user = await tx.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                employeeId: employee.id,
            },
        });

        // Generate Token
        const token = generateToken({ 
            userId: user.id, 
            role: user.role, 
            employeeId: employee.id, // Added: include employeeId in token
            organizationId: employee.organizationId 
        });
        return { token, user: { id: user.id, email: user.email, role: user.role, employeeId: employee.id, organizationId: employee.organizationId, teamId: employee.teamId } };
    });
};

/**
 * Login user
 */
const login = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: { employee: true },
    });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Check if account is deactivated
    if (user.employee && user.employee.status.toUpperCase() === 'DEACTIVATED') {
        const { createAuditLog } = require('../../utils/audit.util');
        await createAuditLog({
            organizationId: user.employee?.organizationId,
            userId: user.employeeId,
            action: 'User Login',
            status: 'Denied',
            metadata: { reason: 'Account de-activated' }
        });
        throw new Error('Your account has been deactivated. Please contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        // Log failed login (wrong password)
        const { createAuditLog } = require('../../utils/audit.util');
        await createAuditLog({
            organizationId: user.employee?.organizationId,
            userId: user.employeeId,
            action: 'User Login',
            status: 'Denied',
            metadata: { reason: 'Invalid password' }
        });
        throw new Error('Invalid email or password');
    }

    const token = generateToken({
        userId: user.id,
        role: user.role,
        employeeId: user.employeeId, // Added: include employeeId in token
        organizationId: user.employee?.organizationId
    });

    // Log successful login
    const { createAuditLog } = require('../../utils/audit.util');
    await createAuditLog({
        organizationId: user.employee?.organizationId,
        userId: user.employeeId,
        action: 'User Login',
        status: 'Success'
    });

    // Update employee status to ACTIVE on login
    if (user.employeeId) {
        await prisma.employee.update({
            where: { id: user.employeeId },
            data: { status: 'ACTIVE' },
        });
    }

    // Get agent status for employees
    let agentStatus = null;
    if (user.role === 'EMPLOYEE' && user.employeeId) {
        const { getAgentStatus } = require('../agent/agent.service');
        agentStatus = await getAgentStatus(user.employeeId);
        
        // Fetch active attendance session (any open session for this employee)
        const activeAttendance = await prisma.attendance.findFirst({
            where: { employeeId: user.employeeId, clockOut: null },
            orderBy: { clockIn: 'desc' }
        });
        user.activeAttendance = activeAttendance;
    }

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.name || user.employee?.fullName || user.email.split('@')[0],
            name: user.name || user.employee?.fullName || user.email.split('@')[0], 
            avatar: user.avatar || user.employee?.avatar || null,
            employeeId: user.employeeId,
            organizationId: user.employee?.organizationId,
            teamId: user.employee?.teamId,
            agentStatus: agentStatus,
            activeAttendance: user.activeAttendance
        },
    };
};

/**
 * Get current user profile
 */
const getMe = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            employeeId: true,
            createdAt: true,
            name: true,
            avatar: true,
            employee: {
                include: {
                    organization: true,
                    team: true,
                },
            },
        },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Flatten data if employee exists
    if (user.employee) {
        user.fullName = user.name || user.employee.fullName;
        user.name = user.name || user.employee.fullName; // For frontend compatibility
        user.avatar = user.avatar || user.employee.avatar;
        
        if (user.employee.organization) {
            user.organization = user.employee.organization;
            user.organizationId = user.employee.organizationId;
        }
        user.teamId = user.employee.teamId;
        
        // Add agent status
        if (user.role === 'EMPLOYEE') {
            const { getAgentStatus } = require('../agent/agent.service');
            user.agentStatus = await getAgentStatus(user.employeeId);
            
            // Add active attendance (any open session)
            user.activeAttendance = await prisma.attendance.findFirst({
                where: { employeeId: user.employeeId, clockOut: null },
                orderBy: { clockIn: 'desc' }
            });
        }
    } else {
        // Provide fallbacks for users without employee record (like seeded admins)
        user.fullName = user.name || user.email.split('@')[0];
        user.name = user.fullName;
        user.avatar = user.avatar || null;
    }

    return user;
};

/**
 * Update user/employee profile
 */
const updateProfile = async (userId, data) => {
    const { name, email, avatar } = data;

    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: userId },
            include: { employee: true }
        });

        if (!user) throw new Error('User not found');

        // Update user email, name, and avatar directly
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { 
                email: email || user.email,
                name: name || user.name,
                avatar: avatar || user.avatar
            }
        });

        // If employee exists, also sync their data to keep DB consistent
        if (user.employeeId) {
            await tx.employee.update({
                where: { id: user.employeeId },
                data: {
                    fullName: name || user.employee.fullName,
                    email: email || user.email,
                    avatar: avatar || user.employee.avatar
                }
            });
        }

        return updatedUser;
    });
};

/**
 * Change user password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Invalid current password');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });
};

/**
 * Forgot password (Mock)
 */
const forgotPassword = async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent return for security

    console.log(`[ForgotPassword] Mock reset link generated for ${email}`);
};

/**
 * Logout user - update status to OFFLINE
 */
const logout = async (employeeId) => {
    if (!employeeId) return;
    
    await prisma.employee.update({
        where: { id: employeeId },
        data: { status: 'OFFLINE' },
    });
};

module.exports = {
    register,
    login,
    getMe,
    logout,
    updateProfile,
    changePassword,
    forgotPassword
};
