"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Server,
  Database,
  Cpu,
  HardDrive,
  Shield,
  Bot,
  Zap,
  ChevronRight,
  MessageSquare,
  Code2,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { DiagnosticReport } from "@/lib/diagnostics";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function SystemDiagnosticsPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Dados do Diagnóstico de Capacidades da API & Agentes
  const [capabilitiesData, setCapabilitiesData] = useState<any>(null);
  const [loadingCapabilities, setLoadingCapabilities] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "CAPABILITIES" | "ALL" | "APIS" | "DATABASE" | "STORAGE" | "ERRORS" | "PERFORMANCE"
  >("CAPABILITIES");

  const fetchCapabilities = async () => {
    try {
      setLoadingCapabilities(true);
      const res = await fetch("/api/admin/system/api-capabilities");
      const data = await res.json();
      if (res.ok && data.success) {
        setCapabilitiesData(data);
      }
    } catch (e) {
      console.error("Erro ao obter diagnóstico de capacidades da API:", e);
    } finally {
      setLoadingCapabilities(false);
    }
  };

  const fetchDiagnostics = async (fresh = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/system/diagnostics${fresh ? "?fresh=true" : ""}`);
      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
      }
    } catch (e) {
      console.error("Erro ao obter diagnóstico geral:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunFullDiagnostics = async () => {
    try {
      setExecuting(true);
      const res = await fetch("/api/admin/system/diagnostics", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
      }
      await fetchCapabilities();
    } catch (e) {
      console.error("Erro ao executar bateria de testes:", e);
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    fetchCapabilities();
    fetchDiagnostics();
  }, []);

  const handleDownloadReport = () => {
    const combinedReport = {
      timestamp: new Date().toISOString(),
      capabilitiesReport: capabilitiesData,
      systemReport: report,
    };
    const blob = new Blob([JSON.stringify(combinedReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_diagnostico_orvexa_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <Link href="/admin" className="hover:text-cyan-400 transition-colors">
          ADMIN
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span>Sistema</span>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-cyan-400 font-bold">Diagnóstico & Capacidades da API</span>
      </div>

      {/* Header Banner com Score e Status da API */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0A0E1A] via-[#0E1528] to-[#0A1624] border border-cyan-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            CONSOLE DE DIAGNÓSTICO & VALIDAÇÃO EXCLUSIVO DO ADMINISTRADOR
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Diagnóstico de Capacidades da API & Agentes
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Painel técnico restrito para auditoria de provedores, detecção de modelos e validação de capacidades (Texto, Código, Documentos, Imagem e Vídeo), garantindo que agentes incompatíveis fiquem blindados e ocultos na Área do Cliente.
          </p>

          {capabilitiesData && (
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-slate-400">
              <span>
                API Ativa: <strong className="text-emerald-400">{capabilitiesData.apiInfo?.name}</strong>
              </span>
              <span>•</span>
              <span>
                Modelos: <strong className="text-cyan-300">{capabilitiesData.detectedModels?.length} detectados</strong>
              </span>
              <span>•</span>
              <span>
                Agentes: <strong className="text-emerald-400">{capabilitiesData.summary?.allowedAgentsCount} liberados</strong> /{" "}
                <strong className="text-amber-400">{capabilitiesData.summary?.blockedAgentsCount} bloqueados</strong>
              </span>
            </div>
          )}
        </div>

        {/* Score & Ações Rápidas */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 shrink-0">
          {report && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[130px] shadow-lg">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Score de Saúde</span>
              <div
                className={`text-3xl font-black mt-1 ${
                  report.overallScore >= 90
                    ? "text-emerald-400"
                    : report.overallScore >= 75
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {report.overallScore}%
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded-full inline-block mt-1 font-bold ${
                  report.overallStatus === "EXCELENTE"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : report.overallStatus === "ESTÁVEL"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                }`}
              >
                ● {report.overallStatus}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={handleRunFullDiagnostics}
              disabled={executing || loading}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${executing ? "animate-spin" : ""}`} />
              {executing ? "Auditando Subsistemas..." : "Executar Testes Agora"}
            </button>

            <button
              onClick={handleDownloadReport}
              disabled={!report && !capabilitiesData}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Baixar Relatório (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {[
          { id: "CAPABILITIES", label: "🎯 Capacidades da API & Agentes", icon: Zap },
          { id: "ALL", label: "🧪 Bateria de Testes", icon: Activity },
          { id: "APIS", label: "🚀 Status das APIs", icon: Server },
          { id: "DATABASE", label: "🗄️ Status do Banco", icon: Database },
          { id: "STORAGE", label: "💾 Armazenamento", icon: HardDrive },
          { id: "ERRORS", label: "⚠️ Erros Recentes", icon: AlertCircle },
          { id: "PERFORMANCE", label: "⚡ Desempenho", icon: Cpu },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ABA PRINCIPAL: DIAGNÓSTICO DE CAPACIDADES DA API & AGENTES */}
      {activeTab === "CAPABILITIES" && (
        <div className="space-y-6">
          {/* Banner de Blindagem da Área do Cliente */}
          <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>PAINEL EXCLUSIVO DO ADMINISTRADOR</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30 font-bold">
                    BLINDAGEM DO CLIENTE ATIVA
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  O cliente final nunca visualiza erros de gateway, chaves ausentes ou opções quebradas.
                  O sistema filtra e oculta automaticamente agentes e modelos incompatíveis, exibindo apenas recursos 100% operacionais na interface estilo ChatGPT.
                </p>
              </div>
            </div>

            <button
              onClick={fetchCapabilities}
              disabled={loadingCapabilities}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 self-start sm:self-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCapabilities ? "animate-spin" : ""}`} />
              Re-inspecionar API
            </button>
          </div>

          {loadingCapabilities || !capabilitiesData ? (
            <div className="space-y-4">
              <CardSkeleton count={3} />
              <TableSkeleton rows={6} cols={3} />
            </div>
          ) : (
            <>
              {/* 1. API ATIVA */}
              <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        API Ativa Conectada
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        Credenciais em execução pelo AI Gateway
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    STATUS: {capabilitiesData.apiInfo?.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Nome da API</span>
                    <div className="text-sm font-bold text-white mt-1">
                      {capabilitiesData.apiInfo?.name}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      Chave: {capabilitiesData.apiInfo?.keyHint}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Provedor</span>
                    <div className="text-sm font-bold text-cyan-300 mt-1">
                      {capabilitiesData.apiInfo?.provider}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      Slug: {capabilitiesData.apiInfo?.providerSlug}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Endpoint Base</span>
                    <div
                      className="text-xs font-mono font-bold text-emerald-400 mt-1 truncate"
                      title={capabilitiesData.apiInfo?.endpoint}
                    >
                      {capabilitiesData.apiInfo?.endpoint}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      Porta HTTPS 443 • Streaming SSE Ativo
                    </span>
                  </div>
                </div>

                {/* Quota da API Ativa */}
                <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <span>
                      Quota Contratada:{" "}
                      <strong className="text-white">
                        {capabilitiesData.apiInfo?.totalQuota?.toLocaleString("pt-BR")} tokens
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Consumo:{" "}
                      <strong className="text-amber-400">
                        {capabilitiesData.apiInfo?.usedQuota?.toLocaleString("pt-BR")} tokens
                      </strong>
                    </span>
                  </div>
                  <span className="text-emerald-400 font-semibold">
                    Saldo Restante: {capabilitiesData.apiInfo?.remainingQuota?.toLocaleString("pt-BR")} tokens
                  </span>
                </div>
              </div>

              {/* 2. MODELOS DETECTADOS */}
              <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-5 h-5 text-purple-400" />
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Modelos Detectados ({capabilitiesData.detectedModels?.length})
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        Modelos suportados e sincronizados no Registry Interno
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Prontos para Roteamento</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {capabilitiesData.detectedModels?.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            {m.category}
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 font-bold">
                            ● OPERACIONAL
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white">{m.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          ID: <strong className="text-slate-300">{m.identifier}</strong>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Contexto: 128k</span>
                        <span className="text-cyan-400 font-semibold">{m.badge}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. CAPACIDADES DETECTADAS */}
              <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Capacidades Detectadas da API
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        Matriz de recursos suportados pela infraestrutura atual
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {capabilitiesData.summary?.supportedCapabilitiesCount} de{" "}
                    {capabilitiesData.summary?.totalCapabilitiesCount} suportadas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {capabilitiesData.capabilities?.map((cap: any) => (
                    <div
                      key={cap.key}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        cap.supported
                          ? "bg-emerald-950/20 border-emerald-500/30 text-slate-200"
                          : "bg-red-950/15 border-red-500/30 text-slate-400"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5">
                            {cap.supported ? "✅" : "❌"} {cap.name.split(" ")[0]}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              cap.supported
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-red-500/20 text-red-300 border border-red-500/40"
                            }`}
                          >
                            {cap.supported ? "ATIVO" : "INATIVO"}
                          </span>
                        </div>

                        <p className="text-[11px] leading-relaxed mt-1 text-slate-300">
                          {cap.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[10px] font-mono">
                        {cap.supported ? (
                          <span className="text-emerald-400 font-semibold block">
                            Modelos: {cap.activeModels.join(", ")}
                          </span>
                        ) : (
                          <span className="text-red-400 leading-tight block">{cap.reason}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. AGENTES LIBERADOS (VISÍVEIS AO CLIENTE) */}
              <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-emerald-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Agentes Liberados ({capabilitiesData.allowedAgents?.length})
                      </h2>
                      <span className="text-[11px] text-emerald-400 font-sans">
                        100% operacionais e exibidos normalmente na interface do cliente
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                    DISPONÍVEIS AO CLIENTE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {capabilitiesData.allowedAgents?.map((ag: any) => (
                    <div
                      key={ag.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{ag.avatar}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{ag.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{ag.role}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] font-mono text-slate-400 space-y-0.5">
                          <div>
                            Modelo: <strong className="text-cyan-300">{ag.model}</strong>
                          </div>
                          <div>
                            Capacidade: <span className="text-slate-300">{ag.capabilityNeeded}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">
                        LIBERADO
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. AGENTES BLOQUEADOS (OCULTOS DO CLIENTE) */}
              <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-amber-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Agentes Bloqueados & Incompatíveis ({capabilitiesData.blockedAgents?.length})
                      </h2>
                      <span className="text-[11px] text-amber-400 font-sans">
                        Ocultados da Área do Cliente para garantir zero opções quebradas
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                    OCULTOS DO CLIENTE
                  </span>
                </div>

                <div className="divide-y divide-slate-800/70 rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
                  {capabilitiesData.blockedAgents?.map((ag: any) => (
                    <div
                      key={ag.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0 opacity-70">{ag.avatar}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{ag.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {ag.capabilityNeeded}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{ag.role}</div>
                        </div>
                      </div>

                      <div className="sm:max-w-md text-left sm:text-right flex flex-col sm:items-end">
                        <div className="text-[11px] font-semibold text-amber-400 flex items-center sm:justify-end gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span>Motivo: {ag.reason}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Modelo associado: {ag.model}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ABA 2: BATERIA DE TESTES AUTOMÁTICOS */}
      {activeTab === "ALL" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Resultados da Suíte de Testes Automáticos
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {report?.summary?.passedTests} de {report?.summary?.totalTests} aprovados
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-2xl bg-[#0A0E1A] border border-slate-800 overflow-hidden shadow-lg">
            {report?.tests.map((test) => (
              <div
                key={test.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {test.status === "PASS" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : test.status === "WARN" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-white">{test.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">{test.message}</p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">{test.durationMs}ms</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                      test.status === "PASS"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : test.status === "WARN"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: STATUS DAS APIS */}
      {activeTab === "APIS" && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Status dos Endpoints & Roteamento de APIs
          </h2>

          <div className="rounded-2xl bg-[#0A0E1A] border border-slate-800 overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Nome do Serviço</th>
                  <th className="py-3 px-4">Método & Rota</th>
                  <th className="py-3 px-4">Latência</th>
                  <th className="py-3 px-4">Status HTTP</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {report?.apis.map((api, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-white">{api.name}</td>
                    <td className="py-3 px-4">
                      <span className="text-cyan-400 font-bold mr-1.5">{api.method}</span>
                      <span className="text-slate-400">{api.endpoint}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{api.latencyMs} ms</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-400">
                        {api.statusCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        ● {api.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: STATUS DO BANCO DE DADOS */}
      {activeTab === "DATABASE" && report && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Conexão do Banco de Dados
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                CONECTADO ({report.database.engine})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400">LATÊNCIA DE QUERY</span>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {report.database.latencyMs} ms
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400">USUÁRIOS CADASTRADOS</span>
                <div className="text-xl font-black text-white mt-1">
                  {report.database.counts.users}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400">CONVERSAS INDEXADAS</span>
                <div className="text-xl font-black text-cyan-300 mt-1">
                  {report.database.counts.conversations}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400">LOGS DE AUDITORIA</span>
                <div className="text-xl font-black text-purple-400 mt-1">
                  {report.database.counts.auditLogs}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: ARMAZENAMENTO */}
      {activeTab === "STORAGE" && report && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              Métricas de Armazenamento do Workspace
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 font-mono">
              <span>
                Ocupação Total: <strong className="text-white">{formatBytes(report.storage.usedBytes)}</strong>
              </span>
              <span>
                Cota de Referência:{" "}
                <strong className="text-white">{formatBytes(report.storage.quotaBytes)}</strong>
              </span>
            </div>

            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(2, Math.min(100, report.storage.percentageUsed))}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA 6: ERROS RECENTES */}
      {activeTab === "ERRORS" && report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Erros e Avisos Recentes (Buffer Circular)
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {report.recentErrors.length} incidentes registrados
            </span>
          </div>

          {report.recentErrors.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#0A0E1A] border border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum erro registrado</h3>
              <p className="text-xs text-slate-400">
                O sistema está operando perfeitamente sem falhas recentes no buffer de logs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-2xl bg-[#0A0E1A] border border-slate-800 overflow-hidden">
              {report.recentErrors.map((err, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-start gap-3 hover:bg-slate-900/40 font-mono text-xs"
                >
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      err.level === "ERROR"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {err.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold">{err.message}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(err.timestamp).toLocaleString("pt-BR")} • Rota:{" "}
                      {err.route || "SYS"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 7: DESEMPENHO & MEMÓRIA */}
      {activeTab === "PERFORMANCE" && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-2">
              <span className="text-xs font-mono text-slate-400">HEAP USED (NODE.JS)</span>
              <div className="text-3xl font-black text-cyan-400 font-mono">
                {report.performance.memoryHeapUsedMb} MB
              </div>
              <p className="text-xs text-slate-500">Memória alocada dinamicamente pelo processo</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-2">
              <span className="text-xs font-mono text-slate-400">RESIDENT SET SIZE (RSS)</span>
              <div className="text-3xl font-black text-purple-400 font-mono">
                {report.performance.memoryRssMb} MB
              </div>
              <p className="text-xs text-slate-500">Volume total de memória RAM do processo</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-2">
              <span className="text-xs font-mono text-slate-400">CACHE HIT RATE</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {report.performance.cacheStats.hitRate}
              </div>
              <p className="text-xs text-slate-500">
                Hits: {report.performance.cacheStats.hits} | Misses:{" "}
                {report.performance.cacheStats.misses}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
