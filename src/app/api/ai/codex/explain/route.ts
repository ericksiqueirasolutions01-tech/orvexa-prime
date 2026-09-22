// src/app/api/ai/codex/explain/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { explainCodeSnippet, SupportedLanguage } from "@/ai/codex/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { code, language } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "O parâmetro 'code' é obrigatório para explicação." },
        { status: 400 }
      );
    }

    const validLanguages: SupportedLanguage[] = [
      "javascript",
      "typescript",
      "python",
      "html",
      "css",
      "sql",
      "csharp",
    ];

    const lang: SupportedLanguage = validLanguages.includes(language)
      ? language
      : "typescript";

    const explanation = explainCodeSnippet(code, lang);

    return NextResponse.json(explanation);
  } catch (error: any) {
    console.error("[Codex Explain Error]", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar explicação do código." },
      { status: 500 }
    );
  }
}

