"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Edit3,
  Power,
  Cpu,
  Shield,
  Layers,
  Wrench,
  X,
  Code2,
  Palette,
  Megaphone,
  GraduationCap,
  Briefcase,
  BarChart3,
  Scale,
  Zap,
} from "lucide-react";

interface AgentItem {
  id: string;
  slug: string;
  name: string;
  role: string;
  badge: string;
  color: string;
  description: string;
  systemPrompt: string;
  preferredModelId: string;
  preferredModelName: string;
  iconName: string;
  category: string;
  tools: any[];
  allowedRoles: string[];
  allowedPlans: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  stats?: {
    userConversationsCount: number;
    userMemoriesCount: number;
  };
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "SYSTEM" | "CUSTOM" | "ACTIVE" | "INACTIVE">("ALL");
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    role: "Especialista",
    category: "PROGRAMACAO",
    preferredModelId: "gpt-5.6-sol",
    iconName: "Bot",
    color: "cyan",
    badge: "CUSTOM SPECIALIST",
    description: "",
    systemPrompt: "",
    allowedPlans: ["ALL"],
    tools: [
      {
        id: "custom-tool-1",
        name: "Analisador Automatizado",
        description: "Executa validação e gera relatório estruturado para a demanda.",
      },
    ],
  });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/agents?includeInactive=true");
      const data = await res.json();
      if (res.ok && data.agents) {
        setAgents(data.agents);
      }
    } catch (err: any) {
      setBanner({ type: "error", text: "Erro ao carregar agentes: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggleActive = async (agent: AgentItem) => {
    try {
      const res = await fetch(`/api/ai/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        setBanner({
          type: "success",
          text: `Agente "${agent.name}" agora está ${!agent.isActive ? "ATIVO" : "DESATIVADO"}.`,
        });
        fetchAgents();
      } else {
        setBanner({ type: "error", text: data.error || "Falha ao alterar status." });
      }
    } catch (err: any) {
      setBanner({ type: "error", text: "Erro: " + err.message });
    }
  };

  const handleDeleteAgent = async (agent: AgentItem) => {
    if (agent.isSystem) {
      setBanner({ type: "error", text: "Agentes nativos do sistema não podem ser excluídos." });
      return;
    }

    if (!confirm(`Deseja realmente excluir o agente "${agent.name}"? Esta ação é irreversível.`)) return;

    try {
      const res = await fetch(`/api/ai/agents/${agent.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setBanner({ type: "success", text: `Agente "${agent.name}" excluído com sucesso.` });
        fetchAgents();
      } else {
        setBanner({ type: "error", text: data.error || "Falha ao excluir." });
      }
    } catch (err: any) {
      setBanner({ type: "error", text: "Erro: " + err.message });
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAgent(null);
    setFormData({
      name: "",
      slug: "",
      role: "Especialista em Negócios Digitais",
      category: "BUSINESS",
      preferredModelId: "gpt-5.6-sol",
      iconName: "Bot",
      color: "cyan",
      badge: "CUSTOM SPECIALIST",
      description: "Agente sob medida para automação de processos específicos da empresa.",
      systemPrompt: "Você é um especialista dedicado. Responda com clareza, rigor técnico e foco em resultados.",
      allowedPlans: ["ALL"],
      tools: [
        {
          id: "custom-tool-1",
          name: "Análise Automatizada",
          description: "Processa a entrada e gera parecer técnico especializado.",
        },
      ],
    });
    setModalOpen(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim() || !formData.systemPrompt.trim()) {
      alert("Preencha nome, descrição e instruções do agente.");
      return;
    }

    setSaving(true);
    try {
      const url = editingAgent ? `/api/ai/agents/${editingAgent.id}` : "/api/ai/agents";
      const method = editingAgent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setBanner({
          type: "success",
          text: editingAgent
            ? `Agente "${formData.name}" atualizado com sucesso.`
            : `Novo agente "${formData.name}" criado com sucesso!`,
        });
        setModalOpen(false);
        fetchAgents();
      } else {
        setBanner({ type: "error", text: data.error || "Falha ao salvar agente." });
      }
    } catch (err: any) {
      setBanner({ type: "error", text: "Erro ao salvar: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredAgents = agents.filter((ag) => {
    const matchSearch =
      ag.name.toLowerCase().includes(search.toLowerCase()) ||
      ag.slug.toLowerCase().includes(search.toLowerCase()) ||
      ag.role.toLowerCase().includes(search.toLowerCase()) ||
      ag.category.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (filterType === "SYSTEM") return ag.isSystem;
    if (filterType === "CUSTOM") return !ag.isSystem;
    if (filterType === "ACTIVE") return ag.isActive;
    if (filterType === "INACTIVE") return !ag.isActive;
    return true;
  });

  const getAgentIcon = (iconName: string) => {
    switch (iconName) {
      case "Code2": return Code2;
      case "Palette": return Palette;
      case "Megaphone": return Megaphone;
      case "GraduationCap": return GraduationCap;
      case "Briefcase": return Briefcase;
      case "BarChart3": return BarChart3;
      case "Scale": return Scale;
      default: return Bot;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Banner de Notificação */}
      {banner && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            banner.type === "success"
              ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
              : "bg-red-950/80 border border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button onClick={() => setBanner(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0D1322] via-[#10192D] to-[#0A1624] border border-cyan-500/25 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3 font-mono">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            PAINEL MASTER • ARQUITETURA DE AGENTES
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Gestão Corporativa de Agentes Especialistas
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Configure os 6 agentes nativos da ORVEXA, crie novos agentes personalizados sob medida, gerencie ativação/desativação e defina permissões de acesso por plano.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Agente Personalizado
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Total de Agentes</div>
          <div className="text-2xl font-black text-white mt-1">{agents.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Agentes Ativos</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {agents.filter((a) => a.isActive).length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Nativos Oficiais</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {agents.filter((a) => a.isSystem).length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 font-mono uppercase">Personalizados</div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {agents.filter((a) => !a.isSystem).length}
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-2xl bg-[#0D1322] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, função, categoria ou slug..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACTIVE", "INACTIVE", "SYSTEM", "CUSTOM"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterType(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                filterType === mode
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {mode === "ALL" && "Todos"}
              {mode === "ACTIVE" && "Ativos"}
              {mode === "INACTIVE" && "Desativados"}
              {mode === "SYSTEM" && "Oficiais"}
              {mode === "CUSTOM" && "Personalizados"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Agentes */}
      <div className="border border-slate-800 rounded-2xl bg-[#0D1322] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="p-4">Especialista</th>
                <th className="p-4">Categoria / Papel</th>
                <th className="p-4">Modelo Recomendado</th>
                <th className="p-4">Ferramentas</th>
                <th className="p-4">Permissão de Planos</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
                    Carregando catálogo de agentes...
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 font-mono">
                    Nenhum agente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((ag) => {
                  const IconComp = getAgentIcon(ag.iconName);

                  return (
                    <tr key={ag.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Especialista */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {ag.name}
                              {ag.isSystem ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono">
                                  OFICIAL
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-mono">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{ag.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Categoria / Papel */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">{ag.role}</div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {ag.category}
                        </span>
                      </td>

                      {/* Modelo */}
                      <td className="p-4 font-mono text-emerald-400">
                        <div className="flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{ag.preferredModelName || ag.preferredModelId}</span>
                        </div>
                      </td>

                      {/* Ferramentas */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                          <Wrench className="w-3 h-3 text-cyan-400" />
                          {ag.tools.length} integradas
                        </span>
                      </td>

                      {/* Permissões */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {ag.allowedPlans.map((plan, pIdx) => (
                            <span
                              key={pIdx}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                plan === "ALL"
                                  ? "bg-slate-800 text-slate-300 border-slate-700"
                                  : "bg-amber-950/60 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {plan}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(ag)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                            ag.isActive
                              ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900"
                              : "bg-red-950/70 text-red-300 border-red-500/40 hover:bg-red-900"
                          }`}
                          title="Clique para alternar o status do agente"
                        >
                          <Power className="w-3 h-3" />
                          <span>{ag.isActive ? "Ativo" : "Inativo"}</span>
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!ag.isSystem && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAgent(ag)}
                              className="p-1.5 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900/60 transition-all"
                              title="Excluir Agente Personalizado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição de Agente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-cyan-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Criar Novo Agente Personalizado</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Nome do Agente *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: ORVEXA FINTECH"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Papel / Especialidade *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="ex: Engenharia Financeira & Conciliação"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="PROGRAMACAO">PROGRAMACAO</option>
                    <option value="DESIGN">DESIGN</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="EDUCACAO">EDUCACAO</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="JURIDICO">JURIDICO</option>
                    <option value="GERAL">GERAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Modelo Recomendado</label>
                  <select
                    value={formData.preferredModelId}
                    onChange={(e) => setFormData({ ...formData, preferredModelId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="gpt-5.6-sol">GPT-5.6 Sol (Codex)</option>
                    <option value="claude-sonnet-5">Claude Sonnet 5</option>
                    <option value="claude-fable-5.1">Claude Fable 5.1</option>
                    <option value="gemini-3.8">Gemini 3.8 Ultra</option>
                    <option value="claude-opus-5">Claude Opus 5</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                    <option value="orvexa-prime">Auto-Router Semântico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Ícone</label>
                  <select
                    value={formData.iconName}
                    onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Bot">Bot</option>
                    <option value="Code2">Code2</option>
                    <option value="Palette">Palette</option>
                    <option value="Megaphone">Megaphone</option>
                    <option value="GraduationCap">GraduationCap</option>
                    <option value="Briefcase">Briefcase</option>
                    <option value="BarChart3">BarChart3</option>
                    <option value="Scale">Scale</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Descrição Pública *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explique o que este especialista faz e quando o usuário deve recorrer a ele..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">
                  Instruções Mestres (System Prompt) *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="Defina o papel, tom de voz, regras invioláveis e especialidade técnica deste agente..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Permissões de Acesso por Plano</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: "Todos os Planos (Público)", val: "ALL" },
                    { label: "Apenas PRO & Superior", val: "PRO" },
                    { label: "Apenas EMPRESA / ENTERPRISE", val: "EMPRESA" },
                  ].map((p) => {
                    const isChecked = formData.allowedPlans.includes(p.val);
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => {
                          if (p.val === "ALL") {
                            setFormData({ ...formData, allowedPlans: ["ALL"] });
                          } else {
                            const withoutAll = formData.allowedPlans.filter((x) => x !== "ALL");
                            if (isChecked) {
                              setFormData({
                                ...formData,
                                allowedPlans: withoutAll.filter((x) => x !== p.val),
                              });
                            } else {
                              setFormData({ ...formData, allowedPlans: [...withoutAll, p.val] });
                            }
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                          isChecked
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                            : "bg-slate-900 text-slate-500 border-slate-800"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold shadow-neon-glow hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Agente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

