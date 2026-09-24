// src/app/api/ai/models/route.ts
// LISTAGEM DINÂMICA DE MODELOS ATIVOS E COMPATÍVEIS — ORVEXA PRIME

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModelDisplayInfo } from "@/lib/model-names";
import { ensureActiveAccountInDatabase } from "@/lib/serverless-sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Sincroniza se o container efêmero acabou de cold-startar
    await ensureActiveAccountInDatabase(req);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // 1. Verifica se há contas de API ativas na tabela mestra oficial (ai_provider_accounts)
    const activeAccounts = await prisma.aiProviderAccount.findMany({
      where: { status: { in: ["ACTIVE", "CONNECTED"] } },
    });

    if (activeAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        activeApiConfigured: false,
        message: "Nenhuma IA configurada pelo administrador.",
        models: [],
        defaultModelId: "",
      });
    }

    // 2. Extrai modelos detectados EXCLUSIVAMENTE das contas ativas em ai_provider_accounts
    const detectedModelIds = new Set<string>();
    for (const acc of activeAccounts) {
      try {
        const list: string[] = JSON.parse(acc.modelsDetected || acc.detectedModels || "[]");
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
