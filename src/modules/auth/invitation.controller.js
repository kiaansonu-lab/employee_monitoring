const invitationService = require('./invitation.service');
const { successResponse, errorResponse } = require('../../utils/response');

const sendInvitation = async (req, res) => {
    try {
        const { email, role, organizationId } = req.body;
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can send invitations' });
        }
        const result = await invitationService.sendInvitation(email, role, organizationId);
        res.json({ message: 'Invitation sent successfully', setupLink: result.setupLink });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const completeInvitation = async (req, res) => {
    try {
        const { token, password } = req.body;
        const result = await invitationService.completeInvitation(token, password);
        res.json({ message: 'Account setup complete', data: result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/** Public: validate invite token for agent setup page */
const validateInviteToken = async (req, res) => {
    try {
        const { token } = req.params;
        const data = await invitationService.getInvitationByToken(token);
        if (!data) {
            return errorResponse(res, 'Invalid or expired invitation', 404);
        }

        const { invitation, employee } = data;
        const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');

        return successResponse(res, {
            email: invitation.email,
            fullName: employee?.fullName || '',
            workMode: employee?.workMode || 'Remote',
            team: employee?.team?.name || null,
            agentDownloadUrl: `${API_PUBLIC_URL}/api/agent/download`,
            deepLink: `ems-tracker://setup?token=${token}`,
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

module.exports = {
    sendInvitation,
    completeInvitation,
    validateInviteToken,
};
