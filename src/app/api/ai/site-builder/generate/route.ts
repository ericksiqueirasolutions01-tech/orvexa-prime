import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateSite, SiteBuilderParams } from "@/lib/site-builder";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // REGRA ESTRITA: Nunca liberar acesso à IA para contas com pagamento pendente
    if (user.status !== "ACTIVE" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso bloqueado: assinatura com pagamento pendente de confirmação via webhook." },
        { status: 403 }
      );
    }

    // RATE LIMITING: Máximo 20 gerações de site por minuto por usuário
    const rateCheck = checkRateLimit(`site-builder:${user.id}`, 20, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Limite de requisições excedido. Tente novamente em ${rateCheck.resetInSeconds} segundos.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetInSeconds),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await req.json();
    const {
      segment,
      name,
      primaryColor,
      secondaryColor,
      bgColor,
      objective,
      whatsapp,
      customDetails,
    } = body;

    if (!segment || !name) {
      return NextResponse.json(
        { error: "Segmento e Nome são obrigatórios." },
        { status: 400 }
      );
    }

    const validSegments = ["loja", "clinica", "restaurante", "igreja", "advogado", "petshop", "landing"];
    if (!validSegments.includes(segment)) {
      return NextResponse.json(
        { error: "Segmento inválido." },
        { status: 400 }
      );
    }

    const params: SiteBuilderParams = {
      segment,
      name,
      primaryColor,
      secondaryColor,
      bgColor,
      objective,
      whatsapp,
      customDetails,
    };

    const site = generateSite(params);

    return NextResponse.json(
      {
        success: true,
        site,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateCheck.limit),
          "X-RateLimit-Remaining": String(rateCheck.remaining),
        },
      }
    );
  } catch (error: any) {
    console.error("[SiteBuilder Generate Error]:", error);
    return NextResponse.json(
      { error: "Erro ao gerar site: " + error.message },
      { status: 500 }
    );
  }
}
