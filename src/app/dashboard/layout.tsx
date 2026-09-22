"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  CreditCard,
  LogOut,
  Sparkles,
  Zap,
  ShieldCheck,
  ImageIcon,
  FileSpreadsheet,
  Globe,
  Bot,
  FolderGit2,
  Code2,
  Brain,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.authenticated) {
          setUserData(data.user);
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { label: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
    { label: "Chat Multi-IA", href: "/dashboard/chat", icon: MessageSquare },
    { label: "ORVEXA Workspace", href: "/dashboard/workspace", icon: FolderGit2 },
    { label: "ORVEXA Codex (Dev)", href: "/dashboard/codex", icon: Code2 },
    { label: "Memória Inteligente", href: "/dashboard/memory", icon: Brain },
    { label: "Site Builder", href: "/dashboard/site-builder", icon: Globe },
    { label: "Agentes Especialistas", href: "/dashboard/agents", icon: Bot },
    { label: "Image Studio", href: "/dashboard/image-studio", icon: ImageIcon },
    { label: "Analisador de Documentos", href: "/dashboard/document-analyzer", icon: FileSpreadsheet },
    { label: "Assinatura & Faturamento", href: "/dashboard/billing", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-64 bg-[#0D1322] border-r border-cyan-500/15 p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <Link href="/dashboard" className="flex items-center gap-3 mb-8">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-500/40 shadow-neon-cyan shrink-0">
              <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-wide">ORVEXA PRIME</div>
              <div className="text-[10px] font-mono text-cyan-400">PORTAL DO CLIENTE</div>
            </div>
          </Link>

          {/* User badge */}
          {userData && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[120px]">
                  {userData.name}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    userData.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {userData.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Plano: <span className="text-cyan-300 font-bold">{userData.plan?.name || "START"}</span>
              </div>

              {/* Barra de Consumo de Tokens */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Consumo de Tokens</span>
                  <span className="font-mono text-slate-300">
                    {Math.round(((userData.tokensUsed || 0) / (userData.tokenQuota || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((userData.tokensUsed || 0) / (userData.tokenQuota || 1)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-800/80 space-y-2">
          {userData?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-900/50 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Painel Admin Master
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/20 text-xs font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

