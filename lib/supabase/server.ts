import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({
            name,
            value,
            ...(options ?? {})
          });
        } catch {
          return;
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...(options ?? {})
          });
        } catch {
          return;
        }
      }
    }
  });
}
