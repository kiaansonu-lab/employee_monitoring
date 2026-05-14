const prisma = require('../../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const sendInvitation = async (email, role, organizationId, fullName) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const invitation = await prisma.invitationToken.create({
    data: {
      email,
      role,
      organizationId,
      token,
      expiresAt
    }
  });

  // If ADMIN or MANAGER, we create/update the User skeleton now to store the name
  if (role === 'ADMIN' || role === 'MANAGER') {
    await prisma.user.upsert({
      where: { email },
      update: { name: fullName, role },
      create: { 
        email, 
        name: fullName, 
        role, 
        password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10) // Set a dummy but valid password
      }
    });
  }

  // In a real app, send email here. For now, we'll return the setup link.
  const setupLink = `http://localhost:5173/setup-password?token=${token}`;
  
  return { invitation, setupLink };
};

const completeInvitation = async (token, password) => {
  const invitation = await prisma.invitationToken.findUnique({
    where: { token }
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
              role: invitation.role
            },
            update: {
              password: hashedPassword,
              role: invitation.role
            }
          }
        }
      }
    });
  } else {
    // ONLY update user for non-employee roles
    result = await prisma.user.update({
      where: { email: invitation.email },
      data: {
        password: hashedPassword,
        role: invitation.role
      }
    });
  }

  // Delete the token after use
  await prisma.invitationToken.delete({ where: { id: invitation.id } });

  return result;
};

module.exports = {
  sendInvitation,
  completeInvitation
};
