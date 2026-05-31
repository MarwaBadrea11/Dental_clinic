import knex from 'knex';
import config from './knexfile.js';

const db = knex(config.development);

async function checkDatabase() {
  try {
    console.log('Checking staff table...');
    const staffRows = await db('staff').select('*').limit(1);
    console.log('Staff table exists, rows:', staffRows.length);
    
    console.log('Checking attendance_logs table...');
    const attendanceRows = await db('attendance_logs').select('*').limit(1);
    console.log('Attendance logs table exists, rows:', attendanceRows.length);
    
    console.log('Checking salary_records table...');
    const salaryRows = await db('salary_records').select('*').limit(1);
    console.log('Salary records table exists, rows:', salaryRows.length);
    
    console.log('Database check successful!');
  } catch (err) {
    console.error('Database error:', err.message);
    console.error('Error details:', err);
  } finally {
    await db.destroy();
  }
}

checkDatabase();
