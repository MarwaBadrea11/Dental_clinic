import('./src/db/db.js').then(async m => {
  const db = m.default;
  try {
    const lic = await db('license_info').select('status', 'activated_at').first();
    console.log('LICENSE STATUS:', JSON.stringify(lic));
  } catch(e) {
    console.log('LICENSE TABLE ERROR:', e.message);
  }
  try {
    const tables = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('clinic_working_hours','license_info')");
    console.log('TABLES EXIST:', JSON.stringify(tables.rows));
  } catch(e) {
    console.log('TABLE CHECK ERROR:', e.message);
  }
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
