"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Key,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Activity,
  Zap,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Percent,
  Sparkles,
  Server,
  ArrowRight,
  Filter,
} from "lucide-react";
import { QUOTA_SUPPORTED_PROVIDERS, USD_TO_BRL_RATE } from "@/ai/quota/constants";

interface QuotaAccountItem {
  id: string;
  provider: string;
  providerName: string;
  providerAvatar: string;
  providerColor: string;
  providerAccentHex: string;
  accountName: string;
  apiKeyMasked: string;
  status: "CONNECTED" | "INVALID" | "EXPIRED" | "LIMIT_REACHED";
  statusLabel: string;
  hasDirectBalanceApi: boolean;
  quota: {
    totalQuota: number;
    usedQuota: number;
    remainingQuota: number;
    percentageConsumed: number;
    quotaType: string;
  };
  validity: {
    createdAt: string;
    expirationDate: string | null;
    renewalDate: string | null;
    daysRemaining: number | null;
    isExpiringSoon: boolean;
    isExpired: boolean;
  };
  consumption: {
    todayTokens: number;
    monthTokens: number;
    estimatedCostUsd: number;
    estimatedCostBrl: number;
    projectedCostUsd: number;
    projectedCostBrl: number;
  };
  diagnostics: {
    lastSync: string;
    lastLatencyMs: number;
    detectedModels: string[];
  };
}

interface QuotaAlert {
  id: string;
  accountId: string;
  provider: string;
  accountName: string;
  type: "CONSUMPTION_OVER_80" | "CONSUMPTION_OVER_90" | "EXPIRES_IN_7_DAYS" | "INVALID_KEY" | "LIMIT_REACHED" | "EXPIRED";
  severity: "CRITICAL" | "WARNING";
  title: string;
  message: string;
  timestamp: string;
}

