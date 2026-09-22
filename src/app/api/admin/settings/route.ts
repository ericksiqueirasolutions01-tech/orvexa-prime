// src/app/api/admin/settings/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/crypto";
import { MODEL_REGISTRY } from "@/ai/models/registry";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    // 1. Carrega configurações salvas na tabela SystemSetting
    const settings = await prisma.systemSetting.findMany({
      where: { category: "AI" },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // 2. Carrega provedores e chaves ativas (sanitizadas)
    const providers = await prisma.aiProvider.findMany({
      include: {
        apiKeys: {
          select: {
            id: true,
            name: true,
            keyHint: true,
            status: true,
            errorCount: true,
            lastUsedAt: true,
            customBaseUrl: true,
          },
        },
      },
    });

    const availableModels = Object.values(MODEL_REGISTRY).map((m) => ({
      identifier: m.identifier,
      name: m.name,
      provider: m.provider,
      category: m.category,
      isFlagship: m.isFlagship,
    }));

    return NextResponse.json({
      settings: {
        defaultModel: settingsMap["default_model"] || "claude-sonnet-5",
        codingModel: settingsMap["coding_model"] || "gpt-5.6-sol",
        documentModel: settingsMap["document_model"] || "claude-sonnet-5",
        imageModel: settingsMap["image_model"] || "flux-ultra-8k",
      },
      providers,
      availableModels,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { defaultModel, codingModel, documentModel, imageModel, rawOpenAiKey, rawClaudeKey, rawGoogleKey } = body;

    // Salva preferências de modelos padrão no SystemSetting
    const modelConfigs = [
      { key: "default_model", value: defaultModel || "claude-sonnet-5" },
      { key: "coding_model", value: codingModel || "gpt-5.6-sol" },
      { key: "document_model", value: documentModel || "claude-sonnet-5" },
      { key: "image_model", value: imageModel || "flux-ultra-8k" },
    ];

    for (const cfg of modelConfigs) {
      await prisma.systemSetting.upsert({
        where: { key: cfg.key },
        update: { value: cfg.value },
        create: { key: cfg.key, value: cfg.value, category: "AI" },
      });
    }

    // Se nova chave OpenAI foi fornecida
    if (rawOpenAiKey && rawOpenAiKey.trim()) {
      const openAiProvider = await prisma.aiProvider.findUnique({ where: { slug: "openai" } });
      if (openAiProvider) {
        const encrypted = encryptApiKey(rawOpenAiKey.trim());
        await prisma.apiKey.create({
          data: {
            providerId: openAiProvider.id,
            name: `OpenAI Key (${encrypted.keyHint})`,
            encryptedKey: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            keyHint: encrypted.keyHint,
            status: "ACTIVE",
            priority: 1,
            capabilities: JSON.stringify(["CODIGO", "TEXTO", "CRIACAO_SITES"]),
          },
        });
      }
    }

    // Se nova chave Claude foi fornecida
    if (rawClaudeKey && rawClaudeKey.trim()) {
      const claudeProvider = await prisma.aiProvider.findUnique({ where: { slug: "anthropic" } });
      if (claudeProvider) {
        const encrypted = encryptApiKey(rawClaudeKey.trim());
        await prisma.apiKey.create({
          data: {
            providerId: claudeProvider.id,
            name: `Claude Key (${encrypted.keyHint})`,
            encryptedKey: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            keyHint: encrypted.keyHint,
            status: "ACTIVE",
            priority: 1,
            capabilities: JSON.stringify(["DOCUMENTO", "TEXTO"]),
          },
        });
      }
    }

    // Se nova chave Google foi fornecida
    if (rawGoogleKey && rawGoogleKey.trim()) {
      const googleProvider = await prisma.aiProvider.findUnique({ where: { slug: "google" } });
      if (googleProvider) {
        const encrypted = encryptApiKey(rawGoogleKey.trim());
        await prisma.apiKey.create({
          data: {
            providerId: googleProvider.id,
            name: `Gemini Key (${encrypted.keyHint})`,
            encryptedKey: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            keyHint: encrypted.keyHint,
            status: "ACTIVE",
            priority: 1,
            capabilities: JSON.stringify(["TEXTO", "DOCUMENTO"]),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Configurações de Inteligência Artificial salvas com sucesso!",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

