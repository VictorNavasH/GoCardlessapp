import { createClient } from "@/lib/supabase/server"
import { gocardless } from "@/lib/gocardless"
import { NextResponse } from "next/server"

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as any,
    errors: [] as string[],
    success: false,
  }

  try {
    // 1. VERIFICAR VARIABLES DE ENTORNO
    console.log("[v0] CRITICAL CHECK: Verificando variables de entorno...")
    results.checks.env_vars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      GOCARDLESS_SECRET_ID: !!process.env.GOCARDLESS_SECRET_ID,
      GOCARDLESS_SECRET_KEY: !!process.env.GOCARDLESS_SECRET_KEY,
      gocardless_base_url: "https://bankaccountdata.gocardless.com", // ✅ Fija
    }

    // 2. VERIFICAR CONEXIÓN SUPABASE
    console.log("[v0] CRITICAL CHECK: Verificando conexión Supabase...")
    const supabase = await createClient()

    // 3. VERIFICAR TABLAS CRÍTICAS
    console.log("[v0] CRITICAL CHECK: Verificando tablas...")
    const tablesCheck = await Promise.allSettled([
      supabase.from("gocardless_accounts").select("count", { count: "exact", head: true }),
      supabase.from("gocardless_transactions").select("count", { count: "exact", head: true }),
      supabase.from("gocardless_requisitions").select("count", { count: "exact", head: true }),
    ])

    results.checks.tables = {
      gocardless_accounts:
        tablesCheck[0].status === "fulfilled"
          ? { exists: true, count: (tablesCheck[0].value as any).count }
          : { exists: false, error: (tablesCheck[0] as any).reason?.message },
      gocardless_transactions:
        tablesCheck[1].status === "fulfilled"
          ? { exists: true, count: (tablesCheck[1].value as any).count }
          : { exists: false, error: (tablesCheck[1] as any).reason?.message },
      gocardless_requisitions:
        tablesCheck[2].status === "fulfilled"
          ? { exists: true, count: (tablesCheck[2].value as any).count }
          : { exists: false, error: (tablesCheck[2] as any).reason?.message },
    }

    // 4. VERIFICAR DATOS EXISTENTES
    console.log("[v0] CRITICAL CHECK: Verificando datos existentes...")
    const { data: accounts, error: accountsError } = await supabase.from("gocardless_accounts").select("*").limit(5)

    results.checks.data = {
      accounts_sample: accounts || [],
      accounts_error: accountsError?.message,
    }

    // 5. VERIFICAR GOCARDLESS CON AUTENTICACIÓN CORRECTA
    console.log("[v0] CRITICAL CHECK: Verificando GoCardless...")
    try {
      const institutions = await gocardless.getInstitutions("ES")
      results.checks.gocardless = {
        status: 200,
        ok: true,
        url: "https://bankaccountdata.gocardless.com",
        institutions_count: institutions.results?.length || 0,
        token_generated: true,
      }
    } catch (error: any) {
      results.checks.gocardless = {
        error: error.message,
        url: "https://bankaccountdata.gocardless.com",
        token_generated: false,
      }
    }

    results.success = true
    console.log("[v0] CRITICAL CHECK COMPLETED:", JSON.stringify(results, null, 2))
  } catch (error: any) {
    console.error("[v0] CRITICAL CHECK ERROR:", error)
    results.errors.push(error.message)
  }

  return NextResponse.json(results)
}
