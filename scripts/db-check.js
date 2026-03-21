const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_mqEil08nyGMt@ep-misty-union-acjjageo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query('SELECT email, name FROM "User" LIMIT 5');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
