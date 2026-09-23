"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Cpu, LayoutDashboard, LogIn, Menu, X } from "lucide-react";

export function Navbar() {
  const [session, setSession] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setSession(data.user);
      })
      .catch(() => {});

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#080C14]/90 backdrop-blur-md border-b border-cyan-500/20 py-3 shadow-lg shadow-black/50"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-400/40 group-hover:ring-emerald-400/70 transition-all duration-300 shadow-neon-cyan">
            <Image
              src="/logo.jpg"
              alt="ORVEXA PRIME DIGITAL Logo"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-wider text-white">ORVEXA</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/30">
                PRIME
              </span>
            </div>
            <span className="text-[10px] tracking-widest text-slate-400 font-mono -mt-0.5">
              DIGITAL AI GATEWAY
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/#gateway"
            className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            AI Gateway
          </Link>
          <Link
            href="/#agentes"
            className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Agentes Especialistas
          </Link>
          <Link
            href="/#planos"
            className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors"
          >
            Planos
          </Link>
          <Link
            href="/#seguranca"
            className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            Segurança
          </Link>
          <Link
            href="/loading"
            className="text-sm font-medium text-amber-300/90 hover:text-amber-300 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Experiência
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <Link
                href={session.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm font-medium transition-all shadow-sm shadow-cyan-500/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                {session.role === "ADMIN" ? "Painel Admin" : "Meu Painel"}
              </Link>
              <Link
                href="/dashboard/chat"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-sm font-bold shadow-neon-glow transition-all"
              >
                Abrir Chat
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 text-sm font-medium transition-all"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-neon-glow transition-all transform hover:-translate-y-0.5"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D1322] border-b border-cyan-500/20 px-4 pt-3 pb-5 space-y-3">
          <Link
            href="/#gateway"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-cyan-400 py-2 text-sm font-medium"
          >
            AI Gateway
          </Link>
          <Link
            href="/#agentes"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-emerald-400 py-2 text-sm font-medium"
          >
            Agentes Especialistas
          </Link>
          <Link
            href="/#planos"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white py-2 text-sm font-medium"
          >
            Planos de Assinatura
          </Link>
          <Link
            href="/loading"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-amber-300 hover:text-amber-200 py-2 text-sm font-medium flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Experiência Cinematográfica
          </Link>
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            {session ? (
              <Link
                href={session.role === "ADMIN" ? "/admin" : "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-semibold text-sm"
              >
                Ir para o Painel
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold text-sm"
                >
                  Cadastre-se
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

