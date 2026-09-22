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
  FileCheck,
} from "lucide-react";

const PLANS_CATALOG = [
  {
    slug: "start",
    name: "START",
    priceFormatted: "R$ 49,90",
    priceCents: 4990,
    tokens: 200000,
    features: ["200.000 Tokens Mensais", "Modelos rápidos (GPT-4o Mini, Haiku, Flash)", "Histórico por 30 dias", "Suporte Comunitário"],
  },
  {
    slug: "pro",
    name: "PRO",
    priceFormatted: "R$ 119,90",
    priceCents: 11990,
    tokens: 1000000,
    badge: "MAIS ESCOLHIDO",
    features: ["1.000.000 Tokens Mensais", "Acesso aos Modelos Top-Tier (Claude 3.5, GPT-4o)", "5 Agentes Especialistas", "Site Builder & Image Studio"],
  },
  {
    slug: "premium",
    name: "PREMIUM",
    priceFormatted: "R$ 249,90",
    priceCents: 24990,
    tokens: 3000000,
    features: ["3.000.000 Tokens Mensais", "Prioridade Máxima no AI Gateway Failover", "Até 3 membros na conta", "Suporte VIP 24/7"],
  },
  {
    slug: "empresa",
    name: "EMPRESA",
    priceFormatted: "R$ 599,90",
    priceCents: 59990,
    tokens: 10000000,
    badge: "CORPORATIVO",
    features: ["10.000.000 Tokens Mensais", "Chaves Dedicadas no AI Gateway", "Até 10 membros da equipe", "SLA 99.9% e Relatório LGPD"],
  },
];

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPendingQuery = searchParams.get("pending") === "true";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("pro");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [copiedPix, setCopiedPix] = useState(false);

  // Cartão simulado
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 4242");
  const [cardHolder, setCardHolder] = useState("CLIENTE ORVEXA");
  const [cardExpiry, setCardExpiry] = useState("12/29");
  const [cardCvv, setCardCvv] = useState("•••");

  const pixCode = "00020126580014br.gov.bcb.pix0136orvexa-financeiro-gateway-20265204000053039865405119.905802BR5916ORVEXA DIGITAL6009SAO PAULO62070503***6304ABCD";

  const fetchUserData = () => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user);
          if (data.user.plan?.slug) {
            setSelectedPlanSlug(data.user.plan.slug);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleSimulatePaymentWebhook = async () => {
    if (!user) return;
    setLoading(true);
    setWebhookStatus(null);

    const activePlan = PLANS_CATALOG.find((p) => p.slug === selectedPlanSlug) || PLANS_CATALOG[1];

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
          userId: user.id,
          subscriptionId: user.subscriptions?.[0]?.id,
          amountCents: activePlan.priceCents,
          gateway: paymentMethod === "pix" ? "PIX_GATEWAY" : "STRIPE",
          transactionId: `txn_${paymentMethod}_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no webhook.");

      setWebhookStatus(`✔ Pagamento confirmado via Webhook financeiro! Sua conta agora está ACTIVE no plano ${data.planName || activePlan.name}.`);
      fetchUserData();
      router.refresh();
    } catch (err: any) {
      setWebhookStatus(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const currentPlanObj = PLANS_CATALOG.find((p) => p.slug === selectedPlanSlug) || PLANS_CATALOG[1];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0D1322] via-[#09172B] to-[#0A1624] border border-cyan-500/25 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              PORTAL FINANCEIRO & GATEWAY — GATE 6
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Assinatura & Faturamento</h1>
            <p className="text-xs text-slate-300 mt-1">
              Gerencie seu plano corporativo, limites mensais e validação estrita de pagamentos via Webhook.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
                user?.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${user?.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
              STATUS: {user?.status || "CARREGANDO"}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de Pagamento Pendente se aplicável */}
      {(user?.status === "PENDING_PAYMENT" || isPendingQuery) && (
        <div className="p-6 rounded-3xl bg-amber-950/40 border-2 border-amber-500/40 text-amber-200 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Assinatura Pendente de Confirmação Financeira
              </h3>
              <p className="text-xs text-amber-300 leading-relaxed">
                Em cumprimento à regra de segurança do Prompt Mestre (<strong>"Nunca liberar somente pelo frontend"</strong>), seu acesso aos recursos de IA só é ativado após a confirmação criptográfica recebida pelo nosso webhook oficial.
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

      {/* CHECKOUT SECTION: Seletor de Planos & Forma de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Seletor dos 4 Planos (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              1. Selecione seu Plano Corporativo
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">4 PLANOS DISPONÍVEIS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {PLANS_CATALOG.map((plan) => {
              const isSelected = selectedPlanSlug === plan.slug;
              return (
                <button
                  key={plan.slug}
                  type="button"
                  onClick={() => setSelectedPlanSlug(plan.slug)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500 text-white shadow-neon-cyan/20 shadow-md"
                      : "bg-[#0D1322] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">{plan.name}</span>
                      {plan.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-black text-cyan-400">{plan.priceFormatted}<span className="text-xs text-slate-400 font-normal"> / mês</span></div>
                    <span className="text-[11px] text-slate-400 block mt-1">{plan.tokens.toLocaleString("pt-BR")} Tokens</span>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1">
                    {plan.features.slice(0, 2).map((feat, i) => (
                      <div key={i} className="text-[10px] text-slate-300 flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Consumo Atual da Conta */}
          {user && (
            <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Uso de Tokens no Ciclo Atual</span>
                <span className="font-mono text-white">
                  {(user?.tokensUsed || 0).toLocaleString("pt-BR")} / {(user?.tokenQuota || 0).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((user?.tokensUsed || 0) / (user?.tokenQuota || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Gateway de Pagamento Pix / Cartão (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              2. Checkout Seguro
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              CRIPTOGRAFIA 256-BIT
            </span>
          </div>

          <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-5">
            {/* Resumo do Plano */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">PLANO SELECIONADO</span>
                <div className="text-sm font-black text-white">{currentPlanObj.name}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-cyan-400">{currentPlanObj.priceFormatted}</div>
                <span className="text-[10px] text-slate-500">Cobrança Mensal</span>
              </div>
            </div>

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
                <div className="w-40 h-40 mx-auto bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center">
                  {/* Mock visual do QR Code */}
                  <div className="w-full h-full bg-slate-950 rounded-xl p-2 flex flex-col items-center justify-center text-white space-y-1">
                    <QrCode className="w-16 h-16 text-cyan-400" />
                    <span className="text-[9px] font-mono text-cyan-300">QR CODE PIX ATIVO</span>
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
                      {copiedPix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
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

            {/* Botão de Confirmação via Webhook */}
            <button
              type="button"
              onClick={handleSimulatePaymentWebhook}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 hover:opacity-90 text-slate-950 font-black text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando Webhook Financeiro...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Pagamento via Webhook Oficial
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              O evento é disparado via HTTPS com assinatura HMAC SHA-256 e validação de idempotência no banco de dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-cyan-400">Carregando faturamento...</div>}>
      <BillingContent />
    </Suspense>
  );
}
