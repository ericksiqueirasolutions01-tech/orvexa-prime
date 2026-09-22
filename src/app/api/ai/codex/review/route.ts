// src/app/api/ai/codex/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { securityReview, SupportedLanguage } from "@/ai/codex/engine";

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
        { error: "O parâmetro 'code' é obrigatório para auditoria de segurança." },
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

    const auditResult = securityReview(code, lang);

    return NextResponse.json(auditResult);
  } catch (error: any) {
    console.error("[Codex Security Review Error]", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao realizar revisão de segurança." },
      { status: 500 }
    );
  }
}
