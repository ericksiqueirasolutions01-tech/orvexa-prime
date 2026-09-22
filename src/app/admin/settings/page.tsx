"use client";

import { useEffect, useState } from "react";
import {
  Sliders,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  Sparkles,
  Code2,
  FileText,
  Image as ImageIcon,
  Save,
  RefreshCw,
  Power,
  Lock,
} from "lucide-react";

export default function AdminSettingsAiPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Model settings
  const [defaultModel, setDefaultModel] = useState("claude-sonnet-5");
  const [codingModel, setCodingModel] = useState("gpt-5.6-sol");
  const [documentModel, setDocumentModel] = useState("claude-sonnet-5");
  const [imageModel, setImageModel] = useState("flux-ultra-8k");

  // New keys input
  const [openAiKey, setOpenAiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");

  // Providers and models from backend
  const [providers, setProviders] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Testing states
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; message?: string }>>({});

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (res.ok) {
        setDefaultModel(data.settings?.defaultModel || "claude-sonnet-5");
        setCodingModel(data.settings?.codingModel || "gpt-5.6-sol");
        setDocumentModel(data.settings?.documentModel || "claude-sonnet-5");
        setImageModel(data.settings?.imageModel || "flux-ultra-8k");
        setProviders(data.providers || []);
        setAvailableModels(data.availableModels || []);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultModel,
          codingModel,
          documentModel,
          imageModel,
          rawOpenAiKey: openAiKey || undefined,
          rawClaudeKey: claudeKey || undefined,
          rawGoogleKey: googleKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar configurações.");

      setFeedback({ type: "success", message: data.message || "Configurações salvas com sucesso!" });
      setOpenAiKey("");
      setClaudeKey("");
      setGoogleKey("");
      fetchSettings();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestKeyLive = async (keyId: string, providerSlug: string) => {
    setTestingProvider(providerSlug);
    try {
      const res = await fetch("/api/admin/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerSlug]: {
          success: res.ok && data.success,
          latencyMs: data.latencyMs,
          message: data.message || data.error,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerSlug]: {
          success: false,
          message: err.message,
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-400" />
        Carregando configurações centrais de Inteligência Artificial...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
          <Sliders className="w-3.5 h-3.5" />
          ADMINISTRAÇÃO • CONFIGURAÇÕES & INTELIGÊNCIA ARTIFICIAL
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Configurações Centrais de Inteligência Artificial
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Gerencie chaves secretas dos provedores, defina os modelos mestres para cada tipo de tarefa
          (Programação, Documentos, Imagem) e execute testes de conexão com latência ao vivo.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 shadow-md ${
            feedback.type === "success"
              ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/50 border-red-500/30 text-red-300"
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

      <form onSubmit={handleSave} className="space-y-8">
        {/* SEÇÃO 1: MODELOS PADRÃO POR CATEGORIA */}
        <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Modelos de IA Padrão por Domínio
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Modelo Geral */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Modelo Padrão Geral (Conversação & Assistência)
              </label>
              <p className="text-[11px] text-slate-400">Utilizado como fallback primário do chat e raciocínio.</p>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
              >
                {availableModels.map((m) => (
                  <option key={m.identifier} value={m.identifier}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Modelo Programação */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                Modelo de Programação (Code Agent & Clean Architecture)
              </label>
              <p className="text-[11px] text-slate-400">Ativado para criação de projetos, debug e geração de arquivos ZIP.</p>
              <select
                value={codingModel}
                onChange={(e) => setCodingModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
              >
                {availableModels.map((m) => (
                  <option key={m.identifier} value={m.identifier}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Modelo Documentos */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Modelo de Documentos & Contratos (Document Intelligence)
              </label>
              <p className="text-[11px] text-slate-400">Especialista em auditoria jurídica, cláusulas, relatórios e planilhas.</p>
              <select
                value={documentModel}
                onChange={(e) => setDocumentModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-400"
              >
                {availableModels.map((m) => (
                  <option key={m.identifier} value={m.identifier}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Modelo Imagem */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                Modelo de Imagem (Image Engine & Difusão Neural)
              </label>
              <p className="text-[11px] text-slate-400">Motor para geração hiper-realista e criação de banners em 8K.</p>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-pink-300 font-mono focus:outline-none focus:border-pink-400"
              >
                <option value="flux-ultra-8k">Flux Ultra HD 8K (Neural Diffusion)</option>
                <option value="sdxl-turbo">SDXL Turbo (Ultra-Fast 4K)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: PROVEDORES E CHAVES DE API */}
        <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-emerald-400" />
            Provedores & Chaves de API Protegidas (AES-256-GCM)
          </h2>

          <div className="space-y-4">
            {/* Provedor OpenAI / Codex */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">OpenAI / Codex (Mirai API & Oficial)</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono">
                    openai
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Chaves Ativas:{" "}
                  {providers.find((p) => p.slug === "openai")?.apiKeys.length || 0} configuradas
                  {providers.find((p) => p.slug === "openai")?.apiKeys[0]?.keyHint && (
                    <span className="font-mono text-cyan-300">
                      (Atual: {providers.find((p) => p.slug === "openai")?.apiKeys[0]?.keyHint})
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="Inserir nova chave sk-... ou MR-..."
                  className="mt-2 w-full max-w-md px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                {providers.find((p) => p.slug === "openai")?.apiKeys[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      handleTestKeyLive(
                        providers.find((p) => p.slug === "openai")?.apiKeys[0].id,
                        "openai"
                      )
                    }
                    disabled={testingProvider === "openai"}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingProvider === "openai" ? "animate-spin" : ""}`} />
                    {testingProvider === "openai" ? "Testando..." : "⚡ Testar Conexão"}
                  </button>
                )}
              </div>
            </div>
            {testResults["openai"] && (
              <div className={`p-2.5 rounded-lg text-xs font-mono border ${testResults["openai"].success ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-red-950/40 border-red-500/30 text-red-300"}`}>
                {testResults["openai"].success ? `✓ Conexão bem-sucedida (${testResults["openai"].latencyMs}ms)` : `✗ ${testResults["openai"].message}`}
              </div>
            )}

            {/* Provedor Anthropic Claude */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Anthropic Claude (Mirai API & Oficial)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/20 text-purple-400 text-[10px] font-mono">
                    anthropic
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Chaves Ativas:{" "}
                  {providers.find((p) => p.slug === "anthropic")?.apiKeys.length || 0} configuradas
                  {providers.find((p) => p.slug === "anthropic")?.apiKeys[0]?.keyHint && (
                    <span className="font-mono text-purple-300">
                      (Atual: {providers.find((p) => p.slug === "anthropic")?.apiKeys[0]?.keyHint})
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="Inserir nova chave sk-ant-... ou MR-..."
                  className="mt-2 w-full max-w-md px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                {providers.find((p) => p.slug === "anthropic")?.apiKeys[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      handleTestKeyLive(
                        providers.find((p) => p.slug === "anthropic")?.apiKeys[0].id,
                        "anthropic"
                      )
                    }
                    disabled={testingProvider === "anthropic"}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingProvider === "anthropic" ? "animate-spin" : ""}`} />
                    {testingProvider === "anthropic" ? "Testando..." : "⚡ Testar Conexão"}
                  </button>
                )}
              </div>
            </div>
            {testResults["anthropic"] && (
              <div className={`p-2.5 rounded-lg text-xs font-mono border ${testResults["anthropic"].success ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-red-950/40 border-red-500/30 text-red-300"}`}>
                {testResults["anthropic"].success ? `✓ Conexão bem-sucedida (${testResults["anthropic"].latencyMs}ms)` : `✗ ${testResults["anthropic"].message}`}
              </div>
            )}

            {/* Provedor Google Gemini */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Google Gemini (Google AI Studio Nativo)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    google
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Chaves Ativas:{" "}
                  {providers.find((p) => p.slug === "google")?.apiKeys.length || 0} configuradas
                  {providers.find((p) => p.slug === "google")?.apiKeys[0]?.keyHint && (
                    <span className="font-mono text-emerald-300">
                      (Atual: {providers.find((p) => p.slug === "google")?.apiKeys[0]?.keyHint})
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="Inserir nova chave AIzaSy..."
                  className="mt-2 w-full max-w-md px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                {providers.find((p) => p.slug === "google")?.apiKeys[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      handleTestKeyLive(
                        providers.find((p) => p.slug === "google")?.apiKeys[0].id,
                        "google"
                      )
                    }
                    disabled={testingProvider === "google"}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingProvider === "google" ? "animate-spin" : ""}`} />
                    {testingProvider === "google" ? "Testando..." : "⚡ Testar Conexão"}
                  </button>
                )}
              </div>
            </div>
            {testResults["google"] && (
              <div className={`p-2.5 rounded-lg text-xs font-mono border ${testResults["google"].success ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-red-950/40 border-red-500/30 text-red-300"}`}>
                {testResults["google"].success ? `✓ Conexão bem-sucedida (${testResults["google"].latencyMs}ms)` : `✗ ${testResults["google"].message}`}
              </div>
            )}
          </div>
        </div>

        {/* BOTÃO SALVAR */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-neon-glow transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Configurações de IA"}
          </button>
        </div>
      </form>
    </div>
  );
}
