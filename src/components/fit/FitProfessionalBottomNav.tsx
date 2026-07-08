"use client";

// FitProfessionalBottomNav — navegação inferior mobile da área do profissional.
// 2 links de navegação + slot de perfil com nome e logout.

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutFit } from "@/lib/fit/supabase-fit";
import type { FitProfile } from "@/lib/fit/types";

const NAV = [
  {
    href: "/consultoria/professional/dashboard",
    label: "Dashboard",
    icon: "M3 9l7-6 7 6v8a1 1 0 01-1 1h-4v-4H8v4H4a1 1 0 01-1-1z",
  },
  {
    href: "/consultoria/professional/patients",
    label: "Pacientes",
    icon: "M9 11a3 3 0 100-6 3 3 0 000 6zm6 2a2 2 0 012 2v1H3v-1a2 2 0 012-2h10z",
  },
];

export function FitProfessionalBottomNav({ profile }: { profile: FitProfile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "Eu";
  const iniciais = (profile?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "PT";

  async function handleLogout() {
    setMenuOpen(false);
    await signOutFit();
    router.replace("/consultoria/login");
  }

  return (
    <>
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 48, background: "rgba(4,8,18,.5)" }}
        />
      )}

      {menuOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 66,
            right: 12,
            zIndex: 49,
            background: "rgba(14,22,40,.97)",
            border: "1px solid rgba(90,110,160,.35)",
            borderRadius: 14,
            padding: 12,
            minWidth: 180,
            boxShadow: "0 8px 32px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ fontSize: ".78rem", color: "#8ea3c0", marginBottom: 10, padding: "0 4px" }}>
            {profile?.full_name ?? "Profissional"}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 9,
              border: "1px solid rgba(224,90,75,.35)",
              background: "transparent",
              color: "#f0857a",
              fontWeight: 700,
              fontSize: ".83rem",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              textAlign: "left",
            }}
          >
            Sair
          </button>
        </div>
      )}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          background: "rgba(11,17,32,.97)",
          borderTop: "1px solid rgba(90,110,160,.3)",
          backdropFilter: "blur(16px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
          const color = active ? "#b7a6ff" : "rgba(160,180,210,.7)";
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 4px 8px",
                textDecoration: "none",
                color,
                position: "relative",
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 30,
                    height: 2,
                    background: "#7c5cfc",
                    borderRadius: "0 0 2px 2px",
                  }}
                />
              )}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </Link>
          );
        })}

        {/* Slot de perfil */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "8px 4px 8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: menuOpen ? "#b7a6ff" : "rgba(160,180,210,.7)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: menuOpen ? "linear-gradient(135deg,#7c5cfc,#5b8def)" : "rgba(124,92,252,.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            {iniciais}
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {firstName}
          </span>
        </button>
      </nav>
    </>
  );
}
