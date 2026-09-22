// src/app/api/user/profile/route.ts
// API DE PERFIL DO USUÁRIO — ORVEXA PRIME SAAS
// Permite consulta e atualização segura de dados cadastrais e alteração de senha

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { recordAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
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
        updatedAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            slug: true,
            monthlyTokens: true,
            storageQuotaBytes: true,
            features: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Calcula estatísticas rápidas
    const [conversationsCount, filesCount, usageAgg] = await Promise.all([
      prisma.conversation.count({ where: { userId: user.id } }),
      prisma.file.count({ where: { userId: user.id } }),
      prisma.usageLog.aggregate({
        where: { userId: user.id },
        _sum: { totalTokens: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        stats: {
          conversationsCount,
          filesCount,
          totalTokensConsumed: usageAgg._sum.totalTokens || 0,
        },
      },
    });
  } catch (error: any) {
    logger.error("Erro ao carregar perfil de usuário", error);
    return NextResponse.json({ error: "Erro interno ao carregar perfil" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const updateData: any = {};

    if (name && typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    // Se o usuário solicitou alteração de senha
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Informe a senha atual para definir uma nova senha." },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "A senha atual informada está incorreta." },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve possuir pelo menos 6 caracteres." },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      action: "USER_PROFILE_UPDATED",
      resourceType: "USER",
      resourceId: user.id,
      details: {
        updatedFields: Object.keys(updateData).filter((k) => k !== "passwordHash"),
        passwordChanged: !!newPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Perfil atualizado com sucesso!",
      user: updated,
    });
  } catch (error: any) {
    logger.error("Erro ao atualizar perfil", error);
    return NextResponse.json({ error: "Erro interno ao atualizar perfil" }, { status: 500 });
  }
}

