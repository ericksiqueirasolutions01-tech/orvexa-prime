import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PaymentService } from "@/lib/payment-gateway";
import { prisma } from "@/lib/prisma";
import { PLANS_CONFIG } from "@/lib/consumption";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { planSlug } = body;

    const validSlugs = ["free", "pro", "business", "enterprise"];
    if (!planSlug || !validSlugs.includes(planSlug)) {
      return NextResponse.json({ error: "Plano inválido selecionado." }, { status: 400 });
    }

    const planConfig = PLANS_CONFIG[planSlug];

    // Se for upgrade para FREE, aplica imediatamente
    if (planSlug === "free") {
      await PaymentService.activatePlanDirectly(session.id, "free");
      return NextResponse.json({
        success: true,
        message: "Plano atualizado para FREE com sucesso.",
        plan: "FREE",
      });
    }

    // Processa ativação via PaymentService (em ambiente de produção seria disparado via Webhook após confirmação bancária)
    const result = await PaymentService.confirmPaymentAndActivate({
      gateway: "SANDBOX",
      transactionId: `upgrade_${planSlug}_${Date.now()}`,
      status: "CONFIRMED",
      userId: session.id,
      planSlug,
      amountCents: planConfig.priceCents,
      eventType: "upgrade.direct_confirmation",
    });

    return NextResponse.json({
      success: true,
      message: `Upgrade para o plano ${result.plan.name} realizado com sucesso!`,
      plan: result.plan.name,
      subscription: result.subscription,
    });
  } catch (err: any) {
    console.error("[Billing Upgrade Error]:", err);
    return NextResponse.json({ error: err.message || "Erro no upgrade de plano." }, { status: 500 });
  }
}

