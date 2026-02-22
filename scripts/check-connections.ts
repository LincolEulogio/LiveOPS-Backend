import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const obs = await prisma.obsConnection.findMany();
    const vmix = await prisma.vmixConnection.findMany();
    const productions = await prisma.production.findMany({
        select: { id: true, name: true }
    });

    console.log('--- Productions ---');
    console.log(JSON.stringify(productions, null, 2));
    console.log('\n--- OBS Connections ---');
    console.log(JSON.stringify(obs, null, 2));
    console.log('\n--- vMix Connections ---');
    console.log(JSON.stringify(vmix, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
