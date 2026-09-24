// src/ai/registry/api-registry.service.ts
// GERENCIADOR CENTRAL DO REGISTRY DE APIs — ORVEXA PRIME
// Tabela Mestra Oficial Única: ai_provider_registry

import { prisma } from "@/lib/prisma";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { AIProviderService, ProviderTestResult } from "@/ai/services/provider.service";
import { appCache } from "@/lib/cache";

export interface RegisterProviderInput {
  provider: string;
  name: string;
  baseUrl?: string | null;
  rawApiKey: string;
  priority?: number;
  quotaLimit?: number;
  capabilities?: string[];
  models?: string[];
  createdBy?: string;
  forceSave?: boolean;
}

export interface RegistryAccountFormatted {
  id: string;
  provider: string;
  providerName: string;
  providerSlug: string;
  name: string;
  baseUrl: string | null;
  customBaseUrl: string | null;
  keyHint: string;
  status: string;
  modelsDetected: string[];
  capabilities: string[];
  tokenLimitMonthly: number;
  tokensUsedMonth: number;
  tokensRemaining: number;
  percentUsed: number;
  priority: number;
  isActive: boolean;
  lastLatencyMs: number;
  lastTestedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientAvailableResult {
  available: boolean;
  activeCount: number;
  providers: Array<{
    provider: string;
    name: string;
    capabilities: string[];
  }>;
  models: string[];
  capabilities: string[];
  message?: string;
}

export class ApiRegistryService {
  /**
   * Lista todas as APIs registradas no banco oficial para exibição no painel administrativo.
   */
  public static async listAll(): Promise<RegistryAccountFormatted[]> {
    const records = await prisma.aiProviderRegistry.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return records.map((rec) => {
      let modelsDetected: string[] = [];
      try {
        modelsDetected = JSON.parse(rec.modelsJson || "[]");
      } catch {}

      let capabilities: string[] = ["TEXTO"];
      try {
        capabilities = JSON.parse(rec.capabilitiesJson || "[\"TEXTO\"]");
      } catch {}

      const totalLimit = rec.quotaLimit || 0;
      const used = rec.quotaUsed || 0;
      const tokensRemaining = totalLimit > 0 ? Math.max(0, totalLimit - used) : 0;
      const percentUsed = totalLimit > 0 ? Math.min(100, Math.round((used / totalLimit) * 100)) : 0;

      let dynamicStatus = rec.status;
      if (rec.status !== "DISABLED" && totalLimit > 0) {
        if (used >= totalLimit) {
          dynamicStatus = "BLOCKED_QUOTA";
        } else if (percentUsed >= 90) {
          dynamicStatus = "WARNING_90";
        }
      }

      const pSlug = (rec.provider || "openai").toLowerCase();
      const pName = pSlug === "openai" ? "OpenAI Compatible" : pSlug.toUpperCase();

      return {
        id: rec.id,
        provider: pSlug,
        providerName: pName,
        providerSlug: pSlug,
        name: rec.name,
        baseUrl: rec.baseUrl,
        customBaseUrl: rec.baseUrl,
        keyHint: rec.keyHint || "sk-...****",
        status: dynamicStatus,
        modelsDetected,
        capabilities,
        tokenLimitMonthly: totalLimit,
        tokensUsedMonth: used,
        tokensRemaining,
        percentUsed,
        priority: rec.priority,
        isActive: rec.isActive,
        lastLatencyMs: rec.lastLatencyMs,
        lastTestedAt: rec.lastTestedAt,
        createdBy: rec.createdBy,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      };
    });
  }

