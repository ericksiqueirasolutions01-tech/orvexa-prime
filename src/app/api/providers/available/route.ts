// src/app/api/providers/available/route.ts
// CONSULTA DE APIS ATIVAS E MODELOS DISPONÍVEIS — ORVEXA PRIME CLIENTE
// Fonte Única da Verdade: ai_provider_registry

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiRegistryService } from "@/ai/registry/api-registry.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const result = await ApiRegistryService.getClientAvailable();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Available Providers GET Error]:", error);
    return NextResponse.json(
      {
        available: false,
        activeCount: 0,
        providers: [],
        models: [],
        capabilities: [],
        error: error.message || "Erro ao consultar provedores disponíveis.",
      },
      { status: 500 }
    );
  }
}
