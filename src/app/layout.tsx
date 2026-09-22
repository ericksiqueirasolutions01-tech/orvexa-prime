import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "ORVEXA PRIME DIGITAL — Conhecimento que Transforma | SaaS Multi-IA",
  description:
    "Plataforma SaaS Corporativa Multi-IA com AI Gateway Inteligente, balanceamento de chaves sem limites e orquestração dos melhores modelos de inteligência artificial.",
  icons: {
    icon: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body className="min-h-screen bg-[#080C14] dark:bg-[#080C14] text-slate-100 dark:text-slate-100 antialiased selection:bg-cyan-500 selection:text-black transition-colors duration-300">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
