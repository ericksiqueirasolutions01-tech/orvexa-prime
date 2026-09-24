import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const models = await prisma.aiModel.findMany({
    select: { id: true, name: true, modelIdentifier: true, provider: { select: { slug: true } }, category: true, isActive: true }
  });
  console.log(JSON.stringify(models, null, 2));
}

main().finally(() => prisma.$disconnect());

