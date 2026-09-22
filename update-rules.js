const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const claude = await prisma.aiModel.findFirst({
    where: { modelIdentifier: "claude-3-5-sonnet-20241022" },
  });
  const anthropic = await prisma.aiProvider.findUnique({
    where: { slug: "anthropic" },
  });

  if (claude && anthropic) {
    await prisma.routerRule.updateMany({
      where: { intentName: { in: ["DOCUMENTOS", "PESQUISA_PROFUNDA"] } },
      data: {
        targetProviderId: anthropic.id,
        targetModelId: claude.id,
      },
    });
    console.log("✓ Regras DOCUMENTOS e PESQUISA atualizadas para Anthropic Claude com sucesso!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

