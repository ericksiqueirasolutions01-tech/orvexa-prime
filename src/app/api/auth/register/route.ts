import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { validateEmail, validatePassword, sanitizeHtmlText } from "@/lib/security-validation";

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

    // 1. Validação Segura de Formato de E-mail
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.reason || "E-mail inválido." },
        { status: 400 }
      );
    }
    const normalizedEmail = emailValidation.normalized!;

    // 2. Validação Segura de Complexidade de Senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.reason || "Senha não atende aos requisitos de segurança." },
        { status: 400 }
      );
    }

    const cleanName = sanitizeHtmlText(name.trim());

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

    const isFreePlan = !selectedPlan || selectedPlan.slug?.toLowerCase() === "free" || selectedPlan.priceCents === 0;
    const initialUserStatus = isFreePlan ? "ACTIVE" : "PENDING_PAYMENT";

    // Cria o usuário com status ACTIVE para plano gratuito ou PENDING_PAYMENT para planos pagos
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: "USER",
        status: initialUserStatus,
        planId: selectedPlan?.id || null,
      },
    });

    // Cria registro de assinatura inicial
    if (selectedPlan) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const sub = await prisma.subscription.create({
        data: {
          userId: newUser.id,
          planId: selectedPlan.id,
          status: isFreePlan ? "ACTIVE" : "TRIALING",
          currentPeriodStart: new Date(),
          currentPeriodEnd: futureDate,
          gatewayProvider: isFreePlan ? "INTERNAL" : "STRIPE",
        },
      });

      if (!isFreePlan) {
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
    }

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        actorId: newUser.id,
        action: "USER_REGISTERED",
        resourceType: "USER",
        resourceId: newUser.id,
        details: JSON.stringify({ email: newUser.email, plan: selectedPlan?.name, isFree: isFreePlan }),
      },
    });

    const token = await createAuthToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: "USER",
      status: initialUserStatus,
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
        plan: selectedPlan?.name || "FREE",
      },
      message: isFreePlan
        ? "Cadastro realizado com sucesso! Sua conta FREE está ativa."
        : "Cadastro realizado com sucesso! Prossiga para a confirmação de assinatura.",
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

