// src/app/api/ai/models/route.ts
// LISTAGEM DINÂMICA DE MODELOS ATIVOS E COMPATÍVEIS — ORVEXA PRIME
// Fonte Única da Verdade: ai_provider_registry

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModelDisplayInfo } from "@/lib/model-names";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // 1. Verifica se há contas de API ativas na tabela mestra oficial (ai_provider_registry)
    const activeRegistries = await prisma.aiProviderRegistry.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    if (activeRegistries.length === 0) {
      return NextResponse.json({
        success: true,
        activeApiConfigured: false,
        message: "Nenhuma API de Inteligência Artificial configurada. Solicite ao administrador a configuração de uma chave.",
        models: [],
        defaultModelId: "",
      });
    }

    // 2. Extrai modelos detectados EXCLUSIVAMENTE das contas ativas em ai_provider_registry
    const detectedModelIds = new Set<string>();
    for (const reg of activeRegistries) {
      try {
        const list: string[] = JSON.parse(reg.modelsJson || "[]");
        list.forEach((m) => {
          if (m && typeof m === "string" && m.trim()) {
            detectedModelIds.add(m.trim());
          }
        });
      } catch {}
    }

    if (detectedModelIds.size === 0) {
      return NextResponse.json({
        success: true,
        activeApiConfigured: false,
        message: "Nenhum modelo detectado na API ativa.",
        models: [],
        defaultModelId: "",
      });
    }

    // 3. Monta a lista formatada com nomes amigáveis sem expor detalhes técnicos
    const modelsList = [
      // Opção inteligente ORVEXA Auto
      getModelDisplayInfo("orvexa-prime"),
      // Apenas os modelos detectados na API ativa
      ...Array.from(detectedModelIds).map((mId) => {
        return getModelDisplayInfo(mId);
      }),
    ];

    return NextResponse.json({
      success: true,
      activeApiConfigured: true,
      models: modelsList,
      defaultModelId: "orvexa-prime",
    });
  } catch (error: any) {
    console.error("[Models GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar modelos disponíveis: " + error.message },
      { status: 500 }
    );
  }
}
