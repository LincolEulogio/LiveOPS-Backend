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
    // Show all users with their production assignments
    const users = await prisma.user.findMany({
        include: {
            globalRole: true,
            productions: {
                include: {
                    production: { select: { id: true, name: true } },
                    role: {
                        include: {
                            permissions: { include: { permission: true } }
                        }
                    }
                }
            }
        }
    });

    for (const u of users) {
        console.log(`\n=== ${u.email} (${u.name || 'no name'}) ===`);
        console.log(`  Global Role: ${u.globalRole?.name || 'NONE'}`);
        for (const pu of u.productions) {
            console.log(`  Production: ${pu.production.name} → Role: ${pu.role.name}`);
            const perms = pu.role.permissions.map(p => p.permission.action);
            const hasStreamingControl = perms.includes('streaming:control');
            console.log(`  Permissions includes streaming:control: ${hasStreamingControl}`);
        }
    }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
