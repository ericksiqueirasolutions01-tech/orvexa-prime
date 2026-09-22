import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "orvexa_prime_super_secret_jwt_key_2026_production_grade_token_guard"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("orvexa_auth_token")?.value;

  let session: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch {
      session = null;
    }
  }

  // Rotas restritas de Administrador
  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("error", "Acesso restrito a administradores.");
      return NextResponse.redirect(loginUrl);
    }
  }

  // Rotas de Dashboard de Cliente
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.status === "BLOCKED") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "Sua conta está bloqueada. Contate o suporte.");
      return NextResponse.redirect(loginUrl);
    }

    // Regra estrita do prompt: Não liberar cliente sem pagamento confirmado
    if (session.status === "PENDING_PAYMENT" && session.role !== "ADMIN") {
      // Redireciona para tela de checkout/pagamento pendente
      if (!pathname.startsWith("/dashboard/billing")) {
        return NextResponse.redirect(new URL("/dashboard/billing?pending=true", req.url));
      }
    }
  }

  // Se já logado e acessando /login ou /register, redireciona para painel apropriado
  if ((pathname === "/login" || pathname === "/register") && session) {
    if (session.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login", "/register"],
};

