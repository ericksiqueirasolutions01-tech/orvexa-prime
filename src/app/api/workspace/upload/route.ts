// src/app/api/workspace/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromFileBuffer } from "@/ai/tools/files";
import { categorizeFileName } from "@/ai/tools/file-generator";
import { checkUserStorageQuota } from "@/lib/plan-limits";
import { assertCanUploadFile } from "@/lib/consumption";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const formData = await req.formData();
    const conversationId = (formData.get("conversationId") as string) || null;

    // Obtém todos os arquivos enviados (suporta campos "files", "file" ou múltiplos anexos)
    const rawFiles = [
      ...formData.getAll("files"),
      ...formData.getAll("file"),
    ].filter((item): item is File => item instanceof File && item.size > 0);

    // Remove duplicatas se o mesmo arquivo foi pego em ambas as chaves
    const filesMap = new Map<string, File>();
    for (const f of rawFiles) {
      const key = `${f.name}-${f.size}`;
      if (!filesMap.has(key)) {
        filesMap.set(key, f);
      }
    }
    const files = Array.from(filesMap.values());

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo válido foi enviado." }, { status: 400 });
    }

    // 1. Verificação Centralizada de Quota de Armazenamento e Quantidade de Arquivos
    const incomingBytes = files.reduce((acc, f) => acc + f.size, 0);

    const fileGuard = await assertCanUploadFile(session.id, incomingBytes);
    if (!fileGuard.allowed) {
      return NextResponse.json(
        {
          error: fileGuard.reason,
          quotaExceeded: true,
          planUpgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const storageCheck = await checkUserStorageQuota(session.id, incomingBytes);
    if (!storageCheck.hasStorage && session.role !== "ADMIN") {
      const quotaMb = (storageCheck.maxBytes / (1024 * 1024)).toFixed(0);
      const usedMb = (storageCheck.usedBytes / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          error: `Limite de armazenamento excedido (${usedMb} MB de ${quotaMb} MB). Libere espaço ou faça upgrade do seu plano.`,
          quotaExceeded: true,
          storageStatus: storageCheck,
        },
        { status: 403 }
      );
    }

    // 2. Processamento e Persistência de Cada Arquivo
    const createdFiles: any[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const analysis = await extractTextFromFileBuffer(file.name, buffer, file.type);
      const category = categorizeFileName(file.name, file.type);

      const saved = await prisma.file.create({
        data: {
          userId: session.id,
          conversationId,
          originalName: file.name,
          storedPath: `/uploads/${session.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
          fileSizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          category,
          isGenerated: false,
          previewData: analysis.previewData ? JSON.stringify(analysis.previewData) : null,
          extractedText: analysis.extractedText,
        },
      });

      createdFiles.push({
        id: saved.id,
        name: saved.originalName,
        sizeBytes: saved.fileSizeBytes,
        mimeType: saved.mimeType,
        category: saved.category,
        format: analysis.format,
        metrics: analysis.metrics,
        previewData: analysis.previewData,
        createdAt: saved.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      uploaded: createdFiles,
      count: createdFiles.length,
      storage: {
        usedBytes: storageCheck.usedBytes + incomingBytes,
        quotaBytes: storageCheck.maxBytes,
        percentage: storageCheck.maxBytes > 0 ? Math.min(100, Math.round(((storageCheck.usedBytes + incomingBytes) / storageCheck.maxBytes) * 100)) : 0,
      },
    });
  } catch (error: any) {
    console.error("[Workspace Upload Error]", error);
    return NextResponse.json(
      { error: "Erro ao processar upload de arquivos no Workspace.", details: error?.message },
      { status: 500 }
    );
  }
}

