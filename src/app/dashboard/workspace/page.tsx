"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FolderGit2,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  Archive,
  Download,
  Trash2,
  Eye,
  MessageSquare,
  Sparkles,
  Search,
  RefreshCw,
  Plus,
  Check,
  Copy,
  X,
  Layers,
  AlertCircle,
  FileCheck,
  ChevronRight,
  HardDrive,
  ZoomIn,
} from "lucide-react";

interface WorkspaceFile {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  category: "DOCUMENT" | "SPREADSHEET" | "PRESENTATION" | "IMAGE" | "CODE" | "ARCHIVE";
  isGenerated: boolean;
  conversationId?: string | null;
  previewData?: any;
  hasText: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  totalFiles: number;
}

export default function WorkspacePage() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [storage, setStorage] = useState<StorageStats>({
    usedBytes: 0,
    quotaBytes: 524288000,
    percentUsed: 0,
    totalFiles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal de Preview
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<any | null>(null);
  const [activeSheetTab, setActiveSheetTab] = useState(0);

  // Modal de Criação com IA
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"XLSX" | "CSV" | "ZIP" | "REPORT">("XLSX");
  const [createTitle, setCreateTitle] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [generatingFile, setGeneratingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega lista de arquivos e métricas de storage
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") {
        if (categoryFilter === "GENERATED") {
          params.set("isGenerated", "true");
        } else {
          params.set("category", categoryFilter);
        }
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/workspace/files?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
        if (data.storage) {
          setStorage(data.storage);
        }
      } else {
        setError(data.error || "Erro ao carregar arquivos.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [categoryFilter]);

  // Upload múltiplo
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();

    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }

    try {
      const res = await fetch("/api/workspace/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha no upload.");
      }
      await fetchFiles();
    } catch (err: any) {
      setError(err.message || "Erro ao enviar arquivos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Exclusão de arquivo
  const handleDeleteFile = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este arquivo do Workspace?")) return;
    try {
      const res = await fetch(`/api/workspace/files/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        if (previewFile?.id === id) setPreviewFile(null);
        fetchFiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Abertura do Modal de Preview
  const handleOpenPreview = async (file: WorkspaceFile) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setActiveSheetTab(0);
    try {
      const res = await fetch(`/api/workspace/files/${file.id}`);
      const data = await res.json();
      if (res.ok && data.file) {
        setPreviewDetail(data.file);
      } else {
        setPreviewDetail(file);
      }
    } catch {
      setPreviewDetail(file);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Criação de novo arquivo com IA
  const handleGenerateFileWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    setGeneratingFile(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: createType,
          title: createTitle,
          prompt: createPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao gerar arquivo.");
      }

      setCreateModalOpen(false);
      setCreateTitle("");
      setCreatePrompt("");
      await fetchFiles();
      if (data.file) {
        handleOpenPreview(data.file);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao gerar arquivo com IA.");
    } finally {
      setGeneratingFile(false);
    }
  };

  // Helpers de formatação
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (file: WorkspaceFile) => {
    switch (file.category) {
      case "SPREADSHEET":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case "IMAGE":
        return <ImageIcon className="w-5 h-5 text-purple-400" />;
      case "CODE":
        return <FileCode className="w-5 h-5 text-cyan-400" />;
      case "ARCHIVE":
        return <Archive className="w-5 h-5 text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Principal */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <FolderGit2 className="w-3.5 h-3.5" />
            ORVEXA WORKSPACE • GESTÃO PROFISSIONAL DE ARQUIVOS & IA
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Workspace de Arquivos & Inteligência Documental
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Área de trabalho unificada: envie múltiplos arquivos (<strong>PDF, DOCX, XLSX, CSV, PPTX, Imagens, ZIP</strong>),
            visualize com preview interativo, converse no chat e gere novos documentos via IA.
          </p>
        </div>

        {/* Botões de Ação Topo */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleUploadFiles}
            className="hidden"
            accept=".pdf,.docx,.xlsx,.xls,.csv,.pptx,.txt,.json,.zip,image/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <UploadCloud className="w-4 h-4 text-cyan-400" />}
            {uploading ? "Enviando Arquivos..." : "Upload de Arquivos"}
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs shadow-neon-glow flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Criar Arquivo com IA
          </button>
        </div>
      </div>

      {/* Barra de Armazenamento & Quota */}
      <div className="p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Armazenamento em Nuvem do Workspace</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
              {storage.totalFiles} arquivos
            </span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            <span className="text-white font-bold">{formatBytes(storage.usedBytes)}</span> de{" "}
            <span>{formatBytes(storage.quotaBytes)}</span> ({storage.percentUsed}%)
          </div>
        </div>
        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, storage.percentUsed)}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "Todos os Arquivos" },
            { id: "DOCUMENT", label: "Documentos (PDF/DOCX)" },
            { id: "SPREADSHEET", label: "Planilhas (XLSX/CSV)" },
            { id: "IMAGE", label: "Imagens" },
            { id: "CODE", label: "Código & ZIP" },
            { id: "GENERATED", label: "✨ Gerados por IA" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchFiles();
          }}
          className="relative min-w-[260px]"
        >
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar nos arquivos ou texto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[#0A0E1A] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </form>
      </div>

      {/* Lista de Arquivos */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-[#0A0E1A] border border-slate-800 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs text-slate-400">Carregando arquivos do workspace...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#0A0E1A] border border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
          <UploadCloud className="w-12 h-12 text-slate-700" />
          <div className="max-w-md">
            <h3 className="text-sm font-bold text-white mb-1">Nenhum arquivo encontrado</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Arraste arquivos para esta página ou clique no botão <strong>Upload de Arquivos</strong> acima para iniciar.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-neon-glow"
          >
            Fazer Primeiro Upload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-[#0A0E1A] border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-cyan-500/30 transition-colors">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex items-center gap-1">
                    {file.isGenerated && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
                        IA
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-800">
                      {formatBytes(file.sizeBytes)}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-white truncate max-w-full group-hover:text-cyan-300 transition-colors" title={file.name}>
                  {file.name}
                </h3>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                  <span>{new Date(file.createdAt).toLocaleDateString("pt-BR")}</span>
                  <span>•</span>
                  <span>{file.category}</span>
                </div>
              </div>

              {/* Ações do Card */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-1">
                <button
                  onClick={() => handleOpenPreview(file)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Preview
                </button>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/dashboard/chat?fileId=${file.id}&fileName=${encodeURIComponent(file.name)}`}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Conversar sobre este arquivo"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Link>

                  <a
                    href={`/api/workspace/files/${file.id}/download`}
                    download
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors"
                    title="Baixar arquivo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-500 hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE PREVIEW INTERATIVO */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0A0E1A] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  {getFileIcon(previewFile)}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white truncate max-w-[300px] sm:max-w-md">
                    {previewFile.name}
                  </h2>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {formatBytes(previewFile.sizeBytes)} • {previewFile.category}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/workspace/files/${previewFile.id}/download`}
                  download
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {previewLoading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                  <span className="text-xs text-slate-400">Carregando visualização...</span>
                </div>
              ) : (
                <>
                  {/* PREVIEW DE PLANILHA COM ABAS E TABELA INTERATIVA */}
                  {previewDetail?.previewData?.type === "SPREADSHEET" && previewDetail.previewData.sheets?.length > 0 && (
                    <div className="space-y-4">
                      {/* Abas da planilha */}
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                        {previewDetail.previewData.sheets.map((sheet: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setActiveSheetTab(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              activeSheetTab === idx
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-900 text-slate-400 hover:text-white"
                            }`}
                          >
                            {sheet.name || `Aba ${idx + 1}`}
                          </button>
                        ))}
                      </div>

                      {/* Tabela Interativa */}
                      {previewDetail.previewData.sheets[activeSheetTab] && (
                        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/60 max-h-[400px]">
                          <table className="w-full text-xs text-left text-slate-200">
                            <thead className="text-[11px] text-cyan-300 bg-slate-900/90 border-b border-slate-800 sticky top-0">
                              <tr>
                                {previewDetail.previewData.sheets[activeSheetTab].headers?.map((h: string, i: number) => (
                                  <th key={i} className="px-4 py-2.5 font-bold whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {previewDetail.previewData.sheets[activeSheetTab].rows?.map((row: any[], rowIdx: number) => (
                                <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                                  {row.map((cell: any, cellIdx: number) => (
                                    <td key={cellIdx} className="px-4 py-2 whitespace-nowrap">
                                      {cell != null ? String(cell) : ""}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PREVIEW DE IMAGEM */}
                  {previewDetail?.previewData?.type === "IMAGE" && previewDetail.previewData.dataUrl && (
                    <div className="flex items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                      <img
                        src={previewDetail.previewData.dataUrl}
                        alt={previewFile.name}
                        className="max-h-[500px] w-auto object-contain rounded-lg shadow-2xl"
                      />
                    </div>
                  )}

                  {/* PREVIEW DE PDF */}
                  {previewDetail?.previewData?.type === "PDF" && (
                    <div className="space-y-3">
                      {previewDetail.previewData.dataUrl ? (
                        <iframe
                          src={previewDetail.previewData.dataUrl}
                          className="w-full h-[500px] rounded-xl border border-slate-800 bg-slate-900"
                        />
                      ) : (
                        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                          {previewDetail.extractedText || "Documento PDF indexado com sucesso."}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PREVIEW DE TEXTO, DOCUMENTO OU CÓDIGO */}
                  {(!previewDetail?.previewData?.type || previewDetail?.previewData?.type === "TEXT") && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                        {previewDetail?.extractedText || "Nenhum texto legível extraído deste arquivo."}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <Link
                href={`/dashboard/chat?fileId=${previewFile.id}&fileName=${encodeURIComponent(previewFile.name)}`}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Conversar sobre este documento no Chat
              </Link>

              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE NOVO ARQUIVO COM IA */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0A0E1A] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Criar Novo Arquivo com IA</h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateFileWithAi} className="p-5 space-y-4">
              {/* Formato */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Arquivo a Gerar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "XLSX", label: "Planilha Excel (.xlsx)", icon: FileSpreadsheet },
                    { id: "CSV", label: "Tabela CSV (.csv)", icon: FileSpreadsheet },
                    { id: "REPORT", label: "Relatório Executivo (.md)", icon: FileText },
                    { id: "ZIP", label: "Pacote de Código (.zip)", icon: Archive },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = createType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCreateType(item.id as any)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Arquivo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fluxo de Caixa Q2 2026"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Instruções */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Instruções para a IA (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Crie uma planilha com receitas projetadas, custos fixos e variáveis, margem de contribuição e soma total..."
                  value={createPrompt}
                  onChange={(e) => setCreatePrompt(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={generatingFile || !createTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs shadow-neon-glow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {generatingFile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {generatingFile ? "Gerando Arquivo..." : "Gerar e Salvar no Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

