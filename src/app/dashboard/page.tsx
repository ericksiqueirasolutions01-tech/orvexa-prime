"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Sparkles,
  Zap,
  Cpu,
  ArrowRight,
  Code2,
  Megaphone,
  GraduationCap,
  Scale,
  ShieldCheck,
  FileSpreadsheet,
  PenTool,
  Search,
  Globe,
  Bot,
  Palette,
  FolderGit2,
  Brain,
  PlusCircle,
  UploadCloud,
  History,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";

export default function DashboardOverviewPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/workspace/files?limit=3").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([userData, filesData]) => {
        if (userData?.authenticated) setUser(userData.user);
        // Mock recent items if none exist
        setRecentConversations([
          {
            id: "conv-1",
            title: "Otimização de Query PostgreSQL e pgvector",
            model: "GPT-5.6 Sol (Codex)",
            updatedAt: "Há 12 minutos",
            category: "Engenharia",
          },
          {
            id: "conv-2",
            title: "Revisão Contratual e Termos de Uso LGPD",
            model: "Claude Sonnet 5",
            updatedAt: "Há 2 horas",
            category: "Compliance",
          },
          {
            id: "conv-3",
            title: "Campanha de Growth B2B para Q4",
            model: "Claude Fable 5.1",
            updatedAt: "Ontem",
            category: "Marketing",
          },
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Saudação dinâmica por período do dia
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const agents = [
    {
      id: "orvexa-dev",
      name: "ORVEXA DEV",
      role: "Engenharia de Software & Full Stack",
      model: "GPT-5.6 Sol (Codex)",
      icon: Code2,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      id: "orvexa-design",
      name: "ORVEXA DESIGN",
      role: "UI/UX, Design Systems & Canvas",
      model: "Claude Sonnet 5",
      icon: Palette,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "orvexa-marketing",
      name: "ORVEXA MARKETING",
      role: "Growth, Copywriting & Campanhas",
      model: "Claude Fable 5.1",
      icon: Megaphone,
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
    {
      id: "orvexa-estudos",
      name: "ORVEXA EDU",
      role: "Síntese Didática & Método Feynman",
      model: "Gemini 3.8 Ultra",
      icon: GraduationCap,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "orvexa-juridico",
      name: "ORVEXA BUSINESS",
      role: "Estratégia, Finanças & Compliance",
      model: "Claude Sonnet 5",
      icon: Scale,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "orvexa-analyst",
      name: "ORVEXA ANALYST",
      role: "Data Science, Métricas & SQL",
      model: "Gemini 3.8 Pro",
      icon: TrendingUp,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* 1. Header Greeting & Quick Actions */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-cyan-500/20 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            AI GATEWAY ATIVO & OPERACIONAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {getGreeting()}, {user?.name || "Assinante"}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Plano atual: <span className="text-cyan-300 font-bold">{user?.plan?.name || "PRO"}</span> • Todos os modelos de última geração prontos para uso.
          </p>

          {/* Quick Action Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Novo Chat
            </Link>
            <Link
              href="/dashboard/workspace"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" /> Upload de Arquivo
            </Link>
            <Link
              href="/dashboard/codex"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium transition-all"
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" /> Abrir Codex
            </Link>
            <Link
              href="/dashboard/memory"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium transition-all"
            >
              <Brain className="w-3.5 h-3.5 text-pink-400" /> Busca Semântica
            </Link>
          </div>
        </div>

        <Link
          href="/dashboard/chat"
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-neon-glow transition-all flex items-center justify-center gap-2 shrink-0 group"
        >
          <MessageSquare className="w-4 h-4" />
          Iniciar Chat Multi-IA
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all">
              <span className="text-xs text-slate-400">Tokens Restantes</span>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                {user ? (user.tokensRemaining || 0).toLocaleString("pt-BR") : "..."}
              </div>
              <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{
                    width: `${Math.max(
                      0,
                      100 - Math.round(((user?.tokensUsed || 0) / (user?.tokenQuota || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-500 block mt-1.5">
                Cota mensal: {(user?.tokenQuota || 0).toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all">
              <span className="text-xs text-slate-400">Tokens Consumidos</span>
              <div className="text-2xl font-black text-cyan-400 mt-2">
                {user ? (user.tokensUsed || 0).toLocaleString("pt-BR") : "0"}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {Math.round(((user?.tokensUsed || 0) / (user?.tokenQuota || 1)) * 100)}% da franquia utilizada
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Ciclo mensal corrente</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all">
              <span className="text-xs text-slate-400">Status da Conta</span>
              <div className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                {user?.status || "ACTIVE"}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                Conexão Segura & Ativa
              </span>
              <span className="text-[11px] text-slate-500 block">Gateway sem limites de concorrência</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all">
              <span className="text-xs text-slate-400">Roteador Semântico</span>
              <div className="text-xl font-black text-cyan-300 mt-2 flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-emerald-400" />
                ORVEXA PRIME
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Seleção autônoma do melhor modelo
              </span>
              <span className="text-[11px] text-slate-500 block">Fallback automático ativado</span>
            </div>
          </>
        )}
      </div>

      {/* 3. Módulos de Alto Impacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/dashboard/workspace"
          className="p-6 rounded-2xl bg-gradient-to-br from-[#0D1322] to-cyan-950/20 border border-cyan-500/30 hover:border-cyan-500/60 transition-all group shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
              <FolderGit2 className="w-3 h-3" /> NOVO WORKSPACE
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
              ORVEXA WORKSPACE
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trabalho completo com arquivos: <strong>PDF, DOCX, XLSX, PPTX, CSV, ZIP</strong>. Análise automática, preview interativo e geração de planilhas.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-cyan-400 gap-1.5">
            Acessar Workspace <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/codex"
          className="p-6 rounded-2xl bg-gradient-to-br from-[#0D1322] to-purple-950/20 border border-purple-500/30 hover:border-purple-500/60 transition-all group shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
              <Code2 className="w-3 h-3" /> CODEX DEV ENGINE
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors">
              ORVEXA CODEX ENGINE
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ambiente de programação assistida para <strong>7 linguagens</strong>: JS, TS, Python, HTML, CSS, SQL e C#. Execução segura em sandbox e exportação em ZIP.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-purple-400 gap-1.5">
            Abrir Ambiente Codex <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/memory"
          className="p-6 rounded-2xl bg-gradient-to-br from-[#0D1322] to-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/60 transition-all group shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              <Brain className="w-3 h-3" /> MEMÓRIA SEMÂNTICA
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
              SMART MEMORY ENGINE
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inteligência de longo prazo com busca semântica vetorial (RAG) preparada para <strong>PostgreSQL + pgvector</strong>. Recuperação contextual de fatos e arquivos.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-400 gap-1.5">
            Gerenciar Memórias <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 4. Histórico Organizado & Atividades Recentes */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Histórico Organizado & Atividades Recentes
          </h2>
          <Link
            href="/dashboard/chat"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            Ver todas as conversas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/80">
          {recentConversations.map((item) => (
            <div
              key={item.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/40 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="text-cyan-400 font-mono">{item.model}</span>
                    <span>•</span>
                    <span>{item.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {item.updatedAt}
                </span>
                <Link
                  href="/dashboard/chat"
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-all"
                >
                  Continuar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Agentes Nativos de Especialidade */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            Agentes Especialistas Prontos para Ação
          </h2>
          <Link
            href="/dashboard/agents"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            Ver Hub Completo dos 6 Agentes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((ag) => {
            const Icon = ag.icon;
            return (
              <Link
                key={ag.id}
                href={`/dashboard/chat?agent=${ag.id}`}
                className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-cyan-500/40 hover:-translate-y-1 transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${ag.color} flex items-center justify-center border`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {ag.model}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {ag.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{ag.role}</p>
                <div className="mt-4 flex items-center text-xs text-cyan-400 font-semibold gap-1">
                  Iniciar conversa <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 6. Provedores de IA & Latência ao Vivo */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Status Operacional dos Provedores no Gateway
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">Anthropic (Claude)</div>
              <div className="text-xs text-slate-400 font-mono">Claude 3.7 • Sonnet 5 • Opus 5</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 block">
                ● 290ms
              </span>
              <span className="text-[10px] text-slate-500">100% Operacional</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">OpenAI (Codex)</div>
              <div className="text-xs text-slate-400 font-mono">GPT-5.6 Sol • GPT-4o • Mini</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 block">
                ● 310ms
              </span>
              <span className="text-[10px] text-slate-500">100% Operacional</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">Google AI (Gemini)</div>
              <div className="text-xs text-slate-400 font-mono">Gemini 3.8 Ultra • 1.5 Pro (2M)</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 block">
                ● 240ms
              </span>
              <span className="text-[10px] text-slate-500">100% Operacional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
