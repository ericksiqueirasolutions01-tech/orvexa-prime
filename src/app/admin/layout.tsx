// src/app/admin/layout.tsx
// ÁREA ADMINISTRATIVA CONSOLIDADA E RESUMIDA — ORVEXA PRIME

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  BarChart3,
  Zap,
  Users,
  Bot,
  Sliders,
  Activity,
  LogOut,
  ShieldCheck,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.authenticated || data.user?.role !== "ADMIN") {
          router.push("/login?error=admin_required");
        } else {
          setAdminUser(data.user);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const navItems = [
    { label: "Visão Geral & Métricas", href: "/admin", icon: LayoutDashboard },
    { label: "Cadastro de Chaves de API", href: "/admin/api-keys", icon: Key },
    { label: "Quotas & Limites", href: "/admin/ai-keys", icon: BarChart3 },
    { label: "Saúde & Monitoramento", href: "/admin/ai-monitor", icon: Zap },
    { label: "Usuários & Acessos", href: "/admin/users", icon: Users },
    { label: "Agentes de IA", href: "/admin/agents", icon: Bot },
    { label: "Configurações do Sistema", href: "/admin/settings", icon: Sliders },
    { label: "Diagnóstico & Auditoria", href: "/admin/system/diagnostics", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#05070D] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Sidebar Admin */}
      <aside className="w-full md:w-64 bg-[#0A0E1A] border-r border-slate-800 p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <Link href="/admin" className="flex items-center gap-3 mb-6">
            <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-cyan-500/50 shadow-neon-cyan shrink-0">
              <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-wider flex items-center gap-1.5">
                ORVEXA
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">PAINEL MASTER</div>
            </div>
          </Link>

          {/* Status Badge */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {adminUser?.name || "Administrador"}
              </span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
              ONLINE
            </span>
          </div>

          {/* Navegação Consolidada em 7 Seções */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé: Voltar ao Chat do Cliente + Logout */}
        <div className="pt-6 border-t border-slate-800 space-y-2">
          <Link
            href="/dashboard/chat"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Área do Cliente (Chat)</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-cyan-400" />
          </Link>

          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/20 text-xs font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Área Central Administrativa */}
      <main className="flex-1 overflow-y-auto min-h-screen p-4 sm:p-6 lg:p-8 bg-[#05070D]">
        {children}
      </main>
    </div>
  );
}
