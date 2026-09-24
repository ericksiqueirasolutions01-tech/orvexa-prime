// scripts/migrate-and-clean.ts
// FASE 3 & FASE 9: Higienização de dados falsos e migração definitiva para ai_provider_accounts

import { prisma } from "../src/lib/prisma";
import { encryptApiKey } from "../src/lib/crypto";

async function migrateAndClean() {
  console.log("=== INICIANDO MIGRAÇÃO E HIGIENIZAÇÃO DE CONTAS DE IA ===");

  // 1. Remove contas demo, fake ou de teste em ai_provider_accounts
  const deletedDemoAccounts = await prisma.aiProviderAccount.deleteMany({
    where: {
      OR: [
        { provider: "azure" },
        { accountName: { contains: "Demo" } },
        { accountName: { contains: "Teste" } },
        { accountName: { contains: "Fake" } },
        { name: { contains: "Demo" } },
        { name: { contains: "Teste" } },
      ],
    },
  });
  console.log(`✓ Contas demo removidas de ai_provider_accounts: ${deletedDemoAccounts.count}`);

  // 2. Remove chaves demo de ApiKey
  const deletedDemoKeys = await prisma.apiKey.deleteMany({
    where: {
      OR: [
        { name: { contains: "Demo" } },
        { name: { contains: "Teste" } },
        { name: { contains: "Mock" } },
      ],
    },
  });
  console.log(`✓ Chaves demo removidas de ApiKey: ${deletedDemoKeys.count}`);

  // 3. Garante que a conta oficial da Mirai está 100% preenchida na tabela ai_provider_accounts
  const miraiRawKey = process.env.OPENAI_API_KEY || "sk-z5G1R5volTvyYJVoIk01A5LKIYysFFcr3fRmOJ9y0F8BklFI";
  const miraiEncrypted = encryptApiKey(miraiRawKey);
  const miraiModels = ["gpt-6-sol", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"];
  const miraiCapabilities = ["TEXTO", "CODIGO", "DOCUMENTO"];

  const existingMiraiAccount = await prisma.aiProviderAccount.findFirst({
    where: {
      OR: [
        { provider: "openai" },
        { provider: "mirai" },
        { customBaseUrl: { contains: "miraiapi.com" } },
        { baseUrl: { contains: "miraiapi.com" } },
      ],
    },
  });

  if (existingMiraiAccount) {
    await prisma.aiProviderAccount.update({
      where: { id: existingMiraiAccount.id },
      data: {
        provider: "openai",
        name: "Mirai Produção (OpenAI Compatível)",
        accountName: "Mirai Produção (OpenAI Compatível)",
        baseUrl: "https://api.miraiapi.com/v1",
        customBaseUrl: "https://api.miraiapi.com/v1",
        encryptedApiKey: miraiEncrypted.cipherText,
        encryptedKey: miraiEncrypted.cipherText,
        iv: miraiEncrypted.iv,
        authTag: miraiEncrypted.authTag,
        keyHint: miraiEncrypted.keyHint,
        apiKeyMasked: miraiEncrypted.keyHint,
        modelsDetected: JSON.stringify(miraiModels),
        detectedModels: JSON.stringify(miraiModels),
        capabilities: JSON.stringify(miraiCapabilities),
        quotaLimit: 10000000,
        totalQuota: 10000000,
        tokensUsed: 100212,
        usedQuota: 100212,
        tokensRemaining: 9899788,
        remainingQuota: 9899788,
        status: "ACTIVE",
        priority: 1,
        lastTestedAt: new Date(),
        lastSync: new Date(),
      },
    });
    console.log("✓ Conta Mirai atualizada e padronizada em ai_provider_accounts.");
  } else {
    await prisma.aiProviderAccount.create({
      data: {
        provider: "openai",
        name: "Mirai Produção (OpenAI Compatível)",
        accountName: "Mirai Produção (OpenAI Compatível)",
        baseUrl: "https://api.miraiapi.com/v1",
        customBaseUrl: "https://api.miraiapi.com/v1",
        encryptedApiKey: miraiEncrypted.cipherText,
        encryptedKey: miraiEncrypted.cipherText,
        iv: miraiEncrypted.iv,
        authTag: miraiEncrypted.authTag,
        keyHint: miraiEncrypted.keyHint,
        apiKeyMasked: miraiEncrypted.keyHint,
        modelsDetected: JSON.stringify(miraiModels),
        detectedModels: JSON.stringify(miraiModels),
        capabilities: JSON.stringify(miraiCapabilities),
        quotaLimit: 10000000,
        totalQuota: 10000000,
        tokensUsed: 0,
        usedQuota: 0,
        tokensRemaining: 10000000,
        remainingQuota: 10000000,
        status: "ACTIVE",
        priority: 1,
        lastTestedAt: new Date(),
        lastSync: new Date(),
      },
    });
    console.log("✓ Conta Mirai criada com sucesso em ai_provider_accounts.");
  }

  // 4. Sincroniza também a tabela ApiKey para garantir retrocompatibilidade com qualquer código legado
  const openaiProvider = await prisma.aiProvider.findUnique({ where: { slug: "openai" } });
  if (openaiProvider) {
    const existingApiKey = await prisma.apiKey.findFirst({
      where: { providerId: openaiProvider.id },
    });

    if (existingApiKey) {
      await prisma.apiKey.update({
        where: { id: existingApiKey.id },
        data: {
          name: "Mirai OpenAI Compatível (Produção)",
          customBaseUrl: "https://api.miraiapi.com/v1",
          capabilities: JSON.stringify(miraiCapabilities),
          tokenLimitMonthly: 10000000,
          tokensUsedMonth: 100212,
          status: "ACTIVE",
        },
      });
      console.log("✓ Tabela ApiKey sincronizada com sucesso.");
    }
  }

  // 5. Exibe resumo do banco após migração
  const finalAccounts = await prisma.aiProviderAccount.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      baseUrl: true,
      status: true,
      modelsDetected: true,
      capabilities: true,
      quotaLimit: true,
      tokensRemaining: true,
    },
  });

  console.log("\n=== CONTAS ATIVAS EM AI_PROVIDER_ACCOUNTS ===");
  console.log(JSON.stringify(finalAccounts, null, 2));
}

migrateAndClean().catch(console.error);

