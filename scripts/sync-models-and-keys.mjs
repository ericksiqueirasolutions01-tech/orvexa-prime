import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Synchronizing AI Models and resetting API Keys status...');

  const googleProvider = await prisma.aiProvider.findUnique({ where: { slug: 'google' } });
  const anthropicProvider = await prisma.aiProvider.findUnique({ where: { slug: 'anthropic' } });

  if (googleProvider) {
    const googleModels = [
      {
        name: 'Gemini 3 Flash Preview',
        modelIdentifier: 'gemini-3-flash-preview',
        providerId: googleProvider.id,
        category: 'TEXT',
        costPer1kInputCents: 0.05,
        costPer1kOutputCents: 0.15,
        isActive: true,
      },
      {
        name: 'Gemini 3.1 Flash Lite',
        modelIdentifier: 'gemini-3.1-flash-lite-preview',
        providerId: googleProvider.id,
        category: 'TEXT',
        costPer1kInputCents: 0.02,
        costPer1kOutputCents: 0.08,
        isActive: true,
      },
      {
        name: 'Gemini 3.6 Flash',
        modelIdentifier: 'gemini-3.6-flash',
        providerId: googleProvider.id,
        category: 'TEXT',
        costPer1kInputCents: 0.07,
        costPer1kOutputCents: 0.20,
        isActive: true,
      },
      {
        name: 'Gemini Flash Latest',
        modelIdentifier: 'gemini-flash-latest',
        providerId: googleProvider.id,
        category: 'TEXT',
        costPer1kInputCents: 0.05,
        costPer1kOutputCents: 0.15,
        isActive: true,
      }
    ];

    for (const gm of googleModels) {
      await prisma.aiModel.upsert({
        where: { modelIdentifier: gm.modelIdentifier },
        update: gm,
        create: gm,
      });
      console.log(`✓ Google Model synced: ${gm.name} (${gm.modelIdentifier})`);
    }
  }

  if (anthropicProvider) {
    const claudeModels = [
      {
        name: 'Claude Sonnet 5',
        modelIdentifier: 'claude-sonnet-5',
        providerId: anthropicProvider.id,
        category: 'TEXT',
        costPer1kInputCents: 0.25,
        costPer1kOutputCents: 1.25,
        isActive: true,
      },
      {
        name: 'Claude Fable 5.1',
        modelIdentifier: 'claude-fable-5.1',
        providerId: anthropicProvider.id,
        category: 'TEXT',
        costPer1kInputCents: 0.20,
        costPer1kOutputCents: 1.0,
        isActive: true,
      }
    ];

    for (const cm of claudeModels) {
      await prisma.aiModel.upsert({
        where: { modelIdentifier: cm.modelIdentifier },
        update: cm,
        create: cm,
      });
      console.log(`✓ Anthropic Model synced: ${cm.name} (${cm.modelIdentifier})`);
    }
  }

  // Reset all registered keys to ACTIVE and clear any quarantinedUntil / errorCount
  const updatedKeys = await prisma.apiKey.updateMany({
    data: {
      status: 'ACTIVE',
      errorCount: 0,
      quarantinedUntil: null,
    }
  });
  console.log(`✓ API Keys reset to ACTIVE: ${updatedKeys.count} keys`);
}

main().finally(() => prisma.$disconnect());

