"use client";

// FitModal — modal genérico via portal (design system da Consultoria).
// Isolado: não depende de components/fracta.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function FitModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(4,8,18,.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "6vh 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          background: "#101a30",
          border: "1px solid rgba(90,110,160,.4)",
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid rgba(90,110,160,.25)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#f2f6ff" }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "none",
              border: "none",
              color: "#8ea3c0",
              cursor: "pointer",
              fontSize: "1.3rem",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
