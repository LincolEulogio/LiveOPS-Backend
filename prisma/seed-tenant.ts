import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Default Tenant...');

    // 1. Create or Find the Default Tenant
    let tenant = await prisma.tenant.findFirst({
        where: { name: 'System Default' }
    });

    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: { name: 'System Default' }
        });
        console.log(`Created new tenant: ${tenant.id}`);
    } else {
        console.log(`Found existing tenant: ${tenant.id}`);
    }

    // 2. Assign all existing users to this tenant (if they don't have one)
    const usersUpdated = await prisma.user.updateMany({
        where: { tenantId: null },
        data: { tenantId: tenant.id }
    });
    console.log(`Updated ${usersUpdated.count} users.`);

    // 3. Assign all existing productions to this tenant
    const productionsUpdated = await prisma.production.updateMany({
        where: { tenantId: null },
        data: { tenantId: tenant.id }
    });
    console.log(`Updated ${productionsUpdated.count} productions.`);

    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
