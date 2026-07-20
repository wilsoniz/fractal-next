"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  canAccessProductSurface,
  canEnterClinicAba,
  loadPlatformIdentityEvidenceSafely,
  protectedSurfaceLoginRedirect,
  SAFE_PLATFORM_EXIT,
  type PlatformIdentityEvidence,
  type ProductSurfaceId,
} from "@/lib/platform";

export function PlatformSurfaceGate({
  children,
  surfaceId,
}: {
  children: ReactNode;
  surfaceId: ProductSurfaceId;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [identity, setIdentity] =
    useState<PlatformIdentityEvidence | null>(null);

  useEffect(() => {
    let active = true;
    void loadPlatformIdentityEvidenceSafely().then((result) => {
      if (active) setIdentity(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!identity) return;

    if (!identity.authenticated) {
      router.replace(protectedSurfaceLoginRedirect(surfaceId, pathname));
      return;
    }

    const surfaceAllowed = canAccessProductSurface(identity, surfaceId);
    const clinicalWorkspaceAllowed =
      surfaceId !== "clinic" || canEnterClinicAba(identity);

    if (!surfaceAllowed || !clinicalWorkspaceAllowed) {
      router.replace(SAFE_PLATFORM_EXIT);
    }
  }, [identity, pathname, router, surfaceId]);

  if (!identity) return null;

  const allowed =
    identity.authenticated &&
    canAccessProductSurface(identity, surfaceId) &&
    (surfaceId !== "clinic" || canEnterClinicAba(identity));

  return allowed ? children : null;
}
