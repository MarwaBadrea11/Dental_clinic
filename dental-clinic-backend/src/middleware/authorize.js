import { errorResponse } from '../utils/response.js';

export const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  DENTIST: [
    'dashboard:read',
    'patients:read',
    'appointments:read',
    'appointments:update',
    'treatments:*',
    'odontogram:*',
    'invoices:read',
  ],
  RECEPTIONIST: [
    'dashboard:read',
    'patients:*',
    'appointments:*',
    'invoices:*',
    'payments:*',
    'inventory:read',
    'odontogram:read',
    'odontogram:create',
    'staff:read',
  ],
  ACCOUNTANT: ['invoices:*', 'payments:*', 'finance:*', 'reports:financial', 'staff:read'],
  STOREKEEPER: ['inventory:*', 'reports:inventory'],
  HR: ['staff:*', 'reports:payroll'],
};

export function hasPermission(userPermissions, required) {
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(required)) return true;
  const [resource] = required.split(':');
  if (resource && userPermissions.includes(`${resource}:*`)) return true;
  return false;
}

export function authorize(permission) {
  return async function (request, reply) {
    const user = request.user;

    if (!user) {
      void reply.status(401).send(errorResponse('Unauthorized'));
      return;
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] ?? [];
    const allPermissions = [...rolePermissions, ...(user.permissions ?? [])];

    if (!hasPermission(allPermissions, permission)) {
      void reply.status(403).send(errorResponse('Forbidden'));
    }
  };
}

export function authorizeOwner(permission, getResourceOwnerId) {
  return async function (request, reply) {
    const user = request.user;

    if (!user) {
      void reply.status(401).send(errorResponse('Unauthorized'));
      return;
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] ?? [];
    const allPermissions = [...rolePermissions, ...(user.permissions ?? [])];

    if (!hasPermission(allPermissions, permission)) {
      void reply.status(403).send(errorResponse('Forbidden'));
      return;
    }

    if (user.role === 'ADMIN' || user.role === 'DENTIST' || user.role === 'RECEPTIONIST') {
      return;
    }

    const ownerId = await getResourceOwnerId(request);
    if (ownerId !== user.sub) {
      void reply.status(403).send(errorResponse('Forbidden'));
    }
  };
}
