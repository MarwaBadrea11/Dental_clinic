import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve .env relative to the project root (two levels up from src/db/)
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../.env') });

/** @type {Record<string, import('knex').Knex.Config>} */
const config = {
  development: {
    client: 'pg',
    connection: process.env['DATABASE_URL'],
    migrations: {
      directory: './migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
    pool: { min: 2, max: 10 },
  },

  test: {
    client: 'pg',
    connection: process.env['DATABASE_URL'],
    migrations: {
      directory: './migrations',
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
      directory: './migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
    pool: { min: 2, max: 20 },
  },
};

export default config;
