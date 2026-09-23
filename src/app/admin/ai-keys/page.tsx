"use client";

import { useEffect, useState, useCallback } from "react";
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
  Power,
  Trash2,
  Edit3,
  Layers,
  Activity,
  Server,
  Zap,
  Cpu,
  ShieldAlert,
} from "lucide-react";
import { SUPPORTED_KEY_PROVIDERS } from "@/ai/keys/constants";

interface KeyContract {
  id: string;
  provider: string;
  providerName: string;
  providerAvatar: string;
  name: string;
  keyHint: string;
  status: "ACTIVE" | "WARNING_80" | "WARNING_90" | "EXPIRED" | "INVALID_KEY" | "DISABLED" | "RATE_LIMITED";
  statusLabel: string;
  limits: {
    tokenLimit: number;
    monthlyLimit: number;
    dailyLimit: number;
    initialBalance: number;
    renewalDate: string | null;
    expirationDate: string | null;
  };
  consumption: {
    tokensUsed: number;
    tokensRemaining: number;
    percentageConsumed: number;
    costAccumulatedUsd: number;
    costAccumulatedBrl: number;
  };
  validity: {
    createdAt: string;
    expirationDate: string | null;
    daysRemaining: number | null;
    isExpiringSoon: boolean;
    isExpired: boolean;
  };
  diagnostics: {
    lastTestedAt: string | null;
    lastLatencyMs: number;
    detectedModels: string[];
  };
}

interface ContractAlert {
  id: string;
  keyId: string;
  provider: string;
  keyName: string;
  type: "EXPIRES_IN_7_DAYS" | "CONSUMPTION_OVER_80" | "CONSUMPTION_OVER_90" | "INVALID_KEY";
  severity: "CRITICAL" | "WARNING";
  title: string;
  message: string;
  timestamp: string;
}

