// src/app/api/ai/codex/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { packageCodexZip, CodexProject, CodexFile } from "@/ai/codex/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { project, files, projectName } = body;

    let targetProject: CodexProject;

    if (project && Array.isArray(project.files)) {
      targetProject = project;
    } else if (Array.isArray(files)) {
      targetProject = {
        id: `custom-${Date.now()}`,
        name: (projectName || "projeto-codex").replace(/[^a-zA-Z0-9_-]/g, "-"),
        templateId: "custom",
        description: "Projeto exportado pelo ORVEXA Codex Engine",
        language: files[0]?.language || "typescript",
        files: files as CodexFile[],
        createdAt: new Date().toISOString(),
      };
    } else {
      return NextResponse.json(
        { error: "Dados inválidos: forneça um objeto 'project' ou array 'files'." },
        { status: 400 }
      );
    }

    const { zipBuffer, zipFileName, sizeBytes } = await packageCodexZip(targetProject);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
        "Content-Length": String(sizeBytes),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[Codex Export Error]", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar pacote ZIP do projeto." },
      { status: 500 }
    );
  }
}
