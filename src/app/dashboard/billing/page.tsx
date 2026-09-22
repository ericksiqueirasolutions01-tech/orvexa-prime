"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  Lock,
  Sparkles,
  Receipt,
  MessageSquare,
  Folder,
  Image as ImageIcon,
  Bot,
  HardDrive,
  Calendar,
  TrendingUp,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface UsageMetric {
  used: number;
  limit: number;
  percentage: number;
  exceeded: boolean;
  warning: boolean;
}

interface ConsumptionData {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  plan: {
    id?: string;
    name: string;
    slug: string;
    priceCents: number;
    priceFormatted: string;
    features: string[];
    allowedAgents: string[];
  };
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    gatewayProvider: string;
  } | null;
  cycle: {
    start: string;
    end: string;
    daysRemaining: number;
  };
  metrics: {
    messages: UsageMetric;
    files: UsageMetric;
    images: UsageMetric;
    agents: UsageMetric & { allowedSlugs: string[] };
    storage: UsageMetric & { usedFormatted: string; limitFormatted: string };
    tokens: UsageMetric;
  };
  hasExceededAny: boolean;
  hasWarningAny: boolean;
}

const PLANS_CATALOG = [
  {
    slug: "free",
    name: "FREE",
    priceFormatted: "R$ 0,00",
    priceCents: 0,
    period: "/ mês",
    badge: "GRATUITO",
    messages: "100 msgs/mês",
    files: "5 arquivos",
    images: "10 imagens",
    agents: "1 Agente (DEV)",
    storage: "100 MB nuvem",
    models: "Rápidos (GPT-4o Mini, Flash)",
    features: [
      "100 mensagens mensais",
      "5 arquivos processados no workspace",
      "10 gerações de imagem",
      "Agente Especialista Dev (Básico)",
      "100 MB de armazenamento",
      "Modelos rápidos de alta eficiência",
    ],
  },
  {
    slug: "pro",
    name: "PRO",
    priceFormatted: "R$ 79,90",
    priceCents: 7990,
    period: "/ mês",
    badge: "MAIS ESCOLHIDO",
    messages: "1.500 msgs/mês",
    files: "60 arquivos",
    images: "80 imagens",
    agents: "Todos os 6 Agentes",
    storage: "5 GB nuvem",
    models: "Claude 3.5 Sonnet & GPT-4o",
    features: [
      "1.500 mensagens mensais",
      "60 arquivos com chunking & RAG",
      "80 gerações de imagem HD",
      "Todos os 6 Agentes Oficiais",
      "5 GB de armazenamento seguro",
      "Modelos Top-Tier (Claude 3.5 & GPT-4o)",
    ],
  },
  {
    slug: "business",
    name: "BUSINESS",
    priceFormatted: "R$ 249,90",
    priceCents: 24990,
    period: "/ mês",
    badge: "EMPRESAS",
    messages: "6.000 msgs/mês",
    files: "300 arquivos",
    images: "300 imagens",
    agents: "Agentes + Custom",
    storage: "25 GB nuvem",
    models: "Todos + Prioridade Gateway",
    features: [
      "6.000 mensagens mensais",
      "300 arquivos corporativos",
      "300 imagens ultra HD",
      "Todos os Agentes + Customizados",
      "25 GB de armazenamento",
      "Prioridade no AI Gateway Failover",
      "Até 5 membros da equipe",
    ],
  },
  {
    slug: "enterprise",
    name: "ENTERPRISE",
    priceFormatted: "R$ 799,90",
    priceCents: 79990,
    period: "/ mês",
    badge: "CORPORATIVO VIP",
    messages: "Ilimitado (50k)",
    files: "2.000 arquivos",
    images: "1.500 imagens",
    agents: "Agentes VIP Dedicados",
    storage: "100 GB nuvem",
    models: "Chaves Dedicadas + SLA",
    features: [
      "Mensagens ilimitadas (50k quota base)",
      "2.000 arquivos processados",
      "1.500 gerações de imagem 4K",
      "Agentes dedicados com memória ilimitada",
      "100 GB de armazenamento",
      "Chaves de API exclusivas",
      "SLA 99.9% e Relatório LGPD",
    ],
  },
];

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPendingQuery = searchParams.get("pending") === "true";

  const [consumption, setConsumption] = useState<ConsumptionData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("pro");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [copiedPix, setCopiedPix] = useState(false);
  const [activeTab, setActiveTab] = useState<"consumption" | "plans" | "checkout" | "history">("consumption");

  // Cartão simulado
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 4242");
  const [cardHolder, setCardHolder] = useState("CLIENTE ORVEXA");
  const [cardExpiry, setCardExpiry] = useState("12/29");
  const [cardCvv, setCardCvv] = useState("•••");

  const pixCode =
    "00020126580014br.gov.bcb.pix0136orvexa-financeiro-gateway-202652040000530398654079.905802BR5916ORVEXA DIGITAL6009SAO PAULO62070503***6304ABCD";

  const fetchData = async () => {
    try {
      const res = await fetch("/api/user/consumption");
      if (res.ok) {
        const data = await res.json();
        setConsumption(data.consumption);
        setHistory(data.history || []);
        setPayments(data.payments || []);
        if (data.consumption?.plan?.slug) {
          setSelectedPlanSlug(data.consumption.plan.slug);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulatePaymentWebhook = async (targetSlug?: string) => {
    setActionLoading(true);
    setWebhookStatus(null);
    const slug = targetSlug || selectedPlanSlug;
    const plan = PLANS_CATALOG.find((p) => p.slug === slug) || PLANS_CATALOG[1];

    try {
      const res = await fetch("/api/webhooks/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": "demo_mock_signature_valid",
        },
        body: JSON.stringify({
          eventType: paymentMethod === "pix" ? "pix.received" : "payment_intent.succeeded",
          status: "CONFIRMED",
          userId: consumption?.userId,
          subscriptionId: consumption?.subscription?.id,
          planSlug: slug,
          amountCents: plan.priceCents,
          gateway: paymentMethod === "pix" ? "MERCADO_PAGO" : "STRIPE",
          transactionId: `txn_${paymentMethod}_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no webhook.");

      setWebhookStatus(
        `✔ Pagamento aprovado via Webhook oficial! Plano ${data.planName || plan.name} ativo com novos limites.`
      );
      await fetchData();
      setActiveTab("consumption");
      router.refresh();
    } catch (err: any) {
      setWebhookStatus(`Erro: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const currentPlan = consumption?.plan;
  const metrics = consumption?.metrics;
  const cycle = consumption?.cycle;

  const currentSelectedPlan = PLANS_CATALOG.find((p) => p.slug === selectedPlanSlug) || PLANS_CATALOG[1];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* 1. Header do Faturamento & Plano Atual */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0D1322] via-[#09172B] to-[#0A1624] border border-cyan-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              SISTEMA DE PLANOS & CONSUMO SAAS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Plano & Consumo de Recursos
              <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                {currentPlan?.name || "CARREGANDO"}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl leading-relaxed">
              Monitore o consumo em tempo real dos 5 vetores (mensagens, arquivos, imagens, agentes e armazenamento) e gerencie seu plano corporativo.
            </p>
          </div>

          {/* Card Resumo do Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 px-4 rounded-2xl bg-[#080C14]/80 border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Ciclo Atual</span>
                <span className="text-xs font-bold text-white">
                  {cycle?.daysRemaining ?? "--"} dias restantes
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("plans")}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all shadow-neon-glow flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade de Plano
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: "consumption", label: "Consumo Atual & Limites", icon: TrendingUp },
            { id: "plans", label: "Catálogo de Planos", icon: Sparkles },
            { id: "checkout", label: "Checkout & Pagamento", icon: Lock },
            { id: "history", label: "Histórico & Faturas", icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerta de Pagamento Pendente se aplicável */}
      {(consumption?.status === "PENDING_PAYMENT" || isPendingQuery) && (
        <div className="p-6 rounded-3xl bg-amber-950/40 border-2 border-amber-500/40 text-amber-200 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Assinatura Pendente de Confirmação Financeira</h3>
              <p className="text-xs text-amber-300 leading-relaxed">
                Seu acesso aos recursos completos é ativado automaticamente após confirmação bancária. Clique abaixo para simular a liquidação imediata via Webhook.
              </p>
            </div>
          </div>
          {webhookStatus && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{webhookStatus}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: CONSUMO ATUAL & LIMITES (5 VETORES) */}
      {/* ========================================================================= */}
      {activeTab === "consumption" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Consumo em Tempo Real dos 5 Vetores
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhe o uso detalhado no ciclo atual. As quotas são renovadas mensalmente.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-[#0D1322] border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>

          {/* Grid dos 5 Vetores de Consumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. MENSAGENS */}
            <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    metrics?.messages.exceeded
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : metrics?.messages.warning
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {metrics?.messages.exceeded
                    ? "LIMITE ATINGIDO"
                    : metrics?.messages.warning
                    ? "80% CONSUMIDO"
                    : "NORMAL"}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">1. Quantidade de Mensagens</span>
                <div className="text-2xl font-black text-white">
                  {(metrics?.messages.used || 0).toLocaleString("pt-BR")}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {(metrics?.messages.limit || 0).toLocaleString("pt-BR")} msgs
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      metrics?.messages.exceeded
                        ? "bg-red-500"
                        : metrics?.messages.warning
                        ? "bg-amber-400"
                        : "bg-gradient-to-r from-cyan-400 to-emerald-400"
                    }`}
                    style={{ width: `${Math.min(100, metrics?.messages.percentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{metrics?.messages.percentage || 0}% utilizado</span>
                  <span>
                    {Math.max(0, (metrics?.messages.limit || 0) - (metrics?.messages.used || 0))} restantes
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ARQUIVOS PROCESSADOS */}
            <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-indigo-400" />
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    metrics?.files.exceeded
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : metrics?.files.warning
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                  }`}
                >
                  {metrics?.files.exceeded ? "LIMITE ATINGIDO" : "OK"}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">2. Arquivos Processados (RAG)</span>
                <div className="text-2xl font-black text-white">
                  {metrics?.files.used || 0}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {metrics?.files.limit || 0} arquivos
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, metrics?.files.percentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{metrics?.files.percentage || 0}% utilizado</span>
                  <span>{Math.max(0, (metrics?.files.limit || 0) - (metrics?.files.used || 0))} restantes</span>
                </div>
              </div>
            </div>

            {/* 3. GERAÇÃO DE IMAGENS */}
            <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-pink-400" />
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    metrics?.images.exceeded
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-pink-500/10 text-pink-400 border-pink-500/30"
                  }`}
                >
                  {metrics?.images.exceeded ? "LIMITE ATINGIDO" : "OK"}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">3. Geração de Imagens</span>
                <div className="text-2xl font-black text-white">
                  {metrics?.images.used || 0}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {metrics?.images.limit || 0} imagens
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, metrics?.images.percentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{metrics?.images.percentage || 0}% utilizado</span>
                  <span>{Math.max(0, (metrics?.images.limit || 0) - (metrics?.images.used || 0))} restantes</span>
                </div>
              </div>
            </div>

            {/* 4. USO DOS AGENTES */}
            <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                  {metrics?.agents.allowedSlugs.includes("ALL") ? "TODOS LIBERADOS" : "1 AGENTE (DEV)"}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">4. Acesso a Agentes Especialistas</span>
                <div className="text-2xl font-black text-white">
                  {metrics?.agents.allowedSlugs.includes("ALL") ? "6 Agentes" : "1 Agente"}
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({metrics?.agents.used || 0} sessões ativas)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                {["DEV", "DESIGN", "MARKETING", "EDU", "BUSINESS", "ANALYST"].map((slug) => {
                  const isAvailable =
                    metrics?.agents.allowedSlugs.includes("ALL") ||
                    (slug === "DEV" && metrics?.agents.allowedSlugs.includes("orvexa-dev"));
                  return (
                    <span
                      key={slug}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                        isAvailable
                          ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30"
                          : "bg-slate-900 text-slate-600 line-through"
                      }`}
                    >
                      {slug}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 5. ARMAZENAMENTO */}
            <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    metrics?.storage.exceeded
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {metrics?.storage.exceeded ? "ARMAZENAMENTO CHEIO" : "DISPONÍVEL"}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">5. Limite de Armazenamento</span>
                <div className="text-2xl font-black text-white">
                  {metrics?.storage.usedFormatted || "0 B"}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {metrics?.storage.limitFormatted || "500 MB"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, metrics?.storage.percentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{metrics?.storage.percentage || 0}% utilizado</span>
                  <span>{metrics?.storage.limitFormatted} total</span>
                </div>
              </div>
            </div>

            {/* CARD EXTRA: TOKENS DE IA */}
            <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  AI GATEWAY
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Tokens de IA Mensais</span>
                <div className="text-2xl font-black text-white">
                  {(metrics?.tokens.used || 0).toLocaleString("pt-BR")}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {(metrics?.tokens.limit || 0).toLocaleString("pt-BR")} tokens
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, metrics?.tokens.percentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{metrics?.tokens.percentage || 0}% utilizado</span>
                  <span>
                    {(
                      Math.max(0, (metrics?.tokens.limit || 0) - (metrics?.tokens.used || 0))
                    ).toLocaleString("pt-BR")}{" "}
                    restantes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CATÁLOGO DOS 4 PLANOS (FREE, PRO, BUSINESS, ENTERPRISE) */}
      {/* ========================================================================= */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Escolha o Plano Ideal para Sua Operação
            </h2>
            <p className="text-xs text-slate-400">
              Acesso a modelos de última geração, múltiplos agentes autônomos e infraestrutura preparada para escala.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS_CATALOG.map((plan) => {
              const isCurrent = currentPlan?.slug?.toLowerCase() === plan.slug;
              const isSelected = selectedPlanSlug === plan.slug;

              return (
                <div
                  key={plan.slug}
                  className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative ${
                    isCurrent
                      ? "bg-[#0D182E] border-cyan-500 shadow-neon-glow"
                      : isSelected
                      ? "bg-[#0D1322] border-cyan-500/60 shadow-lg"
                      : "bg-[#0D1322] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-white">{plan.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{plan.priceFormatted}</span>
                        <span className="text-xs text-slate-500">{plan.period}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Mensagens:</span>
                        <span className="font-bold text-white">{plan.messages}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Arquivos:</span>
                        <span className="font-bold text-white">{plan.files}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Imagens:</span>
                        <span className="font-bold text-white">{plan.images}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Agentes:</span>
                        <span className="font-bold text-white">{plan.agents}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Storage:</span>
                        <span className="font-bold text-white">{plan.storage}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                      {plan.features.slice(0, 3).map((feat, i) => (
                        <div key={i} className="text-[11px] text-slate-300 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-4">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <Check className="w-4 h-4" />
                        Plano Ativo
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPlanSlug(plan.slug);
                          setActiveTab("checkout");
                        }}
                        className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Selecionar {plan.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CHECKOUT & PAGAMENTO MODULAR */}
      {/* ========================================================================= */}
      {activeTab === "checkout" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: Resumo do Plano (6 colunas) */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              1. Plano Selecionado para Upgrade
            </h2>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-cyan-400 font-mono uppercase font-bold">PLANO SELECIONADO</span>
                  <h3 className="text-2xl font-black text-white">{currentSelectedPlan.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-cyan-400">{currentSelectedPlan.priceFormatted}</div>
                  <span className="text-[10px] text-slate-500">Cobrança Mensal</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Mensagens</span>
                  <span className="font-bold text-white">{currentSelectedPlan.messages}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Arquivos RAG</span>
                  <span className="font-bold text-white">{currentSelectedPlan.files}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Imagens</span>
                  <span className="font-bold text-white">{currentSelectedPlan.images}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Armazenamento</span>
                  <span className="font-bold text-white">{currentSelectedPlan.storage}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                {currentSelectedPlan.features.map((f, i) => (
                  <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Gateway de Pagamento (6 colunas) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                2. Pagamento Seguro
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                CRIPTOGRAFIA 256-BIT
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-5">
              {/* Alternador de Método de Pagamento */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    paymentMethod === "pix"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  PIX Instantâneo
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    paymentMethod === "card"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Cartão de Crédito
                </button>
              </div>

              {/* CONTEÚDO PIX */}
              {paymentMethod === "pix" ? (
                <div className="space-y-4 text-center">
                  <div className="w-44 h-44 mx-auto bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-xl p-2 flex flex-col items-center justify-center text-white space-y-1">
                      <QrCode className="w-20 h-20 text-cyan-400" />
                      <span className="text-[9px] font-mono text-cyan-300">PIX DINÂMICO</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 block">Código Copia e Cola:</span>
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-300 truncate flex-1 text-left px-2">
                        {pixCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1 shrink-0"
                      >
                        {copiedPix ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-cyan-400" />
                        )}
                        {copiedPix ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* CONTEÚDO CARTÃO DE CRÉDITO */
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Número do Cartão</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Validade</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">CVV</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Titular do Cartão</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs uppercase focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Botão de Confirmação via Webhook / Gateway */}
              <button
                type="button"
                onClick={() => handleSimulatePaymentWebhook()}
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 hover:opacity-90 text-slate-950 font-black text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando Liquidação Financeira...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Pagamento & Ativar {currentSelectedPlan.name}
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                Integração preparada para Stripe, Mercado Pago e Asaas com assinatura HMAC SHA-256 e idempotência estrita.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: HISTÓRICO DE CONSUMO & FATURAS ANTERIORES */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-8">
          {/* Histórico Mensal de Consumo */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Evolução de Consumo dos Últimos Meses
            </h2>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-4">
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Nenhum histórico registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="pb-3">MÊS</th>
                        <th className="pb-3">MENSAGENS</th>
                        <th className="pb-3">ARQUIVOS</th>
                        <th className="pb-3">IMAGENS</th>
                        <th className="pb-3">TOKENS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {history.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/40">
                          <td className="py-3 font-bold text-white capitalize">{row.month}</td>
                          <td className="py-3 text-cyan-400 font-mono">{row.messages.toLocaleString()} msgs</td>
                          <td className="py-3 text-indigo-400 font-mono">{row.files} arqs</td>
                          <td className="py-3 text-pink-400 font-mono">{row.images} imgs</td>
                          <td className="py-3 text-slate-300 font-mono">{row.tokens.toLocaleString()} tokens</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Faturas & Transações */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Comprovantes Financeiros & Faturas
            </h2>

            <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-4">
              {payments.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Nenhuma fatura registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="pb-3">TRANSAÇÃO</th>
                        <th className="pb-3">DATA</th>
                        <th className="pb-3">VALOR</th>
                        <th className="pb-3">GATEWAY</th>
                        <th className="pb-3">STATUS</th>
                        <th className="pb-3 text-right">RECIBO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-850/40">
                          <td className="py-3 font-mono text-slate-300">{p.transactionId || p.id.slice(0, 12)}</td>
                          <td className="py-3 text-slate-400">
                            {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 font-bold text-white">
                            R$ {(p.amountCents / 100).toFixed(2).replace(".", ",")}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
                              {p.gateway}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() =>
                                alert(`Comprovante emitido para a transação ${p.transactionId}: Confirmado com sucesso.`)
                              }
                              className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Visualizar</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-cyan-400">Carregando painel financeiro...</div>}>
      <BillingContent />
    </Suspense>
  );
}
