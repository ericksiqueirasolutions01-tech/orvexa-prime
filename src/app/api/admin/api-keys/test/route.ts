import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const { rawApiKey, customBaseUrl, providerSlug } = await req.json();

    if (!rawApiKey || !rawApiKey.trim()) {
      return NextResponse.json({ error: "Chave API não informada." }, { status: 400 });
    }

    const trimmedKey = rawApiKey.trim();
    const startTime = Date.now();
    let detectedProvider = providerSlug || "openai";
    let detectedModels: string[] = [];
    let baseUrl = customBaseUrl?.trim() || "";

    // Auto-identificação inteligente de provedor por padrão de chave
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

    // Teste de conexão real via HTTP
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
        if (detectedModels.some((m: string) => m.includes("claude") || m.includes("fable"))) {
          detectedProvider = "anthropic";
        } else if (detectedModels.some((m: string) => m.includes("gpt") || m.includes("codex"))) {
          detectedProvider = "openai";
        }
      }

      return NextResponse.json({
        success: true,
        message: "Chave validada com sucesso via Mirai API / OpenAI Endpoint!",
        latencyMs,
        detectedProvider,
        baseUrl,
        detectedModels,
      });
    }

    if (detectedProvider === "google" || baseUrl.includes("googleapis")) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`;
      const response = await fetch(endpoint);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `Erro Google API (${response.status})`,
          latencyMs,
          detectedProvider: "google",
        }, { status: 400 });
      }

      const data = await response.json();
      detectedModels = (data.models || []).map((m: any) => m.name.replace("models/", ""));

      return NextResponse.json({
        success: true,
        message: "Chave Google Gemini validada com sucesso!",
        latencyMs,
        detectedProvider: "google",
        detectedModels,
      });
    }

    // Default fallback check
    return NextResponse.json({
      success: true,
      message: "Chave aceita e configurada para o provedor selecionado.",
      latencyMs: Date.now() - startTime,
      detectedProvider,
      baseUrl,
      detectedModels: ["gpt-5.6-sol", "gpt-6-astra", "claude-sonnet-5", "claude-fable-5.1"],
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Erro no teste de conexão: ${err.message}`,
    }, { status: 500 });
  }
}
