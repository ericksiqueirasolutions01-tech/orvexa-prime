// src/app/api/ai/agents/route.ts
// GERENCIADOR DE AGENTES PROFISSIONAIS — ORVEXA PRIME

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncOfficialAgentsToDatabase } from "@/ai/agents/sync-agents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // Sincroniza agentes nativos com o banco se necessário
    const agentCount = await prisma.agent.count();
    if (agentCount === 0) {
      await syncOfficialAgentsToDatabase();
    }

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true" && user.role === "ADMIN";

    // Busca agentes do banco
    const dbAgents = await prisma.agent.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        preferredModel: true,
        _count: {
          select: {
            conversations: { where: { userId: user.id } },
            agentMemories: { where: { userId: user.id } },
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });

    // Obtém o plano do usuário para conferência de permissões
    const userPlan = await prisma.user.findUnique({
      where: { id: user.id },
      include: { plan: true },
    });
    const planSlug = userPlan?.plan?.slug?.toUpperCase() || "FREE";

    const formattedAgents = dbAgents.map((ag) => {
      let tools: any[] = [];
      let allowedRoles: string[] = ["USER", "ADMIN"];
      let allowedPlans: string[] = ["ALL"];

      try {
        tools = JSON.parse(ag.tools || "[]");
      } catch {}
      try {
        allowedRoles = JSON.parse(ag.allowedRoles || "[\"USER\",\"ADMIN\"]");
      } catch {}
      try {
        allowedPlans = JSON.parse(ag.allowedPlans || "[\"ALL\"]");
      } catch {}

      // Verificação de permissão por usuário e plano
      const isRoleAllowed = allowedRoles.includes(user.role) || user.role === "ADMIN";
      const isPlanAllowed =
        allowedPlans.includes("ALL") ||
        allowedPlans.includes(planSlug) ||
        user.role === "ADMIN";

      const hasPermission = isRoleAllowed && isPlanAllowed;

      return {
        id: ag.id,
        slug: ag.slug,
        name: ag.name,
        role: ag.role,
        badge: ag.badge,
        color: ag.color,
        description: ag.description,
        systemPrompt: ag.systemPrompt,
        preferredModelId: ag.preferredModel?.modelIdentifier || ag.preferredModelId || "orvexa-prime",
        preferredModelName: ag.preferredModel?.name || "ORVEXA Prime Router",
        iconName: ag.iconName,
        category: ag.category,
        tools,
        allowedRoles,
        allowedPlans,
        isSystem: ag.isSystem,
        isActive: ag.isActive,
        createdAt: ag.createdAt,
        stats: {
          userConversationsCount: ag._count.conversations,
          userMemoriesCount: ag._count.agentMemories,
        },
        hasPermission,
        lockedReason: !hasPermission
          ? `Disponível nos planos: ${allowedPlans.join(", ")}`
          : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      agents: formattedAgents,
      total: formattedAgents.length,
    });
  } catch (error: any) {
    console.error("[Agents GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao listar agentes: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem criar novos agentes." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug: rawSlug,
      role = "Especialista",
      badge = "CUSTOM AGENT",
      color = "cyan",
      description,
      systemPrompt,
      preferredModelId,
      iconName = "Bot",
      category = "GERAL",
      tools = [],
      allowedRoles = ["USER", "ADMIN"],
      allowedPlans = ["ALL"],
    } = body;

    if (!name || !description || !systemPrompt) {
      return NextResponse.json(
        { error: "Nome, descrição e instruções (systemPrompt) são obrigatórios." },
        { status: 400 }
      );
    }

    const slug = (
      rawSlug || name.toLowerCase().replace(/[^a-z0-9]/g, "-")
    )
      .replace(/-+/g, "-")
      .trim();

    // Verifica unicidade do slug
    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `Já existe um agente com o identificador slug "${slug}".` },
        { status: 409 }
      );
    }

    // Busca o modelo se especificado
    let modelFkId: string | null = null;
    if (preferredModelId) {
      const modelInDb = await prisma.aiModel.findFirst({
        where: {
          OR: [{ id: preferredModelId }, { modelIdentifier: preferredModelId }],
        },
      });
      if (modelInDb) modelFkId = modelInDb.id;
    }

    const created = await prisma.agent.create({
      data: {
        name,
        slug,
        role,
        badge,
        color,
        description,
        systemPrompt,
        preferredModelId: modelFkId,
        iconName,
        category,
        tools: JSON.stringify(tools),
        allowedRoles: JSON.stringify(allowedRoles),
        allowedPlans: JSON.stringify(allowedPlans),
        isSystem: false,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        agent: created,
        message: `Agente "${name}" criado com sucesso pelo Administrador.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Agents POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao criar agente: " + error.message },
      { status: 500 }
    );
  }
}
