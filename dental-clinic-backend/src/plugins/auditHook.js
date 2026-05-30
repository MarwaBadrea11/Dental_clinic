/**
 * auditHook Fastify Plugin
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatically writes an audit log entry for every mutating HTTP request
 * (POST / PATCH / PUT / DELETE) that completes with a 2xx status code.
 *
 * The plugin infers:
 *   - action:     from HTTP method  (POST→CREATE, PATCH/PUT→UPDATE, DELETE→DELETE)
 *   - resource:   first path segment after /api/v1/  (e.g. "patients")
 *   - resourceId: second path segment if it looks like a UUID
 *   - userId:     from request.user.sub (set by authenticate middleware)
 *
 * Controllers that need richer old/new values should call AuditService.log()
 * directly — this hook only captures the lightweight "who did what" layer.
 *
 * Registration in app.js:
 *   import auditHookPlugin from './plugins/auditHook.js';
 *   await fastify.register(auditHookPlugin);
 */

import fp from 'fastify-plugin';
import { AuditService } from '../services/audit.service.js';

const METHOD_ACTION = {
  POST:   'CREATE',
  PATCH:  'UPDATE',
  PUT:    'UPDATE',
  DELETE: 'DELETE',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract resource name and optional record id from a URL path */
function parseRoute(url) {
  // Strip query string, strip leading /api/v1/
  const clean = url.split('?')[0].replace(/^\/api\/v1\//, '');
  const parts = clean.split('/').filter(Boolean);

  const resource   = parts[0] ?? 'unknown';
  // Walk segments to find the first UUID-shaped segment
  const resourceId = parts.find((p) => UUID_RE.test(p)) ?? null;

  return { resource, resourceId };
}

async function auditHookPlugin(fastify) {
  fastify.addHook('onResponse', async (request, reply) => {
    const action = METHOD_ACTION[request.method];
    if (!action) return;                          // skip GET / HEAD / OPTIONS
    if (reply.statusCode < 200 || reply.statusCode >= 300) return; // skip errors

    const { resource, resourceId } = parseRoute(request.url);
    const userId = request.user?.sub ?? null;

    const audit = new AuditService(request.server.db);
    await audit.log({
      action,
      resource,
      resourceId,
      userId,
      ip:        request.ip,
      userAgent: request.headers['user-agent'],
    });
  });
}

export default fp(auditHookPlugin, { name: 'auditHook', dependencies: ['knex'] });
