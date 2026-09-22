// src/app/api/ai/codex/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  CODEX_TEMPLATES,
  createCodexProject,
  parseProjectStructure,
  SupportedLanguage,
} from "@/ai/codex/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    return NextResponse.json({
      templates: CODEX_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        primaryLanguage: t.primaryLanguage,
        category: t.category,
        badge: t.badge,
        filesCount: t.files.length,
      })),
      supportedLanguages: [
        { id: "javascript", label: "JavaScript (Node/ESM)", ext: ".js" },
        { id: "typescript", label: "TypeScript (Strict)", ext: ".ts" },
        { id: "python", label: "Python (3.12)", ext: ".py" },
        { id: "html", label: "HTML5 (Semantic)", ext: ".html" },
        { id: "css", label: "CSS3 / Modern styling", ext: ".css" },
        { id: "sql", label: "SQL (Relational)", ext: ".sql" },
        { id: "csharp", label: "C# / .NET 8 Core", ext: ".cs" },
      ],
    });
  } catch (error: any) {
    console.error("[Codex Projects GET Error]", error);
    return NextResponse.json({ error: "Falha ao listar templates." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { templateId, projectName, customLanguage } = body;

    const project = createCodexProject(templateId || "nextjs-fullstack", projectName);
    const structure = parseProjectStructure(project.files);

    return NextResponse.json({
      success: true,
      project,
      structure,
    });
  } catch (error: any) {
    console.error("[Codex Projects POST Error]", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao instanciar projeto no Codex." },
      { status: 500 }
    );
  }
}

