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
    // Find the CAMAROGRAFO role
    const role = await prisma.role.findFirst({
        where: { name: { contains: 'CAMAROGRAFO', mode: 'insensitive' } }
    });

    if (!role) {
        console.log('CAMAROGRAFO role not found!');
        return;
    }

    console.log(`Found role: ${role.name} (${role.id})`);

    // Find streaming:control permission
    const streamingCtrl = await prisma.permission.findUnique({
        where: { action: 'streaming:control' }
    });
    const streamingView = await prisma.permission.findUnique({
        where: { action: 'streaming:view' }
    });

    if (!streamingCtrl || !streamingView) {
        console.log('streaming permissions not found in DB!');
        return;
    }

    // Add permissions to CAMAROGRAFO role
    for (const perm of [streamingCtrl, streamingView]) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: { roleId: role.id, permissionId: perm.id }
            },
            create: { roleId: role.id, permissionId: perm.id },
            update: {}
        });
        console.log(`✅ Added ${perm.action} to ${role.name}`);
    }

    console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
