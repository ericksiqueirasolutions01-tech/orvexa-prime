import { redirect } from "next/navigation";

export default function SystemIndexPage() {
  redirect("/admin/system/diagnostics");
}

