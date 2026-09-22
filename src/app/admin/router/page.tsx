import { prisma } from "@/lib/prisma";
import { GitFork, Zap, Cpu, CheckCircle2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminRouterPage() {
  const rules = await prisma.routerRule.findMany({
    orderBy: { priority: "asc" },
    include: {
      targetProvider: true,
      targetModel: true,
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
          <Zap className="w-3.5 h-3.5" />
          ORVEXA PRIME ENGINE
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Configuração de Roteamento Semântico
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          O <strong>ORVEXA PRIME ENGINE</strong> analisa semanticamente o prompt do cliente em tempo real e encaminha a requisição para o melhor modelo disponível com base nas regras prioritárias abaixo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule) => {
          let parsedKeywords: string[] = [];
          try {
            parsedKeywords = JSON.parse(rule.keywords);
          } catch {
            parsedKeywords = [rule.keywords];
          }

          return (
            <div
              key={rule.id}
              className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-cyan-500/40 transition-all shadow-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-sm font-bold text-white font-mono">
                    {rule.intentName}
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-400 text-[10px] font-mono font-bold border border-cyan-500/30">
                  Prioridade {rule.priority}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Modelo de Destino</span>
                  <span className="font-bold text-white">{rule.targetModel?.name || "GPT-4o"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Provedor</span>
                  <span className="font-mono text-cyan-300 uppercase font-semibold">
                    {rule.targetProvider?.slug}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Gatilhos e Palavras-chave Detectadas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-[10px] border border-slate-700/60 font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

