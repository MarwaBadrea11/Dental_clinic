import { ProceduresRepository } from './procedures.repository.js';
import { successResponse } from '../../utils/response.js';

function getRepository(request) {
  return new ProceduresRepository(request.db || request.server.db);
}

export async function listProceduresHandler(request, reply) {
  const { category, is_active, search, page = 1, limit = 50 } = request.query;
  
  // تحويل النصوص القادمة كـ Query parameters إلى أنواعها الصحيحة
  const filters = {
    category,
    is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
    search,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const result = await getRepository(request).list(filters);
  return reply.send(successResponse(result.data, { total: result.total, page: filters.page, limit: filters.limit }));
}

export async function getProcedureHandler(request, reply) {
  const { id } = request.params;
  const procedure = await getRepository(request).findById(id);
  
  if (!procedure) {
    return reply.status(404).send({ success: false, message: 'Procedure not found' });
  }
  
  return reply.send(successResponse(procedure));
}

export async function createProcedureHandler(request, reply) {
  // البيانات مصفاة وجاهزة تماماً بفضل الـ Schema المربوطة بالـ Route
  const procedure = await getRepository(request).create(request.body);
  return reply.status(21).send(successResponse(procedure, { message: 'Procedure created successfully' }));
}

export async function updateProcedureHandler(request, reply) {
  const { id } = request.params;
  const procedure = await getRepository(request).update(id, request.body);
  
  if (!procedure) {
    return reply.status(404).send({ success: false, message: 'Procedure not found or could not be updated' });
  }
  
  return reply.send(successResponse(procedure, { message: 'Procedure updated successfully' }));
}

export async function deleteProcedureHandler(request, reply) {
  const { id } = request.params;
  const deleted = await getRepository(request).delete(id);
  
  if (!deleted) {
    return reply.status(404).send({ success: false, message: 'Procedure not found' });
  }
  
  return reply.send(successResponse(null, { message: 'Procedure deleted successfully' }));
}