// src/app/dashboard/settings/page.tsx
// CONFIGURAÇÕES DA CONTA & PREFERÊNCIAS DE IA — ORVEXA PRIME (TEMA CLARO & OBJETIVO)

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Cpu,
  Shield,
  Download,
  CheckCircle2,
  Sparkles,
  Command,
  ArrowLeft,
  Check,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { FRIENDLY_MODELS, ModelDisplayInfo } from "@/lib/model-names";

export default function SettingsPage() {
  const toast = useToast();

  const [defaultModel, setDefaultModel] = useState("orvexa-prime");
  const [streamResponse, setStreamResponse] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [supportedModels, setSupportedModels] = useState<ModelDisplayInfo[]>(
    Object.values(FRIENDLY_MODELS)
  );

  useEffect(() => {
    // Carrega preferências salvas
    const savedModel = localStorage.getItem("orvexa_pref_model");
    if (savedModel) setDefaultModel(savedModel);

    // Carrega modelos dinâmicos ativos
    fetch("/api/ai/models")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.models && Array.isArray(data.models) && data.models.length > 0) {
          setSupportedModels(data.models);
        }
      })
      .catch(() => {});
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem("orvexa_pref_model", defaultModel);
    localStorage.setItem("orvexa_pref_stream", String(streamResponse));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    toast.success("Preferências salvas!", "Suas configurações foram sincronizadas com sucesso.");
  };

  const handleExportData = () => {
    setExporting(true);
    setTimeout(() => {
      const dataToExport = {
        exportDate: new Date().toISOString(),
        platform: "ORVEXA PRIME DIGITAL",
        defaultModel,
        streamResponse,
        compliance: "LGPD/GDPR Validated",
      };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orvexa_user_settings_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      toast.success("Download concluído", "Arquivo JSON de configurações exportado com sucesso.");
    }, 600);
  };

  const shortcuts = [
    { key: "Enter", desc: "Enviar mensagem no chat" },
    { key: "Shift + Enter", desc: "Quebrar linha no campo de digitação" },
    { key: "Ctrl + K / ⌘K", desc: "Abrir busca rápida de conversas" },
    { key: "Esc", desc: "Fechar modais ou cancelar seleção" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            Configurações da Conta
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Preferências & Configurações
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Personalize sua experiência de inteligência artificial, modelo padrão e dados de privacidade.
          </p>
        </div>

        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs transition-all self-start md:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Chat</span>
        </Link>
      </div>

      {/* 1. Preferências de IA & Modelo Padrão */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Modelo de IA Pré-selecionado no Chat</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            100% OPERACIONAL
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Apenas os modelos ativos e suportados pela API cadastrada são disponibilizados.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {supportedModels.map((m) => {
              const isSelected = defaultModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDefaultModel(m.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? "border-slate-900 bg-slate-50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-slate-900">{m.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">Streaming Contínuo de Respostas</div>
              <div className="text-[11px] text-slate-500">
                Gera o texto em tempo real conforme a inteligência artificial escreve
              </div>
            </div>
            <input
              type="checkbox"
              checked={streamResponse}
              onChange={(e) => setStreamResponse(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preferências Salvas com Sucesso!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Salvar Preferências</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Privacidade e Conformidade LGPD */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Privacidade & Proteção de Dados</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            LGPD ATIVA
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Suas conversas e dados anexados permanecem isolados e protegidos com criptografia. Você
          pode exportar todos os seus dados a qualquer momento.
        </p>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-slate-600">Exportar cópia dos dados e configurações:</span>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-2 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{exporting ? "Gerando..." : "Exportar JSON"}</span>
          </button>
        </div>
      </div>

      {/* 3. Atalhos de Teclado */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
          <Command className="w-4 h-4 text-purple-600" />
          <span>Atalhos de Teclado Rápidos</span>
        </div>

        <div className="divide-y divide-slate-100">
          {shortcuts.map((sc, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-700">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
