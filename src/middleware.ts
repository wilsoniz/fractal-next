import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAllowedPath =
    pathname.startsWith("/manutencao") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico");

  if (MAINTENANCE_MODE && !isAllowedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/manutencao";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth).*)"],
};