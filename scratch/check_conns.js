
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const conns = await prisma.restreamConnection.findMany({
    select: { productionId: true, createdAt: true }
  });
  console.log('Restream Connections:', JSON.stringify(conns, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
