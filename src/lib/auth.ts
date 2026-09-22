import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { appCache } from "./cache";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "orvexa_prime_super_secret_jwt_key_2026_production_grade_token_guard"
);

export const AUTH_COOKIE_NAME = "orvexa_auth_token";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  status: "ACTIVE" | "BLOCKED" | "PENDING_PAYMENT";
  planId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAuthToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyAuthToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current authenticated user session from HTTP-Only cookie or Authorization Bearer header.
 * Performs real-time status validation from database to prevent stale access.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = cookies();
  let token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    try {
      const headerStore = headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    } catch {}
  }

  if (!token) return null;

  const session = await verifyAuthToken(token);
  if (!session?.id) return null;

  // Cache L1 com TTL de 10s para aliviar o banco em requisições concorrentes
  const cacheKey = `user_session:${session.id}`;
  const user = await appCache.getOrSet(
    cacheKey,
    async () => {
      return prisma.user.findUnique({
        where: { id: session.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          planId: true,
        },
      });
    },
    10
  );

  if (!user) return null;
  if (user.status === "BLOCKED") return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "ADMIN" | "USER",
    status: user.status as "ACTIVE" | "BLOCKED" | "PENDING_PAYMENT",
    planId: user.planId,
  };
}

/**
 * Invalida imediatamente o cache de sessão do usuário (ex: após upgrade, bloqueio ou alteração de role)
 */
export function invalidateUserSessionCache(userId: string): void {
  appCache.delete(`user_session:${userId}`);
}


