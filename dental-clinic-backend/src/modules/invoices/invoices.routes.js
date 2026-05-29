import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listInvoicesHandler,
  getInvoiceHandler,
  createInvoiceHandler,
  updateInvoiceHandler,
  recordPaymentHandler,
  getPatientDebtHandler,
  getFinanceSummaryHandler,
} from './invoices.controller.js';

export async function invoicesRoutes(fastify) {
  fastify.get('/',    { preHandler: [authenticate, authorize('invoices:read')] }, listInvoicesHandler);
  fastify.get('/:id', { preHandler: [authenticate, authorize('invoices:read')] }, getInvoiceHandler);
  fastify.post('/',   { preHandler: [authenticate, authorize('invoices:*')]    }, createInvoiceHandler);
  fastify.patch('/:id', { preHandler: [authenticate, authorize('invoices:*')] }, updateInvoiceHandler);

  // POST /api/v1/invoices/:id/payments
  fastify.post('/:id/payments', { preHandler: [authenticate, authorize('payments:*')] }, recordPaymentHandler);
}

export async function financeRoutes(fastify) {
  // GET /api/v1/finance/summary
  fastify.get('/summary', { preHandler: [authenticate, authorize('finance:*')] }, getFinanceSummaryHandler);
}

export async function patientDebtRoute(fastify) {
  // GET /api/v1/patients/:patientId/debt
  fastify.get('/:patientId/debt', { preHandler: [authenticate, authorize('invoices:read')] }, getPatientDebtHandler);
}
