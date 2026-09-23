import { Metadata } from "next";
import { CinematicLoading } from "@/components/cinematic-loading";

export const metadata: Metadata = {
  title: "Experiência Cinematográfica | ORVEXA PRIME",
  description: "A fusão das maiores inteligências artificiais em uma única plataforma.",
};

export default function CinematicLoadingPage() {
  return (
    <main className="w-full h-screen overflow-hidden bg-[#030712]">
      <CinematicLoading autoRedirectUrl="/dashboard/chat" autoRedirectDelayMs={2500} showNavigationControls={true} />
    </main>
  );
}

