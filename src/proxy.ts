import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { response: supabaseResponse, user } = await updateSession(request);

  // Protect /admin routes only.
  // /chat is open to anonymous users (limited to free models server-side).
  const path = request.nextUrl.pathname;
  const isProtected = path.includes("/admin");
  if (isProtected) {
    if (!user) {
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

  // With `localePrefix: "never"`, next-intl rewrites public URLs to the
  // internal `/zh` route. Next.js 16 can run proxy again for that rewrite in
  // development, so applying next-intl twice would redirect `/zh` back to `/`
  // and create an infinite loop. Let the internal route reach the App Router.
  const isInternalLocalePath = path === "/zh" || path.startsWith("/zh/");
  if (isInternalLocalePath) {
    return supabaseResponse;
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
