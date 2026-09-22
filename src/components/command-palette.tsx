"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageSquare,
  LayoutDashboard,
  FolderGit2,
  Code2,
  Brain,
  Globe,
  Bot,
  ImageIcon,
  FileSpreadsheet,
  CreditCard,
  Settings,
  User,
  Sun,
  Moon,
  UploadCloud,
  PlusCircle,
  X,
  Sparkles,
  Command,
} from "lucide-react";
import { useTheme } from "./theme-provider";

interface CommandItem {
  id: string;
  title: string;
  category: "Navegação" | "Ações Rápidas" | "Sistema";
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { isDark, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const commands: CommandItem[] = [
    // Ações Rápidas
    {
      id: "act-new-chat",
      title: "Iniciar Novo Chat Multi-IA",
      category: "Ações Rápidas",
      shortcut: "N",
      icon: PlusCircle,
      onSelect: () => navigate("/dashboard/chat"),
    },
    {
      id: "act-upload-file",
      title: "Fazer Upload de Arquivo no Workspace",
      category: "Ações Rápidas",
      shortcut: "U",
      icon: UploadCloud,
      onSelect: () => navigate("/dashboard/workspace"),
    },
    {
      id: "act-new-codex",
      title: "Abrir ORVEXA Codex (Ambiente Dev)",
      category: "Ações Rápidas",
      shortcut: "C",
      icon: Code2,
      onSelect: () => navigate("/dashboard/codex"),
    },
    {
      id: "act-toggle-theme",
      title: isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro",
      category: "Sistema",
      shortcut: "T",
      icon: isDark ? Sun : Moon,
      onSelect: () => {
        setTheme(isDark ? "light" : "dark");
        onClose();
      },
    },

    // Navegação Principal
    {
      id: "nav-dashboard",
      title: "Dashboard & Visão Geral",
      category: "Navegação",
      icon: LayoutDashboard,
      onSelect: () => navigate("/dashboard"),
    },
    {
      id: "nav-chat",
      title: "Chat Multi-IA (GPT-5.6, Claude, Gemini)",
      category: "Navegação",
      icon: MessageSquare,
      onSelect: () => navigate("/dashboard/chat"),
    },
    {
      id: "nav-workspace",
      title: "ORVEXA Workspace (Área de Arquivos)",
      category: "Navegação",
      icon: FolderGit2,
      onSelect: () => navigate("/dashboard/workspace"),
    },
    {
      id: "nav-codex",
      title: "ORVEXA Codex Engine (7 Linguagens)",
      category: "Navegação",
      icon: Code2,
      onSelect: () => navigate("/dashboard/codex"),
    },
    {
      id: "nav-memory",
      title: "Memória Inteligente & Busca Semântica",
      category: "Navegação",
      icon: Brain,
      onSelect: () => navigate("/dashboard/memory"),
    },
    {
      id: "nav-agents",
      title: "Hub dos Agentes Especialistas (6 Agentes)",
      category: "Navegação",
      icon: Bot,
      onSelect: () => navigate("/dashboard/agents"),
    },
    {
      id: "nav-site-builder",
      title: "Site Builder (Templates Comerciais)",
      category: "Navegação",
      icon: Globe,
      onSelect: () => navigate("/dashboard/site-builder"),
    },
    {
      id: "nav-image-studio",
      title: "Image Studio & Editor Canvas",
      category: "Navegação",
      icon: ImageIcon,
      onSelect: () => navigate("/dashboard/image-studio"),
    },
    {
      id: "nav-doc-analyzer",
      title: "Analisador de Documentos (PDF, DOCX, Planilhas)",
      category: "Navegação",
      icon: FileSpreadsheet,
      onSelect: () => navigate("/dashboard/document-analyzer"),
    },
    {
      id: "nav-profile",
      title: "Meu Perfil & Segurança",
      category: "Navegação",
      icon: User,
      onSelect: () => navigate("/dashboard/profile"),
    },
    {
      id: "nav-settings",
      title: "Configurações da Conta & Preferências",
      category: "Navegação",
      icon: Settings,
      onSelect: () => navigate("/dashboard/settings"),
    },
    {
      id: "nav-billing",
      title: "Planos & Faturamento",
      category: "Navegação",
      icon: CreditCard,
      onSelect: () => navigate("/dashboard/billing"),
    },
  ];

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-xl rounded-2xl bg-[#0D1322] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,210,255,0.2)] overflow-hidden flex flex-col max-h-[80vh] z-10"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3 bg-slate-900/80">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar comandos, telas ou ações... (ex: Chat, Tema, Upload)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum comando ou página encontrado para &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                      : "text-slate-300 hover:bg-slate-850 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg border ${
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{cmd.title}</div>
                      <div className="text-[10px] text-slate-400">{cmd.category}</div>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <kbd className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400 shrink-0">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Navegar: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px]">↓</kbd></span>
            <span>Selecionar: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px]">↵</kbd></span>
          </div>
          <div>
            Fechar: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px]">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

