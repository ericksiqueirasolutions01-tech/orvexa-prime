// src/app/api/admin/ai-keys/[id]/test/route.ts
// TESTE DE CONEXÃO DE CHAVE DE CONTRATO (🧪 Testar conexão) — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AiKeyManagementService } from "@/ai/keys/key-management.service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const result = await AiKeyManagementService.testKeyConnection(params.id);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      latencyMs: result.latencyMs,
      detectedModels: result.detectedModels,
      message: result.message,
      errorCode: result.errorCode,
    });
  } catch (err: any) {
    console.error("[API AI Key Test Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro no teste de conexão da chave." },
      { status: 500 }
    );
  }
}

