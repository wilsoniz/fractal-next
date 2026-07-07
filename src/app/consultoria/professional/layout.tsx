"use client";

// Guard + shell da área do profissional (Consultoria).
// Sem sessão → /consultoria/login. role='patient' → área do paciente.
// Mobile: sidebar escondida atrás de um menu (drawer).

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getFitUser } from "@/lib/fit/supabase-fit";
import { ensureProfile } from "@/lib/fit/fit-profiles";
import { FitSidebar } from "@/components/fit/FitSidebar";
import type { FitProfile } from "@/lib/fit/types";

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<FitProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fecha o drawer ao navegar.
  useEffect(() => setMenuOpen(false), [pathname]);

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

  // ── Mobile: topbar + drawer ──
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(11,17,32,.96)", borderBottom: "1px solid rgba(90,110,160,.25)", backdropFilter: "blur(10px)" }}>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          style={{ background: "none", border: "1px solid rgba(90,110,160,.4)", color: "#c5d2e6", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: "1rem", lineHeight: 1, fontFamily: "var(--font-sans)" }}
        >
          ☰
        </button>
        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f2f6ff", letterSpacing: "-.02em" }}>
          Consultoria<span style={{ color: "#7c5cfc" }}>Fit</span>
        </div>
      </header>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(4,8,18,.6)" }} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 41, boxShadow: "4px 0 24px rgba(0,0,0,.5)" }}>
            <FitSidebar profile={profile} />
          </div>
        </>
      )}

      <main style={{ padding: "16px 16px 40px", overflowY: "auto" }}>{children}</main>
    </div>
  );
}
