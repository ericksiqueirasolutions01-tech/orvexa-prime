"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { CinematicLoading } from "@/components/cinematic-loading";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu,
  Layers,
  Code2,
  Megaphone,
  GraduationCap,
  Scale,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCw,
  Server,
} from "lucide-react";

export default function HomePage() {
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = sessionStorage.getItem("orvexa_intro_seen");
      const params = new URLSearchParams(window.location.search);
      // Se já viu nesta sessão ou passou parâmetro ?intro=false, pula direto
      if (seen === "true" || params.get("intro") === "false") {
        setShowCinematicIntro(false);
      }
    } catch {
      // Ignora erro de storage se houver
    }
  }, []);

  const handleFinishIntro = () => {
    try {
      sessionStorage.setItem("orvexa_intro_seen", "true");
    } catch {}
    setShowCinematicIntro(false);
  };
  const agents = [
    {
      name: "ORVEXA DEV",
      role: "Engenharia de Software & Arquitetura",
      icon: Code2,
      desc: "Especialista em TypeScript, arquitetura escalável, debug de erros e código de produção de alta performance.",
      color: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-cyan-400",
      accent: "#00D2FF",
    },
    {
      name: "ORVEXA MARKETING",
      role: "Growth, Copywriting & Estratégia",
      icon: Megaphone,
      desc: "Criação de copys persuasivas, roteiros de alta conversão, funis de vendas e campanhas estratégicas de branding.",
      color: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-400",
      accent: "#00FF88",
    },
    {
      name: "ORVEXA ESTUDOS",
      role: "Metodologia & Mentoria Acadêmica",
      icon: GraduationCap,
      desc: "Síntese didática de temas complexos, geração de cronogramas, mapas mentais e questionários de fixação.",
      color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-400",
      accent: "#0066FF",
    },
    {
      name: "ORVEXA JURÍDICO",
      role: "Compliance & Direito Digital",
      icon: Scale,
      desc: "Análise prévia de contratos, adequação à LGPD, redação de termos de uso e identificação de riscos operacionais.",
      color: "from-purple-500/20 to-cyan-500/20 border-purple-500/30 text-purple-400",
      accent: "#A855F7",
    },
  ];

  const plans = [
    {
      name: "START",
      price: "R$ 49,90",
      tokens: "200.000 Tokens / mês",
      desc: "Ideal para profissionais autônomos que buscam produtividade ágil no dia a dia.",
      models: "Modelos rápidos (GPT-4o Mini, Haiku, Flash)",
      highlight: false,
      slug: "start",
      features: [
        "Acesso ao Chat ORVEXA",
        "Histórico por 30 dias",
        "AI Gateway com Failover básico",
        "Suporte Comunitário",
      ],
    },
    {
      name: "PRO",
      price: "R$ 119,90",
      tokens: "1.000.000 Tokens / mês",
      desc: "Para profissionais e criadores que exigem o máximo poder dos modelos de fronteira.",
      models: "Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro",
      highlight: true,
      slug: "pro",
      features: [
        "ORVEXA PRIME ENGINE Inteligente",
        "4 Agentes Nativos Especialistas",
        "Upload de Arquivos (PDF, DOCX, Imagens)",
        "Balanceamento automático de chaves",
        "Histórico ilimitado",
      ],
    },
    {
      name: "PREMIUM",
      price: "R$ 249,90",
      tokens: "3.000.000 Tokens / mês",
      desc: "Para agências e times que utilizam IA intensivamente em seus processos vitais.",
      models: "Todos os modelos com prioridade máxima",
      highlight: false,
      slug: "premium",
      features: [
        "Até 3 membros inclusos",
        "Prioridade Ultra no AI Gateway",
        "Upload de arquivos pesados e planilhas",
        "Criação de Agentes customizados",
        "Suporte Prioritário VIP 24/7",
      ],
    },
    {
      name: "EMPRESA",
      price: "R$ 599,90",
      tokens: "10.000.000 Tokens / mês",
      desc: "Solução corporativa completa com infraestrutura dedicada e controle total.",
      models: "Modelos dedicados & customizáveis",
      highlight: false,
      slug: "empresa",
      features: [
        "Até 10 membros da equipe",
        "AI Gateway Dedicado exclusivo",
        "Auditoria de logs e compliance LGPD",
        "SLA garantido de 99.9%",
        "Gerente de conta exclusivo",
      ],
    },
  ];

  if (mounted && showCinematicIntro) {
    return (
      <main className="w-full h-screen overflow-hidden bg-[#030712] relative">
        <CinematicLoading
          onComplete={handleFinishIntro}
          autoRedirectUrl="/dashboard/chat"
          showNavigationControls={true}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 bg-grid relative overflow-hidden">
      <Navbar />

      {/* Background glow orbs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-cyan-500/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-medium mb-8 backdrop-blur-md shadow-neon-cyan animate-pulse">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>ORVEXA PRIME DIGITAL — Conhecimento que Transforma</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Múltiplas Inteligências.{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
            Uma Única Plataforma.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Acesse os modelos mais avançados do mundo — Claude 3.5, GPT-4o e Gemini 1.5 Pro — com balanceamento inteligente, agentes dedicados e segurança corporativa.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-base shadow-neon-glow transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            Começar Agora
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 font-semibold text-base backdrop-blur-md transition-all flex items-center justify-center gap-2"
          >
            Acessar Minha Conta
          </Link>
          <button
            onClick={() => setShowCinematicIntro(true)}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-transparent hover:bg-white/5 text-amber-300 border border-amber-500/30 font-semibold text-base backdrop-blur-md transition-all flex items-center justify-center gap-2 shadow-sm shadow-amber-500/10 hover:border-amber-400/60 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Experiência Cinematográfica
          </button>
        </div>

        {/* Logo Banner & Stats */}
        <div className="mt-16 pt-10 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-cyan-500/10 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400">99.98%</div>
            <div className="text-xs text-slate-400 mt-1">Disponibilidade com Failover</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-emerald-500/10 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">&lt; 45ms</div>
            <div className="text-xs text-slate-400 mt-1">Latência de Roteamento</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-cyan-500/10 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-white">AES-256</div>
            <div className="text-xs text-slate-400 mt-1">Criptografia GCM nas Chaves</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-emerald-500/10 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-cyan-300">Zero Keys</div>
            <div className="text-xs text-slate-400 mt-1">Nenhuma chave exposta ao cliente</div>
          </div>
        </div>
      </section>

      {/* AI Gateway Section */}
      <section id="gateway" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <Cpu className="w-3.5 h-3.5" />
            ARQUITETURA DE FRONTEIRA
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            ORVEXA AI Gateway & Engine
          </h2>
          <p className="mt-4 text-slate-400">
            O cliente nunca chama diretamente os provedores. Nosso gateway orquestra o balanceamento de chaves sem limites e comutação instantânea contra erros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#0D1322] border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-5 border border-cyan-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ORVEXA PRIME ENGINE</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Analisa a intenção semântica do prompt em tempo real e roteia código para Codex/OpenAI, redação para Claude e pesquisas profundas para Gemini.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1322] border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-5 border border-emerald-500/20">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Failover & Chaves Ilimitadas</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cadastre quantas chaves quiser por provedor. Se uma chave atingir rate limit (429), o gateway comuta para a próxima em milissegundos sem interromper o usuário.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1322] border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-5 border border-cyan-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Segurança Máxima AES-256</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Criptografia simétrica com IV e Auth Tag na gravação. Nenhum segredo ou chave de API trafega para o frontend em momento algum.
            </p>
          </div>
        </div>
      </section>

      {/* Agentes Especialistas */}
      <section id="agentes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ESPECIALISTAS DEDICADOS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Agentes Prontos para Produção
          </h2>
          <p className="mt-4 text-slate-400">
            Treinados com instruções corporativas profundas para acelerar seu fluxo de trabalho em setores vitais.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent, i) => {
            const Icon = agent.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 group hover:-translate-y-1 shadow-md"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-5 border`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {agent.name}
                </h3>
                <span className="text-xs font-mono text-cyan-400 block mb-3">
                  {agent.role}
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {agent.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Planos de Assinatura */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            TRANSPARÊNCIA TOTAL
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Planos Sob Medida para sua Operação
          </h2>
          <p className="mt-4 text-slate-400">
            Sem pegadinhas ou cobranças ocultas. Liberação imediata após confirmação de pagamento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`p-7 rounded-2xl flex flex-col justify-between transition-all duration-300 relative ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#10192e] to-[#0d1322] border-2 border-cyan-400 shadow-neon-glow md:-translate-y-2"
                  : "bg-[#0D1322] border border-slate-800 hover:border-slate-700"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider shadow-md">
                  Mais Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <div className="text-xs font-semibold text-cyan-400 mt-1">{plan.tokens}</div>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed">{plan.desc}</p>

                <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={`/register?plan=${plan.slug}`}
                  className={`w-full py-3 rounded-xl font-bold text-sm text-center block transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-neon-glow"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  Assinar {plan.name}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Footer */}
      <footer id="seguranca" className="border-t border-slate-800/80 bg-[#05070D] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-cyan-500/30">
              <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-white">ORVEXA PRIME DIGITAL</div>
              <div className="text-xs text-slate-400">Conhecimento que Transforma. Plataforma SaaS de IA.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              Conformidade LGPD
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Server className="w-4 h-4" />
              Infraestrutura Multi-Provedores
            </span>
            <span>© 2026 ORVEXA PRIME DIGITAL. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

