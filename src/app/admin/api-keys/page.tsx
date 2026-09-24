"use client";

import { useEffect, useState } from "react";
import {
  Key,
  Plus,
  ShieldCheck,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Zap,
  Sparkles,
  Activity,
  Cpu,
  RotateCcw,
  DollarSign,
  BarChart3,
  Sliders,
  Check,
  Ban,
  Radio,
} from "lucide-react";

const DEFAULT_PROVIDERS = [
  { id: "1aba881a-cc61-48bf-97e9-636562cfc9aa", name: "OpenAI / Codex (Mirai)", slug: "openai" },
  { id: "22e4921d-155e-47a4-a110-9b67ea0aaf5a", name: "Anthropic Claude (Mirai)", slug: "anthropic" },
  { id: "5c20befe-ddaf-464c-85d7-9228b43f045d", name: "Google Gemini", slug: "google" },
];

const ALL_CAPABILITIES = [
  { id: "TEXTO", label: "Texto & Raciocínio", color: "border-cyan-500/30 bg-cyan-950/40 text-cyan-300" },
  { id: "CODIGO", label: "Código & Programação", color: "border-blue-500/30 bg-blue-950/40 text-blue-300" },
  { id: "DOCUMENTO", label: "Documentos & Arquivos", color: "border-purple-500/30 bg-purple-950/40 text-purple-300" },
  { id: "IMAGEM", label: "Geração & Edição Imagem", color: "border-pink-500/30 bg-pink-950/40 text-pink-300" },
  { id: "CRIACAO_SITES", label: "Criação de Sites & UI", color: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300" },
];

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>(DEFAULT_PROVIDERS);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [selectedProvider, setSelectedProvider] = useState("1aba881a-cc61-48bf-97e9-636562cfc9aa");
  const [name, setName] = useState("");
  const [rawApiKey, setRawApiKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [priority, setPriority] = useState(1);
  const [tokenLimit, setTokenLimit] = useState(0);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([
    "TEXTO",
    "CODIGO",
    "DOCUMENTO",
  ]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Reconhecimento Automático & Teste em Tempo Real
  const [autoDetected, setAutoDetected] = useState<{
    providerSlug: string;
    providerName: string;
    suggestedName: string;
    suggestedUrl: string;
    models: string[];
    suggestedCaps: string[];
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    models?: string[];
    message?: string;
  } | null>(null);
  const [testingKey, setTestingKey] = useState(false);
  const [testingRowId, setTestingRowId] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/api-keys");
      const data = await res.json();
      if (res.ok) {
        setKeys(data.keys || []);
        setProviders(data.providers || []);
        if (data.providers?.length > 0 && !selectedProvider) {
          setSelectedProvider(data.providers[0].id);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleKeyInput = (val: string) => {
    setRawApiKey(val);
    setTestResult(null);
    const trimmed = val.trim();
    if (!trimmed) {
      setAutoDetected(null);
      return;
    }

    let detectedSlug = "";
    let providerName = "";
    let suggestedName = "";
    let suggestedUrl = "";
    let models: string[] = [];
    let suggestedCaps: string[] = ["TEXTO"];

    if (trimmed.startsWith("sk-lOl") || trimmed.startsWith("MR-EE") || trimmed.toLowerCase().includes("codex")) {
      detectedSlug = "openai";
      providerName = "Mirai API / OpenAI Codex";
      suggestedName = "Mirai OpenAI Codex (gpt-5.6-sol, gpt-6-astra)";
      suggestedUrl = "https://api.miraiapi.com/v1";
      models = ["gpt-5.6-sol", "gpt-6-astra", "gpt-5.6-terra", "gpt-5.6-luna"];
      suggestedCaps = ["TEXTO", "CODIGO", "DOCUMENTO", "IMAGEM", "CRIACAO_SITES"];
    } else if (trimmed.startsWith("sk-ise") || trimmed.startsWith("MR-3C") || trimmed.toLowerCase().includes("claude")) {
      detectedSlug = "anthropic";
      providerName = "Mirai API / Anthropic Claude";
      suggestedName = "Mirai Anthropic Claude (claude-fable-5.1, claude-sonnet-5)";
      suggestedUrl = "https://api.miraiapi.com/v1";
      models = ["claude-fable-5.1", "claude-fable-5", "claude-sonnet-5", "claude-opus-5"];
      suggestedCaps = ["TEXTO", "CODIGO", "DOCUMENTO", "CRIACAO_SITES"];
    } else if (trimmed.startsWith("sk-ant-")) {
      detectedSlug = "anthropic";
      providerName = "Anthropic Claude Oficial";
      suggestedName = "Anthropic Claude Oficial";
      suggestedUrl = "https://api.anthropic.com/v1";
      models = ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"];
      suggestedCaps = ["TEXTO", "CODIGO", "DOCUMENTO"];
    } else if (trimmed.startsWith("AIzaSy")) {
      detectedSlug = "google";
      providerName = "Google AI Studio";
      suggestedName = "Google Gemini 1.5 Pro";
      suggestedUrl = "https://generativelanguage.googleapis.com";
      models = ["gemini-1.5-pro", "gemini-1.5-flash"];
      suggestedCaps = ["TEXTO", "CODIGO", "DOCUMENTO", "IMAGEM"];
    } else if (trimmed.startsWith("sk-")) {
      detectedSlug = "openai";
      providerName = "OpenAI Oficial";
      suggestedName = "OpenAI GPT-4o";
      suggestedUrl = "https://api.openai.com/v1";
      models = ["gpt-4o", "gpt-4o-mini"];
      suggestedCaps = ["TEXTO", "CODIGO", "DOCUMENTO", "IMAGEM", "CRIACAO_SITES"];
    }

    if (detectedSlug) {
      setAutoDetected({
        providerSlug: detectedSlug,
        providerName,
        suggestedName,
        suggestedUrl,
        models,
        suggestedCaps,
      });
      const prov = providers.find((p) => p.slug === detectedSlug);
      if (prov) setSelectedProvider(prov.id);
      if (!name) setName(suggestedName);
      if (!customBaseUrl && suggestedUrl) setCustomBaseUrl(suggestedUrl);
      setSelectedCapabilities(suggestedCaps);
    } else {
      setAutoDetected(null);
    }
  };

  const toggleCapability = (capId: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capId) ? prev.filter((c) => c !== capId) : [...prev, capId]
    );
  };

  const handleTestKeyLive = async () => {
    if (!rawApiKey.trim()) return;
    setTestingKey(true);
    setTestResult(null);

    try {
      const selectedProvObj = providers.find((p) => p.id === selectedProvider);
      const res = await fetch("/api/admin/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawApiKey,
          customBaseUrl: customBaseUrl || undefined,
          providerSlug: selectedProvObj?.slug || autoDetected?.providerSlug || "openai",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          tested: true,
          success: true,
          latencyMs: data.latencyMs,
          models: data.detectedModels || [],
          message: data.message,
        });
      } else {
        setTestResult({
          tested: true,
          success: false,
          latencyMs: data.latencyMs,
          message: data.error || "Falha na validação da chave.",
        });
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message,
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);

    try {
      let provId = selectedProvider;
      let provSlug = "";

      if (provId === "openai" || provId === "anthropic" || provId === "google") {
        provSlug = provId;
        const match = providers.find((p) => p.slug === provId);
        if (match) provId = match.id;
      }

      if (!provId) {
        if (autoDetected?.providerSlug) {
          const match = providers.find((p) => p.slug === autoDetected.providerSlug);
          if (match) {
            provId = match.id;
            provSlug = match.slug;
          } else {
            provSlug = autoDetected.providerSlug;
          }
        } else if (providers.length > 0) {
          provId = providers[0].id;
        }
      }

      let keyName = name.trim();
      if (!keyName || keyName.includes("@")) {
        keyName = autoDetected?.suggestedName || "Nova Chave";
      }

      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provId || undefined,
          providerSlug: provSlug || undefined,
          name: keyName,
          rawApiKey,
          priority: Number(priority),
          tokenLimitMonthly: Number(tokenLimit),
          customBaseUrl: customBaseUrl.trim() || undefined,
          capabilities: selectedCapabilities,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.canForceSave && window.confirm(`${data.error}\n\nDeseja salvar esta API no banco oficial definitivo mesmo assim?`)) {
          const forceRes = await fetch("/api/admin/api-keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              providerId: provId || undefined,
              providerSlug: provSlug || undefined,
              name: keyName,
              rawApiKey,
              priority: Number(priority),
              tokenLimitMonthly: Number(tokenLimit),
              customBaseUrl: customBaseUrl.trim() || undefined,
              capabilities: selectedCapabilities,
              forceSave: true,
            }),
          });
          const forceData = await forceRes.json();
          if (forceRes.ok) {
            setFeedback({
              type: "success",
              message: forceData.message || "Chave salva com sucesso no banco oficial!",
            });
            setName("");
            setRawApiKey("");
            setCustomBaseUrl("");
            setPriority(1);
            setTokenLimit(0);
            setSelectedCapabilities(["TEXTO", "CODIGO", "DOCUMENTO"]);
            fetchKeys();
            return;
          }
        }
        throw new Error(data.error || "Erro ao registrar chave.");
      }

      setFeedback({
        type: "success",
        message: data.message || "Chave cadastrada e criptografada com sucesso!",
      });
      setName("");
      setRawApiKey("");
      setCustomBaseUrl("");
      setPriority(1);
      setTokenLimit(0);
      setSelectedCapabilities(["TEXTO", "CODIGO", "DOCUMENTO"]);
      fetchKeys();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetQuota = async (keyId: string, keyName: string) => {
    if (!confirm(`Deseja realmente zerar o consumo mensal e reativar a chave "${keyName}" no balanceador?`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, resetQuota: true }),
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          message: `Consumo mensal zerado e chave "${keyName}" reativada com sucesso!`,
        });
        fetchKeys();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  const handleResetErrors = async (keyId: string) => {
    try {
      await fetch("/api/admin/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, resetErrors: true }),
      });
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestExistingKey = async (keyId: string, keyName: string) => {
    setTestingRowId(keyId);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Chave "${keyName}" testada com sucesso! (${data.latencyMs}ms)`,
        });
        fetchKeys();
      } else {
        setFeedback({
          type: "error",
          message: `Falha no teste da chave "${keyName}": ${data.error || "Erro desconhecido"}`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setTestingRowId(null);
    }
  };

  const handleToggleStatus = async (keyId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
      await fetch("/api/admin/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, status: nextStatus }),
      });
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Tem certeza que deseja remover esta chave?")) return;
    try {
      await fetch(`/api/admin/api-keys?id=${keyId}`, { method: "DELETE" });
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  // Métricas calculadas para os Summary Cards
  const totalKeys = keys.length;
  const normalKeys = keys.filter(
    (k) => k.status === "ACTIVE" && (!k.percentUsed || k.percentUsed < 70)
  ).length;
  const rotationKeys = keys.filter(
    (k) => k.status === "WARNING_90" || (k.percentUsed >= 90 && k.percentUsed < 100)
  ).length;
  const blockedKeys = keys.filter(
    (k) => k.status === "BLOCKED_QUOTA" || k.percentUsed >= 100
  ).length;
  const totalCostCents = keys.reduce((acc, k) => acc + (k.costAccumulatedCents || 0), 0);
  const totalCostBRL = (totalCostCents / 100) * 5.6;

  const renderCapabilityBadges = (caps: string[]) => {
    if (!caps || caps.length === 0) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
          TEXTO
        </span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {caps.map((cap) => {
          const matched = ALL_CAPABILITIES.find((c) => c.id === cap);
          return (
            <span
              key={cap}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${
                matched ? matched.color : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
            >
              {cap}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
          <Layers className="w-3.5 h-3.5" />
          AI GATEWAY MULTI-KEY • CONTROLE DE CONSUMO & CAPACIDADES
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Cadastro & Gestão Ilimitada de APIs
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Cadastre quantas chaves desejar por provedor (Claude, Codex, Gemini). 
          Protegidas por criptografia simétrica <strong>AES-256-GCM</strong>. 
          O AI Gateway executa rotação automática em <strong>90% de quota</strong> para a próxima chave compatível e bloqueia estritamente em <strong>100%</strong>.
        </p>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total APIs */}
        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Total de APIs</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Key className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white font-mono">{totalKeys}</div>
            <span className="text-[10px] text-slate-500">No balanceador</span>
          </div>
        </div>

        {/* Card 2: Operação Normal */}
        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400">Operação Normal</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-300 font-mono">{normalKeys}</div>
            <span className="text-[10px] text-slate-500">Consumo &lt; 70%</span>
          </div>
        </div>

        {/* Card 3: Rotação 90% */}
        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800 hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400">Em Rotação (90%)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-300 font-mono">{rotationKeys}</div>
            <span className="text-[10px] text-amber-400/80">Prioridade rebaixada</span>
          </div>
        </div>

        {/* Card 4: Bloqueadas 100% */}
        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800 hover:border-red-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-400">Bloqueadas (100%)</span>
            <div className="w-7 h-7 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-red-400 font-mono">{blockedKeys}</div>
            <span className="text-[10px] text-red-400/80">Quota esgotada</span>
          </div>
        </div>

        {/* Card 5: Custo Acumulado */}
        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-cyan-400">Custo Acumulado</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">
              R$ {totalCostBRL.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500">
              $ {(totalCostCents / 100).toFixed(2)} USD
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/40 border-red-500/30 text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Formulário de Cadastro Ilimitado */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          Registrar Nova Chave de API no AI Gateway
        </h2>

        <form onSubmit={handleCreateKey} autoComplete="off" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Provedor</span>
                {autoDetected && (
                  <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    ⚡ Auto-detectado
                  </span>
                )}
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Identificador / Nome</label>
              <input
                type="text"
                required
                autoComplete="new-password"
                placeholder="Ex: Mirai Claude Fable ou Codex 01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Chave Secreta (AES-256 Encrypted)
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="sk-ant-... ou sk-proj-..."
                  value={rawApiKey}
                  onChange={(e) => handleKeyInput(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Prioridade (1 = Máxima)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                URL Base / Endpoint Proxy (Opcional)
              </label>
              <input
                type="text"
                placeholder="Padrão oficial (ou ex: https://api.miraiapi.com/v1)"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Limite Mensal (Tokens) (0 = Ilimitado)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={tokenLimit}
                onChange={(e) => setTokenLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {actionLoading ? "Criptografando..." : "Salvar Chave Criptografada"}
              </button>
            </div>
          </div>

          {/* Seleção de Capacidades Suportadas */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Capacidades Habilitadas para esta Chave (AI Gateway não enviará tarefas incompatíveis):
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_CAPABILITIES.map((cap) => {
                const active = selectedCapabilities.includes(cap.id);
                return (
                  <button
                    type="button"
                    key={cap.id}
                    onClick={() => toggleCapability(cap.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      active
                        ? `${cap.color} ring-1 ring-cyan-500/40 font-bold`
                        : "border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        active ? "bg-cyan-500 text-slate-950 font-black" : "border border-slate-700"
                      }`}
                    >
                      {active && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span>{cap.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Banner de Reconhecimento Automático de Provedor & Teste */}
        {autoDetected && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-emerald-950/40 border border-cyan-500/30 text-xs shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold text-cyan-300">
                    Reconhecimento Automático: {autoDetected.providerName}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Endpoint detectado: <span className="font-mono text-cyan-200">{autoDetected.suggestedUrl}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestKeyLive}
                disabled={testingKey}
                className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold flex items-center justify-center gap-1.5 transition-all text-xs shadow-neon-glow shrink-0 disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${testingKey ? "animate-spin" : ""}`} />
                {testingKey ? "Verificando Conexão..." : "⚡ Testar Conexão em Tempo Real"}
              </button>
            </div>
            {autoDetected.models.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-cyan-500/20 text-[11px]">
                <span className="text-slate-400">Modelos Prontos:</span>
                {autoDetected.models.map((mod) => (
                  <span key={mod} className="px-2 py-0.5 rounded bg-slate-900/90 border border-cyan-500/20 text-cyan-200 font-mono">
                    {mod}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resultado do Teste de Conexão em Tempo Real */}
        {testResult && (
          <div
            className={`mt-3 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 shadow-md ${
              testResult.success
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/60 border-red-500/40 text-red-300"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold flex items-center gap-2">
                <span>{testResult.success ? "Conexão Validada com Sucesso!" : "Falha na Validação"}</span>
                {testResult.latencyMs !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-emerald-500/20 font-mono">
                    Latência: {testResult.latencyMs}ms
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-300">{testResult.message}</p>
              {testResult.models && testResult.models.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-mono">
                  {testResult.models.map((m) => (
                    <span key={m} className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-200">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Chaves Cadastradas */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            Chaves de API Cadastradas ({keys.length})
          </h2>
          <button
            onClick={fetchKeys}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar Lista
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs text-slate-500">Carregando chaves seguras...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            Nenhuma API cadastrada. Utilize o formulário acima para adicionar suas chaves do Claude, OpenAI ou Gemini!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-semibold">Provedor</th>
                  <th className="py-3 px-3 font-semibold">Nome da Chave</th>
                  <th className="py-3 px-3 font-semibold">Capacidades</th>
                  <th className="py-3 px-3 font-semibold">Prioridade</th>
                  <th className="py-3 px-3 font-semibold min-w-[200px]">Consumo & Quota</th>
                  <th className="py-3 px-3 font-semibold">Custo Est.</th>
                  <th className="py-3 px-3 font-semibold">Status AI Gateway</th>
                  <th className="py-3 px-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {keys.map((k) => {
                  const percent = k.percentUsed || 0;
                  const isBlocked = k.status === "BLOCKED_QUOTA" || percent >= 100;
                  const isWarning90 = k.status === "WARNING_90" || (percent >= 90 && percent < 100);

                  let progressColor = "bg-emerald-400";
                  if (isBlocked) progressColor = "bg-red-500";
                  else if (isWarning90) progressColor = "bg-orange-500 animate-pulse";
                  else if (percent >= 70) progressColor = "bg-amber-400";

                  const costBRL = ((k.costAccumulatedCents || 0) / 100) * 5.6;

                  return (
                    <tr key={k.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-cyan-300">
                        {k.providerName}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{k.name}</div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Lock className="w-2.5 h-2.5 text-slate-600" />
                          {k.keyHint}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {renderCapabilityBadges(k.capabilities)}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold text-[11px]">
                          P{k.priority}
                        </span>
                        {isWarning90 && (
                          <div className="text-[10px] text-amber-400 font-sans mt-0.5">
                            Efetivo: P{k.priority + 50}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {k.tokenLimitMonthly > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-slate-300">
                                {k.tokensUsedMonth.toLocaleString("pt-BR")} / {k.tokenLimitMonthly.toLocaleString("pt-BR")}
                              </span>
                              <span
                                className={`font-bold ${
                                  isBlocked
                                    ? "text-red-400"
                                    : isWarning90
                                    ? "text-orange-400"
                                    : percent >= 70
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }`}
                              >
                                {percent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {k.tokensRemaining !== null ? `${k.tokensRemaining.toLocaleString("pt-BR")} tokens restantes` : "Ilimitado"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono text-slate-300">
                              {k.tokensUsedMonth.toLocaleString("pt-BR")} tokens
                            </span>
                            <div className="text-[10px] text-cyan-400 font-mono">Ilimitado</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-white text-[11px]">
                          R$ {costBRL.toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          ${((k.costAccumulatedCents || 0) / 100).toFixed(2)} USD
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isBlocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                            <Ban className="w-3 h-3" /> ⛔ BLOQUEADA (100%)
                          </span>
                        ) : isWarning90 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center gap-1 w-fit animate-pulse">
                            <Zap className="w-3 h-3" /> ⚡ ROTAÇÃO (90%)
                          </span>
                        ) : k.status === "ACTIVE" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> ATIVA
                          </span>
                        ) : k.status === "RATE_LIMITED" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                            ⏳ RATE LIMIT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            {k.status}
                          </span>
                        )}
                        {k.errorCount > 0 && (
                          <span className="text-[10px] text-amber-400 block mt-0.5">
                            ({k.errorCount} erros)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {/* Botão de Testar Conexão em Tempo Real */}
                        <button
                          onClick={() => handleTestExistingKey(k.id, k.name)}
                          disabled={testingRowId === k.id}
                          title="Testar conexão em tempo real com os servidores da API"
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950/60 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 text-[10px] font-bold transition-all inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <Activity className={`w-2.5 h-2.5 ${testingRowId === k.id ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                          {testingRowId === k.id ? "Testando..." : "Testar"}
                        </button>

                        {/* Botão de Zerar Quota */}
                        {k.tokenLimitMonthly > 0 && (
                          <button
                            onClick={() => handleResetQuota(k.id, k.name)}
                            title="Zerar consumo de tokens e reativar chave no balanceador"
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-950/60 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-[10px] font-medium transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> Zerar Quota
                          </button>
                        )}
                        {k.errorCount > 0 && (
                          <button
                            onClick={() => handleResetErrors(k.id)}
                            title="Limpar erros e tirar da quarentena"
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] font-medium"
                          >
                            Resetar Erros
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(k.id, k.status)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium"
                        >
                          {k.status === "ACTIVE" ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="p-1 rounded hover:bg-red-950/40 text-slate-500 hover:text-red-400 transition-colors inline-block"
                          title="Remover Chave"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
