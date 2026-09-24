// src/app/admin/diagnostics/page.tsx
// Redireciona diretamente para o console consolidado de Diagnóstico & Capacidades da API

import { redirect } from "next/navigation";

export default function AdminDiagnosticsRedirectPage() {
  redirect("/admin/system/diagnostics");
}
