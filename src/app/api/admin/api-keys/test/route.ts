// src/app/api/admin/api-keys/test/route.ts
// TESTE DE CONEXÃO DE PROVEDORES DE IA — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";

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
    let targetKeyRecord: any = null;

    // Se fornecido keyId, recupera e decripta a chave do banco com segurança
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

    // Executa teste unificado através do AIProviderService
    const testResult = await AIProviderService.testConnection({
      providerSlug: detectedProvider,
      apiKey: trimmedKey,
      customBaseUrl: baseUrl || null,
      modelIdentifier,
    });

    // Se o teste foi realizado em uma chave já cadastrada no banco, atualiza status
    if (targetKeyRecord) {
      if (testResult.success) {
        await prisma.apiKey.update({
          where: { id: targetKeyRecord.id },
          data: {
            status: "ACTIVE",
            errorCount: 0,
            quarantinedUntil: null,
            lastUsedAt: new Date(),
          },
        }).catch(() => {});
      } else {
        await prisma.apiKey.update({
          where: { id: targetKeyRecord.id },
          data: {
            status: testResult.errorCode === 429 ? "RATE_LIMITED" : "ERROR",
            errorCount: { increment: 1 },
          },
        }).catch(() => {});
      }
    }

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: testResult.message,
          latencyMs: testResult.latencyMs,
          detectedProvider: testResult.provider,
          endpointUsed: testResult.endpointUsed,
          errorCode: testResult.errorCode,
          details: testResult.details,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: testResult.message,
      latencyMs: testResult.latencyMs,
      detectedProvider: testResult.provider,
      endpointUsed: testResult.endpointUsed,
      detectedModels: testResult.detectedModels || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Erro no teste de conexão: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
