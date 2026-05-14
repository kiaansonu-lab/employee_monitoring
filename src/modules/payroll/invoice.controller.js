const invoiceService = require('./invoice.service');
const { getOrganizationId } = require('../../utils/orgId');
const { successResponse, errorResponse } = require('../../utils/response');

const getInvoices = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const invoices = await invoiceService.getInvoices(organizationId);
        return successResponse(res, invoices, 'Invoices retrieved successfully');
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

const createInvoice = async (req, res) => {
    try {
        const organizationId = await getOrganizationId(req);
        const invoiceData = req.body;

        if (!invoiceData.clientName || !invoiceData.amount) {
            return errorResponse(res, 'Client name and amount are required', 400);
        }

        const invoice = await invoiceService.createInvoice(organizationId, invoiceData);
        return successResponse(res, invoice, 'Invoice created successfully', 201);
    } catch (error) {
        console.error('Error creating invoice:', error);
        return errorResponse(res, error.message || 'Internal server error', 500);
    }
};

module.exports = {
    getInvoices,
    createInvoice
};
