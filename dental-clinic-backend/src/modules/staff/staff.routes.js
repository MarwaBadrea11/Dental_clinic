import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listStaffHandler,
  getStaffMemberHandler,
  createStaffMemberHandler,
  updateStaffMemberHandler,
  deleteStaffMemberHandler,
  listAttendanceHandler,
  logAttendanceHandler,
  updateAttendanceHandler,
  deleteAttendanceHandler,
  listSalaryRecordsHandler,
  createSalaryRecordHandler,
  updateSalaryRecordHandler,
  deleteSalaryRecordHandler,
  getMonthlySummaryHandler,
  getDashboardStatsHandler,
} from './staff.controller.js';

export async function staffRoutes(fastify) {
  const readAuth  = [authenticate, authorize('staff:read')];
  const writeAuth = [authenticate, authorize('staff:*')];

  // ── Staff CRUD ──────────────────────────────────────────────────────────────
  fastify.get('/',    { preHandler: readAuth  }, listStaffHandler);
  fastify.get('/:id', { preHandler: readAuth  }, getStaffMemberHandler);
  fastify.post('/',   { preHandler: writeAuth }, createStaffMemberHandler);
  fastify.put('/:id', { preHandler: writeAuth }, updateStaffMemberHandler);
  fastify.delete('/:id', { preHandler: writeAuth }, deleteStaffMemberHandler);

  // ── Attendance ──────────────────────────────────────────────────────────────
  fastify.get('/attendance',     { preHandler: readAuth  }, listAttendanceHandler);
  fastify.post('/attendance',    { preHandler: writeAuth }, logAttendanceHandler);
  fastify.put('/attendance/:id', { preHandler: writeAuth }, updateAttendanceHandler);
  fastify.delete('/attendance/:id', { preHandler: writeAuth }, deleteAttendanceHandler);

  // ── Salary Records ──────────────────────────────────────────────────────────
  fastify.get('/salary',                        { preHandler: readAuth  }, listSalaryRecordsHandler);
  fastify.post('/salary',                       { preHandler: writeAuth }, createSalaryRecordHandler);
  fastify.put('/salary/:id',                    { preHandler: writeAuth }, updateSalaryRecordHandler);
  fastify.delete('/salary/:id',                 { preHandler: writeAuth }, deleteSalaryRecordHandler);
  fastify.get('/salary/summary/:year/:month',   { preHandler: readAuth  }, getMonthlySummaryHandler);

  // ── Dashboard Stats ──────────────────────────────────────────────────────────
  fastify.get('/dashboard-stats',               { preHandler: readAuth  }, getDashboardStatsHandler);
}
