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
    const users = await prisma.user.findMany({
        include: {
            globalRole: {
                include: {
                    permissions: { include: { permission: true } }
                }
            },
            productions: {
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: { permission: true }
                            }
                        }
                    }
                }
            }
        }
    });

    console.dir(users, { depth: null });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
