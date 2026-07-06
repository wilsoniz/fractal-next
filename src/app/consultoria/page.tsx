"use client";

// Entrada /consultoria — roteamento por sessão/papel.
// Sem sessão → login. professional → dashboard. patient → área do paciente.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFitUser } from "@/lib/fit/supabase-fit";
import { ensureProfile } from "@/lib/fit/fit-profiles";

export default function ConsultoriaEntry() {
  const router = useRouter();

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
      router.replace(p.role === "professional" ? "/consultoria/professional/dashboard" : "/consultoria/patient/inicio");
    })();
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#8ea3c0" }}>
      Carregando…
    </div>
  );
}
