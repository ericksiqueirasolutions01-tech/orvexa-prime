import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  const providers = await prisma.aiProvider.findMany();
  const keys = await prisma.apiKey.findMany({ select: { id: true, name: true, keyHint: true, providerId: true } });
  const accounts = await prisma.aiProviderAccount.findMany();
  const providerKeys = await prisma.aiProviderKey.findMany({ select: { id: true, provider: true, name: true, keyHint: true } });
  const settings = await prisma.systemSetting.findMany();
  const models = await prisma.aiModel.findMany({ select: { id: true, name: true, modelIdentifier: true, providerId: true } });
  
  console.log('USERS:', JSON.stringify(users, null, 2));
  console.log('PROVIDERS:', JSON.stringify(providers, null, 2));
  console.log('API_KEYS:', JSON.stringify(keys, null, 2));
  console.log('ACCOUNTS:', JSON.stringify(accounts, null, 2));
  console.log('PROVIDER_KEYS:', JSON.stringify(providerKeys, null, 2));
  console.log('SETTINGS:', JSON.stringify(settings, null, 2));
  console.log('MODELS COUNT:', models.length);
}

main().finally(() => prisma.$disconnect());

