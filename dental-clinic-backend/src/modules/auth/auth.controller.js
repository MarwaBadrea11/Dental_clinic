import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { RegisterSchema, LoginSchema, RefreshSchema, LogoutSchema } from './auth.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new AuthService(new AuthRepository(request.server.db));
}

function getMeta(request) {
  return { ipAddress: request.ip, userAgent: request.headers['user-agent'] };
}

export async function registerHandler(request, reply) {
  const parsed = RegisterSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }
  const user = await getService(request).register(parsed.data, getMeta(request));
  return reply.status(201).send(successResponse(user));
}

export async function loginHandler(request, reply) {
  const parsed = LoginSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }
  const result = await getService(request).login(parsed.data, getMeta(request));
  return reply.status(200).send(successResponse(result));
}

export async function refreshHandler(request, reply) {
  const parsed = RefreshSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }
  const result = await getService(request).refresh(parsed.data);
  return reply.status(200).send(successResponse(result));
}

export async function logoutHandler(request, reply) {
  const parsed = LogoutSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }
  await getService(request).logout(parsed.data, request.user, getMeta(request));
  return reply.status(200).send(successResponse({ message: 'Logged out successfully' }));
}
