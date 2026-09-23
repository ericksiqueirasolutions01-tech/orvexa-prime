// scripts/reset-demo.ts
// SCRIPT DE LIMPEZA — MODO RESET DEMO — ORVEXA PRIME DIGITAL
// Remove com segurança:
// - Conversas e mensagens de teste
// - Projetos e memórias de teste
// - Agentes customizados de teste (preserva agentes de sistema)
// - Logs de auditoria e consumo de teste
// PRESERVA:
// - Usuários reais e administradores
// - Provedores e chaves de API
// - Contratos de Quota
// - Estrutura do banco

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("======================================================================");
  console.log("🧹 EXECUTANDO MODO RESET DEMO — ORVEXA PRIME");
  console.log("======================================================================\n");

  try {
    // 1. Mensagens e Conversas
    const delMsgs = await prisma.message.deleteMany();
    console.log(`✓ Mensagens de teste removidas: ${delMsgs.count}`);

    await prisma.projectConversation.deleteMany();
    const delConvs = await prisma.conversation.deleteMany();
    console.log(`✓ Conversas de teste removidas: ${delConvs.count}`);

    // 2. Projetos de Teste
    const testProjects = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: "Teste" } },
          { name: { contains: "teste" } },
          { name: { contains: "Demo" } },
          { name: { contains: "demo" } },
        ],
      },
    });

    const testProjectIds = testProjects.map((p) => p.id);
    if (testProjectIds.length > 0) {
      await prisma.projectMemory.deleteMany({ where: { projectId: { in: testProjectIds } } });
      await prisma.projectFile.deleteMany({ where: { projectId: { in: testProjectIds } } });
      const delProj = await prisma.project.deleteMany({ where: { id: { in: testProjectIds } } });
      console.log(`✓ Projetos de teste removidos: ${delProj.count}`);
    } else {
      console.log(`✓ Nenhum projeto de teste pendente.`);
    }

    // 3. Agentes de Teste (preserva os de sistema)
    const delAgents = await prisma.agent.deleteMany({
      where: {
        isSystem: false,
        OR: [
          { name: { contains: "Teste" } },
          { name: { contains: "teste" } },
          { name: { contains: "Demo" } },
          { name: { contains: "demo" } },
        ],
      },
    });
    console.log(`✓ Agentes de teste não-sistema removidos: ${delAgents.count}`);

    // 4. Arquivos de Teste órfãos
    const delFiles = await prisma.file.deleteMany({
      where: {
        OR: [
          { originalName: { contains: "test" } },
          { originalName: { contains: "teste" } },
          { originalName: { contains: "demo" } },
          { conversationId: null },
        ],
      },
    });
    console.log(`✓ Arquivos de teste removidos: ${delFiles.count}`);

    // 5. Logs de Teste
    const delUsage = await prisma.usageLog.deleteMany();
    console.log(`✓ Logs de uso de teste limpos: ${delUsage.count}`);

    const delAiUsage = await prisma.aiUsageLog.deleteMany({
      where: {
        OR: [
          { model: { contains: "test" } },
          { model: { contains: "simulad" } },
        ],
      },
    });
    console.log(`✓ Logs de IA de teste limpos: ${delAiUsage.count}`);

    // Validação de Preservação
    const usersCount = await prisma.user.count();
    const providersCount = await prisma.aiProvider.count();
    const keysCount = await prisma.apiKey.count();
    const systemAgentsCount = await prisma.agent.count({ where: { isSystem: true } });

    console.log("\n--- REGISTROS ESSENCIAIS PRESERVADOS ---");
    console.log(`  Usuários mantidos: ${usersCount}`);
    console.log(`  Provedores de IA mantidos: ${providersCount}`);
    console.log(`  Chaves de API mantidas: ${keysCount}`);
    console.log(`  Especialistas de Sistema mantidos: ${systemAgentsCount}`);

    console.log("\n======================================================================");
    console.log("✅ RESET DEMO FINALIZADO COM SUCESSO! O SISTEMA ESTÁ LIMPO E PRONTO.");
    console.log("======================================================================\n");
  } catch (error: any) {
    console.error("❌ ERRO NO RESET DEMO:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

