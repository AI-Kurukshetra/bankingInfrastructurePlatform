"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Mounts invisibly inside dashboard layouts.
 * Listens for Supabase auth state changes and redirects to /login
 * when the session is signed out or expires mid-session.
 *
 * Add <SessionGuard /> to any layout that wraps protected routes.
 */
export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login?reason=session_expired");
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
