import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentUser();

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
      plan: {
        select: {
          id: true,
          name: true,
          slug: true,
          monthlyTokens: true,
          features: true,
        },
      },
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { currentPeriodEnd: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // Calcula consumo de tokens no mês atual
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageAgg = await prisma.usageLog.aggregate({
    where: {
      userId: user.id,
      createdAt: { gte: startOfMonth },
    },
    _sum: {
      totalTokens: true,
      costCents: true,
    },
  });

  const tokensUsed = usageAgg._sum.totalTokens || 0;
  const tokenQuota = user.plan?.monthlyTokens || 0;

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      tokensUsed,
      tokenQuota,
      tokensRemaining: Math.max(0, tokenQuota - tokensUsed),
    },
  });
}

