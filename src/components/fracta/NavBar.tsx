
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { FractaLogo } from "./FractaLogo";

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("scroll", fn);
    };
  }, []);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)",
      backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${scrolled ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)"}`,
      padding: isMobile ? "0 20px" : "0 40px", height: "62px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      transition: "all .3s",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <FractaLogo logo="fb" height={30} alt="Fracta Behavior" />
      </Link>

      {/* Desktop nav */}
      {!isMobile && (
        <>
          <ul style={{ display: "flex", gap: 32, listStyle: "none", fontFamily: "var(--font-sans)" }}>
            {[
              { href: "/care",   label: "FractaCare" },
              { href: "/clinic", label: "FractaClinic" },
            ].map(item => (
              <li key={item.href}>
                <Link href={item.href} style={{
                  fontSize: ".82rem", fontWeight: 600, textDecoration: "none",
                  color: "#6b7a99", letterSpacing: ".01em", transition: "color .2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#2BBFA4")}
                onMouseLeave={e => (e.currentTarget.style.color = "#6b7a99")}
                >{item.label}</Link>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/captura/avaliacao" style={{
              padding: "9px 20px", borderRadius: "8px",
              border: "1.5px solid rgba(43,191,164,0.3)",
              background: "transparent", color: "#2BBFA4",
              fontSize: ".8rem", fontWeight: 700, textDecoration: "none",
              fontFamily: "var(--font-sans)", transition: "all .2s",
            }}>Sou responsável</Link>
            <Link href="/clinic-landing" style={{
              padding: "9px 20px", borderRadius: "8px",
              background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
              color: "white", fontSize: ".8rem", fontWeight: 700,
              textDecoration: "none", fontFamily: "var(--font-sans)",
              boxShadow: "0 2px 12px rgba(43,191,164,.3)",
            }}>Sou terapeuta</Link>
          </div>
        </>
      )}

      {/* Mobile hamburger */}
      {isMobile && (
        <button onClick={() => setMenuOpen(v => !v)} style={{
          background: "none", border: "none", cursor: "pointer",
          padding: 8, display: "flex", flexDirection: "column", gap: 5,
        }}>
          <span style={{ width: 22, height: 2, background: "#1E3A5F", borderRadius: 2, display: "block", transition: "all .2s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
          <span style={{ width: 22, height: 2, background: "#1E3A5F", borderRadius: 2, display: "block", opacity: menuOpen ? 0 : 1, transition: "opacity .2s" }} />
          <span style={{ width: 22, height: 2, background: "#1E3A5F", borderRadius: 2, display: "block", transition: "all .2s", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
        </button>
      )}

      {/* Mobile menu drawer */}
      {isMobile && menuOpen && (
        <div style={{
          position: "fixed", top: 62, left: 0, right: 0,
          background: "rgba(255,255,255,0.98)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12,
          zIndex: 99,
        }}>
          <Link href="/care" onClick={() => setMenuOpen(false)} style={{ fontSize: ".9rem", fontWeight: 600, color: "#1E3A5F", textDecoration: "none", padding: "8px 0" }}>FractaCare</Link>
          <Link href="/clinic-landing" onClick={() => setMenuOpen(false)} style={{ fontSize: ".9rem", fontWeight: 600, color: "#1E3A5F", textDecoration: "none", padding: "8px 0" }}>FractaClinic</Link>
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />
          <Link href="/captura/avaliacao" onClick={() => setMenuOpen(false)} style={{
            padding: "12px 20px", borderRadius: 8, textAlign: "center",
            border: "1.5px solid rgba(43,191,164,0.4)",
            color: "#2BBFA4", fontWeight: 700, fontSize: ".88rem", textDecoration: "none",
          }}>Sou responsável</Link>
          <Link href="/clinic-landing" onClick={() => setMenuOpen(false)} style={{
            padding: "12px 20px", borderRadius: 8, textAlign: "center",
            background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
            color: "white", fontWeight: 700, fontSize: ".88rem", textDecoration: "none",
          }}>Sou terapeuta ABA</Link>
        </div>
      )}
    </nav>
  );
}
