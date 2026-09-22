import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`register:${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas de registro. Tente novamente em ${rateCheck.resetInSeconds} segundos.` },
        { status: 429 }
      );
    }

    const { name, email, password, planSlug = "pro" } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado na plataforma." },
        { status: 409 }
      );
    }

    // Busca o plano selecionado
    const selectedPlan = await prisma.plan.findUnique({
      where: { slug: planSlug },
    });

    const hashedPassword = await hashPassword(password);

    // Cria o usuário com status PENDING_PAYMENT
    // Regra estrita: Nunca liberar como ACTIVE sem pagamento confirmado!
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: "USER",
        status: "PENDING_PAYMENT",
        planId: selectedPlan?.id || null,
      },
    });

    // Cria registro de assinatura inicial pendente
    if (selectedPlan) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const sub = await prisma.subscription.create({
        data: {
          userId: newUser.id,
          planId: selectedPlan.id,
          status: "TRIALING",
          currentPeriodStart: new Date(),
          currentPeriodEnd: futureDate,
          gatewayProvider: "STRIPE",
        },
      });

      await prisma.payment.create({
        data: {
          userId: newUser.id,
          subscriptionId: sub.id,
          amountCents: selectedPlan.priceCents,
          currency: "BRL",
          status: "PENDING",
          gateway: "STRIPE",
        },
      });
    }

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        actorId: newUser.id,
        action: "USER_REGISTERED",
        resourceType: "USER",
        resourceId: newUser.id,
        details: JSON.stringify({ email: newUser.email, plan: selectedPlan?.name }),
      },
    });

    const token = await createAuthToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: "USER",
      status: "PENDING_PAYMENT",
      planId: newUser.planId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        plan: selectedPlan?.name || "START",
      },
      message: "Cadastro realizado com sucesso! Prossiga para a confirmação de assinatura.",
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Register API Error]", error);
    return NextResponse.json(
      { error: "Erro ao registrar usuário. Tente novamente." },
      { status: 500 }
    );
  }
}

