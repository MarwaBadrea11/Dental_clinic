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

/**
 * موديول مسارات الفواتير والعمليات المالية لـ SmileFix
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function invoicesRoutes(fastify) {
  // جلب قائمة الفواتير (يدعم البحث النصي والفلترة بالحالة والتواريخ)
  fastify.get('/',      { preHandler: [authenticate, authorize('invoices:read')] }, listInvoicesHandler);
  
  // جلب تفاصيل فاتورة محددة مع مدفوعاتها ومرتجعاتها
  fastify.get('/:id',   { preHandler: [authenticate, authorize('invoices:read')] }, getInvoiceHandler);
  
  // إنشاء فاتورة جديدة (يدعم إضافة الملاحظات notes وحقول العناصر يدويًا)
  fastify.post('/',     { preHandler: [authenticate, authorize('invoices:*')]    }, createInvoiceHandler);
  
  // تحديث بيانات فاتورة (مثل تغيير حالتها إلى ISSUED أو تعديل العناصر قبل الإغلاق)
  fastify.patch('/:id', { preHandler: [authenticate, authorize('invoices:*')]    }, updateInvoiceHandler);

  // إدارات المدفوعات التابعة للفاتورة (Payments Sub-resource)
  fastify.get('/:id/payments',  { preHandler: [authenticate, authorize('invoices:read')] }, listPaymentsHandler);
  fastify.post('/:id/payments', { preHandler: [authenticate, authorize('payments:*')]    }, recordPaymentHandler);

  // تسجيل عملية ارتجاع مالي (Refund) على دفعة معينة داخل الفاتورة
  fastify.post('/:id/payments/:paymentId/refund', { preHandler: [authenticate, authorize('payments:*')] }, refundPaymentHandler);
}

/**
 * موديول مسارات التقارير والملخصات الإحصائية للمالية
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function financeRoutes(fastify) {
  // جلب الملخص المالي الإحصائي (الكروت الأربعة، الرسم البياني، آخر الفواتير، والديون المستحقة)
  // GET /api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get('/summary', { preHandler: [authenticate, authorize('finance:*')] }, getFinanceSummaryHandler);
}

/**
 * موديول مسارات الديون المباشرة المرتبطة بالمرضى
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function patientDebtRoute(fastify) {
  // جلب إجمالي الديون المعلقة على مريض محدد
  // GET /api/v1/patients/:patientId/debt
  fastify.get('/:patientId/debt', { preHandler: [authenticate, authorize('invoices:read')] }, getPatientDebtHandler);

  // جلب قائمة الفواتير الخاصة بمريض محدد مع الفلترة والصفحات
  // GET /api/v1/patients/:patientId/invoices
  fastify.get('/:patientId/invoices', { preHandler: [authenticate, authorize('invoices:read')] }, listPatientInvoicesHandler);
}