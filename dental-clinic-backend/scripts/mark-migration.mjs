import { PrismaClient } from '../generated/prisma/client.ts';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

const sql = readFileSync('prisma/migrations/20250101000000_init/migration.sql', 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id)
  )
`);

await prisma.$executeRawUnsafe(`
  INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
  VALUES (gen_random_uuid()::text, $1, now(), '20250101000000_init', 1)
  ON CONFLICT DO NOTHING
`, checksum);

console.log('Migration record inserted successfully');
await prisma.$disconnect();
