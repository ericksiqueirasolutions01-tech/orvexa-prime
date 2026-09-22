// src/app/api/ai/codex/autofix/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { autoFixCode, SupportedLanguage } from "@/ai/codex/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { code, language, errorDescription } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "O parâmetro 'code' é obrigatório para auto-correção." },
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

    const fixResult = autoFixCode(code, lang, errorDescription);

    return NextResponse.json(fixResult);
  } catch (error: any) {
    console.error("[Codex AutoFix Error]", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao aplicar auto-correção de código." },
      { status: 500 }
    );
  }
}