export default function AiKeysManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keys, setKeys] = useState<KeyContract[]>([]);
  const [alerts, setAlerts] = useState<ContractAlert[]>([]);
  const [totals, setTotals] = useState<any>(null);

  // Filtros
  const [filterProvider, setFilterProvider] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Estado de teste de conexão
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResultFeedback, setTestResultFeedback] = useState<Record<string, any>>({});

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: "openai",
    name: "",
    rawKey: "",
    customBaseUrl: "",
    tokenLimit: 1000000,
    monthlyLimit: 500000,
    dailyLimit: 25000,
    initialBalance: 1000000,
    renewalDate: "",
    expirationDate: "",
    status: "ACTIVE",
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setAlerts(data.alerts || []);
        setTotals(data.totals || null);
      }
    } catch (err) {
      console.error("Erro ao carregar contratos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Testar Conexão da Chave (🧪 Testar conexão)
  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await fetch(`/api/admin/ai-keys/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResultFeedback((prev) => ({
        ...prev,
        [id]: data,
      }));
      await fetchData();
    } catch (err: any) {
      setTestResultFeedback((prev) => ({
        ...prev,
        [id]: { success: false, message: err.message },
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  // Alternar ativação de chave
  const handleToggleStatus = async (contract: KeyContract) => {
    const newStatus = contract.status === "DISABLED" ? "ACTIVE" : "DISABLED";
    try {
      await fetch(`/api/admin/ai-keys/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchData();
    } catch (err) {
      console.error("Erro ao alternar status:", err);
    }
  };

  // Excluir chave de contrato
  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o contrato "${name}"?`)) return;

    try {
      await fetch(`/api/admin/ai-keys/${id}`, {
        method: "DELETE",
      });
      await fetchData();
    } catch (err) {
      console.error("Erro ao excluir contrato:", err);
    }
  };

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingId(null);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    setFormData({
      provider: "openai",
      name: "OpenAI Primary Contract",
      rawKey: "",
      customBaseUrl: "",
      tokenLimit: 1000000,
      monthlyLimit: 500000,
      dailyLimit: 25000,
      initialBalance: 1000000,
      renewalDate: thirtyDaysFromNow,
      expirationDate: ninetyDaysFromNow,
      status: "ACTIVE",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Abrir modal de edição
  const handleOpenEditModal = (contract: KeyContract) => {
    setEditingId(contract.id);
    setFormData({
      provider: contract.provider,
      name: contract.name,
      rawKey: "",
      customBaseUrl: "",
      tokenLimit: contract.limits.tokenLimit,
      monthlyLimit: contract.limits.monthlyLimit,
      dailyLimit: contract.limits.dailyLimit,
      initialBalance: contract.limits.initialBalance,
      renewalDate: contract.limits.renewalDate ? contract.limits.renewalDate.split("T")[0] : "",
      expirationDate: contract.limits.expirationDate ? contract.limits.expirationDate.split("T")[0] : "",
      status: contract.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Salvar formulário
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Informe o nome de identificação do contrato.");
      return;
    }
    if (!editingId && !formData.rawKey.trim()) {
      setFormError("A chave secreta da API é obrigatória no cadastro inicial.");
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      const payload: any = {
        ...formData,
        id: editingId || undefined,
        rawKey: formData.rawKey.trim() || undefined,
        customBaseUrl: formData.customBaseUrl.trim() || undefined,
        tokenLimit: Number(formData.tokenLimit),
        monthlyLimit: Number(formData.monthlyLimit),
        dailyLimit: Number(formData.dailyLimit),
        initialBalance: Number(formData.initialBalance),
        renewalDate: formData.renewalDate ? new Date(formData.renewalDate).toISOString() : null,
        expirationDate: formData.expirationDate ? new Date(formData.expirationDate).toISOString() : null,
      };

      const res = await fetch("/api/admin/ai-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setModalOpen(false);
        await fetchData();
      } else {
        setFormError(data.error || "Erro ao salvar contrato.");
      }
    } catch (err: any) {
      setFormError(`Erro: ${err.message}`);
    } finally {
      setFormSaving(false);
    }
  };

  const getStatusBadge = (status: KeyContract["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Ativa
          </span>
        );
      case "WARNING_80":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-2.5 h-2.5" />
            Consumo &gt; 80%
          </span>
        );
      case "WARNING_90":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-2.5 h-2.5" />
            Consumo &gt; 90%
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-2.5 h-2.5" />
            Expirada
          </span>
        );
      case "INVALID_KEY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-2.5 h-2.5" />
            Chave Inválida
          </span>
        );
      case "DISABLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Desativada
          </span>
        );
      case "RATE_LIMITED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            Rate Limit (429)
          </span>
        );
      default:
        return null;
    }
  };

  const filteredKeys = keys.filter((k) => {
    if (filterProvider !== "ALL" && k.provider !== filterProvider) return false;
    if (filterStatus !== "ALL" && k.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-neon-cyan">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              AI KEY MANAGEMENT
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                CONTRATOS & LIMITES
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Controle de contratos, limites de tokens, créditos, validade e consumo real das chaves de IA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            Atualizar
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/40 shadow-neon-cyan transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Contrato de Chave
          </button>
        </div>
      </div>

      {/* TOP RESUMO METRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contratado */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Tokens Contratados</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {totals?.totalTokensContracted ? totals.totalTokensContracted.toLocaleString() : "0"}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-1 font-mono">
            {totals?.totalContracts || 0} contratos registrados
          </div>
        </div>

        {/* Consumo Real */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-blue-500/20 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Consumo Real</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {totals?.totalTokensConsumed ? totals.totalTokensConsumed.toLocaleString() : "0"}
          </div>
          <div className="text-[11px] text-blue-400/80 mt-1 font-mono">
            Integrado à tabela ai_usage_logs
          </div>
        </div>

        {/* Tokens Restantes */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Tokens Restantes</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {totals?.totalTokensRemaining ? totals.totalTokensRemaining.toLocaleString() : "0"}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">
            Saldo acumulado disponível
          </div>
        </div>

        {/* Custo Total */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-purple-500/20 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Custo Acumulado</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1.5">
            <span>${totals?.totalCostUsd?.toFixed(2) || "0.00"}</span>
            <span className="text-xs text-purple-400 font-semibold">
              (R$ {totals?.totalCostBrl?.toFixed(2) || "0.00"})
            </span>
          </div>
          <div className="text-[11px] text-purple-400/80 mt-1 font-mono">
            Câmbio: R$ 5,65 / USD
          </div>
        </div>
      </div>

      {/* BANNER DE ALERTAS PREDITIVOS (7 DIAS, 80%, 90%, CHAVE INVÁLIDA) */}
      {alerts.length > 0 ? (
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Alertas de Contratos & Chaves ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs"
              >
                <div className="mt-0.5 shrink-0">
                  {alert.severity === "CRITICAL" ? (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-slate-200">{alert.title}</div>
                  <div className="text-slate-400 leading-relaxed">{alert.message}</div>
                  <div className="text-[10px] text-slate-400 font-mono pt-1">
                    Contrato: {alert.keyName} | Provedor: {alert.provider}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Todos os contratos e chaves dentro dos limites operacionais. Nenhuma expiração próxima.</span>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0A0E1A] border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold">Provedor:</span>
          {["ALL", ...SUPPORTED_KEY_PROVIDERS.map((p) => p.slug)].map((slug) => {
            const label = slug === "ALL" ? "Todos" : SUPPORTED_KEY_PROVIDERS.find((p) => p.slug === slug)?.name;
            return (
              <button
                key={slug}
                onClick={() => setFilterProvider(slug)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterProvider === slug
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="WARNING_80">Consumo &gt; 80%</option>
            <option value="WARNING_90">Consumo &gt; 90%</option>
            <option value="EXPIRED">Expirada</option>
            <option value="INVALID_KEY">Chave Inválida</option>
            <option value="DISABLED">Desativada</option>
          </select>
        </div>
      </div>

      {/* GRID DE CARDS DOS PROVEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredKeys.length > 0 ? (
          filteredKeys.map((k) => {
            const isTesting = testingKeyId === k.id;
            const feedback = testResultFeedback[k.id];

            return (
              <div
                key={k.id}
                className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-6"
              >
                {/* 1. IDENTIFICAÇÃO */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      {k.providerAvatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-white text-base tracking-tight">{k.name}</h3>
                        {getStatusBadge(k.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-semibold text-cyan-400">{k.providerName}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{k.keyHint}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(k)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        k.status === "DISABLED"
                          ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400"
                          : "bg-slate-900 border-slate-800 text-emerald-400 hover:text-rose-400"
                      }`}
                      title={k.status === "DISABLED" ? "Ativar chave" : "Desativar chave"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(k)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all"
                      title="Editar limites do contrato"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteKey(k.id, k.name)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-all"
                      title="Excluir contrato"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. LIMITES DA API (Campos configuráveis) */}
                <div className="p-3.5 rounded-xl bg-[#05070D] border border-slate-800/80 space-y-2 text-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    Limites Contratuais
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400">Total Contratado</div>
                      <div className="font-bold text-white">
                        {k.limits.tokenLimit > 0 ? k.limits.tokenLimit.toLocaleString() : "Ilimitado"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Limite Mensal</div>
                      <div className="font-bold text-white">
                        {k.limits.monthlyLimit > 0 ? k.limits.monthlyLimit.toLocaleString() : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Limite Diário</div>
                      <div className="font-bold text-white">
                        {k.limits.dailyLimit > 0 ? k.limits.dailyLimit.toLocaleString() : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Saldo Inicial</div>
                      <div className="font-bold text-white">
                        {k.limits.initialBalance > 0 ? k.limits.initialBalance.toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. CONSUMO (Tokens consumidos, restantes, % utilizado, custo acumulado) */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Consumo Real Acumulado</span>
                    <span className="font-bold text-white">
                      {k.consumption.tokensUsed.toLocaleString()} /{" "}
                      {k.limits.tokenLimit > 0 ? k.limits.tokenLimit.toLocaleString() : "Ilimitado"}
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        k.consumption.percentageConsumed >= 90
                          ? "bg-rose-500"
                          : k.consumption.percentageConsumed >= 80
                          ? "bg-amber-500"
                          : "bg-cyan-500"
                      }`}
                      style={{ width: `${Math.min(100, k.consumption.percentageConsumed)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
                    <div>
                      Tokens Restantes:{" "}
                      <span className="text-emerald-400 font-bold">
                        {k.consumption.tokensRemaining.toLocaleString()}
                      </span>{" "}
                      ({k.consumption.percentageConsumed}% usado)
                    </div>
                    <div>
                      Custo:{" "}
                      <span className="text-emerald-400 font-bold">
                        ${k.consumption.costAccumulatedUsd.toFixed(2)}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">
                        (R$ {k.consumption.costAccumulatedBrl.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. VALIDADE (Data criação, expiração, dias restantes) */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#05070D] border border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Criada: {new Date(k.validity.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>

                  {k.validity.expirationDate ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">
                        Expira: {new Date(k.validity.expirationDate).toLocaleDateString("pt-BR")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          k.validity.isExpired
                            ? "bg-rose-500/20 text-rose-400"
                            : k.validity.isExpiringSoon
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {k.validity.isExpired
                          ? "Expirada"
                          : `${k.validity.daysRemaining} dias restantes`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Sem expiração definida</span>
                  )}
                </div>

                {/* 7. TESTE DA CHAVE (Botão: 🧪 Testar conexão) */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-400 font-mono">
                      {k.diagnostics.lastTestedAt ? (
                        <span>
                          Último teste: {new Date(k.diagnostics.lastTestedAt).toLocaleTimeString("pt-BR")} (
                          {k.diagnostics.lastLatencyMs}ms)
                        </span>
                      ) : (
                        <span>Não testado recentemente</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleTestKey(k.id)}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all disabled:opacity-50"
                    >
                      <span className="text-sm">🧪</span>
                      <span>{isTesting ? "Testando..." : "Testar conexão"}</span>
                    </button>
                  </div>

                  {/* Feedback do Teste */}
                  {feedback && (
                    <div
                      className={`p-3 rounded-xl text-xs font-mono space-y-1 ${
                        feedback.success
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{feedback.success ? "✓ Conexão bem-sucedida" : "❌ Falha na conexão"}</span>
                        <span>{feedback.latencyMs} ms</span>
                      </div>
                      <div className="text-[11px] text-slate-300">{feedback.message}</div>
                      {feedback.detectedModels?.length > 0 && (
                        <div className="text-[10px] text-cyan-400/80 pt-1">
                          Modelos disponíveis: {feedback.detectedModels.slice(0, 4).join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-12 text-center text-slate-400 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-3">
            <Key className="w-10 h-10 text-cyan-500/40 mx-auto" />
            <div className="font-bold text-white text-base">Nenhum contrato de chave encontrado</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cadastre contratos com OpenAI, Mirai API, Anthropic, Gemini, OpenRouter ou Azure para controlar quotas,
              custos e prazos de validade.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Contrato
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-[#0A0E1A] border border-cyan-500/30 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">
                  {editingId ? "Editar Limites do Contrato" : "Novo Contrato de Chave de IA"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Provedor
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white focus:outline-none"
                  >
                    {SUPPORTED_KEY_PROVIDERS.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.avatar} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nome de Identificação
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: OpenAI Contrato Anual 2026"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Chave Secreta da API (Secret Key) {editingId && <span className="text-slate-400 lowercase">(deixe em branco para manter)</span>}
                </label>
                <input
                  type="password"
                  placeholder={editingId ? "••••••••••••••••••••••••" : "sk-..., AIzaSy..., etc."}
                  value={formData.rawKey}
                  onChange={(e) => setFormData({ ...formData, rawKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs font-mono text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {(formData.provider === "mirai" ||
                formData.provider === "openrouter" ||
                formData.provider === "azure") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Custom Base URL (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.mirai.orvexa.digital/v1"
                    value={formData.customBaseUrl}
                    onChange={(e) => setFormData({ ...formData, customBaseUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs font-mono text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
              )}

              {/* LIMITES CONFIGURÁVEIS */}
              <div className="p-3.5 rounded-xl bg-[#05070D] border border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-cyan-400 uppercase font-mono tracking-wider">
                  Configuração de Limites & Quotas
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Total Contratado (Tokens)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.tokenLimit}
                      onChange={(e) => setFormData({ ...formData, tokenLimit: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Limite Mensal (Tokens)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.monthlyLimit}
                      onChange={(e) => setFormData({ ...formData, monthlyLimit: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Limite Diário (Tokens)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.dailyLimit}
                      onChange={(e) => setFormData({ ...formData, dailyLimit: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Saldo Inicial (Tokens / Crédito)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialBalance}
                      onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* DATAS DE VALIDADE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Data de Renovação
                  </label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Data de Expiração
                  </label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/40 shadow-neon-cyan transition-all disabled:opacity-50"
                >
                  {formSaving ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Contrato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
