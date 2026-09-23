// src/app/api/admin/ai-keys/sync/route.ts
// ROTA DE SINCRONIZAÇÃO DE SALDOS E QUOTAS DE API — ORVEXA PRIME

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AiQuotaManagerService } from "@/ai/quota/quota-manager.service";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    let accountId: string | null = null;
    try {
      const body = await req.json();
      accountId = body?.accountId || null;
    } catch {
      // Body vazio significa sincronizar todas
    }

    if (accountId) {
      const updated = await AiQuotaManagerService.syncAccount(accountId);
      return NextResponse.json({
        success: true,
        message: "Conta sincronizada com sucesso!",
        account: updated,
      });
    }

    const result = await AiQuotaManagerService.syncAllAccounts();
    return NextResponse.json({
      success: true,
      message: `Sincronização concluída para ${result.syncedCount} contas de provedores.`,
      accounts: result.accounts,
    });
  } catch (err: any) {
    console.error("[API AI Quota Sync Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro durante a sincronização de quotas." },
      { status: 500 }
    );
  }
}

