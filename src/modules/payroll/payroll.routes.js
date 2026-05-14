const express = require('express');
const router = express.Router();
const payrollController = require('./payroll.controller');
const invoiceController = require('./invoice.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/summary', payrollController.getPayrollSummary);
router.get('/records', payrollController.getPayrollRecords);

// Invoice Routes
router.get('/invoices', invoiceController.getInvoices);
router.post('/invoices', invoiceController.createInvoice);

module.exports = router;
