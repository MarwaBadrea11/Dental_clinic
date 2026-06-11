import { errorResponse } from '../utils/response.js';

export const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  DENTIST: [
    'dashboard:read',
    'patients:read',
    'patients:update',
    'appointments:read',
    'appointments:update',
    'treatments:*',
    'odontogram:*',
    'invoices:read',
    'staff:read',
  ],
  RECEPTIONIST: [
    'dashboard:read',
    'patients:*',
    'appointments:*',
    'treatments:*',
    'invoices:*',
    'payments:*',
    'inventory:read',
    'odontogram:read',
    'odontogram:create',
    'odontogram:update',
    'staff:*',
  ],
  ACCOUNTANT: ['invoices:*', 'payments:*', 'finance:*', 'reports:financial', 'staff:read'],
  STOREKEEPER: ['inventory:*', 'reports:inventory'],
  HR: ['staff:*', 'reports:payroll'],
  // PATIENT: self-service only — can read/book own appointments, read invoices, update own profile
  PATIENT: [
    'appointments:read',
    'appointments:create',
    'invoices:read',
    'patients:update_self',
  ],
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
      return reply.status(401).send(errorResponse('Unauthorized'));
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] ?? [];
    const allPermissions = [...rolePermissions, ...(user.permissions ?? [])];

    if (!hasPermission(allPermissions, permission)) {
      return reply.status(403).send(errorResponse('Forbidden'));
    }
  };
}

export function authorizeOwner(permission, getResourceOwnerId) {
  return async function (request, reply) {
    const user = request.user;

    if (!user) {
      return reply.status(401).send(errorResponse('Unauthorized'));
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] ?? [];
    const allPermissions = [...rolePermissions, ...(user.permissions ?? [])];

    if (!hasPermission(allPermissions, permission)) {
      return reply.status(403).send(errorResponse('Forbidden'));
    }

    if (user.role === 'ADMIN' || user.role === 'DENTIST' || user.role === 'RECEPTIONIST') {
      return;
    }

    const ownerId = await getResourceOwnerId(request);
    if (ownerId !== user.sub) {
      return reply.status(403).send(errorResponse('Forbidden'));
    }
  };
}
