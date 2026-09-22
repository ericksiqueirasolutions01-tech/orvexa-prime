// src/app/api/workspace/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const category = searchParams.get("category");
    const isGenerated = searchParams.get("isGenerated");
    const search = searchParams.get("search");

    const where: any = {
      userId: session.id,
    };

    if (conversationId) {
      where.conversationId = conversationId;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (isGenerated === "true") {
      where.isGenerated = true;
    } else if (isGenerated === "false") {
      where.isGenerated = false;
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search } },
        { extractedText: { contains: search } },
      ];
    }

    const [files, storageAgg, user] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.file.aggregate({
        where: { userId: session.id },
        _sum: { fileSizeBytes: true },
        _count: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: session.id },
        include: { plan: true },
      }),
    ]);

    const quotaBytes = user?.plan?.storageQuotaBytes || 524288000;
    const usedBytes = storageAgg._sum.fileSizeBytes || 0;
    const totalFiles = storageAgg._count.id || 0;

    const formattedFiles = files.map((f) => ({
      id: f.id,
      name: f.originalName,
      sizeBytes: f.fileSizeBytes,
      mimeType: f.mimeType,
      category: f.category,
      isGenerated: f.isGenerated,
      conversationId: f.conversationId,
      previewData: f.previewData ? JSON.parse(f.previewData) : null,
      hasText: Boolean(f.extractedText && f.extractedText.length > 0),
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({
      files: formattedFiles,
      storage: {
        usedBytes,
        quotaBytes,
        percentUsed: Math.min(100, Math.round((usedBytes / quotaBytes) * 100)),
        totalFiles,
      },
    });
  } catch (error: any) {
    console.error("[Workspace Files List Error]", error);
    return NextResponse.json(
      { error: "Erro ao listar arquivos do workspace.", details: error?.message },
      { status: 500 }
    );
  }
}
