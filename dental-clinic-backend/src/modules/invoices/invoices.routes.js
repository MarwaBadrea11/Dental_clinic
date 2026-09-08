import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { attachClinicContext } from '../../middleware/clinicContext.js';
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
  // TX-06: All routes use clinicContext for isolation
  const readPermissions  = [authenticate, attachClinicContext, authorize('invoices:read')];
  const writePermissions = [authenticate, attachClinicContext, authorize('invoices:*')];
  const paymentsRead      = [authenticate, attachClinicContext, authorize('invoices:read')];
  const paymentsWrite     = [authenticate, attachClinicContext, authorize('payments:*')];

  // جلب قائمة الفواتير (يدعم البحث النصي والفلترة بالحالة والتواريخ)
  fastify.get('/',      { preHandler: readPermissions }, listInvoicesHandler);

  // جلب تفاصيل فاتورة محددة مع مدفوعاتها ومرتجعاتها
  fastify.get('/:id',   { preHandler: readPermissions }, getInvoiceHandler);

  // إنشاء فاتورة جديدة (يدعم إضافة الملاحظات notes وحقول العناصر يدويًا)
  fastify.post('/',     { preHandler: writePermissions }, createInvoiceHandler);

  // تحديث بيانات فاتورة (مثل تغيير حالتها إلى ISSUED أو تعديل العناصر قبل الإغلاق)
  fastify.patch('/:id', { preHandler: writePermissions }, updateInvoiceHandler);

  // إدارات المدفوعات التابعة للفاتورة (Payments Sub-resource)
  fastify.get('/:id/payments',  { preHandler: paymentsRead  }, listPaymentsHandler);
  fastify.post('/:id/payments', { preHandler: paymentsWrite }, recordPaymentHandler);

  // تسجيل عملية ارتجاع مالي (Refund) على دفعة معينة داخل الفاتورة
  fastify.post('/:id/payments/:paymentId/refund', { preHandler: paymentsWrite }, refundPaymentHandler);
}

/**
 * موديول مسارات التقارير والملخصات الإحصائية للمالية
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function financeRoutes(fastify) {
  // جلب الملخص المالي الإحصائي (الكروت الأربعة، الرسم البياني، آخر الفواتير، والديون المستحقة)
  // GET /api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get('/summary', { preHandler: [authenticate, attachClinicContext, authorize('finance:read')] }, getFinanceSummaryHandler);
}

/**
 * موديول مسارات الديون المباشرة المرتبطة بالمرضى
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function patientDebtRoute(fastify) {
  // جلب إجمالي الديون المعلقة على مريض محدد
  // GET /api/v1/patients/:patientId/debt
  fastify.get('/:patientId/debt', { preHandler: [authenticate, attachClinicContext, authorize('invoices:read')] }, getPatientDebtHandler);

  // جلب قائمة الفواتير الخاصة بمريض محدد مع الفلترة والصفحات
  // GET /api/v1/patients/:patientId/invoices
  fastify.get('/:patientId/invoices', { preHandler: [authenticate, attachClinicContext, authorize('invoices:read')] }, listPatientInvoicesHandler);
}