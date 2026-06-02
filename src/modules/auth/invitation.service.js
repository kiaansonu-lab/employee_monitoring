const prisma = require('../../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { sendMail } = require('../../utils/email.service');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');

const createInvitationToken = async (email, role, organizationId) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitationToken.create({
        data: {
            email,
            role,
            organizationId,
            token,
            expiresAt,
        },
    });

    return { invitation, token, expiresAt };
};

const sendInvitation = async (email, role, organizationId, fullName) => {
    const { token } = await createInvitationToken(email, role, organizationId);

    if (role === 'ADMIN' || role === 'MANAGER') {
        await prisma.user.upsert({
            where: { email },
            update: { name: fullName, role },
            create: {
                email,
                name: fullName,
                role,
                password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
            },
        });
    }

    const setupLink = `${FRONTEND_URL}/setup-password?token=${token}`;
    return { setupLink };
};

/**
 * Personal computer invite: email with agent setup + download links.
 */
const sendEmployeeAgentInvitation = async ({ email, fullName, organizationId, workMode }) => {
    const { token } = await createInvitationToken(email, 'EMPLOYEE', organizationId);

    const agentSetupLink = `${FRONTEND_URL}/setup-agent?token=${token}`;
    const agentDownloadLink = `${API_PUBLIC_URL}/api/agent/download`;
    const deepLink = `ems-tracker://setup?token=${token}`;

    const subject = 'Install your Employee Monitoring Agent';
    const text = [
        `Hello ${fullName},`,
        '',
        'Your organization invited you to install the monitoring agent on your personal computer.',
        '',
        `1. Open this link to get started: ${agentSetupLink}`,
        `2. Download the agent, then install and open it.`,
        `3. Use this email address: ${email}`,
        '4. Choose your password and allow tracking permissions.',
        '',
        `Direct download: ${agentDownloadLink}`,
        '',
        'This link expires in 7 days.',
    ].join('\n');

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
            <h2 style="color:#4f46e5">Employee Monitoring Agent</h2>
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>You have been invited to install the monitoring agent on your <strong>personal computer</strong> (${workMode || 'Remote'}).</p>
            <p style="margin:24px 0">
                <a href="${agentSetupLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
                    Download &amp; Setup Agent
                </a>
            </p>
            <p><strong>Your work email (required in the agent):</strong><br/><code>${email}</code></p>
            <p style="font-size:13px;color:#64748b">
                Steps: open the link above → download the installer → run the app → enter the same email → set a password → allow permissions.
            </p>
            <p style="font-size:12px;color:#94a3b8">
                Direct download: <a href="${agentDownloadLink}">${agentDownloadLink}</a><br/>
                After installing, you can also open: <a href="${deepLink}">Open in EMS Tracker</a>
            </p>
        </div>
    `;

    const mailResult = await sendMail({ to: email, subject, html, text });

    return {
        setupLink: agentSetupLink,
        agentDownloadLink,
        deepLink,
        emailSent: mailResult.sent,
        emailSimulated: mailResult.simulated,
    };
};

const getInvitationByToken = async (token) => {
    const invitation = await prisma.invitationToken.findUnique({ where: { token } });
    if (!invitation || invitation.expiresAt < new Date()) {
        return null;
    }

    const employee = await prisma.employee.findUnique({
        where: { email: invitation.email },
        include: { team: { select: { name: true } } },
    });

    return { invitation, employee };
};

const completeInvitation = async (token, password) => {
    const invitation = await prisma.invitationToken.findUnique({
        where: { token },
    });

    if (!invitation || invitation.expiresAt < new Date()) {
        throw new Error('Invalid or expired invitation token');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let result;
    if (invitation.role === 'EMPLOYEE') {
        result = await prisma.employee.update({
            where: { email: invitation.email },
            data: {
                status: 'ACTIVE',
                user: {
                    upsert: {
                        create: {
                            email: invitation.email,
                            password: hashedPassword,
                            role: invitation.role,
                        },
                        update: {
                            password: hashedPassword,
                            role: invitation.role,
                        },
                    },
                },
            },
        });
    } else {
        result = await prisma.user.update({
            where: { email: invitation.email },
            data: {
                password: hashedPassword,
                role: invitation.role,
            },
        });
    }

    await prisma.invitationToken.delete({ where: { id: invitation.id } });
    return result;
};

const consumeInvitationForAgent = async (token, email) => {
    const data = await getInvitationByToken(token);
    if (!data) {
        throw new Error('Invalid or expired invitation link');
    }
    if (data.invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error('Email must match the invited address');
    }
    await prisma.invitationToken.delete({ where: { id: data.invitation.id } });
    return data.employee;
};

module.exports = {
    sendInvitation,
    sendEmployeeAgentInvitation,
    getInvitationByToken,
    completeInvitation,
    consumeInvitationForAgent,
};
