"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Key,
  Layers,
  Power,
  RefreshCw,
  Server,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
  BarChart2,
  ExternalLink,
  Sliders,
  ChevronDown,
} from "lucide-react";

interface ProviderCard {
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  avatar: string;
  status: "ONLINE" | "OFFLINE" | "INVALID_KEY" | "EXPIRED" | "RATE_LIMIT";
  statusLabel: string;
  health: {
    lastTestedAt: string;
    latencyMs: number;
    httpStatus: number;
    availability: number;
    errorMessage?: string | null;
  };
  consumption: {
    tokensUsedMonth: number;
    tokenLimitMonthly: number;
    tokensRemaining: number;
    percentageConsumed: number;
  };
  costs: {
    estimatedCostUsd: number;
    estimatedCostBrl: number;
    costByModel: Record<string, { tokens: number; costUsd: number; costBrl: number }>;
  };
  models: {
    available: string[];
    active: string[];
    primary: string;
  };
  keys: Array<{
    id: string;
    name: string;
    keyHint: string;
    status: string;
    priority: number;
    tokensUsedMonth: number;
    tokenLimitMonthly: number;
    customBaseUrl?: string | null;
    lastUsedAt?: string | null;
  }>;
}

interface OperationalAlert {
  id: string;
  type: "EXPIRED_KEY" | "NEAR_LIMIT" | "API_ERROR" | "HIGH_LATENCY";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  provider: string;
  targetId?: string;
  timestamp: string;
}

interface UsageLogItem {
  id: string;
  user: { name: string; email: string } | null;
  provider: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  cost: number;
  costBrl: number;
  latencyMs: number;
  statusCode: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface ChartItem {
  date: string;
  openai: number;
  anthropic: number;
  google: number;
  mirai: number;
  costUsd: number;
  costBrl: number;
  avgLatency: number;
}

export default function AiMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [recentLogs, setRecentLogs] = useState<UsageLogItem[]>([]);
  const [chartData, setChartData] = useState<ChartItem[]>([]);

  // Filtros de logs
  const [logFilterProvider, setLogFilterProvider] = useState<string>("ALL");

