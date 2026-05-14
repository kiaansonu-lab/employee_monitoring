const prisma = require('../../config/db');

/**
 * Get all invoices for an organization
 */
const getInvoices = async (organizationId) => {
    return await prisma.invoice.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Create a new invoice
 */
const createInvoice = async (organizationId, invoiceData) => {
    // Generate a unique invoice number if not provided
    const lastInvoice = await prisma.invoice.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    let nextNum = 1;
    if (lastInvoice && lastInvoice.invoiceNumber.startsWith('INV-')) {
        const lastNum = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const invoiceNumber = invoiceData.invoiceNumber || `INV-${String(nextNum).padStart(3, '0')}`;

    // Validate and format dueDate
    let dueDateValue;
    try {
        dueDateValue = invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(new Date().setDate(new Date().getDate() + 30));
        if (isNaN(dueDateValue.getTime())) {
            dueDateValue = new Date(new Date().setDate(new Date().getDate() + 30));
        }
    } catch (e) {
        dueDateValue = new Date(new Date().setDate(new Date().getDate() + 30));
    }

    // Remove dueDate and invoiceNumber from invoiceData to avoid conflicts in spread
    const { dueDate, invoiceNumber: _, ...dataWithoutConflicts } = invoiceData;

    return await prisma.invoice.create({
        data: {
            ...dataWithoutConflicts,
            invoiceNumber,
            organizationId,
            dueDate: dueDateValue
        }
    });
};

module.exports = {
    getInvoices,
    createInvoice
};
