// src/app/api/admin/ai-monitor/logs/route.ts
// CONSULTA FILTRADA E PAGINADA DE HISTÓRICO DE CONSUMO (AI_USAGE_LOGS) — ORVEXA PRIME

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");
    const model = searchParams.get("model");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (provider && provider !== "ALL") where.provider = provider.toLowerCase();
    if (model && model !== "ALL") where.model = { contains: model };
    if (status && status !== "ALL") where.status = status;

    const [logs, total] = await Promise.all([
      prisma.aiUsageLog.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.aiUsageLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[API AI Monitor Logs Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao carregar logs." },
      { status: 500 }
    );
  }
}

