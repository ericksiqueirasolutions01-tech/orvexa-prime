import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "orvexa_prime_super_secret_jwt_key_2026_production_grade_token_guard"
);

// Cabeçalhos HTTP de segurança padrão Helmet / OWASP
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self' blob:;"
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let token = req.cookies.get("orvexa_auth_token")?.value;
  if (!token && req.headers.get("authorization")?.startsWith("Bearer ")) {
    token = req.headers.get("authorization")?.slice(7).trim();
  }
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  let session: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch {
      session = null;
    }
  }

  // 1. Rate Limiting em Rotas Críticas de API
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register")) {
    const rateCheck = checkRateLimit(clientIp, "AUTH");
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      const res = NextResponse.json(
        {
          error: `Muitas tentativas de autenticação. Tente novamente em ${rateCheck.retryAfterSeconds} segundos.`,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: rateCheck.retryAfterSeconds,
        },
        { status: 429, headers }
      );
      return applySecurityHeaders(res);
    }
  } else if (pathname.startsWith("/api/ai/")) {
    const identifier = session?.id || clientIp;
    const rateCheck = checkRateLimit(identifier, "AI_GENERATION");
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      const res = NextResponse.json(
        {
          error: `Limite de geração de IA excedido temporariamente. Aguarde ${rateCheck.retryAfterSeconds} segundos.`,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: rateCheck.retryAfterSeconds,
        },
        { status: 429, headers }
      );
      return applySecurityHeaders(res);
    }
  }

  // 2. Rotas restritas de Administrador
  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("error", "Acesso restrito a administradores.");
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  // 3. Rotas de Dashboard de Cliente
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (session.status === "BLOCKED") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "Sua conta está bloqueada. Contate o suporte.");
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Regra estrita: Não liberar cliente sem pagamento confirmado
    if (session.status === "PENDING_PAYMENT" && session.role !== "ADMIN") {
      if (!pathname.startsWith("/dashboard/billing")) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/dashboard/billing?pending=true", req.url))
        );
      }
    }
  }

  // 4. Redirecionamento se já logado
  if ((pathname === "/login" || pathname === "/register") && session) {
    if (session.role === "ADMIN") {
      return applySecurityHeaders(NextResponse.redirect(new URL("/admin", req.url)));
    }
    return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
    "/api/ai/:path*",
  ],
};
