import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Absolute path to migrations so knex CLI works from any cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, 'migrations');

/** @type {Record<string, import('knex').Knex.Config>} */
const config = {
  development: {
    client: 'pg',
    connection: process.env['DATABASE_URL'],
    migrations: {
      directory: migrationsDir,
      extension: 'js',
      loadExtensions: ['.js'],
    },
    pool: { min: 2, max: 10 },
  },

  test: {
    client: 'pg',
    connection: process.env['DATABASE_URL'],
    migrations: {
      directory: migrationsDir,
      extension: 'js',
      loadExtensions: ['.js'],
    },
    pool: { min: 1, max: 5 },
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env['DATABASE_URL'],
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: migrationsDir,
      extension: 'js',
      loadExtensions: ['.js'],
    },
    pool: { min: 2, max: 20 },
  },
};

export default config;
