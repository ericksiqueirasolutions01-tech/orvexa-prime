// src/app/api/admin/system/diagnostics/route.ts
// ENDPOINT ADMINISTRATIVO DE DIAGNÓSTICO & SAÚDE DO SISTEMA
// Executa bateria de testes sob demanda e emite relatório técnico consolidado

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runSystemDiagnostics, DiagnosticReport } from "@/lib/diagnostics";
import { appCache } from "@/lib/cache";
import { recordAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

const CACHE_KEY = "system:diagnostics:latest";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const forceFresh = searchParams.get("fresh") === "true";

    if (!forceFresh) {
      const cached = appCache.get<DiagnosticReport>(CACHE_KEY);
      if (cached) {
        return NextResponse.json({ success: true, cached: true, report: cached });
      }
    }

    const report = await runSystemDiagnostics();
    appCache.set(CACHE_KEY, report, 15); // Cache por 15 segundos

    return NextResponse.json({ success: true, cached: false, report });
  } catch (error: any) {
    logger.error("Erro ao gerar diagnóstico do sistema", error);
    return NextResponse.json(
      { error: "Falha ao processar diagnóstico do sistema.", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 }
      );
    }

    const report = await runSystemDiagnostics();
    appCache.set(CACHE_KEY, report, 15);

    await recordAuditEvent({
      actorId: session.id,
      action: "SYSTEM_DIAGNOSTICS_EXECUTED",
      resourceType: "SECURITY",
      details: {
        score: report.overallScore,
        status: report.overallStatus,
        durationMs: report.summary.durationMs,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bateria de testes e diagnóstico executados com sucesso!",
      report,
    });
  } catch (error: any) {
    logger.error("Erro ao executar bateria de testes", error);
    return NextResponse.json(
      { error: "Falha na execução dos testes do sistema.", details: error?.message },
      { status: 500 }
    );
  }
}

