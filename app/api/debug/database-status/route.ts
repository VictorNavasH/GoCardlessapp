import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log("[v0] Starting complete database diagnosis...")

    const diagnosis = {
      timestamp: new Date().toISOString(),
      tables: {} as any,
      errors: [] as string[],
      summary: {} as any,
    }

    // Verificar tabla gocardless_requisitions
    try {
      const { data: requisitions, error: reqError } = await supabase
        .from("gocardless_requisitions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      diagnosis.tables.gocardless_requisitions = {
        exists: !reqError,
        count: requisitions?.length || 0,
        recent_records: requisitions || [],
        error: reqError?.message,
      }
    } catch (error) {
      diagnosis.errors.push(`gocardless_requisitions: ${error}`)
    }

    // Verificar tabla gocardless_accounts
    try {
      const { data: accounts, error: accError } = await supabase
        .from("gocardless_accounts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      diagnosis.tables.gocardless_accounts = {
        exists: !accError,
        count: accounts?.length || 0,
        recent_records: accounts || [],
        error: accError?.message,
      }
    } catch (error) {
      diagnosis.errors.push(`gocardless_accounts: ${error}`)
    }

    // Verificar tabla gocardless_transactions
    try {
      const { data: transactions, error: txError } = await supabase
        .from("gocardless_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      diagnosis.tables.gocardless_transactions = {
        exists: !txError,
        count: transactions?.length || 0,
        recent_records: transactions || [],
        error: txError?.message,
      }
    } catch (error) {
      diagnosis.errors.push(`gocardless_transactions: ${error}`)
    }

    // Verificar tabla gocardless_institutions
    try {
      const { data: institutions, error: instError } = await supabase
        .from("gocardless_institutions")
        .select("count")
        .limit(1)

      const { count } = await supabase.from("gocardless_institutions").select("*", { count: "exact", head: true })

      diagnosis.tables.gocardless_institutions = {
        exists: !instError,
        count: count || 0,
        error: instError?.message,
      }
    } catch (error) {
      diagnosis.errors.push(`gocardless_institutions: ${error}`)
    }

    // Verificar tabla gocardless_sync_logs
    try {
      const { data: syncLogs, error: syncError } = await supabase
        .from("gocardless_sync_logs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(5)

      diagnosis.tables.gocardless_sync_logs = {
        exists: !syncError,
        count: syncLogs?.length || 0,
        recent_records: syncLogs || [],
        error: syncError?.message,
      }
    } catch (error) {
      diagnosis.errors.push(`gocardless_sync_logs: ${error}`)
    }

    // Resumen
    diagnosis.summary = {
      total_requisitions: diagnosis.tables.gocardless_requisitions?.count || 0,
      total_accounts: diagnosis.tables.gocardless_accounts?.count || 0,
      total_transactions: diagnosis.tables.gocardless_transactions?.count || 0,
      total_institutions: diagnosis.tables.gocardless_institutions?.count || 0,
      total_sync_logs: diagnosis.tables.gocardless_sync_logs?.count || 0,
      has_errors: diagnosis.errors.length > 0,
      all_tables_exist: Object.values(diagnosis.tables).every((table: any) => table.exists),
    }

    console.log("[v0] Database diagnosis completed:", diagnosis.summary)

    return NextResponse.json(diagnosis, { status: 200 })
  } catch (error) {
    console.error("[v0] Database diagnosis failed:", error)
    return NextResponse.json(
      {
        error: "Database diagnosis failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
