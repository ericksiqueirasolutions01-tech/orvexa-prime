// src/app/api/ai/models/route.ts
// LISTAGEM DINÂMICA DE MODELOS ATIVOS E COMPATÍVEIS — ORVEXA PRIME

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

    // 1. Verifica se há contas de API ativas na tabela mestra oficial
    const [activeAccounts, activeApiKeys] = await Promise.all([
      prisma.aiProviderAccount.findMany({
        where: { status: "ACTIVE" },
      }),
      prisma.apiKey.findMany({
        where: { status: "ACTIVE" },
      }),
    ]);

    if (activeAccounts.length === 0 && activeApiKeys.length === 0) {
      return NextResponse.json({
        success: true,
        activeApiConfigured: false,
        message: "Nenhuma IA configurada pelo administrador.",
        models: [getModelDisplayInfo("orvexa-prime")],
      });
    }

    // 2. Extrai modelos detectados das contas ativas
    const detectedModelIds = new Set<string>();
    for (const acc of activeAccounts) {
      try {
        const list: string[] = JSON.parse(acc.modelsDetected || acc.detectedModels || "[]");
        list.forEach((m) => detectedModelIds.add(m));
      } catch {}
    }

    // 3. Busca modelos ativos no banco
    const dbModels = await prisma.aiModel.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    dbModels.forEach((m) => detectedModelIds.add(m.modelIdentifier));

    // 4. Monta a lista formatada com nomes amigáveis sem expor detalhes técnicos
    const modelsList = [
      // Opção inteligente ORVEXA Auto
      getModelDisplayInfo("orvexa-prime"),
      // Modelos suportados pela API ativa
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
