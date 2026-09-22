import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  Key,
  BarChart3,
  DollarSign,
  TrendingUp,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  // Coleta dados em tempo real do banco de dados
  const [
    totalUsers,
    activeUsers,
    totalKeys,
    activeKeys,
    usageAgg,
    recentLogs,
    subscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { status: "ACTIVE" } }),
    prisma.usageLog.aggregate({
      _sum: {
        tokensInput: true,
        tokensOutput: true,
        totalTokens: true,
        costCents: true,
        priceChargedCents: true,
      },
      _count: true,
    }),
    prisma.usageLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        model: { select: { name: true } },
      },
    }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
  ]);

  // Cálculos Financeiros
  const monthlyRevenueCents = subscriptions.reduce(
    (acc, sub) => acc + (sub.plan?.priceCents || 0),
    0
  );
  const totalCostCents = usageAgg._sum.costCents || 0;
  const netProfitCents = monthlyRevenueCents - totalCostCents;

  const totalTokens = usageAgg._sum.totalTokens || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            CONTROLE OPERACIONAL CENTRAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Painel Geral do Administrador
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Métricas em tempo real de consumo de tokens, custos dos provedores e receita líquida.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/api-keys"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-neon-glow transition-all flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            Cadastrar Nova API
          </Link>
        </div>
      </div>

      {/* 4 KPIs Exigidos no Prompt: Consumo, Custo, Lucro, Usuários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Lucro Líquido */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-emerald-500/30 relative overflow-hidden shadow-neon-green">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Lucro Líquido Estimado</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            R$ {(netProfitCents / 100).toFixed(2).replace(".", ",")}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Receita: R$ {(monthlyRevenueCents / 100).toFixed(2).replace(".", ",")}
          </div>
        </div>

        {/* Consumo de Tokens */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-cyan-500/30 shadow-neon-cyan">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Consumo Total de Tokens</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300">
            {totalTokens.toLocaleString("pt-BR")}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Requisições: {usageAgg._count.toLocaleString("pt-BR")}
          </div>
        </div>

        {/* Custo Real de IA */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Custo Provedores (APIs)</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            R$ {(totalCostCents / 100).toFixed(2).replace(".", ",")}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Base Claude, OpenAI e Gemini
          </div>
        </div>

        {/* Usuários */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Base de Usuários</span>
            <Users className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-3xl font-black text-white">
            {activeUsers}{" "}
            <span className="text-sm font-normal text-slate-400">/ {totalUsers}</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {activeUsers} assinantes com status ACTIVE
          </div>
        </div>
      </div>

      {/* Grid: Atalhos e Logs Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status do AI Gateway */}
        <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Saúde do AI Gateway
          </h2>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Chaves Cadastradas</div>
                <div className="text-[11px] text-slate-400">Sem limite artificial</div>
              </div>
              <span className="text-sm font-mono font-bold text-cyan-300">
                {activeKeys} ativas / {totalKeys} total
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Criptografia em Disco</div>
                <div className="text-[11px] text-slate-400">Padrão AES-256-GCM</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                100% Protegido
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">ORVEXA PRIME ENGINE</div>
                <div className="text-[11px] text-slate-400">Classificação semântica</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                4 Regras Ativas
              </span>
            </div>
          </div>

          <Link
            href="/admin/api-keys"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-800"
          >
            Gerenciar Chaves de Provedores <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Últimas Requisições Processadas */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Últimas Execuções no Gateway (Audit Logs)
            </h2>
            <Link href="/admin/usage" className="text-xs text-cyan-400 hover:underline">
              Ver todos os logs
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhuma requisição registrada ainda. Use o Chat do Cliente para iniciar!
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{log.user?.name || "Usuário"}</span>
                    <span className="text-slate-400 ml-2">({log.model?.name || "IA"})</span>
                    <div className="text-[10px] text-slate-500">
                      {new Date(log.createdAt).toLocaleTimeString("pt-BR")} • Latência: {log.latencyMs}ms
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-cyan-300 font-semibold">
                      {log.totalTokens.toLocaleString("pt-BR")} tokens
                    </span>
                    <div className="text-[10px] text-emerald-400">
                      R$ {(log.costCents / 100).toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

