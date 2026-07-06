"use client";

// Guard + shell da área do profissional (Consultoria).
// Sem sessão → /consultoria/login. role='patient' → área do paciente (futura).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFitUser } from "@/lib/fit/supabase-fit";
import { ensureProfile } from "@/lib/fit/fit-profiles";
import { FitSidebar } from "@/components/fit/FitSidebar";
import type { FitProfile } from "@/lib/fit/types";

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<FitProfile | null>(null);
  const [ready, setReady] = useState(false);

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

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <FitSidebar profile={profile} />
      <main style={{ flex: 1, minWidth: 0, padding: "28px 32px 48px", overflowY: "auto" }}>{children}</main>
    </div>
  );
}
