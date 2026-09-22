import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const [users, plans] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        plan: {
          select: { id: true, name: true, slug: true, monthlyTokens: true },
        },
        _count: {
          select: { conversations: true, usageLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany(),
  ]);

  return NextResponse.json({ users, plans });
}

export async function PATCH(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    const { userId, status, planId, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário não informado." }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (planId) updateData.planId = planId;
    if (role) updateData.role = role;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.id,
        action: "USER_MODIFIED",
        resourceType: "USER",
        resourceId: updated.id,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

