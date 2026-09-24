// src/app/api/admin/system/api-capabilities/route.ts
// ENDPOINT ADMINISTRATIVO DE DIAGNÓSTICO DE CAPACIDADES DA API & AGENTES
// Exclusivo para administradores: detecta API ativa, modelos, capacidades e status de agentes (liberados vs bloqueados)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface CapabilityItem {
  name: string;
  key: "TEXT" | "CODE" | "DOCS" | "IMAGE" | "VIDEO";
  supported: boolean;
  icon: string;
  description: string;
  activeModels: string[];
  reason?: string;
}

export interface AgentDiagnosticItem {
  id: string;
  slug: string;
  name: string;
  role: string;
  model: string;
  avatar: string;
  category: string;
  isSystem: boolean;
  status: "LIBERADO" | "BLOQUEADO";
  capabilityNeeded: string;
  reason?: string;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 }
      );
    }

    // 1. Identifica a API e Chaves Ativas
    const activeApiKeys = await prisma.apiKey.findMany({
      where: { status: "ACTIVE" },
      include: { provider: true },
      orderBy: { updatedAt: "desc" },
    });

    const activeAccount = await prisma.aiProviderAccount.findFirst({
      where: { status: "CONNECTED" },
      orderBy: { updatedAt: "desc" },
    });

    const primaryKey = activeApiKeys[0];
    const activeProvider = primaryKey?.provider;

    const activeProviderSlugs = new Set(
      activeApiKeys.map((k) => (k.provider?.slug || "").toLowerCase())
    );

    // Endpoint configurado
    const activeEndpoint =
      activeAccount?.customBaseUrl ||
      activeProvider?.baseUrl ||
      process.env.OPENAI_BASE_URL ||
      "https://api.miraiapi.com/v1";

    const apiInfo = {
      isConfigured: activeApiKeys.length > 0,
      name: primaryKey?.name || activeAccount?.accountName || "Mirai OpenAI Compatível (Produção)",
      provider: activeProvider?.name || "OpenAI Compatível (Mirai Gateway)",
      providerSlug: activeProvider?.slug || "openai",
      endpoint: activeEndpoint,
      status: activeApiKeys.length > 0 ? ("ONLINE" as const) : ("OFFLINE" as const),
      keyHint: primaryKey?.keyHint || activeAccount?.apiKeyMasked || "...klFI",
      totalQuota: activeAccount?.totalQuota || 10000000,
      usedQuota: activeAccount?.usedQuota || 0,
      remainingQuota: activeAccount?.remainingQuota || 10000000,
      lastSync: activeAccount?.lastSync || new Date().toISOString(),
    };

    // 2. Identifica os Modelos Ativos e Detectados
    const activeModelsDb = await prisma.aiModel.findMany({
      where: { isActive: true },
      include: { provider: true },
      orderBy: { name: "asc" },
    });

    const activeModelIds = new Set(
      activeModelsDb.map((m) => m.modelIdentifier.toLowerCase())
    );

    const detectedModels = activeModelsDb.map((m) => {
      let friendlyName = m.name;
      let badge = "OPERACIONAL";
      let category = "Texto";

      const idLower = m.modelIdentifier.toLowerCase();
      if (idLower === "gpt-6-sol") {
        friendlyName = "ORVEXA Prime (GPT-6 Sol)";
        badge = "Recomendado • Principal";
        category = "Inteligência Geral";
      } else if (idLower === "gpt-5.6-sol") {
        friendlyName = "ORVEXA Codex (GPT-5.6 Sol)";
        badge = "Especialista em Código";
        category = "Código & Engenharia";
      } else if (idLower === "gpt-5.6-terra") {
        friendlyName = "ORVEXA Análise (GPT-5.6 Terra)";
        badge = "Documentos & RAG";
        category = "Análise Documental";
      } else if (idLower === "gpt-5.6-luna") {
        friendlyName = "ORVEXA Instant (GPT-5.6 Luna)";
        badge = "Ultra Rápido & Econômico";
        category = "Respostas Rápidas";
      }

      return {
        id: m.id,
        identifier: m.modelIdentifier,
        name: friendlyName,
        badge,
        category,
        provider: m.provider?.name || "Mirai Gateway",
        maxContextTokens: m.contextWindow || 128000,
        status: "OPERATIONAL" as const,
      };
    });

    // 3. Avaliação de Capacidades por Tipo
    const hasTextModel =
      activeModelIds.has("gpt-6-sol") ||
      activeModelIds.has("gpt-5.6-sol") ||
      activeModelIds.has("gpt-5.6-terra") ||
      activeModelIds.has("gpt-5.6-luna") ||
      activeModelIds.size > 0;

    const hasCodeModel =
      activeModelIds.has("gpt-5.6-sol") ||
      activeModelsDb.some((m) => m.capabilities?.includes("code"));

    const hasDocsModel =
      activeModelIds.has("gpt-5.6-terra") ||
      activeModelsDb.some((m) => m.capabilities?.includes("documents") || m.capabilities?.includes("rag"));

    // Imagem: Mirai é gateway OpenAI-compatível de LLM texto, DALL-E/Midjourney requer chave gráfica
    const hasImageModel = activeModelsDb.some(
      (m) =>
        m.modelIdentifier.toLowerCase().includes("dall-e") ||
        m.modelIdentifier.toLowerCase().includes("flux") ||
        m.modelIdentifier.toLowerCase().includes("midjourney")
    ) && activeProviderSlugs.has("openai_image");

    // Vídeo: Requer Runway / Sora / Veo
    const hasVideoModel = false;

    const capabilities: CapabilityItem[] = [
      {
        name: "Texto & Raciocínio",
        key: "TEXT",
        supported: hasTextModel,
        icon: "MessageSquare",
        description: "Geração textual fluida, conversação multilíngue, raciocínio lógico e Smart Router.",
        activeModels: ["gpt-6-sol", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"].filter((id) =>
          activeModelIds.has(id)
        ),
        reason: hasTextModel ? undefined : "Nenhum modelo de processamento de linguagem natural ativo.",
      },
      {
        name: "Engenharia de Código",
        key: "CODE",
        supported: hasCodeModel,
        icon: "Code2",
        description: "Geração, depuração, refatoração de código TypeScript/Python e modelagem Prisma.",
        activeModels: ["gpt-5.6-sol"].filter((id) => activeModelIds.has(id)),
        reason: hasCodeModel ? undefined : "Requer o modelo gpt-5.6-sol ou equivalente ativo no catálogo.",
      },
      {
        name: "Análise de Documentos (RAG)",
        key: "DOCS",
        supported: hasDocsModel,
        icon: "FileText",
        description: "Processamento e extração contextual de PDFs, TXTs, planilhas e busca semântica.",
        activeModels: ["gpt-5.6-terra"].filter((id) => activeModelIds.has(id)),
        reason: hasDocsModel ? undefined : "Requer o modelo gpt-5.6-terra ou equivalente ativo no catálogo.",
      },
      {
        name: "Geração de Imagens",
        key: "IMAGE",
        supported: hasImageModel,
        icon: "Image",
        description: "Criação de imagens por difusão gráfica (DALL-E 3, Midjourney, Imagen).",
        activeModels: [],
        reason: "A API ativa (Mirai OpenAI-compatível) atua como gateway de modelos LLM textuais. Geração gráfica requer provedor especializado.",
      },
      {
        name: "Geração de Vídeo",
        key: "VIDEO",
        supported: hasVideoModel,
        icon: "Video",
        description: "Síntese generativa de animações e clipes de vídeo (Sora, Runway, Veo).",
        activeModels: [],
        reason: "Nenhum provedor de síntese de vídeo cadastrado ou ativo nas chaves do sistema.",
      },
    ];

    // 4. Mapeamento e Diagnóstico de Agentes (Liberados vs Bloqueados)
    const allAgentsDb = await prisma.agent.findMany({
      include: { preferredModel: true },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    const allowedAgents: AgentDiagnosticItem[] = [];
    const blockedAgents: AgentDiagnosticItem[] = [];

    for (const ag of allAgentsDb) {
      const slugLower = (ag.slug || "").toLowerCase();
      const nameLower = (ag.name || "").toLowerCase();
      const modelLower = (
        ag.modelPreference ||
        ag.preferredModel?.modelIdentifier ||
        "orvexa-prime"
      ).toLowerCase();

      let avatar = ag.avatar;
      if (!avatar) {
        if (slugLower.includes("finan") || ag.iconName === "TrendingUp") avatar = "💰";
        else if (slugLower.includes("market") || ag.iconName === "Megaphone") avatar = "🚀";
        else if (slugLower.includes("prog") || slugLower.includes("dev") || ag.iconName === "Code2") avatar = "💻";
        else if (slugLower.includes("jurid") || ag.iconName === "Scale") avatar = "⚖️";
        else if (slugLower.includes("prof") || ag.iconName === "GraduationCap") avatar = "🎓";
        else avatar = "🤖";
      }

      // Critério 1: Incompatibilidade com Anthropic Claude
      if (
        (slugLower.includes("claude") ||
          slugLower.includes("fable") ||
          nameLower.includes("claude") ||
          modelLower.includes("claude")) &&
        !activeProviderSlugs.has("anthropic")
      ) {
        blockedAgents.push({
          id: ag.id,
          slug: ag.slug,
          name: ag.name,
          role: ag.role,
          model: modelLower,
          avatar,
          category: ag.category,
          isSystem: ag.isSystem,
          status: "BLOQUEADO",
          capabilityNeeded: "Anthropic Claude API",
          reason: "Requer chave de API Anthropic ativa. Apenas o provedor OpenAI compatível está configurado.",
        });
        continue;
      }

      // Critério 2: Incompatibilidade com Google Gemini
      if (
        (slugLower.includes("gemini") ||
          nameLower.includes("gemini") ||
          slugLower.includes("estudos") ||
          slugLower.includes("analyst") ||
          slugLower.includes("edu") ||
          modelLower.includes("gemini")) &&
        !activeProviderSlugs.has("google")
      ) {
        blockedAgents.push({
          id: ag.id,
          slug: ag.slug,
          name: ag.name,
          role: ag.role,
          model: modelLower,
          avatar,
          category: ag.category,
          isSystem: ag.isSystem,
          status: "BLOQUEADO",
          capabilityNeeded: "Google AI Gemini API",
          reason: "Requer chave de API Google AI Gemini ativa. Provedor Google não está conectado.",
        });
        continue;
      }

      // Critério 3: Incompatibilidade com GPT-6 Astra (Erro 502 Upstream)
      if (
        (slugLower.includes("astra") || nameLower.includes("astra") || modelLower.includes("astra")) &&
        !activeModelIds.has("gpt-6-astra")
      ) {
        blockedAgents.push({
          id: ag.id,
          slug: ag.slug,
          name: ag.name,
          role: ag.role,
          model: modelLower,
          avatar,
          category: ag.category,
          isSystem: ag.isSystem,
          status: "BLOQUEADO",
          capabilityNeeded: "Modelo gpt-6-astra",
          reason: "Modelo upstream 'gpt-6-astra' indisponível no gateway (upstream 502 Bad Gateway retornado pela Mirai).",
        });
        continue;
      }

      // Critério 4: Agente requer difusão de imagens
      if (slugLower.includes("design") || nameLower.includes("design")) {
        blockedAgents.push({
          id: ag.id,
          slug: ag.slug,
          name: ag.name,
          role: ag.role,
          model: modelLower,
          avatar,
          category: ag.category,
          isSystem: ag.isSystem,
          status: "BLOQUEADO",
          capabilityNeeded: "Geração de Imagens",
          reason: "Requer provedor com suporte a difusão de imagens (DALL-E 3 / Imagen). Incompatível com o gateway ativo.",
        });
        continue;
      }

      // Critério 5: Modelo não é orvexa-prime e não está no activeModelIds
      if (modelLower !== "orvexa-prime" && modelLower !== "" && !activeModelIds.has(modelLower)) {
        blockedAgents.push({
          id: ag.id,
          slug: ag.slug,
          name: ag.name,
          role: ag.role,
          model: modelLower,
          avatar,
          category: ag.category,
          isSystem: ag.isSystem,
          status: "BLOQUEADO",
          capabilityNeeded: `Modelo ${modelLower}`,
          reason: `O modelo '${modelLower}' associado a este especialista não é suportado pela API ativa.`,
        });
        continue;
      }

      // Se passou em todas as regras, o agente está 100% LIBERADO
      let capability = "Texto & Raciocínio";
      if (slugLower.includes("dev") || slugLower.includes("prog")) {
        capability = "Engenharia de Código";
      } else if (slugLower.includes("jurid") || slugLower.includes("finan")) {
        capability = "Análise Especializada";
      }

      allowedAgents.push({
        id: ag.id,
        slug: ag.slug,
        name: ag.name,
        role: ag.role,
        model: modelLower === "orvexa-prime" ? "ORVEXA Auto (Smart Router)" : modelLower,
        avatar,
        category: ag.category,
        isSystem: ag.isSystem,
        status: "LIBERADO",
        capabilityNeeded: capability,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      apiInfo,
      detectedModels,
      capabilities,
      summary: {
        totalDetectedModels: detectedModels.length,
        supportedCapabilitiesCount: capabilities.filter((c) => c.supported).length,
        totalCapabilitiesCount: capabilities.length,
        allowedAgentsCount: allowedAgents.length,
        blockedAgentsCount: blockedAgents.length,
      },
      allowedAgents,
      blockedAgents,
    });
  } catch (error: any) {
    console.error("[API Capabilities Error]:", error);
    return NextResponse.json(
      { error: "Erro ao gerar diagnóstico de capacidades: " + error.message },
      { status: 500 }
    );
  }
}
