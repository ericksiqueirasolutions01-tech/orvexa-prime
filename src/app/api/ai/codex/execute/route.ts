// src/app/api/ai/codex/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeInSandbox } from "@/ai/codex/sandbox";
import { SupportedLanguage } from "@/ai/codex/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { code, language, cssCode, timeoutMs } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "O parâmetro 'code' é obrigatório para execução." },
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
      : "javascript";

    const result = await executeInSandbox({
      code,
      language: lang,
      cssCode,
      timeoutMs: timeoutMs ? Math.min(timeoutMs, 10000) : 3000,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Codex Execute Error]", error);
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao executar código no sandbox." },
      { status: 500 }
    );
  }
}

