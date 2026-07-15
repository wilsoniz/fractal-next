"use client";

// FitSidebar — navegação/shell da área do profissional (Consultoria).
// Identidade própria (violeta), isolada do Fracta.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutFit } from "@/lib/fit/supabase-fit";
import { FIT_BRAND_NAME, FIT_BRAND_SLOGAN } from "@/lib/fit/brand";
import type { FitProfile } from "@/lib/fit/types";

const NAV = [
  { href: "/consultoria/professional/dashboard", label: "Dashboard" },
  { href: "/consultoria/professional/patients", label: "Pacientes" },
];

export function FitSidebar({ profile }: { profile: FitProfile | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOutFit();
    router.replace("/consultoria/login");
  }

  const iniciais = (profile?.full_name ?? "").split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "PT";

  return (
    <aside
      style={{
        width: 224,
        flexShrink: 0,
        background: "rgba(14,22,40,.9)",
        borderRight: "1px solid rgba(90,110,160,.25)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Link
        href="/consultoria/professional/dashboard"
        style={{ padding: "20px 20px 16px", textDecoration: "none", borderBottom: "1px solid rgba(90,110,160,.2)" }}
      >
        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f2f6ff", letterSpacing: "-.02em" }}>
          {FIT_BRAND_NAME}
        </div>
        <div style={{ fontSize: ".68rem", color: "#8ea3c0", marginTop: 2 }}>{FIT_BRAND_SLOGAN}</div>
      </Link>

      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "10px 12px",
                margin: "2px 0",
                borderRadius: 9,
                textDecoration: "none",
                fontSize: ".88rem",
                fontWeight: active ? 600 : 400,
                color: active ? "#b7a6ff" : "#c5d2e6",
                background: active ? "rgba(124,92,252,.14)" : "transparent",
                borderLeft: `3px solid ${active ? "#7c5cfc" : "transparent"}`,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid rgba(90,110,160,.2)", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px 10px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#7c5cfc,#5b8def)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {iniciais}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.full_name ?? "Profissional"}
            </div>
            <div style={{ fontSize: 10, color: "#8ea3c0" }}>Profissional</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 9,
            border: "1px solid rgba(224,90,75,.3)",
            background: "transparent",
            color: "#f0857a",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: ".82rem",
            fontWeight: 600,
          }}
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
