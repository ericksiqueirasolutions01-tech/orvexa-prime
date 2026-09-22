"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Code2,
  Palette,
  Megaphone,
  GraduationCap,
  Scale,
  Wrench,
  MessageSquare,
  ArrowRight,
  Copy,
  Check,
  Zap,
  RefreshCw,
  X,
  ShieldCheck,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { OFFICIAL_AGENTS, AgentDefinition, AgentTool } from "@/lib/agents-hub";

export default function AgentsHubPage() {
  const [agents, setAgents] = useState<AgentDefinition[]>(OFFICIAL_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [activeTool, setActiveTool] = useState<AgentTool | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [executingTool, setExecutingTool] = useState(false);
  const [toolResult, setToolResult] = useState<{ title: string; output: string } | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  useEffect(() => {
    fetch("/api/ai/agents")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.agents) setAgents(data.agents);
      })
      .catch(() => {});
  }, []);

  const handleOpenTool = (agent: AgentDefinition, tool: AgentTool) => {
    setSelectedAgent(agent);
    setActiveTool(tool);
    setToolInput("");
    setToolResult(null);
  };

  const handleCloseModal = () => {
    setActiveTool(null);
    setToolInput("");
    setToolResult(null);
  };

  const handleRunTool = async () => {
    if (!selectedAgent || !activeTool || !toolInput.trim()) return;

    setExecutingTool(true);
    try {
      const res = await fetch("/api/ai/agents/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: selectedAgent.slug,
          toolId: activeTool.id,
          input: toolInput,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setToolResult(data.result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExecutingTool(false);
    }
  };

  const handleCopyResult = () => {
    if (!toolResult) return;
    navigator.clipboard.writeText(toolResult.output);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  const getAgentIcon = (iconName: string) => {
    switch (iconName) {
      case "Code2": return Code2;
      case "Palette": return Palette;
      case "Megaphone": return Megaphone;
      case "GraduationCap": return GraduationCap;
      case "Scale": return Scale;
      default: return Bot;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0D1322] via-[#10192D] to-[#0A1624] border border-cyan-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              SUÍTE DE AGENTES ESPECIALISTAS — GATE 5
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Os 5 Agentes de Elite da ORVEXA PRIME
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Cada agente possui prompt mestre calibrado, IA preferencial de última geração e ferramentas dedicadas para engenharia, design, growth, estudos e direito.
            </p>
          </div>

          <Link
            href="/dashboard/chat"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            Chat Multi-IA Aberto
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Grid com os 5 Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const IconComp = getAgentIcon(agent.iconName);

          return (
            <div
              key={agent.slug}
              className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-lg"
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/50 transition-all">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                    {agent.badge}
                  </span>
                </div>

                {/* Título & Papel */}
                <h3 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors">
                  {agent.name}
                </h3>
                <div className="text-xs font-semibold text-slate-400 mt-0.5 mb-3">{agent.role}</div>

                <p className="text-xs text-slate-300 leading-relaxed mb-6">{agent.description}</p>

                {/* Especificação do Modelo de IA */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 mb-6">
                  <div className="text-[10px] text-slate-500 font-mono">IA PREFERENCIAL</div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <Cpu className="w-3.5 h-3.5" />
                    {agent.preferredModelName}
                  </div>
                </div>

                {/* Ferramentas Exclusivas */}
                <div className="space-y-2 mb-6">
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider block">
                    FERRAMENTAS INTEGRADAS:
                  </span>
                  {agent.tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleOpenTool(agent, tool)}
                      className="w-full p-2.5 rounded-xl bg-slate-900/50 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/30 text-left transition-all flex items-center justify-between group/tool"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-200 group-hover/tool:text-cyan-300 truncate">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{tool.description}</div>
                      </div>
                      <Wrench className="w-3.5 h-3.5 text-slate-500 group-hover/tool:text-cyan-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão de Iniciar Chat */}
              <Link
                href={`/dashboard/chat?agent=${agent.slug}`}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-emerald-400 hover:text-slate-950 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-transparent"
              >
                <MessageSquare className="w-4 h-4" />
                Conversar com {agent.name}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Modal Interativo de Ferramenta Especializada */}
      {activeTool && selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#0D1322] border border-cyan-500/30 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 mb-2">
                  <Wrench className="w-3 h-3" />
                  {selectedAgent.name} • FERRAMENTA OFICIAL
                </div>
                <h3 className="text-xl font-black text-white">{activeTool.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{activeTool.description}</p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input da Ferramenta */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Entrada de Dados / Parâmetros:</label>
              <textarea
                rows={4}
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                placeholder={activeTool.inputPlaceholder}
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none font-mono"
              />
            </div>

            {/* Ação de Executar */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleRunTool}
                disabled={executingTool || !toolInput.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-neon-glow transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {executingTool ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {activeTool.actionLabel}
                  </>
                )}
              </button>
            </div>

            {/* Resultado da Ferramenta */}
            {toolResult && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {toolResult.title}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 flex items-center gap-1.5"
                  >
                    {copiedResult ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    {copiedResult ? "Copiado!" : "Copiar"}
                  </button>
                </div>

                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[280px] whitespace-pre-wrap">
                  <code>{toolResult.output}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
