// src/ai/gateway/router.ts
// ROTEADOR INTELIGENTE DO AI CORE ENGINE — ORVEXA PRIME DIGITAL

import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { detectUserIntent } from "./intent-detector";
import {
  getHealthyApiKeys,
  dispatchProviderStream,
  markKeySuccess,
  markKeyError,
} from "../providers/manager";
import { createHighFidelitySimulatedStream } from "./fallback";
import { normalizeModelIdentifier } from "../models/registry";

export interface GatewayExecutionResult {
  stream: ReadableStream<Uint8Array>;
  decision: {
    intent: string;
    providerSlug: string;
    modelIdentifier: string;
    modelName: string;
    modelId: string;
    reason: string;
    requiredCapability: string;
  };
  apiKeyName: string;
  isFailover: boolean;
}

export async function routeAndExecuteStream(params: {
  userId: string;
  userRole: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  selectedModelPreference?: string;
  systemPrompt?: string;
  hasFiles?: boolean;
}): Promise<GatewayExecutionResult> {
  const { userId, messages, selectedModelPreference = "orvexa-prime", systemPrompt, hasFiles } = params;
  const lastUserMessage = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

  // 1. Classificação de Intenção
  const detected = detectUserIntent(lastUserMessage, hasFiles);

  // 2. Resolução da Decisão de Modelo e Provedor
  let decision = {
    intent: detected.intent,
    providerSlug: detected.recommendedProvider,
    modelIdentifier: detected.recommendedModel,
    modelName: detected.recommendedModel,
    modelId: "",
    reason: detected.reason,
    requiredCapability: detected.inferredCapability,
  };

  // Se o usuário selecionou um modelo manual específico
  if (selectedModelPreference && selectedModelPreference !== "orvexa-prime") {
    if (selectedModelPreference === "claude") {
      decision.providerSlug = "anthropic";
      decision.modelIdentifier = "claude-sonnet-5";
      decision.modelName = "Claude Sonnet 5";
      decision.reason = "Seleção direta pelo usuário: Anthropic Claude";
    } else if (selectedModelPreference === "openai" || selectedModelPreference === "codex") {
      decision.providerSlug = "openai";
      decision.modelIdentifier = "gpt-5.6-sol";
      decision.modelName = "GPT-5.6 Sol (Codex)";
      decision.reason = "Seleção direta pelo usuário: OpenAI / Codex";
    } else if (selectedModelPreference === "gemini") {
      decision.providerSlug = "google";
      decision.modelIdentifier = "gemini-3-flash-preview";
      decision.modelName = "Gemini 3 Flash";
      decision.reason = "Seleção direta pelo usuário: Google Gemini";
    } else {
      decision.modelIdentifier = normalizeModelIdentifier(selectedModelPreference);
      decision.modelName = selectedModelPreference;
      if (selectedModelPreference.includes("claude")) decision.providerSlug = "anthropic";
      else if (selectedModelPreference.includes("gemini")) decision.providerSlug = "google";
      else decision.providerSlug = "openai";
      decision.reason = `Modelo específico selecionado: ${selectedModelPreference}`;
    }
  }

  // 3. Busca chaves ativas do provedor selecionado
  let keys = await getHealthyApiKeys(decision.providerSlug, decision.requiredCapability);

  // Se o provedor primário não tiver chaves, faz failover para os outros provedores com chaves
  if (keys.length === 0) {
    const candidateSlugs = (["anthropic", "openai", "google"] as const).filter((p) => p !== decision.providerSlug);
    for (const altSlug of candidateSlugs) {
      const altKeys = await getHealthyApiKeys(altSlug, decision.requiredCapability);
      if (altKeys.length > 0) {
        decision.providerSlug = altSlug;
        decision.modelIdentifier = altSlug === "anthropic" ? "claude-sonnet-5" : altSlug === "google" ? "gemini-3-flash-preview" : "gpt-5.6-sol";
        decision.modelName = `${decision.modelIdentifier} [Failover Automático]`;
        decision.reason += ` (Failover para provedor ${altSlug})`;
        keys = altKeys;
        break;
      }
    }
  }

  const estimatedTokensIn = Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  const startTime = Date.now();

  // Caso 1: Existem chaves disponíveis
  if (keys.length > 0) {
    for (let i = 0; i < keys.length; i++) {
      const activeKey = keys[i];
      const isFailover = i > 0;

      try {
        const plainKey = decryptApiKey(activeKey.encryptedKey, activeKey.iv, activeKey.authTag);
        const stream = await dispatchProviderStream({
          providerSlug: decision.providerSlug,
          modelIdentifier: decision.modelIdentifier,
          apiKey: plainKey,
          customBaseUrl: activeKey.customBaseUrl,
          messages,
          systemPrompt,
        });

        await markKeySuccess(activeKey.id, estimatedTokensIn);
        const latency = Date.now() - startTime;

        await prisma.usageLog.create({
          data: {
            userId,
            modelId: null,
            apiKeyId: activeKey.id,
            tokensInput: estimatedTokensIn,
            tokensOutput: 250,
            totalTokens: estimatedTokensIn + 250,
            costCents: 0.15,
            priceChargedCents: 0.35,
            latencyMs: latency,
            status: isFailover ? "FAILOVER" : "SUCCESS",
          },
        }).catch(() => {});

        return {
          stream,
          decision,
          apiKeyName: activeKey.name,
          isFailover,
        };
      } catch (err: any) {
        console.warn(`[AI Router] Falha na chave ${activeKey.name}:`, err.message);
        const isRateLimit = err.status === 429 || err.message?.includes("429");
        const isTransient503 = err.status === 503 || err.message?.includes("503");
        if (!isTransient503) {
          await markKeyError(activeKey.id, isRateLimit);
        }
      }
    }
  }

  // Caso 2: Contingência simulada
  const simulatedStream = createHighFidelitySimulatedStream({
    intent: decision.intent,
    messages,
    systemPrompt,
    lastUserMessage,
  });

  return {
    stream: simulatedStream,
    decision,
    apiKeyName: "ORVEXA AI Core Standby",
    isFailover: true,
  };
}
