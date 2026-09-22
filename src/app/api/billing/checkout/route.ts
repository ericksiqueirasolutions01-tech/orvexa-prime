import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PaymentService, PaymentMethodType, PaymentGatewayType } from "@/lib/payment-gateway";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const {
      planSlug = "pro",
      paymentMethod = "PIX",
      gateway = "MERCADO_PAGO",
    } = body;

    const validSlugs = ["free", "pro", "business", "enterprise"];
    if (!validSlugs.includes(planSlug)) {
      return NextResponse.json({ error: `Plano inválido: ${planSlug}` }, { status: 400 });
    }

    const checkout = await PaymentService.initiateCheckout({
      userId: session.id,
      planSlug,
      paymentMethod: paymentMethod as PaymentMethodType,
      gateway: gateway as PaymentGatewayType,
    });

    return NextResponse.json({
      success: true,
      checkout,
    });
  } catch (err: any) {
    console.error("[Billing Checkout Error]:", err);
    return NextResponse.json({ error: err.message || "Erro ao iniciar checkout." }, { status: 500 });
  }
}

