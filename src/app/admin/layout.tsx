"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ShieldAlert,
  Key,
  Users,
  BarChart3,
  GitFork,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Cpu,
  Sliders,
  Bot,
  Activity,
  Database,
  Zap,
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
    { label: "Visão Geral & Lucro", href: "/admin", icon: LayoutDashboard },
    { label: "⚡ Monitoramento IA", href: "/admin/ai-monitor", icon: Zap },
    { label: "Configurações de IA", href: "/admin/settings", icon: Sliders },
    { label: "Gestão de Agentes", href: "/admin/agents", icon: Bot },
    { label: "Gestão Ilimitada de APIs", href: "/admin/api-keys", icon: Key },
    { label: "Gestão de Usuários", href: "/admin/users", icon: Users },
    { label: "Controle de Consumo", href: "/admin/usage", icon: BarChart3 },
    { label: "Auditoria & Logs", href: "/admin/audit", icon: ShieldAlert },
    { label: "Sistema & Diagnóstico", href: "/admin/system/diagnostics", icon: Activity },
    { label: "Backup & Restauração", href: "/admin/backup", icon: Database },
    { label: "ORVEXA PRIME Engine", href: "/admin/router", icon: GitFork },
  ];

  return (
    <div className="min-h-screen bg-[#05070D] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Admin */}
      <aside className="w-full md:w-64 bg-[#0A0E1A] border-r border-cyan-500/20 p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <Link href="/admin" className="flex items-center gap-3 mb-8">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-500/50 shadow-neon-cyan shrink-0">
              <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="font-black text-sm text-white tracking-wider flex items-center gap-1.5">
                ORVEXA
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">MASTER CONTROLLER</div>
            </div>
          </Link>

          {/* Admin Tag */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Administrador</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">ACESSO TOTAL</span>
          </div>

          {/* Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-slate-800/80 space-y-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-all"
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            Visão do Cliente
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/20 text-xs font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-4 sm:p-6 lg:p-8 bg-[#05070D]">
        {children}
      </main>
    </div>
  );
}

