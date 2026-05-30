import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listInvoicesHandler,
  getInvoiceHandler,
  createInvoiceHandler,
  updateInvoiceHandler,
  recordPaymentHandler,
  listPaymentsHandler,
  refundPaymentHandler,
  getPatientDebtHandler,
  listPatientInvoicesHandler,
  getFinanceSummaryHandler,
} from './invoices.controller.js';

export async function invoicesRoutes(fastify) {
  fastify.get('/',      { preHandler: [authenticate, authorize('invoices:read')] }, listInvoicesHandler);
  fastify.get('/:id',   { preHandler: [authenticate, authorize('invoices:read')] }, getInvoiceHandler);
  fastify.post('/',     { preHandler: [authenticate, authorize('invoices:*')]    }, createInvoiceHandler);
  fastify.patch('/:id', { preHandler: [authenticate, authorize('invoices:*')]    }, updateInvoiceHandler);

  // Payments sub-resource
  fastify.get('/:id/payments',  { preHandler: [authenticate, authorize('invoices:read')] }, listPaymentsHandler);
  fastify.post('/:id/payments', { preHandler: [authenticate, authorize('payments:*')]    }, recordPaymentHandler);

  // Refund a specific payment
  fastify.post('/:id/payments/:paymentId/refund', { preHandler: [authenticate, authorize('payments:*')] }, refundPaymentHandler);
}

export async function financeRoutes(fastify) {
  // GET /api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get('/summary', { preHandler: [authenticate, authorize('finance:*')] }, getFinanceSummaryHandler);
}

export async function patientDebtRoute(fastify) {
  // GET /api/v1/patients/:patientId/debt
  fastify.get('/:patientId/debt',     { preHandler: [authenticate, authorize('invoices:read')] }, getPatientDebtHandler);
  // GET /api/v1/patients/:patientId/invoices
  fastify.get('/:patientId/invoices', { preHandler: [authenticate, authorize('invoices:read')] }, listPatientInvoicesHandler);
}
