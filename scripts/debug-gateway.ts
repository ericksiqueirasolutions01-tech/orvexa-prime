// scripts/debug-gateway.ts
import { PrismaClient } from "@prisma/client";
import { getHealthyApiKeys } from "../src/lib/ai-gateway";

const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.aiProvider.findUnique({
    where: { slug: "openai" },
    include: { apiKeys: true },
  });
  console.log("Provider openai in DB:", {
    id: provider?.id,
    slug: provider?.slug,
    name: provider?.name,
    baseUrl: provider?.baseUrl,
    isActive: provider?.isActive,
    keysCount: provider?.apiKeys?.length,
  });

  if (provider?.apiKeys) {
    for (const k of provider.apiKeys) {
      console.log("  ApiKey:", {
        id: k.id,
        name: k.name,
        status: k.status,
        customBaseUrl: k.customBaseUrl,
        errorCount: k.errorCount,
        quarantinedUntil: k.quarantinedUntil,
      });
    }
  }

  const healthyKeys = await getHealthyApiKeys("openai", "TEXTO");
  console.log("Healthy keys for openai:", healthyKeys.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
