// src/app/api/admin/ai-keys/[id]/route.ts
// GERENCIAMENTO INDIVIDUAL DE CONTA DE QUOTA — ORVEXA PRIME

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AiQuotaManagerService } from "@/ai/quota/quota-manager.service";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    await AiQuotaManagerService.deleteAccount(params.id);
    return NextResponse.json({
      success: true,
      message: "Conta removida com sucesso.",
    });
  } catch (err: any) {
    console.error("[API AI Quota Account DELETE Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao remover conta." },
      { status: 500 }
    );
  }
}
