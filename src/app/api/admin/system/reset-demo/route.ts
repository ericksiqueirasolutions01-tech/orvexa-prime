// src/app/api/admin/system/reset-demo/route.ts
// MODO RESET DEMO — LIMPEZA SEGURA DE DADOS DE TESTE — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const stats = {
      messagesDeleted: 0,
      conversationsDeleted: 0,
      testProjectsDeleted: 0,
      testAgentsDeleted: 0,
      testFilesDeleted: 0,
      usageLogsDeleted: 0,
      aiUsageLogsDeleted: 0,
      auditLogsDeleted: 0,
    };

    // 1. Mensagens e Conversas de Teste
    const msgRes = await prisma.message.deleteMany();
    stats.messagesDeleted = msgRes.count;

    await prisma.projectConversation.deleteMany();
    const convRes = await prisma.conversation.deleteMany();
    stats.conversationsDeleted = convRes.count;

    // 2. Projetos de Teste (identificados por nomes de teste ou sem vínculo produtivo)
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
      const delProjects = await prisma.project.deleteMany({ where: { id: { in: testProjectIds } } });
      stats.testProjectsDeleted = delProjects.count;
    }

    // 3. Agentes de Teste (NÃO remove agentes de sistema)
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
    stats.testAgentsDeleted = delAgents.count;

    // 4. Arquivos de Teste
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
    stats.testFilesDeleted = delFiles.count;

    // 5. Logs de Teste / Uso anteriores
    const delUsage = await prisma.usageLog.deleteMany();
    stats.usageLogsDeleted = delUsage.count;

    const delAiUsage = await prisma.aiUsageLog.deleteMany({
      where: {
        OR: [
          { model: { contains: "test" } },
          { model: { contains: "simulad" } },
          { provider: { in: ["mirai", "azure", "openai"] } },
        ],
      },
    });
    stats.aiUsageLogsDeleted = delAiUsage.count;

    const delAudit = await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { action: { contains: "TEST" } },
          { action: { contains: "ROUTER_DECISION" } },
        ],
      },
    });
    stats.auditLogsDeleted = delAudit.count;

    return NextResponse.json({
      success: true,
      message: "Modo RESET DEMO concluído com sucesso. Todos os dados de teste foram removidos.",
      stats,
    });
  } catch (error: any) {
    console.error("[Reset Demo Error]", error);
    return NextResponse.json(
      { error: error.message || "Erro durante a execução do Reset Demo." },
      { status: 500 }
    );
  }
}

