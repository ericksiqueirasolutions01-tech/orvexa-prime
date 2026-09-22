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
  Layers,
  Bot,
  Zap,
  Clock,
  Sparkles,
  Search,
  ChevronRight,
  HardDriveDownload,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  KeyRound,
} from "lucide-react";
import { DiagnosticReport } from "@/lib/diagnostics";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function SystemDiagnosticsPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "APIS" | "DATABASE" | "STORAGE" | "ERRORS" | "PERFORMANCE"
  >("ALL");

  const fetchDiagnostics = async (fresh = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/system/diagnostics${fresh ? "?fresh=true" : ""}`);
      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
      }
    } catch (e) {
      console.error("Erro ao obter diagnóstico:", e);
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
    } catch (e) {
      console.error("Erro ao executar bateria de testes:", e);
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_saude_orvexa_${Date.now()}.json`;
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
        <span className="text-cyan-400 font-bold">Diagnóstico & Testes Automáticos</span>
      </div>

      {/* Header Banner com Score de Saúde */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0A0E1A] via-[#0E1528] to-[#0A1624] border border-cyan-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            CONSOLE DE DIAGNÓSTICO & VALIDAÇÃO AUTOMATIZADA
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Saúde & Integridade do Sistema
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Diagnóstico de infraestrutura em tempo real: validação das APIs, conectividade do banco de dados, motores de upload e chunking semântico, 6 agentes profissionais e telemetria de performance.
          </p>

          {report && (
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-slate-400">
              <span>Última inspeção: <strong className="text-white">{new Date(report.timestamp).toLocaleTimeString("pt-BR")}</strong></span>
              <span>•</span>
              <span>Duração dos testes: <strong className="text-cyan-300">{report.summary.durationMs}ms</strong></span>
              <span>•</span>
              <span>Uptime: <strong className="text-emerald-400">{report.performance.uptimeSeconds}s</strong></span>
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
              {executing ? "Testando Subsistemas..." : "Executar Testes Agora"}
            </button>

            <button
              onClick={handleDownloadReport}
              disabled={!report}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Baixar Relatório (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !report ? (
          <CardSkeleton count={4} />
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>APIs Críticas</span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                {report.apis.filter((a) => a.status === "ONLINE").length} / {report.apis.length}
              </div>
              <span className="text-[11px] text-emerald-400 block mt-1 font-semibold">
                Todas Operacionais
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Banco de Dados</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                {report.database.latencyMs} ms
              </div>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                {report.database.engine} • {report.database.counts.users} usuários
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Armazenamento</span>
                <HardDrive className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 mt-2">
                {formatBytes(report.storage.usedBytes)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                {report.storage.totalFiles} arquivos • {report.storage.percentageUsed}% usado
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Memória Node.js</span>
                <Cpu className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 mt-2 font-mono">
                {report.performance.memoryHeapUsedMb} MB
              </div>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                RSS: {report.performance.memoryRssMb} MB | Cache: {report.performance.cacheStats.hitRate}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {[
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
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

      {/* Conteúdo das Abas */}
      {loading || !report ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <>
          {/* ABA 1: BATERIA DE TESTES AUTOMÁTICOS */}
          {(activeTab === "ALL") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Resultados da Suíte de Testes Automáticos
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  {report.summary.passedTests} de {report.summary.totalTests} aprovados
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 rounded-2xl bg-[#0A0E1A] border border-slate-800 overflow-hidden shadow-lg">
                {report.tests.map((test) => (
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
                      <span className="text-[11px] font-mono text-slate-400">
                        {test.durationMs}ms
                      </span>
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

          {/* ABA 2: STATUS DAS APIS */}
          {(activeTab === "APIS") && (
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
                    {report.apis.map((api, idx) => (
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

          {/* ABA 3: STATUS DO BANCO DE DADOS */}
          {(activeTab === "DATABASE") && (
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

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Prontidão para busca vetorial pgvector:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {report.database.pgvectorReady ? "ATIVO (PostgreSQL pgvector)" : "MODO LOCAL (SQLite + Embeddings L2 384d)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: ARMAZENAMENTO */}
          {(activeTab === "STORAGE") && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  Métricas de Armazenamento do Workspace
                </h2>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Ocupação Total: <strong className="text-white">{formatBytes(report.storage.usedBytes)}</strong></span>
                  <span>Cota de Referência: <strong className="text-white">{formatBytes(report.storage.quotaBytes)}</strong></span>
                </div>

                <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(2, Math.min(100, report.storage.percentageUsed))}%` }}
                  />
                </div>

                {/* Categorias */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  {Object.entries(report.storage.byCategory).map(([cat, count]) => (
                    <div key={cat} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{cat}</span>
                      <div className="text-lg font-black text-white mt-1">{count} arquivo(s)</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: ERROS RECENTES */}
          {(activeTab === "ERRORS") && (
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
                    <div key={idx} className="p-4 flex items-start gap-3 hover:bg-slate-900/40 font-mono text-xs">
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
                          {new Date(err.timestamp).toLocaleString("pt-BR")} • Rota: {err.route || "SYS"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 6: DESEMPENHO & MEMÓRIA */}
          {(activeTab === "PERFORMANCE") && (
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
                    Hits: {report.performance.cacheStats.hits} | Misses: {report.performance.cacheStats.misses}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

