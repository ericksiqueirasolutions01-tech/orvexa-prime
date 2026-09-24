import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.aiProviderAccount.findMany();
  const keys = await prisma.apiKey.findMany();
  const activeProviders = await prisma.aiProvider.findMany({ where: { isActive: true } });
  
  console.log(`Current DB State:`);
  console.log(`- ai_provider_accounts: ${accounts.length}`);
  console.log(`- api_keys: ${keys.length}`);
  console.log(`- active providers: ${activeProviders.length}`);

  for (const acc of accounts) {
    console.log(`  Account: [${acc.id}] name="${acc.name}" provider="${acc.provider}" status="${acc.status}"`);
  }
  for (const k of keys) {
    console.log(`  ApiKey: [${k.id}] name="${k.name}" providerId="${k.providerId}" status="${k.status}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

