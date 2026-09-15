/**
 * Supabase server client wrapper
 * Re-exports the PAL server client for compatibility with approval UI
 */

export { createPalServerClient as createClient } from "@/lib/db/server";
