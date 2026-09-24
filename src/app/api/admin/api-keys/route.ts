// src/app/api/admin/api-keys/route.ts
// GERENCIADOR CENTRAL DE CONTAS & CHAVES DE API — ORVEXA PRIME DIGITAL
// Tabela Mestra Oficial Única: ai_provider_registry

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiRegistryService } from "@/ai/registry/api-registry.service";
import { appCache } from "@/lib/cache";
import {
  serializeAccountToCookieValue,
  removeLocalDiskSnapshot,
  SYNC_COOKIE_NAME,
} from "@/lib/serverless-sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  // 1. Busca todas as contas no Registry Oficial Único (ai_provider_registry)
  const [safeKeys, providers] = await Promise.all([
    ApiRegistryService.listAll(),
    prisma.aiProvider.findMany({
      include: {
        models: {
          select: { id: true, name: true, modelIdentifier: true },
        },
      },
    }),
  ]);

  return NextResponse.json({ keys: safeKeys, providers });
}

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    const body = await req.json();
    let {
      providerId,
      providerSlug,
      provider,
      name,
      rawApiKey,
      apiKey,
      priority = 1,
      tokenLimitMonthly,
      quotaLimit,
      customBaseUrl,
      baseUrl,
      capabilities,
      detectedModels: bodyDetectedModels,
      models: bodyModels,
      forceSave,
    } = body;

    const targetUrl = (baseUrl || customBaseUrl || "").trim();
    let targetSlug = (providerSlug || provider || providerId || "openai").toLowerCase();

    // Se providerId for um UUID de AiProvider
    if (providerId && providerId.length > 20) {
      const match = await prisma.aiProvider.findUnique({ where: { id: providerId } });
      if (match) targetSlug = match.slug.toLowerCase();
    }

    const cleanRawKey = (rawApiKey || apiKey || "").trim();

    // Registra na tabela mestra oficial ai_provider_registry
    const registrationResult = await ApiRegistryService.testAndRegister({
      provider: targetSlug,
      name,
      baseUrl: targetUrl || null,
      rawApiKey: cleanRawKey,
      priority: Number(priority) || 1,
      quotaLimit: Number(quotaLimit || tokenLimitMonthly) || 0,
      capabilities,
      models: Array.isArray(bodyDetectedModels) && bodyDetectedModels.length > 0 ? bodyDetectedModels : bodyModels,
      createdBy: session.id,
      forceSave: Boolean(forceSave),
    });

    const savedAccount = registrationResult.account;
    const testResult = registrationResult.testResult;

    // Sincronização secundária com tabelas legadas para compatibilidade total
    try {
      const encryptedKey = (await prisma.aiProviderRegistry.findUnique({ where: { id: savedAccount.id } }))?.encryptedApiKey || "";
      const reg = await prisma.aiProviderRegistry.findUnique({ where: { id: savedAccount.id } });

      await prisma.aiProviderAccount.upsert({
        where: { id: savedAccount.id },
        update: {
          name: savedAccount.name,
          accountName: savedAccount.name,
          baseUrl: savedAccount.baseUrl,
          customBaseUrl: savedAccount.baseUrl,
          modelsDetected: JSON.stringify(savedAccount.modelsDetected),
          capabilities: JSON.stringify(savedAccount.capabilities),
          quotaLimit: savedAccount.tokenLimitMonthly,
          status: "ACTIVE",
          priority: savedAccount.priority,
          lastTestedAt: new Date(),
          lastLatencyMs: savedAccount.lastLatencyMs,
        },
        create: {
          id: savedAccount.id,
          provider: savedAccount.provider,
          name: savedAccount.name,
          accountName: savedAccount.name,
          baseUrl: savedAccount.baseUrl,
          customBaseUrl: savedAccount.baseUrl,
          encryptedApiKey: encryptedKey,
          encryptedKey,
          iv: reg?.iv,
          authTag: reg?.authTag,
          keyHint: savedAccount.keyHint,
          apiKeyMasked: savedAccount.keyHint,
          modelsDetected: JSON.stringify(savedAccount.modelsDetected),
          capabilities: JSON.stringify(savedAccount.capabilities),
          quotaLimit: savedAccount.tokenLimitMonthly,
          totalQuota: savedAccount.tokenLimitMonthly,
          tokensUsed: 0,
          usedQuota: 0,
          tokensRemaining: savedAccount.tokenLimitMonthly,
          remainingQuota: savedAccount.tokenLimitMonthly,
          status: "ACTIVE",
          priority: savedAccount.priority,
          createdBy: session.id,
          lastTestedAt: new Date(),
          lastLatencyMs: savedAccount.lastLatencyMs,
          lastSync: new Date(),
        },
      }).catch(() => {});

      let dbProvider = await prisma.aiProvider.findUnique({ where: { slug: targetSlug } });
      if (!dbProvider) {
        dbProvider = await prisma.aiProvider.create({
          data: {
            slug: targetSlug,
            name: targetSlug === "openai" ? "OpenAI Compatible" : targetSlug.toUpperCase(),
            baseUrl: targetUrl || null,
            isActive: true,
          },
        }).catch(() => null);
      } else if (targetUrl && !dbProvider.baseUrl) {
        await prisma.aiProvider.update({
          where: { id: dbProvider.id },
          data: { baseUrl: targetUrl },
        }).catch(() => {});
      }

      if (dbProvider) {
        await prisma.apiKey.create({
          data: {
            providerId: dbProvider.id,
            name: savedAccount.name,
            encryptedKey,
            iv: reg?.iv || "",
            authTag: reg?.authTag || "",
            keyHint: savedAccount.keyHint,
            priority: savedAccount.priority,
            tokenLimitMonthly: savedAccount.tokenLimitMonthly,
            customBaseUrl: targetUrl || null,
            capabilities: JSON.stringify(savedAccount.capabilities),
            status: "ACTIVE",
          },
        }).catch(() => {});
      }

      if (targetSlug === "openai" && targetUrl) {
        await prisma.systemSetting.upsert({
          where: { key: "openai_base_url" },
          update: { value: targetUrl },
          create: { key: "openai_base_url", value: targetUrl, category: "AI" },
        }).catch(() => {});
      }
    } catch (syncErr) {
      console.warn("[Admin API Keys] Aviso na sincronização secundária:", syncErr);
    }

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        actorId: session.id,
        action: "API_REGISTRY_CREATED",
        resourceType: "API_REGISTRY",
        resourceId: savedAccount.id,
        details: JSON.stringify({
          provider: savedAccount.provider,
          name: savedAccount.name,
          baseUrl: savedAccount.baseUrl,
          modelsDetected: savedAccount.modelsDetected,
          capabilities: savedAccount.capabilities,
          latencyMs: testResult.latencyMs,
        }),
      },
    }).catch(() => {});

    // Limpeza de cache in-memory
    appCache.clear();

    const allActiveAccounts = await prisma.aiProviderRegistry.findMany({
      where: { isActive: true, status: "ACTIVE" },
      orderBy: { priority: "asc" },
    });
    const cookieVal = serializeAccountToCookieValue(allActiveAccounts as any);

    const response = NextResponse.json({
      success: true,
      message: `API "${savedAccount.name}" validada e gravada definitivamente com ${savedAccount.modelsDetected.length} modelos detectados!`,
      account: savedAccount,
    });

    if (cookieVal) {
      response.cookies.set(SYNC_COOKIE_NAME, cookieVal, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 31536000,
      });
    }

    return response;
  } catch (error: any) {
    console.error("[Create API Key Error]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gravar API no banco oficial." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    const { keyId, status, priority, resetQuota, capabilities, tokenLimitMonthly, quotaLimit } = await req.json();

    if (!keyId) {
      return NextResponse.json({ error: "ID da conta não informado." }, { status: 400 });
    }

    const limit = quotaLimit || tokenLimitMonthly;
    const updated = await ApiRegistryService.update(keyId, {
      status,
      priority: priority !== undefined ? Number(priority) : undefined,
      quotaLimit: limit !== undefined ? Number(limit) : undefined,
      resetQuota: Boolean(resetQuota),
      capabilities: Array.isArray(capabilities) ? capabilities : undefined,
    }).catch(async () => {
      // Se não achar em ai_provider_registry, tenta aiProviderAccount
      return await prisma.aiProviderAccount.update({
        where: { id: keyId },
        data: {
          status: status || undefined,
          priority: priority !== undefined ? Number(priority) : undefined,
          quotaLimit: limit !== undefined ? Number(limit) : undefined,
        },
      });
    });

    appCache.clear();

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar conta de API: " + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
  }

  // 1. Remove da tabela mestra oficial ai_provider_registry
  await ApiRegistryService.delete(keyId).catch(() => {});

  // 2. Remove de tabelas secundárias/legadas
  const account = await prisma.aiProviderAccount.findUnique({ where: { id: keyId } });
  if (account) {
    await prisma.aiProviderAccount.delete({ where: { id: keyId } }).catch(() => {});
    await prisma.apiKey.deleteMany({
      where: {
        OR: [
          { id: keyId },
          { encryptedKey: (account.encryptedApiKey || account.encryptedKey) ?? undefined },
          { name: account.name },
        ],
      },
    }).catch(() => {});
  } else {
    await prisma.apiKey.delete({ where: { id: keyId } }).catch(() => {});
    await prisma.aiProviderAccount.deleteMany({ where: { id: keyId } }).catch(() => {});
  }

  // Verifica se restou alguma conta ativa no registry oficial
  const remainingCount = await prisma.aiProviderRegistry.count({
    where: { isActive: true, status: "ACTIVE" },
  });

  if (remainingCount === 0) {
    await prisma.systemSetting.deleteMany({
      where: { key: "openai_base_url" },
    }).catch(() => {});
  }

  // Limpeza de cache in-memory e snapshots locais
  appCache.clear();
  removeLocalDiskSnapshot();

  await prisma.auditLog.create({
    data: {
      actorId: session.id,
      action: "API_REGISTRY_DELETED",
      resourceType: "API_REGISTRY",
      resourceId: keyId,
    },
  }).catch(() => {});

  const remainingRegistries = await prisma.aiProviderRegistry.findMany({
    where: { isActive: true, status: "ACTIVE" },
    orderBy: { priority: "asc" },
  });

  const response = NextResponse.json({
    success: true,
    message: "API removida com sucesso da base definitiva.",
  });

  if (remainingRegistries.length > 0) {
    const cookieVal = serializeAccountToCookieValue(remainingRegistries as any);
    response.cookies.set(SYNC_COOKIE_NAME, cookieVal, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 31536000,
    });
  } else {
    response.cookies.set(SYNC_COOKIE_NAME, "", {
      path: "/",
      httpOnly: true,
      maxAge: 0,
    });
  }

  return response;
}
