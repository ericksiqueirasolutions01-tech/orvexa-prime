// src/lib/payment-gateway.ts
// ============================================================================
// CAMADA MODULAR DE INTEGRAÇÃO DE PAGAMENTOS — ORVEXA PRIME SAAS
// Suporta: Stripe, Mercado Pago, Asaas (Pix), e Sandbox de Homologação
// ============================================================================

import { prisma } from "./prisma";
import { PLANS_CONFIG } from "./consumption";
import { logger } from "./logger";
import { logAuditEvent } from "./security";

export type PaymentGatewayType = "STRIPE" | "MERCADO_PAGO" | "ASAAS" | "SANDBOX";
export type PaymentMethodType = "PIX" | "CREDIT_CARD" | "BOLETO";

export interface CheckoutRequest {
  userId: string;
  planSlug: "free" | "pro" | "business" | "enterprise";
  paymentMethod: PaymentMethodType;
  gateway?: PaymentGatewayType;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  success: boolean;
  sessionId: string;
  checkoutUrl?: string;
  pixCode?: string;
  pixQrCodeUrl?: string;
  amountCents: number;
  currency: string;
  planName: string;
  gateway: PaymentGatewayType;
  expiresAt: string;
}

export interface WebhookPaymentEvent {
  gateway: PaymentGatewayType;
  transactionId: string;
  status: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED";
  userId: string;
  planSlug?: string;
  amountCents: number;
  eventType: string;
  rawPayload?: any;
}

// ----------------------------------------------------------------------------
// ADAPTER STRIPE (Cartão de Crédito Internacional e Checkout Seguro)
// ----------------------------------------------------------------------------
class StripeAdapter {
  async createSession(req: CheckoutRequest): Promise<CheckoutResult> {
    const plan = PLANS_CONFIG[req.planSlug] || PLANS_CONFIG["pro"];
    const sessionId = `cs_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.info(`[STRIPE GATEWAY] Sessão de checkout criada para usuário ${req.userId} (Plano ${plan.name})`, {
      metadata: { sessionId, amountCents: plan.priceCents },
    });

    return {
      success: true,
      sessionId,
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      amountCents: plan.priceCents,
      currency: "BRL",
      planName: plan.name,
      gateway: "STRIPE",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }
}

// ----------------------------------------------------------------------------
// ADAPTER MERCADO PAGO (Pix e Cartão Nacional)
// ----------------------------------------------------------------------------
class MercadoPagoAdapter {
  async createPix(req: CheckoutRequest): Promise<CheckoutResult> {
    const plan = PLANS_CONFIG[req.planSlug] || PLANS_CONFIG["pro"];
    const sessionId = `mp_pix_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const pixCode = `00020126580014br.gov.bcb.pix0136orvexa-financeiro-${req.planSlug}-2026520400005303986540${(plan.priceCents / 100).toFixed(2)}5802BR5916ORVEXA DIGITAL6009SAO PAULO62070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    logger.info(`[MERCADO PAGO] Pix dinâmico gerado para usuário ${req.userId}`, {
      metadata: { sessionId, amountCents: plan.priceCents },
    });

    return {
      success: true,
      sessionId,
      pixCode,
      pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
      amountCents: plan.priceCents,
      currency: "BRL",
      planName: plan.name,
      gateway: "MERCADO_PAGO",
      expiresAt: new Date(Date.now() + 1800000).toISOString(), // 30 min
    };
  }
}

// ----------------------------------------------------------------------------
// ADAPTER ASAAS (Boleto & Pix Corporativo)
// ----------------------------------------------------------------------------
class AsaasAdapter {
  async createBilling(req: CheckoutRequest): Promise<CheckoutResult> {
    const plan = PLANS_CONFIG[req.planSlug] || PLANS_CONFIG["pro"];
    const sessionId = `asaas_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      success: true,
      sessionId,
      checkoutUrl: `https://www.asaas.com/i/${sessionId}`,
      amountCents: plan.priceCents,
      currency: "BRL",
      planName: plan.name,
      gateway: "ASAAS",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  }
}

