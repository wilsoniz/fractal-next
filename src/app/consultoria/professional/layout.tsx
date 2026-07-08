"use client";

// Guard + shell da área do profissional (Consultoria).
// Sem sessão → /consultoria/login. role='patient' → área do paciente.
// Desktop: sidebar fixa. Mobile: bottom nav com nome do profissional.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFitUser } from "@/lib/fit/supabase-fit";
import { ensureProfile } from "@/lib/fit/fit-profiles";
import { FitSidebar } from "@/components/fit/FitSidebar";
import { FitProfessionalBottomNav } from "@/components/fit/FitProfessionalBottomNav";
import type { FitProfile } from "@/lib/fit/types";

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<FitProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    (async () => {
      const { user } = await getFitUser();
      if (!user) {
        router.replace("/consultoria/login");
        return;
      }
      const p = await ensureProfile();
      if (!p) {
        router.replace("/consultoria/login");
        return;
      }
      if (p.role === "patient") {
        router.replace("/consultoria/patient");
        return;
      }
      setProfile(p);
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#8ea3c0" }}>
        Carregando…
      </div>
    );
  }

  // ── Desktop: sidebar fixa ──
  if (!isMobile) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <FitSidebar profile={profile} />
        <main style={{ flex: 1, minWidth: 0, padding: "28px 32px 48px", overflowY: "auto" }}>{children}</main>
      </div>
    );
  }

  // ── Mobile: conteúdo + bottom nav ──
  return (
    <div style={{ minHeight: "100vh", paddingBottom: 66 }}>
      <main style={{ padding: "20px 16px 24px" }}>{children}</main>
      <FitProfessionalBottomNav profile={profile} />
    </div>
  );
}
