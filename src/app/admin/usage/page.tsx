import { prisma } from "@/lib/prisma";
import { BarChart3, Database, Layers, Clock, Cpu } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsagePage() {
  const [logs, aggregate] = await Promise.all([
    prisma.usageLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        model: { select: { name: true, modelIdentifier: true } },
        apiKey: { select: { name: true, keyHint: true } },
      },
    }),
    prisma.usageLog.aggregate({
      _sum: {
        tokensInput: true,
        tokensOutput: true,
        totalTokens: true,
        costCents: true,
      },
      _avg: {
        latencyMs: true,
      },
      _count: true,
    }),
  ]);

  const totalTokens = aggregate._sum.totalTokens || 0;
  const totalCost = aggregate._sum.costCents || 0;
  const avgLatency = Math.round(aggregate._avg.latencyMs || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
          <Database className="w-3.5 h-3.5" />
          METERING & AUDITORIA DE CONSUMO
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Controle de Consumo & Logs de IA (usage_logs)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Registro de cada chamada ao AI Gateway com tokens de entrada, saída, custos e chave utilizada.
        </p>
      </div>

      {/* Métricas de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-cyan-500/30">
          <span className="text-xs text-slate-400">Total de Requisições</span>
          <div className="text-2xl font-black text-cyan-300 mt-1">
            {aggregate._count.toLocaleString("pt-BR")}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {totalTokens.toLocaleString("pt-BR")} tokens totais
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-emerald-500/30">
          <span className="text-xs text-slate-400">Custo Total Acumulado</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            R$ {(totalCost / 100).toFixed(4)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Faturamento direto de APIs</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800">
          <span className="text-xs text-slate-400">Latência Média de Resposta</span>
          <div className="text-2xl font-black text-white mt-1">
            {avgLatency} ms
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Tempo de ida e volta ao provedor</span>
        </div>
      </div>

      {/* Tabela de logs */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Histórico Detalhado de Execuções
        </h2>

        {logs.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            Nenhum registro de consumo em usage_logs ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Data / Hora</th>
                  <th className="py-3 px-4 font-semibold">Usuário</th>
                  <th className="py-3 px-4 font-semibold">Modelo de IA</th>
                  <th className="py-3 px-4 font-semibold">Chave Usada</th>
                  <th className="py-3 px-4 font-semibold">Tokens (In / Out)</th>
                  <th className="py-3 px-4 font-semibold">Total</th>
                  <th className="py-3 px-4 font-semibold">Custo Estimado</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {log.user?.name || "Usuário"}
                    </td>
                    <td className="py-3 px-4 text-cyan-300">
                      {log.model?.name || "ORVEXA AI"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.apiKey?.name ? `${log.apiKey.name} (${log.apiKey.keyHint})` : "Gateway Fallback"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {log.tokensInput} / {log.tokensOutput}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {log.totalTokens}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400">
                      R$ {(log.costCents / 100).toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : log.status === "FAILOVER"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