  /**
   * Lista todas as APIs ativas e disponíveis no ai_provider_registry.
   */
  public static async listActive() {
    return prisma.aiProviderRegistry.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Obtém um registro por ID.
   */
  public static async getById(id: string) {
    return prisma.aiProviderRegistry.findUnique({
      where: { id },
    });
  }

  /**
   * Descriptografa a chave de API de um registro.
   */
  public static decryptKey(record: { encryptedApiKey: string; iv?: string | null; authTag?: string | null }): string {
    if (!record.encryptedApiKey) {
      throw new Error("Chave criptografada não encontrada no registro.");
    }
    if (record.iv && record.authTag) {
      return decryptApiKey(record.encryptedApiKey, record.iv, record.authTag);
    }
    // Se não tiver IV/AuthTag, pode ser texto puro pré-migração
    return record.encryptedApiKey;
  }

  /**
   * Valida conexão e cadastra definitivamente a API na tabela ai_provider_registry.
   */
  public static async testAndRegister(input: RegisterProviderInput): Promise<{
    success: boolean;
    account: RegistryAccountFormatted;
    testResult: ProviderTestResult;
  }> {
    const rawKey = (input.rawApiKey || "").trim();
    if (!rawKey) {
      throw new Error("A chave secreta da API (API Key) é obrigatória.");
    }

    const targetUrl = (input.baseUrl || "").trim();
    const targetSlug = (input.provider || "openai").toLowerCase();
    let name = (input.name || "").trim();

    if (name.includes("@")) {
      throw new Error("O nome da API não pode ser um endereço de e-mail. Utilize um nome descritivo (ex: Clipoos Produção).");
    }

    if (!name) {
      name = targetUrl.includes("clipoos") ? "Clipoos Produção" : "Nova API";
    }

    // 1. Validar conexão e buscar modelos reais
    console.log(`[ApiRegistryService] Validando conexão com ${targetSlug} em ${targetUrl || "padrão"}...`);
    const testResult = await AIProviderService.testConnection({
      providerSlug: targetSlug,
      apiKey: rawKey,
      customBaseUrl: targetUrl || null,
    });

    const forceSave = Boolean(
      input.forceSave ||
      (Array.isArray(input.models) && input.models.length > 0)
    );

    if (!testResult.success && !forceSave) {
      throw new Error(`Falha ao validar API: ${testResult.message}. Verifique a URL e a API Key.`);
    }

    const detectedModels = testResult.detectedModels && testResult.detectedModels.length > 0
      ? testResult.detectedModels
      : (Array.isArray(input.models) && input.models.length > 0
          ? input.models
          : ["gpt-4o", "gpt-4o-mini"]);

    console.log(`[ApiRegistryService] Modelos detectados para "${name}":`, detectedModels);

    // 2. Mapeamento de capacidades
    const inferredCaps = AIProviderService.inferCapabilitiesFromModels(detectedModels);
    let finalCapabilities = ["TEXTO"];
    if (Array.isArray(input.capabilities) && input.capabilities.length > 0) {
      finalCapabilities = Array.from(new Set([...input.capabilities, ...inferredCaps]));
    } else {
      finalCapabilities = inferredCaps;
    }

    // 3. Criptografia AES-256-GCM
    const encrypted = encryptApiKey(rawKey);
    const finalQuota = Number(input.quotaLimit) || 0;

    // 4. Salvar EXCLUSIVAMENTE na tabela ai_provider_registry
    const saved = await prisma.aiProviderRegistry.create({
      data: {
        provider: targetSlug,
        name,
        baseUrl: targetUrl || null,
        encryptedApiKey: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyHint: encrypted.keyHint,
        status: "ACTIVE",
        modelsJson: JSON.stringify(detectedModels),
        capabilitiesJson: JSON.stringify(finalCapabilities),
        quotaLimit: finalQuota,
        quotaUsed: 0,
        isActive: true,
        priority: Number(input.priority) || 1,
        lastLatencyMs: testResult.latencyMs || 0,
        lastTestedAt: new Date(),
        createdBy: input.createdBy || null,
      },
    });

    // Invalida cache de instâncias
    appCache.clear();

    const formatted: RegistryAccountFormatted = {
      id: saved.id,
      provider: saved.provider,
      providerName: saved.provider === "openai" ? "OpenAI Compatible" : saved.provider.toUpperCase(),
      providerSlug: saved.provider,
      name: saved.name,
      baseUrl: saved.baseUrl,
      customBaseUrl: saved.baseUrl,
      keyHint: saved.keyHint || encrypted.keyHint,
      status: saved.status,
      modelsDetected: detectedModels,
      capabilities: finalCapabilities,
      tokenLimitMonthly: saved.quotaLimit,
      tokensUsedMonth: 0,
      tokensRemaining: saved.quotaLimit,
      percentUsed: 0,
      priority: saved.priority,
      isActive: saved.isActive,
      lastLatencyMs: saved.lastLatencyMs,
      lastTestedAt: saved.lastTestedAt,
      createdBy: saved.createdBy,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };

    return {
      success: true,
      account: formatted,
      testResult,
    };
  }

  /**
   * Atualiza registro na tabela ai_provider_registry.
   */
  public static async update(id: string, data: {
    status?: string;
    priority?: number;
    quotaLimit?: number;
    resetQuota?: boolean;
    capabilities?: string[];
    isActive?: boolean;
  }) {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = Number(data.priority);
    if (data.quotaLimit !== undefined) updateData.quotaLimit = Number(data.quotaLimit);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.resetQuota) {
      updateData.quotaUsed = 0;
      updateData.status = "ACTIVE";
    }
    if (Array.isArray(data.capabilities)) {
      updateData.capabilitiesJson = JSON.stringify(data.capabilities);
    }

    const updated = await prisma.aiProviderRegistry.update({
      where: { id },
      data: updateData,
    });

    appCache.clear();
    return updated;
  }

