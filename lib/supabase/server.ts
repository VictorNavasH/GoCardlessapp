import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[v0] Supabase config check:")
  console.log("[v0] NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Available" : "✗ Missing")
  console.log("[v0] SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Available" : "✗ Missing")
  console.log("[v0] SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓ Available" : "✗ Missing")
  console.log(
    "[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Available" : "✗ Missing",
  )
  console.log("[v0] Final URL:", supabaseUrl)
  console.log("[v0] Final Key:", supabaseAnonKey ? "✓ Available" : "✗ Missing")

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(`Supabase configuration missing: URL=${!!supabaseUrl}, Key=${!!supabaseAnonKey}`)
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export { createClient as createServerClient }
