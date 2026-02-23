"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding Default Tenant...');
    let tenant = await prisma.tenant.findFirst({
        where: { name: 'System Default' }
    });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: { name: 'System Default' }
        });
        console.log(`Created new tenant: ${tenant.id}`);
    }
    else {
        console.log(`Found existing tenant: ${tenant.id}`);
    }
    const usersUpdated = await prisma.user.updateMany({
        where: { tenantId: null },
        data: { tenantId: tenant.id }
    });
    console.log(`Updated ${usersUpdated.count} users.`);
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
//# sourceMappingURL=seed-tenant.js.map