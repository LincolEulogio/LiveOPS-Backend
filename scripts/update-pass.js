const { Client } = require('pg');
const bcrypt = require('bcrypt');
const connectionString = 'postgresql://neondb_owner:npg_mqEil08nyGMt@ep-misty-union-acjjageo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString });
  const pass = 'admin';
  const hash = await bcrypt.hash(pass, 10);
  
  try {
    await client.connect();
    const res = await client.query('UPDATE "User" SET password = $1 WHERE email = $2', [hash, 'admin@liveops.com']);
    console.log(`Updated ${res.rowCount} users.`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
