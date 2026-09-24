// src/app/api/admin/api-keys/route.ts
// GERENCIADOR CENTRAL DE CONTAS & CHAVES DE API — ORVEXA PRIME DIGITAL
// Tabela Mestra Oficial: ai_provider_accounts (com sincronização em cascata para ApiKey & AiModel)

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  // 1. Busca todas as contas na tabela mestra oficial ai_provider_accounts
  const [accounts, providers] = await Promise.all([
    prisma.aiProviderAccount.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.aiProvider.findMany({
      include: {
        models: {
          select: { id: true, name: true, modelIdentifier: true },
        },
      },
    }),
  ]);

  // Se por ventura a tabela mestra estiver vazia mas houver registros em ApiKey, migra automaticamente
  if (accounts.length === 0) {
    const fallbackKeys = await prisma.apiKey.findMany({
      include: { provider: true },
    });
    for (const fk of fallbackKeys) {
      let parsedCaps = ["TEXTO"];
      try {
        parsedCaps = JSON.parse(fk.capabilities || "[\"TEXTO\"]");
      } catch {}

      await prisma.aiProviderAccount.create({
        data: {
          provider: fk.provider?.slug || "openai",
          name: fk.name,
          accountName: fk.name,
          baseUrl: fk.customBaseUrl,
          customBaseUrl: fk.customBaseUrl,
          encryptedApiKey: fk.encryptedKey,
          encryptedKey: fk.encryptedKey,
          iv: fk.iv,
          authTag: fk.authTag,
          keyHint: fk.keyHint,
          apiKeyMasked: fk.keyHint,
          capabilities: JSON.stringify(parsedCaps),
          quotaLimit: fk.tokenLimitMonthly || 10000000,
          totalQuota: fk.tokenLimitMonthly || 10000000,
          tokensUsed: fk.tokensUsedMonth || 0,
          usedQuota: fk.tokensUsedMonth || 0,
          tokensRemaining: Math.max(0, (fk.tokenLimitMonthly || 10000000) - (fk.tokensUsedMonth || 0)),
          remainingQuota: Math.max(0, (fk.tokenLimitMonthly || 10000000) - (fk.tokensUsedMonth || 0)),
          status: fk.status || "ACTIVE",
          priority: fk.priority || 1,
        },
      }).catch(() => {});
    }
  }

  // Reconsulta garantindo todos os dados da tabela mestra
  const masterAccounts = await prisma.aiProviderAccount.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  // Sanitiza para JAMAIS retornar o cipherText cru para o frontend
  const safeKeys = masterAccounts.map((acc) => {
    let parsedCapabilities: string[] = ["TEXTO"];
    try {
      parsedCapabilities = JSON.parse(acc.capabilities || "[\"TEXTO\"]");
    } catch {}

    let parsedModels: string[] = [];
    try {
      parsedModels = JSON.parse(acc.modelsDetected || acc.detectedModels || "[]");
    } catch {}

    const totalLimit = acc.quotaLimit || acc.totalQuota || 0;
    const used = acc.tokensUsed || acc.usedQuota || 0;
    const tokensRemaining = totalLimit > 0 ? Math.max(0, totalLimit - used) : acc.tokensRemaining || 10000000;
    const percentUsed = totalLimit > 0 ? Math.min(100, Math.round((used / totalLimit) * 100)) : 0;

    let dynamicStatus = acc.status;
    if (acc.status !== "DISABLED" && totalLimit > 0) {
      if (used >= totalLimit) {
        dynamicStatus = "BLOCKED_QUOTA";
      } else if (percentUsed >= 90) {
        dynamicStatus = "WARNING_90";
      }
    }

    const matchedProvider = providers.find(
      (p) => p.slug.toLowerCase() === acc.provider.toLowerCase()
    );

    return {
      id: acc.id,
      name: acc.name || acc.accountName || "API AI Gateway",
      providerId: matchedProvider?.id || acc.provider,
      providerName: matchedProvider?.name || (acc.provider === "openai" ? "OpenAI Compatible" : acc.provider.toUpperCase()),
      providerSlug: acc.provider,
      keyHint: acc.keyHint || acc.apiKeyMasked || "sk-...****",
      tokenLimitMonthly: totalLimit,
      tokensUsedMonth: used,
      tokensRemaining,
      percentUsed,
      costAccumulatedCents: Math.round((acc.estimatedCostUsd || 0) * 100),
      capabilities: parsedCapabilities,
      modelsDetected: parsedModels,
      priority: acc.priority || 1,
      customBaseUrl: acc.baseUrl || acc.customBaseUrl,
      baseUrl: acc.baseUrl || acc.customBaseUrl,
      status: dynamicStatus,
      lastLatencyMs: acc.lastLatencyMs || 0,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    };
  });

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
      priority = 1,
      tokenLimitMonthly,
      quotaLimit,
      customBaseUrl,
      baseUrl,
      capabilities,
    } = body;

    const targetUrl = (baseUrl || customBaseUrl || "").trim();
    let targetSlug = (providerSlug || provider || providerId || "openai").toLowerCase();

    // Se providerId for um UUID de AiProvider
    if (providerId && providerId.length > 20) {
      const match = await prisma.aiProvider.findUnique({ where: { id: providerId } });
      if (match) targetSlug = match.slug.toLowerCase();
    }

    if (!name || !name.trim()) {
      name = targetUrl.includes("clipoos") ? "Clipoos Produção" : "Nova API AI Gateway";
    }

    if (!rawApiKey || !rawApiKey.trim()) {
      return NextResponse.json(
        { error: "A chave secreta da API (API Key) é obrigatória." },
        { status: 400 }
      );
    }

    const cleanRawKey = rawApiKey.trim();

    // 1. FASE 5: Teste Automático de Conexão e Descoberta de Modelos (GET /models)
    console.log(`[API Registration] Testando conexão com ${targetSlug} em ${targetUrl || "padrão"}...`);
    const testResult = await AIProviderService.testConnection({
      providerSlug: targetSlug,
      apiKey: cleanRawKey,
      customBaseUrl: targetUrl || null,
    });

    const forceSave = Boolean(body.forceSave);

    if (!testResult.success && !forceSave) {
      return NextResponse.json(
        {
          error: `Falha ao validar API: ${testResult.message}. Verifique a URL e a API Key.`,
          details: testResult.details,
          errorCode: testResult.errorCode,
          canForceSave: true,
        },
        { status: 400 }
      );
    }

    const detectedModels = testResult.detectedModels && testResult.detectedModels.length > 0
      ? testResult.detectedModels
      : (Array.isArray(body.models) && body.models.length > 0 ? body.models : ["gpt-4o", "gpt-4o-mini"]);

    console.log(`[API Registration] Modelos registrados para ${name}:`, detectedModels);

    // Mapeamento automático de Modelo -> Capacidade
    const inferredCaps = AIProviderService.inferCapabilitiesFromModels(detectedModels);
    let finalCapabilities = ["TEXTO"];
    if (Array.isArray(capabilities) && capabilities.length > 0) {
      finalCapabilities = Array.from(new Set([...capabilities, ...inferredCaps]));
    } else {
      finalCapabilities = inferredCaps;
    }

    // 2. Criptografia AES-256-GCM
    const encrypted = encryptApiKey(cleanRawKey);
    const finalQuota = Number(quotaLimit || tokenLimitMonthly) || 10000000;

    // 3. FASE 2: Gravação na Tabela Mestra Oficial ai_provider_accounts
    const savedAccount = await prisma.aiProviderAccount.create({
      data: {
        provider: targetSlug,
        name: name.trim(),
        accountName: name.trim(),
        baseUrl: targetUrl || null,
        customBaseUrl: targetUrl || null,
        encryptedApiKey: encrypted.cipherText,
        encryptedKey: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyHint: encrypted.keyHint,
        apiKeyMasked: encrypted.keyHint,
        modelsDetected: JSON.stringify(detectedModels),
        detectedModels: JSON.stringify(detectedModels),
        capabilities: JSON.stringify(finalCapabilities),
        quotaLimit: finalQuota,
        totalQuota: finalQuota,
        tokensUsed: 0,
        usedQuota: 0,
        tokensRemaining: finalQuota,
        remainingQuota: finalQuota,
        status: "ACTIVE",
        priority: Number(priority) || 1,
        createdBy: session.id,
        lastTestedAt: new Date(),
        lastLatencyMs: testResult.latencyMs || 0,
        lastSync: new Date(),
      },
    });

    // 4. Sincronização em cascata com ApiKey e AiModel para compatibilidade total com Gateway e Smart Router
    let dbProvider = await prisma.aiProvider.findUnique({ where: { slug: targetSlug } });
    if (!dbProvider) {
      dbProvider = await prisma.aiProvider.create({
        data: {
          slug: targetSlug,
          name: targetSlug === "openai" ? "OpenAI Compatible" : targetSlug.toUpperCase(),
          baseUrl: targetUrl || null,
          isActive: true,
        },
      });
    } else if (targetUrl && !dbProvider.baseUrl) {
      await prisma.aiProvider.update({
        where: { id: dbProvider.id },
        data: { baseUrl: targetUrl },
      });
    }

    await prisma.apiKey.create({
      data: {
        providerId: dbProvider.id,
        name: name.trim(),
        encryptedKey: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyHint: encrypted.keyHint,
        priority: Number(priority) || 1,
        tokenLimitMonthly: finalQuota,
        customBaseUrl: targetUrl || null,
        capabilities: JSON.stringify(finalCapabilities),
        status: "ACTIVE",
      },
    });

    // Se detectou novos modelos, upsert no AiModel para o catálogo
    for (const modelId of detectedModels) {
      let category = "TEXT";
      const mLower = modelId.toLowerCase();
      if (mLower.includes("sol") || mLower.includes("code") || mLower.includes("developer")) category = "CODE";
      else if (mLower.includes("terra") || mLower.includes("doc")) category = "RESEARCH";

      await prisma.aiModel.upsert({
        where: { modelIdentifier: modelId },
        update: {
          isActive: true,
          capabilities: JSON.stringify(finalCapabilities),
        },
        create: {
          providerId: dbProvider.id,
          modelIdentifier: modelId,
          name: modelId,
          category,
          capabilities: JSON.stringify(finalCapabilities),
          isActive: true,
        },
      }).catch(() => {});
    }

    // Atualiza SystemSetting openai_base_url se for provedor OpenAI-compatível
    if (targetSlug === "openai" && targetUrl) {
      await prisma.systemSetting.upsert({
        where: { key: "openai_base_url" },
        update: { value: targetUrl },
        create: { key: "openai_base_url", value: targetUrl, category: "AI" },
      }).catch(() => {});
    }

    // 5. Registra auditoria
    await prisma.auditLog.create({
      data: {
        actorId: session.id,
        action: "API_ACCOUNT_CREATED",
        resourceType: "API_ACCOUNT",
        resourceId: savedAccount.id,
        details: JSON.stringify({
          provider: savedAccount.provider,
          name: savedAccount.name,
          baseUrl: savedAccount.baseUrl,
          modelsDetected: detectedModels,
          capabilities: finalCapabilities,
          latencyMs: testResult.latencyMs,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `API "${savedAccount.name}" validada e gravada definitivamente com ${detectedModels.length} modelos detectados!`,
      account: {
        id: savedAccount.id,
        name: savedAccount.name,
        provider: savedAccount.provider,
        baseUrl: savedAccount.baseUrl,
        keyHint: savedAccount.keyHint,
        modelsDetected: detectedModels,
        capabilities: finalCapabilities,
        latencyMs: testResult.latencyMs,
        status: savedAccount.status,
      },
    });
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
    const { keyId, status, priority, resetErrors, resetQuota, capabilities, tokenLimitMonthly, quotaLimit } = await req.json();

    if (!keyId) {
      return NextResponse.json({ error: "ID da conta não informado." }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority !== undefined) updateData.priority = Number(priority);
    const limit = quotaLimit || tokenLimitMonthly;
    if (limit !== undefined) {
      updateData.quotaLimit = Number(limit);
      updateData.totalQuota = Number(limit);
    }
    if (Array.isArray(capabilities)) {
      updateData.capabilities = JSON.stringify(capabilities);
    }
    if (resetQuota) {
      updateData.tokensUsed = 0;
      updateData.usedQuota = 0;
      updateData.status = "ACTIVE";
    }

    const updated = await prisma.aiProviderAccount.update({
      where: { id: keyId },
      data: updateData,
    }).catch(async () => {
      // Tenta localizar por ApiKey caso tenha vindo ID legado
      return await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          status: status || "ACTIVE",
          priority: priority !== undefined ? Number(priority) : undefined,
          tokensUsedMonth: resetQuota ? 0 : undefined,
        },
      });
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar conta de API." }, { status: 500 });
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

  // Remove da tabela mestra ai_provider_accounts
  await prisma.aiProviderAccount.delete({ where: { id: keyId } }).catch(() => {});
  // Remove também de ApiKey se houver chave associada
  await prisma.apiKey.delete({ where: { id: keyId } }).catch(() => {});

  await prisma.auditLog.create({
    data: {
      actorId: session.id,
      action: "API_ACCOUNT_DELETED",
      resourceType: "API_ACCOUNT",
      resourceId: keyId,
    },
  });

  return NextResponse.json({ success: true, message: "API removida com sucesso da base definitiva." });
}
