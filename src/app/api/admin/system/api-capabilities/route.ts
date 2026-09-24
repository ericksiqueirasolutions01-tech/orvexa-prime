// src/app/api/admin/system/api-capabilities/route.ts
// ENDPOINT ADMINISTRATIVO DE DIAGNÓSTICO DE CAPACIDADES DA API & AGENTES
// Exclusivo para administradores: detecta API ativa, modelos, capacidades e status de agentes (liberados vs bloqueados)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveAccountInDatabase } from "@/lib/serverless-sync";

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
    await ensureActiveAccountInDatabase(req);
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 }
      );
    }

    // 1. Identifica a API Ativa EXCLUSIVAMENTE na tabela mestra oficial (ai_provider_accounts)
    const activeAccount = await prisma.aiProviderAccount.findFirst({
      where: { status: { in: ["ACTIVE", "CONNECTED"] } },
      orderBy: { updatedAt: "desc" },
    });

    const isConfigured = !!activeAccount;
    const activeEndpoint = activeAccount
      ? activeAccount.baseUrl || activeAccount.customBaseUrl || "https://api.openai.com/v1"
      : "Nenhum endpoint configurado";

    const totalQuota = activeAccount?.quotaLimit || activeAccount?.totalQuota || 10000000;
    const usedQuota = activeAccount?.tokensUsed || activeAccount?.usedQuota || 0;
    const remainingQuota = activeAccount?.tokensRemaining ?? activeAccount?.remainingQuota ?? Math.max(0, totalQuota - usedQuota);

    const apiInfo = {
      isConfigured,
      name: activeAccount?.name || activeAccount?.accountName || "Nenhuma API Cadastrada",
      provider: activeAccount?.provider === "openai" ? "OpenAI Compatible" : (activeAccount?.provider || "Nenhum"),
      providerSlug: activeAccount?.provider || "none",
      endpoint: activeEndpoint,
      status: isConfigured ? ("ONLINE" as const) : ("OFFLINE" as const),
      keyHint: activeAccount?.keyHint || activeAccount?.apiKeyMasked || "Nenhuma",
      totalQuota,
      usedQuota,
      remainingQuota,
      lastSync: activeAccount?.lastSync?.toISOString() || activeAccount?.updatedAt?.toISOString() || new Date().toISOString(),
    };

    // Parse de modelos detectados da conta ativa
    let accountDetectedModels: string[] = [];
    if (activeAccount) {
      try {
        accountDetectedModels = JSON.parse(activeAccount.modelsDetected || activeAccount.detectedModels || "[]");
      } catch {}
    }

    // Parse de capacidades da conta ativa
    let accountCapabilities: string[] = [];
    if (activeAccount) {
      try {
        accountCapabilities = JSON.parse(activeAccount.capabilities || "[]");
      } catch {}
    }

    const activeModelIds = new Set<string>(
      accountDetectedModels.map((m) => m.toLowerCase().trim()).filter(Boolean)
    );

    const detectedModels = accountDetectedModels.map((mId) => {
      const idLower = mId.toLowerCase();
      let friendlyName = mId;
      let badge = "OPERACIONAL";
      let category = "Inteligência Artificial";

      if (idLower.includes("gpt-4o")) {
        friendlyName = "ORVEXA Prime (" + mId + ")";
        badge = "Alta Performance";
        category = "Multimodal & Raciocínio";
      } else if (idLower.includes("mini") || idLower.includes("turbo") || idLower.includes("flash")) {
        friendlyName = "ORVEXA Fast (" + mId + ")";
        badge = "Ultra Rápido";
        category = "Respostas Rápidas";
      } else if (idLower.includes("sol")) {
        friendlyName = "ORVEXA Codex (" + mId + ")";
        badge = "Especialista";
        category = "Engenharia";
      } else if (idLower.includes("terra")) {
        friendlyName = "ORVEXA Análise (" + mId + ")";
        badge = "Documentos";
        category = "Análise Documental";
      }

      return {
        id: mId,
        identifier: mId,
        name: friendlyName,
        badge,
        category,
        provider: apiInfo.name,
        maxContextTokens: 128000,
        status: "OPERATIONAL" as const,
      };
    });

    // 3. Avaliação de Capacidades por Tipo
    const hasTextModel = isConfigured && (accountCapabilities.includes("TEXTO") || activeModelIds.size > 0);
    const hasCodeModel = isConfigured && (
      accountCapabilities.includes("CODIGO") ||
      Array.from(activeModelIds).some((id) => id.includes("code") || id.includes("sol") || id.includes("codex") || id.includes("dev") || id.includes("gpt-4"))
    );
    const hasDocsModel = isConfigured && (
      accountCapabilities.includes("DOCUMENTO") ||
      Array.from(activeModelIds).some((id) => id.includes("terra") || id.includes("doc") || id.includes("rag") || id.includes("gpt-4"))
    );
    const hasImageModel = isConfigured && (
      accountCapabilities.includes("IMAGEM") ||
      Array.from(activeModelIds).some((id) => id.includes("dall-e") || id.includes("flux") || id.includes("image"))
    );
    const hasVideoModel = isConfigured && accountCapabilities.includes("VIDEO");

    const capabilities: CapabilityItem[] = [
      {
        name: "Texto & Raciocínio",
        key: "TEXT",
        supported: hasTextModel,
        icon: "MessageSquare",
        description: "Geração textual fluida, conversação multilíngue, raciocínio lógico e Smart Router.",
        activeModels: Array.from(activeModelIds),
        reason: hasTextModel ? undefined : "Nenhum modelo de processamento de linguagem natural ativo.",
      },
      {
        name: "Engenharia de Código",
        key: "CODE",
        supported: hasCodeModel,
        icon: "Code2",
        description: "Geração, depuração, refatoração de código TypeScript/Python e modelagem Prisma.",
        activeModels: Array.from(activeModelIds).filter((id) => id.includes("sol") || id.includes("code") || id.includes("dev")),
        reason: hasCodeModel ? undefined : "Requer modelo com especialização em código ativo.",
      },
      {
        name: "Análise de Documentos (RAG)",
        key: "DOCS",
        supported: hasDocsModel,
        icon: "FileText",
        description: "Processamento e extração contextual de PDFs, TXTs, planilhas e busca semântica.",
        activeModels: Array.from(activeModelIds).filter((id) => id.includes("terra") || id.includes("doc")),
        reason: hasDocsModel ? undefined : "Requer modelo com suporte a leitura de documentos e arquivos ativo.",
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

    const activeProviderSlug = (activeAccount?.provider || "").toLowerCase();

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

      // Regra 0: Se não há API ativa configurada, nenhum agente pode operar
      if (!isConfigured || activeModelIds.size === 0) {
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
          capabilityNeeded: "API de Inteligência Artificial Ativa",
          reason: "Nenhuma API de Inteligência Artificial ativa cadastrada no sistema.",
        });
        continue;
      }

      // Critério 1: Incompatibilidade com Anthropic Claude
      if (
        (slugLower.includes("claude") ||
          slugLower.includes("fable") ||
          nameLower.includes("claude") ||
          modelLower.includes("claude")) &&
        activeProviderSlug !== "anthropic"
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
        activeProviderSlug !== "google"
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
