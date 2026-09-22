// src/app/dashboard/memory/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Eye,
  Database,
  FileText,
  MessageSquare,
  User,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  Layers,
  Zap,
} from "lucide-react";

interface MemoryItem {
  id: string;
  type: "USER" | "CONVERSATION" | "FILE" | "AGENT";
  typeLabel: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  importance?: number;
  hasEmbedding?: boolean;
  score?: number; // Pontuação quando vindo da busca semântica
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface MemoryMetrics {
  totalMemories: number;
  userFactsCount: number;
  conversationsCount: number;
  fileChunksCount: number;
  agentMemoriesCount: number;
  isPgvectorReady: boolean;
  pgvectorStatus: string;
}

export default function SmartMemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "USER" | "CONVERSATION" | "FILE" | "AGENT">("ALL");

  // Busca semântica
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [searchExecutionMs, setSearchExecutionMs] = useState<number | null>(null);

  // Modais
  const [viewingItem, setViewingItem] = useState<MemoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSyncingFiles, setIsSyncingFiles] = useState(false);

  // Formulário de Criação/Edição
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formCategory, setFormCategory] = useState("GENERAL");
  const [formTags, setFormTags] = useState("");
  const [formImportance, setFormImportance] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  // Carrega memórias e métricas da API
  const fetchMemories = async (scope = activeTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/memory?scope=${scope}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setMetrics(data.metrics || null);
        setIsSemanticMode(false);
        setSearchExecutionMs(null);
      }
    } catch (err) {
      console.error("Erro ao carregar memórias:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories(activeTab);
  }, [activeTab]);

  // Executar Busca Semântica em tempo real
  const handleSemanticSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMemories(activeTab);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch("/api/ai/memory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          scope: activeTab,
          limit: 20,
          minScore: 25,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setItems(data.results || []);
        setIsSemanticMode(true);
        setSearchExecutionMs(data.searchTimeMs);
      }
    } catch (err) {
      console.error("Erro na busca semântica:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Limpar busca semântica
  const handleClearSearch = () => {
    setSearchQuery("");
    fetchMemories(activeTab);
  };

  // Abrir modal de edição
  const handleOpenEdit = (item: MemoryItem) => {
    setEditingItem(item);
    setFormKey(item.title);
    setFormValue(item.content);
    setFormCategory(item.category || "GENERAL");
    setFormTags((item.tags || []).join(", "));
    setFormImportance(item.importance || 3);
  };

  // Salvar nova memória
  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formValue.trim()) return;

    setSubmitting(true);
    try {
      const parsedTags = formTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: formKey.trim(),
          value: formValue.trim(),
          category: formCategory,
          tags: parsedTags,
          importance: formImportance,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao salvar memória.");
        return;
      }

      setIsNewModalOpen(false);
      resetForm();
      fetchMemories(activeTab);
    } catch (err: any) {
      alert("Falha de rede ao salvar memória.");
    } finally {
      setSubmitting(false);
    }
  };

  // Salvar edição
  const handleUpdateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formValue.trim()) return;

    setSubmitting(true);
    try {
      const parsedTags = formTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await fetch("/api/ai/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          type: editingItem.type,
          key: formKey.trim(),
          value: formValue.trim(),
          category: formCategory,
          tags: parsedTags,
          importance: formImportance,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao editar memória.");
        return;
      }

      setEditingItem(null);
      resetForm();
      fetchMemories(activeTab);
    } catch (err: any) {
      alert("Falha de rede ao atualizar memória.");
    } finally {
      setSubmitting(false);
    }
  };

  // Apagar memória
  const handleDeleteMemory = async (id: string, type: string) => {
    if (!confirm("Tem certeza que deseja apagar esta memória permanentemente da base semântica?")) {
      return;
    }

    try {
      const res = await fetch(`/api/ai/memory?id=${id}&type=${type}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Erro ao excluir memória.");
        return;
      }

      setItems((prev) => prev.filter((i) => i.id !== id));
      if (metrics) {
        setMetrics({ ...metrics, totalMemories: Math.max(0, metrics.totalMemories - 1) });
      }
    } catch (err) {
      alert("Falha ao comunicar com o servidor.");
    }
  };

  // Sincronizar arquivos para gerar chunks e vetores
  const handleSyncFiles = async () => {
    setIsSyncingFiles(true);
    try {
      const res = await fetch("/api/ai/memory/sync-files", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Arquivos sincronizados com sucesso!");
        fetchMemories(activeTab);
      } else {
        alert(data.error || "Erro ao indexar arquivos.");
      }
    } catch (err: any) {
      alert("Erro ao sincronizar arquivos: " + err.message);
    } finally {
      setIsSyncingFiles(false);
    }
  };

  const resetForm = () => {
    setFormKey("");
    setFormValue("");
    setFormCategory("GENERAL");
    setFormTags("");
    setFormImportance(3);
  };

  // Helper de ícone por tipo de memória
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "USER":
        return <User className="w-4 h-4 text-cyan-400" />;
      case "CONVERSATION":
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case "FILE":
        return <FileText className="w-4 h-4 text-amber-400" />;
      case "AGENT":
        return <Bot className="w-4 h-4 text-violet-400" />;
      default:
        return <Brain className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ============================================================== */}
      {/* 1. HEADER & STATUS DA ARQUITETURA PGVECTOR                     */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0C1222] via-[#0E162B] to-[#0A0F1D] border border-cyan-500/20 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-neon-cyan shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-wide">
                ORVEXA SMART MEMORY ENGINE
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                VECTOR RAG v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Memória permanente multi-camada: fatos do usuário, histórico de conversas anteriores e
              conhecimento de arquivos autorizados com busca semântica em tempo real.
            </p>
          </div>
        </div>

        {/* Status pgvector & Ações */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSyncFiles}
            disabled={isSyncingFiles}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition disabled:opacity-50"
            title="Indexa novos arquivos do workspace no banco semântico"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncingFiles ? "animate-spin" : ""}`} />
            <span>Sincronizar Arquivos</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsNewModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-neon-cyan transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fato</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MÉTRICAS E STATUS DO PGVECTOR                               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total de Memórias</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {metrics?.totalMemories ?? "..."}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Fragmentos indexados</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fatos do Usuário</span>
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-2">
            {metrics?.userFactsCount ?? "..."}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Preferências e stacks</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Conversas Anteriores</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">
            {metrics?.conversationsCount ?? "..."}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Resumos & Decisões</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Trechos de Arquivos</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">
            {metrics?.fileChunksCount ?? "..."}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Chunks vetoriais</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Postgres + pgvector</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-purple-300 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{metrics?.pgvectorStatus || "Compatível"}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Embeddings 384d L2</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BARRA DE BUSCA SEMÂNTICA EM TEMPO REAL                      */}
      {/* ============================================================== */}
      <div className="bg-[#0A0F1D] border border-slate-800 p-4 rounded-2xl space-y-3">
        <form onSubmit={handleSemanticSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Faça uma pergunta ou busca semântica (ex: 'qual a stack que uso?', 'o que decidimos sobre o banco?')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
          >
            {isSearching ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            )}
            <span>Buscar Semântica</span>
          </button>

          {isSemanticMode && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-white transition"
            >
              Limpar
            </button>
          )}
        </form>

        {isSemanticMode && searchExecutionMs !== null && (
          <div className="flex items-center justify-between text-[11px] text-cyan-400 font-mono px-1">
            <span>
              ✓ Busca semântica vetorial concluída em {searchExecutionMs}ms. Mostrando {items.length} resultado(s) ordenados por similaridade de cosseno.
            </span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. ABAS DE FILTRO POR CAMADA DE MEMÓRIA                        */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg transition font-medium ${
              activeTab === "ALL"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Todas as Memórias ({metrics?.totalMemories ?? 0})
          </button>

          <button
            onClick={() => setActiveTab("USER")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition font-medium ${
              activeTab === "USER"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Fatos do Usuário ({metrics?.userFactsCount ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("CONVERSATION")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition font-medium ${
              activeTab === "CONVERSATION"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Conversas Anteriores ({metrics?.conversationsCount ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("FILE")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition font-medium ${
              activeTab === "FILE"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Conhecimento de Arquivos ({metrics?.fileChunksCount ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("AGENT")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition font-medium ${
              activeTab === "AGENT"
                ? "bg-violet-500/15 text-violet-300 border border-violet-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Agentes ({metrics?.agentMemoriesCount ?? 0})</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. LISTA DE ITENS DE MEMÓRIA (CARDS COM AÇÕES DE CRUD)         */}
      {/* ============================================================== */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
          <span>Carregando base de conhecimento semântico...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <Brain className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
          <p className="text-sm font-semibold text-slate-300">Nenhuma memória encontrada</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isSemanticMode
              ? "Nenhum resultado acima do limiar semântico para a busca realizada."
              : "Converse no chat, faça upload de documentos ou crie fatos manualmente para expandir o conhecimento da IA."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group space-y-3"
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    {getTypeIcon(item.type)}
                    <span className="font-bold text-xs text-white truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.score !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {item.score}% relevância
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {item.typeLabel}
                    </span>
                  </div>
                </div>

                {/* Conteúdo / Resumo */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {item.content}
                </p>
              </div>

              {/* Rodapé: Tags, Embedding e Ações (Visualizar / Editar / Apagar) */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {item.tags && item.tags.length > 0 ? (
                    item.tags.slice(0, 3).map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono"
                      >
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.category || "GENERAL"}
                    </span>
                  )}
                  {item.hasEmbedding && (
                    <span
                      className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50"
                      title="Vetor 384d gerado para busca por pgvector"
                    >
                      Vector 384d
                    </span>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setViewingItem(item)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
                    title="Visualizar detalhes da memória"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition"
                    title="Editar memória"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteMemory(item.id, item.type)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                    title="Apagar memória permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODAL: VISUALIZAR MEMÓRIA (DETALHES COMPLETOS)              */}
      {/* ============================================================== */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-cyan-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0E1528]">
              <div className="flex items-center gap-2">
                {getTypeIcon(viewingItem.type)}
                <h3 className="font-bold text-white text-sm truncate">{viewingItem.title}</h3>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              <div>
                <span className="text-slate-400 text-[11px] block mb-1 font-semibold">
                  Conteúdo Armazenado:
                </span>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {viewingItem.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block">Tipo de Registro:</span>
                  <span className="font-semibold text-white mt-0.5 block">{viewingItem.typeLabel}</span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block">Categoria:</span>
                  <span className="font-semibold text-cyan-400 mt-0.5 block">
                    {viewingItem.category || "GENERAL"}
                  </span>
                </div>
              </div>

              {viewingItem.tags && viewingItem.tags.length > 0 && (
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1 font-semibold">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {viewingItem.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-2 border-t border-slate-800">
                <div>ID: {viewingItem.id}</div>
                <div>Criado em: {new Date(viewingItem.createdAt).toLocaleString("pt-BR")}</div>
                <div>Atualizado em: {new Date(viewingItem.updatedAt).toLocaleString("pt-BR")}</div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0E1528] flex justify-end">
              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL: EDITAR MEMÓRIA (CONTROLE SOLICITADO PELO USUÁRIO)    */}
      {/* ============================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0E1528]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Editar Registro de Memória</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMemory} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Identificador / Título:
                </label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Conteúdo:</label>
                <textarea
                  rows={4}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="GENERAL">Geral</option>
                    <option value="FACT">Fato Pessoal</option>
                    <option value="PREFERENCE">Preferência</option>
                    <option value="PROJECT">Projeto</option>
                    <option value="CODING">Programação</option>
                    <option value="BUSINESS">Negócios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Importância (1 a 5):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={formImportance}
                    onChange={(e) => setFormImportance(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tags (separadas por vírgula):
                </label>
                <input
                  type="text"
                  placeholder="Ex: react, auth, empresa, meta"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL: ADICIONAR NOVA MEMÓRIA / FATO                         */}
      {/* ============================================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0E1528]">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Adicionar Novo Fato à Memória</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Chave / Identificador:
                </label>
                <input
                  type="text"
                  placeholder="Ex: OBJETIVO_TRIMESTRAL ou STACK_FAVORITA"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Conteúdo / Fato a Memorizar:
                </label>
                <textarea
                  rows={4}
                  placeholder="Ex: O usuário planeja lançar uma plataforma SaaS de delivery no terceiro trimestre..."
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="GENERAL">Geral</option>
                    <option value="FACT">Fato Pessoal</option>
                    <option value="PREFERENCE">Preferência</option>
                    <option value="PROJECT">Projeto</option>
                    <option value="CODING">Programação</option>
                    <option value="BUSINESS">Negócios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Importância (1 a 5):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={formImportance}
                    onChange={(e) => setFormImportance(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tags (separadas por vírgula):
                </label>
                <input
                  type="text"
                  placeholder="Ex: saas, delivery, meta2026"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition disabled:opacity-50"
                >
                  {submitting ? "Adicionando..." : "Adicionar à Memória"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
