// src/app/api/admin/ai-monitor/keys/route.ts
// GESTÃO OPERACIONAL DE CHAVES DE API VIA AI MONITOR — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";
import { AIMonitorService } from "@/ai/monitoring/ai-monitor.service";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const { action, keyId, newKey, name, providerSlug, tokenLimitMonthly, customBaseUrl } = await req.json();

    // 1. TESTAR CONEXÃO DE UMA CHAVE ESPECÍFICA
    if (action === "test") {
      if (!keyId) {
        return NextResponse.json({ error: "ID da chave não informado." }, { status: 400 });
      }

      const keyRecord = await prisma.apiKey.findUnique({
        where: { id: keyId },
        include: { provider: true },
      });

      if (!keyRecord) {
        return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
      }

      const decrypted = decryptApiKey(keyRecord.encryptedKey, keyRecord.iv, keyRecord.authTag);
      const testResult = await AIProviderService.testConnection({
        providerSlug: keyRecord.provider.slug,
        apiKey: decrypted,
        customBaseUrl: keyRecord.customBaseUrl || keyRecord.provider.baseUrl || null,
      });

      const updatedStatus = testResult.success
        ? "ACTIVE"
        : testResult.errorCode === 429
        ? "RATE_LIMITED"
        : "ERROR";

      await prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: {
          status: updatedStatus,
          errorCount: testResult.success ? 0 : { increment: 1 },
          lastUsedAt: testResult.success ? new Date() : undefined,
        },
      });

      // Atualiza também a tabela de saúde do provedor
      await AIMonitorService.checkProviderHealth(keyRecord.provider.slug).catch(() => {});

      return NextResponse.json({
        success: testResult.success,
        latencyMs: testResult.latencyMs,
        message: testResult.message,
        status: updatedStatus,
        detectedModels: testResult.detectedModels || [],
      });
    }

    // 2. ATIVAR / DESATIVAR CHAVE (TOGGLE)
    if (action === "toggle") {
      if (!keyId) {
        return NextResponse.json({ error: "ID da chave não informado." }, { status: 400 });
      }

      const keyRecord = await prisma.apiKey.findUnique({ where: { id: keyId } });
      if (!keyRecord) {
        return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
      }

      const newStatus = keyRecord.status === "DISABLED" ? "ACTIVE" : "DISABLED";
      const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: { status: newStatus },
        include: { provider: true },
      });

      await AIMonitorService.checkProviderHealth(updated.provider.slug).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Chave ${newStatus === "ACTIVE" ? "ativada" : "desativada"} com sucesso.`,
        status: newStatus,
      });
    }

    // 3. SUBSTITUIR CHAVE EXISTENTE
    if (action === "replace") {
      if (!keyId || !newKey?.trim()) {
        return NextResponse.json({ error: "Informe o ID da chave e o novo valor de API Key." }, { status: 400 });
      }

      const trimmedKey = newKey.trim();
      const keyRecord = await prisma.apiKey.findUnique({
        where: { id: keyId },
        include: { provider: true },
      });

      if (!keyRecord) {
        return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
      }

      // Valida a conexão com a nova chave antes de salvar
      const testResult = await AIProviderService.testConnection({
        providerSlug: keyRecord.provider.slug,
        apiKey: trimmedKey,
        customBaseUrl: customBaseUrl || keyRecord.customBaseUrl || keyRecord.provider.baseUrl || null,
      });

      const encrypted = encryptApiKey(trimmedKey);
      const hint = `...${trimmedKey.slice(-4)}`;

      const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          encryptedKey: encrypted.cipherText,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyHint: hint,
          status: testResult.success ? "ACTIVE" : "ERROR",
          errorCount: 0,
          customBaseUrl: customBaseUrl !== undefined ? customBaseUrl : keyRecord.customBaseUrl,
          tokenLimitMonthly: tokenLimitMonthly !== undefined ? Number(tokenLimitMonthly) : keyRecord.tokenLimitMonthly,
        },
      });

      await AIMonitorService.checkProviderHealth(keyRecord.provider.slug).catch(() => {});

      return NextResponse.json({
        success: true,
        message: testResult.success
          ? "Chave substituída e validada com sucesso!"
          : `Chave substituída, mas teste de conexão acusou: ${testResult.message}`,
        testedOnline: testResult.success,
        keyHint: hint,
        latencyMs: testResult.latencyMs,
      });
    }

    // 4. CRIAR NOVA CHAVE PARA UM PROVEDOR
    if (action === "create") {
      if (!newKey?.trim() || !providerSlug) {
        return NextResponse.json({ error: "Informe a chave e o slug do provedor." }, { status: 400 });
      }

      const trimmedKey = newKey.trim();
      let provider = await prisma.aiProvider.findUnique({ where: { slug: providerSlug } });

      // Se não encontrou provedor, cria registro
      if (!provider) {
        provider = await prisma.aiProvider.create({
          data: {
            slug: providerSlug,
            name: providerSlug.toUpperCase(),
            baseUrl: customBaseUrl || null,
          },
        });
      }

      // Valida conexão
      const testResult = await AIProviderService.testConnection({
        providerSlug,
        apiKey: trimmedKey,
        customBaseUrl: customBaseUrl || provider.baseUrl || null,
      });

      const encrypted = encryptApiKey(trimmedKey);
      const hint = `...${trimmedKey.slice(-4)}`;

      const created = await prisma.apiKey.create({
        data: {
          providerId: provider.id,
          name: name || `${provider.name} Key`,
          encryptedKey: encrypted.cipherText,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyHint: hint,
          status: testResult.success ? "ACTIVE" : "ERROR",
          customBaseUrl: customBaseUrl || null,
          tokenLimitMonthly: tokenLimitMonthly ? Number(tokenLimitMonthly) : 0,
        },
      });

      await AIMonitorService.checkProviderHealth(providerSlug).catch(() => {});

      return NextResponse.json({
        success: true,
        message: testResult.success ? "Chave criada e validada com sucesso!" : `Chave cadastrada, mas apresentou erro: ${testResult.message}`,
        key: {
          id: created.id,
          name: created.name,
          keyHint: created.keyHint,
          status: created.status,
        },
      });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (err: any) {
    console.error("[API AI Monitor Keys Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro operacional nas chaves de API." },
      { status: 500 }
    );
  }
}
