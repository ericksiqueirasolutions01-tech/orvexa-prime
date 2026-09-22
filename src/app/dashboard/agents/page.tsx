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
  History,
  Brain,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import { OFFICIAL_AGENTS, AgentTool } from "@/lib/agents-hub";

interface AgentUI {
  id?: string;
  slug: string;
  name: string;
  role: string;
  category: string;
  preferredModelId: string;
  preferredModelName: string;
  iconName: string;
  badge: string;
  color: string;
  description: string;
  systemPrompt: string;
  tools: AgentTool[];
  hasPermission?: boolean;
  lockedReason?: string;
  stats?: {
    userConversationsCount: number;
    userMemoriesCount: number;
  };
}

export default function AgentsHubPage() {
  const [agents, setAgents] = useState<AgentUI[]>(OFFICIAL_AGENTS as any);
  const [selectedAgent, setSelectedAgent] = useState<AgentUI | null>(null);

  // Tool Modal
  const [activeTool, setActiveTool] = useState<AgentTool | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [executingTool, setExecutingTool] = useState(false);
  const [toolResult, setToolResult] = useState<{ title: string; output: string } | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  // Memory Modal
  const [memoryModalAgent, setMemoryModalAgent] = useState<AgentUI | null>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [newMemoryKey, setNewMemoryKey] = useState("");
  const [newMemoryValue, setNewMemoryValue] = useState("");

  // History Modal
  const [historyModalAgent, setHistoryModalAgent] = useState<AgentUI | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/ai/agents");
      const data = await res.json();
      if (res.ok && data?.agents && data.agents.length > 0) {
        setAgents(data.agents);
      }
    } catch (e) {
      console.error("Erro ao sincronizar agentes:", e);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Ferramentas
  const handleOpenTool = (agent: AgentUI, tool: AgentTool) => {
    setSelectedAgent(agent);
    setActiveTool(tool);
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

  // Memória do Agente
  const handleOpenMemoryModal = async (agent: AgentUI) => {
    setMemoryModalAgent(agent);
    setLoadingMemories(true);
    try {
      const agentIdentifier = agent.id || agent.slug;
      const res = await fetch(`/api/ai/agents/${agentIdentifier}/memory`);
      const data = await res.json();
      if (res.ok && data.memories) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMemories(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryModalAgent || !newMemoryKey.trim() || !newMemoryValue.trim()) return;

    try {
      const agentIdentifier = memoryModalAgent.id || memoryModalAgent.slug;
      const res = await fetch(`/api/ai/agents/${agentIdentifier}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newMemoryKey,
          value: newMemoryValue,
          category: "PREFERENCE",
        }),
      });
      if (res.ok) {
        setNewMemoryKey("");
        setNewMemoryValue("");
        handleOpenMemoryModal(memoryModalAgent);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!memoryModalAgent) return;
    try {
      const agentIdentifier = memoryModalAgent.id || memoryModalAgent.slug;
      const res = await fetch(`/api/ai/agents/${agentIdentifier}/memory?memoryId=${memoryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Histórico do Agente
  const handleOpenHistoryModal = async (agent: AgentUI) => {
    setHistoryModalAgent(agent);
    setLoadingHistory(true);
    try {
      const agentIdentifier = agent.id || agent.slug;
      const res = await fetch(`/api/ai/agents/${agentIdentifier}/history`);
      const data = await res.json();
      if (res.ok && data.conversations) {
        setHistoryList(data.conversations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
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
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0D1322] via-[#10192D] to-[#0A1624] border border-cyan-500/25 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3 font-mono">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            SUÍTE DE AGENTES PROFISSIONAIS • ORVEXA PRIME
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Os Agentes de Elite da ORVEXA PRIME
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Cada agente conta com instruções mestres calibradas, modelo IA de última geração, ferramentas autônomas que se ativam sozinhas durante o chat, além de memória e histórico isolados por usuário.
          </p>
        </div>

        <Link
          href="/dashboard/chat"
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2 shrink-0 relative z-10"
        >
          <MessageSquare className="w-4 h-4" />
          Chat Multi-IA Aberto
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid com os Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const IconComp = getAgentIcon(agent.iconName);
          const isLocked = agent.hasPermission === false;

          return (
            <div
              key={agent.slug}
              className={`p-6 rounded-3xl bg-[#0D1322] border transition-all flex flex-col justify-between group shadow-lg relative ${
                isLocked
                  ? "border-slate-800/60 opacity-80"
                  : "border-slate-800 hover:border-cyan-500/40"
              }`}
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:border-cyan-500/50 transition-all">
                    <IconComp className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                        <Lock className="w-3 h-3 text-amber-400" />
                        Upgrade
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                      {agent.badge}
                    </span>
                  </div>
                </div>

                {/* Título & Papel */}
                <h3 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors">
                  {agent.name}
                </h3>
                <div className="text-xs font-semibold text-slate-400 mt-0.5 mb-3">{agent.role}</div>

                <p className="text-xs text-slate-300 leading-relaxed mb-5">{agent.description}</p>

                {/* Especificação do Modelo de IA */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-slate-500 font-mono">MODELO RECOMENDADO</div>
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5 font-mono">
                      <Cpu className="w-3.5 h-3.5" />
                      {agent.preferredModelName}
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
                    CALIBRADO
                  </span>
                </div>

                {/* Badges de Memória & Histórico */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => handleOpenMemoryModal(agent)}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-left transition-all flex items-center gap-2 group/btn"
                  >
                    <Brain className="w-3.5 h-3.5 text-purple-400 group-hover/btn:scale-110 transition-transform" />
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">MEMÓRIA</div>
                      <div className="text-[11px] font-bold text-white">Ver Memórias</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenHistoryModal(agent)}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-left transition-all flex items-center gap-2 group/btn"
                  >
                    <History className="w-3.5 h-3.5 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">SESSÕES</div>
                      <div className="text-[11px] font-bold text-white">Histórico</div>
                    </div>
                  </button>
                </div>

                {/* Ferramentas Integradas */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>FERRAMENTAS AUTÔNOMAS:</span>
                    <span className="text-cyan-400">Ativação Automática no Chat ⚡</span>
                  </div>
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
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-emerald-400 hover:text-slate-950 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-transparent shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Conversar com {agent.name}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Modal de Execução Manual de Ferramenta */}
      {activeTool && selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-cyan-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">{activeTool.name}</h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Especialista: {selectedAgent.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-[11px]">
                💡 <strong>Dica Pro:</strong> Você não precisa abrir este modal! No Chat, basta pedir ao{" "}
                <strong>{selectedAgent.name}</strong> para realizar esta tarefa e ele acionará esta ferramenta automaticamente.
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1.5">Dados de Entrada / Contexto</label>
                <textarea
                  rows={4}
                  value={toolInput}
                  onChange={(e) => setToolInput(e.target.value)}
                  placeholder={activeTool.inputPlaceholder || "Informe os parâmetros para a ferramenta..."}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-400 resize-none font-sans"
                />
              </div>

              <button
                type="button"
                onClick={handleRunTool}
                disabled={executingTool || !toolInput.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold shadow-neon-glow hover:opacity-90 transition-all disabled:opacity-40"
              >
                {executingTool ? "Processando Ferramenta..." : activeTool.actionLabel || "Executar Ferramenta"}
              </button>

              {toolResult && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{toolResult.title}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(toolResult.output);
                        setCopiedResult(true);
                        setTimeout(() => setCopiedResult(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-mono"
                    >
                      {copiedResult ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedResult ? "Copiado!" : "Copiar Resultado"}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed">
                    {toolResult.output}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Memória do Agente */}
      {memoryModalAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-cyan-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Memória Dedicada do Especialista</h3>
                  <div className="text-[11px] text-slate-400 font-mono">{memoryModalAgent.name}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMemoryModalAgent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Este especialista aprende preferências, stacks e diretrizes ao longo de suas conversas. Você também pode registrar fatos manuais abaixo:
              </p>

              {/* Form de Nova Memória */}
              <form onSubmit={handleAddMemory} className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Chave (ex: stack_backend, tom_de_voz)"
                    value={newMemoryKey}
                    onChange={(e) => setNewMemoryKey(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Fato / Preferência a ser lembrada"
                    value={newMemoryValue}
                    onChange={(e) => setNewMemoryValue(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-[11px] focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar Nova Memória
                </button>
              </form>

              {/* Lista de Memórias */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">
                  Fatos Memorizados ({memories.length})
                </span>

                {loadingMemories ? (
                  <div className="py-8 text-center text-slate-500 font-mono">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-spin mx-auto mb-1" />
                    Carregando base de conhecimento do agente...
                  </div>
                ) : memories.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
                    Este especialista ainda não registrou fatos específicos sobre você. Converse com ele para iniciar o aprendizado contínuo!
                  </div>
                ) : (
                  memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyan-400 font-bold text-[11px]">{mem.key}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {mem.category}
                          </span>
                        </div>
                        <p className="text-slate-200 mt-1 text-[11px]">{mem.value}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1 rounded text-slate-500 hover:text-red-400"
                        title="Esquecer esta memória"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico do Agente */}
      {historyModalAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-cyan-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Sessões Anteriores com o Especialista</h3>
                  <div className="text-[11px] text-slate-400 font-mono">{historyModalAgent.name}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalAgent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs">
              {loadingHistory ? (
                <div className="py-8 text-center text-slate-500 font-mono">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin mx-auto mb-1" />
                  Buscando sessões com este agente...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl space-y-2">
                  <p>Nenhuma sessão anterior encontrada com {historyModalAgent.name}.</p>
                  <Link
                    href={`/dashboard/chat?agent=${historyModalAgent.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Iniciar Primeira Conversa
                  </Link>
                </div>
              ) : (
                historyList.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/dashboard/chat?agent=${historyModalAgent.slug}&conversationId=${conv.id}`}
                    className="p-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 transition-all block group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                        {conv.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(conv.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{conv.lastMessage}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>{conv.messagesCount} mensagens</span>
                      {conv.filesCount > 0 && <span>• {conv.filesCount} arquivos</span>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
