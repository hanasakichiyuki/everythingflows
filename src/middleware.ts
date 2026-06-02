import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { response: supabaseResponse, session } = await updateSession(request);

  // Protect /admin routes
  if (request.nextUrl.pathname.includes("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Merge supabase cookies into redirect response
      supabaseResponse.cookies.getAll().forEach(({ name }) => {
        const cookie = supabaseResponse.cookies.get(name);
        if (cookie) {
          redirectResponse.cookies.set(name, cookie.value, cookie);
        }
      });
      return redirectResponse;
    }
  }

  // Apply intl middleware
  const intlResponse = intlMiddleware(request);

  // Merge supabase cookies into intl response
  supabaseResponse.cookies.getAll().forEach(({ name }) => {
    const cookie = supabaseResponse.cookies.get(name);
    if (cookie) {
      intlResponse.cookies.set(name, cookie.value, cookie);
    }
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
