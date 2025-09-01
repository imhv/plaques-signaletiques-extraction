import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = await createClient();

  // Vérifier l'authentification pour les routes protégées
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes qui nécessitent une authentification
  const protectedRoutes = [
    "/api/extract",
    "/api/predictions",
    "/api/images",
    "/api/data",
    "/api/product-families",
    "/extractions",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Routes de test qui ne nécessitent pas d'authentification
  const testRoutes = [
    "/api/extract", // Peut être utilisé en mode test
    "/test-zone",
  ];

  const isTestRoute = testRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Si c'est une route protégée et qu'il n'y a pas d'utilisateur connecté
  if (isProtectedRoute && !user && !isTestRoute) {
    // Pour les APIs, retourner une erreur 401
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pour les pages, rediriger vers la page de connexion
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Ajouter l'utilisateur aux headers pour les APIs
  if (user && req.nextUrl.pathname.startsWith("/api/")) {
    res.headers.set("x-user-id", user.id);
    res.headers.set("x-user-email", user.email || "");
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