  /**
   * Exclui registro da tabela ai_provider_registry.
   */
  public static async delete(id: string) {
    const deleted = await prisma.aiProviderRegistry.delete({
      where: { id },
    });

    appCache.clear();
    return deleted;
  }

  /**
   * Executa teste de conexão em uma API existente no ai_provider_registry.
   */
  public static async testExisting(id: string): Promise<ProviderTestResult> {
    const account = await prisma.aiProviderRegistry.findUnique({
      where: { id },
    });

    if (!account) {
      return {
        success: false,
        provider: "unknown",
        endpointUsed: "",
        latencyMs: 0,
        message: "API não encontrada no registry oficial.",
      };
    }

    const rawKey = this.decryptKey(account);
    const result = await AIProviderService.testConnection({
      providerSlug: account.provider,
      apiKey: rawKey,
      customBaseUrl: account.baseUrl || null,
    });

    // Atualiza status e modelos detectados
    await prisma.aiProviderRegistry.update({
      where: { id },
      data: {
        status: result.success ? "ACTIVE" : (result.errorCode === 429 ? "RATE_LIMITED" : "ERROR"),
        lastLatencyMs: result.latencyMs || 0,
        lastTestedAt: new Date(),
        modelsJson: result.detectedModels && result.detectedModels.length > 0
          ? JSON.stringify(result.detectedModels)
          : account.modelsJson,
      },
    }).catch(() => {});

    appCache.clear();
    return result;
  }

  /**
   * Consulta pública/cliente de APIs ativas e modelos disponíveis.
   * Usado pela área cliente em GET /api/providers/available.
   */
  public static async getClientAvailable(): Promise<ClientAvailableResult> {
    const activeRecords = await prisma.aiProviderRegistry.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    if (activeRecords.length === 0) {
      return {
        available: false,
        activeCount: 0,
        providers: [],
        models: [],
        capabilities: [],
        message: "Nenhuma API de Inteligência Artificial configurada. Solicite ao administrador a configuração de uma chave.",
      };
    }

    const allModels = new Set<string>();
    const allCapabilities = new Set<string>();
    const providersList: Array<{ provider: string; name: string; capabilities: string[] }> = [];

    for (const rec of activeRecords) {
      let models: string[] = [];
      try {
        models = JSON.parse(rec.modelsJson || "[]");
      } catch {}

      let caps: string[] = ["TEXTO"];
      try {
        caps = JSON.parse(rec.capabilitiesJson || "[\"TEXTO\"]");
      } catch {}

      models.forEach((m) => {
        if (m && typeof m === "string" && m.trim()) allModels.add(m.trim());
      });

      caps.forEach((c) => {
        if (c && typeof c === "string" && c.trim()) allCapabilities.add(c.trim());
      });

      providersList.push({
        provider: rec.provider,
        name: rec.name,
        capabilities: caps,
      });
    }

    return {
      available: true,
      activeCount: activeRecords.length,
      providers: providersList,
      models: Array.from(allModels),
      capabilities: Array.from(allCapabilities),
    };
  }

  /**
   * Incrementa consumo de quota no registro.
   */
  public static async incrementQuotaUsed(id: string, tokens: number) {
    try {
      await prisma.aiProviderRegistry.update({
        where: { id },
        data: {
          quotaUsed: { increment: tokens },
        },
      });
    } catch (e) {
      console.warn(`[ApiRegistryService] Falha ao incrementar quota para ${id}:`, e);
    }
  }
}
