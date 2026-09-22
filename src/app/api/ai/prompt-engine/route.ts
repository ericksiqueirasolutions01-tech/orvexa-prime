import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildProfessionalPrompt, PromptEngineOptions } from "@/lib/prompt-engine";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  // REGRA ESTRITA: Bloqueia acesso à IA para contas sem pagamento confirmado
  if (session.status !== "ACTIVE" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Acesso bloqueado: assinatura com pagamento pendente de confirmação via webhook." },
      { status: 403 }
    );
  }

  // RATE LIMITING: 30 requisições por minuto
  const rateCheck = checkRateLimit(`prompt-engine:${session.id}`, 30, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Limite de requisições excedido. Tente novamente em ${rateCheck.resetInSeconds} segundos.` },
      { status: 429 }
    );
  }

  try {
    const { prompt, category, aspectRatio, styleOverride } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Informe o texto do prompt simples para ser turbinado." },
        { status: 400 }
      );
    }

    const options: PromptEngineOptions = {
      category,
      aspectRatio,
      styleOverride,
    };

    const structured = buildProfessionalPrompt(prompt, options);

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      structured,
    });
  } catch (error: any) {
    console.error("[Prompt Engine Error]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar o prompt estruturado." },
      { status: 500 }
    );
  }
}
