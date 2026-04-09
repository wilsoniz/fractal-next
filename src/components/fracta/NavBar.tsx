"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { FractaLogo } from "./FractaLogo";

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)",
      backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${scrolled ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)"}`,
      padding: "0 40px", height: "62px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      transition: "all .3s",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <FractaLogo logo="fb" height={30} alt="Fracta Behavior" />
      </Link>

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
        <Link href="/care" style={{
          padding: "9px 20px", borderRadius: "8px",
          border: "1.5px solid rgba(43,191,164,0.3)",
          background: "transparent", color: "#2BBFA4",
          fontSize: ".8rem", fontWeight: 700, textDecoration: "none",
          fontFamily: "var(--font-sans)", transition: "all .2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(43,191,164,.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          Sou responsável
        </Link>
        <Link href="/clinic" style={{
          padding: "9px 20px", borderRadius: "8px",
          background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
          color: "white", fontSize: ".8rem", fontWeight: 700,
          textDecoration: "none", fontFamily: "var(--font-sans)",
          boxShadow: "0 2px 12px rgba(43,191,164,.3)",
        }}>
          Sou terapeuta
        </Link>
      </div>
    </nav>
  );
}
