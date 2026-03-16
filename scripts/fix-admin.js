const { Client } = require('pg');
const bcrypt = require('bcrypt');

const connectionString =
  'postgresql://neondb_owner:npg_mqEil08nyGMt@ep-misty-union-acjjageo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkAndFixAdmin() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('--- Database Check ---');

    // 1. Verify Role SUPERADMIN
    const roleRes = await client.query(
      'SELECT id FROM "Role" WHERE name = \'SUPERADMIN\'',
    );
    let superAdminRoleId;
    if (roleRes.rows.length === 0) {
      console.log('Role SUPERADMIN not found. Creating...');
      const insertRole = await client.query(
        'INSERT INTO "Role" (id, name, description, "updatedAt") VALUES (gen_random_uuid(), \'SUPERADMIN\', \'System Administrator\', NOW()) RETURNING id',
      );
      superAdminRoleId = insertRole.rows[0].id;
    } else {
      superAdminRoleId = roleRes.rows[0].id;
      console.log(`Role SUPERADMIN exists with ID: ${superAdminRoleId}`);
    }

    // 2. Check Permissions (Quick check if Table exists and has data)
    const permRes = await client.query('SELECT count(*) FROM "Permission"');
    console.log(`Total Permissions: ${permRes.rows[0].count}`);

    const rolePermRes = await client.query(
      'SELECT count(*) FROM "RolePermission" WHERE "roleId" = $1',
      [superAdminRoleId],
    );
    console.log(`RolePermissions for SUPERADMIN: ${rolePermRes.rows[0].count}`);

    if (parseInt(permRes.rows[0].count) === 0) {
      console.log('WARNING: No permissions found in Permission table.');
    }

    // 3. Verify User admin@liveops.com
    const userRes = await client.query(
      'SELECT id, password, "globalRoleId" FROM "User" WHERE email = \'admin@liveops.com\'',
    );
    const hashedPassword = await bcrypt.hash('admin', 10);

    if (userRes.rows.length === 0) {
      console.log('User admin@liveops.com not found. Inserting...');
      await client.query(
        'INSERT INTO "User" (id, email, password, name, "globalRoleId", "updatedAt") VALUES (gen_random_uuid(), \'admin@liveops.com\', $1, \'Administrator\', $2, NOW())',
        [hashedPassword, superAdminRoleId],
      );
      console.log('User inserted successfully.');
    } else {
      const user = userRes.rows[0];
      console.log('User admin@liveops.com exists.');

      // Check if globalRoleId is set properly
      if (user.globalRoleId !== superAdminRoleId) {
        console.log('Updating globalRoleId to SUPERADMIN...');
        await client.query(
          'UPDATE "User" SET "globalRoleId" = $1 WHERE id = $2',
          [superAdminRoleId, user.id],
        );
      }

      // Always reset password for verification
      console.log('Resetting password to "admin"...');
      await client.query('UPDATE "User" SET password = $1 WHERE id = $2', [
        hashedPassword,
        user.id,
      ]);
      console.log('Password reset successfully.');
    }

    console.log('--- Done ---');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkAndFixAdmin();
