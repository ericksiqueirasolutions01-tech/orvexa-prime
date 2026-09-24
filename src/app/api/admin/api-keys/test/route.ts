// src/app/api/admin/api-keys/test/route.ts
// TESTE DE CONEXÃO DE PROVEDORES DE IA — ORVEXA PRIME DIGITAL
// Fonte Principal: ai_provider_registry

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";
import { ApiRegistryService } from "@/ai/registry/api-registry.service";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const { keyId, rawApiKey, customBaseUrl, providerSlug, modelIdentifier } = await req.json();

    let trimmedKey = rawApiKey?.trim() || "";
    let baseUrl = customBaseUrl?.trim() || "";
    let detectedProvider = providerSlug || "openai";
    let targetType: "registry" | "account" | "apiKey" | null = null;
    let targetRecord: any = null;

    // Se fornecido keyId, recupera e decripta a chave do banco com segurança
    if (keyId) {
      // 1. Procura primeiro na tabela mestra oficial ai_provider_registry
      const registryRecord = await prisma.aiProviderRegistry.findUnique({
        where: { id: keyId },
      });

      if (registryRecord) {
        targetType = "registry";
        targetRecord = registryRecord;
        try {
          trimmedKey = ApiRegistryService.decryptKey(registryRecord);
        } catch {
          trimmedKey = registryRecord.encryptedApiKey;
        }
        baseUrl = registryRecord.baseUrl || "";
        detectedProvider = registryRecord.provider || "openai";
      } else {
        // Fallback para ai_provider_accounts
        const accountRecord = await prisma.aiProviderAccount.findUnique({
          where: { id: keyId },
        });

        if (accountRecord) {
          targetType = "account";
          targetRecord = accountRecord;
          const encKey = accountRecord.encryptedApiKey || accountRecord.encryptedKey;
          if (encKey && accountRecord.iv && accountRecord.authTag) {
            trimmedKey = decryptApiKey(encKey, accountRecord.iv, accountRecord.authTag);
          } else {
            trimmedKey = encKey || "";
          }
          baseUrl = accountRecord.baseUrl || accountRecord.customBaseUrl || "";
          detectedProvider = accountRecord.provider || "openai";
        } else {
          // Fallback para apiKey
          const apiKeyRecord = await prisma.apiKey.findUnique({
            where: { id: keyId },
            include: { provider: true },
          });
          if (apiKeyRecord) {
            targetType = "apiKey";
            targetRecord = apiKeyRecord;
            if (apiKeyRecord.iv && apiKeyRecord.authTag) {
              trimmedKey = decryptApiKey(apiKeyRecord.encryptedKey, apiKeyRecord.iv, apiKeyRecord.authTag);
            } else {
              trimmedKey = apiKeyRecord.encryptedKey;
            }
            baseUrl = apiKeyRecord.customBaseUrl || apiKeyRecord.provider.baseUrl || "";
            detectedProvider = apiKeyRecord.provider.slug;
          }
        }
      }

      if (!targetType) {
        return NextResponse.json({ error: "Chave ou conta de API não encontrada." }, { status: 404 });
      }
    }

    if (!trimmedKey) {
      return NextResponse.json({ error: "Chave API não informada." }, { status: 400 });
    }

    // Executa teste unificado através do AIProviderService
    const testResult = await AIProviderService.testConnection({
      providerSlug: detectedProvider,
      apiKey: trimmedKey,
      customBaseUrl: baseUrl || null,
      modelIdentifier,
    });

    // Atualiza status no banco oficial
    if (targetType === "registry") {
      await prisma.aiProviderRegistry.update({
        where: { id: targetRecord.id },
        data: {
          status: testResult.success ? "ACTIVE" : (testResult.errorCode === 429 ? "RATE_LIMITED" : "ERROR"),
          lastLatencyMs: testResult.latencyMs || 0,
          lastTestedAt: new Date(),
          modelsJson: testResult.detectedModels && testResult.detectedModels.length > 0
            ? JSON.stringify(testResult.detectedModels)
            : targetRecord.modelsJson,
        },
      }).catch(() => {});
    } else if (targetType === "account") {
      await prisma.aiProviderAccount.update({
        where: { id: targetRecord.id },
        data: {
          status: testResult.success ? "ACTIVE" : (testResult.errorCode === 429 ? "RATE_LIMITED" : "ERROR"),
          lastLatencyMs: testResult.latencyMs || 0,
          lastTestedAt: new Date(),
          modelsDetected: testResult.detectedModels ? JSON.stringify(testResult.detectedModels) : undefined,
        },
      }).catch(() => {});
    }

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: testResult.message,
          errorCode: testResult.errorCode,
          details: testResult.details,
          latencyMs: testResult.latencyMs,
          endpoint: testResult.endpointUsed,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: testResult.message,
      provider: testResult.provider,
      endpoint: testResult.endpointUsed,
      latencyMs: testResult.latencyMs,
      detectedModels: testResult.detectedModels || [],
    });
  } catch (error: any) {
    console.error("[Test Connection API Error]:", error);
    return NextResponse.json(
      { error: "Erro interno no teste de conexão: " + error.message },
      { status: 500 }
    );
  }
}
