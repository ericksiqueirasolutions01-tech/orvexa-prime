import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { logSecurityIncident } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`login:${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas de login. Bloqueio temporário. Tente novamente em ${rateCheck.resetInSeconds} segundos.` },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe e-mail e senha." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await logSecurityIncident({
        incidentType: "AUTH_LOGIN_FAILED",
        ipAddress: ip,
        severity: "LOW",
        details: { email: normalizedEmail, reason: "Usuário não encontrado" },
      });
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail e senha." },
        { status: 401 }
      );
    }

    if (user.status === "BLOCKED") {
      await logSecurityIncident({
        incidentType: "SECURITY_POLICY_VIOLATION",
        actorId: user.id,
        ipAddress: ip,
        severity: "MEDIUM",
        details: { email: user.email, reason: "Tentativa de login em conta bloqueada" },
      });
      return NextResponse.json(
        { error: "Esta conta está suspensa ou bloqueada. Contate o administrador." },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await logSecurityIncident({
        incidentType: "AUTH_LOGIN_FAILED",
        actorId: user.id,
        ipAddress: ip,
        severity: "LOW",
        details: { email: user.email, reason: "Senha incorreta" },
      });
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail e senha." },
        { status: 401 }
      );
    }

    // Cria token JWT seguro
    const token = await createAuthToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "ADMIN" | "USER",
      status: user.status as "ACTIVE" | "BLOCKED" | "PENDING_PAYMENT",
      planId: user.planId,
    });

    // Registra log de auditoria
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "USER_LOGIN",
        resourceType: "USER",
        resourceId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        planId: user.planId,
      },
    });

    // Configura cookie HTTP-Only seguro
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Login API Error]", error);
    return NextResponse.json(
      { error: "Ocorreu um erro interno durante a autenticação." },
      { status: 500 }
    );
  }
}

