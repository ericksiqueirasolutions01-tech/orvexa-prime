const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.usageLog.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      model: true,
      apiKey: true,
      user: true,
    }
  });

  console.log("=== ÚLTIMOS LOGS DE AUDITORIA & CONSUMO (usage_logs) ===");
  logs.forEach(l => {
    console.log(`[${new Date(l.createdAt).toLocaleTimeString()}] Usuário: ${l.user.name} | Modelo: ${l.model?.name} | Chave: ${l.apiKey?.name} | Tokens: ${l.totalTokens} | Latência: ${l.latencyMs}ms | Status: ${l.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

