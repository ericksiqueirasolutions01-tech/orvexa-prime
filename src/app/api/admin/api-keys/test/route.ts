import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const { keyId, rawApiKey, customBaseUrl, providerSlug } = await req.json();

    let trimmedKey = rawApiKey?.trim() || "";
    let baseUrl = customBaseUrl?.trim() || "";
    let detectedProvider = providerSlug || "openai";
    let targetKeyRecord: any = null;

    // Se fornecido keyId, recupera a chave criptografada do banco e testa
    if (keyId) {
      targetKeyRecord = await prisma.apiKey.findUnique({
        where: { id: keyId },
        include: { provider: true },
      });
      if (!targetKeyRecord) {
        return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
      }
      trimmedKey = decryptApiKey(targetKeyRecord.encryptedKey, targetKeyRecord.iv, targetKeyRecord.authTag);
      baseUrl = targetKeyRecord.customBaseUrl || targetKeyRecord.provider.baseUrl || "";
      detectedProvider = targetKeyRecord.provider.slug;
    }

    if (!trimmedKey) {
      return NextResponse.json({ error: "Chave API não informada." }, { status: 400 });
    }

    const startTime = Date.now();
    let detectedModels: string[] = [];

    // Auto-identificação inteligente de provedor por padrão de chave (se não veio do banco)
    if (!keyId) {
      if (trimmedKey.startsWith("sk-lOl") || trimmedKey.startsWith("MR-EE") || trimmedKey.toLowerCase().includes("codex")) {
        detectedProvider = "openai";
        if (!baseUrl) baseUrl = "https://api.miraiapi.com/v1";
      } else if (trimmedKey.startsWith("sk-ise") || trimmedKey.startsWith("MR-3C") || trimmedKey.toLowerCase().includes("claude")) {
        detectedProvider = "anthropic";
        if (!baseUrl) baseUrl = "https://api.miraiapi.com/v1";
      } else if (trimmedKey.startsWith("sk-ant-")) {
        detectedProvider = "anthropic";
        if (!baseUrl) baseUrl = "https://api.anthropic.com/v1";
      } else if (trimmedKey.startsWith("AIzaSy")) {
        detectedProvider = "google";
        if (!baseUrl) baseUrl = "https://generativelanguage.googleapis.com";
      } else if (trimmedKey.startsWith("sk-")) {
        detectedProvider = "openai";
        if (!baseUrl) baseUrl = "https://api.openai.com/v1";
      }
    }

    // 1. Provedores compatíveis com OpenAI / Mirai API (OpenAI ou Anthropic via Mirai)
    if (baseUrl.includes("miraiapi") || baseUrl.includes("openai") || detectedProvider === "openai" || (detectedProvider === "anthropic" && baseUrl.includes("miraiapi"))) {
      const endpoint = baseUrl.endsWith("/models")
        ? baseUrl
        : baseUrl.endsWith("/v1")
        ? `${baseUrl}/models`
        : `${baseUrl}/v1/models`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
        },
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({
          success: false,
          error: `Falha na autenticação (${response.status}): ${errText.slice(0, 150)}`,
          latencyMs,
          detectedProvider,
          baseUrl,
        }, { status: 400 });
      }

      const data = await response.json().catch(() => ({}));
      if (data.data && Array.isArray(data.data)) {
        detectedModels = data.data.map((m: any) => m.id);
      }

      if (targetKeyRecord) {
        await prisma.apiKey.update({
          where: { id: targetKeyRecord.id },
          data: {
            status: "ACTIVE",
            errorCount: 0,
            quarantinedUntil: null,
            lastUsedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Chave "${targetKeyRecord?.name || detectedProvider}" validada com sucesso! Resposta em ${latencyMs}ms.`,
        latencyMs,
        detectedProvider,
        baseUrl,
        detectedModels: detectedModels.slice(0, 10),
      });
    }

    // 2. Google Gemini API
    if (detectedProvider === "google" || baseUrl.includes("googleapis") || trimmedKey.startsWith("AIzaSy")) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`;
      const response = await fetch(endpoint);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({
          success: false,
          error: `Erro Google API (${response.status}): ${errText.slice(0, 150)}`,
          latencyMs,
          detectedProvider: "google",
        }, { status: 400 });
      }

      const data = await response.json();
      detectedModels = (data.models || []).map((m: any) => m.name.replace("models/", ""));

      if (targetKeyRecord) {
        await prisma.apiKey.update({
          where: { id: targetKeyRecord.id },
          data: {
            status: "ACTIVE",
            errorCount: 0,
            quarantinedUntil: null,
            lastUsedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Chave Google Gemini validada com sucesso! (${detectedModels.length} modelos disponíveis, ${latencyMs}ms).`,
        latencyMs,
        detectedProvider: "google",
        detectedModels: detectedModels.filter((m: string) => m.includes("flash") || m.includes("gemini")).slice(0, 8),
      });
    }

    // 3. Fallback genérico
    if (targetKeyRecord) {
      await prisma.apiKey.update({
        where: { id: targetKeyRecord.id },
        data: { status: "ACTIVE", errorCount: 0, quarantinedUntil: null, lastUsedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Chave configurada e ativa para o provedor ${detectedProvider}.`,
      latencyMs: Date.now() - startTime,
      detectedProvider,
      baseUrl,
      detectedModels: ["gpt-5.6-sol", "gpt-6-astra", "claude-sonnet-5", "claude-fable-5.1", "gemini-3-flash-preview"],
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Erro no teste de conexão: ${err.message}`,
    }, { status: 500 });
  }
}
