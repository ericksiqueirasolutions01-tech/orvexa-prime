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

    // 1. Verifica se há chaves de API ativas
    const activeApiKeys = await prisma.apiKey.findMany({
      where: { status: "ACTIVE" },
      select: { provider: true, keyHint: true, customBaseUrl: true },
    });

    if (activeApiKeys.length === 0) {
      return NextResponse.json({
        success: true,
        activeApiConfigured: false,
        message: "Nenhuma IA configurada pelo administrador.",
        models: [],
      });
    }

    // 2. Busca modelos ativos no banco
    const dbModels = await prisma.aiModel.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // 3. Monta a lista formatada com nomes amigáveis
    const modelsList = [
      // Opção inteligente ORVEXA Auto
      getModelDisplayInfo("orvexa-prime"),
      // Modelos suportados pela API ativa
      ...dbModels.map((m) => {
        return getModelDisplayInfo(m.modelIdentifier);
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
