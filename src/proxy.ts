import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAllowedInMaintenance =
    pathname.startsWith("/manutencao") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico");

  if (MAINTENANCE_MODE && !isAllowedInMaintenance) {
    const url = request.nextUrl.clone();
    url.pathname = "/manutencao";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
