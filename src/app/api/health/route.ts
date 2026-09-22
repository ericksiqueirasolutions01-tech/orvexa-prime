import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    console.error("[Health Check DB Error]:", err.message);
    dbStatus = "unreachable";
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // Conta provedores ativos
  let activeProvidersCount = 0;
  try {
    activeProvidersCount = await prisma.aiProvider.count({ where: { isActive: true } });
  } catch {}

  const isHealthy = dbStatus === "healthy";

  const responsePayload = {
    status: isHealthy ? "UP" : "DOWN",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0-PROD",
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      aiGateway: {
        status: "operational",
        activeProviders: activeProvidersCount,
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
    },
    responseTimeMs: Date.now() - startTime,
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
  });
}

