const { Client } = require('pg');
const bcrypt = require('bcrypt');

const connectionString =
  'postgresql://neondb_owner:npg_mqEil08nyGMt@ep-misty-union-acjjageo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos.');

    // 1. Crear el Tenant 'System Default'
    const tenantName = 'System Default';
    const tenantRes = await client.query(
      'INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id',
      [tenantName],
    );
    const tenantId = tenantRes.rows[0].id;
    console.log(`Tenant creado: ${tenantName} (${tenantId})`);

    // 2. Crear el Role 'SUPERADMIN' si no existe
    const roleName = 'SUPERADMIN';
    let roleId;
    const roleCheck = await client.query(
      'SELECT id FROM "Role" WHERE name = $1',
      [roleName],
    );
    if (roleCheck.rows.length > 0) {
      roleId = roleCheck.rows[0].id;
      console.log(`Rol ${roleName} ya existe (${roleId})`);
    } else {
      const roleRes = await client.query(
        'INSERT INTO "Role" (id, name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id',
        [roleName],
      );
      roleId = roleRes.rows[0].id;
      console.log(`Rol ${roleName} creado (${roleId})`);
    }

    // 3. Crear el Usuario 'admin@liveops.com'
    const email = 'admin@liveops.com';
    const passwordRaw = 'admin';
    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    const userName = 'Super Admin';

    const userRes = await client.query(
      'INSERT INTO "User" (id, email, password, name, "tenantId", "globalRoleId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id',
      [email, hashedPassword, userName, tenantId, roleId],
    );
    console.log(`Usuario creado: ${email} (${userRes.rows[0].id})`);
  } catch (err) {
    console.error('Error durante la inicialización:', err);
  } finally {
    await client.end();
  }
}

main();
