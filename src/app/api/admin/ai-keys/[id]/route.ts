// src/app/api/admin/ai-keys/[id]/route.ts
// DETALHES, EDIÇÃO E EXCLUSÃO DE CONTRATOS DE CHAVES — ORVEXA PRIME DIGITAL

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AiKeyManagementService } from "@/ai/keys/key-management.service";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const key = await prisma.aiProviderKey.findUnique({
      where: { id: params.id },
    });

    if (!key) {
      return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      key: {
        id: key.id,
        provider: key.provider,
        name: key.name,
        keyHint: key.keyHint,
        tokenLimit: key.tokenLimit,
        monthlyLimit: key.monthlyLimit,
        dailyLimit: key.dailyLimit,
        initialBalance: key.initialBalance,
        tokensUsed: key.tokensUsed,
        tokensRemaining: key.tokensRemaining,
        expirationDate: key.expirationDate?.toISOString() || null,
        renewalDate: key.renewalDate?.toISOString() || null,
        customBaseUrl: key.customBaseUrl,
        status: key.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    const body = await req.json();
    const updated = await AiKeyManagementService.saveKeyContract({
      id: params.id,
      ...body,
    });

    return NextResponse.json({
      success: true,
      message: "Contrato atualizado com sucesso.",
      key: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }

    await AiKeyManagementService.deleteKey(params.id);
    return NextResponse.json({
      success: true,
      message: "Chave excluída com sucesso.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

