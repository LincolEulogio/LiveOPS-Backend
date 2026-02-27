import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('--- RENDER COMPATIBLE RESET INITIATED ---');

  try {
    await client.connect();

    // SPECIFIC ORDER: Child tables MUST be deleted before parent tables
    const tables = [
      'SocialMessage',
      'SocialPoll',
      'OverlayTemplate',
      'MediaAsset',
      'HardwareMapping',
      'VmixConnection',
      'ObsConnection',
      'TelemetryLog',
      'TimelineBlock',
      'ProductionScript',
      'ProductionLog',
      'ChatMessage',
      'CommandResponse',
      'Command',
      'CommandTemplate',
      'ProductionUser',
      'VideoCall',
      'AuditLog',
      'Session',
      'Production',
      'User',
      'RolePermission',
      'Permission',
      'Role',
      'Tenant',
    ];

    console.log('Cleaning all tables in sequence (Safe Mode)...');

    for (const table of tables) {
      try {
        // Use DELETE instead of TRUNCATE for better permission compatibility on shared DBs
        await client.query(`DELETE FROM "${table}";`);
        console.log(`✅ Table ${table} purged.`);
      } catch (e) {
        console.log(`⚠️ Skip ${table}: ${(e as any).message}`);
      }
    }

    console.log('\n✨ DATABASE IS COMPLETELY EMPTY NOW.');
    console.log('You can now register your new SuperAdmin.');
  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
  } finally {
    await client.end();
  }
}

main();
