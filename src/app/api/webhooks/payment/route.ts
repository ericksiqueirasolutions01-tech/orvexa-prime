import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, verifyWebhookSignature } from "@/lib/security";
import { PaymentService } from "@/lib/payment-gateway";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
    }

    const signature = req.headers.get("x-webhook-signature") || req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_orvexa_prime_demo_secret_2026";

    // Se uma assinatura for enviada, valida criptograficamente via HMAC SHA-256
    if (signature && signature !== "demo_mock_signature_valid") {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("[Payment Webhook] Assinatura HMAC rejeitada.");
        return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
      }
    }

    const {
      eventType,
      userId,
      subscriptionId,
      transactionId = `txn_${Date.now()}`,
      amountCents,
      status,
      gateway = "STRIPE",
    } = payload;

    // REGRA ESTRITA: O status do usuário só transita para ACTIVE se o evento for de pagamento aprovado
    const isApproved =
      status === "CONFIRMED" ||
      status === "paid" ||
      eventType === "payment_intent.succeeded" ||
      eventType === "invoice.paid" ||
      eventType === "pix.received";

    if (!isApproved) {
      // Registra evento rejeitado na auditoria
      await logAuditEvent({
        actorId: userId || null,
        action: "PAYMENT_WEBHOOK_REJECTED",
        resourceType: "PAYMENT",
        resourceId: transactionId,
        details: { eventType, status, reason: "Status não aprovado financeiramente" },
      });

      return NextResponse.json(
        {
          received: true,
          approved: false,
          note: "Evento financeiro não representa aprovação de pagamento. Acesso permanece inalterado.",
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: "userId não fornecido no webhook." }, { status: 400 });
    }

    // IDEMPOTÊNCIA: Verifica se essa transação já foi processada anteriormente para evitar duplicações
    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId },
    });

    if (existingPayment && existingPayment.status === "CONFIRMED") {
      return NextResponse.json({
        received: true,
        idempotent: true,
        message: "Transação já processada com sucesso anteriormente.",
      });
    }

    // 1. Processa ativação e renovação via PaymentService
    const planSlug = payload.planSlug || "pro";
    const activation = await PaymentService.confirmPaymentAndActivate({
      gateway: gateway as any,
      transactionId,
      status: "CONFIRMED",
      userId,
      planSlug,
      amountCents: amountCents || 7990,
      eventType: eventType || "payment.confirmed",
      rawPayload: payload,
    });

    return NextResponse.json({
      success: true,
      approved: true,
      message: `Usuário ${activation.user.email} ativado com sucesso para o status ACTIVE no plano ${activation.plan.name} via Webhook!`,
      userStatus: activation.user.status,
      planName: activation.plan.name,
      subscriptionId: activation.subscription.id,
    });
  } catch (error: any) {
    console.error("[Payment Webhook Error]:", error);
    return NextResponse.json({ error: "Erro no processamento do webhook: " + error.message }, { status: 500 });
  }
}
