"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/browser-client";

/**
 * Renders an edit link only for logged-in users.
 *
 * The auth check runs client-side so the host post page stays statically
 * cacheable (no cookie read on the server → no opt-out of ISR).
 */
export function EditPostButton({ postId }: { postId: string }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  if (!isLoggedIn) return null;

  return (
    <Link
      href={`/admin/edit/${postId}`}
      className="shrink-0 rounded-lg border border-border p-2 transition-colors hover:bg-pink-100/50 hover:text-pink-500 dark:hover:bg-pink-900/20"
      title="编辑文章"
    >
      <Pencil className="h-4 w-4" />
    </Link>
  );
}
