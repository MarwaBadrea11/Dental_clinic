import 'dotenv/config';

/** @type {import('knex').Knex.Config} */
const config = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin',
      database: process.env.DB_NAME || 'dental_clinic',
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'js',
      loadExtensions: ['.js'],
      stub: './migration.stub',
    },
    pool: { min: 2, max: 10 },
  },
};

export default config;
