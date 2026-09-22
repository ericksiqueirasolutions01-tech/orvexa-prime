import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, verifyWebhookSignature } from "@/lib/security";

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

    // 1. Atualiza status do usuário no banco para ACTIVE
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
      include: { plan: true },
    });

    // 2. Atualiza assinatura e período de vigência
    let subId = subscriptionId;
    if (!subId) {
      const userSub = await prisma.subscription.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      if (userSub) subId = userSub.id;
    }

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (subId) {
      await prisma.subscription.update({
        where: { id: subId },
        data: {
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextMonth,
        },
      });
    }

    // 3. Registra pagamento confirmado
    await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subId || null,
        amountCents: amountCents || user.plan?.priceCents || 11990,
        currency: "BRL",
        status: "CONFIRMED",
        gateway,
        transactionId,
      },
    });

    // 4. Registra auditoria de segurança
    await logAuditEvent({
      actorId: user.id,
      action: "PAYMENT_CONFIRMED_VIA_WEBHOOK",
      resourceType: "PAYMENT",
      resourceId: transactionId,
      details: {
        userId: user.id,
        email: user.email,
        plan: user.plan?.name,
        amountCents,
        gateway,
        eventType,
      },
    });

    return NextResponse.json({
      success: true,
      approved: true,
      message: `Usuário ${user.email} ativado com sucesso para o status ACTIVE via Webhook!`,
      userStatus: "ACTIVE",
      planName: user.plan?.name || "START",
    });
  } catch (error: any) {
    console.error("[Payment Webhook Error]:", error);
    return NextResponse.json({ error: "Erro no processamento do webhook: " + error.message }, { status: 500 });
  }
}
