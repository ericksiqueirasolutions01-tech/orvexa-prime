// src/app/api/ai/memory/sync-files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { indexFileKnowledge, indexAllUserFiles } from "@/ai/memory/file-indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: Indexa arquivos do usuário para o banco de conhecimento semântico
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { fileId } = body;

    if (fileId) {
      const res = await indexFileKnowledge(fileId);
      return NextResponse.json(res);
    }

    const res = await indexAllUserFiles(session.id);
    return NextResponse.json({
      success: true,
      message: `Indexação concluída: ${res.filesProcessed} arquivos processados e ${res.totalChunks} trechos semânticos criados.`,
      ...res,
    });
  } catch (error: any) {
    console.error("[Memory Sync Files Error]", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao sincronizar arquivos na memória." },
      { status: 500 }
    );
  }
}
