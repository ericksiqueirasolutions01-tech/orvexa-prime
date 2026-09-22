"use client";

import { useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Cpu,
  Bell,
  Shield,
  Download,
  Command,
  CheckCircle2,
  Sparkles,
  Zap,
  Info,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { theme, setTheme, isDark } = useTheme();
  const toast = useToast();

  const [defaultModel, setDefaultModel] = useState("orvexa-prime");
  const [streamResponse, setStreamResponse] = useState(true);
  const [notify80, setNotify80] = useState(true);
  const [notify90, setNotify90] = useState(true);
  const [maskPiiActive, setMaskPiiActive] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleSavePreferences = () => {
    localStorage.setItem("orvexa_pref_model", defaultModel);
    localStorage.setItem("orvexa_pref_stream", String(streamResponse));
    toast.success("Preferências salvas!", "Suas configurações foram sincronizadas com o dispositivo.");
  };

  const handleExportData = () => {
    setExporting(true);
    setTimeout(() => {
      const dataToExport = {
        exportDate: new Date().toISOString(),
        platform: "ORVEXA PRIME SAAS",
        theme,
        defaultModel,
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
    { key: "Ctrl + K / ⌘ + K", desc: "Abrir Paleta de Comandos & Busca Rápida" },
    { key: "Enter", desc: "Enviar mensagem no Chat" },
    { key: "Shift + Enter", desc: "Inserir quebra de linha na mensagem" },
    { key: "Esc", desc: "Fechar modais, visualizadores e paleta de comandos" },
    { key: "Ctrl + /", desc: "Comentar linha de código no Codex Dev" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-cyan-500/20 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
          <Settings className="w-3.5 h-3.5" />
          PREFERÊNCIAS DO SISTEMA
        </div>
        <h1 className="text-2xl font-black text-white">Configurações da Plataforma</h1>
        <p className="text-xs text-slate-400 mt-1">
          Personalize sua experiência visual, modelos de IA padrão, notificações de consumo e segurança.
        </p>
      </div>

      {/* 1. Modo Escuro / Claro */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          Aparência & Tema Visual
        </h2>
        <p className="text-xs text-slate-400">
          Escolha como deseja visualizar a interface do ORVEXA PRIME. O tema é sincronizado instantaneamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === "dark"
                ? "bg-slate-900 border-cyan-500 text-white shadow-neon-cyan"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-cyan-400" />
              {theme === "dark" && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
            </div>
            <div className="text-sm font-bold text-white">Modo Escuro</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Obsidian Dark Neon Luxury</div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === "light"
                ? "bg-slate-900 border-amber-400 text-white shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Sun className="w-5 h-5 text-amber-400" />
              {theme === "light" && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="text-sm font-bold text-white">Modo Claro</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pearl Minimalist White SaaS</div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === "system"
                ? "bg-slate-900 border-emerald-400 text-white shadow-neon-green"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Monitor className="w-5 h-5 text-emerald-400" />
              {theme === "system" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <div className="text-sm font-bold text-white">Sincronizar com SO</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Segue a preferência do Windows/Mac</div>
          </button>
        </div>
      </div>

      {/* 2. Preferências de IA & Modelos */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Inteligência Artificial & Modelo Padrão
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Modelo de IA Pré-selecionado no Chat</label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="orvexa-prime">⚡ ORVEXA PRIME (Roteamento Semântico Automático)</option>
              <option value="gpt-5.6-sol">🟢 OpenAI GPT-5.6 Sol (Codex & Raciocínio Geral)</option>
              <option value="claude-sonnet-5">🟣 Anthropic Claude Sonnet 5 (Análise Corporativa & Texto)</option>
              <option value="gemini-3.8">🔵 Google Gemini 3.8 Ultra (Multimodal & Contexto 2M)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Streaming Contínuo de Respostas</div>
              <div className="text-[11px] text-slate-400">Exibe o texto gerado em tempo real token a token</div>
            </div>
            <input
              type="checkbox"
              checked={streamResponse}
              onChange={(e) => setStreamResponse(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-800 border-slate-700"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSavePreferences}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-neon-glow transition-all"
        >
          Salvar Preferências de IA
        </button>
      </div>

      {/* 3. Alertas de Consumo de Quota */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          Alertas de Consumo & Cotas
        </h2>

        <div className="space-y-2">
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-white">Aviso de 80% da cota mensal de tokens</div>
              <div className="text-[11px] text-slate-400">Receba uma notificação visual no portal ao atingir 80%</div>
            </div>
            <input
              type="checkbox"
              checked={notify80}
              onChange={(e) => setNotify80(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-white">Alerta crítico de 90% da cota</div>
              <div className="text-[11px] text-slate-400">Orienta a liberação de cota ou upgrade com antecedência</div>
            </div>
            <input
              type="checkbox"
              checked={notify90}
              onChange={(e) => setNotify90(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500"
            />
          </label>
        </div>
      </div>

      {/* 4. Privacidade, LGPD & Exportação */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Privacidade & Dados (LGPD/GDPR)
        </h2>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div>
            <div className="text-xs font-bold text-white">Mascaramento Automático de Dados Sensíveis (PII)</div>
            <div className="text-[11px] text-slate-400">
              Anonimiza CPFs, cartões e tokens antes de envio para provedores externos de IA
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ● ATIVO (SaaS Enterprise)
          </span>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Você pode exportar o backup de todas as suas configurações em formato estruturado.
          </div>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Gerando..." : "Exportar JSON"}
          </button>
        </div>
      </div>

      {/* 5. Tabela de Atalhos de Teclado */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Command className="w-4 h-4 text-cyan-400" />
          Atalhos de Teclado Rápidos
        </h2>

        <div className="divide-y divide-slate-800/80">
          {shortcuts.map((sc, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-cyan-300">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