export default function AiQuotaManagerPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<QuotaAccountItem[]>([]);
  const [alerts, setAlerts] = useState<QuotaAlert[]>([]);
  const [totals, setTotals] = useState<any>(null);

  // Filtros
  const [filterProvider, setFilterProvider] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Estado de teste de conexão
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<Record<string, any>>({});

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: "mirai",
    accountName: "",
    rawKey: "",
    customBaseUrl: "",
    totalQuota: 5000000,
    quotaType: "TOKENS",
    expirationDate: "",
    renewalDate: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-keys");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setAlerts(data.alerts || []);
        setTotals(data.totals || null);
      }
    } catch (err) {
      console.error("[AiQuotaManagerPage Fetch Error]", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sincronizar Tudo (🔄 Sincronizar agora)
  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch("/api/admin/ai-keys/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) setAccounts(data.accounts);
        await fetchData();
      }
    } catch (err) {
      console.error("[Sync All Error]", err);
    } finally {
      setSyncingAll(false);
    }
  };

  // Sincronizar Individual
  const handleSyncIndividual = async (accountId: string) => {
    setSyncingId(accountId);
    try {
      const res = await fetch("/api/admin/ai-keys/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("[Sync Individual Error]", err);
    } finally {
      setSyncingId(null);
    }
  };

  // Testar Conexão da Conta
  const handleTestConnection = async (accountId: string) => {
    setTestingId(accountId);
    setTestFeedback((prev) => ({ ...prev, [accountId]: { loading: true } }));
    try {
      const res = await fetch(`/api/admin/ai-keys/${accountId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestFeedback((prev) => ({
        ...prev,
        [accountId]: {
          loading: false,
          success: data.success,
          status: data.status,
          latencyMs: data.latencyMs,
          detectedModels: data.detectedModels,
          message: data.message,
        },
      }));
      await fetchData();
    } catch (err: any) {
      setTestFeedback((prev) => ({
        ...prev,
        [accountId]: {
          loading: false,
          success: false,
          message: err.message || "Erro no teste de conexão.",
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  // Excluir Conta
  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta de quota?")) return;
    try {
      const res = await fetch(`/api/admin/ai-keys/${accountId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("[Delete Account Error]", err);
    }
  };

  // Abrir Modal de Criação / Edição
  const openModal = (account?: QuotaAccountItem) => {
    setFormFeedback(null);
    if (account) {
      setEditingId(account.id);
      setFormData({
        provider: account.provider,
        accountName: account.accountName,
        rawKey: "",
        customBaseUrl: "",
        totalQuota: account.quota.totalQuota,
        quotaType: account.quota.quotaType || "TOKENS",
        expirationDate: account.validity.expirationDate ? account.validity.expirationDate.slice(0, 10) : "",
        renewalDate: account.validity.renewalDate ? account.validity.renewalDate.slice(0, 10) : "",
      });
    } else {
      setEditingId(null);
      setFormData({
        provider: "mirai",
        accountName: "",
        rawKey: "",
        customBaseUrl: "",
        totalQuota: 5000000,
        quotaType: "TOKENS",
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
    }
    setModalOpen(true);
  };

  // Salvar Formulário
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setFormFeedback(null);

    try {
      const res = await fetch("/api/admin/ai-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          provider: formData.provider,
          accountName: formData.accountName,
          rawKey: formData.rawKey || undefined,
          totalQuota: Number(formData.totalQuota),
          quotaType: formData.quotaType,
          expirationDate: formData.expirationDate || null,
          renewalDate: formData.renewalDate || null,
          customBaseUrl: formData.customBaseUrl || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFormFeedback("✅ Conta salva e sincronizada com sucesso!");
        setTimeout(() => {
          setModalOpen(false);
          fetchData();
        }, 1000);
      } else {
        setFormFeedback(`❌ ${data.error || "Erro ao salvar conta."}`);
      }
    } catch (err: any) {
      setFormFeedback(`❌ Erro: ${err.message}`);
    } finally {
      setSavingAccount(false);
    }
  };

  // Filtros
  const filteredAccounts = accounts.filter((acc) => {
    if (filterProvider !== "ALL" && acc.provider !== filterProvider) return false;
    if (filterStatus !== "ALL" && acc.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: QuotaAccountItem["status"]) => {
    switch (status) {
      case "CONNECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Conectado
          </span>
        );
      case "INVALID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Chave Inválida
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Expirado
          </span>
        );
      case "LIMIT_REACHED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Limite Atingido (100%)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-neon-cyan">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                AI QUOTA MANAGER
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  QUOTA &amp; CRÉDITOS
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Controle em tempo real de contas contratadas, créditos, quotas de tokens, validade e projeções de consumo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/ai-monitor"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-neon-cyan transition-all"
            title="Acessar Observabilidade AI Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Monitor</span>
          </Link>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-white transition-all disabled:opacity-50"
            title="Atualizar dados da tela"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            Atualizar
          </button>

          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:brightness-110 border border-cyan-400/40 shadow-neon-cyan transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin" : ""}`} />
            <span>🔄 Sincronizar agora</span>
          </button>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-110 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE ALERTA SE HOUVER CRÍTICOS */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Alertas Operacionais de Quotas &amp; Contratos ({alerts.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 backdrop-blur-md transition-all ${
                  al.severity === "CRITICAL"
                    ? "bg-rose-950/20 border-rose-500/40 text-rose-200"
                    : "bg-amber-950/20 border-amber-500/40 text-amber-200"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${al.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold flex items-center justify-between">
                    <span>{al.title}</span>
                    <span className="font-mono text-[10px] opacity-70 uppercase">{al.provider}</span>
                  </div>
                  <p className="mt-0.5 opacity-90 leading-relaxed">{al.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARDS DE RESUMO GLOBAL */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0B132B]/60 border border-cyan-500/20 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>QUOTA TOTAL CONTRATADA</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-white mt-2">
              {(totals.totalQuotaTokens / 1_000_000).toFixed(1)}M{" "}
              <span className="text-xs font-normal text-slate-400">Tokens</span>
            </div>
            <div className="text-[11px] text-cyan-400 font-mono mt-1">
              {totals.totalAccounts} contas cadastradas
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B132B]/60 border border-emerald-500/20 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>CONSUMO ACUMULADO</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400 mt-2">
              {totals.overallPercentageUsed}%{" "}
              <span className="text-xs font-normal text-slate-400">
                ({(totals.totalUsedTokens / 1_000_000).toFixed(2)}M)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  totals.overallPercentageUsed >= 90
                    ? "bg-rose-500"
                    : totals.overallPercentageUsed >= 80
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, totals.overallPercentageUsed)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B132B]/60 border border-amber-500/20 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>SALDO RESTANTE</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-amber-300 mt-2">
              {(totals.totalRemainingTokens / 1_000_000).toFixed(2)}M
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Tokens disponíveis para roteamento
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B132B]/60 border border-cyan-500/20 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>CUSTO / PROJEÇÃO MENSAL</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-lg md:text-xl font-black text-white mt-2">
              ${totals.totalCostUsd.toFixed(2)}{" "}
              <span className="text-xs text-slate-400 font-normal">
                (R$ {totals.totalCostBrl.toFixed(2)})
              </span>
            </div>
            <div className="text-[11px] text-cyan-300 font-mono mt-1">
              Projeção: ${totals.totalProjectedUsd.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5" />
            Provedor:
          </span>
          {["ALL", "mirai", "openai", "anthropic", "google", "openrouter", "azure"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProvider(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterProvider === p
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              {p === "ALL" ? "Todos" : QUOTA_SUPPORTED_PROVIDERS[p]?.name || p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Status:</span>
          {["ALL", "CONNECTED", "LIMIT_REACHED", "EXPIRED", "INVALID"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === s
                  ? "bg-slate-700 text-white font-bold"
                  : "bg-slate-800/40 text-slate-400 hover:text-slate-200"
              }`}
            >
              {s === "ALL" ? "Todos" : s === "CONNECTED" ? "Conectado" : s === "LIMIT_REACHED" ? "Limite" : s === "EXPIRED" ? "Expirado" : "Inválido"}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE CARDS DOS PROVEDORES (VISUAL AI MONITOR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map((acc) => {
          const cfg = QUOTA_SUPPORTED_PROVIDERS[acc.provider];
          const testState = testFeedback[acc.id];
          const isSyncing = syncingId === acc.id || syncingAll;

          return (
            <div
              key={acc.id}
              className="rounded-2xl bg-[#090E1A] border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between overflow-hidden shadow-xl relative group"
            >
              {/* Header do Card */}
              <div className="p-5 border-b border-slate-800/80 bg-slate-900/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                      {acc.providerAvatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-white">{acc.providerName}</h3>
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{acc.accountName}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-cyan-400">{acc.apiKeyMasked}</span>
                      </div>
                    </div>
                  </div>

                  {getStatusBadge(acc.status)}
                </div>
              </div>

              {/* Corpo do Card com os 4 Blocos Requisitados */}
              <div className="p-5 space-y-4 flex-1 text-xs">
                {/* 1. CRÉDITOS / QUOTA */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-cyan-400" />
                      QUOTA &amp; TOKENS
                    </span>
                    <span className="font-bold text-white">
                      {acc.quota.percentageConsumed}% utilizado
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        acc.quota.percentageConsumed >= 90
                          ? "bg-rose-500"
                          : acc.quota.percentageConsumed >= 80
                          ? "bg-amber-400"
                          : "bg-gradient-to-r from-cyan-400 to-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, acc.quota.percentageConsumed)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                    <div>
                      <div className="text-slate-400 text-[10px]">Total</div>
                      <div className="font-bold text-slate-200">
                        {(acc.quota.totalQuota / 1_000_000).toFixed(1)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Consumido</div>
                      <div className="font-bold text-emerald-400">
                        {(acc.quota.usedQuota / 1_000_000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Restante</div>
                      <div className="font-bold text-amber-300">
                        {(acc.quota.remainingQuota / 1_000_000).toFixed(2)}M
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CONSUMO REAL & PROJEÇÃO */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                    <div className="text-slate-400 text-[10px]">Consumo Hoje</div>
                    <div className="font-bold text-cyan-300 mt-0.5">
                      {acc.consumption.todayTokens.toLocaleString("pt-BR")}{" "}
                      <span className="text-[9px] text-slate-400">tk</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Mês: {(acc.consumption.monthTokens / 1_000).toFixed(1)}k
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                    <div className="text-slate-400 text-[10px]">Custo Estimado</div>
                    <div className="font-bold text-white mt-0.5">
                      ${acc.consumption.estimatedCostUsd.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-cyan-400 mt-1">
                      Proj: ${acc.consumption.projectedCostUsd.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* 3. VALIDADE & DIAS RESTANTES */}
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      Expiração: {acc.validity.expirationDate ? new Date(acc.validity.expirationDate).toLocaleDateString("pt-BR") : "Indeterminada"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Renovação: {acc.validity.renewalDate ? new Date(acc.validity.renewalDate).toLocaleDateString("pt-BR") : "Automática"}
                    </div>
                  </div>

                  <div className="text-right">
                    {acc.validity.daysRemaining !== null ? (
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                          acc.validity.daysRemaining <= 0
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : acc.validity.daysRemaining <= 7
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                            : "bg-slate-800 text-slate-200"
                        }`}
                      >
                        {acc.validity.daysRemaining <= 0
                          ? "Expirado"
                          : `${acc.validity.daysRemaining} dias`}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Sem limite</span>
                    )}
                  </div>
                </div>

                {/* Feedback do Teste de Conexão */}
                {testState && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] font-mono animate-in fade-in ${
                      testState.loading
                        ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-300"
                        : testState.success
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {testState.loading ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                        Validando conexão e modelos disponíveis...
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>{testState.success ? "Conexão Validada" : "Falha na Conexão"}</span>
                          {testState.latencyMs && <span>{testState.latencyMs}ms</span>}
                        </div>
                        {testState.message && <div className="text-[10px] opacity-80">{testState.message}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rodapé de Ações do Card */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSyncIndividual(acc.id)}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all font-mono text-[11px] disabled:opacity-50"
                    title="Sincronizar saldo desta conta"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
                    Sincronizar
                  </button>

                  <button
                    onClick={() => handleTestConnection(acc.id)}
                    disabled={testingId === acc.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all font-mono text-[11px] disabled:opacity-50"
                  >
                    <Activity className={`w-3 h-3 ${testingId === acc.id ? "animate-pulse" : ""}`} />
                    Testar
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(acc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    title="Editar contrato"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all"
                    title="Excluir conta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-[#090E1A] border border-cyan-500/30 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                {editingId ? "Editar Conta de Quota" : "Cadastrar Nova Conta de API"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Provedor de IA *</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                    required
                  >
                    {Object.values(QUOTA_SUPPORTED_PROVIDERS).map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.avatar} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome da Conta / Contrato *</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Ex: Mirai Master Enterprise"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Chave de API (Secret Key) {editingId && <span className="text-slate-500 font-normal">(Deixe em branco para manter)</span>}
                </label>
                <input
                  type="password"
                  value={formData.rawKey}
                  onChange={(e) => setFormData({ ...formData, rawKey: e.target.value })}
                  placeholder={editingId ? "••••••••••••••••••••••••••••••••" : "sk-..."}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  🔒 Criptografia AES-256-GCM com isolamento seguro no banco de dados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Quota Contratada (Tokens) *</label>
                  <input
                    type="number"
                    value={formData.totalQuota}
                    onChange={(e) => setFormData({ ...formData, totalQuota: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Quota</label>
                  <select
                    value={formData.quotaType}
                    onChange={(e) => setFormData({ ...formData, quotaType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="TOKENS">Tokens Contratados</option>
                    <option value="CREDITS_USD">Créditos em Dólar (USD)</option>
                    <option value="UNLIMITED">Ilimitada / Pós-Pago</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Data de Expiração</label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Próxima Renovação</label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Base URL Customizada (Opcional - Mirai / Azure)
                </label>
                <input
                  type="text"
                  value={formData.customBaseUrl}
                  onChange={(e) => setFormData({ ...formData, customBaseUrl: e.target.value })}
                  placeholder="https://api.miraiapi.com/v1 ou endpoint Azure"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none font-mono text-xs"
                />
              </div>

              {formFeedback && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                  {formFeedback}
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 shadow-neon-glow transition-all disabled:opacity-50"
                >
                  {savingAccount ? "Salvando..." : editingId ? "Atualizar Conta" : "Cadastrar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
