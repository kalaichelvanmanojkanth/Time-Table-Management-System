const mongoose = require('mongoose');
const dns      = require('dns');

// Use Google DNS (8.8.8.8 + 8.8.4.4) — ISP DNS often fails to resolve
// MongoDB Atlas SRV records. This must be set BEFORE any network call.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  // ── Resolve URI ──────────────────────────────────────────────────────────────
  // Try SRV URI first; if DNS still fails, fall back to direct shard URI
  const srvUri    = process.env.MONGO_URI;
  const directUri = process.env.MONGO_URI_DIRECT;

  if (!srvUri && !directUri) {
    console.error('❌ Neither MONGO_URI nor MONGO_URI_DIRECT is set in .env');
    return;
  }

  const uris = [];
  if (srvUri)    uris.push({ label: 'SRV',    uri: srvUri });
  if (directUri) uris.push({ label: 'Direct', uri: directUri });

  const OPTS = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS:         15000,
    socketTimeoutMS:          45000,
  };

  for (const { label, uri } of uris) {
    const masked = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`\n🔄 Trying MongoDB ${label} connection…`);
    console.log(`   ${masked.slice(0, 80)}…`);

    try {
      const conn = await mongoose.connect(uri, OPTS);
      console.log('\n✅ MongoDB Connected!');
      console.log(`   Mode : ${label}`);
      console.log(`   Host : ${conn.connection.host}`);
      console.log(`   DB   : ${conn.connection.name}\n`);
      return; // ── success ──
    } catch (err) {
      const msg = err.message || '';
      // Only flag as DNS failure if we explicitly see DNS-related errors
      const isDNS  = msg.includes('ENOTFOUND') || msg.includes('querySrv') || msg.includes('getaddrinfo');
      // Auth failures — wrong credentials (not a network issue)
      const isAuth = msg.includes('Authentication failed') || msg.includes('bad auth') || (msg.includes('SCRAM') && msg.includes('auth'));
      // True IP whitelist errors — be specific, not just msg.includes('IP')
      const isIPBlock = msg.includes('whitelist') || msg.includes('not allowed to connect');

      console.error(`❌ ${label} connection failed: ${msg.split('\n')[0]}`);

      if (isAuth) {
        console.error('   → Wrong username or password — check credentials in .env');
        break; // auth failure won't be fixed by trying another URI
      }

      // Always try the next URI (direct) if SRV fails for any reason
      if (label === 'SRV' && directUri) {
        if (isDNS) console.warn('   → SRV DNS failed — trying direct shard connection next…');
        else if (isIPBlock) console.warn('   → IP may be blocked — trying direct shard connection next…');
        else console.warn('   → SRV failed — trying direct shard connection next…');
        continue;
      }

      if (isIPBlock) {
        console.error('   → IP not whitelisted — go to Atlas → Network Access → Allow 0.0.0.0/0');
      }

      console.error('   → Will continue with next URI option if available…');
    }
  }

  console.error('\n⚠  All MongoDB connection attempts failed.');
  console.error('   Server will continue — API routes will return 500 until DB is reachable.\n');
};

module.exports = connectDB;
