// src/app/api/admin/ai-keys/route.ts
// API DE GESTÃO DE CONTRATOS E CHAVES DE IA — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AiKeyManagementService } from "@/ai/keys/key-management.service";

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const data = await AiKeyManagementService.listKeysWithMetrics();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error("[API AI Keys GET Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao carregar contratos de chaves." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      provider,
      name,
      rawKey,
      tokenLimit,
      monthlyLimit,
      dailyLimit,
      initialBalance,
      expirationDate,
      renewalDate,
      customBaseUrl,
      status,
    } = body;

    if (!provider || !name) {
      return NextResponse.json(
        { error: "Provedor e nome da chave são obrigatórios." },
        { status: 400 }
      );
    }

    const savedKey = await AiKeyManagementService.saveKeyContract({
      id,
      provider,
      name,
      rawKey,
      tokenLimit,
      monthlyLimit,
      dailyLimit,
      initialBalance,
      expirationDate,
      renewalDate,
      customBaseUrl,
      status,
    });

    return NextResponse.json({
      success: true,
      message: id ? "Contrato atualizado com sucesso!" : "Contrato cadastrado com sucesso!",
      key: {
        id: savedKey.id,
        name: savedKey.name,
        provider: savedKey.provider,
        keyHint: savedKey.keyHint,
        tokenLimit: savedKey.tokenLimit,
        status: savedKey.status,
      },
    });
  } catch (err: any) {
    console.error("[API AI Keys POST Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao salvar contrato de chave." },
      { status: 500 }
    );
  }
}

