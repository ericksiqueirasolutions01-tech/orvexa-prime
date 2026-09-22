"use client";

import { useEffect, useState } from "react";
import {
  Database,
  ShieldCheck,
  RefreshCw,
  Download,
  RotateCcw,
  Trash2,
  HardDrive,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  FileArchive,
  Layers,
  FileText,
  Lock,
  X,
} from "lucide-react";

interface BackupItem {
  id: string;
  type: "FULL" | "DATABASE" | "FILES";
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  checksumSha256: string;
  status: "SUCCESS" | "RESTORED" | "FAILED" | "IN_PROGRESS";
  isAutomatic: boolean;
  counts: {
    users: number;
    plans: number;
    conversations: number;
    messages: number;
    files: number;
    memories: number;
    payments: number;
    auditLogs: number;
  };
  durationMs: number;
  createdAt: string;
  restoredAt?: string;
}

interface BackupStats {
  totalBackups: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  lastBackup: BackupItem | null;
  healthy: boolean;
  retentionLimit: number;
}

interface BackupAuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
  } | null;
}

export default function AdminBackupPage() {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [logs, setLogs] = useState<BackupAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"FULL" | "DATABASE" | "FILES">("FULL");
  const [createNotes, setCreateNotes] = useState("");

  const [restoreModalItem, setRestoreModalItem] = useState<BackupItem | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

  const fetchBackupData = async () => {
    try {
      const res = await fetch("/api/admin/backup");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setBackups(data.backups || []);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupData();
  }, []);

  const handleCreateBackup = async () => {
    setActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: createType,
          notes: createNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar backup.");

      setNotification({
        type: "success",
        message: `Backup ${data.backup.type} gerado com sucesso! Arquivo: ${data.backup.fileName} (${data.backup.fileSizeFormatted})`,
      });
      setShowCreateModal(false);
      setCreateNotes("");
      await fetchBackupData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreModalItem) return;
    if (restoreConfirmText !== "RESTAURAR") {
      alert("Por favor digite 'RESTAURAR' para confirmar a operação de risco.");
      return;
    }

    setActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/backup/${restoreModalItem.id}/restore`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na restauração.");

      setNotification({
        type: "success",
        message: `Sistema restaurado com sucesso! Snapshot preventivo de segurança criado com ID: ${data.result.preRestoreSafetyBackupId}`,
      });
      setRestoreModalItem(null);
      setRestoreConfirmText("");
      await fetchBackupData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBackup = async (id: string, fileName: string) => {
    if (!confirm(`Deseja realmente excluir permanentemente a versão de backup '${fileName}'?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/backup/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir backup.");
      }

      setNotification({
        type: "success",
        message: `Versão '${fileName}' excluída com sucesso.`,
      });
      await fetchBackupData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const lastBackup = stats?.lastBackup;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0D1322] via-[#09172B] to-[#0A1624] border border-cyan-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              ADMIN → BACKUP & DISASTER RECOVERY
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Backup, Restauração & Integridade
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold">
                SHA-256 ATIVO
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl leading-relaxed">
              Snapshots automáticos e manuais do banco de dados relacional e arquivos de workspace em pacotes ZIP compactados com histórico de versões.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBackupData}
              disabled={loading}
              className="p-3 rounded-2xl bg-[#080C14]/80 border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all shadow-neon-glow flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Criar Backup Agora
            </button>
          </div>
        </div>
      </div>

      {/* Notificação Flutuante */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs animate-fadeIn ${
            notification.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/60 border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Cards de Métricas Solicitados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. ÚLTIMO BACKUP */}
        <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-cyan-400" />
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                lastBackup
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {lastBackup ? "SNAPSHOT RECENTE" : "NENHUM"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Último Backup</span>
            <div className="text-sm font-black text-white mt-1 truncate">
              {lastBackup ? new Date(lastBackup.createdAt).toLocaleString("pt-BR") : "Aguardando geração"}
            </div>
            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
              {lastBackup ? lastBackup.fileName : "Inicie o primeiro backup"}
            </span>
          </div>
        </div>

        {/* 2. TAMANHO TOTAL */}
        <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              DISCO LOCAL
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Tamanho dos Backups</span>
            <div className="text-2xl font-black text-white mt-1">
              {stats?.totalSizeFormatted || "0 B"}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Compactação ZIP DEFLATE ativa
            </span>
          </div>
        </div>

        {/* 3. STATUS DO SISTEMA */}
        <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Status da Proteção</span>
            <div className="text-base font-black text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>OPERACIONAL</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Integridade verificada via SHA-256
            </span>
          </div>
        </div>

        {/* 4. HISTÓRICO DE VERSÕES */}
        <div className="p-5 rounded-3xl bg-[#0D1322] border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/30">
              ROTATIVO
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Versões Mantidas</span>
            <div className="text-2xl font-black text-white mt-1">
              {stats?.totalBackups || 0}{" "}
              <span className="text-xs font-normal text-slate-500">/ {stats?.retentionLimit || 15} max</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Expurgo automático ativado
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABELA DE HISTÓRICO DE VERSÕES */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-cyan-400" />
              Histórico de Versões & Pontos de Restauração
            </h2>
            <p className="text-xs text-slate-400">
              Selecione qualquer snapshot para download offsite ou restauração em caso de incidente operacional.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-4">
          {backups.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileArchive className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhum backup gerado ainda no catálogo.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Criar Primeiro Backup
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3">TIPO</th>
                    <th className="pb-3">ARQUIVO / CHECKSUM</th>
                    <th className="pb-3">DATA / HORA</th>
                    <th className="pb-3">TAMANHO</th>
                    <th className="pb-3">REGISTROS</th>
                    <th className="pb-3">STATUS</th>
                    <th className="pb-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-850/40">
                      {/* Tipo */}
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                            b.type === "FULL"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              : b.type === "DATABASE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                          }`}
                        >
                          {b.type}
                        </span>
                      </td>

                      {/* Arquivo / SHA */}
                      <td className="py-3.5">
                        <div className="font-mono text-white text-xs truncate max-w-xs">{b.fileName}</div>
                        <span className="text-[10px] font-mono text-slate-500 block truncate">
                          SHA: {b.checksumSha256.slice(0, 16)}...
                        </span>
                      </td>

                      {/* Data / Hora */}
                      <td className="py-3.5 text-slate-300">
                        {new Date(b.createdAt).toLocaleDateString("pt-BR")}{" "}
                        <span className="text-slate-500 text-[11px]">
                          {new Date(b.createdAt).toLocaleTimeString("pt-BR")}
                        </span>
                      </td>

                      {/* Tamanho */}
                      <td className="py-3.5 font-mono text-cyan-400 font-bold">{b.fileSizeFormatted}</td>

                      {/* Registros */}
                      <td className="py-3.5 text-slate-300 text-[11px]">
                        {b.counts ? (
                          <span>
                            {b.counts.users} users • {b.counts.conversations} convs • {b.counts.files} arqs
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            b.status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : b.status === "RESTORED"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}
                        >
                          {b.status === "RESTORED" ? "RESTAURADO" : "ÍNDICE OK"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Opção Restaurar */}
                          <button
                            onClick={() => {
                              setRestoreModalItem(b);
                              setRestoreConfirmText("");
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1"
                            title="Restaurar este ponto de backup"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>

                          {/* Download ZIP */}
                          <a
                            href={`/api/admin/backup/${b.id}/download`}
                            download={b.fileName}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                            title="Download .ZIP para retenção externa"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Excluir Versão */}
                          <button
                            onClick={() => handleDeleteBackup(b.id, b.fileName)}
                            className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition-all"
                            title="Excluir versão do histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO DE LOGS DE AUDITORIA DE BACKUP */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Logs de Auditoria de Backup & Restauração
        </h2>

        <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Nenhum evento registrado no log.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                let detailsObj: any = {};
                try {
                  detailsObj = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
                } catch {}

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                          log.action === "BACKUP_RESTORED"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : log.action === "BACKUP_CREATED"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-slate-300 truncate font-mono">
                        {detailsObj.fileName || detailsObj.type || log.id.slice(0, 8)}
                      </span>
                      {log.actor && (
                        <span className="text-slate-500 text-[10px]">por {log.actor.name || log.actor.email}</span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CRIAR BACKUP MANUAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0D1322] border border-cyan-500/40 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Criar Novo Ponto de Backup
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Tipo de Backup:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "FULL", label: "Completo", desc: "Banco + Arquivos" },
                    { id: "DATABASE", label: "Somente Banco", desc: "Tabelas + SQLite" },
                    { id: "FILES", label: "Somente Arquivos", desc: "Workspace RAG" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCreateType(t.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        createType === t.id
                          ? "bg-cyan-950/60 border-cyan-500 text-white shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs">{t.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Notas / Motivo do Snapshot (Opcional):
                </label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Ex: Antes da atualização de versão v2.4..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>• O backup gerará um arquivo `.zip` com compactação DEFLATE.</p>
                <p>• Um hash SHA-256 será computado para validação contínua de integridade.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all shadow-neon-glow flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Gerando Backup...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Iniciar Backup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR RESTAURAÇÃO */}
      {/* ========================================================================= */}
      {restoreModalItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0E101A] border-2 border-amber-500/50 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Confirmar Restauração do Sistema
              </h3>
              <button onClick={() => setRestoreModalItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <Lock className="w-4 h-4 text-amber-400" /> AVISO DE SEGURANÇA CRÍTICO
              </p>
              <p className="leading-relaxed">
                Você está prestes a restaurar o sistema para o estado de{" "}
                <strong>{new Date(restoreModalItem.createdAt).toLocaleString("pt-BR")}</strong>.
              </p>
              <p className="text-[11px] text-amber-300/80">
                Um <strong>snapshot preventivo automático</strong> será gerado antes da operação para garantir que nenhum dado seja perdido caso você deseje reverter.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between font-mono">
                <span className="text-slate-500">Arquivo:</span>
                <span className="text-white truncate max-w-xs">{restoreModalItem.fileName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between font-mono">
                <span className="text-slate-500">Tamanho:</span>
                <span className="text-cyan-400 font-bold">{restoreModalItem.fileSizeFormatted}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Digite <strong className="text-amber-400">RESTAURAR</strong> para confirmar:
              </label>
              <input
                type="text"
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                placeholder="RESTAURAR"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreModalItem(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={actionLoading || restoreConfirmText !== "RESTAURAR"}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  restoreConfirmText === "RESTAURAR" && !actionLoading
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Restaurando Sistema...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Confirmar Restauração
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

