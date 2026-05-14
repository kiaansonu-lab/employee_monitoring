const agentService = require('./agent.service');
const { successResponse, errorResponse } = require('../../utils/response');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const prisma = require('../../config/db');
const { getIO } = require('../../socket/server');
const { getOrganizationId } = require('../../utils/orgId');

const register = async (req, res) => {
    try {
        const { employeeId, email, password, name, deviceId, systemInfo } = req.body;
        
        let targetEmployeeId = employeeId;
        let user = null;

        if (!email || !password || !deviceId) {
            return errorResponse(res, 'Email, Password and Device ID are required', 400);
        }

        // 1. Find or Create User/Employee
        user = await prisma.user.findUnique({
            where: { email },
            include: { employee: true }
        });

        if (!user) {
            console.log(`User record not found for: ${email}. Checking for existing employee...`);
            
            // User doesn't exist, check if Employee already exists by email
            let existingEmployee = await prisma.employee.findUnique({ where: { email } });
            
            if (!existingEmployee) {
                console.log(`Creating new employee for: ${email}`);
                // Find first organization
                const org = await prisma.organization.findFirst();
                if (!org) throw new Error('No organization found in system. Please setup organization first.');

                existingEmployee = await prisma.employee.create({
                    data: {
                        fullName: name || email.split('@')[0],
                        email,
                        organizationId: org.id,
                        role: 'EMPLOYEE',
                        status: 'ACTIVE'
                    }
                });
            }

            console.log(`Creating user record for employee: ${existingEmployee.fullName}`);
            // Create User linked to the employee
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'EMPLOYEE',
                    employeeId: existingEmployee.id
                },
                include: { employee: true }
            });
            
            targetEmployeeId = existingEmployee.id;
        } else {
            // User exists, verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return errorResponse(res, 'Invalid password. Please use your portal login password.', 401);
            }
            
            if (!user.employee) {
                // If user exists but has no employee record (shouldn't happen with our schema but good to handle)
                let existingEmployee = await prisma.employee.findUnique({ where: { email } });
                if (!existingEmployee) {
                    const org = await prisma.organization.findFirst();
                    existingEmployee = await prisma.employee.create({
                        data: {
                            fullName: name || email.split('@')[0],
                            email,
                            organizationId: org ? org.id : 1,
                            role: 'EMPLOYEE',
                            status: 'ACTIVE'
                        }
                    });
                }
                
                await prisma.user.update({
                    where: { id: user.id },
                    data: { employeeId: existingEmployee.id }
                });
                targetEmployeeId = existingEmployee.id;
            } else {
                targetEmployeeId = user.employee.id;
            }
        }

        // 2. Clear Any Existing Agent on this Device (to prevent unique constraint failure)
        const existingDeviceAgent = await prisma.agent.findUnique({
            where: { deviceId }
        });
        
        if (existingDeviceAgent && existingDeviceAgent.employeeId !== targetEmployeeId) {
            console.log(`Removing old agent record for device: ${deviceId} (previously employee: ${existingDeviceAgent.employeeId})`);
            await prisma.agent.delete({ where: { deviceId } });
        }

        // 3. Register Agent (will be 'pending' by default)
        const agent = await agentService.registerAgent(targetEmployeeId, deviceId, systemInfo);
        
        // Simple token for agent security
        const agentToken = Buffer.from(`${targetEmployeeId}:${deviceId}:INSIGHTFUL`).toString('base64');
        
        return successResponse(res, { agent, token: agentToken }, 'Agent registration received and pending approval');
    } catch (error) {
        console.error('Agent register error:', error);
        return errorResponse(res, error.message || 'Failed to register agent', 500);
    }
};

const heartbeat = async (req, res) => {
    try {
        const { deviceId } = req.body;
        if (!deviceId) return errorResponse(res, 'Device ID is required', 400);

        const agent = await prisma.agent.findUnique({ where: { deviceId } });
        if (!agent) return errorResponse(res, 'Agent not found', 404);

        // Check if Approved
        if (agent.status !== 'active') {
            return errorResponse(res, 'Agent is not approved. Please contact admin.', 403);
        }

        await agentService.heartbeat(deviceId);
        return successResponse(res, null, 'Heartbeat received');
    } catch (error) {
        console.error('Agent heartbeat error:', error);
        return errorResponse(res, error.message || 'Heartbeat failed', 500);
    }
};

