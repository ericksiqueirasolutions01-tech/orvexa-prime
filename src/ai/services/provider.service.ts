// src/ai/services/provider.service.ts
// AI PROVIDER LAYER — ORVEXA PRIME DIGITAL
// Camada central desacoplada para comunicação com múltiplos provedores e gateways compatíveis com OpenAI.

import { prisma } from "../../lib/prisma";
import { decryptApiKey } from "../../lib/crypto";
import { normalizeModelIdentifier } from "../models/registry";
import { createHighFidelitySimulatedStream } from "../gateway/fallback";

export type SupportedProviderSlug =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "deepseek"
  | "llama"
  | "openrouter"
  | "localai"
  | "custom";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProviderStreamParams {
  providerSlug: string;
  modelIdentifier: string;
  apiKey: string;
  customBaseUrl?: string | null;
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderTestParams {
  providerSlug?: string;
  apiKey: string;
  customBaseUrl?: string | null;
  modelIdentifier?: string;
}

export interface ProviderTestResult {
  success: boolean;
  provider: string;
  endpointUsed: string;
  latencyMs: number;
  message: string;
  detectedModels?: string[];
  errorCode?: string | number;
  details?: string;
}

export interface FallbackExecutionParams {
  providerSlug: string;
  modelIdentifier: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  customBaseUrl?: string | null;
  directApiKey?: string;
}

export interface FallbackExecutionResult {
  stream: ReadableStream<Uint8Array>;
  providerUsed: string;
  modelUsed: string;
  isFailover: boolean;
  failoverReason?: string;
  isContingency?: boolean;
}

export class AIProviderService {
  private static readonly OFFICIAL_OPENAI_URL = "https://api.openai.com/v1";
  private static readonly OFFICIAL_ANTHROPIC_URL = "https://api.anthropic.com/v1";
  private static readonly OFFICIAL_GEMINI_URL = "https://generativelanguage.googleapis.com";

  /**
   * REGRA 1 & 2: Resolução determinística da Base URL para gateways OpenAI
   * 1. Se existir OPENAI_BASE_URL ou MIRAI_BASE_URL configurada (customBaseUrl da chave, SystemSetting, AiProvider ou .env), usar ela.
   * 2. Se for Mirai: usar https://api.miraiapi.com/v1.
   * 3. Se for OpenAI padrão e vazia: usar API oficial OpenAI (https://api.openai.com/v1).
   */
  public static async resolveOpenAiBaseUrl(customBaseUrl?: string | null, providerSlug?: string): Promise<string> {
    // 1. URL explícita informada para a chave específica
    if (customBaseUrl && customBaseUrl.trim()) {
      return customBaseUrl.trim().replace(/\/+$/, "");
    }

    try {
      // 2. Se for provedor Mirai explícito
      if (providerSlug === "mirai") {
        const miraiSetting = await prisma.systemSetting.findUnique({
          where: { key: "mirai_base_url" },
        });
        if (miraiSetting?.value && miraiSetting.value.trim()) {
          return miraiSetting.value.trim().replace(/\/+$/, "");
        }

        const miraiProvider = await prisma.aiProvider.findUnique({
          where: { slug: "mirai" },
        });
        if (miraiProvider?.baseUrl && miraiProvider.baseUrl.trim()) {
          return miraiProvider.baseUrl.trim().replace(/\/+$/, "");
        }

        if (process.env.MIRAI_BASE_URL && process.env.MIRAI_BASE_URL.trim()) {
          return process.env.MIRAI_BASE_URL.trim().replace(/\/+$/, "");
        }

        return "https://api.miraiapi.com/v1";
      }

      // 3. Configuração global salva na tabela SystemSetting ("openai_base_url")
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "openai_base_url" },
      });
      if (setting?.value && setting.value.trim()) {
        return setting.value.trim().replace(/\/+$/, "");
      }

      // 4. Configuração do registro do provedor "openai" na tabela AiProvider
      const provider = await prisma.aiProvider.findUnique({
        where: { slug: "openai" },
      });
      if (provider?.baseUrl && provider.baseUrl.trim()) {
        return provider.baseUrl.trim().replace(/\/+$/, "");
      }
    } catch {
      // Falha graciosa caso o banco esteja inacessível em ambiente de teste
    }

    // 5. Variável de ambiente do sistema (.env)
    if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.trim()) {
      return process.env.OPENAI_BASE_URL.trim().replace(/\/+$/, "");
    }

    // 6. Default oficial OpenAI
    return this.OFFICIAL_OPENAI_URL;
  }

  /**
   * Resolução da Base URL para o Anthropic Claude
   */
  public static async resolveClaudeBaseUrl(customBaseUrl?: string | null): Promise<string> {
    if (customBaseUrl && customBaseUrl.trim()) {
      return customBaseUrl.trim().replace(/\/+$/, "");
    }

    try {
      const provider = await prisma.aiProvider.findUnique({
        where: { slug: "anthropic" },
      });
      if (provider?.baseUrl && provider.baseUrl.trim()) {
        return provider.baseUrl.trim().replace(/\/+$/, "");
      }
    } catch {}

    if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_BASE_URL.trim()) {
      return process.env.ANTHROPIC_BASE_URL.trim().replace(/\/+$/, "");
    }

    return this.OFFICIAL_ANTHROPIC_URL;
  }

  /**
   * Mapeia automaticamente modelos detectados via GET /models para capacidades reais da API
   */
  public static inferCapabilitiesFromModels(models: string[]): string[] {
    const caps = new Set<string>(["TEXTO"]);
    for (const m of models) {
      const lower = m.toLowerCase();
      if (
        lower.includes("code") ||
        lower.includes("codex") ||
        lower.includes("sol") ||
        lower.includes("developer") ||
        lower.includes("prog") ||
        lower.includes("qwen-coder") ||
        lower.includes("deepseek-coder")
      ) {
        caps.add("CODIGO");
      }
      if (
        lower.includes("terra") ||
        lower.includes("doc") ||
        lower.includes("rag") ||
        lower.includes("pdf") ||
        lower.includes("analysis")
      ) {
        caps.add("DOCUMENTO");
      }
      if (
        lower.includes("dall-e") ||
        lower.includes("image") ||
        lower.includes("flux") ||
        lower.includes("midjourney") ||
        lower.includes("imagen")
      ) {
        caps.add("IMAGEM");
      }
      if (
        lower.includes("video") ||
        lower.includes("sora") ||
        lower.includes("runway") ||
        lower.includes("veo")
      ) {
        caps.add("VIDEO");
      }
    }
    return Array.from(caps);
  }

  /**
   * Teste de Conexão Unificado com diagnóstico amigável para qualquer provedor
   */
  public static async testConnection(params: ProviderTestParams): Promise<ProviderTestResult> {
    const startTime = Date.now();
    const rawKey = params.apiKey?.trim() || "";
    let provider = (params.providerSlug || "").toLowerCase();
    const customUrl = params.customBaseUrl?.trim() || null;

    if (!rawKey) {
      return {
        success: false,
        provider: provider || "desconhecido",
        endpointUsed: "",
        latencyMs: 0,
        message: "Chave de API não informada. Insira uma chave válida para realizar o teste.",
        errorCode: "KEY_EMPTY",
      };
    }

    // Auto-identificação inteligente se o provedor não foi especificado
    if (!provider || provider === "desconhecido") {
      if (rawKey.startsWith("sk-ant-")) {
        provider = "anthropic";
      } else if (rawKey.startsWith("AIzaSy")) {
        provider = "google";
      } else {
        provider = "openai";
      }
    }

    try {
      // 1. Google Gemini
      if (provider === "google" || rawKey.startsWith("AIzaSy")) {
        return await this.testGoogleConnection(rawKey, startTime);
      }

      // 2. Anthropic Claude Nativo (apenas se for api.anthropic.com oficial)
      const claudeBaseUrl = await this.resolveClaudeBaseUrl(customUrl);
      const isAnthropicNative =
        (provider === "anthropic" || rawKey.startsWith("sk-ant-")) &&
        (claudeBaseUrl.includes("anthropic.com") || (!customUrl && rawKey.startsWith("sk-ant-")));

      if (isAnthropicNative) {
        return await this.testClaudeNativeConnection(rawKey, claudeBaseUrl, startTime);
      }

      // 3. Provedores Padrão OpenAI (OpenAI Oficial, Mirai API, OpenRouter, Azure, LocalAI, Mistral, DeepSeek, Llama)
      const openAiBaseUrl = await this.resolveOpenAiBaseUrl(customUrl, provider);
      return await this.testOpenAiCompatibleConnection(rawKey, openAiBaseUrl, provider, startTime);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === "AbortError" || err.message?.includes("Timeout");
      return {
        success: false,
        provider,
        endpointUsed: customUrl || "automático",
        latencyMs,
        message: isTimeout
          ? "Tempo limite de conexão esgotado (Timeout). Verifique se o servidor do provedor está ativo."
          : `Erro de rede ao conectar: ${err.message || "Falha desconhecida"}`,
        errorCode: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        details: err.stack,
      };
    }
  }

  /**
   * Teste de conexão para endpoints compatíveis com OpenAI (/v1/models ou ping)
   */
  private static async testOpenAiCompatibleConnection(
    apiKey: string,
    baseUrl: string,
    provider: string,
    startTime: number
  ): Promise<ProviderTestResult> {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const endpoint = cleanBase.endsWith("/models")
      ? cleanBase
      : cleanBase.endsWith("/v1")
      ? `${cleanBase}/models`
      : `${cleanBase}/v1/models`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errBody = await response.text();
        const friendly = this.formatHttpErrorMessage(response.status, errBody, endpoint);
        return {
          success: false,
          provider: provider || "openai",
          endpointUsed: endpoint,
          latencyMs,
          message: friendly.message,
          errorCode: response.status,
          details: errBody.slice(0, 300),
        };
      }

      const data = await response.json().catch(() => ({}));
      let detectedModels: string[] = [];
      if (Array.isArray(data.data)) {
        detectedModels = data.data.map((m: any) => m.id || m.name).filter(Boolean);
      } else if (Array.isArray(data.models)) {
        detectedModels = data.models.map((m: any) => m.id || m.name).filter(Boolean);
      }

      const isCustomGateway = !endpoint.includes("api.openai.com");
      const gatewayLabel = isCustomGateway
        ? `Gateway Personalizado (${new URL(endpoint).host})`
        : "OpenAI Oficial";

      return {
        success: true,
        provider: provider || "openai",
        endpointUsed: endpoint,
        latencyMs,
        message: `Conexão validada com sucesso via ${gatewayLabel}! Resposta em ${latencyMs}ms.`,
        detectedModels: detectedModels.slice(0, 15),
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Teste de conexão para Anthropic Claude nativo (/v1/messages com 1 token)
   */
  private static async testClaudeNativeConnection(
    apiKey: string,
    baseUrl: string,
    startTime: number
  ): Promise<ProviderTestResult> {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const endpoint = cleanBase.endsWith("/messages")
      ? cleanBase
      : cleanBase.endsWith("/v1")
      ? `${cleanBase}/messages`
      : `${cleanBase}/v1/messages`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errBody = await response.text();
        const friendly = this.formatHttpErrorMessage(response.status, errBody, endpoint);
        return {
          success: false,
          provider: "anthropic",
          endpointUsed: endpoint,
          latencyMs,
          message: friendly.message,
          errorCode: response.status,
          details: errBody.slice(0, 300),
        };
      }

      return {
        success: true,
        provider: "anthropic",
        endpointUsed: endpoint,
        latencyMs,
        message: `Chave Anthropic Claude Oficial validada com sucesso! Resposta em ${latencyMs}ms.`,
        detectedModels: [
          "claude-3-5-sonnet-20241022",
          "claude-3-haiku-20240307",
          "claude-3-opus-20240229",
        ],
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Teste de conexão para Google Gemini (/v1beta/models)
   */
  private static async testGoogleConnection(
    apiKey: string,
    startTime: number
  ): Promise<ProviderTestResult> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errBody = await response.text();
        const friendly = this.formatHttpErrorMessage(response.status, errBody, "Google Gemini API");
        return {
          success: false,
          provider: "google",
          endpointUsed: "https://generativelanguage.googleapis.com",
          latencyMs,
          message: friendly.message,
          errorCode: response.status,
          details: errBody.slice(0, 300),
        };
      }

      const data = await response.json();
      const detectedModels = (data.models || []).map((m: any) =>
        m.name.replace("models/", "")
      );

      return {
        success: true,
        provider: "google",
        endpointUsed: "https://generativelanguage.googleapis.com",
        latencyMs,
        message: `Chave Google Gemini validada com sucesso! (${detectedModels.length} modelos detectados, ${latencyMs}ms).`,
        detectedModels: detectedModels.slice(0, 12),
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Formata códigos HTTP em mensagens claras e orientadas para o usuário
   */
  private static formatHttpErrorMessage(
    status: number,
    errBody: string,
    endpoint: string
  ): { message: string } {
    let message = "";
    if (status === 401) {
      message = "Chave de API inválida, expirada ou não autorizada. Verifique se a chave digitada está correta e ativa.";
    } else if (status === 403) {
      message = "Acesso proibido (403). A chave informada não possui privilégios para acessar este gateway ou modelo.";
    } else if (status === 404) {
      message = `Endpoint não encontrado (404) em ${endpoint}. Verifique se a Base URL configurada está correta.`;
    } else if (status === 429) {
      message = "Limite de requisições excedido (Rate Limit - 429) ou cota/crédito mensal esgotado no provedor.";
    } else if (status >= 500) {
      message = `O servidor do provedor retornou falha temporária (${status}). Tente novamente em instantes.`;
    } else {
      message = `Falha na requisição (${status}): ${errBody.slice(0, 160)}`;
    }
    return { message };
  }

  /**
   * Despacha o streaming de chat para o provedor selecionado
   */
  public static async executeChatStream(
    params: ProviderStreamParams
  ): Promise<ReadableStream<Uint8Array>> {
    const { providerSlug, modelIdentifier, apiKey, customBaseUrl, messages, systemPrompt } = params;
    const normalizedModel = normalizeModelIdentifier(modelIdentifier);

    // 1. Google Gemini Nativo
    if (providerSlug === "google") {
      return this.callGoogleNativeStream({
        apiKey,
        modelIdentifier: normalizedModel,
        messages,
        systemPrompt,
      });
    }

    // 2. Anthropic Claude Nativo (apenas se for api.anthropic.com oficial e chave sk-ant)
    const claudeBaseUrl = await this.resolveClaudeBaseUrl(customBaseUrl);
    const isClaudeNative =
      providerSlug === "anthropic" &&
      apiKey.startsWith("sk-ant-") &&
      (claudeBaseUrl.includes("anthropic.com") || !customBaseUrl);

    if (isClaudeNative) {
      return this.callClaudeNativeStream({
        apiKey,
        modelIdentifier: normalizedModel,
        messages,
        customBaseUrl: claudeBaseUrl,
        systemPrompt,
      });
    }

    // 3. Provedores OpenAI Compatíveis:
    // OpenAI Oficial, Mirai API, OpenRouter, Azure OpenAI, LocalAI, Mistral, DeepSeek, Llama
    const openAiBaseUrl = await this.resolveOpenAiBaseUrl(customBaseUrl, providerSlug);
    return this.callOpenAiCompatibleStream({
      apiKey,
      modelIdentifier: normalizedModel,
      baseUrl: openAiBaseUrl,
      messages,
      systemPrompt,
    });
  }

  /**
   * Executa chamada com Fallback Automático resiliente entre chaves e provedores
   */
  public static async executeWithFallback(
    params: FallbackExecutionParams
  ): Promise<FallbackExecutionResult> {
    const { providerSlug, modelIdentifier, messages, systemPrompt, customBaseUrl, directApiKey } = params;

    // 1. Se foi passada uma chave direta, tenta usá-la prioritariamente
    if (directApiKey && directApiKey.trim()) {
      try {
        const stream = await this.executeChatStream({
          providerSlug,
          modelIdentifier,
          apiKey: directApiKey.trim(),
          customBaseUrl,
          messages,
          systemPrompt,
        });
        return {
          stream,
          providerUsed: providerSlug,
          modelUsed: modelIdentifier,
          isFailover: false,
        };
      } catch (err: any) {
        console.warn(`[AIProviderService] Falha na chave direta para "${providerSlug}":`, err.message);
      }
    }

    // 2. Busca chaves ativas do provedor primário no banco
    try {
      const now = new Date();
      const primaryProvider = await prisma.aiProvider.findUnique({
        where: { slug: providerSlug },
        include: {
          apiKeys: {
            where: {
              status: { not: "DISABLED" },
            },
            orderBy: [{ priority: "asc" }, { tokensUsedMonth: "asc" }],
          },
        },
      });

      if (primaryProvider && primaryProvider.apiKeys.length > 0) {
        for (let i = 0; i < primaryProvider.apiKeys.length; i++) {
          const k = primaryProvider.apiKeys[i];
          if (k.quarantinedUntil && k.quarantinedUntil > now) continue;

          try {
            const plainKey = decryptApiKey(k.encryptedKey, k.iv, k.authTag);
            const stream = await this.executeChatStream({
              providerSlug,
              modelIdentifier,
              apiKey: plainKey,
              customBaseUrl: k.customBaseUrl || primaryProvider.baseUrl || customBaseUrl,
              messages,
              systemPrompt,
            });

            return {
              stream,
              providerUsed: providerSlug,
              modelUsed: modelIdentifier,
              isFailover: i > 0,
              failoverReason: i > 0 ? "Chave de contingência do provedor" : undefined,
            };
          } catch (err: any) {
            console.warn(`[AIProviderService] Falha na chave "${k.name}" (${providerSlug}):`, err.message);
          }
        }
      }
    } catch (dbErr: any) {
      console.warn("[AIProviderService] Erro ao consultar banco para failover:", dbErr.message);
    }

    // 3. Fallback automático para provedores secundários (GPT <-> Claude <-> Gemini)
    const fallbackCandidates = ["openai", "anthropic", "google"].filter((p) => p !== providerSlug);
    const defaultFallbackModels: Record<string, string> = {
      openai: "gpt-5.6-sol",
      anthropic: "claude-sonnet-5",
      google: "gemini-3.6-flash",
    };

    for (const altSlug of fallbackCandidates) {
      try {
        const altProvider = await prisma.aiProvider.findUnique({
          where: { slug: altSlug },
          include: {
            apiKeys: {
              where: { status: { not: "DISABLED" } },
              orderBy: [{ priority: "asc" }, { tokensUsedMonth: "asc" }],
            },
          },
        });

        if (altProvider && altProvider.apiKeys.length > 0) {
          for (const altKey of altProvider.apiKeys) {
            try {
              const plainKey = decryptApiKey(altKey.encryptedKey, altKey.iv, altKey.authTag);
              const altModel = defaultFallbackModels[altSlug] || "gpt-5.6-sol";
              const stream = await this.executeChatStream({
                providerSlug: altSlug,
                modelIdentifier: altModel,
                apiKey: plainKey,
                customBaseUrl: altKey.customBaseUrl || altProvider.baseUrl,
                messages,
                systemPrompt,
              });

              return {
                stream,
                providerUsed: altSlug,
                modelUsed: altModel,
                isFailover: true,
                failoverReason: `Falha no provedor primário (${providerSlug}). Failover automático para ${altSlug}.`,
              };
            } catch {
              continue;
            }
          }
        }
      } catch {
        continue;
      }
    }

    // 4. Último recurso: Modo de Contingência de alta fidelidade
    const lastUserMsg = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    const simulatedStream = createHighFidelitySimulatedStream({
      intent: "GERAL",
      messages,
      systemPrompt,
      lastUserMessage: lastUserMsg,
    });

    return {
      stream: simulatedStream,
      providerUsed: "contingency",
      modelUsed: "orvexa-contingency-engine",
      isFailover: true,
      failoverReason: "Todos os provedores externos falharam ou sem chaves ativas. Acionado modo de contingência.",
      isContingency: true,
    };
  }

  /**
   * Chamada OpenAI Compatível (/v1/chat/completions) com suporte a SSE
   */
  private static async callOpenAiCompatibleStream(params: {
    apiKey: string;
    modelIdentifier: string;
    baseUrl: string;
    messages: ChatMessage[];
    systemPrompt?: string;
  }): Promise<ReadableStream<Uint8Array>> {
    const { apiKey, modelIdentifier, baseUrl, messages, systemPrompt } = params;
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const endpoint = cleanBase.endsWith("/chat/completions")
      ? cleanBase
      : cleanBase.endsWith("/v1")
      ? `${cleanBase}/chat/completions`
      : `${cleanBase}/v1/chat/completions`;

    const formattedMessages: ChatMessage[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: "system", content: systemPrompt });
    }
    formattedMessages.push(...messages);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Timeout ao conectar ao Gateway OpenAI")), 25000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelIdentifier,
        messages: formattedMessages,
        stream: true,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      const friendly = this.formatHttpErrorMessage(response.status, errText, endpoint);
      const error: any = new Error(friendly.message);
      error.status = response.status;
      error.details = errText;
      throw error;
    }

    return this.createSseTransformStream(response.body!);
  }

  /**
   * Chamada Anthropic Claude Nativa (/v1/messages)
   */
  private static async callClaudeNativeStream(params: {
    apiKey: string;
    modelIdentifier: string;
    customBaseUrl: string;
    messages: ChatMessage[];
    systemPrompt?: string;
  }): Promise<ReadableStream<Uint8Array>> {
    const { apiKey, modelIdentifier, customBaseUrl, messages, systemPrompt } = params;
    const cleanBase = customBaseUrl.replace(/\/+$/, "");
    const endpoint = cleanBase.endsWith("/messages")
      ? cleanBase
      : cleanBase.endsWith("/v1")
      ? `${cleanBase}/messages`
      : `${cleanBase}/v1/messages`;

    const formattedMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Timeout ao conectar à Anthropic")), 25000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelIdentifier,
        messages: formattedMessages,
        system: systemPrompt || undefined,
        max_tokens: 4096,
        stream: true,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      const friendly = this.formatHttpErrorMessage(response.status, errText, endpoint);
      const error: any = new Error(friendly.message);
      error.status = response.status;
      error.details = errText;
      throw error;
    }

    return this.createAnthropicTransformStream(response.body!);
  }

  /**
   * Chamada Google Gemini Nativa (Google AI Studio SSE)
   */
  private static async callGoogleNativeStream(params: {
    apiKey: string;
    modelIdentifier: string;
    messages: ChatMessage[];
    systemPrompt?: string;
  }): Promise<ReadableStream<Uint8Array>> {
    const { apiKey, modelIdentifier, messages, systemPrompt } = params;
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const candidateModels = [
      modelIdentifier,
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite-preview",
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastError: any = null;

    for (const testModel of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error("Timeout ao conectar ao Google Gemini")), 20000);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            generationConfig: { maxOutputTokens: 4096 },
          }),
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          const friendly = this.formatHttpErrorMessage(response.status, errText, `Gemini (${testModel})`);
          const error: any = new Error(friendly.message);
          error.status = response.status;
          lastError = error;

          if (response.status === 503 || response.status === 404 || response.status === 429) {
            console.warn(`[AIProviderService] Modelo Gemini ${testModel} indisponível ou rate limited (${response.status}), tentando alternativo...`);
            continue;
          }
          throw error;
        }

        return this.createGeminiTransformStream(response.body!);
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err;
        if (err.status === 503 || err.status === 404 || err.status === 429) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Google Gemini indisponível no momento.");
  }

  /**
   * Parser SSE com zero-latência para OpenAI Compatível
   */
  private static createSseTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") {
              try { controller.terminate(); } catch {}
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
              if (parsed.choices?.[0]?.finish_reason === "stop") {
                try { controller.terminate(); } catch {}
                return;
              }
            } catch {}
          }
        }
      },
      flush(controller) {
        if (buffer.trim().startsWith("data: ")) {
          try {
            const dataStr = buffer.trim().slice(6);
            if (dataStr !== "[DONE]") {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
            }
          } catch {}
        }
      },
    });

    return rawStream.pipeThrough(transform);
  }

  /**
   * Parser SSE para Anthropic Claude
   */
  private static createAnthropicTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {}
          }
        }
      },
    });

    return rawStream.pipeThrough(transform);
  }

  /**
   * Parser SSE para Google Gemini
   */
  private static createGeminiTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {}
          }
        }
      },
    });

    return rawStream.pipeThrough(transform);
  }
}
