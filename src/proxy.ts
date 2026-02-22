import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth"];

// Routes that authenticated users shouldn't access (redirect to dashboard)
const authRoutes = ["/login"];

// Role-based route restrictions
// Routes that require specific roles to access
const roleBasedRoutes: Record<string, string[]> = {
  "/users": ["ADMIN"],
  "/accounts": ["ADMIN", "MANAGER"],
  "/employees": ["ADMIN", "MANAGER"],
  "/expenses": ["ADMIN", "MANAGER"],
  "/business-info": ["ADMIN", "MANAGER"],
};

/**
 * Check if user has required role access for a given pathname
 */
function hasRoleAccess(pathname: string, userRole?: string | null): boolean {
  if (!userRole) {
    return false;
  }

  const role = userRole.toUpperCase();

  // Check each route prefix in roleBasedRoutes
  for (const [routePrefix, allowedRoles] of Object.entries(roleBasedRoutes)) {
    // Check if pathname starts with the route prefix
    if (pathname.startsWith(routePrefix)) {
      // Check if user's role is in the allowed roles
      return allowedRoles.map((r) => r.toUpperCase()).includes(role);
    }
  }

  // If no specific role restriction, allow access (for authenticated users)
  return true;
}

/**
 * Proxy function to handle authentication and authorization
 * This function should be used in Next.js middleware to protect routes
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, Next.js internals, and favicon
  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Allow all API routes except auth routes (they're handled separately)
  // API routes should handle their own authentication if needed
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Get the current session
  const session = await auth();
  const isAuthenticated = Boolean(session);
  const userRole = session?.user?.role ?? null;

  // If user is authenticated
  if (isAuthenticated) {
    // Check role-based access
    if (!hasRoleAccess(pathname, userRole)) {
      // User doesn't have required role, redirect to unauthorized or dashboard
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // If authenticated user tries to access auth routes (like /login), redirect to dashboard
    if (authRoutes.some((route) => pathname.startsWith(route))) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Allow access to protected routes
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access a protected route
  if (!isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Store the original pathname to redirect back after login
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Allow access to public routes
  return NextResponse.next();
}

/**
 * Middleware matcher configuration
 * This should be exported and used in middleware.ts
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
