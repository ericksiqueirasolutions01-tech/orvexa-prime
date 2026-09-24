// src/app/dashboard/layout.tsx
// LAYOUT PRINCIPAL DO CLIENTE ESTILO CHATGPT — ORVEXA PRIME (TEMA CLARO & OBJETIVO)

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  MessageSquarePlus,
  Search,
  FolderGit2,
  Bot,
  Globe,
  Cpu,
  Settings,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Menu,
} from "lucide-react";

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  messagesCount: number;
}

interface AgentItem {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  description: string;
  badge?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get("c");

  const [userData, setUserData] = useState<any>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Edição inline de título de conversa
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Modal de Agentes Disponíveis
  const [agentsModalOpen, setAgentsModalOpen] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<AgentItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // 1. Carrega dados do usuário autenticado
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data?.authenticated) {
        setUserData(data.user);
      }
    } catch {}
  }, [router]);

  // 2. Carrega histórico de conversas do usuário
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Erro ao carregar conversas:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // 3. Carrega agentes compatíveis disponíveis
  const fetchAgents = useCallback(async () => {
    try {
      setLoadingAgents(true);
      const res = await fetch("/api/ai/agents");
      if (res.ok) {
        const data = await res.json();
        setAvailableAgents(data.agents || []);
      }
    } catch {}
    finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    fetchConversations();
  }, [fetchUserData, fetchConversations]);

  // Listener para recarregar conversas quando uma mensagem nova for enviada
  useEffect(() => {
    const handleUpdate = () => fetchConversations();
    window.addEventListener("orvexa-conversations-updated", handleUpdate);
    return () => window.removeEventListener("orvexa-conversations-updated", handleUpdate);
  }, [fetchConversations]);

  // Fechar menu mobile ao trocar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, activeConversationId]);

  // Logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Renomear conversa
  const handleStartRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) return;

    try {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
        );
        setEditingId(null);
      }
    } catch {}
  };

  // Excluir conversa
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Excluir esta conversa?")) return;

    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          router.push("/dashboard/chat");
        }
      }
    } catch {}
  };

  // Agrupamento temporal estilo ChatGPT
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const today: ConversationItem[] = [];
    const yesterday: ConversationItem[] = [];
    const last7Days: ConversationItem[] = [];
    const older: ConversationItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const sevenDaysAgo = todayStart - 6 * 86400000;

    for (const c of filtered) {
      const date = new Date(c.updatedAt).getTime();
      if (date >= todayStart) {
        today.push(c);
      } else if (date >= yesterdayStart) {
        yesterday.push(c);
      } else if (date >= sevenDaysAgo) {
        last7Days.push(c);
      } else {
        older.push(c);
      }
    }

    return { today, yesterday, last7Days, older };
  }, [conversations, searchQuery]);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col md:flex-row antialiased font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Header Mobile */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard/chat" className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0">
            <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-slate-900 tracking-tight">ORVEXA PRIME</div>
            <div className="text-[10px] text-slate-500">IA Inteligente</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/chat"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Novo Chat"
          >
            <Plus className="w-4 h-4" />
          </Link>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-[#F9FAFB] border-r border-slate-200 p-4 flex flex-col justify-between h-full z-10 shadow-2xl overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <Link href="/dashboard/chat" className="flex items-center gap-2.5">
                  <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0">
                    <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
                  </div>
                  <span className="font-bold text-sm text-slate-900">ORVEXA PRIME</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Botão Novo Chat */}
              <Link
                href="/dashboard/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs transition-all"
              >
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Novo Chat</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  +
                </span>
              </Link>

              {/* Navegação Rápida */}
              <div className="space-y-1 pt-2">
                <Link
                  href="/dashboard/workspace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-all"
                >
                  <FolderGit2 className="w-4 h-4 text-cyan-600" />
                  <span>Projetos</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    fetchAgents();
                    setAgentsModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-all text-left"
                >
                  <Bot className="w-4 h-4 text-blue-600" />
                  <span>Agentes</span>
                </button>
                <Link
                  href="/dashboard/landing-builder"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-all"
                >
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Criador de Landing Page</span>
                </Link>
                <Link
                  href="/dashboard/system-builder"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-all"
                >
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span>Criador de SaaS / Sistema</span>
                </Link>
              </div>

              {/* Histórico Simplificado Mobile */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-2">
                  Histórico Recente
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {conversations.slice(0, 10).map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/chat?c=${c.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-xs truncate ${
                        activeConversationId === c.id
                          ? "bg-slate-200 font-bold text-slate-900"
                          : "text-slate-600 hover:bg-slate-200/50"
                      }`}
                    >
                      {c.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Rodapé Mobile */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              {userData?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Painel Administrativo
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Desktop Estilo ChatGPT */}
      {sidebarOpen ? (
        <aside className="hidden md:flex w-64 bg-[#F9FAFB] border-r border-slate-200 p-3.5 flex-col justify-between shrink-0 h-screen sticky top-0 overflow-hidden">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Top Bar: Marca + Botão Recolher */}
            <div className="flex items-center justify-between px-1 mb-3">
              <Link href="/dashboard/chat" className="flex items-center gap-2.5">
                <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0">
                  <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
                </div>
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  ORVEXA PRIME
                </span>
              </Link>

              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Recolher barra lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Botão Principal: + Novo Chat */}
            <Link
              href="/dashboard/chat"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs transition-all mb-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4" />
                <span>Novo Chat</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                ⌘N
              </span>
            </Link>

            {/* Campo de Busca Rápida */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Atalhos Rápidos da Plataforma */}
            <div className="space-y-0.5 pb-3 border-b border-slate-200">
              <Link
                href="/dashboard/workspace"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  pathname === "/dashboard/workspace"
                    ? "bg-slate-200/80 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <FolderGit2 className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Projetos</span>
              </Link>

              <button
                onClick={() => {
                  fetchAgents();
                  setAgentsModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-all text-left"
              >
                <Bot className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Agentes</span>
              </button>

              <Link
                href="/dashboard/landing-builder"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  pathname === "/dashboard/landing-builder"
                    ? "bg-slate-200/80 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Criador de Landing Page</span>
              </Link>

              <Link
                href="/dashboard/system-builder"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  pathname === "/dashboard/system-builder"
                    ? "bg-slate-200/80 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Cpu className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Criador de SaaS / Sistema</span>
              </Link>
            </div>

            {/* Histórico de Conversas Agrupado */}
            <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {conversations.length === 0 && !loadingConversations ? (
                <div className="text-center py-6 px-3">
                  <p className="text-xs text-slate-400">Nenhuma conversa recente.</p>
                </div>
              ) : null}

              {/* Hoje */}
              {groupedConversations.today.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                    Hoje
                  </span>
                  <div className="space-y-0.5">
                    {groupedConversations.today.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        isActive={activeConversationId === conv.id}
                        isEditing={editingId === conv.id}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        onSaveRename={(e) => handleSaveRename(conv.id, e)}
                        onCancelRename={() => setEditingId(null)}
                        onStartRename={(e) => handleStartRename(conv, e)}
                        onDelete={(e) => handleDeleteConversation(conv.id, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ontem */}
              {groupedConversations.yesterday.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                    Ontem
                  </span>
                  <div className="space-y-0.5">
                    {groupedConversations.yesterday.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        isActive={activeConversationId === conv.id}
                        isEditing={editingId === conv.id}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        onSaveRename={(e) => handleSaveRename(conv.id, e)}
                        onCancelRename={() => setEditingId(null)}
                        onStartRename={(e) => handleStartRename(conv, e)}
                        onDelete={(e) => handleDeleteConversation(conv.id, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Últimos 7 dias */}
              {groupedConversations.last7Days.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                    Últimos 7 dias
                  </span>
                  <div className="space-y-0.5">
                    {groupedConversations.last7Days.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        isActive={activeConversationId === conv.id}
                        isEditing={editingId === conv.id}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        onSaveRename={(e) => handleSaveRename(conv.id, e)}
                        onCancelRename={() => setEditingId(null)}
                        onStartRename={(e) => handleStartRename(conv, e)}
                        onDelete={(e) => handleDeleteConversation(conv.id, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Anteriores */}
              {groupedConversations.older.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                    Anteriores
                  </span>
                  <div className="space-y-0.5">
                    {groupedConversations.older.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        isActive={activeConversationId === conv.id}
                        isEditing={editingId === conv.id}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        onSaveRename={(e) => handleSaveRename(conv.id, e)}
                        onCancelRename={() => setEditingId(null)}
                        onStartRename={(e) => handleStartRename(conv, e)}
                        onDelete={(e) => handleDeleteConversation(conv.id, e)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé Desktop */}
            <div className="pt-3 border-t border-slate-200 mt-2 space-y-1 shrink-0">
              {userData?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all mb-1"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Painel Admin</span>
                  </div>
                  <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    MASTER
                  </span>
                </Link>
              )}

              {/* Usuário Pill */}
              <div className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-slate-200/50 transition-colors">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {userData?.name ? userData.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="truncate text-left">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {userData?.name || "Usuário"}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{userData?.email}</div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Encerrar Sessão"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      ) : (
        /* Barra Lateral Recolhida (Botão Flutuante para Expandir) */
        <aside className="hidden md:flex flex-col items-center justify-between py-4 px-2 bg-[#F9FAFB] border-r border-slate-200 shrink-0 h-screen sticky top-0">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
              title="Expandir barra lateral"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <Link
              href="/dashboard/chat"
              className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              title="Novo Chat"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </Link>

            <Link
              href="/dashboard/workspace"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Projetos"
            >
              <FolderGit2 className="w-4 h-4 text-cyan-600" />
            </Link>

            <Link
              href="/dashboard/landing-builder"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Criador de Landing Page"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
            </Link>

            <Link
              href="/dashboard/system-builder"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Criador de SaaS / Sistema"
            >
              <Cpu className="w-4 h-4 text-purple-600" />
            </Link>
          </div>

          <div className="flex flex-col items-center gap-2">
            {userData?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="p-2 rounded-xl text-cyan-600 hover:bg-cyan-50 transition-colors"
                title="Painel Admin"
              >
                <ShieldCheck className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Área Central / Conteúdo Principal */}
      <main
        className={`flex-1 overflow-y-auto min-h-screen bg-white ${
          pathname === "/dashboard/chat" ? "p-0 overflow-hidden h-screen" : "p-6 lg:p-10"
        }`}
      >
        {children}
      </main>

      {/* Modal de Agentes Disponíveis */}
      {agentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Agentes de IA Disponíveis
                </h3>
              </div>
              <button
                onClick={() => setAgentsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Estes são os agentes especializados compatíveis e ativos com o provedor de IA atual.
              Selecione um agente para iniciar uma conversa focada.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {availableAgents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {loadingAgents ? "Carregando agentes..." : "Nenhum agente ativo no momento."}
                </div>
              ) : (
                availableAgents.map((ag) => (
                  <button
                    key={ag.id}
                    onClick={() => {
                      setAgentsModalOpen(false);
                      router.push(`/dashboard/chat?agentId=${ag.id}`);
                    }}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left flex items-start gap-3 group"
                  >
                    <div className="text-2xl shrink-0 p-1.5 rounded-lg bg-slate-100 group-hover:bg-white transition-colors">
                      {ag.avatar || "🤖"}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700">
                          {ag.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {ag.badge || "Especialista"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{ag.description}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Linha individual de conversa na barra lateral
 */
function ConversationRow({
  conv,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  onSaveRename,
  onCancelRename,
  onStartRename,
  onDelete,
}: {
  conv: ConversationItem;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (val: string) => void;
  onSaveRename: (e: any) => void;
  onCancelRename: () => void;
  onStartRename: (e: any) => void;
  onDelete: (e: any) => void;
}) {
  if (isEditing) {
    return (
      <form onSubmit={onSaveRename} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded-lg">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-xs text-slate-900 focus:outline-none"
          autoFocus
        />
        <button type="submit" className="text-emerald-600 hover:text-emerald-700 p-0.5">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onCancelRename} className="text-slate-400 hover:text-slate-600 p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div
      className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
        isActive
          ? "bg-slate-200/90 text-slate-900 font-bold"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
      }`}
    >
      <Link href={`/dashboard/chat?c=${conv.id}`} className="truncate flex-1 pr-2 text-left">
        {conv.title}
      </Link>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
        <button
          onClick={onStartRename}
          className="p-1 text-slate-400 hover:text-slate-700 rounded"
          title="Renomear"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-red-600 rounded"
          title="Excluir"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
