// src/app/api/admin/ai-keys/route.ts
// API CENTRAL DO AI QUOTA MANAGER & CONTRATOS — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AiQuotaManagerService } from "@/ai/quota/quota-manager.service";
import { AiKeyManagementService } from "@/ai/keys/key-management.service";

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const quotaData = await AiQuotaManagerService.listAccountsWithMetrics();

    // Compatibilidade reversa caso haja chamada legacy
    let legacyKeys: any[] = [];
    try {
      const keysData = await AiKeyManagementService.listKeysWithMetrics();
      legacyKeys = keysData.keys;
    } catch {}

    return NextResponse.json({
      success: true,
      accounts: quotaData.accounts,
      alerts: quotaData.alerts,
      totals: quotaData.totals,
      keys: legacyKeys, // fallback
    });
  } catch (err: any) {
    console.error("[API AI Keys/Quota GET Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao carregar contas e quotas de IA." },
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
      accountName,
      rawKey,
      totalQuota,
      tokenLimit,
      quotaType,
      expirationDate,
      renewalDate,
      customBaseUrl,
      status,
    } = body;

    const finalAccountName = accountName || name;

    if (!provider || !finalAccountName) {
      return NextResponse.json(
        { error: "Provedor e nome da conta/chave são obrigatórios." },
        { status: 400 }
      );
    }

    const savedAccount = await AiQuotaManagerService.saveAccount({
      id,
      provider,
      accountName: finalAccountName,
      rawKey,
      totalQuota: totalQuota || tokenLimit || 1000000,
      quotaType: quotaType || "TOKENS",
      expirationDate,
      renewalDate,
      customBaseUrl,
      status,
    });

    return NextResponse.json({
      success: true,
      message: id ? "Conta de quota atualizada com sucesso!" : "Conta de quota cadastrada com sucesso!",
      account: savedAccount,
    });
  } catch (err: any) {
    console.error("[API AI Quota POST Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao salvar conta de quota." },
      { status: 500 }
    );
  }
}
