// src/app/api/workspace/files/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const file = await prisma.file.findUnique({
      where: { id: params.id },
      include: {
        conversation: {
          select: { id: true, title: true },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    // Validação estrita de propriedade
    if (file.userId !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado a este arquivo." }, { status: 403 });
    }

    return NextResponse.json({
      file: {
        id: file.id,
        name: file.originalName,
        sizeBytes: file.fileSizeBytes,
        mimeType: file.mimeType,
        category: file.category,
        isGenerated: file.isGenerated,
        conversation: file.conversation,
        previewData: file.previewData ? JSON.parse(file.previewData) : null,
        extractedText: file.extractedText,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao obter detalhes do arquivo.", details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const file = await prisma.file.findUnique({
      where: { id: params.id },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    if (file.userId !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    await prisma.file.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      deletedId: params.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao excluir arquivo.", details: error?.message },
      { status: 500 }
    );
  }
}
