"use client";

// FitPatientNav — navegação inferior mobile-first da área do paciente.

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/consultoria/patient/inicio", label: "Início", icon: "M3 9l7-6 7 6v8a1 1 0 01-1 1h-4v-5H8v5H4a1 1 0 01-1-1z" },
  { href: "/consultoria/patient/treino", label: "Treino", icon: "M4 8h2M14 8h2M6 5v6M14 5v6M8 8h4" },
  { href: "/consultoria/patient/checkin", label: "Check-in", icon: "M4 10l3 3 7-8" },
  { href: "/consultoria/patient/progresso", label: "Progresso", icon: "M3 15l4-5 3 3 4-6M3 17h14" },
];

export function FitPatientNav() {
  const pathname = usePathname();
  return (
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
      {ITEMS.map((item) => {
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
            {active && <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 30, height: 2, background: "#7c5cfc", borderRadius: "0 0 2px 2px" }} />}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
