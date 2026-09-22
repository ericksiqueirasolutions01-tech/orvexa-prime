import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/crypto";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const [keys, providers] = await Promise.all([
    prisma.apiKey.findMany({
      include: {
        provider: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.aiProvider.findMany({
      include: {
        models: {
          select: { id: true, name: true, modelIdentifier: true },
        },
      },
    }),
  ]);

  // Sanitiza para JAMAIS retornar o cipherText cru para o frontend
  const safeKeys = keys.map((k) => {
    let parsedCapabilities: string[] = [];
    try {
      parsedCapabilities = JSON.parse(k.capabilities || "[]");
    } catch {
      parsedCapabilities = ["TEXTO"];
    }
    if (parsedCapabilities.length === 0) parsedCapabilities = ["TEXTO"];

    const tokensRemaining =
      k.tokenLimitMonthly > 0 ? Math.max(0, k.tokenLimitMonthly - k.tokensUsedMonth) : null;
    const percentUsed =
      k.tokenLimitMonthly > 0
        ? Math.min(100, Math.round((k.tokensUsedMonth / k.tokenLimitMonthly) * 100))
        : 0;

    let dynamicStatus = k.status;
    if (k.status !== "DISABLED" && k.tokenLimitMonthly > 0) {
      if (k.tokensUsedMonth >= k.tokenLimitMonthly) {
        dynamicStatus = "BLOCKED_QUOTA";
      } else if (percentUsed >= 90) {
        dynamicStatus = "WARNING_90";
      }
    }

    return {
      id: k.id,
      name: k.name,
      providerId: k.providerId,
      providerName: k.provider.name,
      providerSlug: k.provider.slug,
      keyHint: k.keyHint,
      tokenLimitMonthly: k.tokenLimitMonthly,
      tokensUsedMonth: k.tokensUsedMonth,
      tokensRemaining,
      percentUsed,
      costAccumulatedCents: k.costAccumulatedCents || 0,
      capabilities: parsedCapabilities,
      priority: k.priority,
      customBaseUrl: k.customBaseUrl,
      status: dynamicStatus,
      errorCount: k.errorCount,
      lastUsedAt: k.lastUsedAt,
      quarantinedUntil: k.quarantinedUntil,
      createdAt: k.createdAt,
    };
  });

  return NextResponse.json({ keys: safeKeys, providers });
}

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    let {
      providerId,
      providerSlug,
      name,
      rawApiKey,
      priority = 1,
      tokenLimitMonthly = 0,
      customBaseUrl,
      capabilities,
    } = await req.json();

    // Se providerId for um slug direto (ex: "openai", "anthropic", "google") ou se providerSlug for fornecido
    if (providerId === "openai" || providerId === "anthropic" || providerId === "google" || (!providerId && providerSlug)) {
      const targetSlug = providerSlug || providerId;
      const prov = await prisma.aiProvider.findUnique({ where: { slug: targetSlug } });
      if (prov) {
        providerId = prov.id;
      }
    }

    if (!providerId || !name || !rawApiKey) {
      return NextResponse.json(
        { error: "Provedor, nome da chave e a chave secreta são obrigatórios." },
        { status: 400 }
      );
    }

    // Processa capacidades (padrão: ["TEXTO"] se não informado)
    let finalCapabilities = ["TEXTO"];
    if (Array.isArray(capabilities) && capabilities.length > 0) {
      finalCapabilities = capabilities;
    }

    // Criptografia simétrica AES-256-GCM com IV randômico e tag de autenticação
    const encrypted = encryptApiKey(rawApiKey);

    const newKey = await prisma.apiKey.create({
      data: {
        providerId,
        name: name.trim(),
        encryptedKey: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyHint: encrypted.keyHint,
        priority: Number(priority) || 1,
        tokenLimitMonthly: Number(tokenLimitMonthly) || 0,
        customBaseUrl: customBaseUrl?.trim() || null,
        capabilities: JSON.stringify(finalCapabilities),
        status: "ACTIVE",
      },
      include: { provider: true },
    });

    // Registra log de auditoria
    await prisma.auditLog.create({
      data: {
        actorId: session.id,
        action: "API_KEY_CREATED",
        resourceType: "API_KEY",
        resourceId: newKey.id,
        details: JSON.stringify({
          provider: newKey.provider.name,
          name: newKey.name,
          hint: newKey.keyHint,
          priority: newKey.priority,
          capabilities: finalCapabilities,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Chave "${newKey.name}" criptografada com AES-256-GCM e cadastrada com sucesso!`,
      key: {
        id: newKey.id,
        name: newKey.name,
        keyHint: newKey.keyHint,
        priority: newKey.priority,
        status: newKey.status,
        provider: newKey.provider.name,
        capabilities: finalCapabilities,
      },
    });
  } catch (error: any) {
    console.error("[Create API Key Error]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criptografar ou salvar chave de API." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    const { keyId, status, priority, resetErrors, resetQuota, capabilities, tokenLimitMonthly } = await req.json();

    if (!keyId) {
      return NextResponse.json({ error: "ID da chave não informado." }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority !== undefined) updateData.priority = Number(priority);
    if (tokenLimitMonthly !== undefined) updateData.tokenLimitMonthly = Number(tokenLimitMonthly);
    if (Array.isArray(capabilities)) {
      updateData.capabilities = JSON.stringify(capabilities);
    }
    if (resetErrors) {
      updateData.errorCount = 0;
      updateData.quarantinedUntil = null;
      updateData.status = "ACTIVE";
    }
    if (resetQuota) {
      updateData.tokensUsedMonth = 0;
      updateData.status = "ACTIVE";
      updateData.errorCount = 0;
      updateData.quarantinedUntil = null;
    }

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.id,
        action: "API_KEY_UPDATED",
        resourceType: "API_KEY",
        resourceId: updated.id,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar chave." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
  }

  await prisma.apiKey.delete({ where: { id: keyId } });

  await prisma.auditLog.create({
    data: {
      actorId: session.id,
      action: "API_KEY_DELETED",
      resourceType: "API_KEY",
      resourceId: keyId,
    },
  });

  return NextResponse.json({ success: true, message: "Chave removida com sucesso." });
}

