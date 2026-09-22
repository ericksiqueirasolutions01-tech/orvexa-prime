import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserConsumption, getUserConsumptionHistory, PLANS_CONFIG } from "@/lib/consumption";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const [consumption, history, userPayments] = await Promise.all([
      getUserConsumption(session.id),
      getUserConsumptionHistory(session.id, 6),
      prisma.payment.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amountCents: true,
          currency: true,
          status: true,
          gateway: true,
          transactionId: true,
          receiptUrl: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      consumption,
      history,
      payments: userPayments,
      catalog: Object.values(PLANS_CONFIG),
    });
  } catch (err: any) {
    console.error("[API Consumption Error]:", err);
    return NextResponse.json({ error: "Erro ao obter consumo: " + err.message }, { status: 500 });
  }
}

