import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { RegisterSchema, LoginSchema, RefreshSchema, LogoutSchema, UpdateProfileSchema, ChangePasswordSchema } from './auth.schema.js';
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

export async function getMeHandler(request, reply) {
  const user = await getService(request).getProfile(request.user.sub);
  return reply.status(200).send(successResponse(user));
}

export async function updateMeHandler(request, reply) {
  const parsed = UpdateProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }
  const user = await getService(request).updateProfile(request.user.sub, parsed.data);
  return reply.status(200).send(successResponse(user));
}

export async function uploadAvatarHandler(request, reply) {
  const parts = request.parts();
  let filePart = null;

  for await (const part of parts) {
    if (part.type === 'file') {
      filePart = part;
      break;
    }
  }

  if (!filePart) {
    return reply.status(400).send(errorResponse('No file provided'));
  }

  const user = await getService(request).uploadAvatar(request.user.sub, filePart);
  return reply.status(200).send(successResponse(user));
}

export async function removeAvatarHandler(request, reply) {
  const user = await getService(request).removeAvatar(request.user.sub);
  return reply.status(200).send(successResponse(user));
}

export async function changePasswordHandler(request, reply) {
  const parsed = ChangePasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }

  const result = await getService(request).changePassword(
    request.user.sub,
    parsed.data.currentPassword,
    parsed.data.newPassword,
    request.user,
    getMeta(request),
  );
  return reply.status(200).send(successResponse(result));
}
