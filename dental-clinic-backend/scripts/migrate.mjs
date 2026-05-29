/**
 * Migration runner — loads .env from the project root then runs knex migrations.
 * Usage:
 *   node scripts/migrate.mjs           → migrate:latest
 *   node scripts/migrate.mjs rollback  → migrate:rollback
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Parse .env manually so we bypass dotenvx's "no-override" behaviour
const envPath = resolve(projectRoot, '.env');
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  // Replace literal \n sequences with real newlines (for PEM keys)
  val = val.replace(/\\n/g, '\n');
  process.env[key] = val;
}

const Knex = (await import('knex')).default;
const { default: knexConfig } = await import('../src/db/knexfile.js');

const env = process.env.NODE_ENV || 'development';
const config = knexConfig[env] ?? knexConfig['development'];
const knex = Knex(config);

const command = process.argv[2] ?? 'latest';

try {
  if (command === 'rollback') {
    const [batch, log] = await knex.migrate.rollback();
    console.log(`Rolled back batch ${batch}:`, log.length ? log : '(nothing to rollback)');
  } else {
    const [batch, log] = await knex.migrate.latest();
    if (log.length === 0) {
      console.log('Already up to date.');
    } else {
      console.log(`Batch ${batch} run: ${log.length} migration(s)`);
      log.forEach((f) => console.log(' ✓', f));
    }
  }
} finally {
  await knex.destroy();
}
