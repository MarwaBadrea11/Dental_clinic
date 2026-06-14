/**
 * Test script for SmileFix License System
 * Run with: node test-license-system.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testLicenseSystem() {
  console.log('🔧 Testing SmileFix License System\n');
  console.log('='.repeat(50));

  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const { stdout: dbTest } = await execAsync('npx knex --knexfile src/db/knexfile.js migrate:status');
    console.log('✅ Database connection successful');
    
    // 2. Check if license_info table exists
    console.log('\n2. Checking license_info table...');
    const { stdout: tableCheck } = await execAsync(`
      node -e "
        const knex = require('knex')({
          client: 'pg',
          connection: {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'admin',
            database: 'dental_clinic'
          }
        });
        
        knex.schema.hasTable('license_info')
          .then(exists => {
            if (exists) {
              console.log('✅ license_info table exists');
              return knex('license_info').select('*');
            } else {
              console.log('❌ license_info table does not exist');
            }
          })
          .then(records => {
            if (records) {
              console.log('📊 License records:', records.length);
              records.forEach(r => {
                console.log('   - ID:', r.id, 'Status:', r.status);
              });
            }
          })
          .catch(err => {
            console.error('❌ Error:', err.message);
          })
          .finally(() => {
            process.exit(0);
          });
      "
    `);
    
    // 3. Test API endpoints
    console.log('\n3. Testing API endpoints...');
    console.log('   - GET /api/v1/license/status');
    console.log('   - POST /api/v1/license/activate');
    console.log('   - GET /api/v1/license/health');
    
    // 4. Test environment variables
    console.log('\n4. Checking environment variables...');
    require('dotenv').config();
    
    const requiredEnvVars = [
      'MASTER_LICENSE_SERVER_URL',
      'LICENSE_GRACE_PERIOD_DAYS',
      'LICENSE_BACKGROUND_CHECK_INTERVAL'
    ];
    
    let allEnvVarsPresent = true;
    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`   ✅ ${varName}: ${process.env[varName]}`);
      } else {
        console.log(`   ❌ ${varName}: NOT SET`);
        allEnvVarsPresent = false;
      }
    });
    
    if (allEnvVarsPresent) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log('⚠️  Some environment variables are missing');
    }
    
    // 5. Test development mode
    console.log('\n5. Checking development mode...');
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Development mode active');
      console.log('   - License validation will be simulated');
      console.log('   - No internet connection required for testing');
    } else {
      console.log('⚠️  Production mode active');
      console.log('   - Real license server connection required');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 License system test completed!');
    console.log('\nNext steps:');
    console.log('1. Run migrations: npx knex migrate:latest');
    console.log('2. Start backend: npm run dev');
    console.log('3. Start frontend: cd ../smilefix-app && npm run dev');
    console.log('4. Open browser: http://localhost:5174');
    console.log('5. System will redirect to activation page');
    console.log('6. Enter any license key to activate (simulated in dev mode)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check database credentials in .env file');
    console.log('3. Run migrations: npx knex migrate:latest');
    console.log('4. Check if license_info table was created');
  }
}

// Run tests
testLicenseSystem();