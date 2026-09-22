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
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const agents = [
    {
      id: "orvexa-dev",
      name: "ORVEXA DEV",
      role: "Engenharia de Software & Código",
      model: "GPT-5.6 Sol (Codex)",
      icon: Code2,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      id: "orvexa-design",
      name: "ORVEXA DESIGN",
      role: "UI/UX & Design Systems",
      model: "Claude Sonnet 5",
      icon: Palette,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "orvexa-marketing",
      name: "ORVEXA MARKETING",
      role: "Growth & Copywriting",
      model: "Claude Fable 5.1",
      icon: Megaphone,
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
    {
      id: "orvexa-estudos",
      name: "ORVEXA ESTUDOS",
      role: "Síntese Didática & Feynman",
      model: "Gemini 3.8 Ultra",
      icon: GraduationCap,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "orvexa-juridico",
      name: "ORVEXA JURÍDICO",
      role: "Compliance, LGPD & Contratos",
      model: "Claude Sonnet 5",
      icon: Scale,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0D1322] border border-cyan-500/20 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI GATEWAY ATIVO & OPERACIONAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Olá, {user?.name || "Assinante"}!
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Plano atual: <span className="text-cyan-300 font-bold">{user?.plan?.name || "PRO"}</span> • Todas as IAs integradas disponíveis.
          </p>
        </div>

        <Link
          href="/dashboard/chat"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-sm shadow-neon-glow transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          Iniciar Chat Multi-IA
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800">
          <span className="text-xs text-slate-400">Tokens Restantes</span>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {user ? (user.tokensRemaining || 0).toLocaleString("pt-BR") : "..."}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Quota mensal: {(user?.tokenQuota || 0).toLocaleString("pt-BR")}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800">
          <span className="text-xs text-slate-400">Tokens Consumidos</span>
          <div className="text-2xl font-black text-cyan-400 mt-2">
            {user ? (user.tokensUsed || 0).toLocaleString("pt-BR") : "0"}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Neste ciclo de faturamento</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800">
          <span className="text-xs text-slate-400">Status da Conta</span>
          <div className="text-2xl font-black text-white mt-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            {user?.status || "ACTIVE"}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Acesso irrestrito ao Gateway</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800">
          <span className="text-xs text-slate-400">Inteligência Padrão</span>
          <div className="text-xl font-black text-cyan-300 mt-2 flex items-center gap-1.5">
            <Zap className="w-5 h-5 text-emerald-400" />
            ORVEXA PRIME
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Roteamento semântico automático</span>
        </div>
      </div>

      {/* MÓDULOS DE ALTO IMPACTO: SITE BUILDER, IMAGE STUDIO & DOCUMENT ANALYZER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/dashboard/site-builder"
          className="p-6 rounded-2xl bg-gradient-to-br from-[#0D1322] to-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/60 transition-all group shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              <Globe className="w-3 h-3" /> NOVO NO GATE 5
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
              ORVEXA SITE BUILDER
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crie sites profissionais em segundos com os <strong>7 templates comerciais</strong>. Layout responsivo, textos persuasivos, código Tailwind e SEO automático.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-400 gap-1.5">
            Acessar Site Builder <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/image-studio"
          className="p-6 rounded-2xl bg-gradient-to-br from-[#0D1322] to-purple-950/20 border border-purple-500/30 hover:border-purple-500/60 transition-all group shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
              <Sparkles className="w-3 h-3" /> MÓDULO VISUAL
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors">
              IMAGE STUDIO
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crie posts, logos e banners com o <strong>Prompt Engine de 11 parâmetros</strong>. Ajuste preços e etiquetas diretamente no canvas interativo.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-purple-400 gap-1.5">
            Acessar Image Studio <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/document-analyzer"
          className="p-6 rounded-2xl bg-gradient-to-br from-[#0D1322] to-cyan-950/20 border border-cyan-500/30 hover:border-cyan-500/60 transition-all group shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
              <FileSpreadsheet className="w-3 h-3" /> AUDITORIA AUTOMÁTICA
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
              DOCUMENT ANALYZER
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Extração e auditoria de <strong>PDF, DOCX, XLSX e imagens</strong>. Cálculo automático de caixas, ticket médio e verificação de cláusulas de risco.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-cyan-400 gap-1.5">
            Acessar Document Analyzer <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Agentes Especialistas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            Agentes Nativos de Especialidade (GATE 5)
          </h2>
          <Link
            href="/dashboard/agents"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            Ver Hub dos 5 Agentes & Ferramentas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((ag) => {
            const Icon = ag.icon;
            return (
              <Link
                key={ag.id}
                href={`/dashboard/chat?agent=${ag.id}`}
                className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-cyan-500/40 hover:-translate-y-1 transition-all group shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl ${ag.color} flex items-center justify-center mb-3 border`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {ag.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{ag.role}</p>
                <div className="mt-4 flex items-center text-xs text-cyan-400 font-semibold gap-1">
                  Iniciar conversa <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Provedores & Modelos Ativos */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Provedores de IA Ativos no Gateway
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">Anthropic / Fable</div>
              <div className="text-xs text-slate-400 font-mono">Claude Fable 5.1 • Sonnet 5 • Opus 5</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ● Ao Vivo
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">OpenAI / Codex</div>
              <div className="text-xs text-slate-400 font-mono">GPT-5.6 Sol • GPT-6 Astra • Terra</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ● Ao Vivo
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">Google Gemini</div>
              <div className="text-xs text-slate-400 font-mono">Gemini 1.5 Pro (Contexto 1M)</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ● Ao Vivo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

