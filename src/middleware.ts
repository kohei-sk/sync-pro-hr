import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/events",
  "/bookings",
  "/activity",
  "/team",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect app routes
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isProtected) {
    const authToken = request.cookies.get("auth_token");
    if (!authToken) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in and visiting /login, redirect to events
  if (pathname === "/login") {
    const authToken = request.cookies.get("auth_token");
    if (authToken) {
      const eventsUrl = new URL("/events", request.url);
      return NextResponse.redirect(eventsUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/events/:path*",
    "/bookings/:path*",
    "/activity/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/login",
  ],
};