  // Modal de Chave
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyModalProvider, setKeyModalProvider] = useState<string>("");
  const [keyModalKeyId, setKeyModalKeyId] = useState<string | null>(null);
  const [keyInputValue, setKeyInputValue] = useState("");
  const [keyInputBaseUrl, setKeyInputBaseUrl] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-monitor");
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
        setProviders(data.providers || []);
        setAlerts(data.alerts || []);
        setRecentLogs(data.recentLogs || []);
        setChartData(data.chartData || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do AI Monitor:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh a cada 30 segundos
    return () => clearInterval(interval);
  }, [fetchData]);

  // Testar conexão de todos os provedores
  const handleTestAll = async () => {
    setTestingAll(true);
    try {
      const res = await fetch("/api/admin/ai-monitor/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerSlug: "all" }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Erro ao testar provedores:", err);
    } finally {
      setTestingAll(false);
    }
  };

  // Testar provedor específico
  const handleTestSingleProvider = async (slug: string) => {
    setTestingProvider(slug);
    try {
      await fetch("/api/admin/ai-monitor/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerSlug: slug }),
      });
      await fetchData();
    } catch (err) {
      console.error(`Erro ao testar ${slug}:`, err);
    } finally {
      setTestingProvider(null);
    }
  };

  // Alternar ativação de chave
  const handleToggleKey = async (keyId: string) => {
    try {
      const res = await fetch("/api/admin/ai-monitor/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", keyId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Erro ao alternar status da chave:", err);
    }
  };

  // Abrir modal para substituir chave
  const handleOpenReplaceKey = (providerSlug: string, keyId?: string) => {
    setKeyModalProvider(providerSlug);
    setKeyModalKeyId(keyId || null);
    setKeyInputValue("");
    setKeyInputBaseUrl("");
    setKeyFeedback(null);
    setKeyModalOpen(true);
  };

  // Salvar substituição de chave
  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInputValue.trim()) return;

    setKeySaving(true);
    setKeyFeedback(null);

    try {
      const payload: any = {
        action: keyModalKeyId ? "replace" : "create",
        keyId: keyModalKeyId,
        newKey: keyInputValue.trim(),
        providerSlug: keyModalProvider,
        customBaseUrl: keyInputBaseUrl.trim() || undefined,
      };

      const res = await fetch("/api/admin/ai-monitor/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setKeyFeedback(`✓ ${data.message}`);
        setTimeout(() => {
          setKeyModalOpen(false);
          fetchData();
        }, 1200);
      } else {
        setKeyFeedback(`❌ ${data.error || data.message || "Falha ao salvar chave."}`);
      }
    } catch (err: any) {
      setKeyFeedback(`❌ Erro: ${err.message}`);
    } finally {
      setKeySaving(false);
    }
  };

  const getStatusBadge = (status: ProviderCard["status"]) => {
    switch (status) {
      case "ONLINE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        );
      case "OFFLINE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Offline
          </span>
        );
      case "INVALID_KEY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Chave Inválida
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Expirada
          </span>
        );
      case "RATE_LIMIT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            Rate Limit (429)
          </span>
        );
      default:
        return null;
    }
  };

  const filteredLogs = recentLogs.filter((log) => {
    if (logFilterProvider === "ALL") return true;
    return log.provider.toLowerCase() === logFilterProvider.toLowerCase();
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-neon-cyan">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                AI MONITOR
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  OBSERVABILITY
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Central de Observabilidade em Tempo Real, Saúde de Provedores, Quotas e Custos (USD & BRL).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/ai-keys"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 shadow-neon-amber transition-all"
            title="Acessar Gerenciador de Quotas e Créditos de APIs"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Quota Manager</span>
          </Link>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-white transition-all disabled:opacity-50"
            title="Atualizar dados agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            Atualizar
          </button>

          <button
            onClick={handleTestAll}
            disabled={testingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/40 shadow-neon-cyan transition-all disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${testingAll ? "animate-pulse" : ""}`} />
            {testingAll ? "Diagnosticando..." : "Executar Diagnóstico Geral"}
          </button>
        </div>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tokens Totais */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Tokens Utilizados</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {overview?.totalTokensUsed?.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-1 flex items-center gap-1 font-mono">
            <span>Consumo mensal acumulado</span>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all pointer-events-none"></div>
        </div>

        {/* Custo Total USD & BRL */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-emerald-500/20 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Custo Total Estimado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline gap-2">
            <span>${overview?.totalCostUsd?.toFixed(2) || "0.00"}</span>
            <span className="text-sm font-semibold text-emerald-400">
              (R$ {overview?.totalCostBrl?.toFixed(2) || "0.00"})
            </span>
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1 font-mono">
            <span>Câmbio: R$ 5,65 / USD</span>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none"></div>
        </div>

        {/* Disponibilidade Geral */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-blue-500/20 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Disponibilidade Global</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {overview?.overallAvailability ?? 100.0}%
          </div>
          <div className="text-[11px] text-blue-400/80 mt-1 flex items-center gap-1 font-mono">
            <span>Uptime médio das APIs</span>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none"></div>
        </div>

        {/* Provedores Ativos */}
        <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-purple-500/20 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Provedores Online</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1.5">
            <span>{overview?.activeProvidersCount ?? 0}</span>
            <span className="text-slate-400 text-sm font-normal">/ {overview?.totalProvidersCount ?? 4}</span>
          </div>
          <div className="text-[11px] text-purple-400/80 mt-1 flex items-center gap-1 font-mono">
            <span>{overview?.activeKeysCount ?? 0} chaves ativas monitoradas</span>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all pointer-events-none"></div>
        </div>
      </div>

      {/* ALERTAS OPERACIONAIS */}
      {alerts.length > 0 ? (
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Alertas Operacionais ({alerts.length})</span>
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
                    {new Date(alert.timestamp).toLocaleTimeString("pt-BR")} — Provedor: {alert.provider}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Sistema 100% Saudável: Nenhum erro crítico, chave expirada ou rate limit detectado.</span>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL: CARDS POR PROVEDOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Ecossistemas Monitorados
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {providers.length} instâncias configuradas
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((p) => {
            const isTestingThis = testingProvider === p.slug;

            return (
              <div
                key={p.slug}
                className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      {p.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-white text-base tracking-tight">{p.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                          {p.categoryLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(p.status)}
                    <button
                      onClick={() => handleTestSingleProvider(p.slug)}
                      disabled={isTestingThis}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-cyan-500/40 transition-all"
                      title="Testar Conexão Agora"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingThis ? "animate-spin text-cyan-400" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Grid 4 Colunas de Métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#05070D] border border-slate-800/80 text-xs">
                  {/* Saúde: Latência */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Latência</div>
                    <div className="font-mono font-bold text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {p.health.latencyMs} ms
                    </div>
                    <div className="text-[10px] text-slate-400">
                      HTTP {p.health.httpStatus}
                    </div>
                  </div>

                  {/* Saúde: Uptime */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Uptime</div>
                    <div className="font-mono font-bold text-white flex items-center gap-1">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      {p.health.availability}%
                    </div>
                    <div className="text-[10px] text-slate-400">Disponibilidade</div>
                  </div>

                  {/* Consumo: Tokens */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Consumo</div>
                    <div className="font-mono font-bold text-white">
                      {p.consumption.tokensUsedMonth > 1000000
                        ? `${(p.consumption.tokensUsedMonth / 1000000).toFixed(1)}M`
                        : `${(p.consumption.tokensUsedMonth / 1000).toFixed(1)}k`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {p.consumption.percentageConsumed}% da quota
                    </div>
                  </div>

                  {/* Custos: Estimativa */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Custo Est.</div>
                    <div className="font-mono font-bold text-emerald-400">
                      ${p.costs.estimatedCostUsd.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      R$ {p.costs.estimatedCostBrl.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso de Quota */}
                {p.consumption.tokenLimitMonthly > 0 && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Uso da Quota Mensal</span>
                      <span>
                        {p.consumption.tokensUsedMonth.toLocaleString()} / {p.consumption.tokenLimitMonthly.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          p.consumption.percentageConsumed >= 90
                            ? "bg-rose-500"
                            : p.consumption.percentageConsumed >= 70
                            ? "bg-amber-500"
                            : "bg-cyan-500"
                        }`}
                        style={{ width: `${Math.min(100, p.consumption.percentageConsumed)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Modelos Disponíveis e Ativos */}
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400 uppercase font-mono tracking-wider flex items-center justify-between">
                    <span>Modelos do Provedor</span>
                    <span className="text-cyan-400 font-bold">Principal: {p.models.primary}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.models.active.map((modelName) => (
                      <span
                        key={modelName}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-mono border ${
                          modelName.toLowerCase().includes(p.models.primary.toLowerCase()) ||
                          p.models.primary.toLowerCase().includes(modelName.toLowerCase())
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                            : "bg-slate-900 text-slate-300 border-slate-800"
                        }`}
                      >
                        {modelName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Chaves de API Associadas */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Key className="w-3 h-3 text-cyan-400" />
                      Chaves ({p.keys.length})
                    </span>
                    <button
                      onClick={() => handleOpenReplaceKey(p.slug)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                    >
                      + Adicionar / Substituir
                    </button>
                  </div>

                  {p.keys.length > 0 ? (
                    <div className="space-y-1.5">
                      {p.keys.map((k) => (
                        <div
                          key={k.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#05070D] border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{k.name}</span>
                            <span className="font-mono text-slate-400 text-[11px]">{k.keyHint}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                k.status === "ACTIVE"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : k.status === "DISABLED"
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-rose-500/20 text-rose-400"
                              }`}
                            >
                              {k.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleKey(k.id)}
                              className={`p-1 rounded text-[10px] font-bold ${
                                k.status === "DISABLED"
                                  ? "text-emerald-400 hover:bg-emerald-500/10"
                                  : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              }`}
                              title={k.status === "DISABLED" ? "Ativar chave" : "Desativar chave"}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenReplaceKey(p.slug, k.id)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20"
                            >
                              Substituir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 text-slate-400 text-[11px] text-center italic">
                      Nenhuma chave cadastrada no banco. Utilizando credenciais de ambiente ou simulador resiliente.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRÁFICOS & INDICADORES VISUAIS */}
      {chartData.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Consumo de Tokens por Provedor (Últimos 7 Dias)
            </h3>
            <span className="text-xs text-slate-400 font-mono">Agregação diária</span>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-4">
            {chartData.map((day) => {
              const total = day.openai + day.anthropic + day.google + day.mirai;
              const maxTokens = Math.max(...chartData.map((d) => d.openai + d.anthropic + d.google + d.mirai), 100);
              const heightPercent = Math.min(100, Math.max(15, Math.round((total / maxTokens) * 100)));

              return (
                <div key={day.date} className="flex flex-col items-center gap-2">
                  <div className="text-[10px] text-slate-400 font-mono">${day.costUsd.toFixed(2)}</div>
                  <div className="w-full h-32 bg-slate-900 rounded-xl p-1 flex flex-col justify-end">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-cyan-600 to-blue-500 hover:brightness-110 transition-all cursor-pointer relative group"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black/90 text-white text-[9px] font-mono p-1 rounded border border-cyan-500/40 whitespace-nowrap z-10">
                        {total.toLocaleString()} tokens
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 font-mono">{day.date}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TABELA DE HISTÓRICO EM TEMPO REAL (AI_USAGE_LOGS) */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Histórico de Requisições em Tempo Real (ai_usage_logs)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Últimas 50 invocações processadas pela inteligência.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filtrar:</span>
            <select
              value={logFilterProvider}
              onChange={(e) => setLogFilterProvider(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Provedores</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="mirai">Mirai API</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase font-mono text-slate-400">
                <th className="pb-3 font-semibold">Data / Hora</th>
                <th className="pb-3 font-semibold">Usuário</th>
                <th className="pb-3 font-semibold">Provedor</th>
                <th className="pb-3 font-semibold">Modelo</th>
                <th className="pb-3 font-semibold text-right">Tokens In / Out</th>
                <th className="pb-3 font-semibold text-right">Custo USD (BRL)</th>
                <th className="pb-3 font-semibold text-right">Latência</th>
                <th className="pb-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 font-mono">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 text-slate-400">
                      {new Date(log.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 text-slate-300 font-sans">
                      {log.user ? log.user.name : <span className="text-slate-400 italic">Sistema</span>}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700">
                        {log.provider}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-200">{log.model}</td>
                    <td className="py-2.5 text-right text-slate-300">
                      {log.tokensInput} / {log.tokensOutput}
                    </td>
                    <td className="py-2.5 text-right text-emerald-400">
                      ${log.cost.toFixed(4)}{" "}
                      <span className="text-[10px] text-slate-400">(R$ {log.costBrl.toFixed(2)})</span>
                    </td>
                    <td className="py-2.5 text-right text-slate-300">{log.latencyMs} ms</td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : log.status === "FALLBACK"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SUBSTITUIR / ADICIONAR CHAVE */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#0A0E1A] border border-cyan-500/30 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">
                  {keyModalKeyId ? "Substituir Chave de API" : "Cadastrar Nova Chave"}
                </h3>
              </div>
              <button
                onClick={() => setKeyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Provedor
                </label>
                <input
                  type="text"
                  value={keyModalProvider.toUpperCase()}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Valor da Chave de API (Secret Key)
                </label>
                <input
                  type="password"
                  placeholder="sk-..., AIzaSy..., etc."
                  value={keyInputValue}
                  onChange={(e) => setKeyInputValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs font-mono text-white placeholder-slate-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  A chave é criptografada com AES-256-GCM antes de ser armazenada no banco.
                </p>
              </div>

              {keyModalProvider.includes("mirai") ||
              keyModalProvider.includes("openrouter") ||
              keyModalProvider.includes("azure") ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Custom Base URL (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.mirai.orvexa.digital/v1"
                    value={keyInputBaseUrl}
                    onChange={(e) => setKeyInputBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs font-mono text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
              ) : null}

              {keyFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono ${
                    keyFeedback.startsWith("✓")
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {keyFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={keySaving || !keyInputValue.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/40 shadow-neon-cyan transition-all disabled:opacity-50"
                >
                  {keySaving ? "Validando e Salvando..." : "Testar e Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

