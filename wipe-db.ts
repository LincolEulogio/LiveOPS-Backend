import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- MEGA RESET INITIATED ---');
  console.log(
    'WARNING: This will delete ALL data including productions, users, and roles.',
  );

  // Order matters due to foreign keys
  try {
    console.log('Wiping Social and Graphics data...');
    await prisma.socialMessage.deleteMany();
    await prisma.socialPoll.deleteMany();
    await prisma.overlayTemplate.deleteMany();
    await prisma.mediaAsset.deleteMany();

    console.log('Wiping Operational data (Hardware, Vmix, OBS)...');
    await prisma.hardwareMapping.deleteMany();
    await prisma.vmixConnection.deleteMany();
    await prisma.obsConnection.deleteMany();
    await prisma.telemetryLog.deleteMany();

    console.log('Wiping Production structures (Scripts, Timelines)...');
    await prisma.timelineBlock.deleteMany();
    await prisma.productionScript.deleteMany();
    await prisma.productionLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.commandResponse.deleteMany();
    await prisma.command.deleteMany();
    await prisma.commandTemplate.deleteMany();

    console.log('Wiping Teams and Productions...');
    await prisma.productionUser.deleteMany();
    await prisma.production.deleteMany();

    console.log('Wiping Users and Sessions...');
    await prisma.session.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.videoCall.deleteMany();
    await prisma.user.deleteMany();

    console.log('Wiping RBAC and Tenants...');
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.tenant.deleteMany();

    console.log('\n✅ SYSTEM PURGED SUCCESSFULLY.');
    console.log('The next registration will be the new SUPERADMIN.');
  } catch (error) {
    console.error('❌ ERROR DURING WIPE:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
