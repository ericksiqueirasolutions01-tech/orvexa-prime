// src/app/api/admin/ai-monitor/test/route.ts
// EXECUÇÃO DE DIAGNÓSTICO E HEALTH CHECK SOB DEMANDA — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AIMonitorService } from "@/ai/monitoring/ai-monitor.service";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { providerSlug } = body;

    if (!providerSlug || providerSlug === "all") {
      const results = await AIMonitorService.checkAllProvidersHealth();
      return NextResponse.json({
        success: true,
        message: "Diagnóstico completo executado para todos os provedores.",
        results,
      });
    }

    const result = await AIMonitorService.checkProviderHealth(providerSlug);
    return NextResponse.json({
      success: true,
      provider: providerSlug,
      result,
    });
  } catch (err: any) {
    console.error("[API AI Monitor Test Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao executar diagnóstico do provedor." },
      { status: 500 }
    );
  }
}