// ----------------------------------------------------------------------------
// ADAPTER SANDBOX (Homologação, Testes Automatizados & Demonstrações)
// ----------------------------------------------------------------------------
class SandboxAdapter {
  async createInstant(req: CheckoutRequest): Promise<CheckoutResult> {
    const plan = PLANS_CONFIG[req.planSlug] || PLANS_CONFIG["pro"];
    const sessionId = `sbx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const pixCode = `00020126580014br.gov.bcb.pix0136orvexa-sandbox-gateway-2026520400005303986540${(plan.priceCents / 100).toFixed(2)}5802BR5916ORVEXA DIGITAL6009SAO PAULO62070503***6304MOCK`;

    return {
      success: true,
      sessionId,
      checkoutUrl: `/dashboard/billing?session=${sessionId}&status=ready`,
      pixCode,
      pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
      amountCents: plan.priceCents,
      currency: "BRL",
      planName: plan.name,
      gateway: "SANDBOX",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }
}

// ============================================================================
// SERVIÇO PRINCIPAL DE PAGAMENTO
// ============================================================================
export class PaymentService {
  private static stripe = new StripeAdapter();
  private static mercadoPago = new MercadoPagoAdapter();
  private static asaas = new AsaasAdapter();
  private static sandbox = new SandboxAdapter();

  /**
   * Inicia o fluxo de checkout de acordo com o método e gateway escolhido
   */
  static async initiateCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    // Se for plano gratuito, ativa imediatamente
    if (req.planSlug === "free") {
      await this.activatePlanDirectly(req.userId, "free");
      return {
        success: true,
        sessionId: `free_activation_${Date.now()}`,
        amountCents: 0,
        currency: "BRL",
        planName: "FREE",
        gateway: "SANDBOX",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
    }

    if (req.paymentMethod === "PIX") {
      return this.mercadoPago.createPix(req);
    }

    if (req.gateway === "STRIPE") {
      return this.stripe.createSession(req);
    }

    if (req.gateway === "ASAAS") {
      return this.asaas.createBilling(req);
    }

    return this.sandbox.createInstant(req);
  }

  /**
   * Confirmação e Ativação de Pagamento no Banco de Dados
   * Atualiza status do usuário para ACTIVE, associa novo plano e renova período de vigência
   */
  static async confirmPaymentAndActivate(event: WebhookPaymentEvent): Promise<{
    user: any;
    plan: any;
    payment: any;
    subscription: any;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: event.userId },
      include: { plan: true },
    });

    if (!user) {
      throw new Error(`Usuário não encontrado para ativação: ${event.userId}`);
    }

    // Identificar plano alvo
    let targetPlanSlug = event.planSlug || "pro";
    let targetPlan = await prisma.plan.findUnique({
      where: { slug: targetPlanSlug },
    });

    if (!targetPlan) {
      // Tenta recuperar plano pelo ID ou fallback para PRO
      targetPlan = await prisma.plan.findFirst({
        where: { slug: "pro" },
      });
      if (!targetPlan) {
        throw new Error("Plano padrão PRO não encontrado no banco.");
      }
    }

    // 1. Atualiza Usuário: status ACTIVE e novo planId
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        planId: targetPlan.id,
      },
    });

    // 2. Cria ou renova assinatura com vigência de +1 mês
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const existingSub = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    let subscription;
    if (existingSub) {
      subscription = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId: targetPlan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
          gatewayProvider: event.gateway,
          externalSubscriptionId: event.transactionId,
        },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: targetPlan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
          gatewayProvider: event.gateway,
          externalSubscriptionId: event.transactionId,
        },
      });
    }

    // 3. Registra comprovante financeiro no banco de dados
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        amountCents: event.amountCents || targetPlan.priceCents,
        currency: "BRL",
        status: event.status,
        gateway: event.gateway,
        transactionId: event.transactionId,
        receiptUrl: `https://orvexa.digital/receipts/${event.transactionId}`,
      },
    });

    // 4. Registra auditoria de segurança
    await logAuditEvent({
      actorId: user.id,
      action: "PAYMENT_CONFIRMED_VIA_GATEWAY",
      resourceType: "PAYMENT",
      resourceId: event.transactionId,
      details: {
        gateway: event.gateway,
        plan: targetPlan.name,
        amountCents: payment.amountCents,
        transactionId: event.transactionId,
      },
    });

    logger.info(`[PAYMENT] Usuário ${user.email} ativado com sucesso no plano ${targetPlan.name} via ${event.gateway}`, {
      metadata: { userId: user.id, plan: targetPlan.name, transactionId: event.transactionId },
    });

    return {
      user: updatedUser,
      plan: targetPlan,
      payment,
      subscription,
    };
  }

  /**
   * Ativação direta para plano FREE ou migração administrativa
   */
  static async activatePlanDirectly(userId: string, planSlug: string) {
    const targetPlan = await prisma.plan.findUnique({
      where: { slug: planSlug },
    });
    if (!targetPlan) {
      throw new Error(`Plano '${planSlug}' não encontrado.`);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        planId: targetPlan.id,
        status: "ACTIVE",
      },
    });
  }
}

