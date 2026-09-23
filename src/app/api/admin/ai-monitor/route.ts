// src/app/api/admin/ai-monitor/route.ts
// API PRINCIPAL DO AI OPERATIONS DASHBOARD — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIMonitorService } from "@/ai/monitoring/ai-monitor.service";

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    // Busca dados dos cards de provedores, visão geral e alertas operacionais
    const [overview, providers, alerts, recentLogs] = await Promise.all([
      AIMonitorService.getDashboardOverview(),
      AIMonitorService.getProviderCardsData(),
      AIMonitorService.getOperationalAlerts(),
      prisma.aiUsageLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    // Agregação dos últimos 7 dias para visualização em gráficos
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const timelineLogs = await prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: {
        provider: true,
        totalTokens: true,
        cost: true,
        costBrl: true,
        latencyMs: true,
        createdAt: true,
      },
    });

    const daysMap: Record<string, { date: string; openai: number; anthropic: number; google: number; mirai: number; costUsd: number; costBrl: number; avgLatency: number; count: number }> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayKey = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      daysMap[dayKey] = {
        date: dayKey,
        openai: 0,
        anthropic: 0,
        google: 0,
        mirai: 0,
        costUsd: 0,
        costBrl: 0,
        avgLatency: 0,
        count: 0,
      };
    }

    for (const log of timelineLogs) {
      const dayKey = new Date(log.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (daysMap[dayKey]) {
        const p = log.provider.toLowerCase();
        if (p.includes("openai") || p === "codex") daysMap[dayKey].openai += log.totalTokens;
        else if (p.includes("anthropic") || p.includes("claude")) daysMap[dayKey].anthropic += log.totalTokens;
        else if (p.includes("google") || p.includes("gemini")) daysMap[dayKey].google += log.totalTokens;
        else daysMap[dayKey].mirai += log.totalTokens;

        daysMap[dayKey].costUsd += log.cost;
        daysMap[dayKey].costBrl += log.costBrl;
        daysMap[dayKey].avgLatency += log.latencyMs;
        daysMap[dayKey].count += 1;
      }
    }

    const chartData = Object.values(daysMap).map((d) => ({
      ...d,
      costUsd: Number(d.costUsd.toFixed(4)),
      costBrl: Number(d.costBrl.toFixed(2)),
      avgLatency: d.count > 0 ? Math.round(d.avgLatency / d.count) : 0,
    }));

    return NextResponse.json({
      success: true,
      overview,
      providers,
      alerts,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        user: log.user ? { name: log.user.name, email: log.user.email } : null,
        provider: log.provider,
        model: log.model,
        tokensInput: log.tokensInput,
        tokensOutput: log.tokensOutput,
        totalTokens: log.totalTokens,
        cost: log.cost,
        costBrl: log.costBrl,
        latencyMs: log.latencyMs,
        statusCode: log.statusCode,
        status: log.status,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt.toISOString(),
      })),
      chartData,
    });
  } catch (err: any) {
    console.error("[API AI Monitor Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao carregar dados do monitor de IA." },
      { status: 500 }
    );
  }
}

