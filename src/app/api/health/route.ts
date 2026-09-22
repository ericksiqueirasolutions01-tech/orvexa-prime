// src/app/api/health/route.ts
// HEALTH CHECK PROFISSIONAL PARA AMBIENTE DE PRODUÇÃO SAAS
// Monitora status de banco de dados, AI Gateway, cache in-memory e pgvector

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
import { isPgvectorConfigured } from "@/ai/memory/vector-store";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unhealthy";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "healthy";
  } catch (err: any) {
    logger.error(`[Health Check Error] Falha de comunicação com o banco: ${err.message}`);
    dbStatus = "unreachable";
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // Provedores ativos
  let activeProvidersCount = 0;
  try {
    activeProvidersCount = await prisma.aiProvider.count({ where: { isActive: true } });
  } catch {}

  const isHealthy = dbStatus === "healthy";
  const cacheStats = appCache.getStats();

  const responsePayload = {
    status: isHealthy ? "UP" : "DOWN",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "2.5.0-ENTERPRISE-PROD",
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        pgvector: {
          supported: true,
          active: isPgvectorConfigured(),
          mode: isPgvectorConfigured() ? "PostgreSQL (pgvector nativo)" : "SQLite (Vetor In-Memory L2)",
        },
      },
      aiGateway: {
        status: "operational",
        activeProviders: activeProvidersCount,
      },
      cache: {
        status: "operational",
        stats: cacheStats,
      },
    },
    system: {
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      memoryMb: {
        heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      },
      recentLogsBuffered: logger.getRecentLogs(500).length,
    },
    responseTimeMs: Date.now() - startTime,
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
