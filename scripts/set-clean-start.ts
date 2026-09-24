import { PrismaClient } from "@prisma/client";
import { appCache } from "../src/lib/cache";

const prisma = new PrismaClient();

async function main() {
  console.log("Preparando banco para início 100% limpo (0 APIs)...");
  await prisma.aiProviderAccount.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.systemSetting.deleteMany({
    where: { key: { in: ["openai_base_url", "openai_custom_url"] } },
  });
  await prisma.aiProvider.updateMany({
    data: { isActive: false },
  });
  appCache.clear();
  console.log("Banco limpo com sucesso! 0 APIs cadastradas.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

