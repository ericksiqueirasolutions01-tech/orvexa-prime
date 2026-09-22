// src/app/api/admin/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAuditRecords, recordAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "AUDIT_DB";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const action = searchParams.get("action") || undefined;
    const resourceType = searchParams.get("resourceType") || undefined;
    const level = (searchParams.get("level") as any) || undefined;

    if (source === "SYSTEM_LOGS") {
      const logs = logger.getRecentLogs(limit, level);
      return NextResponse.json({
        source: "SYSTEM_LOGS",
        total: logs.length,
        logs,
      });
    }

    // Consulta registros persistidos na tabela AuditLog
    const auditData = await getAuditRecords({
      page,
      limit,
      action,
      resourceType,
    });

    // Métricas rápidas de segurança
    const [loginCount, blocksCount] = await Promise.all([
      prisma.auditLog.count({ where: { action: "USER_LOGIN" } }),
      prisma.auditLog.count({ where: { action: { contains: "BLOCK" } } }),
    ]);

    return NextResponse.json({
      source: "AUDIT_DB",
      metrics: {
        totalAuditRecords: auditData.total,
        loginEventsCount: loginCount,
        securityBlocksCount: blocksCount,
        systemLogsBuffered: logger.getRecentLogs(500).length,
      },
      ...auditData,
    });
  } catch (error: any) {
    console.error("[Admin Audit GET Error]", error);
    return NextResponse.json({ error: "Falha ao consultar auditoria." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const body = await req.json();
    const { action = "ADMIN_TEST_AUDIT", resourceType = "SECURITY", details } = body;

    const record = await recordAuditEvent({
      actorId: session.id,
      action,
      resourceType,
      details,
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    console.error("[Admin Audit POST Error]", error);
    return NextResponse.json({ error: "Falha ao registrar auditoria." }, { status: 500 });
  }
}
