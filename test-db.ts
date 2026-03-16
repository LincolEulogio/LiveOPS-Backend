
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDB() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    try {
        console.log('--- Verificando Consistencia de Usuarios ---');
        const users = await prisma.user.findMany({
            include: {
                globalRole: true,
            }
        });

        for (const user of users) {
            console.log(`Usuario: ${user.email}`);
            console.log(` - ID: ${user.id}`);
            console.log(` - tenantId: ${user.tenantId || 'NULL (Posible causa de 500)'}`);
            console.log(` - globalRole: ${user.globalRole?.name || 'NULL (Posible causa de 500)'}`);

            if (!user.tenantId || !user.globalRole) {
                console.warn('⚠️ Inconsistencia detectada en este usuario');
            }
        }

        console.log('\n--- Verificando Producciones ---');
        const productions = await prisma.production.findMany();
        console.log(`Total producciones: ${productions.length}`);
        for (const prod of productions) {
            console.log(`Producción: ${prod.name} (Tenant: ${prod.tenantId})`);
        }

    } catch (error) {
        console.error('Error durante la prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDB();
