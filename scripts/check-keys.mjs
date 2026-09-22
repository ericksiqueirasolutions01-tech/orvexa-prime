import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const keys = await prisma.apiKey.findMany({ include: { provider: true } });
  console.log('Total keys:', keys.length);
  for (const k of keys) {
    console.log(JSON.stringify({
      id: k.id,
      name: k.name,
      provider: k.provider?.slug,
      status: k.status,
      errorCount: k.errorCount,
      customBaseUrl: k.customBaseUrl,
      keyHint: k.keyHint,
    }, null, 2));
  }
}

main().finally(() => prisma.$disconnect());

