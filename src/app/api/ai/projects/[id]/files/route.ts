// src/app/api/ai/projects/[id]/files/route.ts
// GERENCIAMENTO DE ARQUIVOS VINCULADOS AO PROJETO — ORVEXA PRIME DIGITAL

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromFileBuffer } from "@/ai/tools/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * GET: Lista os arquivos vinculados ao projeto
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id: projectId } = params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const files = await prisma.projectFile.findMany({
      where: { projectId, userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error: any) {
    console.error("[Project Files GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao listar arquivos do projeto: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Faz upload de arquivo para o projeto e extrai o texto para contextualizar a IA
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id: projectId } = params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo válido foi enviado." },
        { status: 400 }
      );
    }

    // Lê os bytes do arquivo para extrair o texto
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    try {
      const analysis = await extractTextFromFileBuffer(file.name, buffer, file.type);
      extractedText = analysis.extractedText || "";
    } catch {
      // Se não for possível extrair formato binário, tenta como texto simples
      try {
        extractedText = buffer.toString("utf-8");
      } catch {}
    }

    const projectFile = await prisma.projectFile.create({
      data: {
        projectId,
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || file.name.split(".").pop() || "unknown",
        extractedText: extractedText ? extractedText.slice(0, 50000) : null,
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: projectFile.id,
        fileName: projectFile.fileName,
        fileSize: projectFile.fileSize,
        fileType: projectFile.fileType,
        createdAt: projectFile.createdAt,
        hasExtractedText: !!projectFile.extractedText,
      },
    });
  } catch (error: any) {
    console.error("[Project Files POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao anexar arquivo ao projeto: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Exclui um arquivo do projeto
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id: projectId } = params;
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const fileId = searchParams.get("fileId") || body.fileId;

    if (!fileId) {
      return NextResponse.json(
        { error: "O ID do arquivo é obrigatório para exclusão." },
        { status: 400 }
      );
    }

    const existing = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Arquivo não encontrado." },
        { status: 404 }
      );
    }

    await prisma.projectFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({
      success: true,
      message: "Arquivo desvinculado do projeto.",
    });
  } catch (error: any) {
    console.error("[Project Files DELETE Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir arquivo do projeto: " + error.message },
      { status: 500 }
    );
  }
}

