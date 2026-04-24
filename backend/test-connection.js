/**
 * test-connection.js
 * Run: node test-connection.js
 * Tests your MongoDB URI and shows a clear pass/fail
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

console.log('\n🔍 MongoDB Connection Test');
console.log('══════════════════════════════════════════');

if (!uri) {
  console.error('❌ MONGO_URI is NOT set in .env');
  process.exit(1);
}

// Mask password for display
const masked = uri.replace(/:([^@]+)@/, ':****@');
console.log('   URI   :', masked);

// Extract hostname for DNS check
const hostMatch = uri.match(/@([^/?]+)/);
const host = hostMatch ? hostMatch[1] : 'unknown';
console.log('   Host  :', host);
console.log('   Format:', uri.startsWith('mongodb+srv://') ? '✅ mongodb+srv://' : '❌ WRONG — must be mongodb+srv://');
console.log('══════════════════════════════════════════\n');

console.log('🔄 Connecting...\n');

const start = Date.now();
mongoose
  .connect(uri, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 })
  .then(conn => {
    const ms = Date.now() - start;
    console.log('══════════════════════════════════════════');
    console.log('✅ CONNECTED SUCCESSFULLY in', ms + 'ms');
    console.log('   Host  :', conn.connection.host);
    console.log('   DB    :', conn.connection.name);
    console.log('══════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch(err => {
    const ms = Date.now() - start;
    console.log('══════════════════════════════════════════');
    console.error('❌ CONNECTION FAILED after', ms + 'ms');
    console.error('   Error:', err.message);
    console.log('══════════════════════════════════════════');

    if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
      console.log('\n📋 CAUSE: Cluster hostname not found in DNS');
      console.log('   → Your cluster host "' + host + '" does not exist');
      console.log('   → Go to Atlas → Cluster → Connect → Drivers → copy the correct URI\n');
    } else if (err.message.includes('IP') || err.message.includes('whitelist')) {
      console.log('\n📋 CAUSE: Your IP is not whitelisted on Atlas');
      console.log('   → Go to: https://cloud.mongodb.com → Network Access');
      console.log('   → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)\n');
    } else if (err.message.includes('auth') || err.message.includes('Authentication')) {
      console.log('\n📋 CAUSE: Wrong username or password in URI\n');
    } else if (err.message.includes('ETIMEDOUT')) {
      console.log('\n📋 CAUSE: Network timeout — check internet or Atlas cluster status\n');
    }

    process.exit(1);
  });
