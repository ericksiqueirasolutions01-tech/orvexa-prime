// src/app/api/ai/agents/route.ts
// GERENCIADOR DE AGENTES ESPECIALISTAS (ORVEXA AGENTS)

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

    // Sincroniza agentes oficiais com o banco se ainda não existirem os 5 padrão
    const standardCount = await prisma.agent.count({
      where: {
        slug: {
          in: ["analista-financeiro", "especialista-marketing", "programador", "assistente-juridico", "professor"],
        },
      },
    });

    if (standardCount < 5) {
      await syncOfficialAgentsToDatabase();
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const projectId = searchParams.get("projectId");
    const includeInactive = searchParams.get("includeInactive") === "true" && user.role === "ADMIN";

    const whereConditions: any[] = [];

    if (!includeInactive) {
      whereConditions.push({ isActive: true });
    }

    // Agentes visíveis: oficiais do sistema OU criados por este usuário (ou todos se for ADMIN)
    if (user.role !== "ADMIN") {
      whereConditions.push({
        OR: [{ isSystem: true }, { userId: user.id }],
      });
    }

    if (projectId) {
      whereConditions.push({
        OR: [{ projectId }, { projectId: null }],
      });
    }

    if (search.trim()) {
      whereConditions.push({
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { role: { contains: search } },
        ],
      });
    }

    // 1. Verifica se há chaves de API ativas no sistema
    const activeApiKeys = await prisma.apiKey.findMany({
      where: { status: "ACTIVE" },
      include: { provider: true },
    });

    if (activeApiKeys.length === 0) {
      return NextResponse.json({
        success: true,
        activeApiConfigured: false,
        message: "Nenhuma IA configurada pelo administrador.",
        agents: [],
        total: 0,
      });
    }

    const activeProviderSlugs = new Set(
      activeApiKeys.map((k) => (k.provider?.slug || "").toLowerCase())
    );

    // 2. Busca modelos ativos suportados pela API conectada
    const activeModels = await prisma.aiModel.findMany({
      where: { isActive: true },
      select: { modelIdentifier: true },
    });
    const activeModelIds = new Set(activeModels.map((m) => m.modelIdentifier.toLowerCase()));

    const dbAgents = await prisma.agent.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      include: {
        preferredModel: true,
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            conversations: { where: { userId: user.id } },
            agentMemories: { where: { userId: user.id } },
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });

    const formattedAgents = dbAgents
      .map((ag) => {
        let tools: any[] = [];
        try {
          tools = JSON.parse(ag.tools || "[]");
        } catch {}

        // Mapeamento de avatar inteligente
        let avatar = ag.avatar;
        if (!avatar) {
          if (ag.slug === "analista-financeiro" || ag.iconName === "TrendingUp") avatar = "💰";
          else if (ag.slug === "especialista-marketing" || ag.iconName === "Megaphone") avatar = "🚀";
          else if (ag.slug === "programador" || ag.iconName === "Code2") avatar = "💻";
          else if (ag.slug === "assistente-juridico" || ag.iconName === "Scale") avatar = "⚖️";
          else if (ag.slug === "professor" || ag.iconName === "GraduationCap") avatar = "🎓";
          else avatar = "🤖";
        }

        const preferredModel =
          ag.modelPreference ||
          ag.preferredModel?.modelIdentifier ||
          ag.preferredModelId ||
          "orvexa-prime";

        return {
          id: ag.id,
          slug: ag.slug,
          name: ag.name,
          role: ag.role,
          badge: ag.badge || (ag.isSystem ? "OFICIAL" : "PERSONALIZADO"),
          color: ag.color,
          avatar,
          description: ag.description,
          instructions: ag.instructions || ag.systemPrompt,
          systemPrompt: ag.systemPrompt,
          preferredModel,
          preferredModelId: preferredModel,
          preferredModelName: ag.preferredModel?.name || (preferredModel === "orvexa-prime" ? "ORVEXA AUTO" : preferredModel),
          iconName: ag.iconName,
          category: ag.category,
          projectId: ag.projectId,
          project: ag.project,
          tools,
          isSystem: ag.isSystem,
          isActive: ag.isActive,
          isOwner: ag.userId === user.id || user.role === "ADMIN",
          createdAt: ag.createdAt,
          stats: {
            userConversationsCount: ag._count.conversations,
            userMemoriesCount: ag._count.agentMemories,
          },
        };
      })
      // Filtra agentes para a área do cliente: mostra somente os que possuem suporte 100% operacional na API ativa
      .filter((ag) => {
        if (includeInactive) return true;

        const slugLower = (ag.slug || "").toLowerCase();
        const nameLower = (ag.name || "").toLowerCase();
        const modelLower = (ag.preferredModel || "").toLowerCase();

        // 1. Esconde agentes Anthropic Claude se a chave Anthropic não estiver ativa
        if (
          (slugLower.includes("fable") || slugLower.includes("claude") || nameLower.includes("claude")) &&
          !activeProviderSlugs.has("anthropic")
        ) {
          return false;
        }

        // 2. Esconde agentes Google Gemini se a chave Google não estiver ativa
        if (
          (slugLower.includes("gemini") || nameLower.includes("gemini") || slugLower.includes("estudos") || slugLower.includes("analyst")) &&
          !activeProviderSlugs.has("google")
        ) {
          return false;
        }

        // 3. Esconde agentes GPT-6 Astra se o modelo Astra não estiver ativo no catálogo
        if (
          (slugLower.includes("astra") || nameLower.includes("astra")) &&
          !activeModelIds.has("gpt-6-astra")
        ) {
          return false;
        }

        // 4. Exige que o modelo configurado seja suportado pela API ativa ou seja ORVEXA Auto
        return (
          modelLower === "orvexa-prime" ||
          modelLower === "" ||
          activeModelIds.has(modelLower)
        );
      });

    return NextResponse.json({
      success: true,
      activeApiConfigured: true,
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
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      slug: rawSlug,
      role = "Especialista",
      badge,
      color = "cyan",
      avatar = "🤖",
      description,
      instructions,
      systemPrompt,
      preferredModel = "orvexa-prime",
      projectId = null,
      iconName = "Bot",
      category = "PERSONALIZADO",
      tools = [],
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Nome e descrição do agente são obrigatórios." },
        { status: 400 }
      );
    }

    const effectiveInstructions = (instructions || systemPrompt || description).trim();

    // Se um projectId foi enviado, valida se o projeto pertence ao usuário
    let validProjectId: string | null = null;
    if (projectId) {
      const proj = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      });
      if (proj) {
        validProjectId = proj.id;
      }
    }

    // Gera slug único seguro
    const baseSlug = (rawSlug || name.toLowerCase().replace(/[^a-z0-9]/g, "-"))
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .trim() || "agente";

    const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const created = await prisma.agent.create({
      data: {
        userId: user.id,
        projectId: validProjectId,
        name: name.trim(),
        slug,
        role: role.trim(),
        badge: badge || "PERSONALIZADO",
        color,
        avatar: avatar || "🤖",
        description: description.trim(),
        instructions: effectiveInstructions,
        systemPrompt: effectiveInstructions,
        modelPreference: preferredModel || "orvexa-prime",
        iconName: iconName || "Bot",
        category: category || "PERSONALIZADO",
        tools: JSON.stringify(tools || []),
        allowedRoles: JSON.stringify(["USER", "ADMIN"]),
        allowedPlans: JSON.stringify(["ALL"]),
        isSystem: false,
        isActive: true,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        agent: {
          ...created,
          tools: typeof created.tools === "string" ? JSON.parse(created.tools) : created.tools,
          preferredModel: created.modelPreference,
          isOwner: true,
        },
        message: `Agente "${name}" criado com sucesso!`,
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
