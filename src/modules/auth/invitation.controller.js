const invitationService = require('./invitation.service');

const sendInvitation = async (req, res) => {
  try {
    const { email, role } = req.body;
    const { organizationId } = req.user;

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
    res.json({ message: 'Password setup complete. You can now log in.', employee: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendInvitation,
  completeInvitation
};
