// src/app/dashboard/agents/page.tsx
// HUB DE AGENTES ATIVOS E COMPATÍVEIS — ORVEXA PRIME (TEMA CLARO & OBJETIVO)

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Code2,
  Megaphone,
  GraduationCap,
  Scale,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface AgentUI {
  id?: string;
  slug: string;
  name: string;
  role: string;
  category?: string;
  preferredModelId?: string;
  preferredModelName?: string;
  preferredModel?: string;
  iconName?: string;
  avatar?: string;
  badge?: string;
  color?: string;
  description: string;
  systemPrompt?: string;
}

export default function AgentsHubPage() {
  const [agents, setAgents] = useState<AgentUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai/agents");
      const data = await res.json();
      if (res.ok) {
        setApiConfigured(data.activeApiConfigured !== false);
        setAgents(data.agents || []);
      } else {
        setAgents([]);
      }
    } catch (e) {
      console.error("Erro ao carregar agentes:", e);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const getAgentIcon = (slug: string, iconName?: string) => {
    if (slug.includes("dev") || slug.includes("programador")) return Code2;
    if (slug.includes("financeiro")) return TrendingUp;
    if (slug.includes("marketing")) return Megaphone;
    if (slug.includes("juridico")) return Scale;
    if (slug.includes("professor") || slug.includes("edu")) return GraduationCap;
    return Bot;
  };

  const filteredAgents = agents.filter((ag) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ag.name.toLowerCase().includes(q) ||
      ag.role.toLowerCase().includes(q) ||
      ag.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Bot className="w-3.5 h-3.5" />
            Agentes Especialistas Ativos
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Especialistas de IA Prontos para Uso
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Apenas os agentes 100% suportados e operacionais na API ativa são exibidos.
            Selecione qualquer agente para iniciar uma conversa focada.
          </p>
        </div>

        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs self-start md:self-auto"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Abrir Chat Geral</span>
        </Link>
      </div>

      {/* Alerta caso nenhuma API esteja ativa */}
      {!apiConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider">Atenção do Administrador</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Nenhuma IA está configurada pelo administrador. Para liberar os agentes para os clientes, cadastre uma chave de API válida no Painel Administrativo.
            </p>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar agente por nome ou especialidade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors shadow-xs"
        />
      </div>

      {/* Grid de Agentes Filtrados */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-xs gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
          <span>Verificando compatibilidade com a API ativa...</span>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhum agente compatível disponível
          </h3>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            Nenhum agente atende aos filtros de busca ou os modelos correspondentes não estão habilitados na API configurada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map((ag) => {
            const Icon = getAgentIcon(ag.slug, ag.iconName);
            return (
              <div
                key={ag.id || ag.slug}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top: Avatar + Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                      {ag.avatar || "🤖"}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                      {ag.badge || "100% OPERACIONAL"}
                    </span>
                  </div>

                  {/* Nome e Papel */}
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {ag.name}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {ag.role}
                    </p>
                  </div>

                  {/* Descrição */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {ag.description}
                  </p>
                </div>

                {/* Footer do Card */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ativo na API
                  </span>

                  <Link
                    href={`/dashboard/chat?agentId=${ag.id || ag.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    <span>Conversar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
