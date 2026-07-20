"use client";

import { useEffect } from "react";

import {
  ProductSurfaceRegistry,
  resolveProductSurfaceEntry,
  resolveSurfaceDestination,
  SAFE_PLATFORM_EXIT,
  type PlatformIdentityEvidence,
  type ProductSurfaceId,
} from "@/lib/platform";

interface ProductSurfaceEntryProps {
  identity: PlatformIdentityEvidence;
  loginPath: string;
  requestedRedirect: string | null;
  onNavigate: (destination: string) => void;
}

export function ProductSurfaceEntry({
  identity,
  loginPath,
  requestedRedirect,
  onNavigate,
}: ProductSurfaceEntryProps) {
  const decision = resolveProductSurfaceEntry(identity);

  useEffect(() => {
    if (decision.kind === "denied") {
      onNavigate(SAFE_PLATFORM_EXIT);
    }

    if (decision.kind === "direct") {
      onNavigate(
        resolveSurfaceDestination(
          decision.target,
          requestedRedirect,
          loginPath,
        ),
      );
    }
  }, [decision, loginPath, onNavigate, requestedRedirect]);

  if (decision.kind !== "select") {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#07111f",
        color: "#e8f0f8",
        fontFamily: "var(--font-sans)",
      }}
    >
      <section
        aria-labelledby="surface-selection-title"
        style={{ width: "100%", maxWidth: 520, textAlign: "center" }}
      >
        <h1 id="surface-selection-title" style={{ marginBottom: 8 }}>
          Escolha onde entrar
        </h1>
        <p style={{ color: "#9ec8e8", marginBottom: 24 }}>
          Sua conta possui acesso a mais de uma superfície Fracta.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {decision.targets.map((surfaceId) => (
            <SurfaceButton
              key={surfaceId}
              surfaceId={surfaceId}
              onSelect={() =>
                onNavigate(
                  resolveSurfaceDestination(
                    surfaceId,
                    requestedRedirect,
                    loginPath,
                  ),
                )
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function SurfaceButton({
  surfaceId,
  onSelect,
}: {
  surfaceId: ProductSurfaceId;
  onSelect: () => void;
}) {
  const surface = ProductSurfaceRegistry.getById(surfaceId);
  if (!surface?.available) return null;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        border: "1px solid rgba(80,150,220,.5)",
        borderRadius: 12,
        padding: "16px 20px",
        background: "rgba(13,32,53,.9)",
        color: "#e8f0f8",
        cursor: "pointer",
        font: "inherit",
        fontWeight: 700,
      }}
    >
      {surface.name}
    </button>
  );
}
