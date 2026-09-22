// src/app/admin/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  User,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Terminal,
  Database,
  FileCode,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface AuditRecord {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT";
  message: string;
  route?: string;
  method?: string;
  statusCode?: number;
  latencyMs?: number;
  metadata?: any;
}

export default function AdminAuditPage() {
  const [viewMode, setViewMode] = useState<"AUDIT_DB" | "SYSTEM_LOGS">("AUDIT_DB");
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [logLevelFilter, setLogLevelFilter] = useState("ALL");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      if (viewMode === "AUDIT_DB") {
        const query = actionFilter !== "ALL" ? `?action=${actionFilter}` : "";
        const res = await fetch(`/api/admin/audit${query}`);
        const data = await res.json();
        if (res.ok) {
          setAuditRecords(data.records || []);
          setMetrics(data.metrics || null);
        }
      } else {
        const query = logLevelFilter !== "ALL" ? `&level=${logLevelFilter}` : "";
        const res = await fetch(`/api/admin/audit?source=SYSTEM_LOGS${query}`);
        const data = await res.json();
        if (res.ok) {
          setSystemLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [viewMode, actionFilter, logLevelFilter]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes("BLOCK") || action.includes("DELETE") || action.includes("FAILED")) {
      return "bg-rose-950/80 text-rose-400 border-rose-800/60";
    }
    if (action.includes("LOGIN") || action.includes("REGISTER") || action.includes("CREATE")) {
      return "bg-emerald-950/80 text-emerald-400 border-emerald-800/60";
    }
    if (action.includes("PLAN") || action.includes("UPDATE")) {
      return "bg-amber-950/80 text-amber-400 border-amber-800/60";
    }
    return "bg-cyan-950/80 text-cyan-400 border-cyan-800/60";
  };

  const getLogLevelBadgeColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-rose-950 text-rose-400 border-rose-800";
      case "WARN":
        return "bg-amber-950 text-amber-400 border-amber-800";
      case "AUDIT":
        return "bg-purple-950 text-purple-400 border-purple-800";
      default:
        return "bg-cyan-950 text-cyan-400 border-cyan-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      {/* ============================================================== */}
      {/* 1. HEADER                                                      */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            GOVERNANÇA & SEGURANÇA SAAS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Auditoria & Logs de Segurança
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Rastreamento de ações administrativas, autenticações de usuários, controle de permissões e
            observabilidade em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MÉTRICAS DE SEGURANÇA                                       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-cyan-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Eventos de Auditoria</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">
            {metrics?.totalAuditRecords ?? "..."}
          </div>
          <span className="text-[10px] text-slate-500">Persistidos no banco</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Logins de Usuários</span>
            <User className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5">
            {metrics?.loginEventsCount ?? "..."}
          </div>
          <span className="text-[10px] text-slate-500">Sessões autenticadas</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Bloqueios & Alertas</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1.5">
            {metrics?.securityBlocksCount ?? "..."}
          </div>
          <span className="text-[10px] text-slate-500">Ações restritivas</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0A0E1A] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Logs em Memória</span>
            <Terminal className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1.5">
            {metrics?.systemLogsBuffered ?? systemLogs.length}
          </div>
          <span className="text-[10px] text-slate-500">Buffer circular ativo</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SWITCHER DE MODO: AUDITORIA VS LOGS DO SISTEMA              */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setViewMode("AUDIT_DB")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition ${
              viewMode === "AUDIT_DB"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Trilha de Auditoria (Prisma)</span>
          </button>

          <button
            onClick={() => setViewMode("SYSTEM_LOGS")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition ${
              viewMode === "SYSTEM_LOGS"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Logs Estruturados em Tempo Real</span>
          </button>
        </div>

        {/* Filtros dinâmicos conforme a aba */}
        <div className="flex items-center gap-2 text-xs">
          {viewMode === "AUDIT_DB" ? (
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="USER_LOGIN">Logins (USER_LOGIN)</option>
              <option value="USER_BLOCKED">Bloqueios de Usuário</option>
              <option value="PLAN_CHANGED">Alterações de Plano</option>
              <option value="API_KEY_CREATED">Chaves Criadas</option>
              <option value="MEMORY_DELETED">Exclusão de Memória</option>
            </select>
          ) : (
            <select
              value={logLevelFilter}
              onChange={(e) => setLogLevelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Níveis</option>
              <option value="AUDIT">AUDIT</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
            </select>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. TABELA DE DADOS (AUDITORIA OU LOGS)                         */}
      {/* ============================================================== */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
          <span>Consultando registros de auditoria...</span>
        </div>
      ) : viewMode === "AUDIT_DB" ? (
        <div className="rounded-2xl bg-[#0A0E1A] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <th className="p-3.5">Data / Hora</th>
                  <th className="p-3.5">Ação</th>
                  <th className="p-3.5">Recurso</th>
                  <th className="p-3.5">Usuário / Ator</th>
                  <th className="p-3.5">IP Origem</th>
                  <th className="p-3.5 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {auditRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                ) : (
                  auditRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(rec.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getActionBadgeColor(
                            rec.action
                          )}`}
                        >
                          {rec.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {rec.resourceType}
                        {rec.resourceId && (
                          <span className="text-slate-500 text-[10px] ml-1">
                            ({rec.resourceId.slice(0, 8)}...)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {rec.actor ? (
                          <div>
                            <div className="font-semibold text-white">{rec.actor.name}</div>
                            <div className="text-[10px] text-slate-500">{rec.actor.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono">SISTEMA</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {rec.ipAddress || "—"}
                      </td>
                      <td className="p-3.5 text-right">
                        {rec.details ? (
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
                          >
                            Ver Payload
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO DE LOGS EM TEMPO REAL */
        <div className="rounded-2xl bg-[#060911] border border-slate-800 p-4 font-mono text-xs overflow-x-auto space-y-2 max-h-[600px] overflow-y-auto">
          {systemLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">Buffer de logs vazio.</div>
          ) : (
            systemLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 leading-relaxed hover:bg-slate-900 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getLogLevelBadgeColor(
                        log.level
                      )}`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-500 text-[11px]">{log.timestamp}</span>
                    {log.route && (
                      <span className="text-cyan-400 font-semibold text-[11px]">{log.route}</span>
                    )}
                    {log.statusCode && (
                      <span
                        className={`text-[10px] px-1 rounded ${
                          log.statusCode < 400 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        HTTP {log.statusCode}
                      </span>
                    )}
                    {log.latencyMs !== undefined && (
                      <span className="text-slate-500 text-[10px]">{log.latencyMs}ms</span>
                    )}
                  </div>
                  <div className="text-slate-200 text-xs">{log.message}</div>
                  {log.metadata && (
                    <div className="p-1.5 bg-black/60 rounded text-[11px] text-slate-400 overflow-x-auto">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL: DETALHES DO EVENTO DE AUDITORIA                      */}
      {/* ============================================================== */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-cyan-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0E1528]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">
                  Evento: {selectedRecord.action}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block mb-1 font-semibold">
                  Payload Sanitizado (Proteção PII Ativa):
                </span>
                <pre className="p-3 bg-black/80 border border-slate-800 rounded-lg text-cyan-300 font-mono text-[11px] overflow-x-auto max-h-60">
                  {selectedRecord.details}
                </pre>
              </div>

              <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-2 border-t border-slate-800">
                <div>ID: {selectedRecord.id}</div>
                <div>Recurso: {selectedRecord.resourceType}</div>
                <div>Data: {new Date(selectedRecord.createdAt).toLocaleString("pt-BR")}</div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0E1528] flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

