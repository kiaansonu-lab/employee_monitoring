const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createReport = async (data) => {
    return await prisma.emailReport.create({
        data: {
            title: data.title,
            frequency: data.frequency,
            recipients: data.recipients,
            sendToSelf: data.sendToSelf,
            content: data.content,
            isActive: data.isActive !== undefined ? data.isActive : true,
            organizationId: data.organizationId
        }
    });
};

exports.getReports = async (organizationId) => {
    return await prisma.emailReport.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' }
    });
};

exports.updateReport = async (id, data, organizationId) => {
    return await prisma.emailReport.update({
        where: { id: id },
        data: {
            title: data.title,
            frequency: data.frequency,
            recipients: data.recipients,
            sendToSelf: data.sendToSelf,
            content: data.content,
            isActive: data.isActive
        }
    });
};

exports.deleteReport = async (id, organizationId) => {
    return await prisma.emailReport.delete({
        where: { id: id }
    });
};