const logActivity = async (req, res) => {
    try {
        const { employeeId, data } = req.body;
        const authHeader = req.headers['x-agent-auth'] || req.headers['X-Agent-Auth'];

        if (!employeeId || !data) return errorResponse(res, 'Employee ID and Data are required', 400);

        // Check Agent Status
        const agent = await prisma.agent.findUnique({ 
            where: { employeeId },
            include: { employee: true }
        });
        if (!agent || agent.status !== 'active') {
            return errorResponse(res, 'Agent is not active or approved', 403);
        }

        const organizationId = agent.employee.organizationId;

        // Token verification
        if (!authHeader) return errorResponse(res, 'Unauthorized', 401);
        const decoded = Buffer.from(authHeader, 'base64').toString('ascii');
        if (!decoded.includes(employeeId) || !decoded.includes('INSIGHTFUL')) {
            return errorResponse(res, 'Unauthorized', 401);
        }

        const logResult = await agentService.logActivity(employeeId, data);

        // Emit Real-time Socket Events
        const io = getIO();
        if (io && organizationId) {
            const room = `org_${organizationId}`;
            
            // 1. Notify about new screenshot
            if (logResult?.screenshotSaved && logResult?.finalScreenshotUrl) {
                io.to(room).emit('screenshot:new', {
                    employeeId,
                    imageUrl: logResult.finalScreenshotUrl,
                    capturedAt: data.timestamp || new Date(),
                    productivity: 'NEUTRAL',
                    employeeName: agent.employee.fullName
                });
            } else if (data.screenshotUrl) {
                // Helps debug live mismatch: agent sent screenshot but DB/storage save failed.
                console.warn(`[AgentController] Screenshot event skipped (not persisted) for employee ${employeeId}`);
            }

            // 2. Update activity stream
            io.to(room).emit('activity:update', {
                employeeId,
                activeApp: data.activeApp || 'Unknown',
                activeWindow: data.activeWindow || 'Unknown',
                idleTime: data.idleTime || 0,
                location: data.location ? `${data.location.city}, ${data.location.country}` : 'Remote',
                timestamp: new Date()
            });

            // 3. Ensure employee shows as ONLINE
            io.to(room).emit('employee:status', {
                employeeId,
                status: (data.idleTime || 0) > 60 ? 'idle' : 'online'
            });
        }

        return successResponse(res, null, 'Activity logged');
    } catch (error) {
        console.error('Agent logActivity error:', error);
        return errorResponse(res, error.message || 'Failed to log activity', 500);
    }
};

const downloadAgent = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../../../public/agent/ems-tracker-setup.exe');
        
        if (!fs.existsSync(filePath)) {
            return errorResponse(res, 'Agent installer not found. Please contact administrator.', 404);
        }
        
        res.download(filePath, 'ems-tracker-setup.exe');
    } catch (error) {
        console.error('Agent download error:', error);
        return errorResponse(res, 'Failed to download agent', 500);
    }
};

const getStatus = async (req, res) => {
    try {
        const employeeId = req.params.employeeId || req.user.employeeId;
        const status = await agentService.getAgentStatus(employeeId);
        
        if (status.status === 'missing') {
            return errorResponse(res, 'Agent record not found', 404);
        }
        
        return successResponse(res, status, 'Agent status retrieved');
    } catch (error) {
        console.error('Get agent status error:', error);
        return errorResponse(res, error.message || 'Failed to get status', 500);
    }
};

const listAgents = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const agents = await agentService.getAllAgents(organizationId);
        return successResponse(res, agents, 'Agents list retrieved');
    } catch (error) {
        console.error('List agents error:', error);
        return errorResponse(res, error.message || 'Failed to list agents', 500);
    }
};

const checkDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const agent = await agentService.findAgentByDeviceId(deviceId);
        
        if (!agent) {
            return errorResponse(res, 'Device not registered', 404);
        }

        const agentToken = Buffer.from(`${agent.employeeId}:${agent.deviceId}:INSIGHTFUL`).toString('base64');

        return successResponse(res, {
            employeeId: agent.employeeId,
            employeeName: agent.employee.fullName,
            employeeEmail: agent.employee.email,
            status: agent.status,
            token: agentToken
        }, 'Device recognized');
    } catch (error) {
        console.error('Check device error:', error);
        return errorResponse(res, error.message || 'Check failed', 500);
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const agent = await agentService.updateAgentStatus(id, status);
        
        // If approved, notify the agent immediately via socket
        if (status === 'active') {
            const io = getIO();
            if (io) {
                console.log(`Emitting agent:approved for employee: ${agent.employeeId}`);
                io.to(`employee_${agent.employeeId}`).emit('agent:approved');
                
                // Also notify dashboard
                io.to(`org_${agent.organizationId || 'default'}`).emit('employee:status', {
                    employeeId: agent.employeeId,
                    status: 'online'
                });
            }
        }

        res.status(200).json({ success: true, data: agent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await agentService.updateAgent(id, req.body);
        return successResponse(res, agent, 'Agent and employee updated successfully');
    } catch (error) {
        return errorResponse(res, error.message || 'Update failed', 500);
    }
};

const remove = async (req, res) => {
// ... existing code ...
};

const stopTracking = async (req, res) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) return errorResponse(res, 'Employee ID is required', 400);

        await agentService.stopTracking(employeeId);
        return successResponse(res, null, 'Tracking stopped and employee clocked out');
    } catch (error) {
        console.error('Agent stopTracking error:', error);
        return errorResponse(res, error.message || 'Stop tracking failed', 500);
    }
};

module.exports = {
    register,
    heartbeat,
    logActivity,
    downloadAgent,
    getStatus,
    listAgents,
    updateStatus,
    update,
    remove,
    checkDevice,
    stopTracking
};
